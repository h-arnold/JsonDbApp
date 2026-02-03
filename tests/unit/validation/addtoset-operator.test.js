/**
 * $addToSet (Array Add to Set) Operator Validation Tests
 *
 * Tests MongoDB-compatible $addToSet operator against ValidationMockData.
 * Covers:
 * - Adding unique values (primitives, objects)
 * - Duplicate prevention (primitives, objects)
 * - $each modifier (multiple values with uniqueness)
 * - Array creation (non-existent fields)
 * - Type validation (non-array fields)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupValidationTestEnvironment,
  cleanupValidationTests
} from '../../helpers/validation-test-helpers.js';

let testEnv;

describe('$addToSet Array Add to Set Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });

  describe('Adding unique values', () => {
    it('should add a value to a set if it is not already present', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $addToSet: { 'preferences.tags': 'new-unique-tag' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.tags.includes('new-unique-tag')).toBe(true);
    });

    it('should add a unique object to an array of objects', () => {
      // Arrange
      const collection = testEnv.collections.inventory;
      const newAlert = { type: 'security-alert', level: 'high' };

      // Act
      const result = collection.updateOne({ _id: 'inv1' }, { $addToSet: { alerts: newAlert } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'inv1' });
      expect(updated.alerts.some((alert) => alert.type === 'security-alert')).toBe(true);
    });
  });

  describe('Duplicate prevention', () => {
    it('should not add a value to a set if it is already present', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $addToSet: { 'preferences.tags': 'sports' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(0);
      const updated = collection.findOne({ _id: 'person1' });
      const tagCount = updated.preferences.tags.filter((tag) => tag === 'sports').length;
      expect(tagCount).toBe(1);
    });

    it('should not add a duplicate object to an array of objects', () => {
      // Arrange
      const collection = testEnv.collections.inventory;
      const existingAlert = { type: 'low-stock', product: 'prod3', threshold: 10 };

      // Precondition: ensure the existing alert is present (guards against prior test mutations)
      const beforeDoc = collection.findOne({ _id: 'inv1' });
      const hasExisting =
        beforeDoc &&
        Array.isArray(beforeDoc.alerts) &&
        beforeDoc.alerts.some(
          (a) => a && a.type === 'low-stock' && a.product === 'prod3' && a.threshold === 10
        );
      if (!hasExisting) {
        const seedRes = collection.updateOne(
          { _id: 'inv1' },
          { $addToSet: { alerts: existingAlert } }
        );
        // Seeding either adds (1) or is a no-op (0) depending on state
        expect(seedRes.modifiedCount === 0 || seedRes.modifiedCount === 1).toBe(true);
      }

      // Act
      const result = collection.updateOne(
        { _id: 'inv1' },
        { $addToSet: { alerts: existingAlert } }
      );

      // Assert
      expect(result.modifiedCount).toBe(0);
    });
  });

  describe('$each modifier', () => {
    it('should add multiple unique values with $each', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person3' },
        { $addToSet: { 'preferences.tags': { $each: ['new-tag1', 'new-tag2', 'sports'] } } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person3' });
      expect(updated.preferences.tags.includes('new-tag1')).toBe(true);
      expect(updated.preferences.tags.includes('new-tag2')).toBe(true);
      const sportTagCount = updated.preferences.tags.filter((tag) => tag === 'sports').length;
      expect(sportTagCount).toBe(1);
    });
  });

  describe('Array creation', () => {
    it('should create an array field if it does not exist', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person5' },
        { $addToSet: { 'newly.created.field': 'initial-value' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person5' });
      expect(updated.newly.created.field).toEqual(['initial-value']);
    });
  });

  describe('Type validation', () => {
    it('should throw an error when used on a non-array field', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        collection.updateOne({ _id: 'person1' }, { $addToSet: { 'name.first': 'a-value' } });
      }).toThrow();
    });
  });
});
