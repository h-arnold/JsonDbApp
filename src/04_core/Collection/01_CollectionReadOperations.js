/**
 * CollectionReadOperations.js - Handles all read operations for a collection.
 */
/* exported CollectionReadOperations */
/**
 * Encapsulates all read-only operations for a {@link Collection}, providing
 * MongoDB-like query semantics via the underlying DocumentOperations and
 * QueryEngine.
 */
class CollectionReadOperations {
  /**
   * Create a new read operations helper for a collection.
   * @param {Collection} collection - The parent collection instance.
   */
  constructor(collection) {
    this._collection = collection;
  }

  /**
   * Find a single document by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries, _id queries, and empty filter)
   * @returns {Object|null} Document object or null
   * @throws {InvalidArgumentError} For invalid filters
   */
  findOne(filter = {}) {
    this._collection._ensureLoaded();
    this._collection._validateFilter(filter, 'findOne');

    const filterKeys = Object.keys(filter);

    // Empty filter {} - return first document
    if (filterKeys.length === 0) {
      const allDocs = this._collection._documentOperations.findAllDocuments();
      return allDocs.length > 0 ? allDocs[0] : null;
    }

    // ID filter {_id: "id"} - use direct lookup for performance
    if (filterKeys.length === 1 && filterKeys[0] === '_id') {
      return this._collection._documentOperations.findDocumentById(filter._id);
    }

    // Field-based or complex queries - use QueryEngine
    return this._collection._documentOperations.findByQuery(filter);
  }

  /**
   * Find multiple documents by filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries and empty filter)
   * @returns {Array} Array of document objects
   * @throws {InvalidArgumentError} For invalid filters
   */
  find(filter = {}) {
    this._collection._ensureLoaded();
    this._collection._validateFilter(filter, 'find');

    const filterKeys = Object.keys(filter);

    // Empty filter {} - return all documents
    if (filterKeys.length === 0) {
      return this._collection._documentOperations.findAllDocuments();
    }

    // Field-based or complex queries - use QueryEngine
    return this._collection._documentOperations.findMultipleByQuery(filter);
  }

  /**
   * Counts the number of documents matching a filter (MongoDB-compatible with QueryEngine support)
   * @param {Object} filter - Query filter (supports field-based queries and empty filter)
   * @returns {number} Document count
   * @throws {InvalidArgumentError} For invalid filters
   */
  countDocuments(filter = {}) {
    this._collection._ensureLoaded();
    this._collection._validateFilter(filter, 'countDocuments');

    const filterKeys = Object.keys(filter);

    // Empty filter {} - count all documents
    if (filterKeys.length === 0) {
      return Object.keys(this._collection._documents).length;
    }

    // Field-based or complex queries - use QueryEngine
    const matchingDocs = this._collection._documentOperations.findMultipleByQuery(filter);
    return matchingDocs.length;
  }

  /**
   * Aggregates documents with a pipeline (MongoDB-compatible with QueryEngine support)
   * @param {Array} pipeline - Aggregation pipeline stages
   * @returns {Array} Array of aggregated document objects
   * @throws {InvalidArgumentError} For invalid pipeline stages
   */
  aggregate(pipeline = []) {
    this._collection._ensureLoaded();

    // Use Validate for pipeline validation
    Validate.array(pipeline, 'pipeline');

    // Directly return all documents for empty pipeline
    if (pipeline.length === 0) {
      return this._collection._documentOperations.findAllDocuments();
    }

    // For now, only $match stage is supported (filtering)
    const matchStage = pipeline.find((stage) => stage.$match);

    if (!matchStage) {
      throw new InvalidArgumentError('Invalid pipeline', 'Missing $match stage');
    }

    // Extract and validate the filter from $match stage
    const filter = matchStage.$match;
    this._collection._validateFilter(filter, 'aggregate');

    // Use QueryEngine to execute the filtered query
    return this._collection._documentOperations.findMultipleByQuery(filter);
  }
}
