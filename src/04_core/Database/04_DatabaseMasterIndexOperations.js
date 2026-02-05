/**
 * 04_DatabaseMasterIndexOperations.js - MasterIndex coordination helpers.
 *
 * Provides resilient MasterIndex mutation helpers used by the Database facade
 * to keep the authoritative index aligned with collection lifecycle events.
 */
/* exported DatabaseMasterIndexOperations */

/**
 * Handles MasterIndex mutation concerns for the Database facade.
 */
class DatabaseMasterIndexOperations {
  /**
   * Create a MasterIndex operations handler.
   * @param {Database} database - Parent Database instance
   */
  constructor(database) {
    this._database = database;
  }

  /**
   * Add a collection record to the MasterIndex.
   * @param {string} name - Collection name
   * @param {string} driveFileId - Associated Drive file identifier
   */
  addCollectionToMasterIndex(name, driveFileId) {
    const db = this._database;
    try {
      const metadata = db._buildCollectionMetadataPayload(name, driveFileId);
      db._masterIndex.addCollection(name, metadata);

      db._logger.debug('Added collection to master index', { name, driveFileId });
    } catch (error) {
      db._logger.warn('Failed to add collection to master index', {
        name,
        driveFileId,
        error: error.message
      });
    }
  }

  /**
   * Remove a collection record from the MasterIndex.
   * @param {string} name - Collection name
   */
  removeCollectionFromMasterIndex(name) {
    const db = this._database;
    try {
      db._masterIndex.removeCollection(name);
      db._logger.debug('Removed collection from master index', { name });
    } catch (error) {
      db._logger.warn('Failed to remove collection from master index', {
        name,
        error: error.message
      });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DatabaseMasterIndexOperations };
}
