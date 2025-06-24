/**
 * CollectionCoordinator - Coordinates cross-instance operations for a collection
 *
 * Encapsulates locking, conflict detection, retries, metadata updates and error handling
 * for all CRUD operations on a collection.
 */
class CollectionCoordinator {
  /**
   * Create a new CollectionCoordinator
   * @param {Collection} collection - Collection instance to coordinate
   * @param {MasterIndex} masterIndex - MasterIndex for cross-instance coordination
   * @param {Object} config - Coordination settings
   * @param {GASDBLogger} logger - Logger for operation tracing
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When dependencies or config invalid
   */
  constructor(collection, masterIndex, config = {}, _logger = GASDBLogger) {
    Validate.object(collection, 'collection');
    Validate.object(masterIndex, 'masterIndex');
    Validate.object(config, 'config');
    this._collection = collection;
    this._masterIndex = masterIndex;
    this._logger = GASDBLogger.createComponentLogger('CollectionCoordinator');

    // Default coordination settings
    this._config = {
      coordinationEnabled: config.coordinationEnabled !== false,
      lockTimeoutMs: config.lockTimeoutMs || 5000,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 100,
      conflictResolutionStrategy: config.conflictResolutionStrategy || 'reload'
    };
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
    const name = this._collection.name;
    let result;
    let lockAcquired = false;
    // Start timer for coordination timeout
    const startTime = Date.now();

    if (!this._config.coordinationEnabled) {
      return callback();
    }

    this._logger.startOperation(operationName, { collection: name, opId });
    // Acquire lock with timeout mapping
    try {
      try {
        this.acquireOperationLock(opId);
        lockAcquired = true;
      } catch (e) {
        if (e instanceof ErrorHandler.ErrorTypes.LOCK_TIMEOUT) {
          this._logger.error('Lock acquisition timed out', { collection: name, operationId: opId, timeout: this._config.lockTimeoutMs });
          throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(operationName, this._config.lockTimeoutMs);
        }
        throw e;
      }

      // Validate tokens before proceeding
      const localToken = this._collection._metadata.getModificationToken();
      const masterMeta = this._masterIndex.getCollection(name);
      const remoteToken = masterMeta ? masterMeta.getModificationToken() : null;
      this.validateModificationToken(localToken, remoteToken);

      // Conflict detection and resolution
      if (this.hasConflict()) {
        this._logger.warn('Conflict detected, resolving', { collection: name });
        this.resolveConflict();
      }

      // Perform operation
      result = callback();
      // Enforce coordination timeout on operation execution
      const elapsed = Date.now() - startTime;
      if (elapsed > this._config.lockTimeoutMs) {
        this._logger.error('Operation timed out', { collection: name, opId, timeout: this._config.lockTimeoutMs });
        throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(operationName, this._config.lockTimeoutMs);
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
      throw new ErrorHandler.ErrorTypes.ModificationConflictError(
        this._collection.name,
        localToken,
        remoteToken,
        `Modification token mismatch for collection: ${this._collection.name}`
      );
    }
  }

  /**
   * Acquire operation lock with retry/backoff
   * @param {string} operationId - Unique operation identifier
   * @throws {ErrorHandler.ErrorTypes.LOCK_TIMEOUT} When lock cannot be acquired
   */
  acquireOperationLock(operationId) {
    const name = this._collection.name;
    const { retryAttempts, retryDelayMs, lockTimeoutMs } = this._config;
    let acquired = false;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const got = this._masterIndex.acquireCollectionLock(name, operationId, lockTimeoutMs);
        if (got) {
          acquired = true;
          break;
        }
        // retry after backoff
        if (attempt < retryAttempts) {
          Utilities.sleep(retryDelayMs * Math.pow(2, attempt - 1));
        }
      } catch (e) {
        this._logger.error('Lock acquisition error', { collection: name, operationId, error: e.message });
        break;
      }
    }
    if (!acquired) {
      this._logger.warn('Could not acquire lock after retries', { collection: name, operationId });
    }
  }

  /**
   * Release operation lock
   * @param {string} operationId - Unique operation identifier
   */
  releaseOperationLock(operationId) {
    const name = this._collection.name;
    try {
      this._masterIndex.releaseCollectionLock(name, operationId);
    } catch (e) {
      this._logger.error('Lock release failed', { collection: name, operationId });
      // swallow release errors to avoid masking operation errors
    }
  }

  /**
   * Check whether local metadata token differs from master index
   * @returns {boolean} True if there is a conflict
   */
  hasConflict() {
    const name = this._collection.name;
    const localToken = this._collection._metadata.getModificationToken();
    const masterMeta = this._masterIndex.getCollection(name);
    const remoteToken = masterMeta ? masterMeta.getModificationToken() : null;
    return localToken !== remoteToken;
  }

  /**
   * Resolve a metadata conflict based on configured strategy
   * @throws {ErrorHandler.ErrorTypes.CONFLICT_ERROR} When strategy unsupported or resolution fails
   */
  resolveConflict() {
    const strategy = this._config.conflictResolutionStrategy;
    if (strategy === 'reload') {
      // Reload data and metadata from storage
      this._collection._ensureLoaded();
    } else {
      throw new ErrorHandler.ErrorTypes.CONFLICT_ERROR(
        `Unsupported conflict resolution strategy: ${strategy}`
      );
    }
  }

  /**
   * Update the master index with latest collection metadata
   */
  updateMasterIndexMetadata() {
    const name = this._collection.name;
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
      throw new ErrorHandler.ErrorTypes.MasterIndexError(
        'updateCollectionMetadata',
        e.message
      );
    }
  }
}
