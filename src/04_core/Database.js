/**
 * Database Class
 * 
 * Main database class that provides collection management and coordination
 * with the master index. Manages database initialization, collection
 * creation/access, and index file synchronization.
 * 
 * @class Database
 */

class Database {
  
  /**
   * Creates a new Database instance
   * 
   * @param {Object|DatabaseConfig} config - Database configuration
   * @throws {Error} When configuration is invalid
   */
  constructor(config = {}) {
    // initialise configuration
    if (config instanceof DatabaseConfig) {
      this.config = config;
    } else {
      this.config = new DatabaseConfig(config);
    }
    
    // initialise properties
    this.indexFileId = null;
    this.collections = new Map();
    
    // initialise logging
    this._logger = JDbLogger.createComponentLogger('Database');
    
    // initialise services
    this._fileOps = new FileOperations(this._logger);
    this._fileService = new FileService(this._fileOps, this._logger);
    this._masterIndex = null;
    
    this._logger.debug('Database instance created', {
      rootFolderId: this.config.rootFolderId,
      autoCreateCollections: this.config.autoCreateCollections
    });
  }
  
  /**
   * Create a new database by initialising the MasterIndex
   * 
   * This method is responsible for first-time database creation. It will create
   * a fresh MasterIndex in ScriptProperties. If a MasterIndex already exists,
   * it will throw an error and instruct the user to use recovery if needed.
   * 
   * @throws {Error} When MasterIndex already exists or creation fails
   */
  createDatabase() {
    this._logger.info('Creating new database');
    
    try {
      // Check if a MasterIndex already exists in ScriptProperties (raw check)
      const existingData = PropertiesService.getScriptProperties().getProperty(this.config.masterIndexKey);
      if (existingData) {
        throw new Error('Database already exists. Use recoverDatabase() if you need to restore from backup.');
      }

      // Instantiate and initialise fresh MasterIndex - constructor will save empty index
      this._masterIndex = new MasterIndex({ masterIndexKey: this.config.masterIndexKey });

      this._logger.info('Database created successfully', {
        masterIndexKey: this.config.masterIndexKey
      });

    } catch (error) {
      this._logger.error('Failed to create database', { error: error.message });
      throw new Error('Database creation failed: ' + error.message);
    }
  }
  
  /**
   * Initialise the database by loading from MasterIndex
   * 
   * This method loads collections from the MasterIndex (single source of truth).
   * If the MasterIndex is missing or corrupted, it will throw an error requiring
   * explicit recovery using recoverDatabase().
   * 
   * @throws {Error} When MasterIndex is missing, corrupted, or initialisation fails
   */
  initialise() {
    this._logger.info('Initialising database');
    
    try {
      // Ensure MasterIndex exists before loading
      const rawData = PropertiesService.getScriptProperties().getProperty(this.config.masterIndexKey);
      if (!rawData) {
        throw new Error('MasterIndex not found. Use createDatabase() for first-time setup or recoverDatabase() for recovery.');
      }
      // Instantiate MasterIndex for loading
      this._masterIndex = new MasterIndex({ masterIndexKey: this.config.masterIndexKey });

      // Verify MasterIndex loaded correctly
      if (!this._masterIndex.isInitialised()) {
        throw new Error('MasterIndex not initialised correctly.');
      }

      // Load collections from MasterIndex (single source of truth)
      const masterIndexCollections = this._masterIndex.getCollections();
      if (masterIndexCollections && Object.keys(masterIndexCollections).length > 0) {
        this._logger.info('Loading existing collections from MasterIndex', {
          count: Object.keys(masterIndexCollections).length
        });
        
        // Loop through the collections and load the metadata into memory
        for (const [name, collectionData] of Object.entries(masterIndexCollections)) {
          if (collectionData.fileId) {
            const collection = this._createCollectionObject(name, collectionData.fileId);
            this.collections.set(name, collection);
          }
        }
      }
      
      // Optional: create/backup Drive index file on initialise
      if (this.config.backupOnInitialise) {
        this.ensureIndexFile();
        if (Object.keys(masterIndexCollections).length > 0) {
          this.backupIndexToDrive();
        }
      }
      
      this._logger.info('Database initialisation complete', {
        indexFileId: this.indexFileId,
        collectionCount: this.collections.size
      });
      
    } catch (error) {
      this._logger.error('Database initialisation failed', { error: error.message });
      throw new Error('Database initialisation failed: ' + error.message);
    }
  }
  
