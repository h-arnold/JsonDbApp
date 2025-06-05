/**
 * FileService - Optimised file operations interface
 * 
 * This class provides a high-level interface for file operations,
 * including batch operations, intelligent caching, and optimised
 * Drive API usage patterns. Built on top of FileOperations.
 * 
 * NOTE: For now, caching is not implemented but will be at a later stage.
 */

/**
 * FileService class for optimised file operations
 */
class FileService {
  /**
   * Creates a new FileService instance
   * @param {FileOperations} fileOps - FileOperations instance for Drive API calls
   * @param {GASDBLogger} logger - Logger instance for operation tracking
   */
  constructor(fileOps, logger) {
    if (!fileOps) {
      throw new ConfigurationError('fileOps', null, 'FileOperations instance is required');
    }
    if (!logger) {
      throw new ConfigurationError('logger', null, 'Logger is required for FileService');
    }
    
    this._fileOps = fileOps;
    this._logger = logger;
    this._cache = new Map();
    this._maxCacheSize = 50;
    this._cacheEnabled = true;
    
    this._logger.debug('FileService initialised', {
      maxCacheSize: this._maxCacheSize,
      cacheEnabled: this._cacheEnabled
    });
  }
  
  /**
   * Read file content through optimised interface
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
    
    this._logger.debug('Reading file through FileService', { fileId });
    
    // Check cache first if enabled
    if (this._cacheEnabled && this._cache.has(fileId)) {
      this._logger.debug('File content retrieved from cache', { fileId });
      return this._cache.get(fileId);
    }
    
    const content = this._fileOps.readFile(fileId);
    
    // Add to cache if enabled
    if (this._cacheEnabled) {
      this._addToCache(fileId, content);
    }
    
    return content;
  }
  
  /**
   * Write data to existing Drive file through optimised interface
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
    
    this._logger.debug('Writing file through FileService', { fileId });
    
    this._fileOps.writeFile(fileId, data);
    
    // Update cache if enabled
    if (this._cacheEnabled && this._cache.has(fileId)) {
      this._cache.set(fileId, data);
      this._logger.debug('Cache updated after write', { fileId });
    }
  }
  
  /**
   * Create new file through optimised interface
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
    
    this._logger.debug('Creating file through FileService', { fileName, folderId });
    
    const newFileId = this._fileOps.createFile(fileName, data, folderId);
    
    // Add to cache if enabled
    if (this._cacheEnabled) {
      this._addToCache(newFileId, data);
    }
    
    return newFileId;
  }
  
  /**
   * Delete file from Drive through optimised interface
   * @param {string} fileId - Drive file ID to delete
   * @returns {boolean} True if deletion successful
   * @throws {FileNotFoundError} When file doesn't exist
   * @throws {PermissionDeniedError} When delete access is denied
   */
  deleteFile(fileId) {
    if (!fileId) {
      throw new InvalidArgumentError('fileId is required');
    }
    
    this._logger.debug('Deleting file through FileService', { fileId });
    
    const result = this._fileOps.deleteFile(fileId);
    
    // Remove from cache if present
    if (this._cacheEnabled && this._cache.has(fileId)) {
      this._cache.delete(fileId);
      this._logger.debug('File removed from cache', { fileId });
    }
    
    return result;
  }
  
  /**
   * Check if file exists through optimised interface
   * @param {string} fileId - Drive file ID to check
   * @returns {boolean} True if file exists and is accessible
   */
  fileExists(fileId) {
    if (!fileId) {
      throw new InvalidArgumentError('fileId is required');
    }
    
    this._logger.debug('Checking file existence through FileService', { fileId });
    
    // If file is in cache, it likely exists
    if (this._cacheEnabled && this._cache.has(fileId)) {
      this._logger.debug('File existence confirmed via cache', { fileId });
      return true;
    }
    
    return this._fileOps.fileExists(fileId);
  }
  
  /**
   * Get file metadata through optimised interface
   * @param {string} fileId - Drive file ID to get metadata for
   * @returns {Object} File metadata object
   * @throws {FileNotFoundError} When file doesn't exist
   * @throws {PermissionDeniedError} When access is denied
   */
  getFileMetadata(fileId) {
    if (!fileId) {
      throw new InvalidArgumentError('fileId is required');
    }
    
    this._logger.debug('Getting file metadata through FileService', { fileId });
    
    return this._fileOps.getFileMetadata(fileId);
  }
  
  /**
   * Batch read multiple files for improved efficiency
   * @param {Array<string>} fileIds - Array of Drive file IDs to read
   * @returns {Array<Object>} Array of file contents (null for failed reads)
   */
  batchReadFiles(fileIds) {
    if (!Array.isArray(fileIds)) {
      throw new InvalidArgumentError('fileIds must be an array');
    }
    
    this._logger.debug('Batch reading files', { fileCount: fileIds.length });
    
    const results = [];
    const errors = [];
    
    for (const fileId of fileIds) {
      try {
        const content = this.readFile(fileId);
        results.push(content);
      } catch (error) {
        this._logger.warn('Failed to read file in batch operation', {
          fileId,
          error: error.message
        });
        results.push(null);
        errors.push({ fileId, error: error.message });
      }
    }
    
    this._logger.debug('Batch read completed', {
      totalFiles: fileIds.length,
      successCount: results.filter(r => r !== null).length,
      errorCount: errors.length
    });
    
    return results;
  }
  
  /**
   * Batch get metadata for multiple files
   * @param {Array<string>} fileIds - Array of Drive file IDs
   * @returns {Array<Object>} Array of metadata objects (null for failed requests)
   */
  batchGetMetadata(fileIds) {
    if (!Array.isArray(fileIds)) {
      throw new InvalidArgumentError('fileIds must be an array');
    }
    
    this._logger.debug('Batch getting metadata', { fileCount: fileIds.length });
    
    const results = [];
    const errors = [];
    
    for (const fileId of fileIds) {
      try {
        const metadata = this.getFileMetadata(fileId);
        results.push(metadata);
      } catch (error) {
        this._logger.warn('Failed to get metadata in batch operation', {
          fileId,
          error: error.message
        });
        results.push(null);
        errors.push({ fileId, error: error.message });
      }
    }
    
    this._logger.debug('Batch metadata retrieval completed', {
      totalFiles: fileIds.length,
      successCount: results.filter(r => r !== null).length,
      errorCount: errors.length
    });
    
    return results;
  }
  
  /**
   * Clear the file content cache
   */
  clearCache() {
    const cacheSize = this._cache.size;
    this._cache.clear();
    this._logger.debug('Cache cleared', { previousSize: cacheSize });
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this._cache.size,
      maxSize: this._maxCacheSize,
      enabled: this._cacheEnabled
    };
  }
  
  /**
   * Enable or disable caching
   * @param {boolean} enabled - Whether to enable caching
   */
  setCacheEnabled(enabled) {
    this._cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
    this._logger.debug('Cache enabled status changed', { enabled });
  }
  
  /**
   * Add content to cache with size management
   * @private
   * @param {string} fileId - File ID to cache
   * @param {Object} content - Content to cache
   */
  _addToCache(fileId, content) {
    // Implement simple LRU by removing oldest entry if at capacity
    if (this._cache.size >= this._maxCacheSize) {
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
      this._logger.debug('Removed oldest cache entry', { removedKey: oldestKey });
    }
    
    this._cache.set(fileId, content);
    this._logger.debug('Content added to cache', { 
      fileId, 
      cacheSize: this._cache.size 
    });
  }
}
