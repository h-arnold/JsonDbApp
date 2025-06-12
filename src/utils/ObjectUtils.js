/**
 * ObjectUtils - Utilities for object manipulation with Date preservation
 * 
 * Provides utilities for deep cloning objects while preserving Date instances
 * and other complex objects. Used throughout the codebase to avoid JSON 
 * serialization/deserialization that converts Dates to strings.
 */

/**
 * ObjectUtils class providing date-preserving object operations
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
   * Serialise an object to JSON string with proper Date handling
   * @param {*} obj - Object to serialise
   * @returns {string} JSON string with Dates converted to ISO strings
   */
  static serialise(obj) {
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Deserialise JSON string to object with Date restoration
   * @param {string} jsonString - JSON string to deserialise
   * @returns {*} Object with ISO date strings converted back to Date objects
   * @throws {InvalidArgumentError} When jsonString is invalid JSON
   */
  static deserialise(jsonString) {
    if (typeof jsonString !== 'string') {
      throw new InvalidArgumentError('jsonString must be a string');
    }
    
    try {
      const parsed = JSON.parse(jsonString);
      return ObjectUtils.convertDateStringsToObjects(parsed);
    } catch (error) {
      throw new InvalidArgumentError('jsonString must be valid JSON', jsonString, error.message);
    }
  }
}
