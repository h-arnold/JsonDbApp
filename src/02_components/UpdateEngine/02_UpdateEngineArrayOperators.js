/**
 * 02_UpdateEngineArrayOperators.js - Handles array update operators ($push, $pull, $addToSet)
 */
const ADD_TO_SET_LOG_SAMPLE_SIZE = 5;

/* exported UpdateEngineArrayOperators */
/**
 * Groups MongoDB-style array update operators for the UpdateEngine facade.
 */
class UpdateEngineArrayOperators {
  /**
   * Create a new array operator handler.
   * @param {UpdateEngine} engine - Parent update engine facade
   */
  constructor(engine) {
    this._engine = engine;
    this._logger = engine.getLogger();
    this._validation = engine.getValidation();
    this._fieldPaths = engine.getFieldPathAccess();
  }

  /**
   * Applies MongoDB-like `$push` operations to the specified fields in a document.
   * @param {Object} document - The target document to update.
   * @param {Object} ops - An object mapping field paths to values or modifiers to push.
   * @returns {Object} The updated document after applying the push operations.
   * @throws {ErrorHandler.ErrorTypes.INVALID_QUERY} If the operations object is empty, or if any target field is not an array when required.
   */
  applyPush(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$push');

    Object.keys(ops).forEach((fieldPath) => {
      this._applyPushForField(document, fieldPath, ops[fieldPath]);
    });

    return document;
  }

  /**
   * Remove matching elements from arrays.
   * @param {Object} document - The document being modified.
   * @param {Object} ops - An object mapping field paths to values to remove.
   * @returns {Object} The updated document instance without matching elements.
   */
  applyPull(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$pull');

    for (const fieldPath in ops) {
      const current = this._fieldPaths.getValue(document, fieldPath);
      if (current === undefined || !Array.isArray(current)) {
        continue;
      }

      const criterion = ops[fieldPath];
      const originalLength = current.length;

      const filtered = current.filter((item) => {
        try {
          return !this._pullMatches(item, criterion);
        } catch (error) {
          this._logger.debug('Pull match evaluation error – element retained', {
            error: error.message
          });
          return true;
        }
      });

      if (filtered.length < originalLength) {
        this._fieldPaths.setValue(document, fieldPath, filtered);
      }
    }

    return document;
  }

  /**
   * Add unique elements to arrays, supporting the MongoDB-compatible $addToSet operator.
   * @param {Object} document - The document to modify.
   * @param {Object} ops - Map of field paths to a single value or a modifier object.
   * @returns {Object} The same document reference, updated in place.
   */
  applyAddToSet(document, ops) {
    this._validation.validateOperationsNotEmpty(ops, '$addToSet');

    Object.keys(ops).forEach((fieldPath) => {
      const current = this._fieldPaths.getValue(document, fieldPath);
      const valueOrModifier = ops[fieldPath];
      const comparator = this._createEqualityComparator(fieldPath);

      if (this._isEachModifier(valueOrModifier)) {
        this._applyAddToSetEach(document, fieldPath, current, valueOrModifier.$each, comparator);
        return;
      }

      this._applyAddToSetSingle(document, fieldPath, current, valueOrModifier, comparator);
    });

    return document;
  }

  /**
   * Determine whether an array element matches a $pull criterion.
   * @private
   * @param {*} element - The array element under test
   * @param {*} criterion - The $pull criterion provided by the update expression
   * @returns {boolean} true if element should be removed
   */
  _pullMatches(element, criterion) {
    if (
      criterion === null ||
      typeof criterion !== 'object' ||
      Array.isArray(criterion) ||
      criterion instanceof Date
    ) {
      return ComparisonUtils.equals(element, criterion, { arrayContainsScalar: false });
    }

    return ComparisonUtils.subsetMatch(element, criterion, { operatorSupport: true });
  }

  /**
   * Apply push operations for a specific field.
   * @private
   * @param {Object} document - Target document
   * @param {string} fieldPath - Field path being updated
   * @param {*} valueOrModifier - Value or modifier definition
   */
  _applyPushForField(document, fieldPath, valueOrModifier) {
    if (this._isEachModifier(valueOrModifier)) {
      this._applyPushEach(document, fieldPath, valueOrModifier.$each);
      return;
    }

    this._applyPushSingle(document, fieldPath, valueOrModifier);
  }

  /**
   * Apply $push with $each modifier.
   * @private
   * @param {Object} document - Target document
   * @param {string} fieldPath - Field path being updated
   * @param {Array} items - Items to append
   */
  _applyPushEach(document, fieldPath, items) {
    this._validation.validateArrayValue(items, fieldPath, '$push');

    const current = this._fieldPaths.getValue(document, fieldPath);
    if (current === undefined) {
      this._fieldPaths.setValue(document, fieldPath, items.slice());
      return;
    }

    this._validation.validateArrayValue(current, fieldPath, '$push');
    items.forEach((item) => current.push(item));
  }

  /**
   * Apply $push for a single value.
   * @private
   * @param {Object} document - Target document
   * @param {string} fieldPath - Field path being updated
   * @param {*} value - Value to append
   */
  _applyPushSingle(document, fieldPath, value) {
    const current = this._fieldPaths.getValue(document, fieldPath);

    if (current === undefined) {
      this._fieldPaths.setValue(document, fieldPath, [value]);
      return;
    }

    this._validation.validateArrayValue(current, fieldPath, '$push');
    current.push(value);
  }

