/**
 * DbLockService - Provides script and collection level locking
 */
class DbLockService {
  /**
   * Constructor for DbLockService
   * @param {Object} [config={}] - Configuration object
   * @param {number} [config.lockTimeout=5000] - Default lock timeout for collection locks (ms)
   */
  constructor(config = {}) {
    // Validate config object
    Validate.required(config, 'config');
    Validate.object(config, 'config');

    // Default or configured timeout
    if (config.lockTimeout !== undefined) {
      Validate.number(config.lockTimeout, 'config.lockTimeout');
      this._lockTimeout = config.lockTimeout;
    } else {
      this._lockTimeout = 5000;
    }

    // Logger instance
    this._logger = GASDBLogger.createComponentLogger('DbLockService');

    // Private script lock property
    this._scriptLock = null;
  }

  /**
   * Acquire a script-level lock
   * @param {number} timeout - Timeout in milliseconds
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT|ErrorHandler.ErrorTypes.LOCK_TIMEOUT}
   */
  acquireScriptLock(timeout) {
    Validate.required(timeout, 'timeout');
    Validate.number(timeout, 'timeout');
    if (timeout < 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('timeout', timeout, 'timeout must be non-negative');
    }

    // Require native GAS LockService
    if (!globalThis.LockService || typeof globalThis.LockService.getScriptLock !== 'function') {
      this._logger.error('Native GAS LockService not available');
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('LockService', null, 'Native GAS LockService is required');
    }

    // Acquire GAS script lock
    this._scriptLock = globalThis.LockService.getScriptLock();
    try {
      this._scriptLock.waitLock(timeout);
    } catch (err) {
      this._logger.error('Failed to acquire script lock', { timeout, error: err.message });
      this._scriptLock = null;
      throw new ErrorHandler.ErrorTypes.LOCK_TIMEOUT('script', timeout);
    }
  }

  /**
   * Release a script-level lock
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT}
   */
  releaseScriptLock() {
    if (!this._scriptLock || typeof this._scriptLock.releaseLock !== 'function') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('lock', this._scriptLock, 'invalid or missing script lock instance');
    }
    try {
      this._scriptLock.releaseLock();
      this._scriptLock = null;
    } catch (err) {
      this._logger.error('Failed to release script lock', { error: err.message });
      throw err;
    }
  }

  // Internal helper to load and parse master index
  _loadIndex() {
    const props = PropertiesService.getScriptProperties();
    const data = props.getProperty('GASDB_MASTER_INDEX');
    try {
      return data ? JSON.parse(data) : { locks: {} };
    } catch (err) {
      throw new ErrorHandler.ErrorTypes.FILE_IO_ERROR('parseMasterIndex', 'GASDB_MASTER_INDEX', err);
    }
  }

  // Internal helper to serialize and save master index
  _saveIndex(index) {
    const props = PropertiesService.getScriptProperties();
    try {
      props.setProperty('GASDB_MASTER_INDEX', JSON.stringify(index));
    } catch (err) {
      throw new ErrorHandler.ErrorTypes.FILE_IO_ERROR('saveMasterIndex', 'GASDB_MASTER_INDEX', err);
    }
  }

  /**
   * Acquire a per-collection lock
   * @param {string} collectionName - Name of the collection
   * @param {string} operationId - Unique operation identifier
   * @param {number} [timeout] - Optional timeout override in ms
   * @returns {boolean} True if lock acquired, false otherwise
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT}
   */
  acquireCollectionLock(collectionName, operationId, timeout) {
    Validate.required(collectionName, 'collectionName');
    Validate.nonEmptyString(collectionName, 'collectionName');
    Validate.required(operationId, 'operationId');
    Validate.nonEmptyString(operationId, 'operationId');
    const effectiveTimeout = timeout !== undefined ? (Validate.number(timeout, 'timeout'), timeout) : this._lockTimeout;

    const index = this._loadIndex();
    index.locks = index.locks || {};
    const now = Date.now();

    // Check existing lock
    const existing = index.locks[collectionName];
    if (existing) {
      const expiry = existing.timestamp + existing.timeout;
      if (now < expiry) {
        return false;
      }
      // expired, cleanup
      delete index.locks[collectionName];
    }

    // Acquire lock
    index.locks[collectionName] = { operationId, timestamp: now, timeout: effectiveTimeout };
    this._saveIndex(index);
    return true;
  }

  /**
   * Release a per-collection lock
   * @param {string} collectionName - Name of the collection
   * @param {string} operationId - Operation identifier that owns the lock
   * @returns {boolean} True if lock released, false otherwise
   */
  releaseCollectionLock(collectionName, operationId) {
    Validate.required(collectionName, 'collectionName');
    Validate.nonEmptyString(collectionName, 'collectionName');
    Validate.required(operationId, 'operationId');
    Validate.nonEmptyString(operationId, 'operationId');

    const index = this._loadIndex();
    if (!index.locks || !index.locks[collectionName]) {
      return false;
    }
    if (index.locks[collectionName].operationId !== operationId) {
      return false;
    }
    delete index.locks[collectionName];
    this._saveIndex(index);
    return true;
  }

  /**
   * Check if a collection is currently locked
   * @param {string} collectionName - Name of the collection
   * @returns {boolean} True if locked, false otherwise
   */
  isCollectionLocked(collectionName) {
    Validate.required(collectionName, 'collectionName');
    Validate.nonEmptyString(collectionName, 'collectionName');

    const index = this._loadIndex();
    const existing = index.locks && index.locks[collectionName];
    if (!existing) {
      return false;
    }
    const now = Date.now();
    if (now >= existing.timestamp + existing.timeout) {
      // expired, cleanup
      this.cleanupExpiredCollectionLocks();
      return false;
    }
    return true;
  }

  /**
   * Cleanup expired collection locks
   * @returns {boolean} True if any expired locks were removed, false otherwise
   */
  cleanupExpiredCollectionLocks() {
    const index = this._loadIndex();
    const now = Date.now();
    let removed = false;

    Object.keys(index.locks || {}).forEach(name => {
      const lock = index.locks[name];
      if (now >= lock.timestamp + lock.timeout) {
        delete index.locks[name];
        removed = true;
      }
    });

    if (removed) {
      this._saveIndex(index);
    }
    return removed;
  }

  /**
   * Remove a collection lock unconditionally
   * @param {string} collectionName - Name of the collection
   */
  removeCollectionLock(collectionName) {
    Validate.required(collectionName, 'collectionName');
    Validate.nonEmptyString(collectionName, 'collectionName');

    const index = this._loadIndex();
    if (index.locks && index.locks[collectionName]) {
      delete index.locks[collectionName];
      this._saveIndex(index);
    }
  }
}

// Expose class
this.DbLockService = DbLockService;