  /**
   * Recover database from a backup index file
   * 
   * This method allows recovery from a Drive-based backup index file by restoring
   * the collections to the MasterIndex. This is a deliberate recovery action and
   * should only be used when the MasterIndex is missing or corrupted.
   * 
   * @param {string} backupFileId - Drive file ID of the backup index file
   * @throws {Error} When recovery fails or backup file is invalid
   */
  recoverDatabase(backupFileId) {
    Validate.nonEmptyString(backupFileId, 'backupFileId');
    
    this._logger.info('Recovering database from backup', { backupFileId });
    
    try {
      // Load backup index file
      const backupData = this._fileService.readFile(backupFileId);
      
      // Validate backup file structure
      if (!backupData || typeof backupData !== 'object' || !backupData.collections) {
        throw new Error('Invalid backup file structure');
      }
      
      // Create fresh MasterIndex for recovery
      this._masterIndex = new MasterIndex({ 
        masterIndexKey: this.config.masterIndexKey 
      });
      
      // Restore collections from backup to MasterIndex
      const recoveredCollections = [];
      for (const [name, collectionData] of Object.entries(backupData.collections)) {
        if (collectionData.fileId) {
          this._masterIndex.addCollection(name, {
            name: name,
            fileId: collectionData.fileId,
            created: collectionData.created || new Date(),
            lastUpdated: collectionData.lastUpdated || new Date(),
            documentCount: collectionData.documentCount || 0
          });
          recoveredCollections.push(name);
        }
      }
      
      this._logger.info('Database recovery successful', {
        recoveredCollections: recoveredCollections.length,
        collections: recoveredCollections
      });
      
      return recoveredCollections;
      
    } catch (error) {
      this._logger.error('Database recovery failed', { error: error.message });
      throw new Error('Database recovery failed: ' + error.message);
    }
  }
  
  /**
   * Get or create a collection
   * 
   * @param {string} name - Collection name
   * @returns {Object} Collection object
   * @throws {Error} When collection name is invalid or creation fails
   */
  collection(name) {
    Validate.nonEmptyString(name, 'name');
    this._validateCollectionName(name);
    
    // Check if collection already exists in memory
    if (this.collections.has(name)) {
      return this.collections.get(name);
    }
    
    // Check if collection exists in MasterIndex (single source of truth)
    const miCollection = this._masterIndex.getCollection(name);
    if (miCollection && miCollection.fileId) {
      const collection = this._createCollectionObject(name, miCollection.fileId);
      this.collections.set(name, collection);
      return collection;
    }
    
    // Auto-create if enabled
    if (this.config.autoCreateCollections) {
      return this.createCollection(name);
    }
    
    throw new Error(`Collection '${name}' does not exist and auto-create is disabled`);
  }
  
  /**
   * Create a new collection
   * 
   * @param {string} name - Collection name
   * @returns {Object} Created collection object
   * @throws {Error} When collection name is invalid or creation fails
   */
  createCollection(name) {
    Validate.nonEmptyString(name, 'name');
    this._validateCollectionName(name);
    
    this._logger.debug('Creating new collection', { name });
    
    try {
      // Check if collection already exists in MasterIndex
      if (this._masterIndex.getCollection(name)) {
        throw new Error(`Collection '${name}' already exists in MasterIndex`);
      }
      
      // Check if collection already exists in memory
      if (this.collections.has(name)) {
        throw new Error(`Collection '${name}' already exists in memory`);
      }
      
      // Create initial collection data
      const initialData = {
        documents: {},
        metadata: {
          name: name,
          created: new Date(),
          lastUpdated: new Date(),
          documentCount: 0,
          version: 1
        }
      };
      
      // Create collection file
      const fileName = `${name}_collection.json`;
      const driveFileId = this._fileService.createFile(fileName, initialData, this.config.rootFolderId);
      
      // Create collection object
      const collection = this._createCollectionObject(name, driveFileId);
      
      // Add to memory
      this.collections.set(name, collection);
      
      // Update master index (PRIMARY source of truth)
      this._addCollectionToMasterIndex(name, driveFileId);
      
      // Update index file (now secondary/backup source)
      this._addCollectionToIndex(name, driveFileId);
      
      this._logger.info('Collection created successfully', {
        name,
        driveFileId
      });
      
      return collection;
      
    } catch (error) {
      this._logger.error('Failed to create collection', {
        name,
        error: error.message
      });
      throw new Error(`Failed to create collection '${name}': ` + error.message);
    }
  }
  
