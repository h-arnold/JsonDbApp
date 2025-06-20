/**
 * AssertionUtilities.js - Static assertion methods
 * 
 * Contains all assertion methods as static functions for test validation.
 * These utilities are framework-independent and can be used standalone.
 */

/**
 * AssertionUtilities - Static assertion methods for testing
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
   * Assert that a function does not throw an error
   * @param {Function} fn - The function to test
   * @param {string} message - Optional error message
   */
  static assertNoThrow(fn, message = '') {
    try {
      fn();
    } catch (error) {
      const errorMsg = message || `Expected function not to throw, but it threw: ${error.message}`;
      throw new Error(errorMsg);
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
  
  /**
   * Assert that two arrays are equal by comparing length and elements
   * @param {Array} expected - The expected array
   * @param {Array} actual - The actual array
   * @param {string} message - Optional error message
   */
  static assertArrayEquals(expected, actual, message = '') {
    if (!Array.isArray(expected)) {
      throw new Error('First argument must be an array');
    }
    
    if (!Array.isArray(actual)) {
      throw new Error('Second argument must be an array');
    }
    
    if (expected.length !== actual.length) {
      const error = message || `Expected array length ${expected.length}, but got ${actual.length}`;
      throw new Error(error);
    }
    
    for (let i = 0; i < expected.length; i++) {
      if (expected[i] !== actual[i]) {
        const error = message || `Arrays differ at index ${i}: expected ${expected[i]}, but got ${actual[i]}`;
        throw new Error(error);
      }
    }
  }
}
