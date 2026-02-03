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

    for (const fieldPath in ops) {
      const currentValue = this._fieldPaths.getValue(document, fieldPath);
      const incrementValue = ops[fieldPath];

      this._validation.validateNumericValue(incrementValue, fieldPath, '$inc');

      if (currentValue !== undefined) {
        this._validation.validateCurrentFieldNumeric(currentValue, fieldPath, '$inc');
      }

      const baseValue = currentValue !== undefined ? currentValue : 0;
      const newValue = baseValue + incrementValue;

      this._fieldPaths.setValue(document, fieldPath, newValue);
    }

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

    for (const fieldPath in ops) {
      const currentValue = this._fieldPaths.getValue(document, fieldPath);
      const multiplyValue = ops[fieldPath];

      this._validation.validateNumericValue(multiplyValue, fieldPath, '$mul');

      if (currentValue !== undefined) {
        this._validation.validateCurrentFieldNumeric(currentValue, fieldPath, '$mul');
      }

      const baseValue = currentValue !== undefined ? currentValue : 0;
      const newValue = baseValue * multiplyValue;

      this._fieldPaths.setValue(document, fieldPath, newValue);
    }

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

    for (const fieldPath in ops) {
      const currentValue = this._fieldPaths.getValue(document, fieldPath);
      const minValue = ops[fieldPath];

      if (currentValue === undefined || minValue < currentValue) {
        this._fieldPaths.setValue(document, fieldPath, minValue);
      } else if (currentValue !== undefined) {
        this._validation.validateComparableValues(currentValue, minValue, fieldPath, '$min');
      }
    }

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

    for (const fieldPath in ops) {
      const currentValue = this._fieldPaths.getValue(document, fieldPath);
      const maxValue = ops[fieldPath];

      if (currentValue === undefined || maxValue > currentValue) {
        this._fieldPaths.setValue(document, fieldPath, maxValue);
      } else if (currentValue !== undefined) {
        this._validation.validateComparableValues(currentValue, maxValue, fieldPath, '$max');
      }
    }

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
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateEngineFieldOperators };
}