  /**
   * List all collection names
   * 
   * @returns {Array<string>} Array of collection names
   */
  listCollections() {
    try {
      // Get collection names from MasterIndex (single source of truth)
      const masterIndexCollections = this._masterIndex.getCollections();
      const collectionNames = Object.keys(masterIndexCollections);
      
      this._logger.debug('Listed collections from MasterIndex', {
        count: collectionNames.length,
        names: collectionNames
      });
      
      return collectionNames;
      
    } catch (error) {
      this._logger.warn('Failed to list collections', { error: error.message });
      return [];
    }
  }
  
  /**
   * Drop (delete) a collection
   * 
   * @param {string} name - Collection name to drop
   * @returns {boolean} True if collection was dropped successfully
   * @throws {Error} When collection name is invalid
   */
  dropCollection(name) {
    Validate.nonEmptyString(name, 'name');
    this._validateCollectionName(name);
    
    this._logger.debug('Dropping collection', { name });
    
    try {
      // Check MasterIndex for the collection (single source of truth)
      const miCollection = this._masterIndex.getCollection(name);
      
      if (miCollection && miCollection.fileId) {
        // Delete collection file
        this._fileService.deleteFile(miCollection.fileId);
        
        // Remove from memory
        this.collections.delete(name);
        
        // Remove from master index (primary source of truth)
        this._removeCollectionFromMasterIndex(name);
        
        // Remove from index file (secondary/backup source)
        this._removeCollectionFromIndex(name);
        
        this._logger.info('Collection dropped successfully', { name });
        
        return true;
      }
      
      this._logger.warn('Collection not found for drop operation', { name });
      return false;
      
    } catch (error) {
      this._logger.error('Failed to drop collection', {
        name,
        error: error.message
      });
      throw new Error(`Failed to drop collection '${name}': ` + error.message);
    }
  }

  /**
   * Get or auto-create a collection by name
   * @param {string} name - Collection name
   * @returns {Object} Collection object
   * @throws {Error} When collection missing and auto-create disabled
   */
  getCollection(name) {
    Validate.nonEmptyString(name, 'name');
    this._validateCollectionName(name);
    // Return if already in memory
    if (this.collections.has(name)) {
      return this.collections.get(name);
    }
    // Load from MasterIndex if exists
    const mi = this._masterIndex.getCollection(name);
    if (mi && mi.fileId) {
      const coll = this._createCollectionObject(name, mi.fileId);
      this.collections.set(name, coll);
      return coll;
    }
    // Auto-create if configured
    if (this.config.autoCreateCollections) {
      return this.createCollection(name);
    }
    throw new Error(`Collection '${name}' does not exist and auto-create is disabled`);
  }

  /**
   * Alias for dropCollection to match API
   * @param {string} name - Collection name to delete
   * @returns {boolean}
   */
  deleteCollection(name) {
    return this.dropCollection(name);
  }
  
