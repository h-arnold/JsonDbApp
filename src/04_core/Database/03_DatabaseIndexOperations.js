/**
 * 03_DatabaseIndexOperations.js - Drive index coordination utilities.
 *
 * Manages the Drive-based index file lifecycle, including lazy discovery,
 * creation, loading, and maintenance operations. Provides backup orchestration
 * and structural normalisation helpers for index payloads.
 */
/* exported DatabaseIndexOperations */
/* global DriveApp, ErrorHandler */

/**
 * Handles Drive index file operations for the Database facade.
 */
class DatabaseIndexOperations {
  /**
   * Create an index operations handler.
   * @param {Database} database - Parent Database instance
   */
  constructor(database) {
    this._database = database;
  }

  /**
   * Ensure the index file exists by locating or creating it lazily.
   */
  ensureIndexFile() {
    const db = this._database;
    if (db.indexFileId) {
      return;
    }

    const existingIndexFileId = this._findExistingIndexFile();
    if (existingIndexFileId) {
      db.indexFileId = existingIndexFileId;
      db._logger.debug('Found existing index file for backup', {
        indexFileId: db.indexFileId
      });
      return;
    }

    this._createIndexFile();
  }

  /**
   * Load index file data and normalise the structure.
   * @returns {Object} Normalised index payload
   * @throws {ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT} When the index payload is invalid
   * @throws {ErrorHandler.ErrorTypes.FILE_IO_ERROR} When file reads fail
   */
  loadIndex() {
    this.ensureIndexFile();

    try {
      const indexData = this._readIndexData();
      return this._normaliseIndexData(indexData);
    } catch (error) {
      throw this._wrapLoadIndexError(error);
    }
  }

