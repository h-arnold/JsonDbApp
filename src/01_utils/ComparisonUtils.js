/**
 * ComparisonUtils - Shared comparison and predicate evaluation utilities
 *
 * Centralises equality, ordering and operator application logic used by
 * QueryEngine (query filtering) and UpdateEngine (e.g. $pull predicate logic,
 * $addToSet uniqueness).
 *
 * Supported comparison operators (initial scope): $eq, $gt, $lt
 * Design notes:
 *  - Strict (non-coercive) comparisons: types must match for ordering or be both Dates.
 *  - Equality supports deep structural comparison via ObjectUtils.deepEqual for
 *    plain objects / arrays, plus Date millisecond equivalence.
 *  - Optional array membership semantics for scalar equality (Mongo behaviour
 *    when querying arrays) controlled by options.arrayContainsScalar.
 *  - Operator objects: non-empty plain object whose keys all start with '$'.
 *  - subsetMatch: shallow field subset predicate with optional operator object
 *    evaluation per field. Direct operator object against primitive candidate
 *    is supported; against object candidate returns false (documented simplification).
 */
/* exported ComparisonUtils */
const NEGATIVE_ONE = -1;

/**
 * Utility namespace encapsulating comparison logic shared across query and
 * update components, including equality, ordering, and operator evaluation.
 */
class ComparisonUtils {
  /**
   * Provide the list of supported comparison operators.
   * @returns {string[]} Supported operator names
   */
  static get SUPPORTED_OPERATORS() {
    return ['$eq', '$gt', '$lt'];
  }

  /**
   * Determine deep / semantic equality between two values.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @param {Object} [options] - Comparison options
   * @param {boolean} [options.arrayContainsScalar=false] - Treat array vs scalar equality as membership test
   * @returns {boolean} True when values are considered equal
   */
  static equals(a, b, options = {}) {
    const { arrayContainsScalar = false } = options;

    if (a === b) return true; // covers primitives, reference equality
    if (ComparisonUtils._isEitherNullish(a, b)) return false;

    return ComparisonUtils._compareEqualityByType(a, b, arrayContainsScalar);
  }

  /**
   * Compare ordering of two values.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {number} positive if a>b, negative if a<b, 0 if equal or not comparable
   */
  static compareOrdering(a, b) {
    if (ComparisonUtils._isEitherNullish(a, b)) return 0;

    const dateComparison = ComparisonUtils._compareDateOrdering(a, b);
    if (dateComparison !== null) return dateComparison;

    const numberComparison = ComparisonUtils._compareNumberOrdering(a, b);
    if (numberComparison !== null) return numberComparison;

    const stringComparison = ComparisonUtils._compareStringOrdering(a, b);
    if (stringComparison !== null) return stringComparison;

    return 0; // Not comparable (different types or unsupported)
  }

  /**
   * Compare values by type-specific equality rules.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @param {boolean} arrayContainsScalar - Whether to treat arrays as scalar containers
   * @returns {boolean} True when values are equal
   * @private
   */
  static _compareEqualityByType(a, b, arrayContainsScalar) {
    const dateEquality = ComparisonUtils._compareDateEquality(a, b);
    if (dateEquality !== null) return dateEquality;

    const arrayMembership = ComparisonUtils._compareArrayMembership(a, b, arrayContainsScalar);
    if (arrayMembership !== null) return arrayMembership;

    if (typeof a !== typeof b) return false;

    if (ComparisonUtils._areArrays(a, b)) {
      return ComparisonUtils._compareArrays(a, b);
    }

    if (ComparisonUtils._arePlainObjects(a, b)) {
      return ObjectUtils.deepEqual(a, b);
    }

    return false;
  }

  /**
   * Apply an operator object (e.g. { $gt: 5, $lt: 10 }) to a value.
   * All operators must pass (logical AND).
   * @param {*} actual - Actual value from document/element
   * @param {Object} operatorObject - Operator specification
   * @param {Object} [options] - Operator evaluation options
   * @param {boolean} [options.arrayContainsScalarForEq=true] - Enable array membership semantics for $eq
   * @returns {boolean} True when all operators match
   * @throws {InvalidQueryError} When unsupported operator used
   */
  static applyOperators(actual, operatorObject, options = {}) {
    const { arrayContainsScalarForEq = true } = options;
    if (!ComparisonUtils.isOperatorObject(operatorObject)) {
      // Not an operator object -> treat as implicit $eq comparison
      return ComparisonUtils.equals(actual, operatorObject, {
        arrayContainsScalar: arrayContainsScalarForEq
      });
    }

    for (const op of Object.keys(operatorObject)) {
      if (!ComparisonUtils.SUPPORTED_OPERATORS.includes(op)) {
        throw new InvalidQueryError(`Unsupported operator: ${op}`);
      }
      const expected = operatorObject[op];
      if (
        !ComparisonUtils._applyOperator(actual, expected, op, {
          arrayContainsScalarForEq
        })
      )
        return false;
    }
    return true;
  }

