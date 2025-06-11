/**
 * Collection.js - MongoDB-Compatible Collection Implementation
 * 
 * Provides MongoDB-compatible API for collection operations with QueryEngine support:
 * - Full CRUD operations with field-based query support
 * - Lazy loading from Google Drive
 * - Integration with CollectionMetadata, DocumentOperations, and QueryEngine
 * - File persistence through FileService
 * 
 * Enhanced in Section 6 with QueryEngine integration:
 * - findOne(filter): supports {}, {_id: "id"}, and field-based queries
 * - find(filter): supports {} and field-based queries
 * - updateOne(filter, update): supports field-based filters, document replacement only
 * - deleteOne(filter): supports field-based filters
 * - countDocuments(filter): supports {} and field-based queries
 * 
 * Note: Update operators ($set, $push, etc.) require Section 7 Update Engine
 */

/**
 * Collection - MongoDB-compatible collection with QueryEngine support
 * 
 * Coordinates CollectionMetadata, DocumentOperations, and QueryEngine to provide:
 * - MongoDB-standard method signatures
 * - Lazy loading and memory management
 * - File persistence and dirty tracking
 * - Field-based query support through QueryEngine
 */
class Collection {
  /**
   * Creates a new Collection instance
   * @param {string} name - Collection name
   * @param {string} driveFileId - Google Drive file ID for persistence
   * @param {Database} database - Database instance reference
   * @param {FileService} fileService - FileService for Drive operations
   * @throws {InvalidArgumentError} For invalid parameters
   */
  constructor(name, driveFileId, database, fileService) {
    // Validate parameters
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new InvalidArgumentError('name', name, 'Collection name must be a non-empty string');
    }
    
    if (!driveFileId || typeof driveFileId !== 'string' || driveFileId.trim() === '') {
      throw new InvalidArgumentError('driveFileId', driveFileId, 'Drive file ID must be a non-empty string');
    }
    
    if (!database || typeof database !== 'object') {
      throw new InvalidArgumentError('database', database, 'Database reference is required');
    }
    
    if (!fileService || typeof fileService !== 'object') {
      throw new InvalidArgumentError('fileService', fileService, 'FileService reference is required');
    }
    
    // Validate fileService has required methods
    if (typeof fileService.readFile !== 'function' || typeof fileService.writeFile !== 'function') {
      throw new InvalidArgumentError('fileService', fileService, 'FileService must have readFile and writeFile methods');
    }
    
    this._name = name;
    this._driveFileId = driveFileId;
    this._database = database;
    this._fileService = fileService;
    this._logger = GASDBLogger.createComponentLogger('Collection');
    
