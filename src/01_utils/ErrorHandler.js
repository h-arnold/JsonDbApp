/**
 * ErrorHandler - Provides standardised error handling for GAS DB.
 *
 * Defines standard error types and utilities for error creation, validation,
 * and consistent logging across the codebase.
 */

/**
 * Base error class for GAS DB
 */
class GASDBError extends Error {
  /**
   * Create a new GASDBError instance.
   * @param {string} message - Human-readable error message
   * @param {string|null} code - Error code identifier
   * @param {Object|null} context - Contextual metadata for debugging
   */
  constructor(message, code = null, context = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    
    // Maintains proper stack trace for where error was thrown (Node.js only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Convert error to JSON representation
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Document not found error
 */
class DocumentNotFoundError extends GASDBError {
  /**
   * Create a document not found error.
   * @param {Object} query - Query payload that returned no results
   * @param {string|null} collectionName - Collection name, if available
   */
  constructor(query, collectionName = null) {
    const message = `Document not found for query: ${JSON.stringify(query)}`;
    super(message, 'DOCUMENT_NOT_FOUND', { query, collectionName });
  }
}

/**
 * Duplicate key error
 */
class DuplicateKeyError extends GASDBError {
  /**
   * Create a duplicate key error.
   * @param {string} key - Field name that violates uniqueness
   * @param {*} value - Duplicate value
   * @param {string|null} collectionName - Collection name, if available
   */
  constructor(key, value, collectionName = null) {
    const message = `Duplicate key error: ${key} = ${value}`;
    super(message, 'DUPLICATE_KEY', { key, value, collectionName });
  }
}

/**
 * Invalid query syntax error
 */
class InvalidQueryError extends GASDBError {
  /**
   * Create an invalid query error.
   * @param {Object} query - Invalid query payload
   * @param {string|null} reason - Optional reason for invalidity
   */
  constructor(query, reason = null) {
    const message = `Invalid query syntax: ${JSON.stringify(query)}`;
    super(message, 'INVALID_QUERY', { query, reason });
  }
}

/**
 * Lock acquisition timeout error
 */
class LockTimeoutError extends GASDBError {
  /**
   * Create a lock timeout error.
   * @param {string} resource - Name of the locked resource
   * @param {number} timeout - Timeout duration in milliseconds
   */
  constructor(resource, timeout) {
    const message = `Failed to acquire lock for resource: ${resource} within ${timeout}ms`;
    super(message, 'LOCK_TIMEOUT', { resource, timeout });
  }
}
 
/**
 * File I/O error
 */
class FileIOError extends GASDBError {
  /**
   * Create a file I/O error.
   * @param {string} operation - Operation being performed
   * @param {string} fileId - Drive file identifier
   * @param {Error|null} originalError - Original error, if provided
   */
  constructor(operation, fileId, originalError = null) {
    const message = `File I/O error during ${operation} for file: ${fileId}`;
    super(message, 'FILE_IO_ERROR', { operation, fileId, originalError: originalError?.message });
  }
}

/**
 * Conflict detection error
 */
class ConflictError extends GASDBError {
  /**
   * Create a conflict error.
   * @param {string} resource - Resource under contention
   * @param {string} expectedToken - Expected modification token
   * @param {string} actualToken - Actual modification token
   */
  constructor(resource, expectedToken, actualToken) {
    const message = `Conflict detected for resource: ${resource}`;
    super(message, 'CONFLICT_ERROR', { resource, expectedToken, actualToken });
  }
}

/**
 * Master index access failure error
 */
class MasterIndexError extends GASDBError {
  /**
   * Create a master index error.
   * @param {string} operation - Operation name
   * @param {string|null} reason - Optional failure reason
   */
  constructor(operation, reason = null) {
    const message = `Master index error during ${operation}`;
    super(message, 'MASTER_INDEX_ERROR', { operation, reason });
  }
}

/**
 * Collection not found error
 */
class CollectionNotFoundError extends GASDBError {
  /**
   * Create a collection not found error.
   * @param {string} collectionName - Missing collection name
   */
  constructor(collectionName) {
    const message = `Collection not found: ${collectionName}`;
    super(message, 'COLLECTION_NOT_FOUND', { collectionName });
  }
}

/**
 * Invalid configuration error
 */
class ConfigurationError extends GASDBError {
  /**
   * Create a configuration error.
   * @param {string} setting - Setting name
   * @param {*} value - Provided value
   * @param {string|null} reason - Optional reason
   */
  constructor(setting, value, reason = null) {
    const message = `Invalid configuration for ${setting}: ${value}`;
    super(message, 'CONFIGURATION_ERROR', { setting, value, reason });
  }
}

/**
 * File not found error
 */
class FileNotFoundError extends GASDBError {
  /**
   * Create a file not found error.
   * @param {string} fileId - Missing file identifier
   */
  constructor(fileId) {
    const message = `File not found: ${fileId}`;
    super(message, 'FILE_NOT_FOUND', { fileId });
  }
}

/**
 * Permission denied error
 */
class PermissionDeniedError extends GASDBError {
  /**
   * Create a permission denied error.
   * @param {string} fileId - File identifier
   * @param {string} operation - Operation name
   */
  constructor(fileId, operation) {
    const message = `Permission denied for ${operation} on file: ${fileId}`;
    super(message, 'PERMISSION_DENIED', { fileId, operation });
  }
}

/**
 * Quota exceeded error
 */
class QuotaExceededError extends GASDBError {
  /**
   * Create a quota exceeded error.
   * @param {string} operation - Operation name
   * @param {string} quotaType - Quota category
   */
  constructor(operation, quotaType = 'unknown') {
    const message = `Drive API quota exceeded for ${operation} (${quotaType})`;
    super(message, 'QUOTA_EXCEEDED', { operation, quotaType });
  }
}

/**
 * Invalid file format error
 */
class InvalidFileFormatError extends GASDBError {
  /**
   * Create an invalid file format error.
   * @param {string} fileId - File identifier
   * @param {string} expectedFormat - Expected file format
   * @param {string|null} reason - Optional failure reason
   */
  constructor(fileId, expectedFormat, reason = null) {
    const message = `Invalid file format for file: ${fileId}. Expected: ${expectedFormat}`;
    super(message, 'INVALID_FILE_FORMAT', { fileId, expectedFormat, reason });
  }
}

/**
 * Invalid argument error
 */
class InvalidArgumentError extends GASDBError {
  /**
   * Create an invalid argument error.
   * @param {string} argumentName - Argument name
   * @param {*} providedValue - Value received
   * @param {string|null} reason - Optional reason
   */
  constructor(argumentName, providedValue = null, reason = null) {
    let message = `Invalid argument: ${argumentName}`;
    if (reason) {
      message += ` - ${reason}`;
    }
    super(message, 'INVALID_ARGUMENT', { argumentName, providedValue, reason });
  }
}

/**
 * General operation error
 */
class OperationError extends GASDBError {
  /**
   * Create an operation error.
   * @param {string} operation - Operation name
   * @param {string|null} reason - Optional reason
   */
  constructor(operation, reason = null) {
    const message = `Operation failed: ${operation}`;
    super(message, 'OPERATION_ERROR', { operation, reason });
  }
}

/**
 * Lock acquisition failure error (distinct from timeout)
 */
class LockAcquisitionFailureError extends GASDBError {
  /**
   * Create a lock acquisition failure error.
   * @param {string} resource - Resource name
   * @param {string|null} reason - Optional reason
   */
  constructor(resource, reason = null) {
    const message = `Failed to acquire lock for resource: ${resource}`;
    super(message, 'LOCK_ACQUISITION_FAILURE', { resource, reason });
  }
}

/**
 * Modification conflict error (distinct from general conflict)
 */
class ModificationConflictError extends GASDBError {
  /**
   * Create a modification conflict error.
   * @param {string} resource - Resource name
   * @param {string} expectedToken - Expected token
   * @param {string} actualToken - Actual token
   * @param {string|null} reason - Optional reason
   */
  constructor(resource, expectedToken, actualToken, reason = null) {
    const message = `Modification conflict detected for resource: ${resource}`;
    super(message, 'MODIFICATION_CONFLICT', { resource, expectedToken, actualToken, reason });
  }
}

/**
 * Coordination timeout error
 */
class CoordinationTimeoutError extends GASDBError {
  /**
   * Create a coordination timeout error.
   * @param {string} operation - Operation name
   * @param {number} timeout - Timeout duration in milliseconds
   * @param {string|null} reason - Optional reason
   */
  constructor(operation, timeout, reason = null) {
    const message = `Coordination timeout during ${operation} after ${timeout}ms`;
    super(message, 'COORDINATION_TIMEOUT', { operation, timeout, reason });
  }
}

/**
 * ErrorHandler - Main error handling utility class
 */
class ErrorHandler {
  
  /**
   * Create a new error of the specified type
   * @param {string} errorType - The error type name
   * @param {...any} args - Arguments to pass to the error constructor
   * @returns {Error} The created error
   */
  static createError(errorType, ...args) {
    const ErrorClass = ErrorHandler.ErrorTypes[errorType];
    if (!ErrorClass) {
      throw new Error(`Unknown error type: ${errorType}`);
    }
    return new ErrorClass(...args);
  }
  
  /**
   * Handle an error with appropriate logging and optional re-throwing
   * @param {Error} error - The error to handle
   * @param {string} context - Context where the error occurred
   * @param {boolean} rethrow - Whether to re-throw the error (default: true)
   */
  static handleError(error, context = 'Unknown', rethrow = true) {
    const errorInfo = {
      context,
      type: error.constructor.name,
      message: error.message
    };
    
    if (error instanceof GASDBError) {
      errorInfo.code = error.code;
      errorInfo.errorContext = error.context;
    }
    
    JDbLogger.error(`Error in ${context}: ${error.message}`, errorInfo);
    
    if (rethrow) {
      throw error;
    }
  }
  
  /**
   * Wrap a function with error handling
   * @param {Function} fn - The function to wrap
   * @param {string} context - Context description for error logging
   * @returns {Function} The wrapped function
   */
  static wrapFunction(fn, context) {
    return function(...args) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        ErrorHandler.handleError(error, context, true);
      }
    };
  }
  
