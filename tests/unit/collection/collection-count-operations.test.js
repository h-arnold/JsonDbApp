/**
 * Collection Count Operations Tests
 * 
 * Tests for Collection countDocuments operations including:
 * - Counting all documents (empty and populated)
 * - Counting by field-based filters (single and multiple fields)
 * - Counting by nested field filters (dot notation)
 * - Counting with comparison operators ($gt, $lt, $eq)
 * - Handling no-match scenarios
 * 
 * Refactored from old_tests/unit/Collection/06_CollectionCountOperationsTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createIsolatedTestCollection
} from '../../helpers/collection-test-helpers.js';

describe('Collection Count Operations', () => {
  describe('countDocuments - basic operations', () => {
    it('returns 0 for empty collection', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countDocumentsEmptyTestCollection');
      
      // Act
      const count = collection.countDocuments({});
      
      // Assert
      expect(count).toBe(0);
    });

    it('counts all documents in populated collection', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countDocumentsAllTestCollection');
      
      collection.insertOne({ name: 'Count Doc 1', value: 100 });
      collection.insertOne({ name: 'Count Doc 2', value: 200 });
      collection.insertOne({ name: 'Count Doc 3', value: 300 });
      
      // Act
      const count = collection.countDocuments({});
      
      // Assert
      expect(count).toBe(3);
    });
  });

  describe('countDocuments - field-based filters', () => {
    it('counts documents by single field filter', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countDocumentsByFieldTestCollection');
      
      collection.insertOne({ name: 'Test', value: 100 });
      collection.insertOne({ name: 'Other', value: 200 });
      collection.insertOne({ name: 'Test', value: 300 });
      
      // Act
      const count = collection.countDocuments({ name: 'Test' });
      
      // Assert
      expect(count).toBe(2);
    });

    it('returns 0 for non-matching filter', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countDocumentsNoMatchTestCollection');
      
      collection.insertOne({ name: 'Test', value: 100 });
      collection.insertOne({ name: 'Other', value: 200 });
      
      // Act
      const noMatchCount = collection.countDocuments({ name: 'NonExistent' });
      
      // Assert
      expect(noMatchCount).toBe(0);
    });

    it('counts documents by department field', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countFieldFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active' });
      collection.insertOne({ name: 'Bob', department: 'Marketing', status: 'active' });
      collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'inactive' });
      collection.insertOne({ name: 'David', department: 'Engineering', status: 'active' });
      
      // Act & Assert
      expect(collection.countDocuments({ department: 'Engineering' })).toBe(3);
      expect(collection.countDocuments({ department: 'Marketing' })).toBe(1);
    });

    it('counts documents by status field', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countStatusFieldTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active' });
      collection.insertOne({ name: 'Bob', department: 'Marketing', status: 'active' });
      collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'inactive' });
      collection.insertOne({ name: 'David', department: 'Engineering', status: 'active' });
      
      // Act & Assert
      expect(collection.countDocuments({ status: 'active' })).toBe(3);
      expect(collection.countDocuments({ status: 'inactive' })).toBe(1);
    });
  });

  describe('countDocuments - multiple field filters', () => {
    it('counts documents matching two field criteria', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countMultiFieldFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active', level: 'Senior' });
      collection.insertOne({ name: 'Bob', department: 'Engineering', status: 'inactive', level: 'Senior' });
      collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'active', level: 'Junior' });
      collection.insertOne({ name: 'David', department: 'Marketing', status: 'active', level: 'Senior' });
      
      // Act & Assert
      const activeEngineeringCount = collection.countDocuments({ 
        department: 'Engineering', 
        status: 'active' 
      });
      expect(activeEngineeringCount).toBe(2);
      
      const seniorActiveCount = collection.countDocuments({ 
        level: 'Senior', 
        status: 'active' 
      });
      expect(seniorActiveCount).toBe(2);
    });

    it('counts documents matching three field criteria', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countThreeFieldTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active', level: 'Senior' });
      collection.insertOne({ name: 'Bob', department: 'Engineering', status: 'inactive', level: 'Senior' });
      collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'active', level: 'Junior' });
      collection.insertOne({ name: 'David', department: 'Marketing', status: 'active', level: 'Senior' });
      
      // Act
      const specificCount = collection.countDocuments({ 
        department: 'Engineering', 
        status: 'active', 
        level: 'Senior' 
      });
      
      // Assert
      expect(specificCount).toBe(1);
    });
  });

  describe('countDocuments - nested field filters', () => {
    it('counts documents by nested field using dot notation', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countNestedFieldFilterTestCollection');
      
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
      collection.insertOne({ 
        name: 'David', 
        profile: { email: 'david@company.com', team: 'DevOps' },
        settings: { notifications: true }
      });
      
      // Act & Assert
      expect(collection.countDocuments({ 'profile.team': 'Backend' })).toBe(2);
      expect(collection.countDocuments({ 'profile.team': 'Frontend' })).toBe(1);
      expect(collection.countDocuments({ 'settings.notifications': true })).toBe(3);
    });
  });

  describe('countDocuments - comparison operators', () => {
    it('counts documents using $gt operator', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countComparisonFilterTestCollection');
      
      collection.insertOne({ name: 'Alice', score: 85, experience: 5 });
      collection.insertOne({ name: 'Bob', score: 92, experience: 3 });
      collection.insertOne({ name: 'Charlie', score: 78, experience: 7 });
      collection.insertOne({ name: 'David', score: 88, experience: 2 });
      
      // Act & Assert
      expect(collection.countDocuments({ score: { $gt: 85 } })).toBe(2);
      expect(collection.countDocuments({ experience: { $gt: 4 } })).toBe(2);
    });

    it('counts documents using $lt operator', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countLessThanTestCollection');
      
      collection.insertOne({ name: 'Alice', score: 85, experience: 5 });
      collection.insertOne({ name: 'Bob', score: 92, experience: 3 });
      collection.insertOne({ name: 'Charlie', score: 78, experience: 7 });
      collection.insertOne({ name: 'David', score: 88, experience: 2 });
      
      // Act & Assert
      expect(collection.countDocuments({ score: { $lt: 80 } })).toBe(1);
    });

    it('counts documents using $eq operator', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countEqualsTestCollection');
      
      collection.insertOne({ name: 'Alice', score: 85, experience: 5 });
      collection.insertOne({ name: 'Bob', score: 92, experience: 3 });
      collection.insertOne({ name: 'Charlie', score: 78, experience: 7 });
      collection.insertOne({ name: 'David', score: 88, experience: 2 });
      
      // Act
      const exactScoreCount = collection.countDocuments({ score: { $eq: 88 } });
      
      // Assert
      expect(exactScoreCount).toBe(1);
    });
  });

  describe('countDocuments - no match scenarios', () => {
    it('returns 0 when filter matches no documents', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countNoMatchDeptTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering' });
      collection.insertOne({ name: 'Bob', department: 'Marketing' });
      
      // Act
      const nonExistentCount = collection.countDocuments({ department: 'NonExistent' });
      
      // Assert
      expect(nonExistentCount).toBe(0);
    });

    it('returns 0 when comparison filter matches no documents', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('countNoMatchScoreTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering' });
      collection.insertOne({ name: 'Bob', department: 'Marketing' });
      
      // Act
      const impossibleCount = collection.countDocuments({ score: { $gt: 1000 } });
      
      // Assert
      expect(impossibleCount).toBe(0);
    });
  });
});
