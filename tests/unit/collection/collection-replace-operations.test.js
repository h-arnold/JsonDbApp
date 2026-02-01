/**
 * Collection Replace Operations Tests
 * 
 * Tests for Collection replaceOne operations including:
 * - Replacing documents by ID
 * - Replacing by field-based filters
 * - Complete document replacement (old fields removed, new fields added)
 * - Verifying correct document replacement with multiple matches
 * 
 * Refactored from old_tests/unit/Collection/04_CollectionUpdateOperationsTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  setupCollectionTestEnvironment,
  createTestCollection
} from '../../helpers/collection-test-helpers.js';

describe('Collection Replace Operations', () => {
  describe('replaceOne by ID', () => {
    it('completely replaces a document by its ID', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'replaceOneByIdTestCollection');
      
      const insertResult = collection.insertOne({ 
        name: 'Original Doc', 
        value: 100, 
        status: 'active',
        metadata: { created: new Date(), version: 1 }
      });
      const docId = insertResult.insertedId;
      
      // Act
      const replacementDoc = { 
        name: 'Completely Replaced', 
        description: 'This is a completely new document',
        version: 2
      };
      const replaceResult = collection.replaceOne({ _id: docId }, replacementDoc);
      
      // Assert
      expect(replaceResult.matchedCount).toBe(1);
      expect(replaceResult.modifiedCount).toBe(1);
      expect(replaceResult.acknowledged).toBe(true);
      
      // Verify document was completely replaced (old fields gone, new fields present)
      const replacedDoc = collection.findOne({ _id: docId });
      expect(replacedDoc.name).toBe('Completely Replaced');
      expect(replacedDoc.description).toBe('This is a completely new document');
      expect(replacedDoc.version).toBe(2);
      expect(replacedDoc.value).toBeUndefined();
      expect(replacedDoc.status).toBeUndefined();
      expect(replacedDoc.metadata).toBeUndefined();
    });
  });

  describe('replaceOne by filter', () => {
    it('replaces first matching document by field filter', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'replaceOneByFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', role: 'Developer' });
      collection.insertOne({ name: 'Bob', department: 'Engineering', role: 'Manager' });
      collection.insertOne({ name: 'Charlie', department: 'Marketing', role: 'Analyst' });
      
      // Act
      const replacementDoc = { 
        name: 'Alice Smith', 
        department: 'Product', 
        role: 'Product Manager',
        startDate: new Date()
      };
      const replaceResult = collection.replaceOne({ name: 'Alice' }, replacementDoc);
      
      // Assert
      expect(replaceResult.matchedCount).toBe(1);
      expect(replaceResult.modifiedCount).toBe(1);
      expect(replaceResult.acknowledged).toBe(true);
      
      // Verify correct document was replaced
      const replacedDoc = collection.findOne({ name: 'Alice Smith' });
      expect(replacedDoc).not.toBeNull();
      expect(replacedDoc.department).toBe('Product');
      expect(replacedDoc.role).toBe('Product Manager');
      expect(replacedDoc.startDate).not.toBeNull();
    });

    it('replaces only the specific matching document', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'replaceCorrectDocTestCollection');
      
      collection.insertOne({ name: 'Alice', age: 30, department: 'Engineering' });
      collection.insertOne({ name: 'Alice', age: 25, department: 'Marketing' });
      collection.insertOne({ name: 'Bob', age: 30, department: 'Engineering' });
      
      // Act
      const replacementDoc = { 
        name: 'Alice Senior', 
        age: 31, 
        department: 'Engineering',
        title: 'Senior Engineer'
      };
      const replaceResult = collection.replaceOne({ name: 'Alice', age: 30 }, replacementDoc);
      
      // Assert
      expect(replaceResult.matchedCount).toBe(1);
      expect(replaceResult.modifiedCount).toBe(1);
      
      // Verify correct document was replaced
      const replacedDoc = collection.findOne({ name: 'Alice Senior' });
      expect(replacedDoc).not.toBeNull();
      expect(replacedDoc.age).toBe(31);
      expect(replacedDoc.title).toBe('Senior Engineer');
      
      // Verify other Alice document is unchanged
      const otherAlice = collection.findOne({ name: 'Alice', age: 25 });
      expect(otherAlice).not.toBeNull();
      expect(otherAlice.department).toBe('Marketing');
    });
  });
});