  /**
   * Validate that a value is not null or undefined
   * @param {*} value - The value to validate
   * @param {string} name - The name of the value for error messages
   * @throws {Error} If value is null or undefined
   */
  static validateRequired(value, name) {
    // Delegate to ValidationUtils for standardised validation
    Validate.required(value, name);
  }
  
  /**
   * Validate that a value is of the expected type
   * @param {*} value - The value to validate
   * @param {string} expectedType - The expected type name
   * @param {string} name - The name of the value for error messages
   * @throws {Error} If value is not of expected type
   */
  static validateType(value, expectedType, name) {
    const actualType = typeof value;
    if (actualType !== expectedType) {
      throw new Error(`Parameter ${name} must be of type ${expectedType}, got ${actualType}`);
    }
  }
  
  /**
   * Validate that a string is not empty
   * @param {string} value - The string to validate
   * @param {string} name - The name of the value for error messages
   * @throws {Error} If string is empty
   */
  static validateNotEmpty(value, name) {
    ErrorHandler.validateType(value, 'string', name);
    if (value.trim().length === 0) {
      throw new Error(`Parameter ${name} cannot be empty`);
    }
  }
  
  /**
   * Validate that an array contains elements
   * @param {Array} value - The array to validate
   * @param {string} name - The name of the value for error messages
   * @throws {Error} If array is empty
   */
  static validateNotEmptyArray(value, name) {
    if (!Array.isArray(value)) {
      throw new Error(`Parameter ${name} must be an array`);
    }
    if (value.length === 0) {
      throw new Error(`Parameter ${name} cannot be empty`);
    }
  }
  
