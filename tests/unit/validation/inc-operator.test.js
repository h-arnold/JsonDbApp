/**
 * $inc (Increment) Operator Validation Tests
 *
 * Tests MongoDB-compatible $inc operator against ValidationMockData.
 * Covers:
 * - Basic incrementation (positive, negative, zero, fractional)
 * - Field creation (non-existent fields, nested objects)
 * - Type validation (non-numeric fields, non-numeric increment values)
 * - Boundary testing (large numbers, floating point precision, max safe integer)
 */

import { describe, it, expect } from 'vitest';
import { describeValidationOperatorSuite } from '../../helpers/validation-test-helpers.js';

/**
 * Determines whether two numeric values are within a tolerance range
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} [tolerance=0.0001] - Maximum acceptable difference
 * @returns {boolean} True when values are within tolerance
 */
function areNumbersClose(a, b, tolerance = 0.0001) {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  return Math.abs(a - b) <= tolerance;
}

describeValidationOperatorSuite('$inc Increment Operator Tests', (getTestEnv) => {
  describe('Basic incrementation', () => {
    it('should increment positive integer values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.age;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $inc: { age: 5 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (typeof original === 'number' ? original : 0) + 5;
      const expectedModified = expected !== original ? 1 : 0;
      expect(result.modifiedCount).toBe(expectedModified);
      expect(updated.age).toBe(expected);
    });

    it('should increment positive decimal values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.score;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $inc: { score: 10.5 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (typeof original === 'number' ? original : 0) + 10.5;
      const expectedModified = expected !== original ? 1 : 0;
      expect(result.modifiedCount).toBe(expectedModified);
      expect(areNumbersClose(updated.score, expected, 0.0001)).toBe(true);
    });

    it('should decrement with negative increment values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person4' });
      const originalAge = before.age;
      const originalScore = before.score;

      // Act
      const result = collection.updateOne({ _id: 'person4' }, { $inc: { age: -3, score: -8.1 } });

      // Assert
      const updated = collection.findOne({ _id: 'person4' });
      const expectedAge = (typeof originalAge === 'number' ? originalAge : 0) - 3;
      const expectedScore = (typeof originalScore === 'number' ? originalScore : 0) - 8.1;
      const changed =
        expectedAge !== originalAge || !areNumbersClose(expectedScore, originalScore, 0.0001);
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.age).toBe(expectedAge);
      expect(areNumbersClose(updated.score, expectedScore, 0.0001)).toBe(true);
    });

    it('should handle zero increment as no-op', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person3' });
      const originalAge = original.age;
      const originalScore = original.score;

      // Act
      const result = collection.updateOne({ _id: 'person3' }, { $inc: { age: 0, score: 0.0 } });

      // Assert
      expect(result.modifiedCount).toBe(0);
      const updated = collection.findOne({ _id: 'person3' });
      expect(updated.age).toBe(originalAge);
      expect(updated.score).toBe(originalScore);
    });

    it('should handle fractional increments correctly', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.balance;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $inc: { balance: 0.25 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (typeof original === 'number' ? original : 0) + 0.25;
      const changed = !areNumbersClose(expected, original, 0.0001);
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(areNumbersClose(updated.balance, expected, 0.0001)).toBe(true);
    });
  });

  describe('Field creation', () => {
    it('should create non-existent field with increment value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.newCounterField;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $inc: { newCounterField: 42 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const starting = typeof original === 'number' ? original : 0;
      const expected = starting + 42;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.newCounterField).toBe(expected);
    });

    it('should create non-existent decimal field with increment value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person2' });
      const original = before.newRatingField;

      // Act
      const result = collection.updateOne({ _id: 'person2' }, { $inc: { newRatingField: 3.7 } });

      // Assert
      const updated = collection.findOne({ _id: 'person2' });
      const starting = typeof original === 'number' ? original : 0;
      const expected = starting + 3.7;
      const changed = !areNumbersClose(expected, original, 0.0001);
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(areNumbersClose(updated.newRatingField, expected, 0.0001)).toBe(true);
    });

    it('should create nested object structure when incrementing nested field', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.stats && before.stats.loginCount;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $inc: { 'stats.loginCount': 1 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const starting = typeof original === 'number' ? original : 0;
      const expected = starting + 1;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.stats.loginCount).toBe(expected);
      expect(typeof updated.stats).toBe('object');
    });
  });

  describe('Type validation', () => {
    it('should error when incrementing non-numeric field', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'person1' }, { $inc: { 'name.first': 5 } });
      }).toThrow();
    });

    it('should error when incrementing boolean field', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'person1' }, { $inc: { isActive: 1 } });
      }).toThrow();
    });

    it('should error with non-numeric increment value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'person1' }, { $inc: { age: 'five' } });
      }).toThrow();
    });

    it('should error with boolean increment value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'person1' }, { $inc: { age: true } });
      }).toThrow();
    });

    it('should error with null increment value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'person1' }, { $inc: { age: null } });
      }).toThrow();
    });
  });

  describe('Boundary testing', () => {
    it('should handle large number increments', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const largeIncrement = 1000000;
      const before = collection.findOne({ _id: 'person6' });
      const original = before.balance;

      // Act
      const result = collection.updateOne(
        { _id: 'person6' },
        { $inc: { balance: largeIncrement } }
      );

      // Assert
      const updated = collection.findOne({ _id: 'person6' });
      const expected = (typeof original === 'number' ? original : 0) + largeIncrement;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(areNumbersClose(updated.balance, expected, 0.0001)).toBe(true);
    });

    it('should maintain floating point precision', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.score;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $inc: { score: 0.1 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = (typeof original === 'number' ? original : 0) + 0.1;
      const changed = !areNumbersClose(expected, original, 0.000001);
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(areNumbersClose(updated.score, expected, 0.0001)).toBe(true);
    });

    it('should handle near-maximum safe integer values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      collection.updateOne(
        { _id: 'person1' },
        { $set: { largeNumber: Number.MAX_SAFE_INTEGER - 100 } }
      );

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $inc: { largeNumber: 50 } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.largeNumber).toBe(Number.MAX_SAFE_INTEGER - 50);
    });
  });
});
