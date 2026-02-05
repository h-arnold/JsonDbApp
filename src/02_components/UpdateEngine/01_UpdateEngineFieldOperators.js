/**
 * 01_UpdateEngineFieldOperators.js - Handles field update operators ($set, $inc, $mul, $min, $max, $unset)
 */
/* exported UpdateEngineFieldOperators */
/**
 * Groups MongoDB-style field update operators for the UpdateEngine facade.
 */
class UpdateEngineFieldOperators {
  /**
   * Create a new field operator handler.
   * @param {UpdateEngine} engine - Parent update engine facade
   */
  constructor(engine) {
    this._engine = engine;
    this._logger = engine.getLogger();
    this._validation = engine.getValidation();
    this._fieldPaths = engine.getFieldPathAccess();
  }

  /**
   * Apply $set operator - sets field values
   * @param {Object} document - Document to modify
   * @param {Object} ops - Set operations
   * @returns {Object} Modified document
   */
  applySet(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$set');

    for (const fieldPath in ops) {
      if (this._validation.isImmutableField(fieldPath)) {
        this._logger.debug('Skipping immutable field update', { fieldPath });
        continue;
      }
      this._fieldPaths.setValue(document, fieldPath, ops[fieldPath]);
    }

    return document;
  }

  /**
   * Increment numeric fields by specified amounts.
   * @param {Object} document - The document being modified.
   * @param {Object} ops - An object mapping field paths to increment values.
   * @returns {Object} The updated document instance.
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} If any target field or increment value is non-numeric.
   */
  applyInc(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$inc');
    this._applyArithmeticOperator(document, ops, '$inc', (base, operand) => base + operand);
    return document;
  }

  /**
   * Multiply numeric fields by specified factors.
   * @param {Object} document - The document being modified.
   * @param {Object} ops - An object mapping field paths to multiplication factors.
   * @returns {Object} The updated document instance.
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} If any target field or factor is non-numeric.
   */
  applyMul(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$mul');
    this._applyArithmeticOperator(document, ops, '$mul', (base, operand) => base * operand);
    return document;
  }

  /**
   * Set fields to the minimum of current and provided values.
   * Only updates when the new value is less than existing.
   * @param {Object} document - The document being modified.
   * @param {Object} ops - An object mapping field paths to minimum values.
   * @returns {Object} The updated document instance.
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} If comparison between values is invalid.
   */
  applyMin(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$min');
    this._applyComparisonOperator(document, ops, '$min', (current, candidate) => candidate < current);
    return document;
  }

  /**
   * Set fields to the maximum of current and provided values.
   * Only updates when the new value is greater than existing.
   * @param {Object} document - The document being modified.
   * @param {Object} ops - An object mapping field paths to maximum values.
   * @returns {Object} The updated document instance.
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} If comparison between values is invalid.
   */
  applyMax(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$max');
    this._applyComparisonOperator(document, ops, '$max', (current, candidate) => candidate > current);
    return document;
  }

  /**
   * Remove specified fields or nested elements.
   * @param {Object} document - The document being modified.
   * @param {Object} ops - An object mapping field paths to unset flags.
   * @returns {Object} The updated document instance with fields removed.
   */
  applyUnset(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$unset');

    for (const fieldPath in ops) {
      this._fieldPaths.unsetValue(document, fieldPath);
    }

    return document;
  }

  /**
   * Apply an arithmetic operation ($inc, $mul) to numeric fields.
   * @private
   * @param {Object} document - Document to modify
   * @param {Object} ops - Operations mapping field paths to operands
   * @param {string} operation - Operation name for error reporting
   * @param {Function} computeFn - Function (base, operand) => result
   */
  _applyArithmeticOperator(document, ops, operation, computeFn) {
    for (const fieldPath in ops) {
      const currentValue = this._fieldPaths.getValue(document, fieldPath);
      const operandValue = ops[fieldPath];

      this._validation.validateNumericValue(operandValue, fieldPath, operation);

      if (currentValue !== undefined) {
        this._validation.validateCurrentFieldNumeric(currentValue, fieldPath, operation);
      }

      const baseValue = currentValue !== undefined ? currentValue : 0;
      const newValue = computeFn(baseValue, operandValue);

      this._fieldPaths.setValue(document, fieldPath, newValue);
    }
  }

  /**
   * Apply a comparison operation ($min, $max) to fields.
   * @private
   * @param {Object} document - Document to modify
   * @param {Object} ops - Operations mapping field paths to candidate values
   * @param {string} operation - Operation name for error reporting
   * @param {Function} shouldUpdateFn - Function (current, candidate) => boolean
   */
  _applyComparisonOperator(document, ops, operation, shouldUpdateFn) {
    for (const fieldPath in ops) {
      const currentValue = this._fieldPaths.getValue(document, fieldPath);
      const candidateValue = ops[fieldPath];

      if (currentValue !== undefined) {
        this._validation.validateComparableValues(currentValue, candidateValue, fieldPath, operation);
      }

      if (currentValue === undefined || shouldUpdateFn(currentValue, candidateValue)) {
        this._fieldPaths.setValue(document, fieldPath, candidateValue);
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateEngineFieldOperators };
}
