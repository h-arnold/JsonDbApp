/**
 * Combined Logical Operations Validation Tests
 *
 * Tests MongoDB-compatible combined logical operators against ValidationMockData.
 * Covers:
 * - $and containing $or clauses
 * - $or containing $and clauses
 * - Complex nested logical trees
 * - Implicit AND with explicit operators
 * - Multiple fields with multiple logical operators
 * - Error handling for invalid structures
 */

import { describe, it, expect } from 'vitest';
import { describeValidationOperatorSuite } from '../../helpers/validation-test-helpers.js';

describeValidationOperatorSuite('Combined Logical Operations Tests', (getTestEnv) => {
  describe('$and containing $or clauses', () => {
    it('should handle $and containing $or clauses', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $and: [
          {
            $or: [{ 'name.first': { $eq: 'Anna' } }, { 'name.first': { $eq: 'Diana' } }]
          },
          { isActive: { $eq: true } }
        ]
      });

      // Assert
      expect(results).toHaveLength(2);
      const expectedIds = ['person1', 'person4'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.isActive).toBe(true);
        expect(['Anna', 'Diana']).toContain(doc.name.first);
      });
    });
  });

  describe('$or containing $and clauses', () => {
    it('should handle $or containing $and clauses', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $or: [
          {
            $and: [{ isActive: { $eq: false } }, { age: { $gt: 40 } }]
          },
          { score: { $gt: 95 } }
        ]
      });

      // Assert
      expect(results).toHaveLength(1);
      const actualIds = results.map((doc) => doc._id);
      expect(actualIds).toContain('person5');
    });
  });

  describe('Complex nested logical operations', () => {
    it('should handle complex nested logical operations', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        $and: [
          {
            $or: [{ age: { $lt: 35 } }, { age: { $gt: 60 } }]
          },
          {
            $or: [{ isActive: { $eq: true } }, { score: { $gt: 90 } }]
          }
        ]
      });

      // Assert
      expect(results).toHaveLength(2);
      const expectedIds = ['person1', 'person6'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
        const ageCondition = doc.age < 35 || doc.age > 60;
        const activeOrHighScore = doc.isActive || doc.score > 90;
        expect(ageCondition).toBe(true);
        expect(activeOrHighScore).toBe(true);
      });
    });
  });

  describe('Implicit AND with explicit operators', () => {
    it('should handle implicit AND with explicit $and', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        isActive: { $eq: true },
        $and: [{ age: { $gt: 30 } }, { score: { $gt: 80 } }]
      });

      // Assert
      expect(results).toHaveLength(1);
      const expectedIds = ['person3'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.isActive).toBe(true);
        expect(doc.age).toBeGreaterThan(30);
        expect(doc.score).toBeGreaterThan(80);
      });
    });

    it('should handle implicit AND with explicit $or', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        isActive: { $eq: true },
        $or: [{ age: { $lt: 35 } }, { age: { $gt: 60 } }]
      });

      // Assert
      expect(results).toHaveLength(2);
      const expectedIds = ['person1', 'person6'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.isActive).toBe(true);
        expect(doc.age < 35 || doc.age > 60).toBe(true);
      });
    });
  });

  describe('Multiple fields with multiple logical operators', () => {
    it('should handle multiple fields with multiple logical operators', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        'preferences.newsletter': { $eq: true },
        $and: [{ $or: [{ age: { $lt: 40 } }, { score: { $gt: 90 } }] }, { balance: { $gt: 500 } }]
      });

      // Assert
      expect(results).toHaveLength(2);
      const expectedIds = ['person1', 'person4'];
      results.forEach((doc) => {
        expect(expectedIds).toContain(doc._id);
        expect(doc.preferences.newsletter).toBe(true);
        expect(doc.age < 40 || doc.score > 90).toBe(true);
        expect(doc.balance).toBeGreaterThan(500);
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid $and structure', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.find({ $and: 'not an array' });
      }).toThrow();
    });

    it('should throw error for invalid $or structure', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.find({ $or: { invalid: 'structure' } });
      }).toThrow();
    });
  });
});
