/**
 * QueryEngine.js - MongoDB-compatible Query Processing Engine
 * 
 * GREEN PHASE: Comparison Operators Only
 * Provides document filtering and matching capabilities with support for:
 * - Field-based queries with exact matching
 * - Basic comparison operators ($eq, $gt, $lt) 
 * - Simple nested field access using dot notation
 * - Query validation and error handling
 * 
 * Follows SOLID principles with single responsibility for query evaluation.
 * Designed for testability with dependency injection support.
 */

/**
 * Query engine for document matching and filtering
 * Supports MongoDB-compatible query syntax for basic operations
 */
class QueryEngine {
  /**
   * Creates a new QueryEngine instance
   * @param {Object} config - Optional configuration object
   */
  constructor(config = {}) {
    this._logger = GASDBLogger.createComponentLogger('QueryEngine');
    this._config = {
      validateQueries: config.validateQueries !== false,
      supportedOperators: ['$eq', '$gt', '$lt'],
      maxNestedDepth: config.maxNestedDepth || 10
    };
    
    this._logger.debug('QueryEngine initialised', { config: this._config });
  }

  /**
   * Execute query against document collection
   * @param {Array} documents - Array of documents to query
   * @param {Object} query - MongoDB-compatible query object
   * @returns {Array} Filtered documents matching the query
   * @throws {InvalidQueryError} When query is invalid
   */
  executeQuery(documents, query) {
    if (!Array.isArray(documents)) {
      throw new InvalidArgumentError('Documents parameter must be an array');
    }

    if (!query || typeof query !== 'object') {
      throw new InvalidQueryError('Query must be a valid object');
    }

    this._logger.debug('Executing query', { 
      documentCount: documents.length, 
      query: JSON.stringify(query)
    });

    // Empty query matches all documents
    if (Object.keys(query).length === 0) {
      return documents.slice(); // Return copy to prevent mutation
    }

    // Validate query structure
    if (this._config.validateQueries) {
      this._validateQuery(query);
    }

    // Filter documents based on query
    const results = documents.filter(doc => this._matchDocument(doc, query));
    
    this._logger.debug('Query execution complete', { 
      resultCount: results.length 
    });

    return results;
  }

