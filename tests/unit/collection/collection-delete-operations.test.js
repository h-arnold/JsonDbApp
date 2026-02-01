/**
 * Collection Delete Operations Tests
 * 
 * Tests for Collection deleteOne operations including:
 * - Deleting a document by its _id
 * - Deleting documents using field-based filters
 * - Deleting documents using multiple field filters
 * - Deleting documents using nested field filters
 * - Deleting documents using comparison operators in filters
 * - Ensuring no documents are deleted when the filter matches none
 * 
 * Refactored from old_tests/unit/Collection/05_CollectionDeleteOperationsTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  setupCollectionTestEnvironment,
  createTestCollection
} from '../../helpers/collection-test-helpers.js';

describe('Collection Delete Operations', () => {
  describe('deleteOne by ID', () => {
    it('deletes a document by its ID', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'deleteOneByIdTestCollection');
      
      const doc1 = collection.insertOne({ name: 'Delete Doc 1', value: 100 });
      collection.insertOne({ name: 'Delete Doc 2', value: 200 });
      
      // Act
      const deleteResult = collection.deleteOne({ _id: doc1.insertedId });
      
      // Assert - MongoDB-compatible return format
      expect(deleteResult.deletedCount).toBe(1);
      expect(deleteResult.acknowledged).toBe(true);
    });
  });

  describe('deleteOne by filter', () => {
    it('deletes document by field-based filter', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'deleteOneUnsupportedFilterTestCollection');
      
      collection.insertOne({ name: 'Test', value: 100 });
      collection.insertOne({ name: 'Other', value: 200 });
      
      // Act
      const deleteResult = collection.deleteOne({ name: 'Test' });
      
      // Assert
      expect(deleteResult.deletedCount).toBe(1);
      expect(deleteResult.acknowledged).toBe(true);
      
      // Verify delete worked
      const remainingDocs = collection.find({});
      expect(remainingDocs.length).toBe(1);
      expect(remainingDocs[0].name).toBe('Other');
    });

    it('deletes first matching document by single field filter', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'deleteFieldFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active' });
      collection.insertOne({ name: 'Bob', department: 'Marketing', status: 'active' });
      collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'inactive' });
      
      // Act
      const deleteResult = collection.deleteOne({ department: 'Engineering' });
      
      // Assert - MongoDB-compatible return format
      expect(deleteResult.deletedCount).toBe(1);
      expect(deleteResult.acknowledged).toBe(true);
      
      // Verify correct document was deleted (one Engineering doc should remain)
      const remainingDocs = collection.find({});
      expect(remainingDocs.length).toBe(2);
      
      const engineeringDocs = collection.find({ department: 'Engineering' });
      expect(engineeringDocs.length).toBe(1);
    });

    it('deletes document by multiple field filter', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'deleteMultiFieldFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active', level: 'Senior' });
      collection.insertOne({ name: 'Bob', department: 'Engineering', status: 'inactive', level: 'Senior' });
      collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'active', level: 'Junior' });
      
      // Act
      const deleteResult = collection.deleteOne({ 
        department: 'Engineering', 
        status: 'active', 
        level: 'Senior' 
      });
      
      // Assert
      expect(deleteResult.deletedCount).toBe(1);
      expect(deleteResult.acknowledged).toBe(true);
      
      // Verify correct document was deleted
      const remainingDocs = collection.find({ department: 'Engineering' });
      expect(remainingDocs.length).toBe(2);
      
      const activeEngineerDocs = collection.find({ department: 'Engineering', status: 'active' });
      expect(activeEngineerDocs.length).toBe(1);
      expect(activeEngineerDocs[0].name).toBe('Charlie');
    });

    it('deletes document by nested field filter', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'deleteNestedFieldFilterTestCollection');
      
      collection.insertOne({ 
        name: 'Alice', 
        profile: { email: 'alice@company.com', team: 'Backend' },
        settings: { notifications: true }
      });
      collection.insertOne({ 
        name: 'Bob', 
        profile: { email: 'bob@company.com', team: 'Frontend' },
        settings: { notifications: false }
      });
      collection.insertOne({ 
        name: 'Charlie', 
        profile: { email: 'charlie@company.com', team: 'Backend' },
        settings: { notifications: true }
      });
      
      // Act
      const deleteResult = collection.deleteOne({ 'profile.team': 'Frontend' });
      
      // Assert
      expect(deleteResult.deletedCount).toBe(1);
      expect(deleteResult.acknowledged).toBe(true);
      
      // Verify correct document was deleted
      const remainingDocs = collection.find({});
      expect(remainingDocs.length).toBe(2);
      
      const frontendDocs = collection.find({ 'profile.team': 'Frontend' });
      expect(frontendDocs.length).toBe(0);
    });

    it('deletes document by comparison filter', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'deleteComparisonFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', score: 85, lastActive: new Date('2023-01-15') });
      collection.insertOne({ name: 'Bob', score: 92, lastActive: new Date('2023-01-20') });
      collection.insertOne({ name: 'Charlie', score: 78, lastActive: new Date('2023-01-10') });
      
      // Act
      const deleteResult = collection.deleteOne({ score: { $lt: 80 } });
      
      // Assert
      expect(deleteResult.deletedCount).toBe(1);
      expect(deleteResult.acknowledged).toBe(true);
      
      // Verify correct document was deleted
      const remainingDocs = collection.find({});
      expect(remainingDocs.length).toBe(2);
      
      const lowScoreDocs = collection.find({ score: { $lt: 80 } });
      expect(lowScoreDocs.length).toBe(0);
    });

    it('returns zero deletions when filter matches no documents', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'deleteNoMatchTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering' });
      collection.insertOne({ name: 'Bob', department: 'Marketing' });
      
      // Act
      const deleteResult = collection.deleteOne({ department: 'NonExistent' });
      
      // Assert
      expect(deleteResult.deletedCount).toBe(0);
      expect(deleteResult.acknowledged).toBe(true);
      
      // Verify no documents were deleted
      const remainingDocs = collection.find({});
      expect(remainingDocs.length).toBe(2);
    });
  });
});
