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
    
    this._logger = GASDBLogger.createComponentLogger('MasterIndex'); // Initialise logger

    this._data = {
      version: this._config.version,
      lastUpdated: new Date(),
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
   * @private
   * Internal logic for adding a single collection without repeated ScriptLock overhead
   * @param {string} name - Collection name
   * @param {Object|CollectionMetadata} metadata - Collection metadata or instance
   * @returns {Object} Serialized collection metadata
   * @throws {InvalidArgumentError} If name is invalid
   */
  _addCollectionInternal(name, metadata) {
    if (!name || typeof name !== 'string') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('Collection name must be a non-empty string');
    }
    let collectionMetadata;
    if (metadata instanceof CollectionMetadata) {
      collectionMetadata = metadata;
      if (collectionMetadata.name !== name) {
        collectionMetadata = new CollectionMetadata(name, collectionMetadata.fileId, metadata);
      }
    } else {
      const created = metadata.created instanceof Date ? metadata.created : new Date(metadata.created || Date.now());
      const lastUpdated = metadata.lastModified instanceof Date ? metadata.lastModified : new Date(metadata.lastModified || Date.now());
      collectionMetadata = new CollectionMetadata(name, metadata.fileId || null, {
        created: created,
        lastUpdated: lastUpdated,
        documentCount: metadata.documentCount || 0,
        modificationToken: metadata.modificationToken || this.generateModificationToken(),
        lockStatus: null
      });
    }
    this._data.collections[name] = collectionMetadata;
    this._data.lastUpdated = new Date();
    this._addToModificationHistory(name, 'ADD_COLLECTION', collectionMetadata);
    return collectionMetadata;
  }
  
  /**
   * Add a collection to the master index with locking
   * @param {string} name - Collection name
   * @param {Object|CollectionMetadata} metadata - Collection metadata or instance
   * @returns {Object} Serialized collection metadata
   */
  addCollection(name, metadata) {
    return this._withScriptLock(() => this._addCollectionInternal(name, metadata));
  }
  
  /**
   * Bulk add multiple collections under a single lock
   * @param {Object<string, Object|CollectionMetadata>} collectionsMap - Map of name to metadata
   * @returns {Object[]} Array of serialized metadata objects
   * @throws {InvalidArgumentError} When collectionsMap is invalid
   */
  addCollections(collectionsMap) {
    if (!collectionsMap || typeof collectionsMap !== 'object') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('collectionsMap must be a non-empty object');
    }
    return this._withScriptLock(() => {
      const results = [];
      Object.entries(collectionsMap).forEach(([name, meta]) => {
        results.push(this._addCollectionInternal(name, meta));
      });
      return results;
    });
  }
  
  /**
   * Save master index to ScriptProperties
   */
  save() {
    try {
      this._data.lastUpdated = new Date();
      const dataString = ObjectUtils.serialise(this._data);
      PropertiesService.getScriptProperties().setProperty(this._config.masterIndexKey, dataString);
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('save', error.message);
    }
  }
  
  /**
   * Get all collections
   * @returns {Object} Collections object with CollectionMetadata instances
   */
  getCollections() {
    const collections = {};
    Object.keys(this._data.collections).forEach(name => {
      collections[name] = this._data.collections[name];
    });
    return collections;
  }
  
  /**
   * Get a specific collection
   * @param {string} name - Collection name
   * @returns {CollectionMetadata|null} Collection metadata instance or null if not found
   */
  getCollection(name) {
    if (!name || typeof name !== 'string') {
      throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('Collection name must be a non-empty string');
    }
    
    const rawData = this._data.collections[name];
    if (!rawData) {
      return null;
    }
    // Ensure we have a CollectionMetadata instance (revived or created)
    const collectionMetadata = rawData instanceof CollectionMetadata
      ? rawData
      : new CollectionMetadata(rawData);
    
    // Synchronise lock status from current locks
    const currentLock = this._data.locks[name];
    if (currentLock) {
      // Check if lock is still valid (not expired)
      const now = Date.now();
      const expiresAt = currentLock.lockTimeout || currentLock.expiresAt;
      
      if (now < expiresAt) {
        // Lock is still active, update metadata
        collectionMetadata.setLockStatus(currentLock);
      } else {
        // Lock expired, remove it
        this._removeLock(name);
      }
    }
    
    return collectionMetadata;
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
      const rawData = this._data.collections[name];
      if (!rawData) {
        throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(name);
      }

      // Full replace if a complete metadata object is provided
      if (updates && typeof updates === 'object' && updates.name) {
        const newMetadata = updates instanceof CollectionMetadata
          ? updates
          : new CollectionMetadata(updates);
        this._data.collections[name] = newMetadata;
        this._data.lastUpdated = new Date();
        this._addToModificationHistory(name, 'FULL_METADATA_UPDATE', newMetadata);
        return newMetadata;
      }

      // Instantiate CollectionMetadata for incremental updates
      const collectionMetadata = new CollectionMetadata(rawData);
      
      // Apply updates using CollectionMetadata methods where available
      Object.keys(updates).forEach(key => {
        switch (key) {
          case 'documentCount':
            collectionMetadata.setDocumentCount(updates[key]);
            break;
          case 'modificationToken':
            collectionMetadata.setModificationToken(updates[key]);
            break;
          case 'lockStatus':
            collectionMetadata.setLockStatus(updates[key]);
            break;
          case 'lastModified':
          case 'lastUpdated':
            // Set specific timestamp if provided
            collectionMetadata.lastUpdated = updates[key] instanceof Date ? updates[key] : new Date(updates[key]);
            break;
          default:
            // For other fields, update directly on metadata instance
            collectionMetadata[key] = updates[key];
        }
      });
      
      // Update lastUpdated only if not explicitly provided
      if (!updates.hasOwnProperty('lastModified') && !updates.hasOwnProperty('lastUpdated')) {
        collectionMetadata.touch();
      }
      
      // Generate new modification token if not provided
      if (!updates.modificationToken) {
        collectionMetadata.setModificationToken(this.generateModificationToken());
      }
      
      // Store the updated metadata instance directly
      this._data.collections[name] = collectionMetadata;
      this._data.lastUpdated = new Date();
      
      // Track modification history
      this._addToModificationHistory(name, 'UPDATE_METADATA', updates);
      
      return this._data.collections[name];
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
        isLocked: true,
        lockedBy: operationId,
        lockedAt: now.getTime(), // Use timestamp for consistency
        lockTimeout: expiresAt.getTime() // Use timestamp for consistency
      };
      
      // Store lock in both places for easier management
      this._data.locks[collectionName] = lockInfo;
      
      // Also store in collection if it exists, using CollectionMetadata
      if (this._data.collections[collectionName]) {
        const collectionMetadata = this._data.collections[collectionName];
        collectionMetadata.setLockStatus(lockInfo);
        this._data.collections[collectionName] = collectionMetadata;
      }
      
      this._data.lastUpdated = new Date();
      
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
    const now = Date.now();
    const expiresAt = lockInfo.lockTimeout || lockInfo.expiresAt;
    
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
      const collectionData = this._data.collections[collectionName];
      if (!collectionData) {
        throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(collectionName);
      }

      // Always use a CollectionMetadata instance
      const collectionMetadata = collectionData instanceof CollectionMetadata
        ? collectionData
        : new CollectionMetadata(collectionData);

      switch (strategy) {
        case 'LAST_WRITE_WINS':
          // Apply new data using CollectionMetadata methods where possible
          Object.keys(newData).forEach(key => {
            switch (key) {
              case 'documentCount':
                collectionMetadata.setDocumentCount(newData[key]);
                break;
              case 'modificationToken':
                collectionMetadata.setModificationToken(newData[key]);
                break;
              case 'lockStatus':
                collectionMetadata.setLockStatus(newData[key]);
                break;
              default:
                break;
            }
          });
          collectionMetadata.setModificationToken(this.generateModificationToken());
          collectionMetadata.touch();

          // Store the updated instance
          this._data.collections[collectionName] = collectionMetadata;
          this._data.lastUpdated = new Date();
          this._addToModificationHistory(collectionName, 'CONFLICT_RESOLVED', {
            strategy,
            newData,
            resolvedToken: collectionMetadata.getModificationToken()
          });

          return { success: true, data: collectionMetadata, strategy };

        default:
          throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR(`Unknown conflict resolution strategy: ${strategy}`);
      }
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
      const instance = this._data.collections[collectionName] instanceof CollectionMetadata
        ? this._data.collections[collectionName]
        : new CollectionMetadata(this._data.collections[collectionName]);
      instance.setLockStatus({ isLocked: false, lockedBy: null, lockedAt: null, lockTimeout: null });
      this._data.collections[collectionName] = instance;
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
      timestamp: new Date(),
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
    const now = Date.now();
    let anyExpired = false;
    
    Object.keys(this._data.locks).forEach(collectionName => {
      const lockInfo = this._data.locks[collectionName];
      const expiresAt = lockInfo.lockTimeout || lockInfo.expiresAt;
      
      if (now >= expiresAt) {
        this._removeLock(collectionName);
        anyExpired = true;
      }
    });
    
    if (anyExpired) {
      this._data.lastUpdated = new Date();
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
      // Skipping reload on each operation for in-memory performance
      // this.loadFromScriptProperties(); //Keeping that here because I have a feeling that this may cause consistency issues if the data is changed by another instance
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