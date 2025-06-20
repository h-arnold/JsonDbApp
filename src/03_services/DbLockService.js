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

    // Master index key configuration
    if (config.masterIndexKey !== undefined) {
      Validate.nonEmptyString(config.masterIndexKey, 'config.masterIndexKey');
      this._masterIndexKey = config.masterIndexKey;
    } else {
      this._masterIndexKey = 'GASDB_MASTER_INDEX';
    }

    // Private script lock property
    this._scriptLock = null;
  }

  /**
   * Acquire a script-level lock
   * @param {number} timeout - Timeout in milliseconds
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT|ErrorHandler.ErrorTypes.LOCK_TIMEOUT}
   */
  acquireScriptLock(timeout) {
    // Validate the timeout argument
    this._validateTimeout(timeout);
    // Acquire the GAS script lock instance (throws if unavailable)
    this._acquireScriptLockInstance();
    // Wait for the lock, throw if timeout occurs
    this._waitForScriptLock(timeout);
  }

  /**
   * Private: Validate timeout argument for script lock
   * @param {number} timeout
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT}
   */
  _validateTimeout(timeout) {
    // Ensures timeout is required, a number, and non-negative
    Validate.required(timeout, 'timeout');
    Validate.number(timeout, 'timeout');
    Validate.nonNegativeNumber(timeout, 'timeout');
  }

  /**
   * Private: Acquire the GAS script lock instance, or throw if unavailable
   */
  _acquireScriptLockInstance() {
    // Attempts to get the script lock; throws OPERATION_ERROR if LockService is unavailable
    try {
      this._scriptLock = LockService.getScriptLock();
    } catch (err) {
      this._logger.error('LockService unavailable', { error: err.message });
      throw new ErrorHandler.ErrorTypes.OPERATION_ERROR('LockServiceUnavailable', err.message);
    }
  }

  /**
   * Private: Wait for the script lock, or throw LOCK_TIMEOUT on failure
   * @param {number} timeout
   */
  _waitForScriptLock(timeout) {
    // Attempts to acquire the lock within the timeout; throws LOCK_TIMEOUT if not acquired
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
    // Validate that _scriptLock is a non-empty object with a releaseLock function
    Validate.func(this._scriptLock.releaseLock, 'lock.releaseLock');
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
    const data = props.getProperty(this._masterIndexKey);
    try {
      return data ? JSON.parse(data) : { locks: {} };
    } catch (err) {
      throw new ErrorHandler.ErrorTypes.FILE_IO_ERROR('parseMasterIndex', this._masterIndexKey, err);
    }
  }

  // Internal helper to serialize and save master index
  _saveIndex(index) {
    const props = PropertiesService.getScriptProperties();
    try {
      props.setProperty(this._masterIndexKey, JSON.stringify(index));
    } catch (err) {
      throw new ErrorHandler.ErrorTypes.FILE_IO_ERROR('saveMasterIndex', this._masterIndexKey, err);
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