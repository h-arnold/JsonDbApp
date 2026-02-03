/**
 * CollectionWriteOperations.js - Handles all write operations for a collection.
 */
/* exported CollectionWriteOperations */
/**
 * Handles all write operations for a single collection instance.
 * @class
 * @remarks Uses the parent collection's coordinator to ensure consistent,
 * serialised write operations across concurrent executions.
 */
class CollectionWriteOperations {
    /**
     * Create a new write operations helper for a collection.
     * @param {Collection} collection - The parent collection instance.
     */
    constructor(collection) {
        this._collection = collection;
        this._coordinator = collection._coordinator;
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
            this._collection._ensureLoaded();
            const insertedDoc = this._collection._documentOperations.insertDocument(doc);
            // Update metadata and mark dirty locally
            this._collection._updateMetadata({ documentCount: Object.keys(this._collection._documents).length });
            this._collection._markDirty();
            return { insertedId: insertedDoc._id, acknowledged: true };
        });
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
            this._collection._ensureLoaded();
            // Use Validate for update validation - disallow empty objects
            Validate.object(update, "update", false);

            // Determine if this is a filter or ID
            const isIdFilter = typeof filterOrId === "string";
            const filter = isIdFilter ? { _id: filterOrId } : filterOrId;

            if (!isIdFilter) {
                this._collection._validateFilter(filter, "updateOne");
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
            const docExists = this._collection._documentOperations.findDocumentById(filter._id) !== null;

            if (!docExists) {
                return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
            }

            const result = this._collection._documentOperations.updateDocumentWithOperators(
                filter._id,
                update
            );

            if (result.modifiedCount > 0) {
                this._collection._updateMetadata();
                this._collection._markDirty();
            }

            return {
                matchedCount: 1,
                modifiedCount: result.modifiedCount,
                acknowledged: true,
            };
        } else {
            // Field-based filter update with operators
            const matchingDoc = this._collection._documentOperations.findByQuery(filter);

            if (!matchingDoc) {
                return {
                    matchedCount: 0,
                    modifiedCount: 0,
                    acknowledged: true,
                };
            }

            const result = this._collection._documentOperations.updateDocumentWithOperators(
                matchingDoc._id,
                update
            );

            if (result.modifiedCount > 0) {
                this._collection._updateMetadata();
                this._collection._markDirty();
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
            const result = this._collection._documentOperations.updateDocument(
                filter._id,
                update
            );

            if (result.modifiedCount > 0) {
                this._collection._updateMetadata();
                this._collection._markDirty();
            }

            return {
                matchedCount: result.modifiedCount > 0 ? 1 : 0,
                modifiedCount: result.modifiedCount,
                acknowledged: true,
            };
        } else {
            // Field-based filter document replacement
            const matchingDoc = this._collection._documentOperations.findByQuery(filter);

            if (!matchingDoc) {
                return {
                    matchedCount: 0,
                    modifiedCount: 0,
                    acknowledged: true,
                };
            }

            const result = this._collection._documentOperations.updateDocument(
                matchingDoc._id,
                update
            );

            if (result.modifiedCount > 0) {
                this._collection._updateMetadata();
                this._collection._markDirty();
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
            this._collection._ensureLoaded();
            this._collection._validateFilter(filter, "updateMany");

            // Use Validate for update validation - disallow empty objects
            Validate.object(update, "update", false);

            // Validate update object structure - require operators only
            Validate.validateUpdateObject(update, "update", { requireOperators: true });

            // Find all matching documents first
            const matchingDocs = this._collection._documentOperations.findMultipleByQuery(filter);
            const matchedCount = matchingDocs.length;

            if (matchedCount === 0) {
                return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
            }

            // Apply updates to all matching documents
            let modifiedCount = 0;
            for (const doc of matchingDocs) {
                const result = this._collection._documentOperations.updateDocumentWithOperators(
                    doc._id,
                    update
                );
                modifiedCount += result.modifiedCount;
            }

            if (modifiedCount > 0) {
                this._collection._updateMetadata();
                this._collection._markDirty();
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
            this._collection._ensureLoaded();

            // Use Validate for doc validation - disallow empty objects
            Validate.object(doc, "doc", false);

            // Validate that replacement document contains no operators
            Validate.validateUpdateObject(doc, "doc", { forbidOperators: true });

            // Determine if this is a filter or ID
            const isIdFilter = typeof filterOrId === "string";
            const filter = isIdFilter ? { _id: filterOrId } : filterOrId;

            if (!isIdFilter) {
                this._collection._validateFilter(filter, "replaceOne");
            }

            const filterKeys = Object.keys(filter);

            if (filterKeys.length === 1 && filterKeys[0] === "_id") {
                // ID-based replacement
                const result = this._collection._documentOperations.replaceDocument(filter._id, doc);

                if (result.modifiedCount > 0) {
                    this._collection._updateMetadata();
                    this._collection._markDirty();
                }

                return { matchedCount: result.modifiedCount > 0 ? 1 : 0, modifiedCount: result.modifiedCount, acknowledged: true };
            }

            // Field-based filter replacement
            const matchingDoc = this._collection._documentOperations.findByQuery(filter);

            if (!matchingDoc) {
                return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
            }

            const result = this._collection._documentOperations.replaceDocument(matchingDoc._id, doc);

            if (result.modifiedCount > 0) {
                this._collection._updateMetadata();
                this._collection._markDirty();
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
            this._collection._ensureLoaded();
            this._collection._validateFilter(filter, "deleteOne");
            const filterKeys = Object.keys(filter);
            // Empty filter {} - no op
            if (filterKeys.length === 0) {
                return { deletedCount: 0, acknowledged: true };
            }
            // ID filter
            if (filterKeys.length === 1 && filterKeys[0] === "_id") {
                const result = this._collection._documentOperations.deleteDocument(filter._id);
                if (result.deletedCount > 0) {
                    this._collection._updateMetadata({ documentCount: Object.keys(this._collection._documents).length });
                    this._collection._markDirty();
                }
                return { deletedCount: result.deletedCount, acknowledged: true };
            }
            // Field-based - only delete the FIRST matching document
            const matchingDocs = this._collection._documentOperations.findMultipleByQuery(filter);
            if (matchingDocs.length === 0) {
                return { deletedCount: 0, acknowledged: true };
            }
            // Only delete the first matching document for deleteOne()
            const firstDoc = matchingDocs[0];
            const res = this._collection._documentOperations.deleteDocument(firstDoc._id);
            const deletedCount = res.deletedCount;
            if (deletedCount > 0) {
                this._collection._updateMetadata({ documentCount: Object.keys(this._collection._documents).length });
                this._collection._markDirty();
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
            this._collection._ensureLoaded();
            this._collection._validateFilter(filter, "deleteMany");
            const filterKeys = Object.keys(filter);
            if (filterKeys.length === 0) return { deletedCount: 0, acknowledged: true };
            const matchingDocs = this._collection._documentOperations.findMultipleByQuery(filter);
            if (matchingDocs.length === 0) return { deletedCount: 0, acknowledged: true };
            let deletedCount = 0;
            for (const doc of matchingDocs) {
                const res = this._collection._documentOperations.deleteDocument(doc._id);
                deletedCount += res.deletedCount;
            }
            if (deletedCount > 0) {
                this._collection._updateMetadata({ documentCount: Object.keys(this._collection._documents).length });
                this._collection._markDirty();
            }
            return { deletedCount, acknowledged: true };
        });
    }
}
