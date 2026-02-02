/**
 * $push (Array Append) Operator Validation Tests
 * 
 * Tests MongoDB-compatible $push operator against ValidationMockData.
 * Covers:
 * - Basic array appending (single values, object values)
 * - Array creation (non-existent fields, nested fields)
 * - Type validation (non-array fields)
 * - $each modifier (multiple values, empty arrays, object arrays)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupValidationTestEnvironment, cleanupValidationTests } from '../../helpers/validation-test-helpers.js';

let testEnv;

describe('$push Array Append Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });

  describe('Basic array appending', () => {
    it('should append a single value to an existing array', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $push: { 'preferences.tags': 'new-tag' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.tags).toEqual(['sports', 'music', 'new-tag']);
    });

    it('should append an object value to an array', () => {
      // Arrange
      const collection = testEnv.collections.inventory;
      const newAlert = { type: 'high-temp', value: 30 };
      
      // Act
      const result = collection.updateOne(
        { _id: 'inv1' },
        { $push: { alerts: newAlert } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'inv1' });
      expect(updated.alerts.length).toBe(3);
      expect(updated.alerts[2]).toEqual(newAlert);
    });
  });

  describe('Array creation', () => {
    it('should create array when pushing to a non-existent field', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person2' },
        { $push: { newArrayField: 'first-element' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person2' });
      expect(updated.newArrayField).toEqual(['first-element']);
    });

    it('should create array when pushing to a nested non-existent field', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person2' },
        { $push: { 'newly.nested.array': 'deep-value' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person2' });
      expect(updated.newly.nested.array).toEqual(['deep-value']);
    });
  });

  describe('Type validation', () => {
    it('should throw error when pushing to a non-array field', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act & Assert
      expect(() => {
        collection.updateOne(
          { _id: 'person1' },
          { $push: { 'name.first': 'invalid' } }
        );
      }).toThrow();
    });
  });

  describe('$each modifier', () => {
    it('should push multiple values with $each modifier', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person4' },
        { $push: { 'preferences.tags': { $each: ['new1', 'new2', 'new3'] } } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person4' });
      const expected = ['travel', 'photography', 'music', 'new1', 'new2', 'new3'];
      expect(updated.preferences.tags).toEqual(expected);
    });

    it('should handle empty array with $each modifier', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person5' });
      const originalTags = original.preferences.tags;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person5' },
        { $push: { 'preferences.tags': { $each: [] } } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(0);
      const updated = collection.findOne({ _id: 'person5' });
      expect(updated.preferences.tags).toEqual(originalTags);
    });

    it('should push array of objects with $each', () => {
      // Arrange
      const collection = testEnv.collections.inventory;
      const newAlerts = [{ type: 'audit', user: 'system' }, { type: 'reorder', product: 'prod2' }];
      
      // Act
      const result = collection.updateOne(
        { _id: 'inv2' },
        { $push: { alerts: { $each: newAlerts } } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'inv2' });
      expect(updated.alerts.length).toBe(2);
      expect(updated.alerts).toEqual(newAlerts);
    });
  });
});
