/**
 * 02_MasterIndexHistoryManager.js - Manages MasterIndex modification history entries.
 *
 * Encapsulates creation, validation, and trimming of modification history records to keep
 * MasterIndex audit tracking consistent and centralised.
 */
/* exported MasterIndexHistoryManager, DEFAULT_MODIFICATION_HISTORY_LIMIT */
/* global Validate, CollectionMetadata, ObjectUtils */

const DEFAULT_MODIFICATION_HISTORY_LIMIT = 100;

/**
 * Handles creation and trimming of modification history entries for MasterIndex operations.
 */
class MasterIndexHistoryManager {
  /**
   * Create a history manager bound to the supplied MasterIndex instance.
   * @param {MasterIndex} masterIndex - Parent MasterIndex facade
   */
  constructor(masterIndex) {
    Validate.required(masterIndex, 'masterIndex');
    this._masterIndex = masterIndex;
  }

  /**
   * Record a modification history entry for a collection.
   * @param {string} collectionName - Target collection name
   * @param {string} operation - Operation identifier
   * @param {Object} payload - Supplemental data payload
   * @param {Date} [timestamp] - Optional timestamp override
   */
  record(collectionName, operation, payload, timestamp = this._masterIndex._getCurrentTimestamp()) {
    if (!this._isValidCollectionName(collectionName)) {
      return;
    }

    const entries = this._getHistoryEntries(collectionName);
    const entry = this._createHistoryEntry(operation, payload, timestamp);

    entries.push(entry);
    this._applyHistoryLimit(entries);
  }

  /**
   * Create a history entry with normalised operation, payload, and timestamp values.
   * @param {string} operation - Operation identifier
   * @param {*} payload - Associated payload
   * @param {Date|number|string} timestamp - Source timestamp
   * @returns {{operation: string, timestamp: string, data: *}} Normalised history entry
   * @private
   */
  _createHistoryEntry(operation, payload, timestamp) {
    return {
      operation: this._normaliseOperation(operation),
      timestamp: this._normaliseTimestamp(timestamp),
      data: this._normalisePayload(payload)
    };
  }

  /**
   * Ensure the modification history array exists for the supplied collection.
   * @param {string} collectionName - Collection identifier
   * @returns {Array<Object>} Existing or newly created history entries
   * @private
   */
  _getHistoryEntries(collectionName) {
    const state = this._masterIndex._data;
    if (!Validate.isPlainObject(state.modificationHistory)) {
      state.modificationHistory = {};
    }

    if (!Array.isArray(state.modificationHistory[collectionName])) {
      state.modificationHistory[collectionName] = [];
    }

    return state.modificationHistory[collectionName];
  }

  /**
   * Validate collection name before recording history entries.
   * @param {*} name - Candidate name
   * @returns {boolean} True when valid
   * @private
   */
  _isValidCollectionName(name) {
    return typeof name === 'string' && name.trim().length > 0;
  }

  /**
   * Convert timestamp input into ISO string representation.
   * @param {Date|number|string} timestamp - Source timestamp
   * @returns {string} ISO timestamp string
   * @private
   */
  _normaliseTimestamp(timestamp) {
    const resolvedTimestamp = this._coerceTimestamp(timestamp);
    return resolvedTimestamp.toISOString();
  }

  /**
   * Coerce timestamp input into a valid Date instance.
   * @param {*} timestamp - Candidate timestamp value
   * @returns {Date} Coerced timestamp
   * @private
   */
  _coerceTimestamp(timestamp) {
    if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
      return timestamp;
    }

    const numberTimestamp = this._coerceNumberTimestamp(timestamp);
    if (numberTimestamp) {
      return numberTimestamp;
    }

    const stringTimestamp = this._coerceStringTimestamp(timestamp);
    if (stringTimestamp) {
      return stringTimestamp;
    }

