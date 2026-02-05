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
   * @param {JDbLogger} _logger - Logger factory override
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When dependencies or config invalid
   */
  constructor(collection, masterIndex, config = {}, _logger = JDbLogger) {
    Validate.object(collection, 'collection');
    Validate.object(masterIndex, 'masterIndex');
    Validate.object(config, 'config');
    this._collection = collection;
    this._masterIndex = masterIndex;
    this._logger = JDbLogger.createComponentLogger('CollectionCoordinator');

    const resolvedConfig = config instanceof DatabaseConfig ? config : new DatabaseConfig(config);
    this._config = {
      lockTimeout: resolvedConfig.lockTimeout,
      retryAttempts: resolvedConfig.retryAttempts,
      retryDelayMs: resolvedConfig.retryDelayMs,
      lockRetryBackoffBase: resolvedConfig.lockRetryBackoffBase
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
    const name = this._collection.getName();
    let lockAcquired = false;
    const startTime = Date.now();

    this._logger.debug(`Starting operation: ${operationName}`, { collection: name, opId });

    try {
      lockAcquired = this._acquireLockWithTimeoutMapping(opId, operationName, name);
      this._resolveConflictsIfPresent(name);
      const result = this._executeOperationWithTimeout(callback, operationName, opId, name, startTime);
      this.updateMasterIndexMetadata();
      return result;
    } catch (e) {
      this._logger.error(`Operation ${operationName} failed`, {
        collection: name,
        opId,
        error: e.message
      });
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
    if (remoteToken !== null && remoteToken !== undefined && localToken !== remoteToken) {
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
   * Acquire lock with timeout mapping to coordination timeout error.
   * @param {string} opId - Operation identifier
   * @param {string} operationName - Operation name for error context
   * @param {string} collectionName - Collection name for logging
   * @returns {boolean} True when lock was acquired
   * @throws {ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT} When lock acquisition times out
   * @throws {ErrorHandler.ErrorTypes.*} For other lock acquisition failures
   * @private
   */
  _acquireLockWithTimeoutMapping(opId, operationName, collectionName) {
    try {
      this.acquireOperationLock(opId);
      return true;
    } catch (e) {
      if (e instanceof ErrorHandler.ErrorTypes.LOCK_TIMEOUT) {
        this._logger.error('Lock acquisition timed out', {
          collection: collectionName,
          operationId: opId,
          timeout: this._config.lockTimeout
        });
        throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(
          operationName,
          this._config.lockTimeout
        );
      }
      throw e;
    }
  }

  /**
   * Resolve conflicts if detected.
   * @param {string} collectionName - Collection name for logging
   * @private
   */
  _resolveConflictsIfPresent(collectionName) {
    if (this.hasConflict()) {
      this._logger.warn('Conflict detected, resolving', { collection: collectionName });
      this.resolveConflict();
    }
  }

  /**
   * Execute operation callback with timeout enforcement.
   * @param {Function} callback - Operation callback
   * @param {string} operationName - Operation name for error context
   * @param {string} opId - Operation identifier for logging
   * @param {string} collectionName - Collection name for logging
   * @param {number} startTime - Operation start timestamp
   * @returns {*} Operation result
   * @throws {ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT} When operation exceeds timeout
   * @private
   */
  _executeOperationWithTimeout(callback, operationName, opId, collectionName, startTime) {
    const result = callback();
    const elapsed = Date.now() - startTime;
    if (elapsed > this._config.lockTimeout) {
      this._logger.error('Operation timed out', {
        collection: collectionName,
        opId,
        timeout: this._config.lockTimeout
      });
      throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(
        operationName,
        this._config.lockTimeout
      );
    }
    return result;
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
          Utilities.sleep(retryDelayMs * Math.pow(this._config.lockRetryBackoffBase, attempt - 1));
        }
      } catch (e) {
        this._logger.error('Unexpected error during lock acquisition attempt', {
          collection: name,
          operationId,
          error: e.message
        });
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
      this._logger.error('Master index metadata update failed', {
        collection: name,
        error: e.message
      });
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('updateCollectionMetadata', e.message);
    }
  }
}
