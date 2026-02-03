/**
 * 99_MasterIndex.js - MasterIndex facade coordinating metadata operations.
 *
 * Provides the primary interface for working with the ScriptProperties-backed master index.
 * Delegates metadata normalisation to specialised helpers while retaining locking,
 * conflict detection, and persistence responsibilities.
 */
/* exported MasterIndex */
/* global MasterIndexMetadataNormaliser, MasterIndexLockManager, CollectionMetadata, DbLockService,
          JDbLogger, Validate, ObjectUtils, PropertiesService, ErrorHandler */

// TODO: Move this to Database Config.
const DEFAULT_LOCK_TIMEOUT = 30000;
const RANDOM_TOKEN_RADIX = 36;
const RANDOM_TOKEN_OFFSET = 2;
const RANDOM_TOKEN_LENGTH = 9;

/**
 * Coordinates collection metadata across script executions using a ScriptProperties-backed index.
 */
class MasterIndex {
  /**
   * Create a new MasterIndex instance.
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this._config = this._initialiseConfig(config);

    this._logger = JDbLogger.createComponentLogger('MasterIndex');
    this._dbLockService = new DbLockService({ defaultTimeout: this._config.lockTimeout });
    this._metadataNormaliser = new MasterIndexMetadataNormaliser(this);
    this._lockManager = new MasterIndexLockManager(this);
    this._simpleUpdateHandlers = this._buildSimpleUpdateHandlers();
    this._loadFromScriptProperties();
    this._initialiseDataState();
  }

  /**
   * Check if master index is initialised
   * @returns {boolean} True if initialised
   */
  isInitialised() {
    return this._data && typeof this._data === 'object' && this._data.version;
  }

  /**
   * Internal logic for adding a single collection without repeated ScriptLock overhead
   * @param {string} name - Collection name
   * @param {Object|CollectionMetadata} metadata - Collection metadata or instance
   * @returns {CollectionMetadata} Serialised collection metadata
   * @throws {InvalidArgumentError} If name is invalid
   * @private
   */
  _addCollectionInternal(name, metadata) {
    Validate.nonEmptyString(name, 'name');
    const collectionMetadata = this._normaliseCollectionMetadata(name, metadata);
    const timestamp = this._getCurrentTimestamp();

    this._persistCollectionMetadata(name, collectionMetadata, timestamp);
    return collectionMetadata;
  }

  /**
   * Add a collection to the master index with locking
   * @param {string} name - Collection name
   * @param {Object|CollectionMetadata} metadata - Collection metadata or instance
   * @returns {CollectionMetadata} Serialised collection metadata
   */
  addCollection(name, metadata) {
    return this._withScriptLock(() => this._addCollectionInternal(name, metadata));
  }

  /**
   * Bulk add multiple collections under a single lock
   * @param {Object<string, Object|CollectionMetadata>} collectionsMap - Map of name to metadata
   * @returns {Array<CollectionMetadata>} Array of serialised metadata instances
   * @throws {InvalidArgumentError} When collectionsMap is invalid
   */
  addCollections(collectionsMap) {
    Validate.object(collectionsMap, 'collectionsMap', false);
    return this._withScriptLock(() => {
      const results = [];
      const entries = Object.entries(collectionsMap);
      for (const [collectionName, meta] of entries) {
        results.push(this._addCollectionInternal(collectionName, meta));
      }
      return results;
    });
  }

  /**
   * Save master index to ScriptProperties
   * @param {Object} [dataOverride] - Optional data to save instead of internal state
   * @param {Date} [timestamp] - Optional timestamp override
   * @returns {void}
   */
  save(dataOverride, timestamp = this._getCurrentTimestamp()) {
    try {
      const dataToSave = dataOverride || this._data;
      const effectiveTimestamp =
        timestamp instanceof Date && !Number.isNaN(timestamp.getTime())
          ? new Date(timestamp.getTime())
          : this._getCurrentTimestamp();
      dataToSave.lastUpdated = effectiveTimestamp;
      const dataString = ObjectUtils.serialise(dataToSave);
      PropertiesService.getScriptProperties().setProperty(this._config.masterIndexKey, dataString);
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('save', error.message);
    }
  }

  /**
   * Load master index from ScriptProperties
   * @returns {Object|null} Deserialised index data
   */
  load() {
    try {
      const dataString = PropertiesService.getScriptProperties().getProperty(
        this._config.masterIndexKey
      );
      const data = dataString ? ObjectUtils.deserialise(dataString) : null;
      this._data = data;
      if (this._data) {
        this._ensureStateShape();
      }
      return data;
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('load', error.message);
    }
  }

  /**
   * Get all collections
   * @returns {Object<string, CollectionMetadata>} Map of CollectionMetadata keyed by collection name
   */
  getCollections() {
    const collections = {};
    const collectionNames = Object.keys(this._data.collections);
    for (const name of collectionNames) {
      collections[name] = this._data.collections[name];
    }
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

    const collectionMetadata =
      rawData instanceof CollectionMetadata ? rawData : new CollectionMetadata(rawData);

    return collectionMetadata;
  }

