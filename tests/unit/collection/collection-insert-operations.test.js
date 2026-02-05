/**
 * Collection Insert Operations Tests
 *
 * Tests for Collection insert operations including insertOne with auto-generated and explicit IDs.
 * Refactored from old_tests/unit/Collection/02_CollectionInsertOperationsTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createIsolatedTestCollection,
  assertAcknowledgedWrite
} from '../../helpers/collection-test-helpers.js';

describe('Collection Insert Operations', () => {
  it('inserts a single document and returns MongoDB-compatible result', () => {
    // Arrange
    const collectionName = 'insertTestCollection';
    const { collection } = createIsolatedTestCollection(collectionName);

    const testDoc = { name: 'Insert Test Doc', value: 300, tags: ['test', 'insert'] };

    // Act
    const result = collection.insertOne(testDoc);

    // Assert - Verify MongoDB-compatible return format
    assertAcknowledgedWrite(result);
    expect(result).toHaveProperty('insertedId');
    expect(result.insertedId).not.toBeNull();
  });

  it('inserts a document with explicit _id and uses the provided ID', () => {
    // Arrange
    const collectionName = 'insertExplicitIdTestCollection';
    const { collection } = createIsolatedTestCollection(collectionName);

    const testDoc = { _id: 'explicit-id-123', name: 'Explicit ID Doc', value: 400 };

    // Act
    const result = collection.insertOne(testDoc);

    // Assert
    assertAcknowledgedWrite(result, { insertedId: 'explicit-id-123' });
  });
});
