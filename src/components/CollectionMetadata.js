/**
 * CollectionMetadata.js - Collection Metadata Management
 * 
 * Manages collection metadata as plain objects with methods for:
 * - Timestamp tracking (created, lastUpdated)
 * - Document count management
 * - Metadata serialisation and cloning
 * 
 * Part of Section 5: Collection Components and Basic CRUD Operations
 */

/**
 * CollectionMetadata - Manages collection metadata as plain objects
 * 
 * Handles metadata properties:
 * - created: Date when collection was created
 * - lastUpdated: Date when collection was last modified
 * - documentCount: Number of documents in collection
 */
class CollectionMetadata {
  /**
   * Create CollectionMetadata instance
   * @param {Object} [initialMetadata] - Initial metadata object
   * @param {Date} [initialMetadata.created] - Creation timestamp
   * @param {Date} [initialMetadata.lastUpdated] - Last update timestamp
   * @param {number} [initialMetadata.documentCount] - Document count
   * @throws {InvalidArgumentError} For invalid metadata input
   */
  constructor(initialMetadata = {}) {
    // Validate input is an object
    if (typeof initialMetadata !== 'object' || initialMetadata === null || Array.isArray(initialMetadata)) {
      throw new InvalidArgumentError('initialMetadata', initialMetadata, 'Must be an object');
    }

    const now = new Date();
    
    // Set created timestamp
    if (initialMetadata.created !== undefined) {
      if (!(initialMetadata.created instanceof Date) || isNaN(initialMetadata.created.getTime())) {
        throw new InvalidArgumentError('created', initialMetadata.created, 'Must be a valid Date object');
      }
      this.created = new Date(initialMetadata.created.getTime());
    } else {
      this.created = new Date(now.getTime());
    }

    // Set lastUpdated timestamp
    if (initialMetadata.lastUpdated !== undefined) {
      if (!(initialMetadata.lastUpdated instanceof Date) || isNaN(initialMetadata.lastUpdated.getTime())) {
        throw new InvalidArgumentError('lastUpdated', initialMetadata.lastUpdated, 'Must be a valid Date object');
      }
      this.lastUpdated = new Date(initialMetadata.lastUpdated.getTime());
    } else {
      this.lastUpdated = new Date(now.getTime());
    }

    // Set document count with validation
    if (initialMetadata.documentCount !== undefined) {
      if (typeof initialMetadata.documentCount !== 'number' || !Number.isInteger(initialMetadata.documentCount)) {
        throw new InvalidArgumentError('documentCount', initialMetadata.documentCount, 'Must be an integer');
      }
      if (initialMetadata.documentCount < 0) {
        throw new InvalidArgumentError('documentCount', initialMetadata.documentCount, 'Cannot be negative');
      }
      this.documentCount = initialMetadata.documentCount;
    } else {
      this.documentCount = 0;
    }
  }

  /**
   * Update the lastModified timestamp to current time
   */
  updateLastModified() {
    this.lastUpdated = new Date();
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
   * Return metadata as plain object
   * @returns {Object} Plain object with metadata properties
   */
  toObject() {
    return {
      created: new Date(this.created.getTime()),
      lastUpdated: new Date(this.lastUpdated.getTime()),
      documentCount: this.documentCount
    };
  }

  /**
   * Create independent clone of metadata
   * @returns {CollectionMetadata} New instance with same values
   */
  clone() {
    return new CollectionMetadata({
      created: new Date(this.created.getTime()),
      lastUpdated: new Date(this.lastUpdated.getTime()),
      documentCount: this.documentCount
    });
  }
}
