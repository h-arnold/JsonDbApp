/**
 * UpdateEngine.js - Document update engine for MongoDB-style update operators
 *
 * Section 7: Update Engine Implementation (Green Phase)
 */
class UpdateEngine {
  /**
   * Creates a new UpdateEngine instance
   */
  constructor() {
    this._logger = GASDBLogger.createComponentLogger('UpdateEngine');
    
    // Map of supported operators to their handler methods
    this._operatorHandlers = {
      '$set': this._applySet.bind(this),
      '$inc': this._applyInc.bind(this),
      '$mul': this._applyMul.bind(this),
      '$min': this._applyMin.bind(this),
      '$max': this._applyMax.bind(this),
      '$unset': this._applyUnset.bind(this),
      '$push': this._applyPush.bind(this),
      '$pull': this._applyPull.bind(this),
      '$addToSet': this._applyAddToSet.bind(this)
    };
  }

  /**
   * Apply MongoDB-style update operators to a document
   * @param {Object} document - The document to modify
   * @param {Object} updateOps - Update operations object
   * @returns {Object} Updated document
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When operators are invalid
   */
  applyOperators(document, updateOps) {
    this._validateApplyOperatorsInputs(document, updateOps);
    
    // Create a deep copy of the document to avoid modifying the original
    let result = ObjectUtils.deepClone(document);
    
    // Apply each operator
    for (const operator in updateOps) {
      if (!this._operatorHandlers[operator]) {
        throw new ErrorHandler.ErrorTypes.INVALID_QUERY('operator', operator, `Unsupported update operator: ${operator}`);
      }
      
      this._logger.debug(`Applying operator ${operator}`, { fields: Object.keys(updateOps[operator] || {}) });
      result = this._operatorHandlers[operator](result, updateOps[operator]);
    }
    
    return result;
  }

  // Private operator handlers
  
  /**
   * Apply $set operator - sets field values
   * @param {Object} document - Document to modify
   * @param {Object} ops - Set operations
   * @returns {Object} Modified document
   */
  _applySet(document, ops) {
    this._validateOperationsNotEmpty(ops, '$set');
    
    for (const fieldPath in ops) {
      this._setFieldValue(document, fieldPath, ops[fieldPath]);
    }
    return document;
  }

  /**
   * Apply $inc operator - increments numeric values
   * @param {Object} document - Document to modify
   * @param {Object} ops - Increment operations
   * @returns {Object} Modified document
   */
  _applyInc(document, ops) {
    this._validateOperationsNotEmpty(ops, '$inc');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath) || 0;
      const incrementValue = ops[fieldPath];
      
      this._validateNumericValue(incrementValue, fieldPath, '$inc');
      
