/**
 * CollectionCoordinator - Coordinates cross-instance operations for a collection
 *
 * Encapsulates locking, conflict detection, retries, metadata updates and error handling
 * for all CRUD operations on a collection.
 *
 * @class
 */
/* exported CollectionCoordinator */
/**
 * Orchestrates coordinated collection operations by applying locking,
 * conflict detection, and metadata synchronisation around core CRUD actions.
 */
class CollectionCoordinator {
  /**
   * Create a new CollectionCoordinator
   * @param {Collection} collection - Collection instance to coordinate
   * @param {MasterIndex} masterIndex - MasterIndex for cross-instance coordination
   * @param {Object|DatabaseConfig} config - Coordination settings or DatabaseConfig
   * @param {JDbLogger} logger - Logger for operation tracing
   * @param _logger
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When dependencies or config invalid
   */
  constructor(collection, masterIndex, config = {}, _logger = JDbLogger) {
    Validate.object(collection, 'collection');
    Validate.object(masterIndex, 'masterIndex');
    Validate.object(config, 'config');
    this._collection = collection;
    this._masterIndex = masterIndex;
    this._logger = JDbLogger.createComponentLogger('CollectionCoordinator');

    // Use DatabaseConfig defaults if not supplied in config
    const DEFAULTS = {
      lockTimeout: 30000,
      retryAttempts: 3,
      retryDelayMs: 1000
    };
    this._config = Object.assign({}, DEFAULTS, config);
  }

  /**
   * Coordinate a named operation with locking, conflict checks and metadata update
   * @param {string} operationName - Name of the CRUD operation
   * @param {Function} callback - Core operation callback
   * @returns {*} Result of the core operation
   * @throws {ErrorHandler.ErrorTypes.*} On lock, conflict or operation errors
   */
  coordinate(operationName, callback) {
    Validate.nonEmptyString(operationName, 'operationName');
    Validate.type(callback, 'function', 'callback');

    const opId = IdGenerator.generateUUID();
    const name = this._collection.getName();
    let result;
    let lockAcquired = false;
    // Start timer for coordination timeout
    const startTime = Date.now();
    // coordinationEnabled config removed: always coordinate
    this._logger.debug(`Starting operation: ${operationName}`, { collection: name, opId });
    // Acquire lock with timeout mapping
    try {
      try {
        this.acquireOperationLock(opId);
        lockAcquired = true;
      } catch (e) {
        if (e instanceof ErrorHandler.ErrorTypes.LOCK_TIMEOUT) {
          this._logger.error('Lock acquisition timed out', { collection: name, operationId: opId, timeout: this._config.lockTimeout });
          throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(operationName, this._config.lockTimeout);
        }
        throw e;
      }

      // Conflict detection and resolution
      if (this.hasConflict()) {
        this._logger.warn('Conflict detected, resolving', { collection: name });
        this.resolveConflict();
      }

      // Perform operation
      result = callback();
      // Enforce coordination timeout on operation execution
      const elapsed = Date.now() - startTime;
      if (elapsed > this._config.lockTimeout) {
        this._logger.error('Operation timed out', { collection: name, opId, timeout: this._config.lockTimeout });
        throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(operationName, this._config.lockTimeout);
      }

      // Persist metadata updates
      this.updateMasterIndexMetadata();

      return result;
    } catch (e) {
      // Log and rethrow
      this._logger.error(`Operation ${operationName} failed`, { collection: name, opId, error: e.message });
      throw e;
    } finally {
      if (lockAcquired) {
        this.releaseOperationLock(opId);
      }
      this._logger.info(`Operation ${operationName} complete`, { collection: name, opId });
    }
  }

  /**
   * Validate modification tokens match before operation
   * @param {string} localToken - Local collection metadata token
   * @param {string|null} remoteToken - Master index metadata token
   * @throws {ErrorHandler.ErrorTypes.CONFLICT_ERROR} When tokens differ
   */
  validateModificationToken(localToken, remoteToken) {
    if (remoteToken != null && localToken !== remoteToken) {
      // Throw a specific modification conflict error when tokens differ
      throw new ErrorHandler.ErrorTypes.MODIFICATION_CONFLICT(
        this._collection.getName(),
        localToken,
        remoteToken,
        `Modification token mismatch for collection: ${this._collection.getName()}`
      );
    }
  }

  /**
   * Acquire operation lock with retry/backoff
   * @param {string} operationId - Unique operation identifier
   * @throws {ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE} When lock cannot be acquired
   * @throws {Error} For unexpected errors during lock acquisition.
   */
  acquireOperationLock(operationId) {
    const name = this._collection.getName();
    const { retryAttempts, retryDelayMs, lockTimeout } = this._config;
    
    let acquired = false;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const got = this._masterIndex.acquireCollectionLock(name, operationId, lockTimeout);
        if (got) {
          acquired = true;
          break;
        }
        // retry after backoff
        if (attempt < retryAttempts) {
          Utilities.sleep(retryDelayMs * Math.pow(2, attempt - 1));
        }
      } catch (e) {
        this._logger.error('Unexpected error during lock acquisition attempt', { collection: name, operationId, error: e.message });
        // Re-throw unexpected errors immediately, as they are not contention issues
        // and should not be handled by the standard retry/fail mechanism.
        throw e;
      }
    }
    if (!acquired) {
      this._logger.warn('Could not acquire lock after retries', { collection: name, operationId });
      // Throw specific error when lock acquisition fails
      throw new ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE(name);
    }
  }

  /**
   * Release operation lock
   * @param {string} operationId - Unique operation identifier
   */
  releaseOperationLock(operationId) {
    const name = this._collection.getName();
    try {
      this._masterIndex.releaseCollectionLock(name, operationId);
    } catch {
      this._logger.error('Lock release failed', { collection: name, operationId });
      // swallow release errors to avoid masking operation errors
    }
  }

  /**
   * Check whether local metadata token differs from master index
   * @returns {boolean} True if there is a conflict
   */
  hasConflict() {
    const name = this._collection.getName();
    const localToken = this._collection._metadata.getModificationToken();
    const masterMeta = this._masterIndex.getCollection(name);
    const remoteToken = masterMeta ? masterMeta.getModificationToken() : null;
    return localToken !== remoteToken;
  }

  /**
   * Resolve a metadata conflict. Only reload is supported, so just reload.
   * @throws {ErrorHandler.ErrorTypes.CONFLICT_ERROR} When resolution fails
   */
  resolveConflict() {
    // Only reload is supported, so always reload
    this._collection._ensureLoaded();
  }

  /**
   * Update the master index with latest collection metadata
   */
  updateMasterIndexMetadata() {
    const name = this._collection.getName();
    const meta = this._collection._metadata;
    const updates = {
      documentCount: meta.documentCount,
      modificationToken: meta.getModificationToken()
    };
    try {
      if (this._masterIndex.getCollection(name)) {
        this._masterIndex.updateCollectionMetadata(name, updates);
      } else {
        // Initial registration of new collection
        this._masterIndex.addCollection(name, meta);
      }
    } catch (e) {
      // Log and wrap any failure in a MasterIndexError
      this._logger.error('Master index metadata update failed', { collection: name, error: e.message });
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR(
        'updateCollectionMetadata',
        e.message
      );
    }
  }
}
