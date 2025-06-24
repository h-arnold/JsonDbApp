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
    
    this._logger = GASDBLogger.createComponentLogger('MasterIndex');

    // DbLockService is now only for script-level locks
    this._dbLockService = new DbLockService({ defaultTimeout: this._config.lockTimeout });
    
    // Load data first
    this._loadFromScriptProperties();

    // If no data, initialise
    if (!this._data) {
      this._data = {
        version: this._config.version,
        lastUpdated: new Date(),
        collections: {},
        modificationHistory: {}
      };
      // Persist the initial empty index
      this.save();
    }
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
    Validate.nonEmptyString(name, 'name');
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
    Validate.object(collectionsMap, 'collectionsMap', false);
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
   * @param {Object} [dataOverride] - Optional data to save instead of internal state
   */
  save(dataOverride) {
    try {
      const dataToSave = dataOverride || this._data;
      dataToSave.lastUpdated = new Date();
      const dataString = ObjectUtils.serialise(dataToSave);
      PropertiesService.getScriptProperties().setProperty(this._config.masterIndexKey, dataString);
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('save', error.message);
    }
  }
  
  /**
   * Load master index from ScriptProperties
   * @returns {Object|null} Deserialized index data
   */
  load() {
    try {
      const dataString = PropertiesService.getScriptProperties().getProperty(this._config.masterIndexKey);
      const data = dataString ? ObjectUtils.deserialise(dataString) : null;
      this._data = data;
      return data;
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('load', error.message);
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
    Validate.nonEmptyString(name, 'name');
    
    const rawData = this._data.collections[name];
    if (!rawData) {
      return null;
    }
    // Ensure we have a CollectionMetadata instance (revived or created)
    const collectionMetadata = rawData instanceof CollectionMetadata
      ? rawData
      : new CollectionMetadata(rawData);
    
    return collectionMetadata;
  }
  
  /**
   * Update collection metadata
   * @param {string} name - Collection name
   * @param {Object} updates - Metadata updates
   */
  updateCollectionMetadata(name, updates) {
    Validate.nonEmptyString(name, 'name');
    Validate.object(updates, 'updates');

    return this._withScriptLock(() => {
      const collection = this.getCollection(name);
      if (!collection) {
        throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(name);
      }

      // Apply updates to the collection metadata
      Object.assign(collection, updates);

      // Only generate a new modification token if one wasn't provided in the updates
      if (!updates.modificationToken) {
        collection.updateModificationToken();
      }

      this._data.collections[name] = collection.toJSON();
      this.save();
      this._logger.info('Collection metadata updated.', { collection: name, updates });
      return collection;
    });
  }

  /**
   * Remove a collection from the master index
   * @param {string} name - Collection name to remove
   * @returns {boolean} True if collection was found and removed, false otherwise
   */
  removeCollection(name) {
    if (!Validate.object(this._data.collections, 'collections', false) || !Validate.object(this._data, 'data', false)) {
      this._logger.warn('Internal state corrupted', { name });
      return false; // Should not happen in normal operation
    }
    Validate.nonEmptyString(name, 'name');

    return this._withScriptLock(() => {
      this._loadFromScriptProperties(); // Ensure current data

      if (this._data.collections && this._data.collections.hasOwnProperty(name)) {
        delete this._data.collections[name];
        this._addToModificationHistory(name, 'removeCollection', { name });
        this.save(); // Persist changes
        this._logger.info('Collection removed from master index', { name });
        return true;
      }
      
      this._logger.warn('Attempted to remove non-existent collection from master index', { name });
      return false;
    });
  }
  
  /**
   * Acquire a lock for a collection by updating its metadata.
   * This operation is protected by a script-level lock to ensure atomicity.
   * @param {string} collectionName - The name of the collection to lock.
   * @param {string} operationId - A unique identifier for the operation acquiring the lock.
   * @param {number} [timeout=this._config.lockTimeout] - The duration for which the lock is valid in milliseconds.
   * @returns {boolean} True if the lock was acquired successfully, false otherwise.
   * @throws {ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND} If the collection does not exist.
   */
  acquireCollectionLock(collectionName, operationId, timeout = this._config.lockTimeout) {
    Validate.nonEmptyString(collectionName, 'collectionName');
    Validate.nonEmptyString(operationId, 'operationId');
    Validate.number(timeout, 'timeout');

    return this._withScriptLock(() => {
      const collection = this.getCollection(collectionName);
      if (!collection) {
        throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(collectionName);
      }

      const lockStatus = collection.getLockStatus();
      const now = Date.now();

      if (lockStatus && lockStatus.isLocked) {
        const expiry = lockStatus.lockedAt + lockStatus.lockTimeout;
        if (now < expiry) {
          this._logger.warn('Failed to acquire lock; collection is already locked.', { collectionName, operationId });
          return false; // Lock is held by another operation
        }
      }

      // Acquire lock
      const newLockStatus = {
        isLocked: true,
        lockedBy: operationId,
        lockedAt: now,
        lockTimeout: timeout
      };
      collection.setLockStatus(newLockStatus);
      this.updateCollectionMetadata(collectionName, { 
        lockStatus: collection.getLockStatus(),
      });
      
      this._logger.info('Collection lock acquired.', { collectionName, operationId });
      return true;
    });
  }

  /**
   * Release a lock for a collection.
   * This operation is protected by a script-level lock.
   * @param {string} collectionName - The name of the collection to unlock.
   * @param {string} operationId - The identifier of the operation that holds the lock.
   * @returns {boolean} True if the lock was released, false if the operationId does not match or no lock was held.
   */
  releaseCollectionLock(collectionName, operationId) {
    Validate.nonEmptyString(collectionName, 'collectionName');
    Validate.nonEmptyString(operationId, 'operationId');

    return this._withScriptLock(() => {
      const collection = this.getCollection(collectionName);
      if (!collection) {
        return true;
      }

      const lockStatus = collection.getLockStatus();

      if (!lockStatus || !lockStatus.isLocked) {
        return true; // Not locked, so release is successful.
      }

      if (lockStatus.lockedBy !== operationId) {
        this._logger.warn('Attempted to release lock with incorrect operationId.', { collectionName, operationId, owner: lockStatus.lockedBy });
        return false; // Lock held by someone else.
      }

      // Release lock
      collection.setLockStatus(null);
      this.updateCollectionMetadata(collectionName, { 
        lockStatus: null,
      });
      
      this._logger.info('Collection lock released.', { collectionName, operationId });
      return true;
    });
  }

  /**
   * Check if a collection is currently locked.
   * This method does not require a script lock for a read-only check.
   * @param {string} collectionName - The name of the collection.
   * @returns {boolean} True if the collection is locked, false otherwise.
   */
  isCollectionLocked(collectionName) {
    Validate.nonEmptyString(collectionName, 'collectionName');
    
    this._loadFromScriptProperties();
    const collection = this.getCollection(collectionName);

    if (!collection) {
      return false;
    }

    const lockStatus = collection.getLockStatus();
    if (!lockStatus || !lockStatus.isLocked) {
      return false;
    }

    const now = Date.now();
    const expiry = lockStatus.lockedAt + lockStatus.lockTimeout;

    if (now >= expiry) {
      return false;
    }

    return true;
  }

  /**
   * Cleans up expired locks for all collections.
   * This is a write operation and is protected by a script lock.
   */
  cleanupExpiredLocks() {
    return this._withScriptLock(() => {
      const collections = this.getCollections();
      const now = Date.now();

      for (const name in collections) {
        if (collections.hasOwnProperty(name)) {
          const collection = collections[name];
          const lockStatus = collection.getLockStatus();

          if (lockStatus && lockStatus.isLocked) {
            const expiry = lockStatus.lockedAt + lockStatus.lockTimeout;
            if (now >= expiry) {
              this._logger.info('Cleaning up expired lock.', { collectionName: name });
              collection.setLockStatus(null);
              this.updateCollectionMetadata(name, { lockStatus: null });
            }
          }
        }
      }
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
    Validate.nonEmptyString(collectionName, 'collectionName');
    Validate.nonEmptyString(expectedToken, 'expectedToken');
    
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
    Validate.nonEmptyString(collectionName, 'collectionName');
    Validate.object(newData, 'newData', false);
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
    Validate.nonEmptyString(collectionName, 'collectionName');
    
    return this._data.modificationHistory[collectionName] || [];
  }
  
  /**
   * Validate a modification token format
   * @param {string} token - Token string to validate
   * @returns {boolean} True if valid format (timestamp-random)
   */
  validateModificationToken(token) {
    if (typeof token !== 'string') {
      return false;
    }
    const regex = /^\d+-[a-z0-9]+$/;
    return regex.test(token);
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
        this._data = ObjectUtils.deserialise(dataString);
      } else {
        this._data = null;
      }
    } catch (error) {
      this._logger.error('Failed to load master index from ScriptProperties', { error: error.message });
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('load', error.message);
    }
  }

  /**
   * Execute operation with ScriptLock protection
   * @param {Function} operation - Operation to execute
   * @param {number} timeout - Lock timeout in milliseconds
   * @returns {*} Operation result
   * @private
   */
  _withScriptLock(operation, timeout = this._config.lockTimeout) {
    this._dbLockService.acquireScriptLock(timeout);
    try {
      return operation();
    } finally {
      this._dbLockService.releaseScriptLock();
    }
  }

  /**
   * Add entry to modification history for debugging and auditing
   * @param {string} collectionName - Collection name
   * @param {string} operation - Operation type (e.g., 'ADD_COLLECTION', 'UPDATE_METADATA')
   * @param {Object} data - Operation data/payload
   * @private
   */
  _addToModificationHistory(collectionName, operation, data) {
    if (!Validate.isPlainObject(this._data.modificationHistory)) {
      this._data.modificationHistory = {};
    }
    if (!collectionName || typeof collectionName !== 'string') {
      return; // Silent fail for invalid collection names to avoid breaking existing operations
    }
    
    // Ensure modificationHistory structure exists
    if (!this._data.modificationHistory) {
      this._data.modificationHistory = {};
    }
    
    if (!this._data.modificationHistory[collectionName]) {
      this._data.modificationHistory[collectionName] = [];
    }
    
    // Add new history entry
    const entry = {
      operation: operation || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      data: data || null
    };
    
    this._data.modificationHistory[collectionName].push(entry);
    
    // Optional: Limit history size to prevent unbounded growth
    const maxHistoryEntries = 100; // Keep last 100 operations
    if (this._data.modificationHistory[collectionName].length > maxHistoryEntries) {
      this._data.modificationHistory[collectionName] = this._data.modificationHistory[collectionName].slice(-maxHistoryEntries);
    }
  }
}