  /**
   * Load index file data
   * 
   * @returns {Object} Index file data
   * @throws {Error} When index file cannot be loaded or is corrupted
   */
  loadIndex() {
  // Lazily ensure index file exists before reading
  this.ensureIndexFile();
    
    try {
      const indexData = this._fileService.readFile(this.indexFileId);
      
      // Validate that we have a valid object
      if (typeof indexData !== 'object' || indexData === null) {
        throw new Error('Index file contains invalid data structure');
      }
      
      // Validate required structure and repair if possible
      if (!indexData.collections) {
        this._logger.warn('Index file missing collections property, repairing');
        indexData.collections = {};
      }
      if (!indexData.lastUpdated) {
        this._logger.warn('Index file missing lastUpdated property, repairing');
        indexData.lastUpdated = new Date();
      }
      
      // Validate collections structure
      if (typeof indexData.collections !== 'object') {
        throw new Error('Index file collections property is corrupted');
      }
      
      return indexData;
      
    } catch (error) {
      // Check if this is a JSON parsing error (various ways it might be indicated)
      const errorMessage = error.message || '';
      const isJsonError = errorMessage.includes('JSON') || 
                         errorMessage.includes('Invalid file format') ||
                         errorMessage.includes('parse') ||
                         errorMessage.includes('Unexpected token') ||
                         errorMessage.includes('SyntaxError');
                         
      if (isJsonError) {
        this._logger.error('Index file contains corrupted JSON', {
          indexFileId: this.indexFileId,
          error: error.message
        });
        throw new Error('Index file is corrupted: invalid JSON format');
      }
      
      // Check if this is our validation error
      if (errorMessage.includes('corrupted') || errorMessage.includes('invalid data structure')) {
        this._logger.error('Index file structure is corrupted', {
          indexFileId: this.indexFileId,
          error: error.message
        });
        throw error; // Re-throw our specific corruption errors
      }
      
      // Other errors (file not found, permissions, etc.)
      this._logger.error('Failed to load index file', {
        indexFileId: this.indexFileId,
        error: error.message
      });
      throw new Error('Failed to load index file: ' + error.message);
    }
  }
  
  /**
   * Find existing index file in the root folder
   * 
   * @returns {string|null} Index file ID if found, null otherwise
   * @private
   */
  _findExistingIndexFile() {
    try {
      // Look for files named like database index files
      const folder = DriveApp.getFolderById(this.config.rootFolderId);
      const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
      
      while (files.hasNext()) {
        const file = files.next();
        const fileName = file.getName();
        
        if (fileName.includes('database_index') && fileName.endsWith('.json')) {
          return file.getId();
        }
      }
      
      return null;
      
    } catch (error) {
      this._logger.warn('Failed to find existing index file', { error: error.message });
      return null;
    }
  }
  
  /**
   * Create new index file
   * 
   * @private
   */
  _createIndexFile() {
    const indexFileName = `database_index_${Date.now()}.json`;
    const initialIndexData = {
      collections: {},
      created: new Date(),
      lastUpdated: new Date(),
      version: 1
    };
    
    this.indexFileId = this._fileService.createFile(
      indexFileName, 
      initialIndexData, 
      this.config.rootFolderId
    );
    
    this._logger.debug('Created new index file', {
      fileName: indexFileName,
      indexFileId: this.indexFileId
    });
  }

  /**
   * Ensure index file exists by finding or creating it lazily
   * @private
   */
  ensureIndexFile() {
    if (this.indexFileId) return;
    const existingIndexFileId = this._findExistingIndexFile();
    if (existingIndexFileId) {
      this.indexFileId = existingIndexFileId;
      this._logger.debug('Found existing index file for backup', { indexFileId: this.indexFileId });
    } else {
      this._createIndexFile();
    }
  }
  
  /**
   * Create a collection object (full Collection instance)
   * 
   * Note: Collections are lazy-loaded so this method doesn't load the full collection into memory
   * until a CRUD operation on it is called.
   *
   * @param {string} name - Collection name
   * @param {string} driveFileId - Drive file ID
   * @returns {Collection} Collection instance
   * @private
   */
  _createCollectionObject(name, driveFileId) {
    return new Collection(name, driveFileId, this, this._fileService);
  }
  
