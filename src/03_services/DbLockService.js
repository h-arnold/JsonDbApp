/**
 * DbLockService - Provides script-level locking using Google Apps Script's LockService.
 */
/**
 * Service for managing script-level locks in Google Apps Script.
 *
 * Provides a direct interface to Google Apps Script's LockService to ensure
 * that critical sections of code are executed by only one instance at a time.
 *
 * @class
 * @example
 * const lockService = new DbLockService();
 * lockService.acquireScriptLock(10000); // 10-second timeout
 * try {
 *   // ... critical section ...
 * } finally {
 *   lockService.releaseScriptLock();
 * }
 *
 * @param {Object} [config={}] - Configuration options.
 * @param {number} [config.defaultTimeout=10000] - Default timeout for acquiring a script lock in milliseconds.
 *
 * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} If invalid arguments are provided.
 * @throws {ErrorHandler.ErrorTypes.OPERATION_ERROR} If LockService is unavailable.
 * @throws {ErrorHandler.ErrorTypes.LOCK_TIMEOUT} If a lock cannot be acquired within the timeout.
 */
/* exported DbLockService */
class DbLockService {
  /**
   * Constructor for DbLockService
   * @param {Object} [config={}] - Configuration object
   * @param {number} [config.defaultTimeout=10000] - Default script lock timeout (ms)
   */
  constructor(config = {}) {
    // Validate config object
    Validate.required(config, 'config');
    Validate.object(config, 'config');

    // Default or configured timeout
    if (config.defaultTimeout !== undefined) {
      Validate.number(config.defaultTimeout, 'config.defaultTimeout');
      this._defaultTimeout = config.defaultTimeout;
    } else {
      this._defaultTimeout = 10000; // Default to 10 seconds
    }

    // Logger instance
    this._logger = JDbLogger.createComponentLogger('DbLockService');

    // Private script lock property
    this._scriptLock = null;
  }

  /**
   * Acquire a script-level lock.
   * @param {number} [timeout=this._defaultTimeout] - Timeout in milliseconds.
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT|ErrorHandler.ErrorTypes.LOCK_TIMEOUT}
   */
  acquireScriptLock(timeout = this._defaultTimeout) {
    // Validate the timeout argument
    this._validateTimeout(timeout);
    // Acquire the GAS script lock instance (throws if unavailable)
    this._acquireScriptLockInstance();
    // Wait for the lock, throw if timeout occurs
    this._waitForScriptLock(timeout);
  }

  /**
   * Private: Validate timeout argument for script lock.
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
   * Private: Acquire the GAS script lock instance, or throw if unavailable.
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
   * Private: Wait for the script lock, or throw LOCK_TIMEOUT on failure.
   * @param {number} timeout
   */
  _waitForScriptLock(timeout) {
    // Attempts to acquire the lock within the timeout; throws LOCK_TIMEOUT if not acquired
    try {
      this._scriptLock.waitLock(timeout);
      this._logger.debug('Script lock acquired successfully', { timeout });
    } catch (err) {
      this._logger.error('Failed to acquire script lock', { timeout, error: err.message });
      this._scriptLock = null;
      throw new ErrorHandler.ErrorTypes.LOCK_TIMEOUT('script', timeout);
    }
  }

  /**
   * Release a script-level lock.
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} If no lock is held.
   */
  releaseScriptLock() {
    this._logger.debug('Attempting to release script lock', { lockStatus: !!this._scriptLock });
    if (!this._scriptLock) {
      this._logger.warn('Attempted to release a lock that was not held.');
      return;
    }
    // Validate that _scriptLock is a non-empty object with a releaseLock function
    Validate.func(this._scriptLock.releaseLock, 'lock.releaseLock');
    try {
      this._scriptLock.releaseLock();
      this._scriptLock = null;
      this._logger.debug('Script lock released successfully');
    } catch (err) {
      this._logger.error('Failed to release script lock', { error: err.message });
      // Re-throw the original error to allow for higher-level handling
      throw err;
    }
  }
}