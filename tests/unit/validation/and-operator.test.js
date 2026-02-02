/**
 * $and (Logical AND) Operator Validation Tests
 * 
 * Tests MongoDB-compatible $and operator against ValidationMockData.
 * Covers:
 * - Basic conjunction (two field conditions)
 * - Multiple field conditions (3+)
 * - Mix of comparison operators
 * - Nested $and operations
 * - Edge cases (empty array, single condition)
 * - Contradictory conditions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupValidationTestEnvironment, cleanupValidationTests } from '../../helpers/validation-test-helpers.js';

let testEnv;

describe('$and Logical AND Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });

  describe('Basic conjunction', () => {
    it('should match documents satisfying both field conditions', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 
        $and: [
          { isActive: { $eq: true } },
          { age: { $gt: 30 } }
        ]
      });
      
      // Assert
      expect(results).toHaveLength(3);
      const expectedIds = ['person3', 'person4', 'person6'];
      results.forEach(doc => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.isActive).toBe(true);
        expect(doc.age).toBeGreaterThan(30);
      });
    });
  });

  describe('Multiple field conditions', () => {
    it('should match documents satisfying multiple field conditions', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 
        $and: [
          { isActive: { $eq: true } },
          { score: { $gt: 80 } },
          { balance: { $gt: 1000 } }
        ]
      });
      
      // Assert
      expect(results).toHaveLength(1);
      const expectedIds = ['person1'];
      results.forEach(doc => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.isActive).toBe(true);
        expect(doc.score).toBeGreaterThan(80);
        expect(doc.balance).toBeGreaterThan(1000);
      });
    });
  });

  describe('Mix of comparison operators', () => {
    it('should work with mixed comparison operators', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 
        $and: [
          { 'name.first': { $eq: 'Anna' } },
          { age: { $lt: 35 } },
          { score: { $gt: 80 } }
        ]
      });
      
      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person1');
      expect(results[0].name.first).toBe('Anna');
    });
  });

  describe('Nested $and operations', () => {
    it('should handle nested $and operations', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 
        $and: [
          { 
            $and: [
              { isActive: { $eq: true } },
              { age: { $gt: 25 } }
            ]
          },
          { score: { $gt: 85 } }
        ]
      });
      
      // Assert
      expect(results).toHaveLength(2);
      const expectedIds = ['person1', 'person3'];
      results.forEach(doc => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.isActive).toBe(true);
        expect(doc.age).toBeGreaterThan(25);
        expect(doc.score).toBeGreaterThan(85);
      });
    });
  });

  describe('Edge cases', () => {
    it('should match all documents with empty $and array', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ $and: [] });
      
      // Assert
      expect(results).toHaveLength(6);
    });

    it('should handle single condition in $and', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 
        $and: [
          { isActive: { $eq: false } }
        ]
      });
      
      // Assert
      expect(results).toHaveLength(2);
      const expectedIds = ['person2', 'person5'];
      results.forEach(doc => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.isActive).toBe(false);
      });
    });
  });

  describe('Contradictory conditions', () => {
    it('should return no results for contradictory conditions', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 
        $and: [
          { isActive: { $eq: true } },
          { isActive: { $eq: false } }
        ]
      });
      
      // Assert
      expect(results).toHaveLength(0);
    });
  });
});
