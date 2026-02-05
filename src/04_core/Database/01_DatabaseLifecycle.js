/**
 * 01_DatabaseLifecycle.js - Coordinates database lifecycle operations.
 *
 * Provides first-time creation, runtime initialisation, and recovery from
 * Drive-based backups. Delegates persistence coordination to the Database
 * facade while enforcing validation and logging behaviour.
 */
/* exported DatabaseLifecycle */
/* global PropertiesService, MasterIndex, Validate, ErrorHandler */

/**
 * Handles lifecycle operations for the Database facade.
 */
class DatabaseLifecycle {
  /**
   * Create a lifecycle handler.
   * @param {Database} database - Parent Database instance
   */
  constructor(database) {
    this._database = database;
  }

  /**
   * Create a new database by initialising the MasterIndex.
   * @throws {ErrorHandler.ErrorTypes.CONFIGURATION_ERROR} When MasterIndex already exists
   * @throws {ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR} When MasterIndex creation fails
   */
  createDatabase() {
    const db = this._database;
    db._logger.info('Creating new database');

    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const existingData = scriptProperties.getProperty(db.config.masterIndexKey);
      if (existingData) {
        const configurationError = new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR(
          'masterIndexKey',
          db.config.masterIndexKey,
          'Existing MasterIndex data detected'
        );
        configurationError.message =
          'Database already exists. Use recoverDatabase() if you need to restore from backup.';
        throw configurationError;
      }

      db._masterIndex = new MasterIndex({ masterIndexKey: db.config.masterIndexKey });

      db._logger.info('Database created successfully', {
        masterIndexKey: db.config.masterIndexKey
      });
    } catch (error) {
      db._logger.error('Failed to create database', { error: error.message });
      throw this._wrapMasterIndexError('createDatabase', error, 'Database creation failed');
    }
  }

  /**
   * Initialise the database by loading from the MasterIndex.
   * @throws {ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR} When MasterIndex is missing or initialisation fails
   */
  initialise() {
    const db = this._database;
    db._logger.info('Initialising database');

    try {
      this._ensureMasterIndexExists();
      this._initialiseMasterIndexInstance();
      const masterIndexCollections = this._loadCollectionsFromMasterIndex();
      this._initialiseIndexBackups(masterIndexCollections);

      db._logger.info('Database initialisation complete', {
        indexFileId: db.indexFileId,
        collectionCount: db.collections.size
      });
    } catch (error) {
      db._logger.error('Database initialisation failed', { error: error.message });
      throw this._wrapMasterIndexError('initialise', error, 'Database initialisation failed');
    }
  }

  /**
   * Recover database from a backup index file.
   * @param {string} backupFileId - Drive file ID of the backup index file
   * @returns {Array<string>} List of recovered collection names
   * @throws {ErrorHandler.ErrorTypes.INVALID_ARGUMENT} When backup identifier is invalid
   * @throws {ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT} When backup payload is invalid
   * @throws {ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR} When recovery orchestration fails
   */
  recoverDatabase(backupFileId) {
    const db = this._database;
    Validate.nonEmptyString(backupFileId, 'backupFileId');

    db._logger.info('Recovering database from backup', { backupFileId });

    try {
      const backupData = this._readBackupData(backupFileId);
      this._initialiseMasterIndexForRecovery();
      const recoveredCollections = this._populateMasterIndexFromBackup(backupData.collections);

      db._logger.info('Database recovery successful', {
        recoveredCollections: recoveredCollections.length,
        collections: recoveredCollections
      });

      return recoveredCollections;
    } catch (error) {
      db._logger.error('Database recovery failed', { error: error.message });
      throw this._wrapMasterIndexError('recoverDatabase', error, 'Database recovery failed');
    }
  }

  /**
   * Wrap MasterIndex errors with appropriate error type and message.
   * @param {string} operation - Operation name for error context
   * @param {Error} error - Original error
   * @param {string} messagePrefix - Message prefix for wrapped error
   * @returns {Error} Wrapped error
   * @throws {ErrorHandler.ErrorTypes.GASDB_ERROR} When error is already a GASDB error
   * @private
   */
  _wrapMasterIndexError(operation, error, messagePrefix) {
    if (error instanceof ErrorHandler.ErrorTypes.GASDB_ERROR) {
      return error;
    }
    const masterIndexError = new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR(
      operation,
      error.message
    );
    masterIndexError.message = messagePrefix + ': ' + error.message;
    return masterIndexError;
  }

  /**
   * Ensure a MasterIndex entry exists in ScriptProperties.
   * @private
   */
  _ensureMasterIndexExists() {
    const db = this._database;
    const scriptProperties = PropertiesService.getScriptProperties();
    const rawData = scriptProperties.getProperty(db.config.masterIndexKey);
    if (!rawData) {
      const masterIndexError = new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR(
        'initialise',
        'MasterIndex not found in ScriptProperties'
      );
      masterIndexError.message =
        'MasterIndex not found. Use createDatabase() for first-time setup or recoverDatabase() for recovery.';
      throw masterIndexError;
    }
  }

  /**
   * Instantiate MasterIndex and validate initialisation state.
   * @private
   */
  _initialiseMasterIndexInstance() {
    const db = this._database;
    db._masterIndex = new MasterIndex({ masterIndexKey: db.config.masterIndexKey });
    if (!db._masterIndex.isInitialised()) {
      const masterIndexError = new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR(
        'initialise',
        'MasterIndex initialisation validation failed'
      );
      masterIndexError.message = 'MasterIndex not initialised correctly.';
      throw masterIndexError;
    }
  }

  /**
   * Load collection metadata from the MasterIndex into memory cache.
   * @returns {Object} MasterIndex collections map
   * @private
   */
  _loadCollectionsFromMasterIndex() {
    const db = this._database;
    const masterIndexCollections = db._masterIndex.getCollections() || {};
    const entries = Object.entries(masterIndexCollections);

    if (entries.length > 0) {
      db._logger.info('Loading existing collections from MasterIndex', {
        count: entries.length
      });

      entries.forEach(([name, collectionData]) => {
        if (collectionData.fileId) {
          const collection = db._createCollectionObject(name, collectionData.fileId);
          db.collections.set(name, collection);
        }
      });
    }

    return masterIndexCollections;
  }

  /**
   * Ensure Drive index file backup is established when configured.
   * @param {Object} masterIndexCollections - Collections loaded from MasterIndex
   * @private
   */
  _initialiseIndexBackups(masterIndexCollections) {
    const db = this._database;
    if (!db.config.backupOnInitialise) {
      return;
    }

    db.ensureIndexFile();
    if (Object.keys(masterIndexCollections).length > 0) {
      db.backupIndexToDrive();
    }
  }

  /**
   * Read and validate backup data from Drive.
   * @param {string} backupFileId - Backup file identifier
   * @returns {Object} Backup payload
   * @private
   */
  _readBackupData(backupFileId) {
    const db = this._database;
    const backupData = db._fileService.readFile(backupFileId);

    if (!backupData || typeof backupData !== 'object' || !backupData.collections) {
      const invalidFormatError = new ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT(
        backupFileId,
        'Database backup payload',
        'Missing collections map in backup'
      );
      invalidFormatError.message = 'Invalid backup file structure';
      throw invalidFormatError;
    }

    return backupData;
  }

  /**
   * Instantiate MasterIndex prior to applying recovery data.
   * @private
   */
  _initialiseMasterIndexForRecovery() {
    const db = this._database;
    db._masterIndex = new MasterIndex({ masterIndexKey: db.config.masterIndexKey });
  }

  /**
   * Apply backup payload to MasterIndex and collect recovered names.
   * @param {Object} collections - Backup collections map
   * @returns {Array<string>} Recovered collection names
   * @private
   */
  _populateMasterIndexFromBackup(collections = {}) {
    const recoveredCollections = [];

    for (const [name, collectionData] of Object.entries(collections)) {
      if (this._restoreCollectionFromBackup(name, collectionData)) {
        recoveredCollections.push(name);
      }
    }

    return recoveredCollections;
  }

  /**
   * Restore a single collection from backup into the MasterIndex.
   * @param {string} name - Collection name
   * @param {Object} collectionData - Backup payload for the collection
   * @returns {boolean} True when the collection was restored
   * @private
   */
  _restoreCollectionFromBackup(name, collectionData) {
    const db = this._database;
    if (!collectionData.fileId) {
      return false;
    }

    const metadata = db._buildCollectionMetadataPayload(
      name,
      collectionData.fileId,
      collectionData.documentCount || 0
    );
    metadata.created = collectionData.created || new Date();
    metadata.lastUpdated = collectionData.lastUpdated || new Date();

    db._masterIndex.addCollection(name, metadata);

    return true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DatabaseLifecycle };
}
