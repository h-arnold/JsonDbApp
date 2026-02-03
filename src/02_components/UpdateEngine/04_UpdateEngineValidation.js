/**
 * 04_UpdateEngineValidation.js - Shared validation helpers for UpdateEngine
 */
/* exported UpdateEngineValidation */
/**
 * Centralises input validation for UpdateEngine operations.
 */
class UpdateEngineValidation {
  /**
   * Create a validation helper bound to the UpdateEngine facade.
   * @param {UpdateEngine} engine - Parent update engine facade
   */
  constructor(engine) {
    this._engine = engine;
  }

  /**
   * Validate inputs for applyOperators method
   * @param {Object} document - Document to validate
   * @param {Object} updateOps - Update operations to validate
   */
  validateApplyOperatorsInputs(document, updateOps) {
    if (!document || typeof document !== 'object') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('document', document, 'Document must be an object');
    }

    if (!updateOps || typeof updateOps !== 'object') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('updateOps', updateOps, 'Update operations must be an object');
    }
  }

  /**
   * Validate that operations object is not empty
   * @param {Object} ops - Operations object to validate
   * @param {string} operatorName - Operator name for error reporting
   */
  validateOperationsNotEmpty(ops, operatorName) {
    if (!ops || typeof ops !== 'object' || Object.keys(ops).length === 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY('operations', ops, `${operatorName} operator requires at least one field operation`);
    }
  }

  /**
   * Validate that the update operations object contains at least one operator
   * @param {Object} updateOps - Update operations object to validate
   */
  validateUpdateOperationsNotEmpty(updateOps) {
    const operators = Object.keys(updateOps);
    if (operators.length === 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY('updateOps', updateOps, 'Update operations must contain at least one operator');
    }
  }

  /**
   * Validate that a value is numeric for arithmetic operations
   * @param {*} value - Value to validate
   * @param {string} fieldPath - Field path for error reporting
   * @param {string} operation - Operation name for error reporting
   */
  validateNumericValue(value, fieldPath, operation) {
    if (typeof value !== 'number') {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(fieldPath, value, `${operation} operation requires a numeric value`);
    }
  }

  /**
   * Validate that a value is an array for array operations
   * @param {*} value - Value to validate
   * @param {string} fieldPath - Field path for error reporting
   * @param {string} operation - Operation name for error reporting
   */
  validateArrayValue(value, fieldPath, operation) {
    if (!Array.isArray(value)) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(fieldPath, value, `${operation} operation requires an array value`);
    }
  }

  /**
   * Validate that a current field value is numeric for arithmetic operations
   * @param {*} value - Current field value to validate
   * @param {string} fieldPath - Field path for error reporting
   * @param {string} operation - Operation name for error reporting
   */
  validateCurrentFieldNumeric(value, fieldPath, operation) {
    if (typeof value !== 'number') {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(fieldPath, value, `${operation} operation requires current field value to be numeric`);
    }
  }

  /**
   * Validate that two values can be compared (same primitive type or both Dates)
   * @param {*} currentValue - Current field value
   * @param {*} newValue - New value to compare
   * @param {string} fieldPath - Field path for error reporting
   * @param {string} operation - Operation name for error reporting
   */
  validateComparableValues(currentValue, newValue, fieldPath, operation) {
    const currentType = typeof currentValue;
    const newType = typeof newValue;

    if (currentType !== newType) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(
        fieldPath,
        { currentValue, newValue },
        `${operation} operation requires comparable values of the same type`
      );
    }

    if (currentType === 'object') {
      const currentComparableType = this._resolveComparableObjectType(currentValue);
      const newComparableType = this._resolveComparableObjectType(newValue);

      if (currentComparableType !== newComparableType) {
        throw new ErrorHandler.ErrorTypes.INVALID_QUERY(
          fieldPath,
          { currentValue, newValue },
          `${operation} operation cannot compare objects or arrays`
        );
      }

      if (currentComparableType === 'plain') {
        throw new ErrorHandler.ErrorTypes.INVALID_QUERY(
          fieldPath,
          { currentValue, newValue },
          `${operation} operation cannot compare objects or arrays`
        );
      }
    }
  }

  /**
   * Identify whether an object value is comparable (Date) or a plain/array object.
   * @private
   * @param {*} value - Value to classify
   * @returns {'date'|'plain'|null} Comparable category or null for nullish values
   */
  _resolveComparableObjectType(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return 'date';
    }

    if (Array.isArray(value)) {
      return 'plain';
    }

    if (typeof value === 'object') {
      return 'plain';
    }

    return null;
  }

  /**
   * Determine whether a field path targets an immutable root field such as _id.
   * @param {string} fieldPath - Dot notation path of the field
   * @returns {boolean} True if the root segment is immutable
   */
  isImmutableField(fieldPath) {
    if (!fieldPath || typeof fieldPath !== 'string') {
      return false;
    }
    const root = fieldPath.split('.')[0];
    return root === '_id';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateEngineValidation };
}
