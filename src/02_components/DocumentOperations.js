/**
 * DocumentOperations.js - Document Operations Component
 *
 * Handles basic CRUD operations on document collections stored as plain objects.
 * Provides ID-based document manipulation with validation and error handling.
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
/**
 * Provides low-level CRUD helpers that manipulate the collection's in-memory
 * document store, handling ID generation, validation, and dirty state updates.
 */
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
   * @throws {InvalidArgumentError} When document is invalid
   * @throws {ConflictError} When document ID already exists
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
   * @throws {InvalidArgumentError} When ID is invalid
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
   * @throws {InvalidArgumentError} When parameters are invalid
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
   * @throws {InvalidArgumentError} When ID is invalid
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
   * @throws {InvalidArgumentError} When ID is invalid
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
   * @throws {InvalidQueryError} When query contains invalid operators
   */
  findByQuery(query) {
    const results = this._executeQuery(query, 'findByQuery');
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find multiple documents matching query using QueryEngine
   * @param {Object} query - MongoDB-compatible query object
   * @returns {Array<Object>} Array of matching documents (empty array if none found)
   * @throws {InvalidQueryError} When query contains invalid operators
   */
  findMultipleByQuery(query) {
    return this._executeQuery(query, 'findMultipleByQuery');
  }

  /**
   * Count documents matching query using QueryEngine
   * @param {Object} query - MongoDB-compatible query object
   * @returns {number} Count of matching documents
   * @throws {InvalidQueryError} When query contains invalid operators
   */
  countByQuery(query) {
    const results = this._executeQuery(query, 'countByQuery');
    return results.length;
  }

  /**
   * Execute query using QueryEngine (shared helper)
   * @private
   * @param {Object} query - MongoDB-compatible query object
   * @param {string} operation - Operation name for logging
   * @returns {Array<Object>} Query results
   * @throws {InvalidQueryError} When query contains invalid operators
   * @remarks Emits a DEBUG-gated docOps.executeQuery timing event through the component logger;
   *   the whole scan is timed as one unit.
   */
  _executeQuery(query, operation) {
    return this._logger.timeSync('docOps.executeQuery', () => {
      this._validateQuery(query);
      const documents = this.findAllDocuments();
      const queryEngine = this._getQueryEngine();
      const results = queryEngine.executeQuery(documents, query);

      this._logger.debug(`Query executed by ${operation}`, () => ({
        queryString: JSON.stringify(query),
        resultCount: results.length
      }));

      return results;
    });
  }

  /**
   * Generate unique document ID
   * @private
   * @returns {string} Generated unique ID
   * @throws {OperationError} When unique ID generation exhausts the maximum attempt budget.
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
        throw new ErrorHandler.ErrorTypes.OPERATION_ERROR(
          '_generateDocumentId',
          `Failed to generate unique document ID after ${maxAttempts} attempts`
        );
      }
    } while (this._collection._documents[id]);

    return id;
  }

  /**
   * Validate document structure and content
   * @private
   * @param {Object} doc - Document to validate
   * @throws {InvalidArgumentError} When document is invalid
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
   * Retrieve or create the QueryEngine instance.
   * @returns {QueryEngine} QueryEngine instance configured from DatabaseConfig.
   * @private
   */
  _getQueryEngine() {
    if (!this._queryEngine) {
      const databaseConfig =
        this._collection && this._collection._database ? this._collection._database.config : null;
      const queryEngineConfig =
        databaseConfig && typeof databaseConfig.getQueryEngineConfig === 'function'
          ? databaseConfig.getQueryEngineConfig()
          : undefined;
      this._queryEngine = new QueryEngine(queryEngineConfig);
    }

    return this._queryEngine;
  }

  /**
   * Apply update operators to a document by ID
   * @param {string} id - Document identifier
   * @param {Object} updateOps - MongoDB-style update operators
   * @returns {Object} Update result { acknowledged: boolean, modifiedCount: number }
   * @throws {InvalidArgumentError} When parameters are invalid
   * @throws {InvalidQueryError} When update operators are invalid
   * @remarks Emits a DEBUG-gated docOps.updateWithOperators timing event through the component
   *   logger; the whole operator batch is timed as one unit.
   */
  updateDocumentWithOperators(id, updateOps) {
    return this._logger.timeSync('docOps.updateWithOperators', () => {
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
      this._logger.debug('Document updated with operators', {
        documentId: id,
        operators: updateOps
      });
      return { acknowledged: true, modifiedCount: 1 };
    });
  }

  /**
   * Update documents matching a query using operators
   * @param {Object} query - Filter criteria
   * @param {Object} updateOps - MongoDB-style update operators
   * @returns {number} Number of documents updated
   * @throws {InvalidArgumentError} When parameters are invalid
   * @throws {InvalidQueryError} When update operators are invalid
   * @throws {DocumentNotFoundError} When no documents match
   * @remarks Bulk application is timed as a single docOps.applyToMatching boundary event (see
   *   _applyToMatchingDocuments); per-document operator timers stay silent beneath it.
   */
  updateDocumentByQuery(query, updateOps) {
    Validate.object(query, 'query');
    Validate.validateUpdateObject(updateOps, 'updateOps', { requireOperators: true });

    return this._applyToMatchingDocuments(
      query,
      (doc) => this.updateDocumentWithOperators(doc._id, updateOps),
      true // throwIfNoMatches
    );
  }

  /**
   * Replace a single document by ID
   * @param {string} id - Document identifier
   * @param {Object} doc - Replacement document
   * @returns {Object} Replace result { acknowledged: boolean, modifiedCount: number }
   * @throws {InvalidArgumentError} When parameters are invalid
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
   * @throws {InvalidArgumentError} When parameters are invalid
   * @remarks Bulk application is timed as a single docOps.applyToMatching boundary event (see
   *   _applyToMatchingDocuments); the inner query scan timer stays silent beneath it.
   */
  replaceDocumentByQuery(query, doc) {
    Validate.object(query, 'query');
    Validate.validateUpdateObject(doc, 'doc', { forbidOperators: true });

    return this._applyToMatchingDocuments(
      query,
      (matchedDoc) => this.replaceDocument(matchedDoc._id, doc).modifiedCount,
      false // throwIfNoMatches
    );
  }

  /**
   * Apply an operation to all documents matching a query
   * @private
   * @param {Object} query - Filter criteria
   * @param {Function} applyFn - Function to apply to each matched document
   * @param {boolean} throwIfNoMatches - Whether to throw when no documents match
   * @returns {number} Number of documents affected
   * @throws {DocumentNotFoundError} When throwIfNoMatches and no matches found
   * @remarks Emits a DEBUG-gated docOps.applyToMatching timing event through the component
   *   logger. The whole bulk application (match scan plus per-document work) is timed as ONE
   *   boundary unit, so a direct bulk call emits exactly one timing event regardless of how
   *   many documents match — per-document emissions would otherwise grow as O(matched count)
   *   and violate the facility's event-volume contract (one timing event per operation, not per
   *   document). While this measurement is active,
   *   JDbLogger's stacked-timer short-circuit suppresses every inner timer (docOps.executeQuery,
   *   docOps.updateWithOperators, updateEngine.applyOperators); under Collection-level wrappers
   *   such as collection.updateMany the outer boundary is already measuring, so this inner
   *   timer stays silent and each user-visible operation still emits exactly its single
   *   outermost label.
   */
  _applyToMatchingDocuments(query, applyFn, throwIfNoMatches) {
    return this._logger.timeSync('docOps.applyToMatching', () => {
      const matches = this.findMultipleByQuery(query);

      if (matches.length === 0) {
        if (throwIfNoMatches) {
          throw new ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND(query, this._collection.name);
        }
        return 0;
      }

      let affectedCount = 0;
      for (const doc of matches) {
        const result = applyFn(doc);
        // Handle both result objects and direct counts
        affectedCount += typeof result === 'number' ? result : result.modifiedCount || 0;
      }

      return affectedCount;
    });
  }

  /**
   * Validate document ID
   * @private
   * @param {string} id - Document ID to validate
   * @throws {InvalidArgumentError} When ID is invalid
   */
  _validateDocumentId(id) {
    Validate.nonEmptyString(id, '_id');
  }

  /**
   * Validate document ID in document context
   * @private
   * @param {string|undefined} id - Document ID to validate
   * @param {Object} doc - Document context for error reporting
   * @throws {InvalidArgumentError} When ID is invalid
   */
  _validateDocumentIdInDocument(id, doc) {
    if (id !== undefined && (typeof id !== 'string' || id.trim() === '')) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'doc._id',
        id,
        'Document _id must be a non-empty string if provided'
      );
    }
  }

  /**
   * Validate document field names
   * @private
   * @param {Object} doc - Document to validate
   * @throws {InvalidArgumentError} When field names are invalid
   */
  _validateDocumentFields(doc) {
    for (const field in doc) {
      if (field.startsWith('__')) {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
          'doc',
          doc,
          `Field name "${field}" is reserved (cannot start with __)`
        );
      }
    }
  }

  /**
   * Check for duplicate document ID
   * @private
   * @param {string} id - Document ID to check
   * @throws {ConflictError} When ID already exists
   */
  _checkDuplicateId(id) {
    if (this._collection._documents[id]) {
      throw new ErrorHandler.ErrorTypes.CONFLICT_ERROR(
        'document',
        id,
        'Document with this ID already exists'
      );
    }
  }

  /**
   * Validate query object for query operations
   * @private
   * @param {Object} query - Query to validate
   * @throws {InvalidArgumentError} When query is invalid
   */
  _validateQuery(query) {
    Validate.required(query, 'query');
    Validate.object(query, 'query');
  }

  /**
   * Validate update operators
   * @private
   * @param {Object} updateOps - Update operators to validate
   * @throws {InvalidQueryError} When operators are invalid
   */
  _validateUpdateOperators(updateOps) {
    if (!this._updateEngine) {
      this._updateEngine = new UpdateEngine();
    }

    for (const operator in updateOps) {
      if (!this._updateEngine._operatorHandlers[operator]) {
        throw new ErrorHandler.ErrorTypes.INVALID_QUERY(
          updateOps,
          `Unsupported update operator: ${operator}`
        );
      }
    }
  }
}
