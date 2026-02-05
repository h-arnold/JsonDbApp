/**
 * CollectionMetadata - Manages collection metadata as plain objects
 *
 * Handles metadata properties:
 * - name: Collection name
 * - fileId: Google Drive file ID
 * - created: Date when collection was created
 * - lastUpdated: Date when collection was last modified
 * - documentCount: Number of documents in collection
 * - modificationToken: Token for conflict detection
 * - lockStatus: Lock state information
 */
/* exported CollectionMetadata */
/**
 * Represents persisted metadata for a collection, providing validated access
 * to identifiers, document counts, timestamps, and lock information.
 */
class CollectionMetadata {
  /**
   * Create CollectionMetadata instance
   * @param {string|Object} [nameOrInitialMetadata] - Collection name or initial metadata object
   * @param {string} [fileId] - Google Drive file ID
   * @param {Object} [initialMetadata] - Initial metadata object when name is provided
   * @param {Date} [initialMetadata.created] - Creation timestamp
   * @param {Date} [initialMetadata.lastUpdated] - Last update timestamp
   * @param {number} [initialMetadata.documentCount] - Document count
   * @param {string} [initialMetadata.modificationToken] - Modification token
   * @param {Object} [initialMetadata.lockStatus] - Lock status
   * @throws {InvalidArgumentError} For invalid metadata input
   */
  constructor(nameOrInitialMetadata = {}, fileId = null, initialMetadata = {}) {
    const resolvedInput = this._normaliseConstructorInputs(
      nameOrInitialMetadata,
      fileId,
      initialMetadata
    );

    this._applyIdentifiers(resolvedInput.name, resolvedInput.fileId);
    this._initialiseTimestamps(resolvedInput.metadata);
    this._initialiseDocumentCount(resolvedInput.metadata);
    this._initialiseModificationToken(resolvedInput.metadata);
    this._initialiseLockStatus(resolvedInput.metadata);
  }

  /**
   * Normalise constructor inputs for different invocation signatures.
   * @param {string|Object} nameOrInitialMetadata - Collection name or metadata object
   * @param {string|null} fileId - File ID input
   * @param {Object} initialMetadata - Initial metadata input
   * @returns {{name: string|null, fileId: string|null, metadata: Object}} Normalised inputs
   * @private
   */
  _normaliseConstructorInputs(nameOrInitialMetadata, fileId, initialMetadata) {
    let name = null;
    let metadata = {};
    let resolvedFileId = fileId;

    if (typeof nameOrInitialMetadata === 'string') {
      Validate.nonEmptyString(nameOrInitialMetadata, 'name');
      Validate.optional(fileId, Validate.string, 'fileId');
      name = nameOrInitialMetadata;
      metadata = initialMetadata || {};
    } else if (Validate.isPlainObject(nameOrInitialMetadata)) {
      metadata = nameOrInitialMetadata;
      name = metadata.name || null;
      resolvedFileId = metadata.fileId || null;
    } else if (nameOrInitialMetadata !== null) {
      Validate.string(nameOrInitialMetadata, 'name');
    }

    Validate.object(metadata, 'initialMetadata');

    return { name, fileId: resolvedFileId, metadata };
  }

  /**
   * Apply and validate name and file ID.
   * @param {string|null} name - Collection name
   * @param {string|null} fileId - File ID
   * @private
   */
  _applyIdentifiers(name, fileId) {
    this.name = name;
    this.fileId = fileId;

    Validate.nonEmptyString(this.name, 'name');
    Validate.nonEmptyString(this.fileId, 'fileId');
  }

  /**
   * Initialise created and lastUpdated timestamps.
   * @param {Object} metadata - Metadata object
   * @private
   */
  _initialiseTimestamps(metadata) {
    const now = new Date();
    this.created = this._resolveDateValue(metadata.created, 'created', now);
    this.lastUpdated = this._resolveDateValue(metadata.lastUpdated, 'lastUpdated', now);
  }

  /**
   * Resolve a date value from metadata, falling back to the provided timestamp.
   * @param {Date|undefined} value - Value to resolve
   * @param {string} fieldName - Field name for error reporting
   * @param {Date} fallback - Fallback date
   * @returns {Date} Resolved date
   * @private
   */
  _resolveDateValue(value, fieldName, fallback) {
    if (value === undefined) {
      return new Date(fallback.getTime());
    }

    Validate.required(value, fieldName);
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new InvalidArgumentError(fieldName, value, 'Must be a valid Date object');
    }

