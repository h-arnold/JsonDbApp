/**
 * Collection Data Operations Tests
 *
 * Tests for Collection data loading, saving, and corrupted file handling.
 * Refactored from old_tests/unit/Collection/01_CollectionDataOperationsTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  setupCollectionTestEnvironment,
  createTestFileWithContent,
  registerAndCreateCollection
} from '../../helpers/collection-test-helpers.js';

describe('Collection Data Operations', () => {
  it('loads data from a valid Drive file', () => {
    // Arrange - create file with test data
    const env = setupCollectionTestEnvironment();

    const testData = {
      metadata: {
        created: new Date('2023-01-01').toISOString(),
        lastUpdated: new Date('2023-01-02').toISOString(),
        documentCount: 2
      },
      documents: {
        doc1: { _id: 'doc1', name: 'Test Doc 1', value: 100 },
        doc2: { _id: 'doc2', name: 'Test Doc 2', value: 200 }
      }
    };

    const fileId = createTestFileWithContent(
      env.folderId,
      'testDataCollection.json',
      JSON.stringify(testData)
    );

    const collectionName = 'dataTestCollection';
    const collection = registerAndCreateCollection(env, collectionName, fileId, 2);

    // Act - Trigger data loading
    const documents = collection.find({});

    // Assert
    expect(documents).toHaveLength(2);
    expect(documents[0].name).toBe('Test Doc 1');
  });

  it('handles corrupted data files gracefully', () => {
    // Arrange - create corrupted file
    const env = setupCollectionTestEnvironment();

    const fileId = createTestFileWithContent(
      env.folderId,
      'corruptedCollection.json',
      '{ "invalid": json data }'
    );

    const collectionName = 'corruptedTestCollection';
    const collection = registerAndCreateCollection(env, collectionName, fileId);

    // Act & Assert - Should handle corrupted file gracefully
    expect(() => {
      collection.find({});
    }).toThrow(OperationError);
  });

  it('saves data to Drive and verifies dirty state', () => {
    // Arrange
    const env = setupCollectionTestEnvironment();
    const collectionName = 'saveTestCollection';
    const fileId = createTestFileWithContent(
      env.folderId,
      `${collectionName}.json`,
      JSON.stringify({
        documents: {},
        metadata: {
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          documentCount: 0
        }
      })
    );

    const collection = registerAndCreateCollection(env, collectionName, fileId);

    // Act - Insert a document to make collection dirty
    collection.insertOne({ name: 'Test Save Doc', value: 500 });

    // Assert
    expect(collection.isDirty()).toBe(true);

    // Save to Drive
    collection.save();
    expect(collection.isDirty()).toBe(false);
  });
});