  /**
   * Validate that a value is within a specific range
   * @param {number} value - The value to validate
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @param {string} name - The name of the value for error messages
   * @throws {Error} If value is out of range
   */
  static validateRange(value, min, max, name) {
    ErrorHandler.validateType(value, 'number', name);
    if (value < min || value > max) {
      throw new Error(`Parameter ${name} must be between ${min} and ${max}, got ${value}`);
    }
  }
  
  /**
   * Check if an error is of a specific type
   * @param {Error} error - The error to check
   * @param {string} errorType - The error type name to check for
   * @returns {boolean} True if error is of the specified type
   */
  static isErrorType(error, errorType) {
    const ErrorClass = ErrorHandler.ErrorTypes[errorType];
    return ErrorClass && error instanceof ErrorClass;
  }
  
  /**
   * Extract error information for logging or API responses
   * @param {Error} error - The error to extract information from
   * @returns {Object} Error information object
   */
  static extractErrorInfo(error) {
    const info = {
      type: error.constructor.name,
      message: error.message,
      timestamp: new Date()
    };
    
    if (error instanceof GASDBError) {
      info.code = error.code;
      info.context = error.context;
      info.errorTimestamp = error.timestamp;
    }
    
    return info;
  }
  
  /**
   * Detects if someone is trying to JSON.parse() an already-parsed object
   * Provides helpful error message for this common mistake
   * @param {any} data - The data being parsed
   * @param {Error} parseError - The original JSON.parse error
   * @param {string} context - Context where this occurred (e.g., 'FileOperations.readFile')
   * @throws {OperationError} With helpful message if double-parsing detected
   */
  static detectDoubleParsing(data, parseError, context = 'JSON parsing') {
    // Check if the "JSON string" is actually an object
    if (typeof data === 'object' && data !== null) {
      const errorMessage = 
        `Attempted to JSON.parse() an already-parsed object in ${context}. ` +
        'FileOperations and FileService return parsed JavaScript objects, not JSON strings. ' +
        'Use the returned object directly instead of calling JSON.parse() on it. ' +
        '\n\n' +
        'Common fix: Change "JSON.parse(fileService.readFile(id))" to "fileService.readFile(id)"';
      
      JDbLogger.error('Double JSON parsing detected', {
        context,
        dataType: typeof data,
        isArray: Array.isArray(data),
        hasKeys: data && typeof data === 'object' ? Object.keys(data).length > 0 : false,
        originalError: parseError.message,
        suggestion: 'Remove JSON.parse() call - data is already parsed'
      });
      
      throw new OperationError('Double JSON parsing error', errorMessage);
    }
  }
}

// initialise static properties after class declaration
ErrorHandler.ErrorTypes = {
  GASDB_ERROR: GASDBError,
  DOCUMENT_NOT_FOUND: DocumentNotFoundError,
  DUPLICATE_KEY: DuplicateKeyError,
  INVALID_QUERY: InvalidQueryError,
  LOCK_TIMEOUT: LockTimeoutError,
  FILE_IO_ERROR: FileIOError,
  CONFLICT_ERROR: ConflictError,
  MASTER_INDEX_ERROR: MasterIndexError,
  COLLECTION_NOT_FOUND: CollectionNotFoundError,
  CONFIGURATION_ERROR: ConfigurationError,
  FILE_NOT_FOUND: FileNotFoundError,
  PERMISSION_DENIED: PermissionDeniedError,
  QUOTA_EXCEEDED: QuotaExceededError,
  INVALID_FILE_FORMAT: InvalidFileFormatError,
  INVALID_ARGUMENT: InvalidArgumentError,
  OPERATION_ERROR: OperationError,
  LOCK_ACQUISITION_FAILURE: LockAcquisitionFailureError,
  MODIFICATION_CONFLICT: ModificationConflictError,
  COORDINATION_TIMEOUT: CoordinationTimeoutError
};
