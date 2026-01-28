/**
 * 99_PublicAPI.js
 *
 * Public API wrappers for exposing the library to Google Apps Script consumers.
 * Apps Script libraries only expose top-level functions on the chosen identifier,
 * not classes. These factories provide a stable, documented entry point.
 */
/* exported loadDatabase, createAndInitialiseDatabase */

/**
 * Load an existing Database (MasterIndex must already exist for the key).
 * This constructs and initialises the Database instance.
 *
 * @param {Object|DatabaseConfig} config - Database configuration
 * @returns {Database} Initialised Database instance
 */
function loadDatabase(config) {
  const db = new Database(config);
  db.initialise();
  return db;
}

/**
 * First-time setup helper: create a brand-new database (MasterIndex) and initialise it.
 * Will throw if a MasterIndex already exists under the provided masterIndexKey.
 *
 * @param {Object|DatabaseConfig} config - Database configuration
 * @returns {Database} The initialised Database instance
 */
function createAndInitialiseDatabase(config) {
  const db = new Database(config);
  db.createDatabase();
  db.initialise();
  return db;
}
