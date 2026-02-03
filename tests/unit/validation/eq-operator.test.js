/**
 * $eq (Equality) Operator Validation Tests
 *
 * Tests MongoDB-compatible $eq operator against ValidationMockData.
 * Covers:
 * - Basic equality matching (string, number, boolean, null)
 * - Date object equality
 * - Nested object equality
 * - Edge cases (empty string vs null, zero vs false)
 * - Case sensitivity
 * - Nested field matching with dot notation
 * - Deep nested fields
 * - Non-existent paths
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupValidationTestEnvironment,
  cleanupValidationTests
} from '../../helpers/validation-test-helpers.js';

let testEnv;

describe('$eq Equality Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });
  describe('Basic equality matching', () => {
    it('should match string values exactly', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ 'name.first': { $eq: 'Anna' } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person1');
    });

    it('should match numeric values exactly', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ age: { $eq: 29 } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person1');
    });

    it('should match zero values correctly', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ age: { $eq: 0 } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person2');
    });

    it('should match boolean values exactly', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ isActive: { $eq: true } });

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(3);
      const activeIds = results.map((doc) => doc._id);
      expect(activeIds).toContain('person1');
      expect(activeIds).toContain('person3');
    });

    it('should match null values correctly', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ lastLogin: { $eq: null } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person2');
    });
  });

  describe('Date object equality', () => {
    it('should match Date objects by exact timestamp', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const targetDate = new Date('2025-06-20T10:30:00Z');

      // Act
      const results = collection.find({ lastLogin: { $eq: targetDate } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person1');
    });
  });

  describe('Nested object equality', () => {
    it('should match nested objects exactly', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ name: { $eq: { first: 'Anna', last: 'Brown' } } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person1');
    });
  });

  describe('Edge cases', () => {
    it('should distinguish empty string from null', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const emptyResults = collection.find({ 'contact.email': { $eq: '' } });
      const nullResults = collection.find({ 'contact.email': { $eq: null } });

      // Assert
      expect(emptyResults).toHaveLength(1);
      expect(emptyResults[0]._id).toBe('person6');

      expect(nullResults).toHaveLength(1);
      expect(nullResults[0]._id).toBe('person3');
    });

    it('should distinguish zero from false', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const zeroResults = collection.find({ age: { $eq: 0 } });
      const falseResults = collection.find({ isActive: { $eq: false } });

      // Assert
      expect(zeroResults).toHaveLength(1);
      expect(zeroResults[0]._id).toBe('person2');

      expect(falseResults.length).toBeGreaterThanOrEqual(1);
      const inactiveIds = falseResults.map((doc) => doc._id);
      expect(inactiveIds).toContain('person2');
    });
  });

  describe('Case sensitivity for strings', () => {
    it('should be case sensitive for strings', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const lowerResults = collection.find({ 'name.first': { $eq: 'anna' } });
      const upperResults = collection.find({ 'name.first': { $eq: 'Anna' } });

      // Assert
      expect(lowerResults).toHaveLength(0);
      expect(upperResults).toHaveLength(1);
    });
  });

  describe('Nested field equality with dot notation', () => {
    it('should match nested fields with dot notation', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ 'contact.email': { $eq: 'anna.brown@example.com' } });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('person1');
    });

    it('should match deep nested fields', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({
        'preferences.settings.notifications.email.enabled': { $eq: true }
      });

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(2);
      const enabledIds = results.map((doc) => doc._id);
      expect(enabledIds).toContain('person1');
      expect(enabledIds).toContain('person3');
    });

    it('should handle non-existent nested paths', () => {
      // Arrange
      const collection = testEnv.collections.persons;

      // Act
      const results = collection.find({ 'nonexistent.field': { $eq: 'value' } });

      // Assert
      expect(results).toHaveLength(0);
    });
  });
});
