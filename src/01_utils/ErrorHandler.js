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
 * Immutable set of error code identifiers used by GAS DB errors.
 * @type {{readonly [key: string]: string}}
 */
const ERROR_CODES = Object.freeze({
  GASDB_ERROR: 'GASDB_ERROR',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  INVALID_QUERY: 'INVALID_QUERY',
  LOCK_TIMEOUT: 'LOCK_TIMEOUT',
  FILE_IO_ERROR: 'FILE_IO_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  MASTER_INDEX_ERROR: 'MASTER_INDEX_ERROR',
  COLLECTION_NOT_FOUND: 'COLLECTION_NOT_FOUND',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  OPERATION_ERROR: 'OPERATION_ERROR',
  LOCK_ACQUISITION_FAILURE: 'LOCK_ACQUISITION_FAILURE',
  MODIFICATION_CONFLICT: 'MODIFICATION_CONFLICT',
  COORDINATION_TIMEOUT: 'COORDINATION_TIMEOUT'
});

/**
 * Resolve a builder function or return the value directly.
 * @param {Function|*} value - Either the value itself or a factory function.
 * @returns {*} Resolved value.
 */
function resolveBuilder(value) {
  if (typeof value === 'function') {
    return value();
  }
  return value;
}

/**
 * Create a standardised argument list for GASDBError constructors.
 * Centralises message and context construction to keep subclasses minimal.
 * @param {string} code - Error code identifier.
 * @param {Function|string} messageBuilder - Message string or factory function.
 * @param {Function|Object|null} [contextBuilder=null] - Context object or factory function.
 * @returns {[string, string|null, Object|null]} GASDBError constructor arguments.
 */
function createErrorConstructorArgs(code, messageBuilder, contextBuilder = null) {
  const message = resolveBuilder(messageBuilder);
  const context = resolveBuilder(contextBuilder);
  return [message, code, context === undefined ? null : context];
}

/**
 * Represents a document not found error.
 * @extends GASDBError
 */
class DocumentNotFoundError extends GASDBError {
  /**
   * Create a document not found error.
   * @param {Object} query - Query payload that returned no results.
   * @param {string|null} collectionName - Collection name, if available.
   */
  constructor(query, collectionName = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.DOCUMENT_NOT_FOUND,
        () => `Document not found for query: ${JSON.stringify(query)}`,
        () => ({ query, collectionName })
      )
    );
  }
}

/**
 * Represents a duplicate key error.
 * @extends GASDBError
 */
class DuplicateKeyError extends GASDBError {
  /**
   * Create a duplicate key error.
   * @param {string} key - Field name that violates uniqueness.
   * @param {*} value - Duplicate value.
   * @param {string|null} collectionName - Collection name, if available.
   */
  constructor(key, value, collectionName = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.DUPLICATE_KEY,
        () => `Duplicate key error: ${key} = ${value}`,
        () => ({ key, value, collectionName })
      )
    );
  }
}

/**
 * Represents an invalid query syntax error.
 * @extends GASDBError
 */
class InvalidQueryError extends GASDBError {
  /**
   * Create an invalid query error.
   * @param {Object} query - Invalid query payload.
   * @param {string|null} reason - Optional reason for invalidity.
   */
  constructor(query, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.INVALID_QUERY,
        () => `Invalid query syntax: ${JSON.stringify(query)}`,
        () => ({ query, reason })
      )
    );
  }
}

/**
 * Represents a lock acquisition timeout error.
 * @extends GASDBError
 */
class LockTimeoutError extends GASDBError {
  /**
   * Create a lock timeout error.
   * @param {string} resource - Name of the locked resource.
   * @param {number} timeout - Timeout duration in milliseconds.
   */
  constructor(resource, timeout) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.LOCK_TIMEOUT,
        () => `Failed to acquire lock for resource: ${resource} within ${timeout}ms`,
        () => ({ resource, timeout })
      )
    );
  }
}

/**
 * Represents a file I/O error.
 * @extends GASDBError
 */
class FileIOError extends GASDBError {
  /**
   * Create a file I/O error.
   * @param {string} operation - Operation being performed.
   * @param {string} fileId - Drive file identifier.
   * @param {Error|null} originalError - Original error, if provided.
   */
  constructor(operation, fileId, originalError = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.FILE_IO_ERROR,
        () => `File I/O error during ${operation} for file: ${fileId}`,
        () => ({ operation, fileId, originalError: originalError?.message })
      )
    );
  }
}

