/**
 * AssertionUtilities - Provides assertion methods for testing in Google Apps Script
 * 
 * This class provides assertion methods similar to those found in traditional testing
 * frameworks, adapted for the Google Apps Script environment.
 */
class AssertionUtilities {
  
  /**
   * Assert that two values are equal
   * @param {*} expected - The expected value
   * @param {*} actual - The actual value  
   * @param {string} message - Optional error message
   */
  static assertEquals(expected, actual, message = '') {
    if (expected !== actual) {
      const error = message || `Expected: ${expected}, but got: ${actual}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that two values are not equal
   * @param {*} expected - The value that should not match
   * @param {*} actual - The actual value
   * @param {string} message - Optional error message
   */
  static assertNotEquals(expected, actual, message = '') {
    if (expected === actual) {
      const error = message || `Expected values to be different, but both were: ${actual}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a condition is true
   * @param {boolean} condition - The condition to test
   * @param {string} message - Optional error message
   */
  static assertTrue(condition, message = '') {
    if (!condition) {
      const error = message || `Expected condition to be true, but it was false`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a condition is false
   * @param {boolean} condition - The condition to test
   * @param {string} message - Optional error message
   */
  static assertFalse(condition, message = '') {
    if (condition) {
      const error = message || `Expected condition to be false, but it was true`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a value is defined (not undefined)
   * @param {*} value - The value to test
   * @param {string} message - Optional error message
   */
  static assertDefined(value, message = '') {
    if (value === undefined) {
      const error = message || `Expected value to be defined, but it was undefined`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a value is undefined
   * @param {*} value - The value to test
   * @param {string} message - Optional error message
   */
  static assertUndefined(value, message = '') {
    if (value !== undefined) {
      const error = message || `Expected value to be undefined, but it was: ${value}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a value is null
   * @param {*} value - The value to test
   * @param {string} message - Optional error message
   */
  static assertNull(value, message = '') {
    if (value !== null) {
      const error = message || `Expected value to be null, but it was: ${value}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a value is not null
   * @param {*} value - The value to test
   * @param {string} message - Optional error message
   */
  static assertNotNull(value, message = '') {
    if (value === null) {
      const error = message || `Expected value to not be null`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a function throws an error
   * @param {Function} fn - The function to test
   * @param {Function} errorType - Optional expected error type/constructor
   * @param {string} message - Optional error message
   */
  static assertThrows(fn, errorType = null, message = '') {
    let threwError = false;
    let actualError = null;
    
    try {
      fn();
    } catch (error) {
      threwError = true;
      actualError = error;
      
      if (errorType && !(error instanceof errorType)) {
        const typeError = message || `Expected error of type ${errorType.name}, but got ${error.constructor.name}`;
        throw new Error(typeError);
      }
    }
    
    if (!threwError) {
      const noThrowError = message || `Expected function to throw an error, but it didn't`;
      throw new Error(noThrowError);
    }
  }
  
  /**
   * Assert that an array contains a specific element
   * @param {Array} array - The array to search
   * @param {*} element - The element to find
   * @param {string} message - Optional error message
   */
  static assertContains(array, element, message = '') {
    if (!Array.isArray(array)) {
      throw new Error('First argument must be an array');
    }
    
    if (array.indexOf(element) === -1) {
      const error = message || `Expected array to contain element: ${element}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a string matches a regular expression
   * @param {string} string - The string to test
   * @param {RegExp} regex - The regular expression to match
   * @param {string} message - Optional error message
   */
  static assertMatches(string, regex, message = '') {
    if (typeof string !== 'string') {
      throw new Error('First argument must be a string');
    }
    
    if (!(regex instanceof RegExp)) {
      throw new Error('Second argument must be a RegExp');
    }
    
    if (!regex.test(string)) {
      const error = message || `Expected string "${string}" to match pattern ${regex}`;
      throw new Error(error);
    }
  }
}
