/**
 * 01_MasterIndexMetadataNormaliser.js - Normalises collection metadata for MasterIndex operations.
 *
 * Ensures all collection metadata inputs resolved by MasterIndex are converted into
 * fully hydrated CollectionMetadata instances with validated timestamps and tokens.
 * This keeps _addCollectionInternal lean and prevents duplicated normalisation logic.
 */
/* exported MasterIndexMetadataNormaliser */
/* global CollectionMetadata, Validate */

/**
 * Provides consistent conversion of collection metadata inputs into CollectionMetadata instances.
 */
class MasterIndexMetadataNormaliser {
  /**
   * Create a normaliser bound to the supplied MasterIndex instance.
   * @param {MasterIndex} masterIndex - Parent MasterIndex facade
   */
  constructor(masterIndex) {
    Validate.required(masterIndex, 'masterIndex');
    this._masterIndex = masterIndex;
  }

  /**
   * Convert metadata input into a CollectionMetadata instance bound to the supplied name.
   * @param {string} name - Collection identifier
   * @param {Object|CollectionMetadata} metadata - Incoming metadata payload
   * @returns {CollectionMetadata} Hydrated metadata instance
   */
  normalise(name, metadata) {
    Validate.nonEmptyString(name, 'name');
    Validate.required(metadata, 'metadata');

    if (metadata instanceof CollectionMetadata) {
      return this._normaliseFromInstance(name, metadata);
    }

    Validate.object(metadata, 'metadata', false);
    return this._normaliseFromObject(name, metadata);
  }

  /**
   * Normalise an existing CollectionMetadata instance.
   * @param {string} targetName - Expected collection name
   * @param {CollectionMetadata} metadata - Source metadata instance
   * @returns {CollectionMetadata} Normalised metadata
   * @private
   */
  _normaliseFromInstance(targetName, metadata) {
    Validate.required(metadata, 'metadata');

    if (metadata.name === targetName) {
      return metadata;
    }

    return new CollectionMetadata(targetName, metadata.fileId, {
      created: this._cloneDate(metadata.created),
      lastUpdated: this._cloneDate(metadata.lastUpdated),
      documentCount: metadata.documentCount,
      modificationToken: metadata.getModificationToken(),
      lockStatus: this._cloneLockStatus(metadata.getLockStatus())
    });
  }

  /**
   * Normalise metadata supplied as a plain object.
   * @param {string} name - Collection identifier
   * @param {Object} metadata - Plain metadata object
   * @returns {CollectionMetadata} Normalised metadata instance
   * @private
   */
  _normaliseFromObject(name, metadata) {
    const created = this._coerceDate(metadata.created, this._masterIndex._getCurrentTimestamp());
    const lastUpdatedSource =
      metadata.lastUpdated !== undefined ? metadata.lastUpdated : metadata.lastModified;
    const lastUpdated = this._coerceDate(
      lastUpdatedSource,
      this._masterIndex._getCurrentTimestamp()
    );
    const modificationToken = this._normaliseModificationToken(metadata.modificationToken);

    return new CollectionMetadata(name, metadata.fileId || null, {
      created: created,
      lastUpdated: lastUpdated,
      documentCount: metadata.documentCount || 0,
      modificationToken: modificationToken,
      lockStatus: this._cloneLockStatus(metadata.lockStatus)
    });
  }

  /**
   * Clone a Date instance defensively.
   * @param {Date} source - Source date
   * @returns {Date} Cloned date
   * @private
   */
  _cloneDate(source) {
    if (source instanceof Date) {
      return new Date(source.getTime());
    }
    return this._masterIndex._getCurrentTimestamp();
  }

  /**
   * Coerce arbitrary input into a Date, defaulting to the supplied fallback when absent.
   * @param {*} value - Value to coerce
   * @param {Date} fallback - Fallback date when value is undefined/null
   * @returns {Date} Coerced date
   * @private
   */
  _coerceDate(value, fallback) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return new Date(value.getTime());
    }

    if (value !== undefined && value !== null) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date(fallback.getTime());
  }

  /**
   * Clone lock status to avoid external mutations propagating into MasterIndex state.
   * @param {Object|null|undefined} lockStatus - Source lock status
   * @returns {Object|null} Normalised lock status payload
   * @private
   */
  _cloneLockStatus(lockStatus) {
    if (lockStatus === null || lockStatus === undefined) {
      return null;
    }

    Validate.object(lockStatus, 'lockStatus');
    Validate.optional(lockStatus.isLocked, Validate.boolean, 'lockStatus.isLocked');
    Validate.optional(lockStatus.lockedBy, Validate.string, 'lockStatus.lockedBy');
    Validate.optional(lockStatus.lockedAt, Validate.number, 'lockStatus.lockedAt');
    Validate.optional(lockStatus.lockTimeout, Validate.number, 'lockStatus.lockTimeout');

    return {
      isLocked: lockStatus.isLocked === true,
      lockedBy: lockStatus.lockedBy !== undefined ? lockStatus.lockedBy : null,
      lockedAt: typeof lockStatus.lockedAt === 'number' ? lockStatus.lockedAt : null,
      lockTimeout: typeof lockStatus.lockTimeout === 'number' ? lockStatus.lockTimeout : null
    };
  }

  /**
   * Normalise modification token input, generating a new token when absent.
   * @param {*} token - Input token value
   * @returns {string} Valid modification token
   * @private
   */
  _normaliseModificationToken(token) {
    if (token === undefined || token === null) {
      return this._masterIndex.generateModificationToken();
    }

    if (typeof token === 'string' && token.trim().length > 0) {
      return token;
    }

    return this._masterIndex.generateModificationToken();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MasterIndexMetadataNormaliser };
}