/**
 * Represents a conflict detection error.
 * @extends GASDBError
 */
class ConflictError extends GASDBError {
  /**
   * Create a conflict error.
   * @param {string} resource - Resource under contention.
   * @param {string} expectedToken - Expected modification token.
   * @param {string} actualToken - Actual modification token.
   */
  constructor(resource, expectedToken, actualToken) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.CONFLICT_ERROR,
        () => `Conflict detected for resource: ${resource}`,
        () => ({ resource, expectedToken, actualToken })
      )
    );
  }
}

/**
 * Represents a master index access failure error.
 * @extends GASDBError
 */
class MasterIndexError extends GASDBError {
  /**
   * Create a master index error.
   * @param {string} operation - Operation name.
   * @param {string|null} reason - Optional failure reason.
   */
  constructor(operation, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.MASTER_INDEX_ERROR,
        () => `Master index error during ${operation}`,
        () => ({ operation, reason })
      )
    );
  }
}

/**
 * Represents a collection not found error.
 * @extends GASDBError
 */
class CollectionNotFoundError extends GASDBError {
  /**
   * Create a collection not found error.
   * @param {string} collectionName - Missing collection name.
   */
  constructor(collectionName) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.COLLECTION_NOT_FOUND,
        () => `Collection not found: ${collectionName}`,
        () => ({ collectionName })
      )
    );
  }
}

/**
 * Represents an invalid configuration error.
 * @extends GASDBError
 */
class ConfigurationError extends GASDBError {
  /**
   * Create a configuration error.
   * @param {string} setting - Setting name.
   * @param {*} value - Provided value.
   * @param {string|null} reason - Optional reason.
   */
  constructor(setting, value, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.CONFIGURATION_ERROR,
        () => `Invalid configuration for ${setting}: ${value}`,
        () => ({ setting, value, reason })
      )
    );
  }
}

/**
 * Represents a file not found error.
 * @extends GASDBError
 */
class FileNotFoundError extends GASDBError {
  /**
   * Create a file not found error.
   * @param {string} fileId - Missing file identifier.
   */
  constructor(fileId) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.FILE_NOT_FOUND,
        () => `File not found: ${fileId}`,
        () => ({ fileId })
      )
    );
  }
}

/**
 * Represents a permission denied error.
 * @extends GASDBError
 */
class PermissionDeniedError extends GASDBError {
  /**
   * Create a permission denied error.
   * @param {string} fileId - File identifier.
   * @param {string} operation - Operation name.
   */
  constructor(fileId, operation) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.PERMISSION_DENIED,
        () => `Permission denied for ${operation} on file: ${fileId}`,
        () => ({ fileId, operation })
      )
    );
  }
}

/**
 * Represents a quota exceeded error.
 * @extends GASDBError
 */
class QuotaExceededError extends GASDBError {
  /**
   * Create a quota exceeded error.
   * @param {string} operation - Operation name.
   * @param {string} [quotaType='unknown'] - Quota category.
   */
  constructor(operation, quotaType = 'unknown') {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.QUOTA_EXCEEDED,
        () => `Drive API quota exceeded for ${operation} (${quotaType})`,
        () => ({ operation, quotaType })
      )
    );
  }
}

/**
 * Represents an invalid file format error.
 * @extends GASDBError
 */
class InvalidFileFormatError extends GASDBError {
  /**
   * Create an invalid file format error.
   * @param {string} fileId - File identifier.
   * @param {string} expectedFormat - Expected file format.
   * @param {string|null} reason - Optional failure reason.
   */
  constructor(fileId, expectedFormat, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.INVALID_FILE_FORMAT,
        () => `Invalid file format for file: ${fileId}. Expected: ${expectedFormat}`,
        () => ({ fileId, expectedFormat, reason })
      )
    );
  }
}

/**
 * Represents an invalid argument error.
 * @extends GASDBError
 */
class InvalidArgumentError extends GASDBError {
  /**
   * Create an invalid argument error.
   * @param {string} argumentName - Argument name.
   * @param {*} providedValue - Value received.
   * @param {string|null} reason - Optional reason.
   */
  constructor(argumentName, providedValue = null, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.INVALID_ARGUMENT,
        () => {
          const reasonSuffix = reason ? ` - ${reason}` : '';
          return `Invalid argument: ${argumentName}${reasonSuffix}`;
        },
        () => ({ argumentName, providedValue, reason })
      )
    );
  }
}

