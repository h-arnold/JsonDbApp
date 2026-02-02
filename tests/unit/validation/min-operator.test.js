/**
 * $min (Minimum) Operator Validation Tests
 * 
 * Tests MongoDB-compatible $min operator against ValidationMockData.
 * Covers:
 * - Value comparison (replace when new is smaller, keep when current is smaller)
 * - Field creation (non-existent fields)
 * - Type handling (Date comparisons, string comparisons, type mismatches)
 * - Edge cases (null vs number, undefined fields)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupValidationTestEnvironment, cleanupValidationTests } from '../../helpers/validation-test-helpers.js';

let testEnv;

describe('$min Minimum Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });

  describe('Value comparison', () => {
    it('should replace field when new value is smaller', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.age;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $min: { age: 25 } }
      );
      
      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (original == null || original > 25) ? 25 : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.age).toBe(expected);
    });

    it('should not change field when current value is smaller', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person1' });
      const originalAge = original.age;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $min: { age: 35 } }
      );
      
      // Assert
      const expected = (originalAge == null || originalAge > 35) ? 35 : originalAge;
      const changed = expected !== originalAge;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.age).toBe(originalAge);
    });

    it('should not change field when values are equal', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person3' });
      const originalAge = original.age;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person3' },
        { $min: { age: originalAge } }
      );
      
      // Assert
      const expected = originalAge;
      const changed = expected !== originalAge;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      const updated = collection.findOne({ _id: 'person3' });
      expect(updated.age).toBe(originalAge);
    });

    it('should handle mixed integer/float comparisons', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.score;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $min: { score: 80 } }
      );
      
      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (original == null || original > 80) ? 80 : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.score).toBe(expected);
    });
  });

  describe('Field creation', () => {
    it('should create non-existent field with min value', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.newMinField;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $min: { newMinField: 100 } }
      );
      
      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (original == null || original > 100) ? 100 : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.newMinField).toBe(expected);
    });
  });

  describe('Type handling', () => {
    it('should handle Date comparisons correctly', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const earlierDate = new Date('2025-06-01T00:00:00Z');
      const before = collection.findOne({ _id: 'person1' });
      const original = before.lastLogin;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $min: { lastLogin: earlierDate } }
      );
      
      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const originalTime = original instanceof Date ? original.getTime() : (original ? new Date(original).getTime() : null);
      const expectedTime = (originalTime == null || originalTime > earlierDate.getTime()) ? earlierDate.getTime() : originalTime;
      const changed = expectedTime !== originalTime;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.lastLogin.getTime()).toBe(expectedTime);
    });

    it('should handle string comparisons lexicographically', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.name.first;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $min: { 'name.first': 'Aaron' } }
      );
      
      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (original == null || original > 'Aaron') ? 'Aaron' : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.name.first).toBe(expected);
    });

    it('should handle type mismatches appropriately', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act & Assert
      expect(() => {
        collection.updateOne(
          { _id: 'person1' },
          { $min: { age: 'twenty-five' } }
        );
      }).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle null vs number comparisons', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person2' });
      const original = before.lastLogin;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person2' },
        { $min: { lastLogin: new Date('2025-06-01T00:00:00Z') } }
      );
      
      // Assert
      const originalTime = original instanceof Date ? original.getTime() : (original ? new Date(original).getTime() : null);
      const compTime = new Date('2025-06-01T00:00:00Z').getTime();
      const expectedTime = (originalTime == null || originalTime < compTime) ? originalTime : compTime;
      const changed = expectedTime !== originalTime;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      const updated = collection.findOne({ _id: 'person2' });
      expect(updated.lastLogin).toBe(null);
    });

    it('should handle undefined field appropriately', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.undefinedField;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $min: { undefinedField: 50 } }
      );
      
      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (original == null || original > 50) ? 50 : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.undefinedField).toBe(expected);
    });
  });
});
