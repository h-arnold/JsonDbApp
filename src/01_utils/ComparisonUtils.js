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
class ComparisonUtils {
  /** @type {string[]} */
  static get SUPPORTED_OPERATORS() { return ['$eq', '$gt', '$lt']; }

  /**
   * Determine deep / semantic equality between two values.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @param {Object} [options]
   * @param {boolean} [options.arrayContainsScalar=false] - Treat array vs scalar equality as membership test
   * @returns {boolean}
   */
  static equals(a, b, options = {}) {
    const { arrayContainsScalar = false } = options;

    if (a === b) return true; // covers primitives, reference equality
    if (a == null || b == null) return a === b; // one nullish -> only equal if both

    // Date equality
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Array membership semantics (only when enabled & a is array & b not array)
    if (arrayContainsScalar && Array.isArray(a) && !Array.isArray(b)) {
      // Use strict equality for membership (mirrors original QueryEngine.includes behaviour)
      return a.indexOf(b) !== -1;
    }

    // Type mismatch (after membership consideration) -> not equal
    if (typeof a !== typeof b) return false;

    // Arrays deep equality
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!ComparisonUtils.equals(a[i], b[i], { arrayContainsScalar: false })) return false;
      }
      return true;
    }

    // Objects (plain or otherwise) deep equality (exclude Dates handled earlier, arrays already handled)
    if (Validate.isPlainObject(a) && Validate.isPlainObject(b)) {
      return ObjectUtils.deepEqual(a, b);
    }

    // Fallback strict equality (covers numbers, strings, booleans, symbols, functions)
    return false; // at this point a !== b and not deeply equal
  }

  /**
   * Compare ordering of two values.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {number} positive if a>b, negative if a<b, 0 if equal or not comparable
   */
  static compareOrdering(a, b) {
    if (a == null || b == null) return 0;
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (typeof a === 'string' && typeof b === 'string') return a === b ? 0 : (a > b ? 1 : -1);
    return 0; // Not comparable (different types or unsupported)
  }

  /**
   * Apply an operator object (e.g. { $gt: 5, $lt: 10 }) to a value.
   * All operators must pass (logical AND).
   * @param {*} actual - Actual value from document/element
   * @param {Object} operatorObject - Operator specification
   * @param {Object} [options]
   * @param {boolean} [options.arrayContainsScalarForEq=true] - Enable array membership semantics for $eq
   * @returns {boolean}
   * @throws {InvalidQueryError} When unsupported operator used
   */
  static applyOperators(actual, operatorObject, options = {}) {
    const { arrayContainsScalarForEq = true } = options;
    if (!ComparisonUtils.isOperatorObject(operatorObject)) {
      // Not an operator object -> treat as implicit $eq comparison
      return ComparisonUtils.equals(actual, operatorObject, { arrayContainsScalar: arrayContainsScalarForEq });
    }

    for (const op of Object.keys(operatorObject)) {
      if (!ComparisonUtils.SUPPORTED_OPERATORS.includes(op)) {
        throw new InvalidQueryError(`Unsupported operator: ${op}`);
      }
      const expected = operatorObject[op];
      switch (op) {
        case '$eq':
          if (!ComparisonUtils.equals(actual, expected, { arrayContainsScalar: arrayContainsScalarForEq })) return false;
          break;
        case '$gt': {
          const cmp = ComparisonUtils.compareOrdering(actual, expected);
            if (!(cmp > 0)) return false;
          break; }
        case '$lt': {
          const cmp = ComparisonUtils.compareOrdering(actual, expected);
            if (!(cmp < 0)) return false;
          break; }
        default:
          // Exhaustive safeguard
          throw new InvalidQueryError(`Unsupported operator: ${op}`);
      }
    }
    return true;
  }

  /**
   * Determine if value is a non-empty operator object (all keys start with $)
   * @param {*} obj
   * @returns {boolean}
   */
  static isOperatorObject(obj) {
    if (!Validate.isPlainObject(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.length === 0) return false;
    return keys.every(k => k.startsWith('$'));
  }

  /**
   * Shallow subset predicate match.
   * @param {*} candidate - Value being tested (object or primitive)
   * @param {*} predicate - Predicate object or operator object
   * @param {Object} [options]
   * @param {boolean} [options.operatorSupport=true] - Allow operator objects at field level
   * @returns {boolean}
   */
  static subsetMatch(candidate, predicate, options = {}) {
    const { operatorSupport = true } = options;

    // Direct operator object against primitive / Date candidate
    if (ComparisonUtils.isOperatorObject(predicate)) {
      // Only support primitive / Date; if candidate is object, return false (documented simplification)
      if (Validate.isPlainObject(candidate)) return false;
      return ComparisonUtils.applyOperators(candidate, predicate);
    }

    // Non-object / null predicate: fall back to equality
    if (!Validate.isPlainObject(predicate)) {
      return ComparisonUtils.equals(candidate, predicate, { arrayContainsScalar: false });
    }

    // Candidate must be object for field subset semantics
    if (!Validate.isPlainObject(candidate)) return false;

    for (const key of Object.keys(predicate)) {
      const expected = predicate[key];
      const actual = candidate[key];

      if (operatorSupport && ComparisonUtils.isOperatorObject(expected)) {
        if (!ComparisonUtils.applyOperators(actual, expected)) return false;
      } else if (Validate.isPlainObject(expected) && operatorSupport && ComparisonUtils.isOperatorObject(expected)) {
        if (!ComparisonUtils.applyOperators(actual, expected)) return false;
      } else {
        if (!ComparisonUtils.equals(actual, expected, { arrayContainsScalar: false })) return false;
      }
    }
    return true;
  }
}
