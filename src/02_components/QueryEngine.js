/**
 * QueryEngine.js - MongoDB-compatible Query Processing Engine
 * 
 * GREEN PHASE: Comparison Operators Only
 * Provides document filtering and matching capabilities with support for:
 * - Field-based queries with exact matching
 * - Basic comparison operators ($eq, $gt, $lt) 
 * - Simple nested field access using dot notation
 * - Comprehensive query validation and error handling
 * 
 * Security: All queries are validated for structure and operators to prevent
 * malicious queries and ensure consistent error handling.
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
   * @param {number} [config.maxNestedDepth=10] - Maximum allowed query nesting depth
   */
  constructor(config = {}) {
    this._logger = JDbLogger.createComponentLogger('QueryEngine');
    this._config = {
      supportedOperators: ['$eq', '$gt', '$lt', '$and', '$or'],
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
    // Validate all inputs and query structure
    this._validateQuery(documents, query);

    this._logger.debug('Executing query', { 
      documentCount: documents.length, 
      query: JSON.stringify(query)
    });

    // Empty query matches all documents
    if (Object.keys(query).length === 0) {
      return documents.slice(); // Return copy to prevent mutation
    }

    // Filter documents based on query
    const results = documents.filter(doc => this._matchDocument(doc, query));
    
    this._logger.debug('Query execution complete', { 
      resultCount: results.length 
    });

    return results;
  }

/**
   * Determine if a document matches the given query
   * @param {Object} document - Document to test
   * @param {Object} query - MongoDB-compatible query object
   * @returns {boolean} True if document matches
   * @private
   */
  _matchDocument(document, query) {
    const keys = Object.keys(query);

    // 1) Implicit field matching: every non-logical field key is treated as an AND clause
    //    e.g. { a:1, b:2 } means a==1 AND b==2
    for (const key of keys) {
      if (key !== '$and' && key !== '$or') {
        // If any simple field fails, the document is not a match
        if (!this._matchField(document, key, query[key])) {
          return false;
        }
      }
    }

    // 2) Explicit $and operator: must match *all* provided conditions
    //    Follows MongoDB semantics: empty array matches all documents
    if (query.$and !== undefined) {
      if (!Array.isArray(query.$and)) {
        throw new InvalidQueryError('$and operator requires an array of conditions');
      }
      if (query.$and.length === 0) {
        return true;
      }
      for (const cond of query.$and) {
        // Recursively apply matching for each $and condition
        if (!this._matchDocument(document, cond)) {
          return false;
        }
      }
    }

    // 3) Explicit $or operator: must match *at least one* of the provided conditions
    //    Follows MongoDB semantics: empty array matches no documents
    if (query.$or !== undefined) {
      if (!Array.isArray(query.$or)) {
        throw new InvalidQueryError('$or operator requires an array of conditions');
      }
      if (query.$or.length === 0) {
        return false;
      }
      for (const cond of query.$or) {
        // If any $or condition matches, return true immediately
        if (this._matchDocument(document, cond)) {
          return true;
        }
      }
      // None of the $or conditions matched
      return false;
    }

    // 4) No logical operators or all have passed
    //    At this point, implicit fields and any $and constraints have succeeded
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

    // Use helper to detect operator objects
    if (this._isOperatorObject(queryValue)) {
      return this._matchOperators(documentValue, queryValue);
    }

    // Direct value comparison (implicit $eq)
    return this._compareValues(documentValue, queryValue, '$eq');
  }

  /**
   * Check if a value represents operator object (plain object, not Date or Array)
   * @param {*} value - Value to check
   * @returns {boolean} True if value is a plain operator object
   * @private
   */
  _isOperatorObject(value) {
    return Validate.isPlainObject(value);
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

    // Handle plain object deep equality via helper
    if (this._isDeepObject(docValue, queryValue)) {
      return this._deepObjectEqual(docValue, queryValue);
    }

    // Handle array contains operation (MongoDB style)
    // If document value is an array and query value is not, check if array contains the query value
    if (Array.isArray(docValue) && !Array.isArray(queryValue)) {
      return docValue.includes(queryValue);
    }

    // Handle array equality
    if (Array.isArray(docValue) && Array.isArray(queryValue)) {
      if (docValue.length !== queryValue.length) {
        return false;
      }
      return docValue.every((item, index) => this._equalityComparison(item, queryValue[index]));
    }

    // Standard equality
    return docValue === queryValue;
  }

  /**
   * Determine if two values are non-null plain objects (not Date or Array)
   * @param {*} val1 - First value
   * @param {*} val2 - Second value
   * @returns {boolean} True if both are plain objects for deep-equal
   * @private
   */
  _isDeepObject(val1, val2) {
    return val1 != null && val2 != null &&
      typeof val1 === 'object' && typeof val2 === 'object' &&
      !(val1 instanceof Date) && !(val2 instanceof Date) &&
      !Array.isArray(val1) && !Array.isArray(val2);
  }

  /**
   * Recursively check deep equality on plain objects
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {boolean} True if all keys and nested values are equal
   * @private
   */
  _deepObjectEqual(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    return keys1.every(key =>
      this._equalityComparison(obj1[key], obj2[key])
    );
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
   * @param {Array} documents - Documents array to validate  
   * @param {Object} query - Query object to validate
   * @throws {InvalidArgumentError} When inputs are invalid
   * @throws {InvalidQueryError} When query structure or operators are invalid
   * @private
   */
  _validateQuery(documents, query) {
    // First: Validate basic input types (fail fast)
    this._validateQueryInputs(documents, query);

    // Second: Always validate query structure for security and robustness
    this._validateQueryDepth(query, 0);
    this._validateOperators(query);
    this._validateOperatorValues(query);
  }

  /**
   * Validate basic input types for executeQuery
   * @param {Array} documents - Documents array to validate
   * @param {Object} query - Query object to validate
   * @throws {InvalidArgumentError} When inputs are invalid
   * @private
   */
  _validateQueryInputs(documents, query) {
    if (!Array.isArray(documents)) {
      throw new InvalidArgumentError('documents', documents, 'Documents parameter must be an array');
    }

    if (query === null) {
      throw new InvalidArgumentError('query', query, 'Query cannot be null');
    }
    
    if (query === undefined) {
      throw new InvalidArgumentError('query', query, 'Query cannot be undefined');
    }
    
    if (typeof query === 'string') {
      throw new InvalidArgumentError('query', query, 'Query cannot be a string');
    }
    
    if (Array.isArray(query)) {
      throw new InvalidArgumentError('query', query, 'Query cannot be an array');
    }
    
    if (typeof query !== 'object') {
      throw new InvalidArgumentError('query', query, 'Query must be a valid object');
    }
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

    try {
      Validate.object(obj, 'queryObject');
      if (!(obj instanceof Date)) {
        Object.values(obj).forEach(value => {
          this._validateQueryDepth(value, depth + 1);
        });
      }
    } catch {
      // Not a plain object, do nothing
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
    if (Validate.isPlainObject(obj)) {
      if (!(obj instanceof Date)) {
        Object.keys(obj).forEach(key => {
          if (key.startsWith('$')) {
            operators.push(key);
          }
          this._findOperators(obj[key], operators);
        });
      }
    }
    return operators;
  }

  /**
   * Validate operator values in query
   * @param {Object} query - Query object to validate
   * @throws {InvalidQueryError} When operator values are invalid
   * @private
   */
  _validateOperatorValues(query) {
    this._validateOperatorValuesRecursive(query, 0);
  }

  /**
   * Recursively validate operator values in query with depth protection
   * @param {*} obj - Object to validate
   * @param {number} depth - Current recursion depth
   * @throws {InvalidQueryError} When operator values are invalid or depth exceeds limit
   * @private
   */
  _validateOperatorValuesRecursive(obj, depth) {
    // Prevent excessive recursion depth
    if (depth > this._config.maxNestedDepth) {
      throw new InvalidQueryError(`Operator validation depth exceeds maximum of ${this._config.maxNestedDepth}`);
    }

    try {
      Validate.validateObject(obj, 'queryObject');
      if (!(obj instanceof Date)) {
        Object.keys(obj).forEach(key => {
          if (key === '$and' || key === '$or') {
            // Logical operators must have array values
            if (!Array.isArray(obj[key])) {
              throw new InvalidQueryError(`${key} operator requires an array of conditions`);
            }
            // Recursively validate each condition in the array
            obj[key].forEach(condition => {
              this._validateOperatorValuesRecursive(condition, depth + 1);
            });
          } else if (key.startsWith('$')) {
            // Other operators - can add specific validation here as needed
            // For now, just recursively validate the value
            this._validateOperatorValuesRecursive(obj[key], depth + 1);
          } else {
            // Regular field - validate its value
            this._validateOperatorValuesRecursive(obj[key], depth + 1);
          }
        });
      }
    } catch (e) {
      // Only ignore validation errors for non-objects, re-throw query errors
      if (e instanceof InvalidQueryError) {
        throw e;
      }
      // Not a plain object, do nothing
    }
  }


}
