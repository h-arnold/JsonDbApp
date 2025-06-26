/**
 * FileOperations - Direct Drive API interaction component
 * 
 * This class provides low-level file operations with Google Drive API,
 * including retry logic, error handling, and robust Drive API interactions.
 * Handles all direct DriveApp calls and provides foundation for FileService.
 */

/**
 * FileOperations class for direct Drive API interactions
 */
class FileOperations {
  /**
   * Creates a new FileOperations instance
   * @param {Object} logger - Logger instance for operation tracking (optional)
   */
  constructor(logger = null) {
    // Create component logger if no logger provided, or use provided logger
    this._logger = logger || JDbLogger.createComponentLogger('FileOperations');
    this._maxRetries = 3;
    this._retryDelayMs = 1000;
    
    this._logger.debug('FileOperations initialised', {
      maxRetries: this._maxRetries,
      retryDelayMs: this._retryDelayMs
    });
  }
  
  /**
   * Read file content from Drive
   * @param {string} fileId - Drive file ID to read
   * @returns {Object} Parsed JSON content from the file
   * @throws {FileNotFoundError} When file doesn't exist
   * @throws {PermissionDeniedError} When access is denied
   * @throws {InvalidFileFormatError} When file contains invalid JSON
   */
  readFile(fileId) {
    if (!fileId) {
      throw new InvalidArgumentError('fileId is required');
    }
    
    this._logger.debug('Reading file from Drive', { fileId });
    
    return this._retryOperation(() => {
      let file, content;
      
      // Handle Drive API operations separately from JSON parsing
      try {
        file = DriveApp.getFileById(fileId);
        content = file.getBlob().getDataAsString();
        
        this._logger.debug('File content retrieved', { 
          fileId, 
          contentLength: content.length 
        });
      } catch (driveError) {
        // Only Drive API errors should be handled by _handleDriveApiError
        this._handleDriveApiError(driveError, 'readFile', fileId);
      }
      
      // Parse JSON and convert dates - let InvalidFileFormatError bubble up to retry logic
      try {
        const parsedContent = ObjectUtils.deserialise(content);
        
        // Validate that parsed content is an object or array (not a primitive string, number, etc.)
        if (parsedContent === null || (typeof parsedContent !== 'object')) {
          throw new InvalidFileFormatError(fileId, 'JSON object or array', `Expected object/array but got ${typeof parsedContent}`);
        }
        
        this._logger.debug('File content parsed successfully', { fileId });
        return parsedContent;
      } catch (parseError) {
        // Check if this is a double-parsing attempt using centralized utility
        if (parseError instanceof ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT) {
          // Re-throw our own validation errors
          throw parseError;
        }
        
        ErrorHandler.detectDoubleParsing(content, parseError, 'FileOperations.readFile');
        
        this._logger.error('Failed to parse JSON content', { 
          fileId, 
          error: parseError.message 
        });
        
        // Reintroduce throw to propagate the error
        throw new InvalidFileFormatError(fileId, 'JSON', parseError.message);
      }
    }, `readFile(${fileId})`);
  }
  
  /**
   * Write data to existing Drive file
   * @param {string} fileId - Drive file ID to write to
   * @param {Object} data - Data to write as JSON
   * @throws {FileNotFoundError} When file doesn't exist
   * @throws {PermissionDeniedError} When write access is denied
   */
  writeFile(fileId, data) {
    if (!fileId) {
      throw new InvalidArgumentError('fileId is required');
    }
    if (data === null || data === undefined) {
      throw new InvalidArgumentError('data is required');
    }
    
    this._logger.debug('Writing file to Drive', { fileId });
    
    return this._retryOperation(() => {
      try {
        const file = DriveApp.getFileById(fileId);
        const jsonContent = ObjectUtils.serialise(data);
        
        file.setContent(jsonContent);
        
        this._logger.debug('File written successfully', { 
          fileId, 
          contentLength: jsonContent.length 
        });
        
      } catch (error) {
        this._handleDriveApiError(error, 'writeFile', fileId);
      }
    }, `writeFile(${fileId})`);
  }
  
  /**
   * Create new file in specified folder
   * @param {string} fileName - Name for the new file
   * @param {Object} data - Initial data to write as JSON
   * @param {string} folderId - Drive folder ID (optional, defaults to root)
   * @returns {string} Drive file ID of created file
   * @throws {PermissionDeniedError} When folder access is denied
   */
  createFile(fileName, data, folderId = null) {
    if (!fileName) {
      throw new InvalidArgumentError('fileName is required');
    }
    if (data === null || data === undefined) {
      throw new InvalidArgumentError('data is required');
    }
    
    this._logger.debug('Creating file in Drive', { fileName, folderId });
    
    return this._retryOperation(() => {
      try {
        const jsonContent = ObjectUtils.serialise(data);
        let newFile;
        
        if (folderId) {
          const folder = DriveApp.getFolderById(folderId);
          newFile = folder.createFile(fileName, jsonContent, 'application/json');
        } else {
          newFile = DriveApp.createFile(fileName, jsonContent, 'application/json');
        }
        
        const newFileId = newFile.getId();
        
        this._logger.debug('File created successfully', { 
          fileName, 
          fileId: newFileId, 
          folderId 
        });
        
        return newFileId;
        
      } catch (error) {
        this._handleDriveApiError(error, 'createFile', fileName);
      }
    }, `createFile(${fileName})`);
  }
  
