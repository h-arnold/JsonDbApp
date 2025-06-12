/**
 * MasterIndex - ScriptProperties-based master index for cross-instance coordination
 * 
 * Manages the master index stored in ScriptProperties to coordinate access
 * to collections across multiple Google Apps Script instances. Provides
 * virtual locking, conflict detection, and modification tracking.
 * 
 * @class MasterIndex
 */
class MasterIndex {
  /**
   * Create a new MasterIndex instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this._config = {
      masterIndexKey: config.masterIndexKey || 'GASDB_MASTER_INDEX',
      lockTimeout: config.lockTimeout || 30000, // 30 seconds default
      version: config.version || 1
    };
    
    this._logger = GASDBLogger.createComponentLogger('MasterIndex'); // Initialize logger

    this._data = {
      version: this._config.version,
      lastUpdated: new Date().toISOString(),
      collections: {},
      locks: {},
      modificationHistory: {}
    };
    
    // Load existing data from ScriptProperties if available
    this._loadFromScriptProperties();
  }
  
  /**
   * Check if master index is initialised
   * @returns {boolean} True if initialised
   */
  isInitialised() {
    return this._data && typeof this._data === 'object' && this._data.version;
  }
  
  /**
   * Add a collection to the master index
   * @param {string} name - Collection name
   * @param {Object} metadata - Collection metadata
   */
  addCollection(name, metadata) {
    if (!name || typeof name !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    return this._withScriptLock(() => {
      const collectionData = {
        name: name,
        fileId: metadata.fileId || null,
        created: metadata.created || new Date().toISOString(),
        lastModified: metadata.lastModified || new Date().toISOString(),
        documentCount: metadata.documentCount || 0,
        modificationToken: metadata.modificationToken || this.generateModificationToken(),
        lockStatus: null
      };
      
      this._data.collections[name] = collectionData;
      this._data.lastUpdated = new Date().toISOString();
      
      // Track modification history
      this._addToModificationHistory(name, 'ADD_COLLECTION', collectionData);
      
      return collectionData;
    });
  }
  
  /**
   * Save master index to ScriptProperties
   */
  save() {
    try {
      this._data.lastUpdated = new Date().toISOString();
      const dataString = ObjectUtils.serialise(this._data);
      PropertiesService.getScriptProperties().setProperty(this._config.masterIndexKey, dataString);
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('save', error.message);
    }
  }
  
  /**
   * Get all collections
   * @returns {Object} Collections object
   */
  getCollections() {
    return this._data.collections;
  }
  
  /**
   * Get a specific collection
   * @param {string} name - Collection name
   * @returns {Object} Collection metadata
   */
  getCollection(name) {
    if (!name || typeof name !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    return this._data.collections[name] || null;
  }
  
  /**
   * Update collection metadata
   * @param {string} name - Collection name
   * @param {Object} updates - Metadata updates
   */
  updateCollectionMetadata(name, updates) {
    if (!name || typeof name !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    return this._withScriptLock(() => {
      const collection = this._data.collections[name];
      if (!collection) {
        throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(name);
      }
      
      // Apply updates
      Object.keys(updates).forEach(key => {
        collection[key] = updates[key];
      });
      
      // Update lastModified only if not explicitly provided in updates
      if (!updates.hasOwnProperty('lastModified')) {
        collection.lastModified = new Date().toISOString();
      }
      
      // Generate new modification token if not provided
      if (!updates.modificationToken) {
        collection.modificationToken = this.generateModificationToken();
      }
      
      this._data.lastUpdated = new Date().toISOString();
      
      // Track modification history
      this._addToModificationHistory(name, 'UPDATE_METADATA', updates);
      
      return collection;
    });
  }

  /**
   * Remove a collection from the master index
   * @param {string} name - Collection name to remove
   * @returns {boolean} True if collection was found and removed, false otherwise
   */
  removeCollection(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      this._logger.warn('Invalid collection name for removal', { name });
      return false;
    }

    this._loadFromScriptProperties(); // Ensure current data

    if (this._data.collections && this._data.collections.hasOwnProperty(name)) {
      delete this._data.collections[name];
      // Also remove any associated locks for the collection
      if (this._data.locks && this._data.locks.hasOwnProperty(name)) {
        delete this._data.locks[name];
      }
      this._addToModificationHistory(name, 'removeCollection', { name });
      this.save(); // Persist changes
      this._logger.info('Collection removed from master index', { name });
      return true;
    }
    
    this._logger.warn('Attempted to remove non-existent collection from master index', { name });
    return false;
  }
  
  /**
   * Acquire a lock for a collection
   * @param {string} collectionName - Collection to lock
   * @param {string} operationId - Operation identifier
   * @returns {boolean} True if lock acquired
   */
  acquireLock(collectionName, operationId) {
    if (!collectionName || typeof collectionName !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    if (!operationId || typeof operationId !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Operation ID must be a non-empty string');
    }
    
    return this._withScriptLock(() => {
      // Clean up expired locks first (internal method to avoid deadlock)
      this._internalCleanupExpiredLocks();
      
      // Check if already locked
      if (this.isLocked(collectionName)) {
        return false;
      }
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this._config.lockTimeout);
      
      const lockInfo = {
        lockedBy: operationId,
        lockedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      
      // Store lock in both places for easier management
      this._data.locks[collectionName] = lockInfo;
      
      // Also store in collection if it exists
      if (this._data.collections[collectionName]) {
        this._data.collections[collectionName].lockStatus = lockInfo;
      }
      
      this._data.lastUpdated = new Date().toISOString();
      
      return true;
    });
  }
  
  /**
   * Check if a collection is locked
   * @param {string} collectionName - Collection name
   * @returns {boolean} True if locked
   */
  isLocked(collectionName) {
    if (!collectionName || typeof collectionName !== 'string') {
      return false;
    }
    
    const lockInfo = this._data.locks[collectionName];
    if (!lockInfo) {
      return false;
    }
    
    // Check if lock has expired
    const now = new Date();
    const expiresAt = new Date(lockInfo.expiresAt);
    
    if (now >= expiresAt) {
      // Lock has expired, clean it up
      this._removeLock(collectionName);
      return false;
    }
    
    return true;
  }
  
  /**
   * Release a lock for a collection
   * @param {string} collectionName - Collection to unlock
   * @param {string} operationId - Operation identifier
   * @returns {boolean} True if lock released
   */
  releaseLock(collectionName, operationId) {
    if (!collectionName || typeof collectionName !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    if (!operationId || typeof operationId !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Operation ID must be a non-empty string');
    }
    
    return this._withScriptLock(() => {
      const lockInfo = this._data.locks[collectionName];
      if (!lockInfo) {
        return false; // No lock to release
      }
      
      // Verify the operation ID matches
      if (lockInfo.lockedBy !== operationId) {
        return false; // Cannot release lock held by another operation
      }
      
      this._removeLock(collectionName);
      return true;
    });
  }
  
  /**
   * Clean up expired locks
   * @returns {boolean} True if any locks were cleaned up
   */
  cleanupExpiredLocks() {
    return this._withScriptLock(() => {
      return this._internalCleanupExpiredLocks();
    });
  }
  
  /**
   * Generate a modification token
   * @returns {string} Unique modification token
   */
  generateModificationToken() {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${randomPart}`;
  }
  
  /**
   * Check if there's a conflict for a collection
   * @param {string} collectionName - Collection name
   * @param {string} expectedToken - Expected modification token
   * @returns {boolean} True if there's a conflict
   */
  hasConflict(collectionName, expectedToken) {
    if (!collectionName || typeof collectionName !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    if (!expectedToken || typeof expectedToken !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Expected token must be a non-empty string');
    }
    
    const collection = this._data.collections[collectionName];
    if (!collection) {
      return false; // No collection means no conflict
    }
    
    return collection.modificationToken !== expectedToken;
  }
  
  /**
   * Resolve a conflict
   * @param {string} collectionName - Collection name
   * @param {Object} newData - New data to apply
   * @param {string} strategy - Resolution strategy
   * @returns {Object} Resolution result
   */
  resolveConflict(collectionName, newData, strategy) {
    if (!collectionName || typeof collectionName !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    if (!newData || typeof newData !== 'object') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('New data must be an object');
    }
    
    strategy = strategy || 'LAST_WRITE_WINS';
    
    return this._withScriptLock(() => {
      const collection = this._data.collections[collectionName];
      if (!collection) {
        throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(collectionName);
      }
      
      let resolvedData;
      
      switch (strategy) {
        case 'LAST_WRITE_WINS':
          // Apply new data and generate new token
          resolvedData = {
            ...collection,
            ...newData,
            modificationToken: this.generateModificationToken(),
            lastModified: new Date().toISOString()
          };
          break;
          
        default:
          throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR(`Unknown conflict resolution strategy: ${strategy}`);
      }
      
      // Update the collection
      this._data.collections[collectionName] = resolvedData;
      this._data.lastUpdated = new Date().toISOString();
      
      // Track conflict resolution in history
      this._addToModificationHistory(collectionName, 'CONFLICT_RESOLVED', {
        strategy: strategy,
        newData: newData,
        resolvedToken: resolvedData.modificationToken
      });
      
      return {
        success: true,
        data: resolvedData,
        strategy: strategy
      };
    });
  }
  
  /**
   * Get modification history for a collection
   * @param {string} collectionName - Collection name
   * @returns {Array} Modification history
   */
  getModificationHistory(collectionName) {
    if (!collectionName || typeof collectionName !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    return this._data.modificationHistory[collectionName] || [];
  }
  
  /**
   * Validate a modification token format
   * @param {string} token - Token to validate
   * @returns {boolean} True if valid
   */
  validateModificationToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Token should be in format: timestamp-randomstring
    const tokenPattern = /^\d+-[a-z0-9]+$/;
    return tokenPattern.test(token);
  }
  
  // ==================== PRIVATE HELPER METHODS ====================
  
  /**
   * Load data from ScriptProperties
   * @private
   */
  _loadFromScriptProperties() {
    try {
      const dataString = PropertiesService.getScriptProperties().getProperty(this._config.masterIndexKey);
      if (dataString) {
        const loadedData = ObjectUtils.deserialise(dataString);
        // Merge loaded data with defaults
        this._data = {
          ...this._data,
          ...loadedData
        };
      }
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('load', error.message);
    }
  }
  
  /**
   * Remove a lock from both storage locations
   * @param {string} collectionName - Collection name
   * @private
   */
  _removeLock(collectionName) {
    delete this._data.locks[collectionName];
    
    if (this._data.collections[collectionName]) {
      this._data.collections[collectionName].lockStatus = null;
    }
  }
  
  /**
   * Add entry to modification history
   * @param {string} collectionName - Collection name
   * @param {string} operation - Operation type
   * @param {Object} data - Operation data
   * @private
   */
  _addToModificationHistory(collectionName, operation, data) {
    if (!this._data.modificationHistory[collectionName]) {
      this._data.modificationHistory[collectionName] = [];
    }
    
    this._data.modificationHistory[collectionName].push({
      operation: operation,
      timestamp: new Date().toISOString(),
      data: data
    });
    
    // Keep only last 50 entries to prevent excessive growth
    if (this._data.modificationHistory[collectionName].length > 50) {
      this._data.modificationHistory[collectionName] = 
        this._data.modificationHistory[collectionName].slice(-50);
    }
  }
  
  /**
   * Internal cleanup of expired locks (without ScriptLock wrapper to prevent deadlock)
   * @returns {boolean} True if any locks were cleaned up
   * @private
   */
  _internalCleanupExpiredLocks() {
    const now = new Date();
    let anyExpired = false;
    
    Object.keys(this._data.locks).forEach(collectionName => {
      const lockInfo = this._data.locks[collectionName];
      const expiresAt = new Date(lockInfo.expiresAt);
      
      if (now >= expiresAt) {
        this._removeLock(collectionName);
        anyExpired = true;
      }
    });
    
    if (anyExpired) {
      this._data.lastUpdated = new Date().toISOString();
    }
    
    return anyExpired;
  }
  
  /**
   * Acquire Google Apps Script LockService lock
   * @param {number} timeout - Lock timeout in milliseconds
   * @returns {GoogleAppsScript.Lock.Lock} Lock instance
   * @private
   */
  _acquireScriptLock(timeout = 10000) {
    try {
      const lock = LockService.getScriptLock();
      const acquired = lock.tryLock(timeout);
      
      if (!acquired) {
        throw new ErrorHandler.ErrorTypes.LOCK_TIMEOUT('MasterIndex ScriptLock', timeout);
      }
      
      return lock;
    } catch (error) {
      if (error instanceof ErrorHandler.ErrorTypes.LOCK_TIMEOUT) {
        throw error;
      }
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('lock_acquisition', error.message);
    }
  }
  
  /**
   * Execute operation with ScriptLock protection
   * @param {Function} operation - Operation to execute
   * @param {number} timeout - Lock timeout in milliseconds
   * @returns {*} Operation result
   * @private
   */
  _withScriptLock(operation, timeout = 10000) {
    const lock = this._acquireScriptLock(timeout);
    
    try {
      // Reload data from ScriptProperties to get latest state
      this._loadFromScriptProperties();
      
      // Execute the operation
      const result = operation();
      
      // Save updated data back to ScriptProperties
      this.save();
      
      return result;
    } finally {
      // Always release the lock
      lock.releaseLock();
    }
  }
}