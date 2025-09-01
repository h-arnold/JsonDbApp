/**
 * Database Configuration Class
 * 
 * Manages database configuration settings with validation and defaults.
 * Provides standardised configuration object for Database instances.
 * 
 * @class DatabaseConfig
 */
class DatabaseConfig {
  
  /**
   * Creates a new DatabaseConfig instance
   * 
   * @param {Object} config - Configuration options
   * @param {string} [config.rootFolderId] - Root folder ID for database files
   * @param {boolean} [config.autoCreateCollections=true] - Auto-create collections when accessed
   * @param {number} [config.lockTimeout=30000] - Lock timeout in milliseconds (coordination)
   * @param {number} [config.retryAttempts=3] - Number of lock acquisition attempts
   * @param {number} [config.retryDelayMs=1000] - Delay between lock retries (ms)
   * @param {boolean} [config.cacheEnabled=true] - Enable caching
   * @param {string} [config.logLevel='INFO'] - Log level (DEBUG, INFO, WARN, ERROR)
   * @param {string} [config.masterIndexKey] - Master index key for ScriptProperties
   * @throws {Error} When configuration validation fails
   */
  constructor(config = {}) {
    // Set default values
    this.rootFolderId = config.rootFolderId || this._getDefaultRootFolder();
    this.autoCreateCollections = config.autoCreateCollections !== undefined ? config.autoCreateCollections : true;
    this.lockTimeout = config.lockTimeout !== undefined ? config.lockTimeout : 30000;
    this.retryAttempts = config.retryAttempts !== undefined ? config.retryAttempts : 3;
    this.retryDelayMs = config.retryDelayMs !== undefined ? config.retryDelayMs : 1000;
    this.cacheEnabled = config.cacheEnabled !== undefined ? config.cacheEnabled : true;
    this.logLevel = config.logLevel || 'INFO';
    this.masterIndexKey = config.masterIndexKey || 'GASDB_MASTER_INDEX';
  this.backupOnInitialise = config.backupOnInitialise !== undefined ? config.backupOnInitialise : false;
    // Validate configuration
    this._validateConfig();
  }
  
  /**
   * Gets the default root folder ID
   * 
   * @returns {string} Default root folder ID
   * @private
   */
  _getDefaultRootFolder() {
    try {
      // Use the root Drive folder as default
      return DriveApp.getRootFolder().getId();
    } catch (error) {
      throw new Error('Failed to get default root folder: ' + error.message);
    }
  }
  
  /**
   * Validates the configuration parameters
   * 
   * @throws {Error} When validation fails
   * @private
   */
  _validateConfig() {
  // Use shared validation helpers for consistent error types
  // lockTimeout must be a number and at least 500ms
  Validate.number(this.lockTimeout, 'lockTimeout');
  Validate.range(this.lockTimeout, 500, Number.MAX_SAFE_INTEGER, 'lockTimeout');

  // retryAttempts must be a positive integer
  Validate.integer(this.retryAttempts, 'retryAttempts');
  Validate.positiveNumber(this.retryAttempts, 'retryAttempts');

  // retryDelayMs must be a non-negative number
  Validate.nonNegativeNumber(this.retryDelayMs, 'retryDelayMs');

  // Validate log level against allowed values
  const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  Validate.enum(this.logLevel, validLogLevels, 'logLevel');

  // Optional string: rootFolderId
  Validate.optional(this.rootFolderId, Validate.string, 'rootFolderId');

  // Boolean flags
  Validate.boolean(this.autoCreateCollections, 'autoCreateCollections');
  Validate.boolean(this.cacheEnabled, 'cacheEnabled');
  Validate.boolean(this.backupOnInitialise, 'backupOnInitialise');

  // Optional string: masterIndexKey
  Validate.optional(this.masterIndexKey, Validate.string, 'masterIndexKey');
  }
  
  /**
   * Creates a copy of this configuration
   * 
   * @returns {DatabaseConfig} New configuration instance
   */
  clone() {
    return new DatabaseConfig({
      rootFolderId: this.rootFolderId,
      autoCreateCollections: this.autoCreateCollections,
      lockTimeout: this.lockTimeout,
      retryAttempts: this.retryAttempts,
      retryDelayMs: this.retryDelayMs,
      cacheEnabled: this.cacheEnabled,
      logLevel: this.logLevel,
  masterIndexKey: this.masterIndexKey,
  backupOnInitialise: this.backupOnInitialise
    });
  }
  
  /**
   * toJSON hook for JSON.stringify
   * @returns {Object} Plain object with configuration and __type tag
   */
  toJSON() {
    return {
      __type: this.constructor.name,
      rootFolderId: this.rootFolderId,
      autoCreateCollections: this.autoCreateCollections,
      lockTimeout: this.lockTimeout,
      retryAttempts: this.retryAttempts,
      retryDelayMs: this.retryDelayMs,
      cacheEnabled: this.cacheEnabled,
      logLevel: this.logLevel,
  masterIndexKey: this.masterIndexKey,
  backupOnInitialise: this.backupOnInitialise
    };
  }

  /**
   * Create DatabaseConfig instance from JSON object
   * @param {Object} obj - JSON object produced by toJSON
   * @returns {DatabaseConfig}
   * @static
   */
  static fromJSON(obj) {
    if (typeof obj !== 'object' || obj === null || obj.__type !== 'DatabaseConfig') {
      throw new InvalidArgumentError('obj', obj, 'Invalid JSON for DatabaseConfig');
    }
    const config = {
      rootFolderId: obj.rootFolderId,
      autoCreateCollections: obj.autoCreateCollections,
      lockTimeout: obj.lockTimeout,
      retryAttempts: obj.retryAttempts,
      retryDelayMs: obj.retryDelayMs,
      cacheEnabled: obj.cacheEnabled,
      logLevel: obj.logLevel,
  masterIndexKey: obj.masterIndexKey,
  backupOnInitialise: obj.backupOnInitialise
    };
    return new DatabaseConfig(config);
  }
}
