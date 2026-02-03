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
      return obj.map(item => ObjectUtils.deepClone(item));
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
    // Handle primitives and null/undefined
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    // Handle string primitives - check if they're ISO date strings
    if (typeof obj === 'string') {
      if (ObjectUtils._isISODateString(obj)) {
        return new Date(obj);
      }
      return obj;
    }
    
    // Handle non-object types (numbers, booleans, etc.)
    if (typeof obj !== 'object') {
      return obj;
    }
    
    // Handle Date objects (already converted)
    if (obj instanceof Date) {
      return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        obj[index] = ObjectUtils.convertDateStringsToObjects(item);
      });
      return obj;
    }
    
    // Handle objects
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      // Check if it's an ISO date string
      if (typeof value === 'string' && ObjectUtils._isISODateString(value)) {
        obj[key] = new Date(value);
      } else if (value && typeof value === 'object') {
        // Recursively process nested objects/arrays
        obj[key] = ObjectUtils.convertDateStringsToObjects(value);
      }
    });
    
    return obj;
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
      // Strict equality check for primitives and same-instance objects
      if (a === b) return true;

      // If one is null/undefined, they must both be so
      if (a === null || a === undefined || b === null || b === undefined) return a === b;

      // Handle Dates
      if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
      }

      // Types must be the same
      if (typeof a !== 'object' || typeof b !== 'object') return false;

      // Handle arrays
      if (Array.isArray(a) && Array.isArray(b)) {
        // Arrays with different lengths are not equal
        if (a.length !== b.length) return false;
        // Recursively compare each element
        for (let i = 0; i < a.length; i++) {
          if (!ObjectUtils.deepEqual(a[i], b[i])) return false;
        }
        return true;
      }

      // If one is an array and the other is not, they are not equal
      if (Array.isArray(a) || Array.isArray(b)) return false;

      // Handle objects
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      // Objects with different number of keys are not equal
      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        // If a key from A is not in B, they are not equal
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        // Recursively compare the values of each key
        if (!ObjectUtils.deepEqual(a[key], b[key])) return false;
      }

      // If all keys and values match, the objects are equal
      return true;
  }
}
