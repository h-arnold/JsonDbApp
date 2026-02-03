/**
 * 99_QueryEngine.js - Facade composing validation and matching helpers.
 */
/* exported QueryEngine */
/**
 * Evaluates MongoDB-style query documents against in-memory collections,
 * handling operator validation, dot-notation traversal, and logical
 * composition.
 */
class QueryEngine {
  /**
   * Create a new QueryEngine instance.
   * @param {Object} [config] - Optional configuration overrides.
   * @param {number} [config.maxNestedDepth=10] - Maximum allowed query depth.
   * @param {string[]} [config.supportedOperators] - Operators permitted by the engine.
   * @param {Map<string, readonly string[]>} [config.fieldPathCache] - Shared cache for field path segments.
   * @param {FieldPathUtils} [config.fieldPathUtils] - Shared FieldPathUtils instance.
   */
  constructor(config = {}) {
    if (config !== null && config !== undefined && typeof config !== 'object') {
      throw new InvalidArgumentError('config', config, 'QueryEngine configuration must be an object or undefined');
    }

    const defaultOperators = ['$eq', '$gt', '$lt', '$and', '$or'];
    const supportedOperators = Array.isArray(config.supportedOperators) && config.supportedOperators.length > 0
      ? config.supportedOperators.slice()
      : defaultOperators;

    supportedOperators.forEach(operator => {
      if (typeof operator !== 'string' || operator.trim() === '') {
        throw new InvalidArgumentError('supportedOperators', operator, 'Operator names must be non-empty strings');
      }
    });

    const maxNestedDepth = config.maxNestedDepth === undefined ? 10 : config.maxNestedDepth;
    Validate.integer(maxNestedDepth, 'config.maxNestedDepth');
    if (maxNestedDepth < 0) {
      throw new InvalidArgumentError('config.maxNestedDepth', maxNestedDepth, 'must be zero or greater');
    }

    this._logger = JDbLogger.createComponentLogger('QueryEngine');
    this._config = {
      supportedOperators,
      maxNestedDepth
    };

    this._supportedOperators = new Set(this._config.supportedOperators);
    this._logicalOperators = new Set(['$and', '$or'].filter(operator => this._supportedOperators.has(operator)));
    this._fieldPathCache = config.fieldPathCache instanceof Map ? config.fieldPathCache : new Map();
    this._fieldPathUtils = config.fieldPathUtils instanceof FieldPathUtils
      ? config.fieldPathUtils
      : new FieldPathUtils({ cache: this._fieldPathCache });

    this._validation = new QueryEngineValidation(this);
    this._matcher = new QueryEngineMatcher(this);

    this._logger.debug('QueryEngine initialised', { config: this._config });
  }

  /**
   * Execute a validated query against the provided documents.
   * @param {Array<Object>} documents - Documents to filter.
   * @param {Object} query - MongoDB-compatible query object.
   * @returns {Array<Object>} Matching documents.
   */
  executeQuery(documents, query) {
    this._validation.validateQuery(documents, query);

    this._logger.debug('Executing query', {
      documentCount: documents.length,
      query: JSON.stringify(query)
    });

    if (Object.keys(query).length === 0) {
      return documents.slice();
    }

    const results = this._matcher.filterDocuments(documents, query);

    this._logger.debug('Query execution complete', {
      resultCount: results.length
    });

    return results;
  }

  /**
   * Retrieve the component logger.
   * @returns {JDbLogger} Component logger instance.
   */
  getLogger() {
    return this._logger;
  }

  /**
   * Retrieve immutable engine configuration.
   * @returns {{supportedOperators: string[], maxNestedDepth: number}} Engine configuration.
   */
  getConfig() {
    return this._config;
  }

  /**
   * Determine whether an operator is logical ($and/$or) and enabled.
   * @param {string} operator - Operator to inspect.
   * @returns {boolean} True when operator is an enabled logical operator.
   */
  isLogicalOperator(operator) {
    return this._logicalOperators.has(operator);
  }

  /**
   * Determine whether an operator is supported by the engine.
   * @param {string} operator - Operator to inspect.
   * @returns {boolean} True when the operator is supported.
   */
  isOperatorSupported(operator) {
    return this._supportedOperators.has(operator);
  }

  /**
   * Access the validation helper for advanced scenarios.
   * @returns {QueryEngineValidation} Validation helper instance.
   */
  getValidation() {
    return this._validation;
  }

  /**
   * Retrieve the FieldPathUtils instance used for traversal.
   * @returns {FieldPathUtils} Field path helper instance.
   */
  getFieldPathUtils() {
    return this._fieldPathUtils;
  }

  /**
   * Read a field from a document using FieldPathUtils safeguards.
   * @param {Object} document - Document under inspection.
   * @param {string} fieldPath - Dot-notation field path.
   * @returns {*} Retrieved value or undefined when absent.
   */
  getFieldValue(document, fieldPath) {
    if (typeof fieldPath !== 'string' || fieldPath.trim() === '') {
      return undefined;
    }

    return this._fieldPathUtils.getValue(document, fieldPath);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QueryEngine };
}
