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
    // Initialize configuration
    if (config instanceof DatabaseConfig) {
      this.config = config;
    } else {
      this.config = new DatabaseConfig(config);
    }
    
    // Initialize properties
    this.indexFileId = null;
    this.collections = new Map();
    
    // Initialize logging
    this._logger = GASDBLogger.createComponentLogger('Database');
    
    // Initialize services
    this._fileOps = new FileOperations(this._logger);
    this._fileService = new FileService(this._fileOps, this._logger);
    this._masterIndex = new MasterIndex({ 
      masterIndexKey: this.config.masterIndexKey 
    });
    
    this._logger.debug('Database instance created', {
      rootFolderId: this.config.rootFolderId,
      autoCreateCollections: this.config.autoCreateCollections
    });
  }
  
  /**
   * Initialize the database and create/load index file
   * 
   * @throws {Error} When initialization fails
   */
  initialise() {
    this._logger.info('Initializing database');
    
    try {
      // Try to find existing index file
      const existingIndexFileId = this._findExistingIndexFile();
      
      if (existingIndexFileId) {
        this.indexFileId = existingIndexFileId;
        this._logger.debug('Found existing index file', { indexFileId: this.indexFileId });
        
        // Load existing collections from index
        this._loadIndexFile();
      } else {
        // Create new index file
        this._createIndexFile();
      }
      
      this._logger.info('Database initialization complete', {
        indexFileId: this.indexFileId,
        collectionCount: this.collections.size
      });
      
    } catch (error) {
      this._logger.error('Database initialization failed', { error: error.message });
      throw new Error('Database initialization failed: ' + error.message);
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
    this._validateCollectionName(name);
    
    // Check if collection already exists in memory
    if (this.collections.has(name)) {
      return this.collections.get(name);
    }
    
    // Check if collection exists in index
    const indexData = this.loadIndex();
    if (indexData.collections && indexData.collections[name]) {
      const collectionData = indexData.collections[name];
      const collection = this._createCollectionObject(name, collectionData.fileId);
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
    this._validateCollectionName(name);
    
    this._logger.debug('Creating new collection', { name });
    
    try {
      // Check if collection already exists
      if (this.collections.has(name)) {
        throw new Error(`Collection '${name}' already exists`);
      }
      
      // Create initial collection data
      const initialData = {
        documents: {},
        metadata: {
          name: name,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
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
      
      // Update index file
      this._addCollectionToIndex(name, driveFileId);
      
      // Update master index
      this._addCollectionToMasterIndex(name, driveFileId);
      
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
      const indexData = this.loadIndex();
      const collectionNames = Object.keys(indexData.collections || {});
      
      this._logger.debug('Listed collections', {
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
    this._validateCollectionName(name);
    
    this._logger.debug('Dropping collection', { name });
    
    try {
      // Get collection info from index
      const indexData = this.loadIndex();
      if (!indexData.collections || !indexData.collections[name]) {
        this._logger.warn('Collection not found for drop operation', { name });
        return false;
      }
      
      const collectionData = indexData.collections[name];
      
      // Delete collection file
      if (collectionData.fileId) {
        this._fileService.deleteFile(collectionData.fileId);
      }
      
      // Remove from memory
      this.collections.delete(name);
      
      // Remove from index file
      this._removeCollectionFromIndex(name);
      
      // Remove from master index
      this._removeCollectionFromMasterIndex(name);
      
      this._logger.info('Collection dropped successfully', { name });
      
      return true;
      
    } catch (error) {
      this._logger.error('Failed to drop collection', {
        name,
        error: error.message
      });
      throw new Error(`Failed to drop collection '${name}': ` + error.message);
    }
  }
  
  /**
   * Load index file data
   * 
   * @returns {Object} Index file data
   * @throws {Error} When index file cannot be loaded or is corrupted
   */
  loadIndex() {
    if (!this.indexFileId) {
      throw new Error('Database not initialized - no index file');
    }
    
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
        indexData.lastUpdated = new Date().toISOString();
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
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
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
   * Load index file and populate collections
   * 
   * @private
   */
  _loadIndexFile() {
    try {
      const indexData = this.loadIndex();
      
      // Load collection references (not full data)
      for (const [name, collectionData] of Object.entries(indexData.collections || {})) {
        if (collectionData.fileId) {
          const collection = this._createCollectionObject(name, collectionData.fileId);
          this.collections.set(name, collection);
        }
      }
      
      this._logger.debug('Loaded collections from index', {
        collectionCount: this.collections.size
      });
      
    } catch (error) {
      this._logger.warn('Failed to load collections from index', { error: error.message });
    }
  }
  
  /**
   * Create a collection object (placeholder implementation)
   * 
   * @param {string} name - Collection name
   * @param {string} driveFileId - Drive file ID
   * @returns {Object} Collection object
   * @private
   */
  _createCollectionObject(name, driveFileId) {
    // Minimal collection object to satisfy tests
    // Full Collection class will be implemented later
    return {
      name: name,
      driveFileId: driveFileId,
      db: this,
      created: new Date().toISOString()
    };
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
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        documentCount: 0
      };
      
      indexData.lastUpdated = new Date().toISOString();
      
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
      indexData.lastUpdated = new Date().toISOString();
      
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
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
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
    if (!name || typeof name !== 'string') {
      throw new Error('Collection name must be a non-empty string');
    }
    
    if (name.trim() === '') {
      throw new Error('Collection name cannot be empty or only whitespace');
    }
    
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