  /**
   * Check if a single document matches the query
   * @param {Object} document - Document to test
   * @param {Object} query - Query object
   * @returns {boolean} True if document matches query
   * @private
   */
  _matchDocument(document, query) {
    // Handle field-based queries (implicit AND for multiple fields)
    const queryFields = Object.keys(query);
    for (const field of queryFields) {
      if (!this._matchField(document, field, query[field])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Match document against a specific field query
   * @param {Object} document - Document to test
   * @param {string} fieldPath - Field path (supports dot notation)
   * @param {*} queryValue - Expected value or operator object
   * @returns {boolean} True if field matches query
   * @private
   */
  _matchField(document, fieldPath, queryValue) {
    const documentValue = this._getFieldValue(document, fieldPath);

    // Handle operator objects
    if (queryValue && typeof queryValue === 'object' && !Array.isArray(queryValue) && !(queryValue instanceof Date)) {
      return this._matchOperators(documentValue, queryValue);
    }

    // Direct value comparison (implicit $eq)
    return this._compareValues(documentValue, queryValue, '$eq');
  }

  /**
   * Get field value from document using dot notation
   * @param {Object} document - Document object
   * @param {string} fieldPath - Field path (e.g., "user.profile.name")
   * @returns {*} Field value or undefined if not found
   * @private
   */
  _getFieldValue(document, fieldPath) {
    if (!fieldPath || typeof fieldPath !== 'string') {
      return undefined;
    }

    const pathParts = fieldPath.split('.');
    let currentValue = document;

    for (const part of pathParts) {
      if (currentValue == null || typeof currentValue !== 'object') {
        return undefined;
      }
      currentValue = currentValue[part];
    }

    return currentValue;
  }

  /**
   * Match operators against document value
   * @param {*} documentValue - Value from document
   * @param {Object} operators - Operator object (e.g., {$gt: 5})
   * @returns {boolean} True if all operators match
   * @private
   */
  _matchOperators(documentValue, operators) {
    const operatorKeys = Object.keys(operators);
    
    for (const operator of operatorKeys) {
      if (!this._compareValues(documentValue, operators[operator], operator)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare values using specified operator
   * @param {*} documentValue - Value from document
   * @param {*} queryValue - Value from query
   * @param {string} operator - Comparison operator ($eq, $gt, $lt)
   * @returns {boolean} True if comparison succeeds
   * @private
   */
  _compareValues(documentValue, queryValue, operator) {
    switch (operator) {
      case '$eq':
        return this._equalityComparison(documentValue, queryValue);

      case '$gt':
        return this._greaterThanComparison(documentValue, queryValue);

      case '$lt':
        return this._lessThanComparison(documentValue, queryValue);

      default:
        throw new InvalidQueryError(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Perform equality comparison
   * @param {*} docValue - Document value
   * @param {*} queryValue - Query value
   * @returns {boolean} True if values are equal
   * @private
   */
  _equalityComparison(docValue, queryValue) {
    // Handle Date objects
    if (docValue instanceof Date && queryValue instanceof Date) {
      return docValue.getTime() === queryValue.getTime();
    }

    // Handle null/undefined
    if (docValue == null && queryValue == null) {
      return true;
    }

    // Standard equality
    return docValue === queryValue;
  }

  /**
   * Perform greater than comparison
   * @param {*} docValue - Document value
   * @param {*} queryValue - Query value
   * @returns {boolean} True if docValue > queryValue
   * @private
   */
  _greaterThanComparison(docValue, queryValue) {
    // Handle null/undefined
    if (docValue == null || queryValue == null) {
      return false;
    }

    // Handle Date objects
    if (docValue instanceof Date && queryValue instanceof Date) {
      return docValue.getTime() > queryValue.getTime();
    }

    // Handle numbers and strings
    if (typeof docValue === typeof queryValue) {
      return docValue > queryValue;
    }

    return false;
  }

  /**
   * Perform less than comparison
   * @param {*} docValue - Document value
   * @param {*} queryValue - Query value
   * @returns {boolean} True if docValue < queryValue
   * @private
   */
  _lessThanComparison(docValue, queryValue) {
    // Handle null/undefined
    if (docValue == null || queryValue == null) {
      return false;
    }

    // Handle Date objects
    if (docValue instanceof Date && queryValue instanceof Date) {
      return docValue.getTime() < queryValue.getTime();
    }

    // Handle numbers and strings
    if (typeof docValue === typeof queryValue) {
      return docValue < queryValue;
    }

    return false;
  }

  /**
   * Validate query structure and operators
   * @param {Object} query - Query object to validate
   * @throws {InvalidQueryError} When query is invalid
   * @private
   */
  _validateQuery(query) {
    this._validateQueryDepth(query, 0);
    this._validateOperators(query);
  }

  /**
   * Validate query depth to prevent excessive nesting
   * @param {*} obj - Object to check
   * @param {number} depth - Current depth
   * @throws {InvalidQueryError} When depth exceeds limit
   * @private
   */
  _validateQueryDepth(obj, depth) {
    if (depth > this._config.maxNestedDepth) {
      throw new InvalidQueryError(`Query nesting exceeds maximum depth of ${this._config.maxNestedDepth}`);
    }

    if (obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Date)) {
      Object.values(obj).forEach(value => {
        this._validateQueryDepth(value, depth + 1);
      });
    }
  }

  /**
   * Validate operators used in query
   * @param {Object} query - Query object
   * @throws {InvalidQueryError} When unsupported operator found
   * @private
   */
  _validateOperators(query) {
    this._findOperators(query).forEach(operator => {
      if (!this._config.supportedOperators.includes(operator)) {
        throw new InvalidQueryError(`Unsupported operator: ${operator}`);
      }
    });
  }

  /**
   * Find all operators used in query
   * @param {*} obj - Object to search
   * @returns {Array} Array of operator strings
   * @private
   */
  _findOperators(obj, operators = []) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Date)) {
      Object.keys(obj).forEach(key => {
        if (key.startsWith('$')) {
          operators.push(key);
        }
        this._findOperators(obj[key], operators);
      });
    }

    return operators;
  }
}
