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
  constructor(collection, masterIndex, config = {}, logger = GASDBLogger) {
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

    if (!this._config.coordinationEnabled) {
      return callback();
    }

    this._logger.startOperation(operationName, { collection: name, opId });
    this.acquireOperationLock(opId);
    try {
      // Conflict detection
      if (this.hasConflict()) {
        this._logger.warn('Conflict detected, resolving', { collection: name });
        this.resolveConflict();
      }
      // Perform the core CRUD
      result = callback();
      // Persist metadata changes
      this.updateMasterIndexMetadata();
      return result;
    } finally {
      this.releaseOperationLock(opId);
      this._logger.info(`Operation ${operationName} complete`, { collection: name, opId });
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

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        this._masterIndex.acquireCollectionLock(name, operationId, lockTimeoutMs);
        return;
      } catch (e) {
        if (attempt === retryAttempts) {
          this._logger.error('Lock acquisition failed', { collection: name, operationId });
          throw new ErrorHandler.ErrorTypes.LOCK_TIMEOUT(
            `Failed to acquire lock for ${name} after ${retryAttempts} attempts`
          );
        }
        Utilities.sleep(retryDelayMs * Math.pow(2, attempt - 1));
      }
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
    this._masterIndex.updateCollectionMetadata(name, updates);
  }
}
