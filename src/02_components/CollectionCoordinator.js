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
   * @param {Object|DatabaseConfig} config - Coordination settings or DatabaseConfig
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

    // Improved config extraction logic for both plain objects and DatabaseConfig
    function getCfg(key, def) {
      if (config && Object.prototype.hasOwnProperty.call(config, key)) return config[key];
      if (config && key in config && config[key] !== undefined) return config[key];
      return def;
    }
    this._config = {
      coordinationEnabled: getCfg('coordinationEnabled', true),
      lockTimeout: getCfg('lockTimeout', 30000),
      retryAttempts: getCfg('retryAttempts', 3),
      retryDelayMs: getCfg('retryDelayMs', 1000),
      conflictResolutionStrategy: getCfg('conflictResolutionStrategy', 'reload')
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
    let result;
    let lockAcquired = false;
    // Start timer for coordination timeout
    const startTime = Date.now();
    if (!this._config.coordinationEnabled) {
      return callback();
    }
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
   * @throws {ErrorHandler.ErrorTypes.LOCK_TIMEOUT} When lock cannot be acquired
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
        this._logger.error('Lock acquisition error', { collection: name, operationId, error: e.message });
        break;
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
    const name = this._collection.getName();
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
