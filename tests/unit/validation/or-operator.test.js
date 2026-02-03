/**
 * $or (Logical OR) Operator Validation Tests
 *
 * Tests MongoDB-compatible $or operator against ValidationMockData.
 * Covers:
 * - Basic disjunction (two field conditions)
 * - Multiple field conditions (3+)
 * - Mix of comparison operators
 * - Nested $or operations
 * - Edge cases (empty array, single condition)
 * - Duplicate conditions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupValidationTestEnvironment,
  cleanupValidationTests
} from '../../helpers/validation-test-helpers.js';

let testEnv;

describe('$or Logical OR Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });

  describe('Basic disjunction', () => {
    it('should match documents satisfying either field condition', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $or: [{ age: { $lt: 30 } }, { age: { $gt: 60 } }]
      });

      // Assert
      expect(results).toHaveLength(3);
      const expectedIds = ['person1', 'person2', 'person6'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.age < 30 || doc.age > 60).toBe(true);
      });
    });
  });

  describe('Multiple field conditions', () => {
    it('should match documents satisfying any of multiple conditions', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $or: [
          { 'name.first': { $eq: 'Anna' } },
          { 'name.first': { $eq: 'Clara' } },
          { 'name.first': { $eq: 'Frank' } }
        ]
      });

      // Assert
      expect(results).toHaveLength(3);
      const expectedIds = ['person1', 'person3', 'person6'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
        const expectedNames = ['Anna', 'Clara', 'Frank'];
        expect(expectedNames).toContain(doc.name.first);
      });
    });
  });

  describe('Mix of comparison operators', () => {
    it('should work with mixed comparison operators', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $or: [{ score: { $gt: 95 } }, { balance: { $lt: 0 } }, { age: { $eq: 0 } }]
      });

      // Assert
      expect(results).toHaveLength(3);
      const expectedIds = ['person2', 'person3', 'person5'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
        const matchesCondition = doc.score > 95 || doc.balance < 0 || doc.age === 0;
        expect(matchesCondition).toBe(true);
      });
    });
  });

  describe('Nested $or operations', () => {
    it('should handle nested $or operations', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $or: [
          {
            $or: [{ 'name.first': { $eq: 'Anna' } }, { 'name.first': { $eq: 'Ben' } }]
          },
          { age: { $gt: 60 } }
        ]
      });

      // Assert
      expect(results).toHaveLength(3);
      const expectedIds = ['person1', 'person2', 'person6'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
      });
    });
  });

  describe('Edge cases', () => {
    it('should match no documents with empty $or array', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ $or: [] });

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should handle single condition in $or', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $or: [{ isActive: { $eq: true } }]
      });

      // Assert
      expect(results).toHaveLength(4);
      results.forEach((doc) => {
        expect(doc.isActive).toBe(true);
      });
    });
  });

  describe('Duplicate conditions', () => {
    it('should handle duplicate conditions in $or', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $or: [{ 'name.first': { $eq: 'Anna' } }, { 'name.first': { $eq: 'Anna' } }]
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person1');
      expect(results[0].name.first).toBe('Anna');
    });
  });
});
