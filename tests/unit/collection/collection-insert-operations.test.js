/**
 * Collection Insert Operations Tests
 * 
 * Tests for Collection insert operations including insertOne with auto-generated and explicit IDs.
 * Refactored from old_tests/unit/Collection/02_CollectionInsertOperationsTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  setupCollectionTestEnvironment,
  createTestCollection
} from '../../helpers/collection-test-helpers.js';

describe('Collection Insert Operations', () => {
  it('inserts a single document and returns MongoDB-compatible result', () => {
    // Arrange
    const env = setupCollectionTestEnvironment();
    const collectionName = 'insertTestCollection';
    const { collection } = createTestCollection(env, collectionName);
    
    const testDoc = { name: 'Insert Test Doc', value: 300, tags: ['test', 'insert'] };
    
    // Act
    const result = collection.insertOne(testDoc);
    
    // Assert - Verify MongoDB-compatible return format
    expect(result).toHaveProperty('insertedId');
    expect(result).toHaveProperty('acknowledged');
    expect(result.acknowledged).toBe(true);
    expect(result.insertedId).not.toBeNull();
  });

  it('inserts a document with explicit _id and uses the provided ID', () => {
    // Arrange
    const env = setupCollectionTestEnvironment();
    const collectionName = 'insertExplicitIdTestCollection';
    const { collection } = createTestCollection(env, collectionName);
    
    const testDoc = { _id: 'explicit-id-123', name: 'Explicit ID Doc', value: 400 };
    
    // Act
    const result = collection.insertOne(testDoc);
    
    // Assert
    expect(result.insertedId).toBe('explicit-id-123');
    expect(result.acknowledged).toBe(true);
  });
});
