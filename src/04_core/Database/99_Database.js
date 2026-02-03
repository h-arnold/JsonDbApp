/**
 * 99_Database.js - Database facade coordinating lifecycle and persistence.
 *
 * Provides the primary interface for interacting with JsonDbApp databases.
 * Delegates lifecycle, collection management, index operations, and MasterIndex
 * coordination to specialised handler classes while maintaining shared state
 * and validation helpers.
 */
/* exported Database */
/* global DatabaseConfig, FileOperations, FileService, JDbLogger, Validate, Collection,
          DatabaseLifecycle, DatabaseCollectionManagement, DatabaseIndexOperations,
          DatabaseMasterIndexOperations, ErrorHandler */

/**
 * Core facade responsible for database lifecycle management, including
 * coordinating the MasterIndex, provisioning collections, and mediating
 * persistence services for Google Apps Script storage.
 */
class Database {
  /**
   * Create a new Database instance.
   * @param {Object|DatabaseConfig} config - Database configuration
   * @throws {Error} When configuration is invalid
   */
  constructor(config = {}) {
    if (config instanceof DatabaseConfig) {
      this.config = config;
    } else {
      this.config = new DatabaseConfig(config);
    }

    this.indexFileId = null;
    this.collections = new Map();
    this._logger = JDbLogger.createComponentLogger('Database');
    this._fileOps = new FileOperations(this._logger);
    this._fileService = new FileService(this._fileOps, this._logger);
    this._masterIndex = null;

    this._lifecycle = new DatabaseLifecycle(this);
    this._collectionManager = new DatabaseCollectionManagement(this);
    this._indexOps = new DatabaseIndexOperations(this);
    this._masterIndexOps = new DatabaseMasterIndexOperations(this);

    this._logger.debug('Database instance created', {
      rootFolderId: this.config.rootFolderId,
      autoCreateCollections: this.config.autoCreateCollections
    });
  }

  /**
   * Create a new database by initialising the MasterIndex.
   */
  createDatabase() {
    this._lifecycle.createDatabase();
  }

  /**
   * Initialise the database by loading from the MasterIndex.
   */
  initialise() {
    this._lifecycle.initialise();
  }

  /**
   * Recover database from a backup index file.
   * @param {string} backupFileId - Drive file ID of the backup index file
   * @returns {Array<string>} List of recovered collection names
   */
  recoverDatabase(backupFileId) {
    return this._lifecycle.recoverDatabase(backupFileId);
  }

  /**
   * Retrieve collection by name, optionally auto-creating when enabled.
   * @param {string} name - Collection name
   * @returns {Collection} Collection instance
   */
  collection(name) {
    const resolvedName = this._validateCollectionName(name);
    return this._collectionManager.collection(resolvedName, name);
  }

  /**
   * Create a new collection by name.
   * @param {string} name - Collection name
   * @returns {Collection} Newly created collection
   */
  createCollection(name) {
    const resolvedName = this._validateCollectionName(name);
    return this._collectionManager.createCollection(resolvedName, name);
  }

  /**
   * List all collection names tracked by the MasterIndex.
   * @returns {Array<string>} Collection names
   */
  listCollections() {
    return this._collectionManager.listCollections();
  }

  /**
   * Drop (delete) a collection by name.
   * @param {string} name - Collection name to drop
   * @returns {boolean} True when collection removed successfully
   */
  dropCollection(name) {
    const resolvedName = this._validateCollectionName(name);
    return this._collectionManager.dropCollection(resolvedName, name);
  }

  /**
   * Retrieve collection by name (API alias).
   * @param {string} name - Collection name
   * @returns {Collection} Collection instance
   */
  getCollection(name) {
    const resolvedName = this._validateCollectionName(name);
    return this._collectionManager.getCollection(resolvedName, name);
  }

  /**
   * Delete collection by name (API alias).
   * @param {string} name - Collection name to delete
   * @returns {boolean} True when collection removed successfully
   */
  deleteCollection(name) {
    const resolvedName = this._validateCollectionName(name);
    return this._collectionManager.deleteCollection(resolvedName, name);
  }

