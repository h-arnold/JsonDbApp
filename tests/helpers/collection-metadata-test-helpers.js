/**
 * CollectionMetadata Test Helpers for Vitest
 *
 * Provides utilities for setting up and tearing down CollectionMetadata tests.
 */

/**
 * Creates a test metadata object with default values
 * @param {Object} overrides - Optional overrides for default values
 * @returns {Object} Test metadata object
 */
export const createTestMetadata = (overrides = {}) => {
  return {
    name: 'testCollection',
    fileId: 'testFileId',
    created: new Date('2024-01-01T00:00:00Z'),
    lastUpdated: new Date('2024-01-02T00:00:00Z'),
    documentCount: 0,
    modificationToken: null,
    lockStatus: null,
    ...overrides
  };
};

/**
 * Creates a test lock status object
 * @param {Object} overrides - Optional overrides for default values
 * @returns {Object} Test lock status object
 */
export const createTestLockStatus = (overrides = {}) => {
  return {
    isLocked: true,
    lockedBy: 'user123',
    lockedAt: Date.now(),
    lockTimeout: 300000,
    ...overrides
  };
};

/**
 * Waits for a small amount of time to ensure timestamp differences
 * @param {number} ms - Milliseconds to wait (default: 10)
 * @returns {Promise<void>}
 */
export const waitForTimestamp = (ms = 10) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
