/**
 * DocumentOperations.js - Document Operations Component
 * 
 * Handles basic CRUD operations on document collections stored as plain objects.
 * Provides ID-based document manipulation with validation and error handling.
 * 
 * Part of Section 5: Collection Components and Basic CRUD Operations
 * Note: Filtering capabilities will be added in Section 6: Query Engine
 */

/**
 * DocumentOperations - Manages document CRUD operations
 * 
 * Handles document operations:
 * - Document insertion with ID generation
 * - Document retrieval by ID
 * - Document updates by ID  
 * - Document deletion by ID
 * - Document counting and existence checks
 */
class DocumentOperations {
  /**
   * Creates a new DocumentOperations instance
   * @param {Object} collection - Collection reference for document storage
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When collection is invalid
   */
  constructor(collection) {
    // Validate collection reference
    if (!collection) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('collection', collection, 'Collection reference is required');
    }
    
    if (typeof collection !== 'object') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('collection', collection, 'Collection must be an object');
    }
    
    // Validate collection has required properties and methods
    if (!collection.hasOwnProperty('_documents') || typeof collection._documents !== 'object') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('collection', collection, 'Collection must have _documents property');
    }
    
    if (typeof collection._markDirty !== 'function') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('collection', collection, 'Collection must have _markDirty method');
    }
    
    if (typeof collection._updateMetadata !== 'function') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('collection', collection, 'Collection must have _updateMetadata method');
    }
    
    this._collection = collection;
    this._logger = GASDBLogger.createComponentLogger('DocumentOperations');
    this._queryEngine = null; // Lazy-loaded QueryEngine instance
  }
  
  /**
   * Insert a document with automatic or provided ID
   * @param {Object} doc - Document to insert
   * @returns {Object} Inserted document with _id
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When document is invalid
   * @throws {ErrorHandler.ErrorTypes.CONFLICT_ERROR} When document ID already exists
   */
  insertDocument(doc) {
    // Validate document
    this._validateDocument(doc);
    
    // Create a copy to avoid modifying the original
    const documentToInsert = ObjectUtils.deepClone(doc);
    
    // Generate ID if not provided
    if (!documentToInsert._id) {
      documentToInsert._id = this._generateDocumentId();
    } else {
      // Validate provided ID
      if (typeof documentToInsert._id !== 'string' || documentToInsert._id.trim() === '') {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('_id', documentToInsert._id, 'Document ID must be a non-empty string');
      }
      
      // Check for duplicate ID
      if (this._collection._documents[documentToInsert._id]) {
        throw new ErrorHandler.ErrorTypes.CONFLICT_ERROR('document', documentToInsert._id, 'Document with this ID already exists');
      }
    }
    
    // Insert document
    this._collection._documents[documentToInsert._id] = documentToInsert;
    
    // Update collection metadata and mark dirty
    this._collection._updateMetadata();
    this._collection._markDirty();
    
    this._logger.debug('Document inserted', { documentId: documentToInsert._id });
    
    return documentToInsert;
  }
  
  /**
   * Find document by ID
   * @param {string} id - Document ID to find
   * @returns {Object|null} Found document or null if not found
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When ID is invalid
   */
  findDocumentById(id) {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('id', id, 'Document ID must be a non-empty string');
    }
    
    const document = this._collection._documents[id];
    
    if (document) {
      // Return a copy to prevent external modification
      return ObjectUtils.deepClone(document);
    }
    
    return null;
  }
  
  /**
   * Find all documents in collection
   * @returns {Array<Object>} Array of all documents
   */
  findAllDocuments() {
    const documents = [];
    
    // Convert documents object to array
    for (const documentId in this._collection._documents) {
      if (this._collection._documents.hasOwnProperty(documentId)) {
        // Return copies to prevent external modification
        documents.push(ObjectUtils.deepClone(this._collection._documents[documentId]));
      }
    }
    
    this._logger.debug('Found all documents', { count: documents.length });
    
    return documents;
  }
  
  /**
   * Update document by ID
   * @param {string} id - Document ID to update
   * @param {Object} updateData - Data to update document with
   * @returns {Object} Update result { acknowledged: boolean, modifiedCount: number }
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When parameters are invalid
   */
  updateDocument(id, updateData) {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('id', id, 'Document ID must be a non-empty string');
    }
    
    // Validate update data
    if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('updateData', updateData, 'Update data must be an object');
    }
    
    // Check if document exists
    if (!this._collection._documents[id]) {
      return { acknowledged: true, modifiedCount: 0 };
    }
    
    // Create updated document by merging
    const existingDocument = this._collection._documents[id];
    const updatedDocument = Object.assign({}, existingDocument, updateData);
    
    // Preserve the original _id (cannot be changed)
    updatedDocument._id = existingDocument._id;
    
    // Validate the updated document
    this._validateDocument(updatedDocument);
    
    // Update document in collection
    this._collection._documents[id] = updatedDocument;
    
    // Update collection metadata and mark dirty
    this._collection._updateMetadata();
    this._collection._markDirty();
    
    this._logger.debug('Document updated', { documentId: id });
    
    return { acknowledged: true, modifiedCount: 1 };
  }
  
  /**
   * Delete document by ID
   * @param {string} id - Document ID to delete
   * @returns {Object} Delete result { acknowledged: boolean, deletedCount: number }
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When ID is invalid
   */
  deleteDocument(id) {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('id', id, 'Document ID must be a non-empty string');
    }
    
    // Check if document exists
    if (!this._collection._documents[id]) {
      return { acknowledged: true, deletedCount: 0 };
    }
    
    // Delete document
    delete this._collection._documents[id];
    
    // Update collection metadata and mark dirty
    this._collection._updateMetadata();
    this._collection._markDirty();
    
    this._logger.debug('Document deleted', { documentId: id });
    
    return { acknowledged: true, deletedCount: 1 };
  }
  
  /**
   * Count total documents in collection
   * @returns {number} Total number of documents
   */
  countDocuments() {
    const count = Object.keys(this._collection._documents).length;
    this._logger.debug('Counted documents', { count });
    return count;
  }
  
  /**
   * Check if document exists by ID
   * @param {string} id - Document ID to check
   * @returns {boolean} True if document exists, false otherwise
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When ID is invalid
   */
  documentExists(id) {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('id', id, 'Document ID must be a non-empty string');
    }
    
    return this._collection._documents.hasOwnProperty(id);
  }
  
  /**
   * Find first document matching query using QueryEngine
   * @param {Object} query - MongoDB-compatible query object
   * @returns {Object|null} First matching document or null if none found
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When query contains invalid operators
   */
  findByQuery(query) {
    // Get all documents as array for QueryEngine
    const documents = this.findAllDocuments();
    
    // Create QueryEngine instance if not already created
    if (!this._queryEngine) {
      this._queryEngine = new QueryEngine();
    }
    
    // Let QueryEngine handle all validation and execution
    const results = this._queryEngine.executeQuery(documents, query);
    
    this._logger.debug('Query executed by findByQuery', { 
      queryString: JSON.stringify(query), 
      resultCount: results.length 
    });
    
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * Find multiple documents matching query using QueryEngine
   * @param {Object} query - MongoDB-compatible query object
   * @returns {Array<Object>} Array of matching documents (empty array if none found)
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When query contains invalid operators
   */
  findMultipleByQuery(query) {
    // Get all documents as array for QueryEngine
    const documents = this.findAllDocuments();
    
    // Create QueryEngine instance if not already created
    if (!this._queryEngine) {
      this._queryEngine = new QueryEngine();
    }
    
    // Let QueryEngine handle all validation and execution
    const results = this._queryEngine.executeQuery(documents, query);
    
    this._logger.debug('Query executed by findMultipleByQuery', { 
      queryString: JSON.stringify(query), 
      resultCount: results.length 
    });
    
    return results;
  }
  
  /**
   * Count documents matching query using QueryEngine
   * @param {Object} query - MongoDB-compatible query object
   * @returns {number} Count of matching documents
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When query contains invalid operators
   */
  countByQuery(query) {
    // Get all documents as array for QueryEngine
    const documents = this.findAllDocuments();
    
    // Create QueryEngine instance if not already created
    if (!this._queryEngine) {
      this._queryEngine = new QueryEngine();
    }
    
    // Let QueryEngine handle all validation and execution
    const results = this._queryEngine.executeQuery(documents, query);
    
    this._logger.debug('Query executed by countByQuery', { 
      queryString: JSON.stringify(query), 
      resultCount: results.length 
    });
    
    return results.length;
  }

  /**
   * Generate unique document ID
   * @private
   * @returns {string} Generated unique ID
   */
  _generateDocumentId() {
    let id;
    let attempts = 0;
    const maxAttempts = 100;
    
    // Generate unique ID (with collision protection)
    do {
      id = IdGenerator.generateUUID();
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique document ID after maximum attempts');
      }
    } while (this._collection._documents[id]);
    
    return id;
  }
  
  /**
   * Validate document structure and content
   * @private
   * @param {Object} doc - Document to validate
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When document is invalid
   */
  _validateDocument(doc) {
    // Check if document is provided
    if (!doc) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('doc', doc, 'Document is required');
    }
    
    // Check if document is an object
    if (typeof doc !== 'object' || Array.isArray(doc)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('doc', doc, 'Document must be an object');
    }
    
    // Check for forbidden fields (reserved prefixes)
    for (const field in doc) {
      if (field.startsWith('__')) {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('doc', doc, `Field name "${field}" is reserved (cannot start with __)`);
      }
    }
    
    // Validate _id field if present
    if (doc._id !== undefined && (typeof doc._id !== 'string' || doc._id.trim() === '')) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('doc._id', doc._id, 'Document _id must be a non-empty string if provided');
    }
    
    // Additional validation could be added here for:
    // - Maximum document size
    // - Field name restrictions
    // - Data type constraints
  }
  
  /**
   * Apply update operators to a document by ID
   * @param {string} id - Document identifier
   * @param {Object} updateOps - MongoDB-style update operators
   * @returns {Object} Update result { acknowledged: boolean, modifiedCount: number }
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When parameters are invalid
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When update operators are invalid
   */
  updateDocumentWithOperators(id, updateOps) {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('id', id, 'Document ID must be a non-empty string');
    }
    // Validate updateOps
    if (!updateOps || typeof updateOps !== 'object' || Array.isArray(updateOps)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('updateOps', updateOps, 'Update operations must be an object');
    }
    // Check existence
    const existing = this._collection._documents[id];
    if (!existing) {
      return { acknowledged: true, modifiedCount: 0 };
    }
    // Apply operators
    if (!this._updateEngine) {
      this._updateEngine = new UpdateEngine();
    }
    const updatedDoc = this._updateEngine.applyOperators(existing, updateOps);
    // Persist
    this._collection._documents[id] = updatedDoc;
    this._collection._updateMetadata();
    this._collection._markDirty();
    this._logger.debug('Document updated with operators', { documentId: id, operators: updateOps });
    return { acknowledged: true, modifiedCount: 1 };
  }

  /**
   * Update documents matching a query using operators
   * @param {Object} query - Filter criteria
   * @param {Object} updateOps - MongoDB-style update operators
   * @returns {number} Number of documents updated
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When parameters are invalid
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When update operators are invalid
   * @throws {ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND} When no documents match
   */
  updateDocumentByQuery(query, updateOps) {
    // Validate query
    if (!query || typeof query !== 'object' || Array.isArray(query)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('query', query, 'Query must be an object');
    }
    // Validate updateOps
    if (!updateOps || typeof updateOps !== 'object' || Array.isArray(updateOps)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('updateOps', updateOps, 'Update operations must be an object');
    }
    // Find matches
    const matches = this.findMultipleByQuery(query);
    if (matches.length === 0) {
      throw new ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND(query, this._collection.name);
    }
    // Apply updates
    matches.forEach(doc => this.updateDocumentWithOperators(doc._id, updateOps));
    return matches.length;
  }

  /**
   * Replace a single document by ID
   * @param {string} id - Document identifier
   * @param {Object} doc - Replacement document
   * @returns {Object} Replace result { acknowledged: boolean, modifiedCount: number }
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When parameters are invalid
   */
  replaceDocument(id, doc) {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('id', id, 'Document ID must be a non-empty string');
    }
    // Validate doc
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('doc', doc, 'Replacement document must be an object');
    }
    // Check existence
    if (!this._collection._documents[id]) {
      return { acknowledged: true, modifiedCount: 0 };
    }
    // Prepare replacement
    const newDoc = ObjectUtils.deepClone(doc);
    newDoc._id = id;
    this._validateDocument(newDoc);
    // Persist
    this._collection._documents[id] = newDoc;
    this._collection._updateMetadata();
    this._collection._markDirty();
    this._logger.debug('Document replaced by ID', { documentId: id });
    return { acknowledged: true, modifiedCount: 1 };
  }

  /**
   * Replace documents matching a query
   * @param {Object} query - Filter criteria
   * @param {Object} doc - Replacement document
   * @returns {number} Number of documents replaced
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When parameters are invalid
   */
  replaceDocumentByQuery(query, doc) {
    // Validate query
    if (!query || typeof query !== 'object' || Array.isArray(query)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('query', query, 'Query must be an object');
    }
    // Validate doc
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('doc', doc, 'Replacement document must be an object');
    }
    // Find matches
    const matches = this.findMultipleByQuery(query);
    if (matches.length === 0) {
      return 0;
    }
    // Apply replacements
    matches.forEach(d => this.replaceDocument(d._id, doc));
    return matches.length;
  }
}
