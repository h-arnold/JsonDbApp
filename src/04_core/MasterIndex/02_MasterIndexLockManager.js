/**
 * 02_MasterIndexLockManager.js - Lock management for MasterIndex collections.
 *
 * Centralises collection lock handling to avoid ScriptLock re-entry and to keep
 * MasterIndex focused on metadata operations.
 */
/* exported MasterIndexLockManager */
/* global Validate, ErrorHandler */

/**
 * Manages collection-level virtual locks for MasterIndex.
 * @remarks This is a companion to MasterIndex and intentionally uses internal helpers.
 */
class MasterIndexLockManager {
  /**
   * Create a lock manager bound to a MasterIndex instance.
   * @param {MasterIndex} masterIndex - Parent MasterIndex facade
   */
  constructor(masterIndex) {
    Validate.required(masterIndex, 'masterIndex');
    this._masterIndex = masterIndex;
  }

  /**
   * Acquire a lock for a collection by updating its metadata.
   * @param {string} collectionName - The name of the collection to lock.
   * @param {string} operationId - A unique identifier for the operation acquiring the lock.
   * @param {number} timeout - The duration for which the lock is valid in milliseconds.
   * @returns {boolean} True if the lock was acquired successfully, false otherwise.
   * @throws {ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND} If the collection does not exist.
   */
  acquireCollectionLock(collectionName, operationId, timeout) {
    Validate.nonEmptyString(collectionName, 'collectionName');
    Validate.nonEmptyString(operationId, 'operationId');
    Validate.number(timeout, 'timeout');

    return this._masterIndex._withScriptLock(() => {
      const collection = this._masterIndex.getCollection(collectionName);
      if (!collection) {
        throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(collectionName);
      }

      const lockStatus = collection.getLockStatus();
      const now = Date.now();

      if (lockStatus && lockStatus.isLocked) {
        const expiry = lockStatus.lockedAt + lockStatus.lockTimeout;
        if (now < expiry) {
          this._masterIndex._logger.warn('Failed to acquire lock; collection is already locked.', {
            collectionName,
            operationId
          });
          return false;
        }
      }

      const newLockStatus = {
        isLocked: true,
        lockedBy: operationId,
        lockedAt: now,
        lockTimeout: timeout
      };

      this._setAndPersistLockStatus(collectionName, collection, newLockStatus);

      this._masterIndex._logger.info('Collection lock acquired.', {
        collectionName,
        operationId
      });
      return true;
    });
  }

  /**
   * Release a lock for a collection.
   * @param {string} collectionName - The name of the collection to unlock.
   * @param {string} operationId - The identifier of the operation that holds the lock.
   * @returns {boolean} True if the lock was released, false if the operationId does not match or no lock was held.
   */
  releaseCollectionLock(collectionName, operationId) {
    Validate.nonEmptyString(collectionName, 'collectionName');
    Validate.nonEmptyString(operationId, 'operationId');

    return this._masterIndex._withScriptLock(() => {
      const collection = this._masterIndex.getCollection(collectionName);
      if (!collection) {
        return true;
      }

      const lockStatus = collection.getLockStatus();

      if (!lockStatus || !lockStatus.isLocked) {
        return true;
      }

      if (lockStatus.lockedBy !== operationId) {
        this._masterIndex._logger.warn('Attempted to release lock with incorrect operationId.', {
          collectionName,
          operationId,
          owner: lockStatus.lockedBy
        });
        return false;
      }

      const clearedLockStatus = {
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockTimeout: null
      };

      this._setAndPersistLockStatus(collectionName, collection, clearedLockStatus);

      this._masterIndex._logger.info('Collection lock released.', { collectionName, operationId });
      return true;
    });
  }

  /**
   * Check if a collection is currently locked.
   * @param {string} collectionName - The name of the collection.
   * @returns {boolean} True if the collection is locked, false otherwise.
   * @remarks Assumes the master index state is current; call load() on MasterIndex to refresh.
   */
  isCollectionLocked(collectionName) {
    Validate.nonEmptyString(collectionName, 'collectionName');

    const collection = this._masterIndex.getCollection(collectionName);

    if (!collection) {
      return false;
    }

    const lockStatus = collection.getLockStatus();
    if (!lockStatus || !lockStatus.isLocked) {
      return false;
    }

    const now = Date.now();
    const expiry = lockStatus.lockedAt + lockStatus.lockTimeout;

    return now < expiry;
  }

  /**
   * Cleans up expired locks for all collections.
   * @returns {void}
   */
  cleanupExpiredLocks() {
    return this._masterIndex._withScriptLock(() => {
      const collections = this._masterIndex.getCollections();
      const now = Date.now();

      const collectionNames = Object.keys(collections);
      for (const name of collectionNames) {
        const collection = collections[name];
        const lockStatus = collection.getLockStatus();

        if (lockStatus && lockStatus.isLocked) {
          const expiry = lockStatus.lockedAt + lockStatus.lockTimeout;
          if (now >= expiry) {
            this._masterIndex._logger.info('Cleaning up expired lock.', {
              collectionName: name
            });
            this._setAndPersistLockStatus(name, collection, null);
          }
        }
      }
    });
  }

  /**
   * Set lock status on collection and persist to MasterIndex.
   * @param {string} collectionName - Collection name
   * @param {CollectionMetadata} collection - Collection metadata instance
   * @param {Object|null} lockStatus - Lock status payload or null to clear
   * @private
   */
  _setAndPersistLockStatus(collectionName, collection, lockStatus) {
    collection.setLockStatus(lockStatus);
    this._masterIndex._updateCollectionMetadataInternal(collectionName, {
      lockStatus: collection.getLockStatus()
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MasterIndexLockManager };
}
