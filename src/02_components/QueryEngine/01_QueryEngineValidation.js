/**
 * 01_QueryEngineValidation.js - Validation utilities for QueryEngine queries.
 */
/* exported QueryEngineValidation */
/**
 * Validates query inputs, operator usage, and nesting depth for QueryEngine.
 */
class QueryEngineValidation {
  /**
   * Create a new validation helper.
   * @param {QueryEngine} engine - Parent query engine facade.
   */
  constructor(engine) {
    this._engine = engine;
    this._logger = engine.getLogger();
  }

  /**
   * Validate query inputs and structure in a single traversal.
   * @param {Array<*>} documents - Documents array supplied to executeQuery.
   * @param {*} query - Query object to validate.
   */
  validateQuery(documents, query) {
    this.validateQueryInputs(documents, query);
    this._validateNode(query, 0);
  }

  /**
   * Validate documents array and query root type.
   * @param {Array<*>} documents - Documents array supplied to executeQuery.
   * @param {*} query - Query object to validate.
   * @throws {InvalidArgumentError} When inputs are malformed.
   */
  validateQueryInputs(documents, query) {
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
   * Determine whether a key is an operator identifier.
   * @param {string} key - Key to inspect.
   * @returns {boolean} True when the key denotes an operator.
   */
  isOperatorKey(key) {
    return typeof key === 'string' && key.startsWith('$');
  }

  /**
   * Recursively validate query structure, operators, and depth.
   * @param {*} node - Query node to inspect.
   * @param {number} depth - Current traversal depth.
   * @throws {InvalidQueryError} When validation fails.
   * @private
   */
  _validateNode(node, depth) {
    const { maxNestedDepth } = this._engine.getConfig();

    if (depth > maxNestedDepth) {
      throw new InvalidQueryError(`Query nesting exceeds maximum depth of ${maxNestedDepth}`);
    }

    if (Array.isArray(node)) {
      node.forEach(element => {
        if (Validate.isPlainObject(element) || Array.isArray(element)) {
          this._validateNode(element, depth + 1);
        }
      });
      return;
    }

    if (!Validate.isPlainObject(node)) {
      return;
    }

    Object.keys(node).forEach(key => {
      const value = node[key];

      if (this.isOperatorKey(key)) {
        this._assertSupportedOperator(key);

        if (this._engine.isLogicalOperator(key)) {
          this._validateLogicalOperatorValue(key, value, depth);
        } else {
          this._validateOperatorOperand(value, depth);
        }
        return;
      }

      if (Validate.isPlainObject(value)) {
        this._validateNode(value, depth + 1);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(element => {
          if (Validate.isPlainObject(element) || Array.isArray(element)) {
            this._validateNode(element, depth + 1);
          }
        });
      }
    });
  }

  /**
   * Validate operands for logical operators.
   * @param {string} operator - Logical operator name.
   * @param {*} value - Operator operand value.
   * @param {number} depth - Current traversal depth.
   * @throws {InvalidQueryError} When operand is not an array of query objects.
   * @private
   */
  _validateLogicalOperatorValue(operator, value, depth) {
    if (!Array.isArray(value)) {
      throw new InvalidQueryError(`${operator} operator requires an array of conditions`);
    }

    value.forEach(condition => {
      if (!Validate.isPlainObject(condition)) {
        throw new InvalidQueryError(`${operator} operator requires condition objects`);
      }
      this._validateNode(condition, depth + 1);
    });
  }

  /**
   * Validate operands for comparison operators and recurse into objects when necessary.
   * @param {*} value - Operator operand value.
   * @param {number} depth - Current traversal depth.
   * @private
   */
  _validateOperatorOperand(value, depth) {
    if (Validate.isPlainObject(value)) {
      this._validateNode(value, depth + 1);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(element => {
        if (Validate.isPlainObject(element) || Array.isArray(element)) {
          this._validateNode(element, depth + 1);
        }
      });
    }
  }

  /**
   * Ensure an operator is supported by the engine configuration.
   * @param {string} operator - Operator name to validate.
   * @throws {InvalidQueryError} When operator is not supported.
   * @private
   */
  _assertSupportedOperator(operator) {
    if (!this._engine.isOperatorSupported(operator)) {
      throw new InvalidQueryError(`Unsupported operator: ${operator}`);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QueryEngineValidation };
}
