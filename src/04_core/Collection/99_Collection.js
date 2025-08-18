/**
 * 99_Collection.js - MongoDB-Compatible Collection Implementation (Facade)
 *
 * This class acts as a facade, coordinating a subsystem of components to provide
 * a MongoDB-compatible API for collection operations.
 *
 * It manages the collection's lifecycle, state, and persistence, while delegating
 * specific read, write, and index operations to specialized handler classes.
 *
 * Core Components:
 * - CollectionReadOperations: Handles find, findOne, count, etc.
 * - CollectionWriteOperations: Handles insert, update, delete, etc.
 * - CollectionIndexOperations: Handles index management.
 * - CollectionCoordinator: Manages cross-instance consistency.
 * - DocumentOperations: Performs low-level document manipulation.
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
        this._logger = JDbLogger.createComponentLogger("Collection");

        // Internal state management
        this._loaded = false;
        this._dirty = false;
        this._documents = {};
        // Initialise collection metadata for both coordination and persistence
        this._metadata = CollectionMetadata.create(name, driveFileId);
        this._documentOperations = null; // Initialised on first load

        // Inject coordinator for cross-instance operations
        this._coordinator = new CollectionCoordinator(
            this,
            this._database._masterIndex,
            this._database.config,
            this._logger
        );

        // Instantiate operation handlers
        this._readOps = new CollectionReadOperations(this);
        this._writeOps = new CollectionWriteOperations(this);
        this._indexOps = new CollectionIndexOperations(this);
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

            const data = this._fileService.readFile(this._driveFileId);

            if (!data || typeof data !== "object") {
                throw new OperationError(
                    "Invalid file structure",
                    "Collection file must contain a JSON object"
                );
            }

            this._documents = data.documents || {};
            const metadataObj = data.metadata || {};
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
        Validate.object(filter, "filter");

        const filterKeys = Object.keys(filter);

        if (filterKeys.includes("_id")) {
            Validate.nonEmptyString(filter._id, "filter._id");
        }
    }

    // --- Delegated Write Operations ---
    insertOne(doc) { return this._writeOps.insertOne(doc); }
    updateOne(filterOrId, update) { return this._writeOps.updateOne(filterOrId, update); }
    updateMany(filter, update) { return this._writeOps.updateMany(filter, update); }
    replaceOne(filterOrId, doc) { return this._writeOps.replaceOne(filterOrId, doc); }
    deleteOne(filter) { return this._writeOps.deleteOne(filter); }
    deleteMany(filter) { return this._writeOps.deleteMany(filter); }

    // --- Delegated Read Operations ---
    findOne(filter) { return this._readOps.findOne(filter); }
    find(filter) { return this._readOps.find(filter); }
    countDocuments(filter) { return this._readOps.countDocuments(filter); }
    aggregate(pipeline) { return this._readOps.aggregate(pipeline); }

    // --- Delegated Index Operations ---
    createIndex(fields, options) { return this._indexOps.createIndex(fields, options); }
    // --- Delegated Write Operations ---
    /**
     * Inserts a single document into the collection.
     * @param {Object} doc - The document to insert.
     * @returns {Object} Result of the insert operation.
     */
    insertOne(doc) { return this._writeOps.insertOne(doc); }
    /**
     * Updates a single document matching the filter or _id.
     * @param {Object|string} filterOrId - Filter object or document _id.
     * @param {Object} update - Update operations to apply.
     * @returns {Object} Result of the update operation.
     */
    updateOne(filterOrId, update) { return this._writeOps.updateOne(filterOrId, update); }
    /**
     * Updates multiple documents matching the filter.
     * @param {Object} filter - Filter object to match documents.
     * @param {Object} update - Update operations to apply.
     * @returns {Object} Result of the update operation.
     */
    updateMany(filter, update) { return this._writeOps.updateMany(filter, update); }
    /**
     * Replaces a single document matching the filter or _id.
     * @param {Object|string} filterOrId - Filter object or document _id.
     * @param {Object} doc - The replacement document.
     * @returns {Object} Result of the replace operation.
     */
    replaceOne(filterOrId, doc) { return this._writeOps.replaceOne(filterOrId, doc); }
    /**
     * Deletes a single document matching the filter.
     * @param {Object} filter - Filter object to match documents.
     * @returns {Object} Result of the delete operation.
     */
    deleteOne(filter) { return this._writeOps.deleteOne(filter); }
    /**
     * Deletes multiple documents matching the filter.
     * @param {Object} filter - Filter object to match documents.
     * @returns {Object} Result of the delete operation.
     */
    deleteMany(filter) { return this._writeOps.deleteMany(filter); }

    // --- Delegated Read Operations ---
    /**
     * Finds a single document matching the filter.
     * @param {Object} filter - Filter object to match documents.
     * @returns {Object|null} The found document or null if not found.
     */
    findOne(filter) { return this._readOps.findOne(filter); }
    /**
     * Finds all documents matching the filter.
     * @param {Object} filter - Filter object to match documents.
     * @returns {Array<Object>} Array of matching documents.
     */
    find(filter) { return this._readOps.find(filter); }
    /**
     * Counts the number of documents matching the filter.
     * @param {Object} filter - Filter object to match documents.
     * @returns {number} Number of matching documents.
     */
    countDocuments(filter) { return this._readOps.countDocuments(filter); }
    /**
     * Runs an aggregation pipeline on the collection.
     * @param {Array<Object>} pipeline - Aggregation pipeline stages.
     * @returns {Array<Object>} Aggregation result.
     */
    aggregate(pipeline) { return this._readOps.aggregate(pipeline); }

    // --- Delegated Index Operations ---
    /**
     * Creates an index on specified fields.
     * @param {Object} fields - Fields to index.
     * @param {Object} [options] - Index options.
     * @returns {Object} Result of the create index operation.
     */
    createIndex(fields, options) { return this._indexOps.createIndex(fields, options); }
    /**
     * Drops an index on the specified field.
     * @param {string} field - Field name of the index to drop.
     * @returns {Object} Result of the drop index operation.
     */
    dropIndex(field) { return this._indexOps.dropIndex(field); }
    /**
     * Retrieves all indexes for the collection.
     * @returns {Array<Object>} Array of index definitions.
     */
    getIndexes() { return this._indexOps.getIndexes(); }

    // --- Core Collection Operations ---
    save() {
        return this._coordinator.coordinate("save", () => {
            this._ensureLoaded();
            if (this._dirty) {
                this._saveData();
            }
            return { acknowledged: true };
        });
    }

    // --- Getters ---
    getMetadata() { this._ensureLoaded(); return this._metadata.toJSON(); }
    getName() { return this._name; }
    isDirty() { return this._dirty; }
    getDriveFileId() { return this._driveFileId; }
    getDatabase() { return this._database; }
    getFileService() { return this._fileService; }
    getLogger() { return this._logger; }
    get name() { return this._name; }
    get driveFileId() { return this._driveFileId; }
}