  /**
   * Load index file data.
   * @returns {Object} Normalised index payload
   */
  loadIndex() {
    return this._indexOps.loadIndex();
  }

  /**
   * Ensure index file exists by finding or creating it lazily.
   */
  ensureIndexFile() {
    this._indexOps.ensureIndexFile();
  }

  /**
   * Backup MasterIndex to Drive-based index file.
   * @returns {boolean} True when backup succeeds
   */
  backupIndexToDrive() {
    return this._indexOps.backupIndexToDrive();
  }

  /**
   * Create a collection object (full Collection instance).
   * @param {string} name - Collection name
   * @param {string} driveFileId - Drive file identifier
   * @returns {Collection} Collection instance
   * @private
   */
  _createCollectionObject(name, driveFileId) {
    return new Collection(name, driveFileId, this, this._fileService);
  }

  /**
   * Add collection to MasterIndex.
   * @param {string} name - Collection name
   * @param {string} driveFileId - Drive file identifier
   * @private
   */
  _addCollectionToMasterIndex(name, driveFileId) {
    this._masterIndexOps.addCollectionToMasterIndex(name, driveFileId);
  }

  /**
   * Remove collection from MasterIndex.
   * @param {string} name - Collection name
   * @private
   */
  _removeCollectionFromMasterIndex(name) {
    this._masterIndexOps.removeCollectionFromMasterIndex(name);
  }

  /**
   * Add collection reference to the Drive index file.
   * @param {string} name - Collection name
   * @param {string} driveFileId - Drive file identifier
   * @private
   */
  _addCollectionToIndex(name, driveFileId) {
    this._indexOps.addCollectionToIndex(name, driveFileId);
  }

  /**
   * Remove collection reference from the Drive index file.
   * @param {string} name - Collection name
   * @private
   */
  _removeCollectionFromIndex(name) {
    this._indexOps.removeCollectionFromIndex(name);
  }

  /**
   * Validate (and optionally sanitise) collection names.
   * @param {string} name - Collection name to validate
   * @returns {string} Validated (and potentially sanitised) collection name
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When collection name is invalid
   * @private
   */
  _validateCollectionName(name) {
    Validate.nonEmptyString(name, 'name');
    const reservedNames = ['index', 'master', 'system', 'admin'];
    let resolvedName = name;

    if (this.config.stripDisallowedCollectionNameCharacters) {
      resolvedName = this._sanitizeCollectionName(name);
      const trimmed = resolvedName.trim();
      Validate.nonEmptyString(trimmed, 'name');
      resolvedName = trimmed;
    } else {
      const invalidChars = new RegExp('[\/\\:*?"<>|]');
      if (invalidChars.test(name)) {
        const invalidArgumentError = new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
          'name',
          name,
          'Collection name contains invalid characters'
        );
        invalidArgumentError.message = 'Collection name contains invalid characters';
        throw invalidArgumentError;
      }
      resolvedName = name.trim();
      Validate.nonEmptyString(resolvedName, 'name');
    }

    const lowerCaseName = resolvedName.toLowerCase();
    if (reservedNames.includes(lowerCaseName)) {
      const reservedNameError = new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'name',
        resolvedName,
        'Collection name is reserved'
      );
      reservedNameError.message = "Collection name '" + resolvedName + "' is reserved";
      throw reservedNameError;
    }

    return resolvedName;
  }

  /**
   * Sanitise collection name by stripping disallowed characters.
   * @param {string} name - Original collection name
   * @returns {string} Sanitised collection name
   * @private
   */
  _sanitizeCollectionName(name) {
    const invalidPattern = new RegExp('[\\/\\\\:*?"<>|]', 'g');
    const sanitised = name.replace(invalidPattern, '');
    if (sanitised !== name) {
      this._logger.info('Collection name sanitised', {
        originalName: name,
        sanitisedName: sanitised
      });
    }
    return sanitised;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Database };
}
