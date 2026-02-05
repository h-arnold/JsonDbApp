/**
 * 02_DatabaseCollectionManagement.js - Collection lifecycle and lookup orchestration.
 *
 * Encapsulates collection creation, retrieval, listing, and deletion logic.
 * Maintains the in-memory cache and coordinates persistence updates via
 * Database-provided helpers.
 */
/* exported DatabaseCollectionManagement */
/* global ErrorHandler */

/**
 * Handles collection management concerns for the Database facade.
 */
class DatabaseCollectionManagement {
  /**
   * Create a collection management handler.
   * @param {Database} database - Parent Database instance
   */
  constructor(database) {
    this._database = database;
  }

  /**
   * Retrieve an existing collection or auto-create when enabled.
   * @param {string} resolvedName - Sanitised collection name for lookup
   * @param {string} originalName - Original collection name supplied by caller
   * @returns {Collection} Collection instance
   */
  getCollection(resolvedName, originalName) {
    return this._resolveCollection(resolvedName, originalName);
  }

  /**
   * Create a new collection with backing file and metadata.
   * @param {string} resolvedName - Sanitised collection name
   * @param {string} originalName - Original collection name supplied by caller
   * @returns {Collection} Newly created collection instance
   * @throws {ErrorHandler.ErrorTypes.OPERATION_ERROR} When creation fails or collection already exists
   */
  createCollection(resolvedName, originalName) {
    const db = this._database;
    db._logger.debug('Creating new collection', {
      requestedName: originalName,
      collectionName: resolvedName
    });

    try {
      if (db._masterIndex.getCollection(resolvedName)) {
        throw this._createOperationError(
          'createCollection',
          "Collection '" + resolvedName + "' already exists in MasterIndex",
          'MasterIndex contains entry for collection'
        );
      }

      if (db.collections.has(resolvedName)) {
        throw this._createOperationError(
          'createCollection',
          "Collection '" + resolvedName + "' already exists in memory",
          'In-memory cache already tracks collection'
        );
      }

      const initialData = {
        documents: {},
        metadata: {
          name: resolvedName,
          created: new Date(),
          lastUpdated: new Date(),
          documentCount: 0,
          version: 1
        }
      };

      const fileName = resolvedName + '_collection.json';
      const driveFileId = db._fileService.createFile(fileName, initialData, db.config.rootFolderId);

      const collection = db._createCollectionObject(resolvedName, driveFileId);
      db.collections.set(resolvedName, collection);

      db._addCollectionToMasterIndex(resolvedName, driveFileId);

      if (db.config.backupOnInitialise) {
        db._addCollectionToIndex(resolvedName, driveFileId);
      }

      db._logger.info('Collection created successfully', {
        name: originalName,
        driveFileId
      });

      return collection;
    } catch (error) {
      db._logger.error('Failed to create collection', {
        name: originalName,
        error: error.message
      });

      if (error instanceof ErrorHandler.ErrorTypes.GASDB_ERROR) {
        throw error;
      }

      const operationError = this._createOperationError(
        'createCollection',
        "Failed to create collection '" + originalName + "': " + error.message,
        error.message
      );
      throw operationError;
    }
  }

  /**
   * List all collection names from the MasterIndex.
   * @returns {Array<string>} Collection name array
   */
  listCollections() {
    const db = this._database;
    try {
      const masterIndexCollections = db._masterIndex.getCollections();
      const collectionNames = Object.keys(masterIndexCollections);

      db._logger.debug('Listed collections from MasterIndex', {
        count: collectionNames.length,
        names: collectionNames
      });

      return collectionNames;
    } catch (error) {
      db._logger.warn('Failed to list collections', { error: error.message });
      return [];
    }
  }

  /**
   * Drop (delete) a collection by name.
   * @param {string} resolvedName - Sanitised collection name
   * @param {string} originalName - Original collection name supplied by caller
   * @returns {boolean} True when collection removed successfully
   * @throws {ErrorHandler.ErrorTypes.OPERATION_ERROR} When deletion fails
   */
  dropCollection(resolvedName, originalName) {
    const db = this._database;
    db._logger.debug('Dropping collection', {
      requestedName: originalName,
      collectionName: resolvedName
    });

    try {
      const miCollection = db._masterIndex.getCollection(resolvedName);

      if (miCollection && miCollection.fileId) {
        db._fileService.deleteFile(miCollection.fileId);
        db.collections.delete(resolvedName);
        db._removeCollectionFromMasterIndex(resolvedName);

        if (db.config.backupOnInitialise) {
          db._removeCollectionFromIndex(resolvedName);
        }

        db._logger.info('Collection dropped successfully', { name: resolvedName });

        return true;
      }

      db._logger.warn('Collection not found for drop operation', { name: originalName });
      return false;
    } catch (error) {
      db._logger.error('Failed to drop collection', {
        name: originalName,
        error: error.message
      });

      if (error instanceof ErrorHandler.ErrorTypes.GASDB_ERROR) {
        throw error;
      }

      const operationError = this._createOperationError(
        'dropCollection',
        "Failed to drop collection '" + originalName + "': " + error.message,
        error.message
      );
      throw operationError;
    }
  }

  /**
   * Alias for dropCollection to match API naming.
   * @param {string} resolvedName - Sanitised collection name
   * @param {string} originalName - Original collection name supplied by caller
   * @returns {boolean} True when collection removed successfully
   */
  deleteCollection(resolvedName, originalName) {
    return this.dropCollection(resolvedName, originalName);
  }

  /**
   * Resolve collection from cache or MasterIndex, auto-creating when enabled.
   * @param {string} resolvedName - Sanitised collection name for lookup
   * @param {string} originalName - Original collection name supplied by caller
   * @returns {Collection} Collection instance
   * @throws {ErrorHandler.ErrorTypes.OPERATION_ERROR} When collection is missing and auto-creation is disabled
   * @private
   */
  _resolveCollection(resolvedName, originalName) {
    const db = this._database;

    if (db.collections.has(resolvedName)) {
      return db.collections.get(resolvedName);
    }

    const masterIndexEntry = db._masterIndex.getCollection(resolvedName);
    if (masterIndexEntry && masterIndexEntry.fileId) {
      const collection = db._createCollectionObject(resolvedName, masterIndexEntry.fileId);
      db.collections.set(resolvedName, collection);
      return collection;
    }

    if (db.config.autoCreateCollections) {
      return db.createCollection(originalName);
    }

    throw this._createOperationError(
      'resolveCollection',
      "Collection '" + originalName + "' does not exist and auto-create is disabled",
      'Collection missing in MasterIndex and auto-create disabled'
    );
  }

  /**
   * Construct an OperationError with a customised message while retaining context.
   * @param {string} operation - Operation name associated with the error
   * @param {string} message - Detailed error message to surface
   * @param {string} [reason] - Optional reason for additional context
   * @returns {ErrorHandler.ErrorTypes.OPERATION_ERROR} OperationError instance
   * @private
   */
  _createOperationError(operation, message, reason) {
    const operationError = new ErrorHandler.ErrorTypes.OPERATION_ERROR(
      operation,
      reason || message
    );
    operationError.message = message;
    return operationError;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DatabaseCollectionManagement };
}
