/**
 * ObjectUtils - Utilities for object manipulation with Date preservation
 *
 * Provides utilities for deep cloning objects while preserving Date instances
 * and other complex objects. Used throughout the codebase to avoid JSON
 * serialisation/deserialisation that converts Dates to strings.
 */

/**
 * ObjectUtils class providing date-preserving object operations
 */
/* exported ObjectUtils */
/**
 * Static helper collection for cloning, serialising, and reviving objects
 * while preserving Dates and registered class instances.
 */
class ObjectUtils {
  /**
   * Deep clone an object while preserving Date instances and other complex objects
   * @param {*} obj - Object to clone (can be any type)
   * @returns {*} Deep clone of the object with Date instances preserved
   */
  static deepClone(obj) {
    // Handle primitives and null/undefined
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => ObjectUtils.deepClone(item));
    }

    // Handle regular objects
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = ObjectUtils.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Recursively convert ISO date strings to Date objects
   * @param {*} obj - Object to process (can be any type)
   * @returns {*} Object with ISO date strings converted to Date instances
   */
  static convertDateStringsToObjects(obj) {
    if (ObjectUtils._isNullish(obj)) {
      return obj;
    }

    if (typeof obj === 'string') {
      return ObjectUtils._convertStringToDate(obj);
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return ObjectUtils._convertArrayDateStrings(obj);
    }

    return ObjectUtils._convertObjectDateStrings(obj);
  }

  /**
   * Check if a string is an ISO date string
   * @private
   * @param {string} str - String to check
   * @returns {boolean} True if it's an ISO date string
   */
  static _isISODateString(str) {
    // ISO date pattern: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ (Z is required)
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
    return isoDatePattern.test(str) && !isNaN(Date.parse(str));
  }

  /**
   * Registry of classes for JSON reviving
   * @private
   * @returns {Object<string, Function>} Class registry for reviver lookups
   */
  static get _classRegistry() {
    return {
      CollectionMetadata,
      DatabaseConfig
    };
  }

  /**
   * JSON reviver function to restore class instances and Dates
   * @param {string} key - Property key
   * @param {*} value - Parsed value
   * @returns {*} Revived value or original
   * @private
   */
  static _reviver(key, value) {
    if (value && typeof value === 'object') {
      // Class instances
      const type = value.__type;
      if (typeof type === 'string' && ObjectUtils._classRegistry[type]) {
        return ObjectUtils._classRegistry[type].fromJSON(value);
      }
    }
    // Fallback: convert ISO date strings
    return ObjectUtils.convertDateStringsToObjects(value);
  }

  /**
   * Serialise an object to JSON string using toJSON hooks
   * @param {*} obj - Object to serialise
   * @param {number|string} [space] - Indentation for pretty-print
   * @returns {string} JSON string
   */
  static serialise(obj, space) {
    return JSON.stringify(obj, null, space);
  }

  /**
   * Deserialise JSON string to object with class revival and Date restoration
   * @param {string} jsonString - JSON string to deserialise
   * @returns {*} Revived object
   * @throws {InvalidArgumentError} When jsonString is invalid JSON
   */
  static deserialise(jsonString) {
    if (typeof jsonString !== 'string') {
      throw new InvalidArgumentError('jsonString', jsonString, 'Must be a string');
    }
    try {
      return JSON.parse(jsonString, ObjectUtils._reviver);
    } catch (error) {
      throw new InvalidArgumentError('jsonString', jsonString, 'Invalid JSON: ' + error.message);
    }
  }

  /**
   * Recursively compare two values (arrays or objects) for deep equality.
   * @param {*} a - First value for comparison.
   * @param {*} b - Second value for comparison.
   * @returns {boolean} True if values are deeply equal, false otherwise.
   */
  static deepEqual(a, b) {
    if (a === b) return true;
    if (ObjectUtils._isEitherNullish(a, b)) return false;

    const dateEquality = ObjectUtils._compareDateEquality(a, b);
    if (dateEquality !== null) return dateEquality;

    if (typeof a !== 'object' || typeof b !== 'object') return false;

    return ObjectUtils._compareStructuredEquality(a, b);
  }

  /**
   * Check if a value is null or undefined.
   * @param {*} value - Value to inspect
   * @returns {boolean} True when nullish
   * @private
   */
  static _isNullish(value) {
    return value === null || value === undefined;
  }

  /**
   * Check if either value is null or undefined.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when either value is nullish
   * @private
   */
  static _isEitherNullish(a, b) {
    return ObjectUtils._isNullish(a) || ObjectUtils._isNullish(b);
  }

  /**
   * Convert a string to a Date if it is ISO formatted.
   * @param {string} value - String value
   * @returns {string|Date} Converted value
   * @private
   */
  static _convertStringToDate(value) {
    if (ObjectUtils._isISODateString(value)) {
      return new Date(value);
    }
    return value;
  }

  /**
   * Convert ISO date strings inside an array.
   * @param {Array} array - Array to process
   * @returns {Array} Updated array
   * @private
   */
  static _convertArrayDateStrings(array) {
    array.forEach((item, index) => {
      array[index] = ObjectUtils.convertDateStringsToObjects(item);
    });
    return array;
  }

  /**
   * Convert ISO date strings inside an object.
   * @param {Object} obj - Object to process
   * @returns {Object} Updated object
   * @private
   */
  static _convertObjectDateStrings(obj) {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (typeof value === 'string') {
        obj[key] = ObjectUtils._convertStringToDate(value);
        return;
      }

      if (value && typeof value === 'object') {
        obj[key] = ObjectUtils.convertDateStringsToObjects(value);
      }
    });

    return obj;
  }

  /**
   * Compare date equality when both values are dates.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean|null} True/false for dates, null otherwise
   * @private
   */
  static _compareDateEquality(a, b) {
    if (!(a instanceof Date && b instanceof Date)) {
      return null;
    }
    return a.getTime() === b.getTime();
  }

  /**
   * Compare array equality, handling mismatched array types.
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True when equal arrays
   * @private
   */
  static _compareArraysForEquality(a, b) {
    if (!(Array.isArray(a) && Array.isArray(b))) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!ObjectUtils.deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  /**
   * Compare structured values (arrays or objects).
   * @param {Object|Array} a - First value
   * @param {Object|Array} b - Second value
   * @returns {boolean} True when equal
   * @private
   */
  static _compareStructuredEquality(a, b) {
    if (Array.isArray(a) || Array.isArray(b)) {
      return ObjectUtils._compareArraysForEquality(a, b);
    }

    return ObjectUtils._compareObjectsForEquality(a, b);
  }

  /**
   * Compare object equality by keys and values.
   * @param {Object} a - First object
   * @param {Object} b - Second object
   * @returns {boolean} True when equal
   * @private
   */
  static _compareObjectsForEquality(a, b) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!ObjectUtils.deepEqual(a[key], b[key])) return false;
    }

    return true;
  }
}