/**
 * Represents a general operation error.
 * @extends GASDBError
 */
class OperationError extends GASDBError {
  /**
   * Create an operation error.
   * @param {string} operation - Operation name.
   * @param {string|null} reason - Optional reason.
   */
  constructor(operation, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.OPERATION_ERROR,
        () => `Operation failed: ${operation}`,
        () => ({ operation, reason })
      )
    );
  }
}

/**
 * Represents a lock acquisition failure error (distinct from timeout).
 * @extends GASDBError
 */
class LockAcquisitionFailureError extends GASDBError {
  /**
   * Create a lock acquisition failure error.
   * @param {string} resource - Resource name.
   * @param {string|null} reason - Optional reason.
   */
  constructor(resource, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.LOCK_ACQUISITION_FAILURE,
        () => `Failed to acquire lock for resource: ${resource}`,
        () => ({ resource, reason })
      )
    );
  }
}

/**
 * Represents a modification conflict error (distinct from general conflict).
 * @extends GASDBError
 */
class ModificationConflictError extends GASDBError {
  /**
   * Create a modification conflict error.
   * @param {string} resource - Resource name.
   * @param {string} expectedToken - Expected token.
   * @param {string} actualToken - Actual token.
   * @param {string|null} reason - Optional reason.
   */
  constructor(resource, expectedToken, actualToken, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.MODIFICATION_CONFLICT,
        () => `Modification conflict detected for resource: ${resource}`,
        () => ({ resource, expectedToken, actualToken, reason })
      )
    );
  }
}

/**
 * Represents a coordination timeout error.
 * @extends GASDBError
 */
class CoordinationTimeoutError extends GASDBError {
  /**
   * Create a coordination timeout error.
   * @param {string} operation - Operation name.
   * @param {number} timeout - Timeout duration in milliseconds.
   * @param {string|null} reason - Optional reason.
   */
  constructor(operation, timeout, reason = null) {
    super(
      ...createErrorConstructorArgs(
        ERROR_CODES.COORDINATION_TIMEOUT,
        () => `Coordination timeout during ${operation} after ${timeout}ms`,
        () => ({ operation, timeout, reason })
      )
    );
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
    return function (...args) {
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
/**
 * Registry mapping error code identifiers to their corresponding constructors.
 * Keys align with ERROR_CODES entries to keep error creation consistent.
 * @type {Object.<string, typeof GASDBError>}
 */
ErrorHandler.ErrorTypes = {
  [ERROR_CODES.GASDB_ERROR]: GASDBError,
  [ERROR_CODES.DOCUMENT_NOT_FOUND]: DocumentNotFoundError,
  [ERROR_CODES.DUPLICATE_KEY]: DuplicateKeyError,
  [ERROR_CODES.INVALID_QUERY]: InvalidQueryError,
  [ERROR_CODES.LOCK_TIMEOUT]: LockTimeoutError,
  [ERROR_CODES.FILE_IO_ERROR]: FileIOError,
  [ERROR_CODES.CONFLICT_ERROR]: ConflictError,
  [ERROR_CODES.MASTER_INDEX_ERROR]: MasterIndexError,
  [ERROR_CODES.COLLECTION_NOT_FOUND]: CollectionNotFoundError,
  [ERROR_CODES.CONFIGURATION_ERROR]: ConfigurationError,
  [ERROR_CODES.FILE_NOT_FOUND]: FileNotFoundError,
  [ERROR_CODES.PERMISSION_DENIED]: PermissionDeniedError,
  [ERROR_CODES.QUOTA_EXCEEDED]: QuotaExceededError,
  [ERROR_CODES.INVALID_FILE_FORMAT]: InvalidFileFormatError,
  [ERROR_CODES.INVALID_ARGUMENT]: InvalidArgumentError,
  [ERROR_CODES.OPERATION_ERROR]: OperationError,
  [ERROR_CODES.LOCK_ACQUISITION_FAILURE]: LockAcquisitionFailureError,
  [ERROR_CODES.MODIFICATION_CONFLICT]: ModificationConflictError,
  [ERROR_CODES.COORDINATION_TIMEOUT]: CoordinationTimeoutError
};

/**
 * Read-only catalogue of standard error codes available to consumers.
 * Values originate from the shared ERROR_CODES constant and must remain immutable.
 * @type {{readonly [key: string]: string}}
 */
ErrorHandler.ERROR_CODES = ERROR_CODES;