    return new Date(value.getTime());
  }

  /**
   * Initialise document count from metadata.
   * @param {Object} metadata - Metadata object
   * @private
   */
  _initialiseDocumentCount(metadata) {
    if (metadata.documentCount !== undefined) {
      Validate.integer(metadata.documentCount, 'documentCount');
      Validate.nonNegativeNumber(metadata.documentCount, 'documentCount');
      this.documentCount = metadata.documentCount;
    } else {
      this.documentCount = 0;
    }
  }

  /**
   * Initialise modification token from metadata.
   * @param {Object} metadata - Metadata object
   * @private
   */
  _initialiseModificationToken(metadata) {
    if (metadata.modificationToken !== undefined) {
      if (metadata.modificationToken !== null) {
        Validate.nonEmptyString(metadata.modificationToken, 'modificationToken');
      }
      this.modificationToken = metadata.modificationToken;
    } else {
      this.modificationToken = null;
    }
  }

  /**
   * Initialise lock status from metadata.
   * @param {Object} metadata - Metadata object
   * @private
   */
  _initialiseLockStatus(metadata) {
    if (metadata.lockStatus !== undefined) {
      if (metadata.lockStatus !== null) {
        this._validateLockStatus(metadata.lockStatus);
      }
      this.lockStatus = metadata.lockStatus;
    } else {
      this.lockStatus = null;
    }
  }

  /**
   * Validate lock status object structure
   * @param {Object} lockStatus - Lock status object to validate
   * @private
   * @throws {InvalidArgumentError} For invalid lock status
   */
  _validateLockStatus(lockStatus) {
    Validate.object(lockStatus, 'lockStatus');
    Validate.objectProperties(
      lockStatus,
      ['isLocked', 'lockedBy', 'lockedAt', 'lockTimeout'],
      'lockStatus'
    );

    Validate.boolean(lockStatus.isLocked, 'lockStatus.isLocked');
    Validate.optional(lockStatus.lockedBy, Validate.string, 'lockStatus.lockedBy');
    Validate.optional(lockStatus.lockedAt, Validate.number, 'lockStatus.lockedAt');
    Validate.optional(lockStatus.lockTimeout, Validate.number, 'lockStatus.lockTimeout');
  }

  /**
   * Get modification token
   * @returns {string|null} Current modification token
   */
  getModificationToken() {
    return this.modificationToken;
  }

  /**
   * Set modification token with validation
   * @param {string|null} token - Modification token to set
   * @throws {InvalidArgumentError} For invalid token values
   */
  setModificationToken(token) {
    if (token !== null) {
      Validate.nonEmptyString(token, 'modificationToken');
    }
    this.modificationToken = token;
  }

  /**
   * Get lock status
   * @returns {Object|null} Current lock status
   */
  getLockStatus() {
    return this.lockStatus;
  }

  /**
   * Set lock status with validation
   * @param {Object|null} lockStatus - Lock status to set
   * @throws {InvalidArgumentError} For invalid lock status values
   */
  setLockStatus(lockStatus) {
    if (lockStatus !== null) {
      this._validateLockStatus(lockStatus);
    }
    this.lockStatus = lockStatus;
  }

  /**
   * Update the lastModified timestamp to current time
   */
  updateLastModified() {
    this.lastUpdated = new Date();
  }

  /**
   * Alias for updateLastModified() - updates the lastModified timestamp to current time
   * Used for touching/updating collection metadata without changing document count
   */
  touch() {
    this.updateLastModified();
  }

  /**
   * Increment document count by 1 and update lastModified
   */
  incrementDocumentCount() {
    this.documentCount++;
    this.updateLastModified();
  }

  /**
   * Decrement document count by 1 and update lastModified
   * @throws {InvalidArgumentError} If count would go below zero
   */
  decrementDocumentCount() {
    Validate.positiveNumber(this.documentCount, 'documentCount');
    this.documentCount--;
    this.updateLastModified();
  }

  /**
   * Set document count to specific value and update lastModified
   * @param {number} count - New document count
   * @throws {InvalidArgumentError} For invalid count values
   */
  setDocumentCount(count) {
    Validate.integer(count, 'count');
    Validate.nonNegativeNumber(count, 'count');
    this.documentCount = count;
    this.updateLastModified();
  }

  /**
   * toJSON hook for JSON.stringify
   * @returns {Object} Plain object with metadata properties and __type tag
   */
  toJSON() {
    const result = {
      __type: this.constructor.name,
      created: new Date(this.created.getTime()),
      lastUpdated: new Date(this.lastUpdated.getTime()),
      documentCount: this.documentCount
    };

    // Include name and fileId if they exist
    if (this.name !== null) result.name = this.name;
    if (this.fileId !== null) result.fileId = this.fileId;

    // Include modification token
    result.modificationToken = this.modificationToken;

    // Include lock status with deep copy if it exists
    result.lockStatus =
      this.lockStatus !== null
        ? {
            isLocked: this.lockStatus.isLocked,
            lockedBy: this.lockStatus.lockedBy,
            lockedAt: this.lockStatus.lockedAt,
            lockTimeout: this.lockStatus.lockTimeout
          }
        : null;

    return result;
  }

  /**
   * Create independent clone of metadata
   * @returns {CollectionMetadata} New instance with same values
   */
  clone() {
    const cloneMetadata = {
      created: new Date(this.created.getTime()),
      lastUpdated: new Date(this.lastUpdated.getTime()),
      documentCount: this.documentCount,
      modificationToken: this.modificationToken,
      lockStatus: this.lockStatus
        ? {
            isLocked: this.lockStatus.isLocked,
            lockedBy: this.lockStatus.lockedBy,
            lockedAt: this.lockStatus.lockedAt, // Keep as timestamp number
            lockTimeout: this.lockStatus.lockTimeout // Keep as timestamp number
          }
        : null
    };

    return new CollectionMetadata(this.name, this.fileId, cloneMetadata);
  }

  /**
   * Create CollectionMetadata instance from plain object
   * @param {Object} obj - Plain object with metadata properties
   * @returns {CollectionMetadata} New CollectionMetadata instance
   * @throws {InvalidArgumentError} For invalid input object
   * @static
   */
  static fromJSON(obj) {
    Validate.object(obj, 'obj');
    Validate.objectProperties(obj, ['name', 'fileId'], 'obj');

    const name = obj.name;
    const fileId = obj.fileId;
    const metadata = {
      created: obj.created,
      lastUpdated: obj.lastUpdated,
      documentCount: obj.documentCount,
      modificationToken: obj.modificationToken,
      lockStatus: obj.lockStatus
    };

    return new CollectionMetadata(name, fileId, metadata);
  }

  /**
   * Create new CollectionMetadata instance with specified name and fileId
   * @param {string} name - Collection name
   * @param {string} fileId - Google Drive file ID
   * @returns {CollectionMetadata} New CollectionMetadata instance
   * @static
   */
  static create(name, fileId) {
    return new CollectionMetadata(name, fileId);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CollectionMetadata };
}
