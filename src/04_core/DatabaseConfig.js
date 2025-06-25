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
    // Validate lockTimeout (non-negative)
    if (typeof this.lockTimeout !== 'number' || this.lockTimeout < 0) {
      throw new Error('Lock timeout must be a non-negative number');
    }
    // Enforce minimum lock timeout of 500ms
    if (this.lockTimeout < 500) {
      throw new Error('Lock timeout must be at least 500ms');
    }
    // Validate retryAttempts
    if (typeof this.retryAttempts !== 'number' || this.retryAttempts < 1) {
      throw new Error('retryAttempts must be a positive integer');
    }
    // Validate retryDelayMs
    if (typeof this.retryDelayMs !== 'number' || this.retryDelayMs < 0) {
      throw new Error('retryDelayMs must be a non-negative number');
    }
    
    // Validate log level
    const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (!validLogLevels.includes(this.logLevel)) {
      throw new Error('Log level must be one of: ' + validLogLevels.join(', '));
    }
    
    // Validate root folder ID if provided
    if (this.rootFolderId && typeof this.rootFolderId !== 'string') {
      throw new Error('Root folder ID must be a string');
    }
    
    // Validate boolean values
    if (typeof this.autoCreateCollections !== 'boolean') {
      throw new Error('Auto create collections must be a boolean');
    }
    
    if (typeof this.cacheEnabled !== 'boolean') {
      throw new Error('Cache enabled must be a boolean');
    }
    
    // Validate master index key
    if (this.masterIndexKey && typeof this.masterIndexKey !== 'string') {
      throw new Error('Master index key must be a string');
    }
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
      masterIndexKey: this.masterIndexKey
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
      masterIndexKey: this.masterIndexKey
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
      masterIndexKey: obj.masterIndexKey
    };
    return new DatabaseConfig(config);
  }
}
