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
    // Use Validate for parameter validation
    Validate.nonEmptyString(name, "name");
    Validate.nonEmptyString(driveFileId, "driveFileId");
    Validate.object(database, "database");
    Validate.object(fileService, "fileService");
    Validate.func(fileService.readFile, "fileService.readFile");
    Validate.func(fileService.writeFile, "fileService.writeFile");

    this._name = name;
    this._driveFileId = driveFileId;
    this._database = database;
    this._fileService = fileService;
    this._logger = GASDBLogger.createComponentLogger("Collection");

    // Internal state management
    this._loaded = false;
    this._dirty = false;
    this._documents = {};
    // Initialise collection metadata for both coordination and persistence
    this._metadata = CollectionMetadata.create(name, driveFileId);
    this._documentOperations = null;
    // Inject coordinator for cross-instance operations
    this._coordinator = new CollectionCoordinator(
      this,
      this._database._masterIndex,
      this._database.config,
      this._logger
    );
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
      this._logger.debug("Loading collection data from Drive", {
        fileId: this._driveFileId,
      });

      // FileService.readFile() already returns parsed JSON object, not a string
      const data = this._fileService.readFile(this._driveFileId);

      // Validate file structure
      if (!data || typeof data !== "object") {
        throw new OperationError(
          "Invalid file structure",
          "Collection file must contain a JSON object"
        );
      }

      // Initialise documents and metadata with defaults
      this._documents = data.documents || {};
      const metadataObj = data.metadata || {};
      // Rehydrate metadata instance from stored JSON
      this._metadata = new CollectionMetadata(
        this._name,
        this._driveFileId,
        metadataObj
      );

      // Create DocumentOperations instance with this collection as reference
      this._documentOperations = new DocumentOperations(this);

      this._logger.debug("Collection data loaded successfully", {
        documentCount: Object.keys(this._documents).length,
        metadata: this._metadata.toJSON(),
      });
    } catch (error) {
      this._logger.error("Failed to load collection data", {
        fileId: this._driveFileId,
        error: error.message,
      });

      if (error instanceof OperationError) {
        throw error;
      }

      throw new OperationError("Collection data loading failed", error.message);
    }
  }

  /**
   * Saves collection data to Drive file
   * @private
   * @throws {OperationError} If file write fails
   */
  _saveData() {
    try {
      this._logger.debug("Saving collection data to Drive", {
        fileId: this._driveFileId,
      });

      const data = {
        documents: this._documents,
        metadata: this._metadata.toJSON(),
      };

      this._fileService.writeFile(this._driveFileId, data);

      this._dirty = false;
      this._logger.debug("Collection data saved successfully");
    } catch (error) {
      this._logger.error("Failed to save collection data", {
        fileId: this._driveFileId,
        error: error.message,
      });

      throw new OperationError("Collection data saving failed", error.message);
    }
  }

  /**
   * Marks collection as dirty for persistence
   * @private
   */
  _markDirty() {
    this._dirty = true;
    this._logger.debug("Collection marked as dirty");
  }

  /**
   * Updates collection metadata
   * @private
   * @param {Object} changes - Metadata changes to apply
   */
  _updateMetadata(changes = {}) {
    this._ensureLoaded();

    if (changes.documentCount !== undefined) {
      this._metadata.setDocumentCount(changes.documentCount);
    }

    this._metadata.updateLastModified();
    this._logger.debug("Collection metadata updated", { changes });
  }

  /**
   * Validates filter object structure
   * @private
   * @param {Object} filter - Filter to validate
   * @param {string} operation - Operation name for error messages
   * @throws {InvalidArgumentError} For invalid filter structure
   */
  _validateFilter(filter, operation) {
    // Use Validate for filter validation
    Validate.object(filter, "filter");

    const filterKeys = Object.keys(filter);

    // Validate _id filter value if present
    if (filterKeys.includes("_id")) {
      Validate.nonEmptyString(filter._id, "filter._id");
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
    return this._coordinator.coordinate("insertOne", () => {
      this._ensureLoaded();
      const insertedDoc = this._documentOperations.insertDocument(doc);
      // Update metadata and mark dirty locally
      this._updateMetadata({ documentCount: Object.keys(this._documents).length });
      this._markDirty();
      return { insertedId: insertedDoc._id, acknowledged: true };
    });
  }

  /**
   * Find a single document by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries, _id queries, and empty filter)
   * @returns {Object|null} Document object or null
   * @throws {InvalidArgumentError} For invalid filters
   */
  findOne(filter = {}) {
    this._ensureLoaded();
    this._validateFilter(filter, "findOne");

    const filterKeys = Object.keys(filter);

    // Empty filter {} - return first document
    if (filterKeys.length === 0) {
      const allDocs = this._documentOperations.findAllDocuments();
      return allDocs.length > 0 ? allDocs[0] : null;
    }

    // ID filter {_id: "id"} - use direct lookup for performance
    if (filterKeys.length === 1 && filterKeys[0] === "_id") {
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
    this._validateFilter(filter, "find");

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
   * @param {string|Object} filterOrId - Document ID or filter criteria
   * @param {Object} update - Update operators (e.g. {$set: {field: value}}) or document replacement
   * @returns {Object} {matchedCount: number, modifiedCount: number, acknowledged: boolean}
   * @throws {InvalidArgumentError} For invalid parameters
   */
  updateOne(filterOrId, update) {
    return this._coordinator.coordinate("updateOne", () => {
      this._ensureLoaded();
      // Use Validate for update validation - disallow empty objects
      Validate.object(update, "update", false);

      // Determine if this is a filter or ID
      const isIdFilter = typeof filterOrId === "string";
      const filter = isIdFilter ? { _id: filterOrId } : filterOrId;

      if (!isIdFilter) {
        this._validateFilter(filter, "updateOne");
      }

      // Validate update object structure
      Validate.validateUpdateObject(update, "update");

      // Delegate to appropriate helper
      const updateKeys = Object.keys(update);
      const hasOperators = updateKeys.some((key) => key.startsWith("$"));
      return hasOperators
        ? this._updateOneWithOperators(filter, update)
        : this._updateOneWithReplacement(filter, update);
    });
  }

  /**
   * Updates a single document using update operators
   * @private
   * @param {Object} filter - Query filter
   * @param {Object} update - Update operators
   * @returns {Object} Update result
   */
  _updateOneWithOperators(filter, update) {
    const filterKeys = Object.keys(filter);

    if (filterKeys.length === 1 && filterKeys[0] === "_id") {
      // ID-based update with operators
      const result = this._documentOperations.updateDocumentWithOperators(
        filter._id,
        update
      );

      if (result.modifiedCount > 0) {
        this._updateMetadata();
        this._markDirty();
      }

      return {
        matchedCount: result.modifiedCount > 0 ? 1 : 0,
        modifiedCount: result.modifiedCount,
        acknowledged: true,
      };
    } else {
      // Field-based filter update with operators
      const matchingDoc = this._documentOperations.findByQuery(filter);

      if (!matchingDoc) {
        return {
          matchedCount: 0,
          modifiedCount: 0,
          acknowledged: true,
        };
      }

      const result = this._documentOperations.updateDocumentWithOperators(
        matchingDoc._id,
        update
      );

      if (result.modifiedCount > 0) {
        this._updateMetadata();
        this._markDirty();
      }

      return {
        matchedCount: 1,
        modifiedCount: result.modifiedCount,
        acknowledged: true,
      };
    }
  }

  /**
   * Updates a single document with replacement
   * @private
   * @param {Object} filter - Query filter
   * @param {Object} update - Replacement document
   * @returns {Object} Update result
   */
  _updateOneWithReplacement(filter, update) {
    const filterKeys = Object.keys(filter);

    if (filterKeys.length === 1 && filterKeys[0] === "_id") {
      // ID-based document replacement
      const result = this._documentOperations.updateDocument(
        filter._id,
        update
      );

      if (result.modifiedCount > 0) {
        this._updateMetadata();
        this._markDirty();
      }

      return {
        matchedCount: result.modifiedCount > 0 ? 1 : 0,
        modifiedCount: result.modifiedCount,
        acknowledged: true,
      };
    } else {
      // Field-based filter document replacement
      const matchingDoc = this._documentOperations.findByQuery(filter);

      if (!matchingDoc) {
        return {
          matchedCount: 0,
          modifiedCount: 0,
          acknowledged: true,
        };
      }

      const result = this._documentOperations.updateDocument(
        matchingDoc._id,
        update
      );

      if (result.modifiedCount > 0) {
        this._updateMetadata();
        this._markDirty();
      }

      return {
        matchedCount: 1,
        modifiedCount: result.modifiedCount,
        acknowledged: true,
      };
    }
  }

  /**
   * Update multiple documents matching a filter (MongoDB-compatible)
   * @param {Object} filter - Query filter criteria
   * @param {Object} update - Update operators (e.g. {$set: {field: value}})
   * @returns {Object} {matchedCount: number, modifiedCount: number, acknowledged: boolean}
   * @throws {InvalidArgumentError} For invalid parameters
   */
  updateMany(filter, update) {
    return this._coordinator.coordinate("updateMany", () => {
      this._ensureLoaded();
      this._validateFilter(filter, "updateMany");

      // Use Validate for update validation - disallow empty objects
      Validate.object(update, "update", false);

      // Validate update object structure - require operators only
      Validate.validateUpdateObject(update, "update", { requireOperators: true });

      // Find all matching documents first
      const matchingDocs = this._documentOperations.findMultipleByQuery(filter);
      const matchedCount = matchingDocs.length;

      if (matchedCount === 0) {
        return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
      }

      // Apply updates to all matching documents
      let modifiedCount = 0;
      for (const doc of matchingDocs) {
        const result = this._documentOperations.updateDocumentWithOperators(
          doc._id,
          update
        );
        modifiedCount += result.modifiedCount;
      }

      if (modifiedCount > 0) {
        this._updateMetadata();
        this._markDirty();
      }

      return { matchedCount, modifiedCount, acknowledged: true };
    });
  }

  /**
   * Replace a single document by filter or ID (MongoDB-compatible)
   * @param {string|Object} filterOrId - Document ID or filter criteria
   * @param {Object} doc - Replacement document (cannot contain update operators)
   * @returns {Object} {matchedCount: number, modifiedCount: number, acknowledged: boolean}
   * @throws {InvalidArgumentError} For invalid parameters
   */
  replaceOne(filterOrId, doc) {
    return this._coordinator.coordinate("replaceOne", () => {
      this._ensureLoaded();

      // Use Validate for doc validation - disallow empty objects
      Validate.object(doc, "doc", false);

      // Validate that replacement document contains no operators
      Validate.validateUpdateObject(doc, "doc", { forbidOperators: true });

      // Determine if this is a filter or ID
      const isIdFilter = typeof filterOrId === "string";
      const filter = isIdFilter ? { _id: filterOrId } : filterOrId;

      if (!isIdFilter) {
        this._validateFilter(filter, "replaceOne");
      }

      const filterKeys = Object.keys(filter);

      if (filterKeys.length === 1 && filterKeys[0] === "_id") {
        // ID-based replacement
        const result = this._documentOperations.replaceDocument(filter._id, doc);

        if (result.modifiedCount > 0) {
          this._updateMetadata();
          this._markDirty();
        }

        return { matchedCount: result.modifiedCount > 0 ? 1 : 0, modifiedCount: result.modifiedCount, acknowledged: true };
      }

      // Field-based filter replacement
      const matchingDoc = this._documentOperations.findByQuery(filter);

      if (!matchingDoc) {
        return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
      }

      const result = this._documentOperations.replaceDocument(matchingDoc._id, doc);

      if (result.modifiedCount > 0) {
        this._updateMetadata();
        this._markDirty();
      }

      return { matchedCount: 1, modifiedCount: result.modifiedCount, acknowledged: true };
    });
  }

  /**
   * Deletes a single document by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries, _id queries, and empty filter)
   * @returns {Object} {deletedCount: number, acknowledged: boolean}
   * @throws {InvalidArgumentError} For invalid filters
   */
  deleteOne(filter = {}) {
    return this._coordinator.coordinate("deleteOne", () => {
      this._ensureLoaded();
      this._validateFilter(filter, "deleteOne");
      const filterKeys = Object.keys(filter);
      // Empty filter {} - no op
      if (filterKeys.length === 0) {
        return { deletedCount: 0, acknowledged: true };
      }
      // ID filter
      if (filterKeys.length === 1 && filterKeys[0] === "_id") {
        const result = this._documentOperations.deleteDocumentById(filter._id);
        if (result.deletedCount > 0) {
          this._updateMetadata({ documentCount: Object.keys(this._documents).length });
          this._markDirty();
        }
        return { deletedCount: result.deletedCount, acknowledged: true };
      }
      // Field-based
      const matchingDocs = this._documentOperations.findMultipleByQuery(filter);
      if (matchingDocs.length === 0) {
        return { deletedCount: 0, acknowledged: true };
      }
      let deletedCount = 0;
      for (const doc of matchingDocs) {
        const res = this._documentOperations.deleteDocument(doc._id);
        deletedCount += res.deletedCount;
      }
      if (deletedCount > 0) {
        this._updateMetadata({ documentCount: Object.keys(this._documents).length });
        this._markDirty();
      }
      return { deletedCount, acknowledged: true };
    });
  }

  /**
   * Deletes multiple documents by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries and empty filter)
   * @returns {Object} {deletedCount: number, acknowledged: boolean}
   * @throws {InvalidArgumentError} For invalid filters
   */
  deleteMany(filter = {}) {
    return this._coordinator.coordinate("deleteMany", () => {
      this._ensureLoaded();
      this._validateFilter(filter, "deleteMany");
      const filterKeys = Object.keys(filter);
      if (filterKeys.length === 0) return { deletedCount: 0, acknowledged: true };
      const matchingDocs = this._documentOperations.findMultipleByQuery(filter);
      if (matchingDocs.length === 0) return { deletedCount: 0, acknowledged: true };
      let deletedCount = 0;
      for (const doc of matchingDocs) {
        const res = this._documentOperations.deleteDocument(doc._id);
        deletedCount += res.deletedCount;
      }
      if (deletedCount > 0) {
        this._updateMetadata({ documentCount: Object.keys(this._documents).length });
        this._markDirty();
      }
      return { deletedCount, acknowledged: true };
    });
  }

  /**
   * Counts the number of documents matching a filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries and empty filter)
   * @returns {number} Document count
   * @throws {InvalidArgumentError} For invalid filters
   */
  countDocuments(filter = {}) {
    this._ensureLoaded();
    this._validateFilter(filter, "countDocuments");

    const filterKeys = Object.keys(filter);

    // Empty filter {} - count all documents
    if (filterKeys.length === 0) {
      return Object.keys(this._documents).length;
    }

    // Field-based or complex queries - use QueryEngine
    const matchingDocs = this._documentOperations.findMultipleByQuery(filter);
    return matchingDocs.length;
  }

  /**
   * Aggregates documents with a pipeline (MongoDB-compatible with QueryEngine support)
   * @param {Array} pipeline - Aggregation pipeline stages
   * @returns {Array} Array of aggregated document objects
   * @throws {InvalidArgumentError} For invalid pipeline stages
   */
  aggregate(pipeline = []) {
    this._ensureLoaded();

    // Use Validate for pipeline validation
    Validate.array(pipeline, "pipeline");

    // Directly return all documents for empty pipeline
    if (pipeline.length === 0) {
      return this._documentOperations.findAllDocuments();
    }

    // For now, only $match stage is supported (filtering)
    const matchStage = pipeline.find((stage) => stage.$match);

    if (!matchStage) {
      throw new InvalidArgumentError("Invalid pipeline", "Missing $match stage");
    }

    // Extract and validate the filter from $match stage
    const filter = matchStage.$match;
    this._validateFilter(filter, "aggregate");

    // Use QueryEngine to execute the filtered query
    return this._documentOperations.findMultipleByQuery(filter);
  }

  /**
   * Creates an index on the collection (MongoDB-compatible)
   * @param {Array} fields - Array of field names to index
   * @param {Object} options - Index options (e.g. {unique: true})
   * @returns {Object} Index description
   * @throws {InvalidArgumentError} For invalid index specifications
   */
  createIndex(fields, options = {}) {
    this._ensureLoaded();

    // Use Validate for index specification validation
    Validate.array(fields, "fields");
    Validate.object(options, "options", false);

    // For now, only single-field indexes are supported
    if (fields.length !== 1) {
      throw new InvalidArgumentError("Invalid index specification", "Only single-field indexes are supported");
    }

    const field = fields[0];

    // Ensure the field is a valid string
    Validate.nonEmptyString(field, "field");

    // Create index metadata
    const index = {
      field: field,
      unique: options.unique === true,
    };

    // Add to collection metadata
    this._metadata.addIndex(index);

    this._markDirty();

    return index;
  }

  /**
   * Drops an index from the collection (MongoDB-compatible)
   * @param {string} field - Field name of the index to drop
   * @returns {boolean} True if the index was dropped, false if not found
   * @throws {InvalidArgumentError} For invalid index specifications
   */
  dropIndex(field) {
    this._ensureLoaded();

    // Use Validate for index specification validation
    Validate.nonEmptyString(field, "field");

    const indexExists = this._metadata.indexes.some((index) => index.field === field);

    if (!indexExists) {
      return false; // Index not found
    }

    // Remove from collection metadata
    this._metadata.dropIndex(field);

    this._markDirty();

    return true;
  }

  /**
   * Gets the list of indexes on the collection (MongoDB-compatible)
   * @returns {Array} Array of index descriptions
   */
  getIndexes() {
    this._ensureLoaded();

    return this._metadata.getIndexes();
  }

  /**
   * Gets the metadata for the collection
   * @returns {Object} Metadata object
   */
  getMetadata() {
    this._ensureLoaded();
    return this._metadata.toJSON();
  }

  /**
   * Gets the name of the collection
   * @returns {string} Collection name
   */
  getName() {
    return this._name;
  }

  /**
   * Gets the Google Drive file ID for the collection
   * @returns {string} Drive file ID
   */
  getDriveFileId() {
    return this._driveFileId;
  }

  /**
   * Gets the database instance reference
   * @returns {Database} Database instance
   */
  getDatabase() {
    return this._database;
  }

  /**
   * Gets the FileService instance for Drive operations
   * @returns {FileService} FileService instance
   */
  getFileService() {
    return this._fileService;
  }

  /**
   * Gets the logger instance
   * @returns {Logger} Logger instance
   */
  getLogger() {
    return this._logger;
  }
}
