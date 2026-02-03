/**
 * Collection Update Operations Tests
 * 
 * Tests for Collection updateOne and updateMany operations including:
 * - Updating documents by ID
 * - Updating by field-based filters (single, multiple, nested fields)
 * - Updating with comparison operators
 * - Handling no matches
 * - Using update operators ($set, $inc, $push)
 * - Combining multiple update operators
 * - Error handling and validation
 * 
 * Refactored from old_tests/unit/Collection/04_CollectionUpdateOperationsTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createIsolatedTestCollection
} from '../../helpers/collection-test-helpers.js';

describe('Collection Update Operations', () => {
  describe('updateOne by ID', () => {
    it('updates a document by its ID with replacement document', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateOneByIdTestCollection');
      
      const insertResult = collection.insertOne({ name: 'Original Doc', value: 100, status: 'active' });
      const docId = insertResult.insertedId;
      
      // Act
      const updateDoc = { name: 'Updated Doc', value: 150, status: 'modified', newField: 'added' };
      const updateResult = collection.updateOne({ _id: docId }, updateDoc);
      
      // Assert
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      expect(updateResult.acknowledged).toBe(true);
    });

    it('updates a document using $set operator', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateOneUnsupportedOperatorsTestCollection');
      
      const insertResult = collection.insertOne({ name: 'Test Doc', value: 100 });
      const docId = insertResult.insertedId;
      
      // Act
      const updateResult = collection.updateOne({ _id: docId }, { $set: { name: 'Updated' } });
      
      // Assert
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      expect(updateResult.acknowledged).toBe(true);
      
      // Verify document was updated
      const updatedDoc = collection.findOne({ _id: docId });
      expect(updatedDoc.name).toBe('Updated');
      expect(updatedDoc.value).toBe(100);
    });
  });

  describe('updateOne by filter', () => {
    it('updates document by field-based filter', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateOneUnsupportedFilterTestCollection');
      
      collection.insertOne({ name: 'Test', value: 100 });
      
      // Act
      const updateResult = collection.updateOne({ name: 'Test' }, { name: 'Updated', value: 200 });
      
      // Assert
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      expect(updateResult.acknowledged).toBe(true);
      
      // Verify update worked
      const updatedDoc = collection.findOne({ name: 'Updated' });
      expect(updatedDoc).not.toBeNull();
      expect(updatedDoc.value).toBe(200);
    });

    it('updates first matching document by single field filter', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateFieldFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', salary: 75000 });
      collection.insertOne({ name: 'Bob', department: 'Marketing', salary: 65000 });
      collection.insertOne({ name: 'Charlie', department: 'Engineering', salary: 80000 });
      
      // Act
      const updateResult = collection.updateOne(
        { department: 'Engineering' },
        { name: 'Alice Updated', department: 'Engineering', salary: 85000 }
      );
      
      // Assert
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      expect(updateResult.acknowledged).toBe(true);
      
      // Verify only first matching document was updated
      const engineeringDocs = collection.find({ department: 'Engineering' });
      expect(engineeringDocs.length).toBe(2);
      
      const updatedDoc = engineeringDocs.find(doc => doc.name === 'Alice Updated');
      expect(updatedDoc).not.toBeNull();
      expect(updatedDoc.salary).toBe(85000);
    });

    it('updates document by multiple field filter', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateMultiFieldFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', level: 'Senior', active: true });
      collection.insertOne({ name: 'Bob', department: 'Engineering', level: 'Junior', active: true });
      collection.insertOne({ name: 'Charlie', department: 'Engineering', level: 'Senior', active: false });
      
      // Act
      const updateResult = collection.updateOne(
        { department: 'Engineering', level: 'Senior', active: true },
        { name: 'Alice Promoted', department: 'Engineering', level: 'Principal', active: true }
      );
      
      // Assert
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      
      // Verify correct document was updated
      const promotedDoc = collection.findOne({ level: 'Principal' });
      expect(promotedDoc).not.toBeNull();
      expect(promotedDoc.name).toBe('Alice Promoted');
    });

    it('updates document by nested field filter', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateNestedFieldFilterTestCollection');
      
      collection.insertOne({ 
        name: 'Alice', 
        profile: { email: 'alice@company.com', team: 'Backend' },
        metadata: { lastLogin: new Date('2023-01-15') }
      });
      collection.insertOne({ 
        name: 'Bob', 
        profile: { email: 'bob@company.com', team: 'Frontend' },
        metadata: { lastLogin: new Date('2023-01-20') }
      });
      
      // Act
      const updateResult = collection.updateOne(
        { 'profile.team': 'Backend' },
        { 
          name: 'Alice Backend Lead', 
          profile: { email: 'alice.lead@company.com', team: 'Backend' },
          metadata: { lastLogin: new Date() }
        }
      );
      
      // Assert
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      
      // Verify correct document was updated
      const updatedDoc = collection.findOne({ 'profile.email': 'alice.lead@company.com' });
      expect(updatedDoc).not.toBeNull();
      expect(updatedDoc.name).toBe('Alice Backend Lead');
    });

    it('updates document by comparison filter', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateComparisonFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', score: 85, bonus: 1000 });
      collection.insertOne({ name: 'Bob', score: 92, bonus: 1500 });
      collection.insertOne({ name: 'Charlie', score: 78, bonus: 800 });
      
      // Act
      const updateResult = collection.updateOne(
        { score: { $gt: 90 } },
        { name: 'Bob High Performer', score: 92, bonus: 2000 }
      );
      
      // Assert
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      
      // Verify correct document was updated
      const updatedDoc = collection.findOne({ bonus: 2000 });
      expect(updatedDoc).not.toBeNull();
      expect(updatedDoc.name).toBe('Bob High Performer');
    });

    it('returns zero matches when filter matches no documents', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateNoMatchTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering' });
      collection.insertOne({ name: 'Bob', department: 'Marketing' });
      
      // Act
      const updateResult = collection.updateOne(
        { department: 'NonExistent' },
        { name: 'Updated', department: 'NonExistent' }
      );
      
      // Assert
      expect(updateResult.matchedCount).toBe(0);
      expect(updateResult.modifiedCount).toBe(0);
      expect(updateResult.acknowledged).toBe(true);
    });
  });

  describe('updateOne with multiple operators', () => {
    it('applies multiple update operators simultaneously', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateMultipleOperatorsTestCollection');
      
      const insertResult = collection.insertOne({ 
        name: 'Test User',
        stats: { score: 100, level: 1 },
        tags: ['beginner'],
        lastActive: new Date('2023-01-01')
      });
      const docId = insertResult.insertedId;
      
      // Act
      const updateResult = collection.updateOne({ _id: docId }, {
        $set: { name: 'Advanced User', lastActive: new Date('2024-01-01') },
        $inc: { 'stats.score': 50, 'stats.level': 1 },
        $push: { tags: 'advanced' }
      });
      
      // Assert
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      expect(updateResult.acknowledged).toBe(true);
      
      // Verify all updates were applied
      const updatedDoc = collection.findOne({ _id: docId });
      expect(updatedDoc.name).toBe('Advanced User');
      expect(updatedDoc.stats.score).toBe(150);
      expect(updatedDoc.stats.level).toBe(2);
      expect(updatedDoc.tags).toContain('beginner');
      expect(updatedDoc.tags).toContain('advanced');
    });
  });

  describe('updateMany operations', () => {
    it('updates multiple documents and returns correct modified count', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateManyTestCollection');
      
      collection.insertOne({ department: 'Engineering', level: 'Junior', salary: 70000 });
      collection.insertOne({ department: 'Engineering', level: 'Senior', salary: 90000 });
      collection.insertOne({ department: 'Marketing', level: 'Junior', salary: 65000 });
      collection.insertOne({ department: 'Engineering', level: 'Principal', salary: 120000 });
      
      // Act
      const updateResult = collection.updateMany(
        { department: 'Engineering' },
        { $inc: { salary: 5000 } }
      );
      
      // Assert
      expect(updateResult.matchedCount).toBe(3);
      expect(updateResult.modifiedCount).toBe(3);
      expect(updateResult.acknowledged).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws InvalidArgumentError for null filter', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('errorPropagationTestCollection');
      
      // Act & Assert
      expect(() => {
        collection.updateOne(null, { name: 'Updated' });
      }).toThrow(InvalidArgumentError);
    });

    it('throws InvalidArgumentError for null update', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('errorPropagationTestCollection2');
      
      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'test' }, null);
      }).toThrow(InvalidArgumentError);
    });

    it('throws error for empty update object', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('errorPropagationTestCollection3');
      
      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'test' }, {});
      }).toThrow(InvalidArgumentError);
    });
  });

  describe('locking and logging', () => {
    it('successfully updates document with locking mechanism', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('lockingDuringUpdateTestCollection');
      
      const insertResult = collection.insertOne({ name: 'Lock Test', value: 100 });
      const docId = insertResult.insertedId;
      
      // Act
      const updateResult = collection.updateOne({ _id: docId }, { name: 'Updated', value: 200 });
      
      // Assert
      expect(updateResult.modifiedCount).toBe(1);
      
      // TODO: Add proper lock testing when Section 8 coordination is implemented
    });

    it('completes update operation with logging', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('updateLoggingTestCollection');
      
      const insertResult = collection.insertOne({ name: 'Log Test', value: 100 });
      const docId = insertResult.insertedId;
      
      // Act
      const updateResult = collection.updateOne({ _id: docId }, { name: 'Updated Log Test', value: 200 });
      
      // Assert
      expect(updateResult.modifiedCount).toBe(1);
      
      // TODO: Add proper logging verification when enhanced logging is implemented
    });
  });
});
