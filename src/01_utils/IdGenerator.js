/**
 * IdGenerator - Provides unique ID generation for GAS DB
 *
 * This class provides various methods for generating unique identifiers
 * for documents and other entities in the database system.
 */
const UUID_LENGTH = 36;
const UUID_DASH_POSITION_ONE = 8;
const UUID_DASH_POSITION_TWO = 13;
const UUID_DASH_POSITION_THREE = 18;
const UUID_DASH_POSITION_FOUR = 23;
const UUID_DASH_POSITIONS = new Set([
  UUID_DASH_POSITION_ONE,
  UUID_DASH_POSITION_TWO,
  UUID_DASH_POSITION_THREE,
  UUID_DASH_POSITION_FOUR
]);
const UUID_VERSION_POSITION = 14;
const UUID_VARIANT_POSITION = 19;
const UUID_VERSION_CHAR = '4';
const UUID_VARIANT_START = 8;
const UUID_VARIANT_RANGE = 4;
const HEX_BASE = 16;
const MILLISECONDS_PER_SECOND = 1000;
const TIMESTAMP_RANDOM_MAX = 1000;
const TIMESTAMP_RANDOM_PAD = 3;
const DEFAULT_SHORT_ID_LENGTH = 8;
const DEFAULT_ALPHANUMERIC_ID_LENGTH = 12;
const DEFAULT_NUMERIC_ID_LENGTH = 10;
const NUMERIC_NON_ZERO_START_INDEX = 1;
const OBJECT_ID_TIMESTAMP_HEX_LENGTH = 8;
const OBJECT_ID_RANDOM_HEX_LENGTH = 10;
const OBJECT_ID_COUNTER_MAX = 16777216;
const OBJECT_ID_COUNTER_HEX_LENGTH = 6;
const SEQUENTIAL_COUNTER_PAD = 6;
const READABLE_ID_NUMBER_MAX = 1000;

/**
 * Generates unique identifiers for documents and system metadata.
 */
class IdGenerator {
  /**
   * Generate a UUID using Google Apps Script's Utilities.getUuid()
   * @returns {string} A UUID string
   */
  static generateUUID() {
    try {
      return Utilities.getUuid();
    } catch {
      // Fallback if Utilities.getUuid() is not available (e.g., in tests)
      return IdGenerator.generateFallbackUUID();
    }
  }

  /**
   * Generate a fallback UUID for environments where Utilities.getUuid() is not available
   * @returns {string} A UUID-like string
   */
  static generateFallbackUUID() {
    // Generate a UUID v4-like string manually
    const chars = '0123456789abcdef';
    let result = '';

    for (let i = 0; i < UUID_LENGTH; i++) {
      if (UUID_DASH_POSITIONS.has(i)) {
        result += '-';
      } else if (i === UUID_VERSION_POSITION) {
        result += UUID_VERSION_CHAR; // Version 4
      } else if (i === UUID_VARIANT_POSITION) {
        result += chars[Math.floor(Math.random() * UUID_VARIANT_RANGE) + UUID_VARIANT_START]; // 8, 9, a, or b
      } else {
        result += chars[Math.floor(Math.random() * HEX_BASE)];
      }
    }

    return result;
  }

