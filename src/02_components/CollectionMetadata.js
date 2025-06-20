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
    // Handle different constructor signatures
    let name = null;
    let metadata = {};
    
    if (typeof nameOrInitialMetadata === 'string') {
      // Constructor called with name parameter: new CollectionMetadata(name, fileId, initialMetadata)
      name = nameOrInitialMetadata;
      
      // Validate name
      if (name === '') {
        throw new InvalidArgumentError('name', name, 'Cannot be empty string');
      }
      
      // Validate fileId
      if (fileId !== null && typeof fileId !== 'string') {
        throw new InvalidArgumentError('fileId', fileId, 'Must be a string or null');
      }
      
      metadata = initialMetadata || {};
    } else if (typeof nameOrInitialMetadata === 'object' && nameOrInitialMetadata !== null && !Array.isArray(nameOrInitialMetadata)) {
      // Constructor called with legacy signature: new CollectionMetadata(initialMetadata)
      metadata = nameOrInitialMetadata;
      name = metadata.name || null;
      fileId = metadata.fileId || null;
    } else if (nameOrInitialMetadata !== null) {
      // Invalid first parameter
      if (typeof nameOrInitialMetadata !== 'string') {
        throw new InvalidArgumentError('name', nameOrInitialMetadata, 'Must be a string');
      }
    }

    // Validate metadata is an object
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
      throw new InvalidArgumentError('initialMetadata', metadata, 'Must be an object');
    }

    // Set name and fileId properties
    this.name = name;
    this.fileId = fileId;

    // Validate that both name and fileId are provided - required for usable metadata
    if (!this.name || typeof this.name !== 'string' || this.name.trim() === '') {
      throw new InvalidArgumentError('name', this.name, 'Collection name is required and must be a non-empty string');
    }
    
    if (!this.fileId || typeof this.fileId !== 'string' || this.fileId.trim() === '') {
      throw new InvalidArgumentError('fileId', this.fileId, 'File ID is required and must be a non-empty string');
    }

    const now = new Date();
    
    // Set created timestamp
    if (metadata.created !== undefined) {
      if (!(metadata.created instanceof Date) || isNaN(metadata.created.getTime())) {
        throw new InvalidArgumentError('created', metadata.created, 'Must be a valid Date object');
      }
      this.created = new Date(metadata.created.getTime());
    } else {
      this.created = new Date(now.getTime());
    }

    // Set lastUpdated timestamp
    if (metadata.lastUpdated !== undefined) {
      if (!(metadata.lastUpdated instanceof Date) || isNaN(metadata.lastUpdated.getTime())) {
        throw new InvalidArgumentError('lastUpdated', metadata.lastUpdated, 'Must be a valid Date object');
      }
      this.lastUpdated = new Date(metadata.lastUpdated.getTime());
    } else {
      this.lastUpdated = new Date(now.getTime());
    }

    // Set document count with validation
    if (metadata.documentCount !== undefined) {
      if (typeof metadata.documentCount !== 'number' || !Number.isInteger(metadata.documentCount)) {
        throw new InvalidArgumentError('documentCount', metadata.documentCount, 'Must be an integer');
      }
      if (metadata.documentCount < 0) {
        throw new InvalidArgumentError('documentCount', metadata.documentCount, 'Cannot be negative');
      }
      this.documentCount = metadata.documentCount;
    } else {
      this.documentCount = 0;
    }

    // Set modification token
    if (metadata.modificationToken !== undefined) {
      if (metadata.modificationToken !== null && (typeof metadata.modificationToken !== 'string' || metadata.modificationToken === '')) {
        throw new InvalidArgumentError('modificationToken', metadata.modificationToken, 'Must be a non-empty string or null');
      }
      this.modificationToken = metadata.modificationToken;
    } else {
      this.modificationToken = null;
    }

    // Set lock status
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
    if (typeof lockStatus !== 'object' || lockStatus === null || Array.isArray(lockStatus)) {
      throw new InvalidArgumentError('lockStatus', lockStatus, 'Must be an object');
    }

    const requiredProperties = ['isLocked', 'lockedBy', 'lockedAt', 'lockTimeout'];
    for (const prop of requiredProperties) {
      if (!lockStatus.hasOwnProperty(prop)) {
        throw new InvalidArgumentError('lockStatus', lockStatus, `Must have ${prop} property`);
      }
    }

    if (typeof lockStatus.isLocked !== 'boolean') {
      throw new InvalidArgumentError('lockStatus.isLocked', lockStatus.isLocked, 'Must be a boolean');
    }

    if (lockStatus.lockedBy !== null && typeof lockStatus.lockedBy !== 'string') {
      throw new InvalidArgumentError('lockStatus.lockedBy', lockStatus.lockedBy, 'Must be a string or null');
    }

    if (lockStatus.lockedAt !== null && typeof lockStatus.lockedAt !== 'number') {
      throw new InvalidArgumentError('lockStatus.lockedAt', lockStatus.lockedAt, 'Must be a number timestamp or null');
    }

    if (lockStatus.lockTimeout !== null && typeof lockStatus.lockTimeout !== 'number') {
      throw new InvalidArgumentError('lockStatus.lockTimeout', lockStatus.lockTimeout, 'Must be a number or null');
    }
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
    if (token !== null && (typeof token !== 'string' || token === '')) {
      throw new InvalidArgumentError('modificationToken', token, 'Must be a non-empty string or null');
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
    if (this.documentCount <= 0) {
      throw new InvalidArgumentError('documentCount', this.documentCount, 'Cannot decrement below zero');
    }
    this.documentCount--;
    this.updateLastModified();
  }

  /**
   * Set document count to specific value and update lastModified
   * @param {number} count - New document count
   * @throws {InvalidArgumentError} For invalid count values
   */
  setDocumentCount(count) {
    if (typeof count !== 'number' || !Number.isInteger(count)) {
      throw new InvalidArgumentError('count', count, 'Must be an integer');
    }
    if (count < 0) {
      throw new InvalidArgumentError('count', count, 'Cannot be negative');
    }
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
    result.lockStatus = this.lockStatus !== null ? {
      isLocked: this.lockStatus.isLocked,
      lockedBy: this.lockStatus.lockedBy,
      lockedAt: this.lockStatus.lockedAt,
      lockTimeout: this.lockStatus.lockTimeout
    } : null;

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
      lockStatus: this.lockStatus ? {
        isLocked: this.lockStatus.isLocked,
        lockedBy: this.lockStatus.lockedBy,
        lockedAt: this.lockStatus.lockedAt, // Keep as timestamp number
        lockTimeout: this.lockStatus.lockTimeout // Keep as timestamp number
      } : null
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
     if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
       throw new InvalidArgumentError('obj', obj, 'Must be an object');
     }

     // Check for required fields
     if (!obj.hasOwnProperty('name') || !obj.hasOwnProperty('fileId')) {
       throw new InvalidArgumentError('obj', obj, 'Must have name and fileId properties');
     }

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


