/**
 * 99_UpdateEngine.js - Document update engine facade
 */
/* exported UpdateEngine */
/**
 * Facade coordinating UpdateEngine operator handlers and shared utilities.
 */
class UpdateEngine {
  /**
   * Instantiate the UpdateEngine facade with optional shared resources.
   * @param {Object} [options] - Optional configuration for the UpdateEngine
   * @param {Map<string, readonly string[]>} [options.fieldPathCache] - Injected cache for field-path segments
   */
  constructor(options = {}) {
    const { fieldPathCache } = options;

    this._logger = JDbLogger.createComponentLogger('UpdateEngine');
    this._fieldPathCache = fieldPathCache instanceof Map ? fieldPathCache : new Map();

    this._fieldPathUtils = new FieldPathUtils({ cache: this._fieldPathCache });
    this._fieldPathAccess = new UpdateEngineFieldPathAccess(this, this._fieldPathUtils);
    this._validation = new UpdateEngineValidation(this);
    this._fieldOps = new UpdateEngineFieldOperators(this);
    this._arrayOps = new UpdateEngineArrayOperators(this);

    this._operatorHandlers = {
      '$set': this._fieldOps.applySet.bind(this._fieldOps),
      '$inc': this._fieldOps.applyInc.bind(this._fieldOps),
      '$mul': this._fieldOps.applyMul.bind(this._fieldOps),
      '$min': this._fieldOps.applyMin.bind(this._fieldOps),
      '$max': this._fieldOps.applyMax.bind(this._fieldOps),
      '$unset': this._fieldOps.applyUnset.bind(this._fieldOps),
      '$push': this._arrayOps.applyPush.bind(this._arrayOps),
      '$pull': this._arrayOps.applyPull.bind(this._arrayOps),
      '$addToSet': this._arrayOps.applyAddToSet.bind(this._arrayOps)
    };
  }

  /**
   * Apply MongoDB-style update operators to a document
   * @param {Object} document - The document to modify
   * @param {Object} updateOps - Update operations object
   * @returns {Object} Updated document
   */
  applyOperators(document, updateOps) {
    this._validation.validateApplyOperatorsInputs(document, updateOps);
    this._validation.validateUpdateOperationsNotEmpty(updateOps);

    let workingDocument = null;

    for (const operator in updateOps) {
      const handler = this._operatorHandlers[operator];
      if (!handler) {
        throw new ErrorHandler.ErrorTypes.INVALID_QUERY('operator', operator, `Unsupported update operator: ${operator}`);
      }

      if (workingDocument === null) {
        workingDocument = ObjectUtils.deepClone(document);
      }

      this._logger.debug(`Applying operator ${operator}`, { fields: Object.keys(updateOps[operator] || {}) });
      workingDocument = handler(workingDocument, updateOps[operator]);
    }

    if (workingDocument === null) {
      return ObjectUtils.deepClone(document);
    }

    return workingDocument;
  }

  /**
   * Retrieve the component logger instance.
   * @returns {JDbLogger} Component logger instance
   */
  getLogger() {
    return this._logger;
  }

  /**
   * Provide the validation helper instance.
   * @returns {UpdateEngineValidation} Validation helper instance
   */
  getValidation() {
    return this._validation;
  }

  /**
   * Expose the field-path helper for operator handlers.
   * @returns {UpdateEngineFieldPathAccess} Field-path helper
   */
  getFieldPathAccess() {
    return this._fieldPathAccess;
  }

  /**
   * Return the field-path utility instance.
   * @returns {FieldPathUtils} Field-path utility instance
   */
  getFieldPathUtils() {
    return this._fieldPathUtils;
  }

  /**
   * Provide access to the field-path segment cache used for memoisation.
   * @returns {Map<string, readonly string[]>} Field-path segment cache
   */
  getFieldPathCache() {
    return this._fieldPathCache;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateEngine };
}