  /**
   * Delete file from Drive
   * @param {string} fileId - Drive file ID to delete
   * @returns {boolean} True if deletion successful
   * @throws {FileNotFoundError} When file doesn't exist
   * @throws {PermissionDeniedError} When delete access is denied
   */
  deleteFile(fileId) {
    if (!fileId) {
      throw new InvalidArgumentError('fileId is required');
    }
    
    this._logger.debug('Deleting file from Drive', { fileId });
    
    return this._retryOperation(() => {
      try {
        const file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
        
        this._logger.debug('File deleted successfully', { fileId });
        return true;
        
      } catch (error) {
        this._handleDriveApiError(error, 'deleteFile', fileId);
      }
    }, `deleteFile(${fileId})`);
  }
  
  /**
   * Check if file exists in Drive
   * @param {string} fileId - Drive file ID to check
   * @returns {boolean} True if file exists and is accessible
   */
  fileExists(fileId) {
    if (!fileId) {
      throw new InvalidArgumentError('fileId is required');
    }
    
    this._logger.debug('Checking file existence', { fileId });
    
    try {
      const file = DriveApp.getFileById(fileId);
      const isTrashed = file.isTrashed();
      const exists = !isTrashed;
      
      this._logger.debug('File existence check complete', { 
        fileId, 
        exists, 
        isTrashed 
      });
      return exists;
    } catch (error) {
      this._logger.debug('File does not exist or is not accessible', { 
        fileId, 
        error: error.message 
      });
      return false;
    }
  }
  
  /**
   * Get file metadata from Drive
   * @param {string} fileId - Drive file ID to get metadata for
   * @returns {Object} File metadata object
   * @throws {FileNotFoundError} When file doesn't exist
   * @throws {PermissionDeniedError} When access is denied
   */
  getFileMetadata(fileId) {
    if (!fileId) {
      throw new InvalidArgumentError('fileId is required');
    }
    
    this._logger.debug('Getting file metadata', { fileId });
    
    return this._retryOperation(() => {
      try {
        const file = DriveApp.getFileById(fileId);
        
        const metadata = {
          id: file.getId(),
          name: file.getName(),
          size: file.getSize(),
          modifiedTime: file.getLastUpdated(),
          createdTime: file.getDateCreated(),
          mimeType: file.getBlob().getContentType()
        };
        
        this._logger.debug('File metadata retrieved', { fileId, metadata });
        return metadata;
        
      } catch (error) {
        this._handleDriveApiError(error, 'getFileMetadata', fileId);
      }
    }, `getFileMetadata(${fileId})`);
  }
  
  /**
   * Handle Drive API errors and convert to appropriate GAS DB errors
   * @private
   * @param {Error} error - Original Drive API error
   * @param {string} operation - Operation that caused the error
   * @param {string} fileId - File ID involved in the operation
   * @throws {FileNotFoundError|PermissionDeniedError|QuotaExceededError|FileIOError}
   */
  _handleDriveApiError(error, operation, fileId) {
    const errorMessage = error.message || '';
    
    this._logger.error('Drive API error occurred', {
      operation,
      fileId,
      error: errorMessage
    });
    
    // Check for specific Drive API error types
    if (errorMessage.includes('File not found') || 
        errorMessage.includes('Requested entity was not found')) {
      throw new FileNotFoundError(fileId);
    }
    
    if (errorMessage.includes('Permission denied') || 
        errorMessage.includes('Access denied') ||
        errorMessage.includes('Insufficient permission')) {
      throw new PermissionDeniedError(fileId, operation);
    }
    
    if (errorMessage.includes('Quota exceeded') || 
        errorMessage.includes('Rate limit exceeded') ||
        errorMessage.includes('Too many requests')) {
      throw new QuotaExceededError(operation, 'Drive API');
    }
    
    // Fallback to generic file I/O error
    throw new FileIOError(operation, fileId, error);
  }
  
  /**
   * Retry operation with exponential backoff
   * @private
   * @param {Function} operation - Operation to retry
   * @param {string} operationName - Name for logging
   * @returns {*} Result of the operation
   */
  _retryOperation(operation, operationName) {
    let lastError;
    
    for (let attempt = 1; attempt <= this._maxRetries; attempt++) {
      try {
        return operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain error types
        if (error instanceof ErrorHandler.ErrorTypes.FILE_NOT_FOUND || 
            error instanceof ErrorHandler.ErrorTypes.PERMISSION_DENIED ||
            error instanceof ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT ||
            error instanceof ErrorHandler.ErrorTypes.INVALID_ARGUMENT) {
          throw error;
        }
        
        if (attempt < this._maxRetries) {
          const delay = this._retryDelayMs * Math.pow(2, attempt - 1);
          this._logger.warn(`Operation ${operationName} failed, retrying in ${delay}ms`, {
            attempt,
            maxRetries: this._maxRetries,
            error: error.message
          });
          
          Utilities.sleep(delay);
        }
      }
    }
    
    this._logger.error(`Operation ${operationName} failed after ${this._maxRetries} attempts`, {
      error: lastError.message
    });
    
    throw lastError;
  }
}