  /**
   * Determine if value is a non-empty operator object (all keys start with $)
   * @param {*} obj - Candidate value to check
   * @returns {boolean} True when the value is an operator object
   */
  static isOperatorObject(obj) {
    if (!Validate.isPlainObject(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.length === 0) return false;
    return keys.every((k) => k.startsWith('$'));
  }

  /**
   * Shallow subset predicate match.
   * @param {*} candidate - Value being tested (object or primitive)
   * @param {*} predicate - Predicate object or operator object
   * @param {Object} [options] - Subset matching options
   * @param {boolean} [options.operatorSupport=true] - Allow operator objects at field level
   * @returns {boolean} True when the candidate satisfies the predicate
   */
  static subsetMatch(candidate, predicate, options = {}) {
    const { operatorSupport = true } = options;

    // Direct operator object against primitive / Date candidate
    if (ComparisonUtils.isOperatorObject(predicate)) {
      return ComparisonUtils._matchOperatorPredicate(candidate, predicate);
    }

    // Non-object / null predicate: fall back to equality
    if (!Validate.isPlainObject(predicate)) {
      return ComparisonUtils.equals(candidate, predicate, { arrayContainsScalar: false });
    }

    // Candidate must be object for field subset semantics
    if (!Validate.isPlainObject(candidate)) return false;

    return ComparisonUtils._matchObjectPredicate(candidate, predicate, operatorSupport);
  }

  /**
   * Check if either value is nullish (null or undefined).
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when either value is nullish
   * @private
   */
  static _isEitherNullish(a, b) {
    return ComparisonUtils._isNullish(a) || ComparisonUtils._isNullish(b);
  }

  /**
   * Check if a value is nullish (null or undefined).
   * @param {*} value - Value to check
   * @returns {boolean} True when nullish
   * @private
   */
  static _isNullish(value) {
    return value === null || value === undefined;
  }

  /**
   * Compare dates for equality.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean|null} True/false when both are dates, null otherwise
   * @private
   */
  static _compareDateEquality(a, b) {
    if (!(a instanceof Date && b instanceof Date)) {
      return null;
    }
    return a.getTime() === b.getTime();
  }

  /**
   * Compare dates for ordering.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {number|null} Comparison result or null if not dates
   * @private
   */
  static _compareDateOrdering(a, b) {
    if (!(a instanceof Date && b instanceof Date)) {
      return null;
    }
    return a.getTime() - b.getTime();
  }

  /**
   * Compare numbers for ordering.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {number|null} Comparison result or null if not numbers
   * @private
   */
  static _compareNumberOrdering(a, b) {
    if (!(typeof a === 'number' && typeof b === 'number')) {
      return null;
    }
    return a - b;
  }

  /**
   * Compare strings for ordering.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {number|null} Comparison result or null if not strings
   * @private
   */
  static _compareStringOrdering(a, b) {
    if (!(typeof a === 'string' && typeof b === 'string')) {
      return null;
    }
    if (a === b) return 0;
    if (a > b) return 1;
    return NEGATIVE_ONE;
  }

  /**
   * Compare array membership equality when enabled.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @param {boolean} arrayContainsScalar - Whether to use membership checks
   * @returns {boolean|null} True/false when membership applies, null otherwise
   * @private
   */
  static _compareArrayMembership(a, b, arrayContainsScalar) {
    if (!arrayContainsScalar || !Array.isArray(a) || Array.isArray(b)) {
      return null;
    }
    return a.indexOf(b) !== NEGATIVE_ONE;
  }

  /**
   * Compare arrays element-by-element.
   * @param {Array} a - First array
   * @param {Array} b - Second array
   * @returns {boolean} True when equal
   * @private
   */
  static _compareArrays(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!ComparisonUtils.equals(a[i], b[i], { arrayContainsScalar: false })) return false;
    }
    return true;
  }

  /**
   * Check whether both values are arrays.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when both are arrays
   * @private
   */
  static _areArrays(a, b) {
    return Array.isArray(a) && Array.isArray(b);
  }

  /**
   * Check whether both values are plain objects.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when both are plain objects
   * @private
   */
  static _arePlainObjects(a, b) {
    return Validate.isPlainObject(a) && Validate.isPlainObject(b);
  }

  /**
   * Apply a specific operator check.
   * @param {*} actual - Actual value
   * @param {*} expected - Expected value
   * @param {string} operator - Operator name
   * @param {Object} options - Evaluation options
   * @param {boolean} options.arrayContainsScalarForEq - Array membership toggle for $eq
   * @returns {boolean} True when operator matches
   * @throws {InvalidQueryError} When unsupported operator used
   * @private
   */
  static _applyOperator(actual, expected, operator, options = {}) {
    const { arrayContainsScalarForEq = true } = options;
    switch (operator) {
      case '$eq':
        return ComparisonUtils.equals(actual, expected, {
          arrayContainsScalar: arrayContainsScalarForEq
        });
      case '$gt':
        return ComparisonUtils.compareOrdering(actual, expected) > 0;
      case '$lt':
        return ComparisonUtils.compareOrdering(actual, expected) < 0;
      default:
        throw new InvalidQueryError(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Match an operator object against a candidate.
   * @param {*} candidate - Value being tested
   * @param {Object} predicate - Operator object
   * @returns {boolean} True when candidate matches
   * @private
   */
  static _matchOperatorPredicate(candidate, predicate) {
    if (Validate.isPlainObject(candidate)) return false;
    return ComparisonUtils.applyOperators(candidate, predicate);
  }

  /**
   * Match a plain object predicate against a candidate object.
   * @param {Object} candidate - Candidate object
   * @param {Object} predicate - Predicate object
   * @param {boolean} operatorSupport - Whether operator objects are allowed
   * @returns {boolean} True when candidate matches
   * @private
   */
  static _matchObjectPredicate(candidate, predicate, operatorSupport) {
    for (const key of Object.keys(predicate)) {
      const expected = predicate[key];
      const actual = candidate[key];

      if (operatorSupport && ComparisonUtils.isOperatorObject(expected)) {
        if (!ComparisonUtils.applyOperators(actual, expected)) return false;
      } else if (!ComparisonUtils.equals(actual, expected, { arrayContainsScalar: false })) {
        return false;
      }
    }
    return true;
  }
}
