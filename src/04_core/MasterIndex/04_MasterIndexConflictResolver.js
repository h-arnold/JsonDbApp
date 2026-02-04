/**
 * 04_MasterIndexConflictResolver.js - Conflict detection and resolution for MasterIndex.
 *
 * Centralises modification token validation and conflict strategies so that the
 * MasterIndex facade can focus on orchestration and persistence.
 */
/* exported MasterIndexConflictResolver */

const DEFAULT_CONFLICT_STRATEGY = 'LAST_WRITE_WINS';
const RANDOM_TOKEN_RADIX = 36;
const RANDOM_TOKEN_OFFSET = 2;
const RANDOM_TOKEN_LENGTH = 9;
const MODIFICATION_TOKEN_PATTERN = /^\d+-[a-z0-9]+$/;

/**
 * Coordinates modification token generation, validation, and conflict resolution.
 * @remarks This helper does not persist changes; callers must handle persistence.
 */
class MasterIndexConflictResolver {
  /**
   * Create a conflict resolver bound to a MasterIndex instance.
   * @param {MasterIndex} masterIndex - Parent MasterIndex facade
   * @param {Object} dependencies - Required dependencies
   * @param {Function} dependencies.CollectionMetadata - CollectionMetadata class
   * @param {Object} dependencies.Validate - Validation helper
   * @param {Object} dependencies.ErrorHandler - Error handler module
   */
  // eslint-disable-next-line complexity
  constructor(masterIndex, dependencies = {}) {
    const { CollectionMetadata, Validate, ErrorHandler } = dependencies;
    if (!CollectionMetadata || !Validate || !ErrorHandler) {
      if (ErrorHandler && ErrorHandler.ErrorTypes && ErrorHandler.ErrorTypes.INVALID_ARGUMENT) {
        throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
          'dependencies',
          dependencies,
          'CollectionMetadata, Validate, and ErrorHandler are required'
        );
      }
      throw new Error('CollectionMetadata, Validate, and ErrorHandler are required.');
    }

    Validate.required(masterIndex, 'masterIndex');
    this._masterIndex = masterIndex;
    this._CollectionMetadata = CollectionMetadata;
    this._Validate = Validate;
    this._ErrorHandler = ErrorHandler;
  }

  /**
   * Generate a modification token.
   * @returns {string} Unique modification token
   */
  generateModificationToken() {
    const timestamp = this._masterIndex._getCurrentTimestamp().getTime();
    const randomPart = Math.random()
      .toString(RANDOM_TOKEN_RADIX)
      .slice(RANDOM_TOKEN_OFFSET, RANDOM_TOKEN_OFFSET + RANDOM_TOKEN_LENGTH);
    return `${timestamp}-${randomPart}`;
  }

  /**
   * Validate a modification token format.
   * @param {string} token - Token string to validate
   * @returns {boolean} True if valid format (timestamp-random)
   */
  validateModificationToken(token) {
    if (typeof token !== 'string') {
      return false;
    }
    return MODIFICATION_TOKEN_PATTERN.test(token);
  }

  /**
   * Check if there's a conflict for a collection.
   * @param {string} collectionName - Collection name
   * @param {string} expectedToken - Expected modification token
   * @returns {boolean} True if there's a conflict
   */
  hasConflict(collectionName, expectedToken) {
    this._Validate.nonEmptyString(collectionName, 'collectionName');
    this._Validate.nonEmptyString(expectedToken, 'expectedToken');

    const collection = this._masterIndex.getCollection(collectionName);
    if (!collection) {
      return false;
    }

    const currentToken =
      typeof collection.getModificationToken === 'function'
        ? collection.getModificationToken()
        : collection.modificationToken;
    return currentToken !== expectedToken;
  }

  /**
   * Resolve a conflict using a specified strategy.
   * @param {string} collectionName - Collection name
   * @param {Object} newData - New data to apply
   * @param {string} strategy - Resolution strategy
   * @returns {Object} Resolution result
   */
  resolveConflict(collectionName, newData, strategy = DEFAULT_CONFLICT_STRATEGY) {
    this._Validate.nonEmptyString(collectionName, 'collectionName');
    this._Validate.object(newData, 'newData', false);

    const collectionMetadata = this._resolveCollectionMetadata(collectionName);

    switch (strategy) {
      case DEFAULT_CONFLICT_STRATEGY:
        this._applyLastWriteWins(collectionMetadata, newData);
        return { success: true, data: collectionMetadata, strategy };
      default:
        throw new this._ErrorHandler.ErrorTypes.CONFIGURATION_ERROR(
          `Unknown conflict resolution strategy: ${strategy}`
        );
    }
  }

  /**
   * Resolve collection metadata from internal storage.
   * @param {string} collectionName - Collection name
   * @returns {CollectionMetadata} Hydrated collection metadata
   * @private
   */
  _resolveCollectionMetadata(collectionName) {
    const collectionData = this._masterIndex._getCollectionData(collectionName);
    if (!collectionData) {
      throw new this._ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(collectionName);
    }

    return collectionData instanceof this._CollectionMetadata
      ? collectionData
      : new this._CollectionMetadata(collectionData);
  }

  /**
   * Apply last-write-wins conflict strategy updates.
   * @param {CollectionMetadata} collectionMetadata - Target metadata instance
   * @param {Object} newData - Incoming data payload
   * @returns {void}
   * @private
   */
  _applyLastWriteWins(collectionMetadata, newData) {
    const updateKeys = Object.keys(newData);
    for (const key of updateKeys) {
      switch (key) {
        case 'documentCount':
          collectionMetadata.setDocumentCount(newData[key]);
          break;
        case 'lockStatus':
          collectionMetadata.setLockStatus(newData[key]);
          break;
        default:
          break;
      }
    }

    collectionMetadata.setModificationToken(this.generateModificationToken());
    collectionMetadata.touch();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MasterIndexConflictResolver };
}