  /**
   * Determine if a value is a $each modifier definition.
   * @private
   * @param {*} value - Value to inspect
   * @returns {boolean} True when value is an object containing $each
   */
  _isEachModifier(value) {
    return value && typeof value === 'object' && Object.hasOwn(value, '$each');
  }

  /**
   * Apply $addToSet for $each modifier inputs.
   * @private
   * @param {Object} document - Target document
   * @param {string} fieldPath - Field path being updated
   * @param {Array|undefined} current - Current field value
   * @param {Array} items - Items to evaluate
   * @param {Function} comparator - Equality comparator
   */
  _applyAddToSetEach(document, fieldPath, current, items, comparator) {
    this._validation.validateArrayValue(items, fieldPath, '$addToSet');

    if (current === undefined) {
      const uniqueValues = [];
      items.forEach((item) => {
        const existsInBatch = uniqueValues.some((entry) => comparator(entry, item));
        this._logger.debug('AddToSet $each batch check', {
          fieldPath,
          existsInBatch,
          candidate: item
        });
        if (!existsInBatch) {
          uniqueValues.push(item);
        }
      });
      this._fieldPaths.setValue(document, fieldPath, uniqueValues);
      return;
    }

    this._validation.validateArrayValue(current, fieldPath, '$addToSet');
    items.forEach((item) => this._addUniqueValue(current, fieldPath, comparator, item));
  }

  /**
   * Apply $addToSet for a single value.
   * @private
   * @param {Object} document - Target document
   * @param {string} fieldPath - Field path being updated
   * @param {Array|undefined} current - Current field value
   * @param {*} value - Value to evaluate
   * @param {Function} comparator - Equality comparator
   */
  _applyAddToSetSingle(document, fieldPath, current, value, comparator) {
    if (current === undefined) {
      this._fieldPaths.setValue(document, fieldPath, [value]);
      return;
    }

    this._validation.validateArrayValue(current, fieldPath, '$addToSet');
    this._addUniqueValue(current, fieldPath, comparator, value);
  }

  /**
   * Create comparator respecting UpdateEngine equality semantics.
   * @private
   * @param {string} fieldPath - Path for logging context
   * @returns {Function} Equality comparator
   */
  _createEqualityComparator(fieldPath) {
    return (a, b) => this._compareForAddToSet(fieldPath, a, b);
  }

  /**
   * Compare two values using AddToSet equality semantics.
   * @private
   * @param {string} fieldPath - Path for logging context
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when values are considered equal
   */
  _compareForAddToSet(fieldPath, a, b) {
    if (this._equalsWithPrimaryComparator(fieldPath, a, b)) {
      return true;
    }

    if (this._shouldUseDeepEqual(a, b)) {
      return this._equalsWithFallbackDeepCompare(fieldPath, a, b);
    }

    return false;
  }

  /**
   * Attempt comparison using ComparisonUtils.equals.
   * @private
   * @param {string} fieldPath - Path for logging context
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when comparison succeeds
   */
  _equalsWithPrimaryComparator(fieldPath, a, b) {
    try {
      return ComparisonUtils.equals(a, b, { arrayContainsScalar: false });
    } catch (error) {
      this._logger.debug('AddToSet comparator fallback triggered', {
        fieldPath,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Determine whether a deep comparison should be attempted.
   * @private
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when both values are plain objects suitable for deep comparison
   */
  _shouldUseDeepEqual(a, b) {
    return (
      Boolean(a) &&
      Boolean(b) &&
      typeof a === 'object' &&
      typeof b === 'object' &&
      !(a instanceof Date) &&
      !(b instanceof Date)
    );
  }

  /**
   * Fallback to ObjectUtils.deepEqual with error logging.
   * @private
   * @param {string} fieldPath - Path for logging context
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when deep comparison succeeds
   */
  _equalsWithFallbackDeepCompare(fieldPath, a, b) {
    try {
      return ObjectUtils.deepEqual(a, b);
    } catch (error) {
      this._logger.debug('AddToSet deepEqual fallback error', { fieldPath, error: error.message });
      return false;
    }
  }

  /**
   * Append a value when no duplicate exists.
   * @private
   * @param {Array} targetArray - Array to update
   * @param {string} fieldPath - Path for logging context
   * @param {Function} comparator - Equality comparator
   * @param {*} candidate - Candidate value
   */
  _addUniqueValue(targetArray, fieldPath, comparator, candidate) {
    if (!Array.isArray(targetArray)) {
      return;
    }

    const comparisons = targetArray.map((item, idx) => ({
      idx,
      equals: comparator(item, candidate),
      item
    }));
    const exists = comparisons.some((entry) => entry.equals);
    const snapshot = targetArray.slice(0, ADD_TO_SET_LOG_SAMPLE_SIZE);

    this._logger.debug('AddToSet duplicate check', {
      fieldPath,
      exists,
      currentLength: targetArray.length
    });
    this._logger.debug('AddToSet compare details', { candidate, sample: snapshot, comparisons });

    if (exists) {
      this._logger.debug('AddToSet skipped duplicate', { fieldPath, skipped: candidate });
      return;
    }

    targetArray.push(candidate);
    this._logger.debug('AddToSet appended value', { fieldPath, appended: candidate });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateEngineArrayOperators };
}