  /**
   * Add a collection to the Drive index file.
   * @param {string} name - Collection name
   * @param {string} driveFileId - Associated Drive file identifier
   */
  addCollectionToIndex(name, driveFileId) {
    const db = this._database;
    try {
      const indexData = this.loadIndex();
      indexData.collections[name] = {
        name: name,
        fileId: driveFileId,
        created: new Date(),
        lastUpdated: new Date(),
        documentCount: 0
      };
      indexData.lastUpdated = new Date();
      db._fileService.writeFile(db.indexFileId, indexData);
      db._logger.debug('Added collection to index', { name, driveFileId });
    } catch (error) {
      db._logger.error('Failed to add collection to index', {
        name,
        driveFileId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove a collection from the Drive index file.
   * @param {string} name - Collection name
   */
  removeCollectionFromIndex(name) {
    const db = this._database;
    try {
      const indexData = this.loadIndex();
      delete indexData.collections[name];
      indexData.lastUpdated = new Date();
      db._fileService.writeFile(db.indexFileId, indexData);
      db._logger.debug('Removed collection from index', { name });
    } catch (error) {
      db._logger.error('Failed to remove collection from index', {
        name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Backup the MasterIndex to the Drive index file.
   * @returns {boolean} True when backup succeeds
   */
  backupIndexToDrive() {
    const db = this._database;
    if (!db.indexFileId) {
      db._logger.warn('Cannot backup index - no index file exists');
      return false;
    }

    try {
      db._logger.info('Backing up MasterIndex to Drive index file');
      const masterCollections = db._masterIndex.getCollections();
      const backupData = this._buildBackupPayload(masterCollections);
      const collectionCount = Object.keys(masterCollections).length;

      db._fileService.writeFile(db.indexFileId, backupData);
      db._logger.info('MasterIndex backup successful', {
        collectionCount,
        indexFileId: db.indexFileId
      });
      return true;
    } catch (error) {
      db._logger.error('MasterIndex backup failed', { error: error.message });
      return false;
    }
  }

  /**
   * Read index data from Drive.
   * @returns {Object} Raw index payload
   * @private
   */
  _readIndexData() {
    const db = this._database;
    return db._fileService.readFile(db.indexFileId);
  }

  /**
   * Wrap errors raised whilst loading the index data for consistent handling.
   * @param {Error} error - Original error thrown by file operations
   * @returns {Error} Error instance to propagate
   * @private
   */
  _wrapLoadIndexError(error) {
    const errorMessage = error.message || '';

    if (this._isJsonParseError(errorMessage)) {
      return this._createInvalidJsonFormatError(error);
    }

    if (this._isStructuralCorruptionError(errorMessage)) {
      return this._createStructuralCorruptionError(error, errorMessage);
    }

    return this._createFileReadError(error);
  }

  /**
   * Build InvalidFileFormatError for JSON parse failures.
   * @param {Error} error - Original error raised during index load
   * @returns {ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT} Invalid JSON error
   * @private
   */
  _createInvalidJsonFormatError(error) {
    const db = this._database;
    db._logger.error('Index file contains corrupted JSON', {
      indexFileId: db.indexFileId,
      error: error.message
    });
    const invalidFormatError = new ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT(
      db.indexFileId || 'unknown',
      'Database index JSON',
      'Index file contains invalid JSON format'
    );
    invalidFormatError.message = 'Index file is corrupted: invalid JSON format';
    return invalidFormatError;
  }

  /**
   * Build InvalidFileFormatError for structural validation failures.
   * @param {Error} error - Original error surfaced during validation
   * @param {string} errorMessage - Message describing the structural failure
   * @returns {Error} Structural corruption error instance
   * @private
   */
  _createStructuralCorruptionError(error, errorMessage) {
    const db = this._database;
    db._logger.error('Index file structure is corrupted', {
      indexFileId: db.indexFileId,
      error: error.message
    });
    if (error instanceof ErrorHandler.ErrorTypes.GASDB_ERROR) {
      return error;
    }
    const structuralError = new ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT(
      db.indexFileId || 'unknown',
      'Database index JSON',
      errorMessage || 'Index file structure is corrupted'
    );
    structuralError.message = error.message || 'Index file contains invalid data structure';
    return structuralError;
  }

  /**
   * Build FileIOError when index load fails for non-validation reasons.
   * @param {Error} error - Original error raised during Drive read
   * @returns {ErrorHandler.ErrorTypes.FILE_IO_ERROR} Wrapped file I/O error
   * @private
   */
  _createFileReadError(error) {
    const db = this._database;
    db._logger.error('Failed to load index file', {
      indexFileId: db.indexFileId,
      error: error.message
    });
    const fileIoError = new ErrorHandler.ErrorTypes.FILE_IO_ERROR(
      'read',
      db.indexFileId || 'unknown',
      error
    );
    fileIoError.message = 'Failed to load index file: ' + error.message;
    return fileIoError;
  }

  /**
   * Determine whether an error indicates JSON parsing failure.
   * @param {string} errorMessage - Error message text
   * @returns {boolean} True when error matches JSON parse failure signals
   * @private
   */
  _isJsonParseError(errorMessage) {
    return (
      errorMessage.includes('JSON') ||
      errorMessage.includes('Invalid file format') ||
      errorMessage.includes('parse') ||
      errorMessage.includes('Unexpected token') ||
      errorMessage.includes('SyntaxError')
    );
  }

  /**
   * Detect structural corruption errors surfaced by validation stages.
   * @param {string} errorMessage - Error message text
   * @returns {boolean} True when error indicates structural corruption
   * @private
   */
  _isStructuralCorruptionError(errorMessage) {
    return errorMessage.includes('corrupted') || errorMessage.includes('invalid data structure');
  }

  /**
   * Build a backup payload from MasterIndex collection data.
   * @param {Object} masterCollections - MasterIndex collections map
   * @returns {Object} Backup payload ready for persistence
   * @private
   */
  _buildBackupPayload(masterCollections) {
    const backupData = {
      collections: {},
      lastUpdated: new Date(),
      version: 1
    };

    for (const [name, miCollection] of Object.entries(masterCollections)) {
      backupData.collections[name] = {
        name: miCollection.name || name,
        fileId: miCollection.fileId,
        created: miCollection.created || new Date(),
        lastUpdated: miCollection.lastUpdated || new Date(),
        documentCount: miCollection.documentCount || 0
      };
    }

    return backupData;
  }

  /**
   * Locate an existing index file in the configured Drive folder.
   * @returns {string|null} Discovered index file identifier or null
   * @private
   */
  _findExistingIndexFile() {
    const db = this._database;
    try {
      const folder = DriveApp.getFolderById(db.config.rootFolderId);
      const files = folder.getFiles();

      while (files.hasNext()) {
        const file = files.next();
        const fileName = file.getName();

        if (fileName.includes('database_index') && fileName.endsWith('.json')) {
          return file.getId();
        }
      }
      return null;
    } catch (error) {
      db._logger.warn('Failed to find existing index file', { error: error.message });
      return null;
    }
  }

  /**
   * Create a new index file in Drive.
   * @private
   */
  _createIndexFile() {
    const db = this._database;
    const indexFileName = 'database_index_' + Date.now() + '.json';
    const initialIndexData = {
      collections: {},
      created: new Date(),
      lastUpdated: new Date(),
      version: 1
    };

    db.indexFileId = db._fileService.createFile(
      indexFileName,
      initialIndexData,
      db.config.rootFolderId
    );

    db._logger.debug('Created new index file', {
      fileName: indexFileName,
      indexFileId: db.indexFileId
    });
  }

  /**
   * Normalise the Drive index payload before use.
   * @param {Object} indexData - Raw index payload
   * @returns {Object} Normalised index payload
   * @throws {ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT} When payload fails validation
   * @private
   */
  _normaliseIndexData(indexData) {
    this._assertIndexObject(indexData);
    this._ensureCollectionsMap(indexData);
    this._ensureLastUpdated(indexData);
    return indexData;
  }

  /**
   * Validate that the index payload is an object structure.
   * @param {Object} indexData - Raw index payload
   * @throws {ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT} When payload is null or not an object
   * @private
   */
  _assertIndexObject(indexData) {
    if (typeof indexData !== 'object' || indexData === null || Array.isArray(indexData)) {
      const invalidFormatError = new ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT(
        this._database.indexFileId || 'unknown',
        'Database index JSON',
        'Index payload must be an object map'
      );
      invalidFormatError.message = 'Index file contains invalid data structure';
      throw invalidFormatError;
    }
  }

  /**
   * Ensure the collections property exists and is an object.
   * @param {Object} indexData - Raw index payload
   * @throws {ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT} When collections property exists but is not an object
   * @private
   */
  _ensureCollectionsMap(indexData) {
    const db = this._database;

    if (!indexData.collections) {
      db._logger.warn('Index file missing collections property, repairing');
      indexData.collections = {};
      return;
    }

    if (
      indexData.collections === null ||
      typeof indexData.collections !== 'object' ||
      Array.isArray(indexData.collections)
    ) {
      const invalidFormatError = new ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT(
        this._database.indexFileId || 'unknown',
        'Database index JSON',
        'Collections property must be an object map'
      );
      invalidFormatError.message = 'Index file collections property is corrupted';
      throw invalidFormatError;
    }
  }

  /**
   * Ensure the lastUpdated timestamp exists on the payload.
   * @param {Object} indexData - Raw index payload
   * @private
   */
  _ensureLastUpdated(indexData) {
    const db = this._database;
    if (!indexData.lastUpdated) {
      db._logger.warn('Index file missing lastUpdated property, repairing');
      indexData.lastUpdated = new Date();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DatabaseIndexOperations };
}