    // Internal state management
    this._loaded = false;
    this._dirty = false;
    this._documents = {};
    this._metadata = null;
    this._collectionMetadata = null;
    this._documentOperations = null;
  }

  /**
   * Ensures collection data is loaded from Drive (lazy loading)
   * @private
   * @throws {OperationError} If loading fails
   */
  _ensureLoaded() {
    if (!this._loaded) {
      this._loadData();
      this._loaded = true;
    }
  }

  /**
   * Loads collection data from Drive file
   * @private
   * @throws {OperationError} If file read fails
   */
  _loadData() {
    try {
      this._logger.debug('Loading collection data from Drive', { fileId: this._driveFileId });
      
      // FileService.readFile() already returns parsed JSON object, not a string
      const data = this._fileService.readFile(this._driveFileId);
      
      // Validate file structure
      if (!data || typeof data !== 'object') {
        throw new OperationError('Invalid file structure', 'Collection file must contain a JSON object');
      }
      
      // Initialize documents and metadata with defaults
      this._documents = data.documents || {};
      const metadataObj = data.metadata || {};
      
      // Convert date strings back to Date objects for CollectionMetadata
      if (metadataObj.created && typeof metadataObj.created === 'string') {
        metadataObj.created = new Date(metadataObj.created);
      }
      if (metadataObj.lastUpdated && typeof metadataObj.lastUpdated === 'string') {
        metadataObj.lastUpdated = new Date(metadataObj.lastUpdated);
      }
      
      // Create CollectionMetadata instance
      this._collectionMetadata = new CollectionMetadata(metadataObj);
      
      // Create DocumentOperations instance with this collection as reference
      this._documentOperations = new DocumentOperations(this);
      
      this._logger.debug('Collection data loaded successfully', { 
        documentCount: Object.keys(this._documents).length,
        metadata: this._collectionMetadata.toObject()
      });
      
    } catch (error) {
      this._logger.error('Failed to load collection data', { 
        fileId: this._driveFileId, 
        error: error.message 
      });
      
      if (error instanceof OperationError) {
        throw error;
      }
      
      throw new OperationError('Collection data loading failed', error.message);
    }
  }

  /**
   * Saves collection data to Drive file
   * @private
   * @throws {OperationError} If file write fails
   */
  _saveData() {
    try {
      this._logger.debug('Saving collection data to Drive', { fileId: this._driveFileId });
      
      const data = {
        documents: this._documents,
        metadata: this._collectionMetadata.toObject()
      };
      
      const jsonContent = JSON.stringify(data, null, 2);
      this._fileService.writeFile(this._driveFileId, jsonContent);
      
      this._dirty = false;
      this._logger.debug('Collection data saved successfully');
      
    } catch (error) {
      this._logger.error('Failed to save collection data', { 
        fileId: this._driveFileId, 
        error: error.message 
      });
      
      throw new OperationError('Collection data saving failed', error.message);
    }
  }

  /**
   * Marks collection as dirty for persistence
   * @private
   */
  _markDirty() {
    this._dirty = true;
    this._logger.debug('Collection marked as dirty');
  }

  /**
   * Updates collection metadata
   * @private
   * @param {Object} changes - Metadata changes to apply
   */
  _updateMetadata(changes = {}) {
    this._ensureLoaded();
    
    if (changes.documentCount !== undefined) {
      this._collectionMetadata.setDocumentCount(changes.documentCount);
    }
    
    this._collectionMetadata.updateLastModified();
    this._logger.debug('Collection metadata updated', { changes });
  }

  /**
   * Validates filter object structure
   * @private
   * @param {Object} filter - Filter to validate
   * @param {string} operation - Operation name for error messages
   * @throws {InvalidArgumentError} For invalid filter structure
   */
  _validateFilter(filter, operation) {
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
      throw new InvalidArgumentError('filter', filter, 'Filter must be an object');
    }
    
    const filterKeys = Object.keys(filter);
    
    // Validate _id filter value if present
    if (filterKeys.includes('_id')) {
      const idValue = filter._id;
      if (!idValue || typeof idValue !== 'string' || idValue.trim() === '') {
        throw new InvalidArgumentError('filter._id', idValue, 'ID filter value must be a non-empty string');
      }
    }
  }

  /**
   * Insert a single document (MongoDB-compatible)
   * @param {Object} doc - Document to insert
   * @returns {Object} {insertedId: string, acknowledged: boolean}
   * @throws {InvalidArgumentError} For invalid documents
   * @throws {ConflictError} For duplicate IDs
   */
  insertOne(doc) {
    this._ensureLoaded();
    
    const insertedDoc = this._documentOperations.insertDocument(doc);
    
    // Update metadata and mark dirty
    this._updateMetadata({ documentCount: Object.keys(this._documents).length });
    this._markDirty();
    
    return {
      insertedId: insertedDoc._id,
      acknowledged: true
    };
  }

  /**
   * Find a single document by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries, _id queries, and empty filter)
   * @returns {Object|null} Document object or null
   * @throws {InvalidArgumentError} For invalid filters
   */
  findOne(filter = {}) {
    this._ensureLoaded();
    this._validateFilter(filter, 'findOne');
    
    const filterKeys = Object.keys(filter);
    
    // Empty filter {} - return first document
    if (filterKeys.length === 0) {
      const allDocs = this._documentOperations.findAllDocuments();
      return allDocs.length > 0 ? allDocs[0] : null;
    }
    
    // ID filter {_id: "id"} - use direct lookup for performance
    if (filterKeys.length === 1 && filterKeys[0] === '_id') {
      return this._documentOperations.findDocumentById(filter._id);
    }
    
    // Field-based or complex queries - use QueryEngine
    return this._documentOperations.findByQuery(filter);
  }

  /**
   * Find multiple documents by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries and empty filter)
   * @returns {Array} Array of document objects
   * @throws {InvalidArgumentError} For invalid filters
   */
  find(filter = {}) {
    this._ensureLoaded();
    this._validateFilter(filter, 'find');
    
    const filterKeys = Object.keys(filter);
    
    // Empty filter {} - return all documents
    if (filterKeys.length === 0) {
      return this._documentOperations.findAllDocuments();
    }
    
    // Field-based or complex queries - use QueryEngine
    return this._documentOperations.findMultipleByQuery(filter);
  }

  /**
   * Update a single document by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries and _id queries)
   * @param {Object} update - Document replacement (no operators in current version)
   * @returns {Object} {matchedCount: number, modifiedCount: number, acknowledged: boolean}
   * @throws {InvalidArgumentError} For invalid parameters
   * @throws {OperationError} For unsupported update operators
   */
  updateOne(filter, update) {
    this._ensureLoaded();
    this._validateFilter(filter, 'updateOne');
    
    // Validate update parameter
    if (!update || typeof update !== 'object' || Array.isArray(update)) {
      throw new InvalidArgumentError('update', update, 'Update must be an object');
    }
    
    // Check for update operators (not supported in current version)
    const updateKeys = Object.keys(update);
    for (const key of updateKeys) {
      if (key.startsWith('$')) {
        throw new OperationError('Update operators not yet implemented - requires Section 7 Update Engine');
      }
    }
    
    const filterKeys = Object.keys(filter);
    
    // ID filter {_id: "id"} - use direct update for performance
    if (filterKeys.length === 1 && filterKeys[0] === '_id') {
      const result = this._documentOperations.updateDocument(filter._id, update);
      
      if (result.modifiedCount > 0) {
        this._updateMetadata();
        this._markDirty();
      }
      
      return {
        matchedCount: result.modifiedCount > 0 ? 1 : 0,
        modifiedCount: result.modifiedCount,
        acknowledged: true
      };
    }
    
    // Field-based or complex queries - find first matching document then update
    const matchingDoc = this._documentOperations.findByQuery(filter);
    
    if (!matchingDoc) {
      return {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true
      };
    }
    
    // Update the found document by ID
    const result = this._documentOperations.updateDocument(matchingDoc._id, update);
    
    if (result.modifiedCount > 0) {
      this._updateMetadata();
      this._markDirty();
    }
    
    return {
      matchedCount: 1,
      modifiedCount: result.modifiedCount,
      acknowledged: true
    };
  }

  /**
   * Delete a single document by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries and _id queries)
   * @returns {Object} {deletedCount: number, acknowledged: boolean}
   * @throws {InvalidArgumentError} For invalid filters
   */
  deleteOne(filter) {
    this._ensureLoaded();
    this._validateFilter(filter, 'deleteOne');
    
    const filterKeys = Object.keys(filter);
    
    // ID filter {_id: "id"} - use direct delete for performance
    if (filterKeys.length === 1 && filterKeys[0] === '_id') {
      const result = this._documentOperations.deleteDocument(filter._id);
      
      if (result.deletedCount > 0) {
        this._updateMetadata({ documentCount: Object.keys(this._documents).length });
        this._markDirty();
      }
      
      return {
        deletedCount: result.deletedCount,
        acknowledged: true
      };
    }
    
    // Field-based or complex queries - find first matching document then delete
    const matchingDoc = this._documentOperations.findByQuery(filter);
    
    if (!matchingDoc) {
      return {
        deletedCount: 0,
        acknowledged: true
      };
    }
    
    // Delete the found document by ID
    const result = this._documentOperations.deleteDocument(matchingDoc._id);
    
    if (result.deletedCount > 0) {
      this._updateMetadata({ documentCount: Object.keys(this._documents).length });
      this._markDirty();
    }
    
    return {
      deletedCount: result.deletedCount,
      acknowledged: true
    };
  }

  /**
   * Count documents by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries and empty filter)
   * @returns {number} Document count
   * @throws {InvalidArgumentError} For invalid filters
   */
  countDocuments(filter = {}) {
    this._ensureLoaded();
    this._validateFilter(filter, 'countDocuments');
    
    const filterKeys = Object.keys(filter);
    
    // Empty filter {} - count all documents
    if (filterKeys.length === 0) {
      return this._documentOperations.countDocuments();
    }
    
    // Field-based or complex queries - use QueryEngine
    return this._documentOperations.countByQuery(filter);
  }

  /**
   * Get collection name
   * @returns {string} Collection name
   */
  getName() {
    return this._name;
  }

  /**
   * Get collection metadata
   * @returns {Object} Metadata object
   */
  getMetadata() {
    this._ensureLoaded();
    return this._collectionMetadata.toObject();
  }

  /**
   * Check if collection has unsaved changes
   * @returns {boolean} True if dirty
   */
  isDirty() {
    return this._dirty;
  }

  /**
   * Force save collection to Drive
   * @throws {OperationError} If save fails
   */
  save() {
    if (this._loaded && this._dirty) {
      this._saveData();
    }
  }
}
