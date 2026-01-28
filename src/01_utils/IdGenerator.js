/**
 * IdGenerator - Provides unique ID generation for GAS DB
 * 
 * This class provides various methods for generating unique identifiers
 * for documents and other entities in the database system.
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
    
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        result += '-';
      } else if (i === 14) {
        result += '4'; // Version 4
      } else if (i === 19) {
        result += chars[Math.floor(Math.random() * 4) + 8]; // 8, 9, a, or b
      } else {
        result += chars[Math.floor(Math.random() * 16)];
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
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }
  
  /**
   * Generate a short ID using base36 encoding
   * @param {number} length - Desired length of the ID (default: 8)
   * @returns {string} A short ID string
   */
  static generateShortId(length = 8) {
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
  static generateAlphanumericId(length = 12) {
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
  static generateNumericId(length = 10) {
    const chars = '0123456789';
    let result = '';
    
    // Ensure first digit is not 0
    result += chars.substring(1)[Math.floor(Math.random() * 9)];
    
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
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    
    // Generate 5 random bytes (10 hex chars)
    let randomBytes = '';
    for (let i = 0; i < 10; i++) {
      randomBytes += Math.floor(Math.random() * 16).toString(16);
    }
    
    // Generate 3-byte counter (6 hex chars)
    const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
    
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
    const counter = IdGenerator._counter.toString().padStart(6, '0');
    
    return prefix ? `${prefix}_${timestamp}_${counter}` : `${timestamp}_${counter}`;
  }
  
  /**
   * Generate a human-readable ID with words
   * @returns {string} A human-readable ID
   */
  static generateReadableId() {
    const adjectives = [
      'quick', 'bright', 'calm', 'eager', 'fair', 'gentle', 'happy', 'kind',
      'lively', 'nice', 'polite', 'quiet', 'smart', 'wise', 'brave', 'clean'
    ];
    
    const nouns = [
      'cat', 'dog', 'bird', 'fish', 'lion', 'bear', 'wolf', 'fox',
      'deer', 'owl', 'bee', 'ant', 'tree', 'rock', 'star', 'moon'
    ];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    
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
  static createCustomGenerator(options = {}) {
    const { type = 'uuid', prefix = '', length = 12 } = options;
    
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
