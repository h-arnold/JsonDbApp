/**
 * 02_QueryEngineMatcher.js - Document matching operations for QueryEngine.
 */
/* exported QueryEngineMatcher */

/**
 * Compare using equality semantics with scalar-aware array handling.
 * @param {*} documentValue - Value from the evaluated document.
 * @param {*} operand - Operand provided in the query.
 * @returns {boolean} True when values are considered equal.
 */
function evaluateEquality(documentValue, operand) {
  return ComparisonUtils.equals(documentValue, operand, { arrayContainsScalar: true });
}

/**
 * Determine whether a document value is greater than the operand.
 * @param {*} documentValue - Value from the evaluated document.
 * @param {*} operand - Operand provided in the query.
 * @returns {boolean} True when the document value is greater.
 */
function evaluateGreaterThan(documentValue, operand) {
  return ComparisonUtils.compareOrdering(documentValue, operand) > 0;
}

/**
 * Determine whether a document value is less than the operand.
 * @param {*} documentValue - Value from the evaluated document.
 * @param {*} operand - Operand provided in the query.
 * @returns {boolean} True when the document value is less.
 */
function evaluateLessThan(documentValue, operand) {
  return ComparisonUtils.compareOrdering(documentValue, operand) < 0;
}

/**
 * Maps comparison operator names to evaluator functions.
 * @type {Object<string, function(*, *): boolean>}
 */
const COMPARISON_EVALUATORS = {
  '$eq': evaluateEquality,
  '$gt': evaluateGreaterThan,
  '$lt': evaluateLessThan
};

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
    if (!this._matchImplicitFields(document, query)) {
      return false;
    }

    if (!this._matchAndClauses(document, query)) {
      return false;
    }

    return this._matchOrClauses(document, query);
  }

  /**
   * Match non-logical field expressions against a document.
   * @param {Object} document - Document under evaluation.
   * @param {Object} query - Query containing field expressions.
   * @returns {boolean} True when all implicit fields match.
   * @private
   */
  _matchImplicitFields(document, query) {
    for (const key of Object.keys(query)) {
      if (!this._engine.isLogicalOperator(key) && !this._matchField(document, key, query[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate $and clauses against the document.
   * @param {Object} document - Document under evaluation.
   * @param {Object} query - Query containing optional $and array.
   * @returns {boolean} True when all $and clauses match or none provided.
   * @private
   */
  _matchAndClauses(document, query) {
    if (query.$and === undefined) {
      return true;
    }

    const clauses = query.$and;
    if (clauses.length === 0) {
      return true;
    }

    return clauses.every(condition => this._matchDocument(document, condition));
  }

  /**
   * Evaluate $or clauses against the document.
   * @param {Object} document - Document under evaluation.
   * @param {Object} query - Query containing optional $or array.
   * @returns {boolean} True when at least one clause matches or none provided.
   * @private
   */
  _matchOrClauses(document, query) {
    if (query.$or === undefined) {
      return true;
    }

    const clauses = query.$or;
    if (clauses.length === 0) {
      return false;
    }

    return clauses.some(condition => this._matchDocument(document, condition));
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
    return Object.keys(operators).every(operator => this._evaluateOperator(documentValue, operator, operators[operator]));
  }

  /**
   * Evaluate a single operator against the document value.
   * @param {*} documentValue - Value from the document.
   * @param {string} operator - Operator to apply.
   * @param {*} operand - Operator operand value.
   * @returns {boolean} True when the operator condition is satisfied.
   * @private
   */
  _evaluateOperator(documentValue, operator, operand) {
    if (!this._engine.isOperatorSupported(operator)) {
      throw new InvalidQueryError(`Unsupported operator: ${operator}`);
    }

    if (this._engine.isLogicalOperator(operator)) {
      return true;
    }

    const evaluator = COMPARISON_EVALUATORS[operator];
    if (!evaluator) {
      throw new InvalidQueryError(`Unsupported operator: ${operator}`);
    }

    return evaluator(documentValue, operand);
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
