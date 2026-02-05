/**
 * $mul (Multiply) Operator Validation Tests
 *
 * Tests MongoDB-compatible $mul operator against ValidationMockData.
 * Covers:
 * - Basic multiplication (positive, negative, zero, fractional multipliers)
 * - Field creation (non-existent fields set to 0)
 * - Type validation (non-numeric fields, non-numeric multipliers)
 */

import { describe, it, expect } from 'vitest';
import { describeValidationOperatorSuite } from '../../helpers/validation-test-helpers.js';

/**
 * Determines whether two numeric values are within a tolerance range
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} [tolerance=0.01] - Maximum acceptable difference
 * @returns {boolean} True when values are within tolerance
 */
function areNumbersClose(a, b, tolerance = 0.01) {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  return Math.abs(a - b) <= tolerance;
}

describeValidationOperatorSuite('$mul Multiply Operator Tests', (getTestEnv) => {
  describe('Basic multiplication', () => {
    it('should multiply by positive integer', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.age;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $mul: { age: 2 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = typeof original === 'number' ? original * 2 : 0;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.age).toBe(expected);
    });

    it('should multiply by positive decimal', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.score;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $mul: { score: 1.1 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = typeof original === 'number' ? original * 1.1 : 0;
      const changed = !areNumbersClose(expected, original, 0.0001);
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(areNumbersClose(updated.score, expected, 0.01)).toBe(true);
    });

    it('should multiply by negative value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person4' });
      const original = before.age;

      // Act
      const result = collection.updateOne({ _id: 'person4' }, { $mul: { age: -1 } });

      // Assert
      const updated = collection.findOne({ _id: 'person4' });
      const expected = typeof original === 'number' ? original * -1 : 0;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.age).toBe(expected);
    });

    it('should set field to zero when multiplying by zero', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person3' });
      const original = before.score;

      // Act
      const result = collection.updateOne({ _id: 'person3' }, { $mul: { score: 0 } });

      // Assert
      const updated = collection.findOne({ _id: 'person3' });
      const expected = 0;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.score).toBe(expected);
    });

    it('should multiply by fractional values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person6' });
      const original = before.balance;

      // Act
      const result = collection.updateOne({ _id: 'person6' }, { $mul: { balance: 0.5 } });

      // Assert
      const updated = collection.findOne({ _id: 'person6' });
      const expected = typeof original === 'number' ? original * 0.5 : 0;
      const changed = !areNumbersClose(expected, original, 0.0001);
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(areNumbersClose(updated.balance, expected, 0.01)).toBe(true);
    });
  });

  describe('Field creation', () => {
    it('should create non-existent field as 0 when multiplied', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person1' });
      const original = before.nonExistentField;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $mul: { nonExistentField: 5 } });

      // Assert
      const updated = collection.findOne({ _id: 'person1' });
      const expected = typeof original === 'number' ? original * 5 : 0;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.nonExistentField).toBe(expected);
    });

    it('should create nested non-existent field as 0', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const before = collection.findOne({ _id: 'person2' });
      const original = before.stats && before.stats.multipliedField;

      // Act
      const result = collection.updateOne(
        { _id: 'person2' },
        { $mul: { 'stats.multipliedField': 3.5 } }
      );

      // Assert
      const updated = collection.findOne({ _id: 'person2' });
      const starting = typeof original === 'number' ? original : 0;
      const expected = starting * 3.5;
      const changed = expected !== original;
      expect(result.modifiedCount).toBe(changed ? 1 : 0);
      expect(updated.stats.multipliedField).toBe(expected);
    });
  });

  describe('Type validation', () => {
    it('should error when multiplying non-numeric field', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'person1' }, { $mul: { 'name.first': 2 } });
      }).toThrow();
    });

    it('should error with non-numeric multiplier', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'person1' }, { $mul: { age: 'two' } });
      }).toThrow();
    });
  });
});