  /**
   * Update collection metadata
   * @param {string} name - Collection name
   * @param {Object} updates - Metadata updates
   * @returns {CollectionMetadata} Updated collection metadata
   */
  updateCollectionMetadata(name, updates) {
    Validate.nonEmptyString(name, 'name');
    Validate.object(updates, 'updates');

    return this._withScriptLock(() => this._updateCollectionMetadataInternalNoLock(name, updates));
  }

  /**
   * Internal collection metadata update logic executed under a ScriptLock.
   * @param {string} name - Collection name
   * @param {Object} updates - Metadata updates
   * @returns {CollectionMetadata} Updated collection metadata
   * @private
   */
  _updateCollectionMetadataInternal(name, updates) {
    const collection = this.getCollection(name);
    if (!collection) {
      throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(name);
    }

    const updateKeys = Object.keys(updates);
    for (const key of updateKeys) {
      this._applyCollectionUpdate(collection, key, updates[key]);
    }

    this._data.collections[name] = collection;
    const timestamp = this._getCurrentTimestamp();
    this._touchIndex(timestamp);
    this.save(undefined, timestamp);
    this._logger.info('Collection metadata updated.', { collection: name, updates });
    return collection;
  }

  /**
   * Update collection metadata without ScriptLock acquisition.
   * @param {string} name - Collection name
   * @param {Object} updates - Metadata updates
   * @returns {CollectionMetadata} Updated collection metadata
   * @private
   */
  _updateCollectionMetadataInternalNoLock(name, updates) {
    return this._updateCollectionMetadataInternal(name, updates);
  }

