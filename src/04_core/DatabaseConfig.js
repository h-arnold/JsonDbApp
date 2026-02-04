/**
 * Database Configuration Class
 *
 * Manages database configuration settings with validation and defaults.
 * Provides standardised configuration object for Database instances.
 *
 * @class DatabaseConfig
 */
/* exported DatabaseConfig */
const DEFAULT_LOCK_TIMEOUT_MS = 30000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_LOCK_RETRY_BACKOFF_BASE = 2;
const DEFAULT_FILE_RETRY_ATTEMPTS = 3;
const DEFAULT_FILE_RETRY_DELAY_MS = 1000;
const DEFAULT_FILE_RETRY_BACKOFF_BASE = 2;
const DEFAULT_QUERY_ENGINE_MAX_NESTED_DEPTH = 10;
const DEFAULT_QUERY_ENGINE_SUPPORTED_OPERATORS = Object.freeze([
  '$eq',
  '$gt',
  '$lt',
  '$and',
  '$or'
]);
const DEFAULT_QUERY_ENGINE_LOGICAL_OPERATORS = Object.freeze(['$and', '$or']);
const DEFAULT_MASTER_INDEX_KEY = 'GASDB_MASTER_INDEX';
const MIN_LOCK_TIMEOUT_MS = 500;
const MIN_QUERY_ENGINE_MAX_NESTED_DEPTH = 0;

