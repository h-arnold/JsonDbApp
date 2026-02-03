/**
 * $max (Maximum) Operator Validation Tests
 *
 * Tests MongoDB-compatible $max operator against ValidationMockData.
 * Covers:
 * - Value comparison (replace when new is larger, keep when current is larger)
 * - Field creation (non-existent fields)
 * - Boundary testing (maximum safe integer, date ranges)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupValidationTestEnvironment,
  cleanupValidationTests
} from '../../helpers/validation-test-helpers.js';

let testEnv;

/**
 * Determines whether a value is null or undefined
 * @param {*} value - Candidate value
 * @returns {boolean} True when value is nullish
 */
function isNullish(value) {
  return value === null || value === undefined;
}

describe('$max Maximum Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });

  describe('Value comparison', () => {
    it('should replace field when new value is larger', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.age;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $max: { age: 35 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = isNullish(original) || original < 35 ? 35 : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.age).toBe(expected);
    });

    it('should not change field when current value is larger', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person6' });
      const originalAge = original.age;

      // Act
      const result = collection.updateOne({ _id: 'person6' }, { $max: { age: 60 } });

      // Assert
      const expected = isNullish(originalAge) || originalAge < 60 ? 60 : originalAge;
      const changed = expected !== originalAge;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      const updated = collection.findOne({ _id: 'person6' });
      expect(updated.age).toBe(originalAge);
    });

    it('should not change field when values are equal', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person3' });
      const originalAge = original.age;

      // Act
      const result = collection.updateOne({ _id: 'person3' }, { $max: { age: originalAge } });

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
      const before = collection.findOne({ _id: 'person2' });
      const original = before.score;

      // Act
      const result = collection.updateOne({ _id: 'person2' }, { $max: { score: 5 } });

      // Assert
      const updated = collection.findOne({ _id: 'person2' });
      const expected = isNullish(original) || original < 5 ? 5 : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.score).toBe(expected);
    });
  });

  describe('Field creation', () => {
    it('should create non-existent field with max value', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.newMaxField;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $max: { newMaxField: 200 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = isNullish(original) || original < 200 ? 200 : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.newMaxField).toBe(expected);
    });
  });

  describe('Boundary testing', () => {
    it('should handle maximum safe integer values', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.age;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $max: { age: Number.MAX_SAFE_INTEGER } }
      );

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected =
        isNullish(original) || original < Number.MAX_SAFE_INTEGER
          ? Number.MAX_SAFE_INTEGER
          : original;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.age).toBe(expected);
    });

    it('should handle date range maximums', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const futureDate = new Date('2030-12-31T23:59:59Z');
      const before = collection.findOne({ _id: 'person1' });
      const original = before.lastLogin;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $max: { lastLogin: futureDate } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const originalTime =
        original instanceof Date
          ? original.getTime()
          : original
            ? new Date(original).getTime()
            : null;
      const expectedTime =
        isNullish(originalTime) || originalTime < futureDate.getTime()
          ? futureDate.getTime()
          : originalTime;
      const changed = expectedTime !== originalTime;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.lastLogin.getTime()).toBe(expectedTime);
    });
  });
});