  /**
   * Generate a timestamp-based ID
   * @param {string} prefix - Optional prefix for the ID
   * @returns {string} A timestamp-based ID
   */
  static generateTimestampId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * TIMESTAMP_RANDOM_MAX)
      .toString()
      .padStart(TIMESTAMP_RANDOM_PAD, '0');
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  /**
   * Generate a short ID using base36 encoding
   * @param {number} length - Desired length of the ID (default: 8)
   * @returns {string} A short ID string
   */
  static generateShortId(length = DEFAULT_SHORT_ID_LENGTH) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
  }

  /**
   * Generate an alphanumeric ID
   * @param {number} length - Desired length of the ID (default: 12)
   * @returns {string} An alphanumeric ID string
   */
  static generateAlphanumericId(length = DEFAULT_ALPHANUMERIC_ID_LENGTH) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
  }

  /**
   * Generate a numeric ID
   * @param {number} length - Desired length of the ID (default: 10)
   * @returns {string} A numeric ID string
   */
  static generateNumericId(length = DEFAULT_NUMERIC_ID_LENGTH) {
    const chars = '0123456789';
    let result = '';

    // Ensure first digit is not 0
    const nonZeroDigits = chars.substring(NUMERIC_NON_ZERO_START_INDEX);
    result += nonZeroDigits[Math.floor(Math.random() * nonZeroDigits.length)];

    for (let i = 1; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
  }

  /**
   * Generate a MongoDB-style ObjectId
   * @returns {string} A 24-character hex string ObjectId
   */
  static generateObjectId() {
    const timestamp = Math.floor(Date.now() / MILLISECONDS_PER_SECOND)
      .toString(HEX_BASE)
      .padStart(OBJECT_ID_TIMESTAMP_HEX_LENGTH, '0');

    // Generate 5 random bytes (10 hex chars)
    let randomBytes = '';
    for (let i = 0; i < OBJECT_ID_RANDOM_HEX_LENGTH; i++) {
      randomBytes += Math.floor(Math.random() * HEX_BASE).toString(HEX_BASE);
    }

    // Generate 3-byte counter (6 hex chars)
    const counter = Math.floor(Math.random() * OBJECT_ID_COUNTER_MAX)
      .toString(HEX_BASE)
      .padStart(OBJECT_ID_COUNTER_HEX_LENGTH, '0');

    return timestamp + randomBytes + counter;
  }

  /**
   * Generate a sequential ID with timestamp and counter
   * @param {string} prefix - Optional prefix for the ID
   * @returns {string} A sequential ID
   */
  static generateSequentialId(prefix = '') {
    // Use a static counter that resets each time the script runs
    if (!IdGenerator._counter) {
      IdGenerator._counter = 1;
    } else {
      IdGenerator._counter++;
    }

    const timestamp = Date.now();
    const counter = IdGenerator._counter.toString().padStart(SEQUENTIAL_COUNTER_PAD, '0');

    return prefix ? `${prefix}_${timestamp}_${counter}` : `${timestamp}_${counter}`;
  }

  /**
   * Generate a human-readable ID with words
   * @returns {string} A human-readable ID
   */
  static generateReadableId() {
    const adjectives = [
      'quick',
      'bright',
      'calm',
      'eager',
      'fair',
      'gentle',
      'happy',
      'kind',
      'lively',
      'nice',
      'polite',
      'quiet',
      'smart',
      'wise',
      'brave',
      'clean'
    ];

    const nouns = [
      'cat',
      'dog',
      'bird',
      'fish',
      'lion',
      'bear',
      'wolf',
      'fox',
      'deer',
      'owl',
      'bee',
      'ant',
      'tree',
      'rock',
      'star',
      'moon'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * READABLE_ID_NUMBER_MAX);

    return `${adjective}-${noun}-${number}`;
  }

  /**
   * Validate if a string looks like a valid UUID
   * @param {string} id - The ID to validate
   * @returns {boolean} True if the ID looks like a UUID
   */
  static isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Validate if a string looks like a valid ObjectId
   * @param {string} id - The ID to validate
   * @returns {boolean} True if the ID looks like an ObjectId
   */
  static isValidObjectId(id) {
    const objectIdRegex = /^[0-9a-f]{24}$/i;
    return objectIdRegex.test(id);
  }

  /**
   * Get the default ID generator function
   * @returns {Function} The default ID generator function
   */
  static getDefaultGenerator() {
    return IdGenerator.generateUUID;
  }

  /**
   * Create a custom ID generator with specific options
   * @param {Object} options - Options for ID generation
   * @param {string} options.type - Type of ID ('uuid', 'timestamp', 'short', 'alphanumeric', 'numeric', 'objectid', 'sequential', 'readable')
   * @param {string} options.prefix - Optional prefix
   * @param {number} options.length - Length for applicable types
   * @returns {Function} A custom ID generator function
   */
  // eslint-disable-next-line complexity
  static createCustomGenerator(options = {}) {
    const { type = 'uuid', prefix = '', length = DEFAULT_ALPHANUMERIC_ID_LENGTH } = options;

    switch (type.toLowerCase()) {
      case 'uuid':
        return () => IdGenerator.generateUUID();
      case 'timestamp':
        return () => IdGenerator.generateTimestampId(prefix);
      case 'short':
        return () => IdGenerator.generateShortId(length);
      case 'alphanumeric':
        return () => IdGenerator.generateAlphanumericId(length);
      case 'numeric':
        return () => IdGenerator.generateNumericId(length);
      case 'objectid':
        return () => IdGenerator.generateObjectId();
      case 'sequential':
        return () => IdGenerator.generateSequentialId(prefix);
      case 'readable':
        return () => IdGenerator.generateReadableId();
      default:
        throw new Error(`Unknown ID generator type: ${type}`);
    }
  }
}

// Static counter for sequential IDs
IdGenerator._counter = 0;
