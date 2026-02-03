/**
 * 99_QueryEngine.js - Facade composing validation and matching helpers.
 */
/* exported QueryEngine */
/**
 * Evaluates MongoDB-style query documents against in-memory collections,
 * handling operator validation, dot-notation traversal, and logical
 * composition.
 */
const DEFAULT_MAX_NESTED_DEPTH = 10;
const DEFAULT_SUPPORTED_OPERATORS = Object.freeze(['$eq', '$gt', '$lt', '$and', '$or']);
const LOGICAL_OPERATORS = Object.freeze(['$and', '$or']);

/**
 * Query engine facade orchestrating validation and matching helpers.
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
    this._logger = JDbLogger.createComponentLogger('QueryEngine');
    this._config = this._buildConfig(config);

    this._supportedOperators = new Set(this._config.supportedOperators);
    this._logicalOperators = new Set(LOGICAL_OPERATORS.filter(operator => this._supportedOperators.has(operator)));

    this._initialiseFieldPathResources(config);

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

  /**
   * Build validated configuration object from raw input.
   * @param {Object} rawConfig - Raw configuration input.
   * @returns {{supportedOperators: string[], maxNestedDepth: number}} Normalised configuration.
   * @private
   */
  _buildConfig(rawConfig) {
    this._assertConfigShape(rawConfig);
    const config = rawConfig || {};

    const supportedOperators = this._normaliseSupportedOperators(config.supportedOperators);
    const maxNestedDepth = this._normaliseMaxNestedDepth(config.maxNestedDepth);

    return { supportedOperators, maxNestedDepth };
  }

  /**
   * Ensure configuration argument is an object when provided.
   * @param {*} config - Configuration candidate.
   * @private
   */
  _assertConfigShape(config) {
    if (config !== null && config !== undefined && typeof config !== 'object') {
      throw new InvalidArgumentError('config', config, 'QueryEngine configuration must be an object or undefined');
    }
  }

  /**
   * Normalise supported operator declarations.
   * @param {string[]} [providedOperators] - Optional custom operator list.
   * @returns {string[]} Validated operator list.
   * @private
   */
  _normaliseSupportedOperators(providedOperators) {
    const operators = Array.isArray(providedOperators) && providedOperators.length > 0
      ? providedOperators.slice()
      : Array.from(DEFAULT_SUPPORTED_OPERATORS);

    operators.forEach(operator => {
      if (typeof operator !== 'string' || operator.trim() === '') {
        throw new InvalidArgumentError('supportedOperators', operator, 'Operator names must be non-empty strings');
      }
    });

    return operators;
  }

  /**
   * Normalise maximum nesting depth.
   * @param {number} providedDepth - Optional depth override.
   * @returns {number} Sanitised maximum depth.
   * @private
   */
  _normaliseMaxNestedDepth(providedDepth) {
    const depth = providedDepth === undefined ? DEFAULT_MAX_NESTED_DEPTH : providedDepth;
    Validate.integer(depth, 'config.maxNestedDepth');
    if (depth < 0) {
      throw new InvalidArgumentError('config.maxNestedDepth', depth, 'must be zero or greater');
    }
    return depth;
  }

  /**
   * Prepare field-path utilities and cache resources.
   * @param {Object} config - User configuration input.
   * @private
   */
  _initialiseFieldPathResources(config) {
    const candidateConfig = config || {};
    this._fieldPathCache = candidateConfig.fieldPathCache instanceof Map ? candidateConfig.fieldPathCache : new Map();
    this._fieldPathUtils = candidateConfig.fieldPathUtils instanceof FieldPathUtils
      ? candidateConfig.fieldPathUtils
      : new FieldPathUtils({ cache: this._fieldPathCache });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QueryEngine };
}