  /**
   * Backup MasterIndex to Drive-based index file
   *
   * This explicitly backs up the MasterIndex data to the Drive-based index file.
   * This is useful for ensuring data durability and for migration purposes.
   *
   * @returns {boolean} True if backup succeeded
   */
  backupIndexToDrive() {
    if (!this.indexFileId) {
      this._logger.warn('Cannot backup index - no index file exists');
      return false;
    }
    try {
      this._logger.info('Backing up MasterIndex to Drive index file');
      // Get all collections from MasterIndex
      const miCollections = this._masterIndex.getCollections();
      // Create a new index data structure based on MasterIndex
      const backupData = {
        collections: {},
        lastUpdated: new Date(),
        version: 1
      };
      // Copy collection data from MasterIndex
      for (const [name, miCollection] of Object.entries(miCollections)) {
        backupData.collections[name] = {
          name: miCollection.name || name,
          fileId: miCollection.fileId,
          created: miCollection.created || new Date(),
          lastUpdated: miCollection.lastUpdated || new Date(),
          documentCount: miCollection.documentCount || 0
        };
      }
      // Write to index file
      this._fileService.writeFile(this.indexFileId, backupData);
      this._logger.info('MasterIndex backup successful', {
        collectionCount: Object.keys(miCollections).length,
        indexFileId: this.indexFileId
      });
      return true;
    } catch (error) {
      this._logger.error('MasterIndex backup failed', { error: error.message });
      return false;
    }
  }
  /**
   * Add collection to index file
   * 
   * @param {string} name - Collection name
   * @param {string} driveFileId - Drive file ID
   * @private
   */
  _addCollectionToIndex(name, driveFileId) {
    try {
  const indexData = this.loadIndex();
      
      indexData.collections[name] = {
        name: name,
        fileId: driveFileId,
        created: new Date(),
        lastUpdated: new Date(),
        documentCount: 0
      };
      
      indexData.lastUpdated = new Date();
      
      this._fileService.writeFile(this.indexFileId, indexData);
      
      this._logger.debug('Added collection to index', { name, driveFileId });
      
    } catch (error) {
      this._logger.error('Failed to add collection to index', {
        name,
        driveFileId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Remove collection from index file
   * 
   * @param {string} name - Collection name
   * @private
   */
  _removeCollectionFromIndex(name) {
    try {
  const indexData = this.loadIndex();
      
      delete indexData.collections[name];
      indexData.lastUpdated = new Date();
      
      this._fileService.writeFile(this.indexFileId, indexData);
      
      this._logger.debug('Removed collection from index', { name });
      
    } catch (error) {
      this._logger.error('Failed to remove collection from index', {
        name,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Add collection to master index
   * 
   * @param {string} name - Collection name
   * @param {string} driveFileId - Drive file ID
   * @private
   */
  _addCollectionToMasterIndex(name, driveFileId) {
    try {
      this._masterIndex.addCollection(name, {
        name: name,
        fileId: driveFileId,
        created: new Date(),
        lastUpdated: new Date(),
        documentCount: 0
      });
      
      this._logger.debug('Added collection to master index', { name, driveFileId });
      
    } catch (error) {
      this._logger.warn('Failed to add collection to master index', {
        name,
        driveFileId,
        error: error.message
      });
      // Don't throw - master index failures shouldn't break database operations
    }
  }
  
  /**
   * Remove collection from master index
   * 
   * @param {string} name - Collection name
   * @private
   */
  _removeCollectionFromMasterIndex(name) {
    try {
      this._masterIndex.removeCollection(name);
      this._logger.debug('Removed collection from master index', { name });
      
    } catch (error) {
      this._logger.warn('Failed to remove collection from master index', {
        name,
        error: error.message
      });
      // Don't throw - master index failures shouldn't break database operations
    }
  }
  
  /**
   * Validate collection name
   * 
   * @param {string} name - Collection name to validate
   * @throws {Error} When collection name is invalid
   * @private
   */
  _validateCollectionName(name) {
    Validate.nonEmptyString(name, 'name');
    // Check for invalid characters
    const invalidChars = /[\/\\:*?"<>|]/;
    if (invalidChars.test(name)) {
      throw new Error('Collection name contains invalid characters');
    }
    // Check for reserved names
    const reservedNames = ['index', 'master', 'system', 'admin'];
    if (reservedNames.includes(name.toLowerCase())) {
      throw new Error(`Collection name '${name}' is reserved`);
    }
  }


}
