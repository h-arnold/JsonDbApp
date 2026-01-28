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
/* exported DocumentOperations */
class DocumentOperations {
  /**
   * Creates a new DocumentOperations instance
   * @param {Object} collection - Collection reference for document storage
   */
  constructor(collection) {
    this._collection = collection;
    this._logger = JDbLogger.createComponentLogger('DocumentOperations');
    this._queryEngine = null; // Lazy-loaded QueryEngine instance
    this._updateEngine = null; // Lazy-loaded UpdateEngine instance
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
      this._validateDocumentId(documentToInsert._id);
      this._checkDuplicateId(documentToInsert._id);
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
    Validate.nonEmptyString(id, 'id');
    
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
    // Validate parameters
    Validate.nonEmptyString(id, 'id');
    Validate.object(updateData, 'updateData');
    
    // Check if document exists
    if (!this.documentExists(id)) {
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
    Validate.nonEmptyString(id, 'id');
    
    // Check if document exists
    if (!this.documentExists(id)) {
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
    Validate.nonEmptyString(id, 'id');
    
    return this._collection._documents.hasOwnProperty(id);
  }

  /**
   * Find first document matching query using QueryEngine
   * @param {Object} query - MongoDB-compatible query object
   * @returns {Object|null} First matching document or null if none found
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When query contains invalid operators
   */
  findByQuery(query) {
    this._validateQuery(query);
    
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
    this._validateQuery(query);
    
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
    this._validateQuery(query);
    
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
    // Use ValidationUtils for standard validations
    Validate.required(doc, 'doc');
    Validate.object(doc, 'doc');
    
    // DocumentOperations-specific validations
    this._validateDocumentFields(doc);
    this._validateDocumentIdInDocument(doc._id, doc);
    
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
    // Validate parameters
    Validate.nonEmptyString(id, 'id');
    Validate.validateUpdateObject(updateOps, 'updateOps', { requireOperators: true });
    
    // Validate operators before checking existence so invalid ops throw
    this._validateUpdateOperators(updateOps);
    
    // Check existence
    if (!this.documentExists(id)) {
      return { acknowledged: true, modifiedCount: 0 };
    }
    
    // Get existing document for the update engine
    const existing = this._collection._documents[id];
    // Apply operators
    const updatedDoc = this._updateEngine.applyOperators(existing, updateOps);

    // Check if the document was actually modified
    if (ObjectUtils.deepEqual(existing, updatedDoc)) {
        return { acknowledged: true, modifiedCount: 0 };
    }

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
    // Validate parameters
    Validate.object(query, 'query');
    Validate.validateUpdateObject(updateOps, 'updateOps', { requireOperators: true });
    
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
    // Validate parameters
    Validate.nonEmptyString(id, 'id');
    Validate.validateUpdateObject(doc, 'doc', { forbidOperators: true });
    
    // Check existence
    if (!this.documentExists(id)) {
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
    // Validate parameters
    Validate.object(query, 'query');
    Validate.validateUpdateObject(doc, 'doc', { forbidOperators: true });
    
    // Find matches
    const matches = this.findMultipleByQuery(query);
    if (matches.length === 0) {
      return 0;
    }
    // Apply replacements
    matches.forEach(d => this.replaceDocument(d._id, doc));
    return matches.length;
  }

  /**
   * Validate document ID
   * @private
   * @param {string} id - Document ID to validate
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When ID is invalid
   */
  _validateDocumentId(id) {
    Validate.nonEmptyString(id, '_id');
  }

  /**
   * Validate document ID in document context
   * @private
   * @param {string|undefined} id - Document ID to validate
   * @param {Object} doc - Document context for error reporting
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When ID is invalid
   */
  _validateDocumentIdInDocument(id, doc) {
    if (id !== undefined && (typeof id !== 'string' || id.trim() === '')) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('doc._id', id, 'Document _id must be a non-empty string if provided');
    }
  }

  /**
   * Validate document field names
   * @private
   * @param {Object} doc - Document to validate
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When field names are invalid
   */
  _validateDocumentFields(doc) {
    for (const field in doc) {
      if (field.startsWith('__')) {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('doc', doc, `Field name "${field}" is reserved (cannot start with __)`);
      }
    }
  }

  /**
   * Check for duplicate document ID
   * @private
   * @param {string} id - Document ID to check
   * @throws {ErrorHandler.ErrorTypes.CONFLICT_ERROR} When ID already exists
   */
  _checkDuplicateId(id) {
    if (this._collection._documents[id]) {
      throw new ErrorHandler.ErrorTypes.CONFLICT_ERROR('document', id, 'Document with this ID already exists');
    }
  }

  /**
   * Validate query object for query operations
   * @private
   * @param {Object} query - Query to validate
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When query is invalid
   */
  _validateQuery(query) {
    Validate.required(query, 'query');
    Validate.object(query, 'query');
  }

  /**
   * Validate update operators
   * @private
   * @param {Object} updateOps - Update operators to validate
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When operators are invalid
   */
  _validateUpdateOperators(updateOps) {
    if (!this._updateEngine) {
      this._updateEngine = new UpdateEngine();
    }
    
    for (const operator in updateOps) {
      if (!this._updateEngine._operatorHandlers[operator]) {
        throw new ErrorHandler.ErrorTypes.INVALID_QUERY(updateOps, `Unsupported update operator: ${operator}`);
      }
    }
  }
}
