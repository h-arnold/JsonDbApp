/**
 * CollectionIndexOperations.js - Handles all index operations for a collection.
 */
class CollectionIndexOperations {
    /**
     * @param {Collection} collection - The parent collection instance.
     */
    constructor(collection) {
        this._collection = collection;
    }

    /**
     * Creates an index on the collection (MongoDB-compatible)
     * @param {Array} fields - Array of field names to index
     * @param {Object} options - Index options (e.g. {unique: true})
     * @returns {Object} Index description
     * @throws {InvalidArgumentError} For invalid index specifications
     */
    createIndex(fields, options = {}) {
        this._collection._ensureLoaded();

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
        this._collection._metadata.addIndex(index);

        this._collection._markDirty();

        return index;
    }

    /**
     * Drops an index from the collection (MongoDB-compatible)
     * @param {string} field - Field name of the index to drop
     * @returns {boolean} True if the index was dropped, false if not found
     * @throws {InvalidArgumentError} For invalid index specifications
     */
    dropIndex(field) {
        this._collection._ensureLoaded();

        // Use Validate for index specification validation
        Validate.nonEmptyString(field, "field");

        const indexExists = this._collection._metadata.indexes.some((index) => index.field === field);

        if (!indexExists) {
            return false; // Index not found
        }

        // Remove from collection metadata
        this._collection._metadata.dropIndex(field);

        this._collection._markDirty();

        return true;
    }

    /**
     * Gets the list of indexes on the collection (MongoDB-compatible)
     * @returns {Array} Array of index descriptions
     */
    getIndexes() {
        this._collection._ensureLoaded();

        return this._collection._metadata.getIndexes();
    }
}