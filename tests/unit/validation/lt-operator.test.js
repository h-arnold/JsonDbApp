/**
 * $lt (Less Than) Operator Validation Tests
 *
 * Tests MongoDB-compatible $lt operator against ValidationMockData.
 * Covers:
 * - Basic numeric comparisons (integers, floats)
 * - Negative number boundaries
 * - Zero boundary cases
 * - Date comparisons
 * - String comparisons (lexicographical)
 * - Boundary testing with extreme values
 * - Floating point precision
 * - Type mixing and null handling
 * - Missing fields
 */

import { describe, it, expect } from 'vitest';
import { describeValidationOperatorSuite } from '../../helpers/validation-test-helpers.js';

describeValidationOperatorSuite('$lt Less Than Operator Tests', (getTestEnv) => {
  describe('Basic numeric comparisons', () => {
    it('should compare integers correctly', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ age: { $lt: 40 } });

      // Assert
      expect(results).toHaveLength(3);
      const ageIds = results.map((doc) => doc._id);
      expect(ageIds).toContain('person1');
      expect(ageIds).toContain('person2');
      expect(ageIds).toContain('person4');
    });

    it('should compare floats correctly', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ score: { $lt: 80.0 } });

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(2);
      const scoreIds = results.map((doc) => doc._id);
      expect(scoreIds).toContain('person4');
      expect(scoreIds).toContain('person6');
    });

    it('should handle negative number boundaries', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ balance: { $lt: 0 } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person3');
    });

    it('should handle zero boundary cases', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ age: { $lt: 1 } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person2');
    });
  });

  describe('Date comparisons', () => {
    it('should compare Date objects chronologically', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const cutoffDate = new Date('2025-06-20T00:00:00Z');

      // Act
      const results = collection.find({ lastLogin: { $lt: cutoffDate } });

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(2);
      const olderIds = results.map((doc) => doc._id);
      expect(olderIds).toContain('person3');
      expect(olderIds).toContain('person5');
    });
  });

  describe('String comparisons', () => {
    it('should compare strings lexicographically', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ 'name.first': { $lt: 'D' } });

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(3);
      const nameIds = results.map((doc) => doc._id);
      expect(nameIds).toContain('person1');
      expect(nameIds).toContain('person2');
      expect(nameIds).toContain('person3');
    });
  });

  describe('Boundary testing with extreme values', () => {
    it('should handle large number boundaries', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ balance: { $lt: 15000 } });

      // Assert
      expect(results).toHaveLength(6);
    });

    it('should handle floating point precision', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ score: { $lt: 85.5 } });

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(2);
      const scoreIds = results.map((doc) => doc._id);
      expect(scoreIds).not.toContain('person1');
    });
  });

  describe('Type mixing and null handling', () => {
    it('should handle null in less than comparison', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ lastLogin: { $lt: new Date('2025-12-31') } });

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(5);
      results.forEach((doc) => {
        expect(doc.lastLogin).not.toBe(null);
      });
    });

    it('should handle missing fields correctly', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ 'missing.field': { $lt: 100 } });

      // Assert
      expect(results).toHaveLength(0);
    });
  });
});