    return this._masterIndex._getCurrentTimestamp();
  }

  /**
   * Attempt to convert a numeric timestamp into a Date instance.
   * @param {*} candidate - Value to coerce
   * @returns {Date|null} Coerced Date or null when invalid
   * @private
   */
  _coerceNumberTimestamp(candidate) {
    if (typeof candidate !== 'number' || isNaN(candidate)) {
      return null;
    }

    const converted = new Date(candidate);
    return isNaN(converted.getTime()) ? null : converted;
  }

  /**
   * Attempt to convert a string timestamp into a Date instance.
   * @param {*} candidate - Value to coerce
   * @returns {Date|null} Coerced Date or null when invalid
   * @private
   */
  _coerceStringTimestamp(candidate) {
    if (typeof candidate !== 'string' || candidate.trim().length === 0) {
      return null;
    }

    const converted = new Date(candidate);
    return isNaN(converted.getTime()) ? null : converted;
  }

  /**
   * Trim history entries to the configured limit.
   * @param {Array<Object>} entries - History entries for a collection
   * @private
   */
  _applyHistoryLimit(entries) {
    const limit = this._getHistoryLimit();
    if (limit <= 0) {
      return;
    }

    if (entries.length > limit) {
      entries.splice(0, entries.length - limit);
    }
  }

  /**
   * Determine history limit, falling back to default constant when configuration is invalid.
   * @returns {number} Maximum entries to retain
   * @private
   */
  _getHistoryLimit() {
    const configuredLimit = this._masterIndex._config.modificationHistoryLimit;
    if (typeof configuredLimit === 'number' && configuredLimit > 0) {
      return Math.floor(configuredLimit);
    }

    return DEFAULT_MODIFICATION_HISTORY_LIMIT;
  }

  /**
   * Normalise history operation name.
   * @param {string} operation - Operation identifier
   * @returns {string} Sanitised operation name
   * @private
   */
  _normaliseOperation(operation) {
    if (typeof operation === 'string' && operation.trim().length > 0) {
      return operation.trim();
    }

    return 'UNKNOWN';
  }

  /**
   * Normalise payload to a serialisable value.
   * @param {*} payload - Source payload
   * @returns {*} Normalised payload
   * @private
   */
  _normalisePayload(payload) {
    if (payload === undefined || payload === null) {
      return null;
    }

    if (typeof payload !== 'object') {
      return payload;
    }

    return this._normaliseObjectPayload(payload);
  }

  /**
   * Normalise object payloads including recognised instances and collections.
   * @param {Object} payload - Payload to normalise
   * @returns {*} Normalised payload
   * @private
   */
  _normaliseObjectPayload(payload) {
    if (this._isRecognisedClassInstance(payload)) {
      return this._cloneRecognisedInstance(payload);
    }

    if (payload instanceof Date) {
      return new Date(payload.getTime());
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this._normalisePayload(item));
    }

    if (Validate.isPlainObject(payload)) {
      return this._clonePlainObjectPayload(payload);
    }

    return ObjectUtils.deepClone(payload);
  }

  /**
   * Clone plain object payloads while recursively normalising nested values.
   * @param {Object} source - Plain object payload
   * @returns {Object} Deep-cloned payload
   * @private
   */
  _clonePlainObjectPayload(source) {
    const clone = {};
    Object.keys(source).forEach(key => {
      clone[key] = this._normalisePayload(source[key]);
    });
    return clone;
  }

  /**
   * Determine whether the provided payload is a recognised class instance.
   * @param {*} payload - Candidate payload
   * @returns {boolean} True when recognised
   * @private
   */
  _isRecognisedClassInstance(payload) {
    return payload instanceof CollectionMetadata;
  }

  /**
   * Clone recognised class instances to avoid leaking live references.
   * @param {CollectionMetadata} instance - Recognised instance
   * @returns {CollectionMetadata} Independent clone instance
   * @private
   */
  _cloneRecognisedInstance(instance) {
    if (instance instanceof CollectionMetadata && typeof instance.clone === 'function') {
      return instance.clone();
    }

    return ObjectUtils.deepClone(instance);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MasterIndexHistoryManager };
}
