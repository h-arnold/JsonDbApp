/**
 * UpdateEngine.js - Document update engine for MongoDB-style update operators
 *
 * Section 7: Update Engine Implementation (Green Phase)
 */
/* exported UpdateEngine */
/**
 *
 */
class UpdateEngine {
  /**
   * Creates a new UpdateEngine instance
   */
  constructor() {
    this._logger = JDbLogger.createComponentLogger('UpdateEngine');
    
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
    this._validateUpdateOperationsNotEmpty(updateOps);
    
    // Create a deep copy of the document to avoid modifying the original
    let clonedDoc = ObjectUtils.deepClone(document);
    
    // Apply each operator
    for (const operator in updateOps) {
      if (!this._operatorHandlers[operator]) {
        throw new ErrorHandler.ErrorTypes.INVALID_QUERY('operator', operator, `Unsupported update operator: ${operator}`);
      }
      
      this._logger.debug(`Applying operator ${operator}`, { fields: Object.keys(updateOps[operator] || {}) });
      clonedDoc = this._operatorHandlers[operator](clonedDoc, updateOps[operator]);
    }
    
    return clonedDoc;
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
      if (this._isImmutableField(fieldPath)) {
        this._logger.debug('Skipping immutable field update', { fieldPath });
        continue;
      }
      this._setFieldValue(document, fieldPath, ops[fieldPath]);
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
  _applyInc(document, ops) {
    this._validateOperationsNotEmpty(ops, '$inc');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const incrementValue = ops[fieldPath];
      
      this._validateNumericValue(incrementValue, fieldPath, '$inc');
      
      // If field exists, validate it's numeric
      if (currentValue !== undefined) {
        this._validateCurrentFieldNumeric(currentValue, fieldPath, '$inc');
      }
      
      const baseValue = currentValue || 0;
      const newValue = baseValue + incrementValue;
      
      this._setFieldValue(document, fieldPath, newValue);
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
  _applyMul(document, ops) {
    this._validateOperationsNotEmpty(ops, '$mul');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const multiplyValue = ops[fieldPath];
      
      this._validateNumericValue(multiplyValue, fieldPath, '$mul');
      
      // If field exists, validate it's numeric
      if (currentValue !== undefined) {
        this._validateCurrentFieldNumeric(currentValue, fieldPath, '$mul');
      }
      
      const baseValue = currentValue || 0;
      const newValue = baseValue * multiplyValue;
      
      this._setFieldValue(document, fieldPath, newValue);
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
  _applyMin(document, ops) {
    this._validateOperationsNotEmpty(ops, '$min');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const minValue = ops[fieldPath];
      
      if (currentValue === undefined || minValue < currentValue) {
        this._setFieldValue(document, fieldPath, minValue);
      } else if (currentValue !== undefined) {
        // Validate that comparison is valid between current and new value
        this._validateComparableValues(currentValue, minValue, fieldPath, '$min');
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
  _applyMax(document, ops) {
    this._validateOperationsNotEmpty(ops, '$max');
    
    for (const fieldPath in ops) {
      const currentValue = this._getFieldValue(document, fieldPath);
      const maxValue = ops[fieldPath];
      
      if (currentValue === undefined || maxValue > currentValue) {
        this._setFieldValue(document, fieldPath, maxValue);
      } else if (currentValue !== undefined) {
        // Validate that comparison is valid between current and new value
        this._validateComparableValues(currentValue, maxValue, fieldPath, '$max');
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
  _applyUnset(document, ops) {
    this._validateOperationsNotEmpty(ops, '$unset');
    
    for (const fieldPath in ops) {
      this._unsetFieldValue(document, fieldPath);
    }
    return document;
  }

  /**
   * Applies MongoDB-like `$push` operations to the specified fields in a document.
   *
   * This method updates the given `document` by pushing values onto arrays at the specified field paths,
   * according to the operations described in the `ops` object. Supports both direct value pushes and
   * the `$each` modifier for pushing multiple values at once.
   *
   * @param {Object} document - The target document to update.
   * @param {Object} ops - An object mapping field paths to values or modifiers to push.
   *   Each value can be a direct value to push, or an object with a `$each` array.
   * @returns {Object} The updated document after applying the push operations.
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} If the operations object is empty, or if any target field is not an array when required.
   *
   * @example
   * // Push a single value
   * _applyPush(doc, { tags: 'newTag' });
   *
   * @example
   * // Push multiple values using $each
   * _applyPush(doc, { tags: { $each: ['tag1', 'tag2'] } });
   */
  _applyPush(document, ops) {
    this._validateOperationsNotEmpty(ops, '$push');
    for (const fieldPath in ops) {
      const current = this._getFieldValue(document, fieldPath);
      const valueOrModifier = ops[fieldPath];

      // Handle {$each: [...] } modifier to push multiple items
      if (valueOrModifier && typeof valueOrModifier === 'object' && '$each' in valueOrModifier) {
        const eachValues = valueOrModifier.$each;
        this._validateArrayValue(eachValues, fieldPath, '$push');
        if (current === undefined) {
          // No array exists: initialise with all provided values
          this._setFieldValue(document, fieldPath, [...eachValues]);
        } else {
          // Must be an array to append
          this._validateArrayValue(current, fieldPath, '$push');
          // Append each element in sequence
          eachValues.forEach(v => current.push(v));
        }
      } else {
        // Single‐value push
        if (current === undefined) {
          // Initialise array with single element
          this._setFieldValue(document, fieldPath, [valueOrModifier]);
        } else {
          // Must be an array to append
          this._validateArrayValue(current, fieldPath, '$push');
          current.push(valueOrModifier);
        }
      }
    }
    return document;
  }

  /**
   * Remove matching elements from arrays.
   * @param {Object} document - The document being modified.
   * @param {Object} ops - An object mapping field paths to values to remove.
   * @returns {Object} The updated document instance without matching elements.
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} If target field is not an array.
   */
  _applyPull(document, ops) {
    this._validateOperationsNotEmpty(ops, '$pull');
    
    for (const fieldPath in ops) {
      const current = this._getFieldValue(document, fieldPath);
      if (current === undefined || !Array.isArray(current)) {
        // Silent no-op for non-array (decision documented in TODO)
        continue;
      }

      const criterion = ops[fieldPath];
      const originalLength = current.length;

      // Build filtered array using Mongo-like predicate semantics
      const filtered = current.filter(item => {
        try {
          return !this._pullMatches(item, criterion);
        } catch (e) {
          // Defensive: if matcher throws, do not remove the element
          this._logger.debug('Pull match evaluation error – element retained', { error: e.message });
          return true;
        }
      });

      if (filtered.length < originalLength) {
        this._setFieldValue(document, fieldPath, filtered);
      }
    }
    return document;
  }

  /**
   * Determine whether an array element matches a $pull criterion.
   * Mongo semantics (subset predicate for object criteria; operator objects supported at top level).
   * @param {*} element - The array element under test
   * @param {*} criterion - The $pull criterion provided by the update expression
   * @returns {boolean} true if element should be removed
   * @private
   */
  _pullMatches(element, criterion) {
    // Primitive / Date / array direct criterion -> strict equality (no membership semantics)
    if (criterion === null || typeof criterion !== 'object' || Array.isArray(criterion) || (criterion instanceof Date)) {
      return ComparisonUtils.equals(element, criterion, { arrayContainsScalar: false });
    }

    // Plain object predicate: use subsetMatch semantics (operator objects handled there)
    return ComparisonUtils.subsetMatch(element, criterion, { operatorSupport: true });
  }

/**
 * Check if a value is a plain object (not Date / Array / null)
 * @param {*} val - value to test
 * @returns {boolean}
 * @private
 */
_isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
}

/**
 * Add unique elements to arrays, supporting the MongoDB-compatible $addToSet operator.
 *
 * Behaviour summary:
 * - For each field path in `ops`, ensures the target field is an array (creating it when undefined).
 * - Adds the provided value only if it is not already present (uniqueness check).
 * - Supports the `$each` modifier to add multiple values; ensures uniqueness across
 *   both the existing array and within the provided `$each` list.
 * - No reordering is performed; new unique values are appended at the end.
 *
 * Equality semantics for uniqueness:
 * - Primary comparator: `ComparisonUtils.equals(a, b, { arrayContainsScalar: false })`.
 *   This performs strict, deep structural equality for plain objects/arrays and Date
 *   millisecond equality, without array-membership semantics.
 * - Fallback comparator: `ObjectUtils.deepEqual(a, b)` for non-Date object pairs, to
 *   guard against any edge-case misclassification of plain objects.
 * - Primitives are compared strictly (===) by the comparator implementation.
 *
 * Field initialisation and validation:
 * - If the target field is `undefined`, a new array is created. For `$each`, the array is
 *   initialised with the unique subset of the provided values (deduplicated in insertion order).
 * - If the target field exists and is not an array, an `INVALID_QUERY` error is thrown.
 * - The `$each` value must be an array; otherwise an `INVALID_QUERY` error is thrown.
 *
 * Logging:
 * - Emits DEBUG logs that include per-item comparison details and whether a candidate was
 *   appended or skipped. These are helpful when diagnosing equality/uniqueness issues.
 *
 * @param {Object} document - The document to modify.
 * @param {Object} ops - Map of field paths to a single value or a modifier object:
 *   `{ fieldPath: <value> }` or `{ fieldPath: { $each: [v1, v2, ...] } }`.
 * @returns {Object} The same document reference, updated in place.
 * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When a `$each` value is not an array, or when a
 *   target field exists but is not an array.
 */
  _applyAddToSet(document, ops) {
    this._validateOperationsNotEmpty(ops, '$addToSet');
    
    for (const fieldPath in ops) {
     const current = this._getFieldValue(document, fieldPath);
     const valueOrModifier = ops[fieldPath];

   // Robust equality comparator used for uniqueness checks:
   // 1) Try the centralised comparator (handles Dates, arrays, and plain objects).
   // 2) If that does not report equality, fall back to deepEqual for non-Date objects.
     /**
      *
      * @param a
      * @param b
      */
     const eq = (a, b) => {
       try {
         if (ComparisonUtils.equals(a, b, { arrayContainsScalar: false })) return true;
       } catch {
         // ignore and try fallback
       }
       if (a && b && typeof a === 'object' && typeof b === 'object' && !(a instanceof Date) && !(b instanceof Date)) {
         try {
           return ObjectUtils.deepEqual(a, b);
         } catch {
           return false;
         }
       }
       return false;
     };

   // Helper: append a value only if not present in `current` using the comparator above.
     /**
      *
      * @param val
      */
     const addOne = val => {
       const snapshot = Array.isArray(current) ? current.slice(0, 5) : []; // limit to first 5 for log
       const perItem = Array.isArray(current)
         ? current.map((item, idx) => ({ idx, equals: eq(item, val), item }))
         : [];
       const exists = Array.isArray(current) && perItem.some(e => e.equals);
  this._logger.debug('AddToSet duplicate check', { fieldPath, exists, currentLength: Array.isArray(current) ? current.length : 0 });
  this._logger.debug('AddToSet compare details', { candidate: val, sample: snapshot, comparisons: perItem });
       if (!exists) {
         current.push(val);
         this._logger.debug('AddToSet appended value', { fieldPath, appended: val });
       } else {
         this._logger.debug('AddToSet skipped duplicate', { fieldPath, skipped: val });
       }
     };

     // Support {$each: [...] } for multiple unique additions
     if (valueOrModifier && typeof valueOrModifier === 'object' && '$each' in valueOrModifier) {
       const eachValues = valueOrModifier.$each;
        this._validateArrayValue(eachValues, fieldPath, '$addToSet');
        if (current === undefined) {
          // Initialise new array from provided values, ensuring uniqueness
          const uniqueValues = [];
          eachValues.forEach(val => {
            const existsInBatch = uniqueValues.some(item => eq(item, val));
            this._logger.debug('AddToSet $each batch check', { fieldPath, existsInBatch, candidate: val });
            if (!existsInBatch) {
              uniqueValues.push(val);
            }
          });
          this._setFieldValue(document, fieldPath, uniqueValues);
        } else {
          // Target exists: must be an array; otherwise error.
          this._validateArrayValue(current, fieldPath, '$addToSet');
          // Append only those `$each` values that are not already present in `current`.
          eachValues.forEach(addOne);
        }
      } else {
        // Single‐value add
        if (current === undefined) {
          // Field missing: create array with the single provided value.
          this._setFieldValue(document, fieldPath, [valueOrModifier]);
        } else {
          // Target exists: must be an array; otherwise error.
          this._validateArrayValue(current, fieldPath, '$addToSet');
          // Append candidate only if not already present per equality semantics.
          addOne(valueOrModifier);
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

    // Traverse to parent container, creating objects/arrays as required
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];

      if (Array.isArray(current)) {
        const arrayIndex = Number(key);
        if (!Number.isNaN(arrayIndex)) {
          // Numeric key: treat as array index, auto-initialise if missing
          if (current[arrayIndex] === undefined) current[arrayIndex] = {};
          current = current[arrayIndex];
        } else {
          // Non-numeric on array: fallback to object-style property
          current[key] = current[key] || {};
          current = current[key];
        }
      } else {
        // Preserve existing arrays; only create if missing or primitive
        if (current[key] === undefined || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
    }

    // Final assignment: detect numeric tail for arrays
    const last = parts[parts.length - 1];
    if (Array.isArray(current) && /^\d+$/.test(last)) {
      current[Number(last)] = value;
    } else {
      current[last] = value;
    }
  }

  /**
   * Delete a field or array element at a given dot-notation path.
   * @param {Object} document - The document to update.
   * @param {string} fieldPath - Dot-notation path of the field or element to remove.
   */
  _unsetFieldValue(document, fieldPath) {
    const parts = fieldPath.split('.');
    let current = document;

    // Traverse to parent of target
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (Array.isArray(current)) {
        const arrayIndex = Number(key);
        if (Number.isNaN(arrayIndex) || current[arrayIndex] === undefined) return;  // nothing to unset
        current = current[arrayIndex];
      } else {
        if (!current[key] || typeof current[key] !== 'object') return;
        current = current[key];
      }
    }

    const last = parts[parts.length - 1];
    if (Array.isArray(current) && /^\d+$/.test(last)) {
      // Deleting an array index leaves undefined but preserves length
      delete current[Number(last)];
    } else {
      // Delete object property entirely
      delete current[last];
    }
  }

  /**
   * Deep compare two values (primitives, arrays, or objects) for equality.
   * @param {*} a - First value for comparison.
   * @param {*} b - Second value for comparison.
   * @returns {boolean} True if values are deeply equal, false otherwise.
   */
  _valuesEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    
    // For objects and arrays, do a deep comparison
    if (typeof a === 'object') {
      return ObjectUtils.deepEqual(a, b);
    }
    
    return false;
  }

  /**
   * Determine whether a field path targets an immutable root field such as _id.
   * @param {string} fieldPath - Dot notation path of the field
   * @returns {boolean} True if the root segment is immutable
   */
  _isImmutableField(fieldPath) {
    if (!fieldPath || typeof fieldPath !== 'string') {
      return false;
    }
    const root = fieldPath.split('.')[0];
    return root === '_id';
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

  /**
   * Validate that the update operations object contains at least one operator
   * @param {Object} updateOps - Update operations object to validate
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When update operations object is empty
   */
  _validateUpdateOperationsNotEmpty(updateOps) {
    const operators = Object.keys(updateOps);
    if (operators.length === 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY('updateOps', updateOps, 'Update operations must contain at least one operator');
    }
  }

  /**
   * Validate that a current field value is numeric for arithmetic operations
   * @param {*} value - Current field value to validate
   * @param {string} fieldPath - Field path for error reporting
   * @param {string} operation - Operation name for error reporting
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When current field value is not numeric
   */
  _validateCurrentFieldNumeric(value, fieldPath, operation) {
    if (typeof value !== 'number') {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(fieldPath, value, `${operation} operation requires current field value to be numeric`);
    }
  }

  /**
   * Validate that two values can be compared (same type or both numeric)
   * @param {*} currentValue - Current field value
   * @param {*} newValue - New value to compare
   * @param {string} fieldPath - Field path for error reporting
   * @param {string} operation - Operation name for error reporting
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} When values cannot be compared
   */
  _validateComparableValues(currentValue, newValue, fieldPath, operation) {
    const currentType = typeof currentValue;
    const newType = typeof newValue;
    
    // Both must be the same type for safe comparison
    if (currentType !== newType) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(
        fieldPath,
        { currentValue, newValue },
        `${operation} operation requires comparable values of the same type`
      );
    }
    
    // Objects and arrays (but not Dates) cannot be compared with < or >
    if (currentType === 'object' && currentValue !== null && !(currentValue instanceof Date)) {
      throw new ErrorHandler.ErrorTypes.INVALID_QUERY(fieldPath, currentValue, `${operation} operation cannot compare objects or arrays`);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateEngine };
}
