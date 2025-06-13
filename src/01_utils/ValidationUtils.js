/**
 * ValidationUtils - Common validation utilities to reduce code duplication
 * 
 * Provides static methods for common validation patterns used throughout the codebase.
 * Throws standardised ErrorHandler.ErrorTypes.INVALID_ARGUMENT exceptions for consistency.
 */
class Validate {
  
  /**
   * Validate that a value is not null or undefined
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is null or undefined
   */
  static required(value, paramName) {
    if (value === null || value === undefined) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'is required');
    }
  }

  /**
   * Validate that a value is of the expected type
   * @param {*} value - The value to validate
   * @param {string} expectedType - Expected type ('string', 'number', 'boolean', 'object', 'function')
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not of expected type
   */
  static type(value, expectedType, paramName) {
    const actualType = typeof value;
    if (actualType !== expectedType) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, `must be of type ${expectedType}, got ${actualType}`);
    }
  }

  /**
   * Validate that a value is a non-empty string
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a non-empty string
   */
  static nonEmptyString(value, paramName) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be a non-empty string');
    }
  }

  /**
   * Validate that a value is a string (can be empty)
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a string
   */
  static string(value, paramName) {
    if (typeof value !== 'string') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be a string');
    }
  }

  /**
   * Validate that a value is an object (not array or null)
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a valid object
   */
  static object(value, paramName) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be an object');
    }
  }

  /**
   * Validate that a value is a boolean
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a boolean
   */
  static boolean(value, paramName) {
    if (typeof value !== 'boolean') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be a boolean');
    }
  }

  /**
   * Validate that a value is an array
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not an array
   */
  static array(value, paramName) {
    if (!Array.isArray(value)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be an array');
    }
  }

  /**
   * Validate that a value is a non-empty array
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a non-empty array
   */
  static nonEmptyArray(value, paramName) {
    this.array(value, paramName);
    if (value.length === 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be a non-empty array');
    }
  }

  /**
   * Validate that a value is a number
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a number
   */
  static number(value, paramName) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be a number');
    }
  }

  /**
   * Validate that a value is an integer
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not an integer
   */
  static integer(value, paramName) {
    this.number(value, paramName);
    if (!Number.isInteger(value)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be an integer');
    }
  }

  /**
   * Validate that a value is a positive number
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a positive number
   */
  static positiveNumber(value, paramName) {
    this.number(value, paramName);
    if (value <= 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be a positive number');
    }
  }

  /**
   * Validate that a value is a non-negative number
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a non-negative number
   */
  static nonNegativeNumber(value, paramName) {
    this.number(value, paramName);
    if (value < 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be a non-negative number');
    }
  }

  /**
   * Validate that a number is within a specific range
   * @param {number} value - The value to validate
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is out of range
   */
  static range(value, min, max, paramName) {
    this.number(value, paramName);
    if (value < min || value > max) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, `must be between ${min} and ${max}`);
    }
  }

  /**
   * Validate that a value is a function
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not a function
   */
  static func(value, paramName) {
    if (typeof value !== 'function') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, 'must be a function');
    }
  }

  /**
   * Validate that a value is one of the allowed values
   * @param {*} value - The value to validate
   * @param {Array} allowedValues - Array of allowed values
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When value is not in allowed values
   */
  static enum(value, allowedValues, paramName) {
    this.array(allowedValues, 'allowedValues');
    if (!allowedValues.includes(value)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, `must be one of: ${allowedValues.join(', ')}`);
    }
  }

  /**
   * Validate that an object has required properties
   * @param {Object} obj - The object to validate
   * @param {Array<string>} requiredProps - Array of required property names
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When object is missing required properties
   */
  static objectProperties(obj, requiredProps, paramName) {
    this.object(obj, paramName);
    this.nonEmptyArray(requiredProps, 'requiredProps');
    
    for (const prop of requiredProps) {
      if (!obj.hasOwnProperty(prop)) {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, obj, `must have property '${prop}'`);
      }
    }
  }

  /**
   * Validate that a string matches a pattern
   * @param {string} value - The string to validate
   * @param {RegExp} pattern - Regular expression pattern to match
   * @param {string} paramName - Parameter name for error messages
   * @param {string} description - Description of the pattern for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When string doesn't match pattern
   */
  static pattern(value, pattern, paramName, description = 'the required pattern') {
    this.string(value, paramName);
    if (!(pattern instanceof RegExp)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('pattern', pattern, 'must be a RegExp');
    }
    if (!pattern.test(value)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, `must match ${description}`);
    }
  }

  /**
   * Validate that a value is null, undefined, or passes validation function
   * @param {*} value - The value to validate
   * @param {Function} validationFn - Function that validates the value if not null/undefined
   * @param {string} paramName - Parameter name for error messages
   */
  static optional(value, validationFn, paramName) {
    if (value !== null && value !== undefined) {
      this.func(validationFn, 'validationFn');
      validationFn(value, paramName);
    }
  }

  /**
   * Validate multiple conditions with logical AND
   * @param {Array<Function>} validators - Array of validation functions
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   */
  static all(validators, value, paramName) {
    this.nonEmptyArray(validators, 'validators');
    for (const validator of validators) {
      this.func(validator, 'validator');
      validator(value, paramName);
    }
  }

  /**
   * Validate that at least one condition passes with logical OR
   * @param {Array<Function>} validators - Array of validation functions
   * @param {*} value - The value to validate
   * @param {string} paramName - Parameter name for error messages
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When none of the validators pass
   */
  static any(validators, value, paramName) {
    this.nonEmptyArray(validators, 'validators');
    
    const errors = [];
    for (const validator of validators) {
      this.func(validator, 'validator');
      try {
        validator(value, paramName);
        return; // Success - at least one validator passed
      } catch (error) {
        errors.push(error.message);
      }
    }
    
    // All validators failed
    throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(paramName, value, `failed all validation conditions: ${errors.join('; ')}`);
  }
}
