/**
 * Collection Find Operations Tests
 * 
 * Tests for Collection find and findOne operations including:
 * - Finding documents in empty collections
 * - Finding by ID
 * - Finding by field-based queries (single and multiple fields)
 * - Finding by nested fields (dot notation)
 * - Finding with comparison operators ($gt, $lt)
 * 
 * Refactored from old_tests/unit/Collection/03_CollectionFindOperationsTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  setupCollectionTestEnvironment,
  createTestCollection
} from '../../helpers/collection-test-helpers.js';

describe('Collection Find Operations', () => {
  describe('findOne operations', () => {
    it('returns null when finding in an empty collection', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findOneEmptyTestCollection');
      
      // Act
      const result = collection.findOne({});
      
      // Assert
      expect(result).toBeNull();
    });

    it('finds a single document by ID', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findOneByIdTestCollection');
      
      const doc1 = collection.insertOne({ name: 'First Doc', value: 100 });
      collection.insertOne({ name: 'Second Doc', value: 200 });
      
      // Act
      const foundDoc = collection.findOne({ _id: doc1.insertedId });
      
      // Assert
      expect(foundDoc).not.toBeNull();
      expect(foundDoc.name).toBe('First Doc');
    });

    it('finds a document by field-based query', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findOneUnsupportedTestCollection');
      
      collection.insertOne({ name: 'Test', value: 100 });
      
      // Act
      const result = collection.findOne({ name: 'Test' });
      
      // Assert
      expect(result).not.toBeNull();
      expect(result.name).toBe('Test');
    });

    it('returns null when field-based query has no matches', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findOneNoMatchTestCollection');
      
      collection.insertOne({ name: 'Test', value: 100 });
      
      // Act
      const noResult = collection.findOne({ name: 'NonExistent' });
      
      // Assert
      expect(noResult).toBeNull();
    });

    it('finds first matching document by field criteria', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findOneFieldTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', priority: 1 });
      collection.insertOne({ name: 'Bob', department: 'Engineering', priority: 2 });
      collection.insertOne({ name: 'Charlie', department: 'Marketing', priority: 1 });
      
      // Act
      const engineeringDoc = collection.findOne({ department: 'Engineering' });
      
      // Assert
      expect(engineeringDoc).not.toBeNull();
      expect(engineeringDoc.department).toBe('Engineering');
      expect(['Alice', 'Bob']).toContain(engineeringDoc.name);
    });

    it('finds document matching multiple field criteria', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findOneMultiCriteriaTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', priority: 1 });
      collection.insertOne({ name: 'Bob', department: 'Engineering', priority: 2 });
      collection.insertOne({ name: 'Charlie', department: 'Marketing', priority: 1 });
      
      // Act
      const specificDoc = collection.findOne({ department: 'Engineering', priority: 2 });
      
      // Assert
      expect(specificDoc).not.toBeNull();
      expect(specificDoc.name).toBe('Bob');
    });

    it('returns null when no documents match multiple criteria', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findOneNoMatchMultiTestCollection');
      
      collection.insertOne({ name: 'Alice', department: 'Engineering', priority: 1 });
      
      // Act
      const nonExistentDoc = collection.findOne({ department: 'NonExistent' });
      
      // Assert
      expect(nonExistentDoc).toBeNull();
    });
  });

  describe('find operations', () => {
    it('returns empty array when finding in an empty collection', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findEmptyTestCollection');
      
      // Act
      const results = collection.find({});
      
      // Assert
      expect(results).toEqual([]);
      expect(Array.isArray(results)).toBe(true);
    });

    it('finds all documents when query is empty', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findAllTestCollection');
      
      collection.insertOne({ name: 'Doc A', value: 100, category: 'test' });
      collection.insertOne({ name: 'Doc B', value: 200, category: 'prod' });
      collection.insertOne({ name: 'Doc C', value: 300, category: 'test' });
      
      // Act
      const allDocs = collection.find({});
      
      // Assert
      expect(allDocs).toHaveLength(3);
      expect(Array.isArray(allDocs)).toBe(true);
    });

    it('finds documents by field-based query', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findUnsupportedTestCollection');
      
      collection.insertOne({ name: 'Test', value: 100 });
      collection.insertOne({ name: 'Other', value: 200 });
      
      // Act
      const results = collection.find({ name: 'Test' });
      
      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test');
    });

    it('returns empty array when field-based query has no matches', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findNoMatchTestCollection');
      
      collection.insertOne({ name: 'Test', value: 100 });
      collection.insertOne({ name: 'Other', value: 200 });
      
      // Act
      const noResults = collection.find({ name: 'NonExistent' });
      
      // Assert
      expect(noResults).toHaveLength(0);
    });

    it('finds documents by exact field match', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findByFieldTestCollection');
      
      collection.insertOne({ name: 'Alice', age: 30, active: true, department: 'Engineering' });
      collection.insertOne({ name: 'Bob', age: 25, active: false, department: 'Marketing' });
      collection.insertOne({ name: 'Charlie', age: 30, active: true, department: 'Engineering' });
      
      // Act & Assert - String field matching
      const engineeringDocs = collection.find({ department: 'Engineering' });
      expect(engineeringDocs).toHaveLength(2);
      expect(engineeringDocs[0].name).toBe('Alice');
      expect(engineeringDocs[1].name).toBe('Charlie');
      
      // Numeric field matching
      const age30Docs = collection.find({ age: 30 });
      expect(age30Docs).toHaveLength(2);
      
      // Boolean field matching
      const activeDocs = collection.find({ active: true });
      expect(activeDocs).toHaveLength(2);
    });

    it('finds documents matching multiple fields (implicit AND)', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findMultiFieldTestCollection');
      
      collection.insertOne({ name: 'Alice', age: 30, active: true, department: 'Engineering' });
      collection.insertOne({ name: 'Bob', age: 30, active: false, department: 'Engineering' });
      collection.insertOne({ name: 'Charlie', age: 25, active: true, department: 'Engineering' });
      
      // Act
      const results = collection.find({ age: 30, active: true, department: 'Engineering' });
      
      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice');
    });

    it('finds documents by nested field (dot notation)', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findNestedFieldTestCollection');
      
      collection.insertOne({ 
        name: 'Alice', 
        profile: { email: 'alice@company.com', yearsOfService: 5 },
        address: { city: 'London', country: 'UK' }
      });
      collection.insertOne({ 
        name: 'Bob', 
        profile: { email: 'bob@company.com', yearsOfService: 3 },
        address: { city: 'Manchester', country: 'UK' }
      });
      
      // Act & Assert - Nested string field
      const londonDocs = collection.find({ 'address.city': 'London' });
      expect(londonDocs).toHaveLength(1);
      expect(londonDocs[0].name).toBe('Alice');
      
      // Nested numeric field
      const experiencedDocs = collection.find({ 'profile.yearsOfService': 5 });
      expect(experiencedDocs).toHaveLength(1);
      expect(experiencedDocs[0].name).toBe('Alice');
    });

    it('finds documents using comparison operators ($gt, $lt)', () => {
      // Arrange
      const env = setupCollectionTestEnvironment();
      const { collection } = createTestCollection(env, 'findComparisonTestCollection');
      
      collection.insertOne({ name: 'Alice', score: 85, joinDate: new Date('2020-01-15') });
      collection.insertOne({ name: 'Bob', score: 92, joinDate: new Date('2021-03-20') });
      collection.insertOne({ name: 'Charlie', score: 78, joinDate: new Date('2019-11-10') });
      
      // Act & Assert - Greater than
      const highScoreDocs = collection.find({ score: { $gt: 80 } });
      expect(highScoreDocs).toHaveLength(2);
      
      // Less than
      const lowScoreDocs = collection.find({ score: { $lt: 80 } });
      expect(lowScoreDocs).toHaveLength(1);
      expect(lowScoreDocs[0].name).toBe('Charlie');
      
      // Date comparison
      const recentDocs = collection.find({ joinDate: { $gt: new Date('2020-06-01') } });
      expect(recentDocs).toHaveLength(1);
      expect(recentDocs[0].name).toBe('Bob');
    });
  });
});