      this._setFieldValue(document, fieldPath, currentValue + incrementValue);
    }
    return document;
  }

  /**
   * Apply $mul operator - multiplies numeric values
   * @param {Object} document - Document to modify
   * @param {Object} ops - Multiply operations
   * @returns {Object} Modified document
   */
  _applyMul(document, ops) {
    this._validateOperationsNotEmpty(ops, '$mul');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath) || 0;
      const multiplyValue = ops[fieldPath];
      
      this._validateNumericValue(multiplyValue, fieldPath, '$mul');
      
      this._setFieldValue(document, fieldPath, currentValue * multiplyValue);
    }
    return document;
  }

  /**
   * Apply $min operator - sets minimum value
   * @param {Object} document - Document to modify
   * @param {Object} ops - Minimum operations
   * @returns {Object} Modified document
   */
  _applyMin(document, ops) {
    this._validateOperationsNotEmpty(ops, '$min');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const minValue = ops[fieldPath];
      
      if (currentValue === undefined || minValue < currentValue) {
        this._setFieldValue(document, fieldPath, minValue);
      }
    }
    return document;
  }

  /**
   * Apply $max operator - sets maximum value
   * @param {Object} document - Document to modify
   * @param {Object} ops - Maximum operations
   * @returns {Object} Modified document
   */
  _applyMax(document, ops) {
    this._validateOperationsNotEmpty(ops, '$max');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const maxValue = ops[fieldPath];
      
      if (currentValue === undefined || maxValue > currentValue) {
        this._setFieldValue(document, fieldPath, maxValue);
      }
    }
    return document;
  }

  /**
   * Apply $unset operator - removes fields
   * @param {Object} document - Document to modify
   * @param {Object} ops - Unset operations
   * @returns {Object} Modified document
   */
  _applyUnset(document, ops) {
    this._validateOperationsNotEmpty(ops, '$unset');
    
    for (const fieldPath in ops) {
      this._unsetFieldValue(document, fieldPath);
    }
    return document;
  }

  /**
   * Apply $push operator - adds elements to arrays
   * @param {Object} document - Document to modify
   * @param {Object} ops - Push operations
   * @returns {Object} Modified document
   */
  _applyPush(document, ops) {
    this._validateOperationsNotEmpty(ops, '$push');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const valueToAdd = ops[fieldPath];
      
      if (!Array.isArray(currentValue)) {
        // Create array if field doesn't exist or isn't an array
        this._setFieldValue(document, fieldPath, [valueToAdd]);
      } else {
        currentValue.push(valueToAdd);
      }
    }
    return document;
  }

  /**
   * Apply $pull operator - removes elements from arrays
   * @param {Object} document - Document to modify
   * @param {Object} ops - Pull operations
   * @returns {Object} Modified document
   */
  _applyPull(document, ops) {
    this._validateOperationsNotEmpty(ops, '$pull');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const valueToRemove = ops[fieldPath];
      
      if (Array.isArray(currentValue)) {
        const filteredArray = currentValue.filter(item => !this._valuesEqual(item, valueToRemove));
        this._setFieldValue(document, fieldPath, filteredArray);
      }
    }
    return document;
  }

  /**
   * Apply $addToSet operator - adds unique elements to arrays
   * @param {Object} document - Document to modify
   * @param {Object} ops - AddToSet operations
   * @returns {Object} Modified document
   */
  _applyAddToSet(document, ops) {
    this._validateOperationsNotEmpty(ops, '$addToSet');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const valueToAdd = ops[fieldPath];
      
      if (!Array.isArray(currentValue)) {
        // Create array if field doesn't exist or isn't an array
        this._setFieldValue(document, fieldPath, [valueToAdd]);
      } else {
        // Only add if value doesn't already exist
        const exists = currentValue.some(item => this._valuesEqual(item, valueToAdd));
        if (!exists) {
          currentValue.push(valueToAdd);
        }
      }
    }
    return document;
  }

  /**
   * Get field value using dot notation path
   * @param {Object} document - Document to read from
   * @param {string} fieldPath - Dot notation field path
   * @returns {*} Field value or undefined
   */
  _getFieldValue(document, fieldPath) {
    const parts = fieldPath.split('.');
    let current = document;
    
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Set field value using dot notation path, creating nested objects as needed
   * @param {Object} document - Document to modify
   * @param {string} fieldPath - Dot notation field path
   * @param {*} value - Value to set
   */
  _setFieldValue(document, fieldPath, value) {
    const parts = fieldPath.split('.');
    let current = document;
    
    // Navigate to the parent of the target field, creating objects as needed
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
        current[part] = {};
      }
      current = current[part];
    }
    
    // Set the final field
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Remove field using dot notation path
   * @param {Object} document - Document to modify
   * @param {string} fieldPath - Dot notation field path
   */
  _unsetFieldValue(document, fieldPath) {
    const parts = fieldPath.split('.');
    let current = document;
    
    // Navigate to the parent of the target field
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        return; // Path doesn't exist, nothing to unset
      }
      current = current[part];
    }
    
    // Remove the final field
    delete current[parts[parts.length - 1]];
  }

  /**
   * Check if two values are equal (for array operations)
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True if values are equal
   */
  _valuesEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    
    // For objects and arrays, do a deep comparison
    if (typeof a === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    
    return false;
  }

  // Private validation methods

  /**
   * Validate inputs for applyOperators method
   * @param {Object} document - Document to validate
   * @param {Object} updateOps - Update operations to validate
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When inputs are invalid
   */
  _validateApplyOperatorsInputs(document, updateOps) {
    if (!document || typeof document !== 'object') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('document', document, 'Document must be an object');
    }
    
    if (!updateOps || typeof updateOps !== 'object') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('updateOps', updateOps, 'Update operations must be an object');
    }
  }

  /**
   * Validate that a value is numeric for arithmetic operations
   * @param {*} value - Value to validate
   * @param {string} fieldPath - Field path for error reporting
   * @param {string} operation - Operation name for error reporting
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When value is not numeric
   */
  _validateNumericValue(value, fieldPath, operation) {
    if (typeof value !== 'number') {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(fieldPath, value, `${operation} operation requires a numeric value`);
    }
  }

  /**
   * Validate that a value is an array for array operations
   * @param {*} value - Value to validate
   * @param {string} fieldPath - Field path for error reporting
   * @param {string} operation - Operation name for error reporting
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When value is not an array
   */
  _validateArrayValue(value, fieldPath, operation) {
    if (!Array.isArray(value)) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(fieldPath, value, `${operation} operation requires an array value`);
    }
  }

  /**
   * Validate that operations object is not empty
   * @param {Object} ops - Operations object to validate
   * @param {string} operatorName - Operator name for error reporting
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When operations object is empty
   */
  _validateOperationsNotEmpty(ops, operatorName) {
    if (!ops || typeof ops !== 'object' || Object.keys(ops).length === 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY('operations', ops, `${operatorName} operator requires at least one field operation`);
    }
  }
}