  /**
   * Apply a single metadata update to a collection.
   * @param {CollectionMetadata} collection - Target collection metadata
   * @param {string} key - Metadata field name
   * @param {*} value - Field value to apply
   * @returns {void}
   * @private
   */
  _applyCollectionUpdate(collection, key, value) {
    if (key === 'lastUpdated') {
      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
          'lastUpdated',
          value,
          'lastUpdated must be a valid date'
        );
      }
      collection.lastUpdated = date;
      return;
    }

    const methodName = this._simpleUpdateHandlers[key];
    if (methodName) {
      collection[methodName](value);
      return;
    }

    collection[key] = value;
  }

  /**
   * Build method map for simple collection metadata updates.
   * @returns {Object<string, string>} Map of update fields to method names
   * @private
   */
  _buildSimpleUpdateHandlers() {
    return {
      documentCount: 'setDocumentCount',
      modificationToken: 'setModificationToken',
      lockStatus: 'setLockStatus'
    };
  }

  /**
   * Remove a collection from the master index
   * @param {string} name - Collection name to remove
   * @returns {boolean} True if collection was found and removed, false otherwise
   */
  removeCollection(name) {
    if (!this._data || !this._data.collections) {
      this._logger.warn('Internal state corrupted', { name });
      return false;
    }
    Validate.nonEmptyString(name, 'name');

    return this._withScriptLock(() => {
      this._loadFromScriptProperties();

      if (this._data.collections && this._data.collections.hasOwnProperty(name)) {
        delete this._data.collections[name];
        const timestamp = this._getCurrentTimestamp();
        this._touchIndex(timestamp);
        this.save(undefined, timestamp);
        this._logger.info('Collection removed from master index', { name });
        return true;
      }

      this._logger.warn('Attempted to remove non-existent collection from master index', { name });
      return false;
    });
  }

  /**
   * Acquire a lock for a collection by updating its metadata.
   * @param {string} collectionName - The name of the collection to lock.
   * @param {string} operationId - A unique identifier for the operation acquiring the lock.
   * @param {number} [timeout=this._config.lockTimeout] - The duration for which the lock is valid in milliseconds.
   * @returns {boolean} True if the lock was acquired successfully, false otherwise.
   * @throws {ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND} If the collection does not exist.
   */
  acquireCollectionLock(collectionName, operationId, timeout = this._config.lockTimeout) {
    return this._lockManager.acquireCollectionLock(collectionName, operationId, timeout);
  }

  /**
   * Release a lock for a collection.
   * @param {string} collectionName - The name of the collection to unlock.
   * @param {string} operationId - The identifier of the operation that holds the lock.
   * @returns {boolean} True if the lock was released, false if the operationId does not match or no lock was held.
   */
  releaseCollectionLock(collectionName, operationId) {
    return this._lockManager.releaseCollectionLock(collectionName, operationId);
  }

  /**
   * Check if a collection is currently locked.
   * @param {string} collectionName - The name of the collection.
   * @returns {boolean} True if the collection is locked, false otherwise.
   */
  isCollectionLocked(collectionName) {
    return this._lockManager.isCollectionLocked(collectionName);
  }

  /**
   * Cleans up expired locks for all collections.
   * @returns {void}
   */
  cleanupExpiredLocks() {
    return this._lockManager.cleanupExpiredLocks();
  }

  /**
   * Generate a modification token
   * @returns {string} Unique modification token
   */
  generateModificationToken() {
    const timestamp = this._getCurrentTimestamp().getTime();
    const randomPart = Math.random()
      .toString(RANDOM_TOKEN_RADIX)
      .substr(RANDOM_TOKEN_OFFSET, RANDOM_TOKEN_LENGTH);
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
      return false;
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

      const collectionMetadata =
        collectionData instanceof CollectionMetadata
          ? collectionData
          : new CollectionMetadata(collectionData);

      switch (strategy) {
        case 'LAST_WRITE_WINS':
          Object.keys(newData).forEach((key) => {
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

          this._data.collections[collectionName] = collectionMetadata;
          const timestamp = this._getCurrentTimestamp();
          this._touchIndex(timestamp);

          return { success: true, data: collectionMetadata, strategy };

        default:
          throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR(
            `Unknown conflict resolution strategy: ${strategy}`
          );
      }
    });
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

  /**
   * Prepare configuration with default fallbacks.
   * @param {Object} config - Raw configuration input
   * @returns {Object} Normalised configuration object
   * @private
   */
  _initialiseConfig(config) {
    return {
      masterIndexKey: config.masterIndexKey || 'GASDB_MASTER_INDEX',
      lockTimeout: config.lockTimeout || DEFAULT_LOCK_TIMEOUT,
      version: config.version || 1
    };
  }

  /**
   * Ensure master index data structure is initialised after loading from storage.
   * @private
   */
  _initialiseDataState() {
    if (!this._data) {
      this._logger.warn('No MasterIndex found in ScriptProperties; initialising new MasterIndex.', {
        masterIndexKey: this._config.masterIndexKey
      });
      const timestamp = this._getCurrentTimestamp();
      this._data = {
        version: this._config.version,
        lastUpdated: timestamp,
        collections: {}
      };
      this.save(undefined, timestamp);
      return;
    }

    this._ensureStateShape();
  }

  /**
   * Load data from ScriptProperties
   * @private
   */
  _loadFromScriptProperties() {
    try {
      const dataString = PropertiesService.getScriptProperties().getProperty(
        this._config.masterIndexKey
      );
      if (dataString) {
        this._data = ObjectUtils.deserialise(dataString);
        this._ensureStateShape();
      } else {
        this._data = null;
      }
    } catch (error) {
      this._logger.error('Failed to load master index from ScriptProperties', {
        error: error.message
      });
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
   * Normalise metadata input prior to persistence.
   * @param {string} name - Target collection name
   * @param {Object|CollectionMetadata} metadata - Source metadata
   * @returns {CollectionMetadata} Normalised metadata instance
   * @private
   */
  _normaliseCollectionMetadata(name, metadata) {
    Validate.nonEmptyString(name, 'name');
    return this._metadataNormaliser.normalise(name, metadata);
  }

  /**
   * Persist collection metadata to internal state.
   * @param {string} name - Collection identifier
   * @param {CollectionMetadata} metadata - Normalised metadata instance
   * @param {Date} timestamp - Timestamp applied to state change
   * @private
   */
  _persistCollectionMetadata(name, metadata, timestamp) {
    Validate.nonEmptyString(name, 'name');
    Validate.required(metadata, 'metadata');

    const effectiveTimestamp =
      timestamp instanceof Date && !isNaN(timestamp.getTime())
        ? new Date(timestamp.getTime())
        : this._getCurrentTimestamp();

    this._data.collections[name] = metadata;
    this._touchIndex(effectiveTimestamp);
    this.save(undefined, effectiveTimestamp);
  }

  /**
   * Get the current timestamp as a Date instance.
   * @returns {Date} Current timestamp
   * @private
   */
  _getCurrentTimestamp() {
    return new Date();
  }

  /**
   * Update the master index lastUpdated timestamp.
   * @param {Date} timestamp - Timestamp to apply
   * @private
   */
  _touchIndex(timestamp) {
    if (!this._data) {
      return;
    }
    const effectiveTimestamp =
      timestamp instanceof Date && !isNaN(timestamp.getTime())
        ? new Date(timestamp.getTime())
        : this._getCurrentTimestamp();
    this._data.lastUpdated = effectiveTimestamp;
  }

  /**
   * Ensure internal data structures exist with expected shapes.
   * @private
   */
  _ensureStateShape() {
    if (!Validate.isPlainObject(this._data)) {
      this._data = {
        version: this._config.version,
        lastUpdated: this._getCurrentTimestamp(),
        collections: {}
      };
      return;
    }

    if (!Validate.isPlainObject(this._data.collections)) {
      this._data.collections = {};
    }

    if (this._data.modificationHistory) {
      delete this._data.modificationHistory;
      this.save(undefined, this._resolveExistingTimestamp(this._data.lastUpdated));
    }
  }

  /**
   * Resolve a safe timestamp for persistence updates.
   * @param {*} candidate - Candidate timestamp input
   * @returns {Date} Resolved timestamp
   * @private
   */
  _resolveExistingTimestamp(candidate) {
    const resolved = candidate instanceof Date ? candidate : new Date(candidate);
    if (!isNaN(resolved.getTime())) {
      return new Date(resolved.getTime());
    }
    return this._getCurrentTimestamp();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MasterIndex };
}
