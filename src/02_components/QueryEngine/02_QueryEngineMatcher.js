/**
 * 02_QueryEngineMatcher.js - Document matching operations for QueryEngine.
 */
/* exported QueryEngineMatcher */
/**
 * Provides MongoDB-style document matching semantics for QueryEngine.
 */
class QueryEngineMatcher {
  /**
   * Create a new matcher helper.
   * @param {QueryEngine} engine - Parent query engine facade.
   */
  constructor(engine) {
    this._engine = engine;
    this._logger = engine.getLogger();
  }

  /**
   * Filter documents using a validated query document.
   * @param {Array<Object>} documents - Documents to evaluate.
   * @param {Object} query - MongoDB-compatible query.
   * @returns {Array<Object>} Matching documents.
   */
  filterDocuments(documents, query) {
    return documents.filter(document => this._matchDocument(document, query));
  }

  /**
   * Determine if a document satisfies the query expression.
   * @param {Object} document - Document under evaluation.
   * @param {Object} query - Query expression to satisfy.
   * @returns {boolean} True when the document matches.
   * @private
   */
  _matchDocument(document, query) {
    const keys = Object.keys(query);

    for (const key of keys) {
      if (!this._engine.isLogicalOperator(key)) {
        if (!this._matchField(document, key, query[key])) {
          return false;
        }
      }
    }

    if (query.$and !== undefined) {
      if (query.$and.length === 0) {
        return true;
      }

      for (const condition of query.$and) {
        if (!this._matchDocument(document, condition)) {
          return false;
        }
      }
    }

    if (query.$or !== undefined) {
      if (query.$or.length === 0) {
        return false;
      }

      for (const condition of query.$or) {
        if (this._matchDocument(document, condition)) {
          return true;
        }
      }

      return false;
    }

    return true;
  }

  /**
   * Match a single field expression against a document.
   * @param {Object} document - Document under evaluation.
   * @param {string} fieldPath - Field path using dot notation.
   * @param {*} queryValue - Field comparator or operator document.
   * @returns {boolean} True when the field satisfies the expression.
   * @private
   */
  _matchField(document, fieldPath, queryValue) {
    const documentValue = this._engine.getFieldValue(document, fieldPath);

    if (this._isOperatorObject(queryValue)) {
      return this._matchOperators(documentValue, queryValue);
    }

    return ComparisonUtils.equals(documentValue, queryValue, { arrayContainsScalar: true });
  }

  /**
   * Determine whether a value should be treated as an operator definition.
   * @param {*} value - Value to inspect.
   * @returns {boolean} True when value is an operator document.
   * @private
   */
  _isOperatorObject(value) {
    return Validate.isPlainObject(value);
  }

  /**
   * Evaluate comparison operators for a field value.
   * @param {*} documentValue - Value from the document.
   * @param {Object} operators - Operators to apply.
   * @returns {boolean} True when all operators match.
   * @private
   */
  _matchOperators(documentValue, operators) {
    return Object.keys(operators).every(operator => {
      if (!this._engine.isOperatorSupported(operator)) {
        throw new InvalidQueryError(`Unsupported operator: ${operator}`);
      }

      switch (operator) {
        case '$and':
        case '$or':
          return true;
        case '$eq':
          return ComparisonUtils.equals(documentValue, operators[operator], { arrayContainsScalar: true });
        case '$gt':
          return ComparisonUtils.compareOrdering(documentValue, operators[operator]) > 0;
        case '$lt':
          return ComparisonUtils.compareOrdering(documentValue, operators[operator]) < 0;
        default:
          throw new InvalidQueryError(`Unsupported operator: ${operator}`);
      }
    });
  }

  /**
   * Legacy comparison helper retained for compatibility with existing tests.
   * @param {*} documentValue - Value from document.
   * @param {*} queryValue - Value from query.
   * @param {string} operator - Operator name.
   * @returns {boolean} Result of comparison.
   * @private
   */
  _compareValues(documentValue, queryValue, operator) {
    switch (operator) {
      case '$eq':
        return ComparisonUtils.equals(documentValue, queryValue, { arrayContainsScalar: true });
      case '$gt':
        return ComparisonUtils.compareOrdering(documentValue, queryValue) > 0;
      case '$lt':
        return ComparisonUtils.compareOrdering(documentValue, queryValue) < 0;
      default:
        throw new InvalidQueryError(`Unsupported operator: ${operator}`);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QueryEngineMatcher };
}