/**
 * Provides validated configuration state for Database instances, including
 * lock behaviour, logging preferences, and collection creation defaults.
 * @remarks Ensures all options fall back to sensible defaults and pass
 * validation before use across the persistence layer.
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
   * @param {number} [config.lockRetryBackoffBase=2] - Backoff base for lock retries
   * @param {boolean} [config.cacheEnabled=true] - Enable caching
   * @param {string} [config.logLevel='INFO'] - Log level (DEBUG, INFO, WARN, ERROR)
   * @param {number} [config.fileRetryAttempts=3] - File operation retry attempts
   * @param {number} [config.fileRetryDelayMs=1000] - Delay between file retries (ms)
   * @param {number} [config.fileRetryBackoffBase=2] - Backoff base for file retries
   * @param {number} [config.queryEngineMaxNestedDepth=10] - Max query nesting depth
   * @param {string[]} [config.queryEngineSupportedOperators] - Supported query operators
   * @param {string[]} [config.queryEngineLogicalOperators] - Logical query operators
   * @param {string} [config.masterIndexKey] - Master index key for ScriptProperties
   * @throws {Error} When configuration validation fails
   */
  constructor(config = {}) {
    // Set default values
    this.rootFolderId = config.rootFolderId || this._getDefaultRootFolder();
    this.autoCreateCollections = config.autoCreateCollections ?? true;
    this.lockTimeout = config.lockTimeout ?? DEFAULT_LOCK_TIMEOUT_MS;
    this.retryAttempts = config.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.lockRetryBackoffBase = config.lockRetryBackoffBase ?? DEFAULT_LOCK_RETRY_BACKOFF_BASE;
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.logLevel = config.logLevel || 'INFO';
    this.fileRetryAttempts = config.fileRetryAttempts ?? DEFAULT_FILE_RETRY_ATTEMPTS;
    this.fileRetryDelayMs = config.fileRetryDelayMs ?? DEFAULT_FILE_RETRY_DELAY_MS;
    this.fileRetryBackoffBase = config.fileRetryBackoffBase ?? DEFAULT_FILE_RETRY_BACKOFF_BASE;
    this.queryEngineMaxNestedDepth =
      config.queryEngineMaxNestedDepth ?? DEFAULT_QUERY_ENGINE_MAX_NESTED_DEPTH;
    this._queryEngineSupportedOperatorsProvided =
      Object.prototype.hasOwnProperty.call(config, 'queryEngineSupportedOperators') &&
      config.queryEngineSupportedOperators !== undefined;
    this._queryEngineLogicalOperatorsProvided =
      Object.prototype.hasOwnProperty.call(config, 'queryEngineLogicalOperators') &&
      config.queryEngineLogicalOperators !== undefined;
    this._queryEngineSupportedOperatorsRaw = config.queryEngineSupportedOperators;
    this._queryEngineLogicalOperatorsRaw = config.queryEngineLogicalOperators;
    this.queryEngineSupportedOperators = Array.isArray(config.queryEngineSupportedOperators)
      ? config.queryEngineSupportedOperators.slice()
      : Array.from(DEFAULT_QUERY_ENGINE_SUPPORTED_OPERATORS);
    this.queryEngineLogicalOperators = Array.isArray(config.queryEngineLogicalOperators)
      ? config.queryEngineLogicalOperators.slice()
      : Array.from(DEFAULT_QUERY_ENGINE_LOGICAL_OPERATORS);
    this.masterIndexKey = config.masterIndexKey || DEFAULT_MASTER_INDEX_KEY;
    this.backupOnInitialise = config.backupOnInitialise ?? false;
    this.stripDisallowedCollectionNameCharacters =
      config.stripDisallowedCollectionNameCharacters ?? false;
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
    if (DatabaseConfig._defaultRootFolderId) {
      return DatabaseConfig._defaultRootFolderId;
    }

    try {
      // Use the root Drive folder as default
      const rootFolderId = DriveApp.getRootFolder().getId();
      DatabaseConfig._defaultRootFolderId = rootFolderId;
      return rootFolderId;
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
    Validate.range(this.lockTimeout, MIN_LOCK_TIMEOUT_MS, Number.MAX_SAFE_INTEGER, 'lockTimeout');

    // retryAttempts must be a positive integer
    Validate.integer(this.retryAttempts, 'retryAttempts');
    Validate.positiveNumber(this.retryAttempts, 'retryAttempts');

    // retryDelayMs must be a non-negative number
    Validate.nonNegativeNumber(this.retryDelayMs, 'retryDelayMs');

    // lockRetryBackoffBase must be a positive number
    Validate.positiveNumber(this.lockRetryBackoffBase, 'lockRetryBackoffBase');

    // Validate log level against allowed values
    const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    Validate.enum(this.logLevel, validLogLevels, 'logLevel');

    // File operation retry configuration
    Validate.integer(this.fileRetryAttempts, 'fileRetryAttempts');
    Validate.positiveNumber(this.fileRetryAttempts, 'fileRetryAttempts');
    Validate.nonNegativeNumber(this.fileRetryDelayMs, 'fileRetryDelayMs');
    Validate.positiveNumber(this.fileRetryBackoffBase, 'fileRetryBackoffBase');

    // QueryEngine configuration
    Validate.integer(this.queryEngineMaxNestedDepth, 'queryEngineMaxNestedDepth');
    Validate.range(
      this.queryEngineMaxNestedDepth,
      MIN_QUERY_ENGINE_MAX_NESTED_DEPTH,
      Number.MAX_SAFE_INTEGER,
      'queryEngineMaxNestedDepth'
    );
    this._validateQueryOperators();

    // Optional string: rootFolderId
    Validate.optional(this.rootFolderId, Validate.string, 'rootFolderId');

    // Boolean flags
    Validate.boolean(this.autoCreateCollections, 'autoCreateCollections');
    Validate.boolean(this.cacheEnabled, 'cacheEnabled');
    Validate.boolean(this.backupOnInitialise, 'backupOnInitialise');
    Validate.boolean(
      this.stripDisallowedCollectionNameCharacters,
      'stripDisallowedCollectionNameCharacters'
    );

    // Optional string: masterIndexKey
    Validate.optional(this.masterIndexKey, Validate.string, 'masterIndexKey');
  }

  /**
   * Validate query operator arrays.
   * @private
   */
  _validateQueryOperators() {
    if (
      this._queryEngineSupportedOperatorsProvided &&
      !Array.isArray(this._queryEngineSupportedOperatorsRaw)
    ) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'queryEngineSupportedOperators',
        this._queryEngineSupportedOperatorsRaw,
        'must be an array of non-empty strings'
      );
    }
    if (
      this._queryEngineLogicalOperatorsProvided &&
      !Array.isArray(this._queryEngineLogicalOperatorsRaw)
    ) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'queryEngineLogicalOperators',
        this._queryEngineLogicalOperatorsRaw,
        'must be an array of non-empty strings'
      );
    }
    Validate.nonEmptyArray(this.queryEngineSupportedOperators, 'queryEngineSupportedOperators');
    const supportedOperators = this.queryEngineSupportedOperators;
    supportedOperators.forEach((operator) => {
      if (typeof operator !== 'string' || operator.trim() === '') {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
          'queryEngineSupportedOperators',
          operator,
          'must be an array of non-empty strings'
        );
      }
    });

    Validate.nonEmptyArray(this.queryEngineLogicalOperators, 'queryEngineLogicalOperators');
    const logicalOperators = this.queryEngineLogicalOperators;
    logicalOperators.forEach((operator) => {
      if (typeof operator !== 'string' || operator.trim() === '') {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
          'queryEngineLogicalOperators',
          operator,
          'must be an array of non-empty strings'
        );
      }
      if (!supportedOperators.includes(operator)) {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
          'queryEngineLogicalOperators',
          operator,
          'logical operators must be present in queryEngineSupportedOperators'
        );
      }
    });
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
      lockRetryBackoffBase: this.lockRetryBackoffBase,
      cacheEnabled: this.cacheEnabled,
      logLevel: this.logLevel,
      fileRetryAttempts: this.fileRetryAttempts,
      fileRetryDelayMs: this.fileRetryDelayMs,
      fileRetryBackoffBase: this.fileRetryBackoffBase,
      queryEngineMaxNestedDepth: this.queryEngineMaxNestedDepth,
      queryEngineSupportedOperators: this.queryEngineSupportedOperators.slice(),
      queryEngineLogicalOperators: this.queryEngineLogicalOperators.slice(),
      masterIndexKey: this.masterIndexKey,
      backupOnInitialise: this.backupOnInitialise,
      stripDisallowedCollectionNameCharacters: this.stripDisallowedCollectionNameCharacters
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
      lockRetryBackoffBase: this.lockRetryBackoffBase,
      cacheEnabled: this.cacheEnabled,
      logLevel: this.logLevel,
      fileRetryAttempts: this.fileRetryAttempts,
      fileRetryDelayMs: this.fileRetryDelayMs,
      fileRetryBackoffBase: this.fileRetryBackoffBase,
      queryEngineMaxNestedDepth: this.queryEngineMaxNestedDepth,
      queryEngineSupportedOperators: this.queryEngineSupportedOperators.slice(),
      queryEngineLogicalOperators: this.queryEngineLogicalOperators.slice(),
      masterIndexKey: this.masterIndexKey,
      backupOnInitialise: this.backupOnInitialise,
      stripDisallowedCollectionNameCharacters: this.stripDisallowedCollectionNameCharacters
    };
  }

  /**
   * Create DatabaseConfig instance from JSON object
   * @param {Object} obj - JSON object produced by toJSON
   * @returns {DatabaseConfig} Restored configuration instance
   * @static
   */
  static fromJSON(obj) {
    if (obj && typeof obj === 'object' && obj.__type === 'DatabaseConfig') {
      const config = {
        rootFolderId: obj.rootFolderId,
        autoCreateCollections: obj.autoCreateCollections,
        lockTimeout: obj.lockTimeout,
        retryAttempts: obj.retryAttempts,
        retryDelayMs: obj.retryDelayMs,
        lockRetryBackoffBase: obj.lockRetryBackoffBase,
        cacheEnabled: obj.cacheEnabled,
        logLevel: obj.logLevel,
        fileRetryAttempts: obj.fileRetryAttempts,
        fileRetryDelayMs: obj.fileRetryDelayMs,
        fileRetryBackoffBase: obj.fileRetryBackoffBase,
        queryEngineMaxNestedDepth: obj.queryEngineMaxNestedDepth,
        queryEngineSupportedOperators: obj.queryEngineSupportedOperators,
        queryEngineLogicalOperators: obj.queryEngineLogicalOperators,
        masterIndexKey: obj.masterIndexKey,
        backupOnInitialise: obj.backupOnInitialise,
        stripDisallowedCollectionNameCharacters: obj.stripDisallowedCollectionNameCharacters
      };
      return new DatabaseConfig(config);
    }
    throw new InvalidArgumentError('obj', obj, 'Invalid JSON for DatabaseConfig');
  }

  /**
   * Get QueryEngine configuration settings.
   * @returns {{maxNestedDepth: number, supportedOperators: string[], logicalOperators: string[]}}
   *   QueryEngine configuration snapshot.
   */
  getQueryEngineConfig() {
    return {
      maxNestedDepth: this.queryEngineMaxNestedDepth,
      supportedOperators: this.queryEngineSupportedOperators.slice(),
      logicalOperators: this.queryEngineLogicalOperators.slice()
    };
  }

  /**
   * Provides default MasterIndex key.
   * @returns {string} Default master index key.
   */
  static getDefaultMasterIndexKey() {
    return DEFAULT_MASTER_INDEX_KEY;
  }

  /**
   * Provides default lock timeout.
   * @returns {number} Default lock timeout in milliseconds.
   */
  static getDefaultLockTimeout() {
    return DEFAULT_LOCK_TIMEOUT_MS;
  }

  /**
   * Provides default retry attempts for lock acquisition.
   * @returns {number} Default retry attempt count.
   */
  static getDefaultRetryAttempts() {
    return DEFAULT_RETRY_ATTEMPTS;
  }

  /**
   * Provides default retry delay.
   * @returns {number} Default retry delay in milliseconds.
   */
  static getDefaultRetryDelayMs() {
    return DEFAULT_RETRY_DELAY_MS;
  }

  /**
   * Provides default lock retry backoff base.
   * @returns {number} Default lock retry backoff base.
   */
  static getDefaultLockRetryBackoffBase() {
    return DEFAULT_LOCK_RETRY_BACKOFF_BASE;
  }

  /**
   * Provides default file retry attempts.
   * @returns {number} Default file retry attempt count.
   */
  static getDefaultFileRetryAttempts() {
    return DEFAULT_FILE_RETRY_ATTEMPTS;
  }

  /**
   * Provides default file retry delay.
   * @returns {number} Default file retry delay in milliseconds.
   */
  static getDefaultFileRetryDelayMs() {
    return DEFAULT_FILE_RETRY_DELAY_MS;
  }

  /**
   * Provides default file retry backoff base.
   * @returns {number} Default file retry backoff base.
   */
  static getDefaultFileRetryBackoffBase() {
    return DEFAULT_FILE_RETRY_BACKOFF_BASE;
  }

  /**
   * Provides default QueryEngine max nested depth.
   * @returns {number} Default max nested depth.
   */
  static getDefaultQueryEngineMaxNestedDepth() {
    return DEFAULT_QUERY_ENGINE_MAX_NESTED_DEPTH;
  }

  /**
   * Provides default QueryEngine supported operators.
   * @returns {string[]} Default supported operators.
   */
  static getDefaultQueryEngineSupportedOperators() {
    return Array.from(DEFAULT_QUERY_ENGINE_SUPPORTED_OPERATORS);
  }

  /**
   * Provides default QueryEngine logical operators.
   * @returns {string[]} Default logical operators.
   */
  static getDefaultQueryEngineLogicalOperators() {
    return Array.from(DEFAULT_QUERY_ENGINE_LOGICAL_OPERATORS);
  }
}

DatabaseConfig._defaultRootFolderId = null;
