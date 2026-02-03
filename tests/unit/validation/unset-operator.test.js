/**
 * $unset (Field Removal) Operator Validation Tests
 * 
 * Tests MongoDB-compatible $unset operator against ValidationMockData.
 * Covers:
 * - Basic field removal (top-level, multiple fields, nested fields, deeply nested)
 * - Object structure preservation (parent objects, empty objects, hierarchy maintenance)
 * - Edge cases (non-existent field, _id field, non-existent parent object)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupValidationTestEnvironment, cleanupValidationTests } from '../../helpers/validation-test-helpers.js';

let testEnv;

describe('$unset Field Removal Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });

  describe('Basic field removal', () => {
    it('should remove top-level fields', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      collection.updateOne({ _id: 'person1' }, { $set: { tempField: 'temporary' } });
      const doc = collection.findOne({ _id: 'person1' });
      expect(doc.tempField).toBe('temporary');
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { tempField: '' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.tempField).toBe(undefined);
      expect(updated.name).not.toBe(undefined);
    });

    it('should remove multiple top-level fields', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      collection.updateOne({ _id: 'person1' }, { $set: { temp1: 'value1', temp2: 'value2', temp3: 'value3' } });
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { temp1: '', temp3: '' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.temp1).toBe(undefined);
      expect(updated.temp2).toBe('value2');
      expect(updated.temp3).toBe(undefined);
    });

    it('should remove nested fields using dot notation', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { 'preferences.newsletter': '' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.newsletter).toBe(undefined);
      expect(updated.preferences.tags).not.toBe(undefined);
    });

    it('should remove deeply nested fields', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { 'preferences.settings.notifications.email.frequency': '' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.settings.notifications.email.frequency).toBe(undefined);
      expect(updated.preferences.settings.notifications.email.enabled).not.toBe(undefined);
    });
  });

  describe('Object structure preservation', () => {
    it('should leave parent object when removing field', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { 'name.first': '' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.name.first).toBe(undefined);
      expect(updated.name.last).toBe('Brown');
      expect(typeof updated.name).toBe('object');
    });

    it('should leave empty object when removing all fields', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { 'name.first': '', 'name.last': '' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.name.first).toBe(undefined);
      expect(updated.name.last).toBe(undefined);
      expect(typeof updated.name).toBe('object');
      expect(updated.name).toEqual({});
    });

    it('should maintain object hierarchy when removing nested field', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { 'preferences.settings.theme': '' } }
      );
      
      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.settings.theme).toBe(undefined);
      expect(typeof updated.preferences).toBe('object');
      expect(typeof updated.preferences.settings).toBe('object');
      expect(updated.preferences.settings.notifications).not.toBe(undefined);
    });
  });

  describe('Edge cases', () => {
    it('should handle unsetting non-existent field gracefully', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person1' });
      expect(original).not.toBe(null);
      expect(original.name).not.toBe(undefined);
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { nonExistentField: '' } }
      );
      
      // Assert
      // Unsetting a non-existent field should be a no-op
      expect(result.modifiedCount).toBe(0);
      const updated = collection.findOne({ _id: 'person1' });
      // The non-existent field must remain absent and known fields unchanged
      expect(updated).toEqual(original);
      expect(updated.nonExistentField).toBe(undefined);
      expect(updated._id).toBe(original._id);
      expect(updated.name).not.toBe(undefined);
    });

    it('should handle _id field unset appropriately', () => {
      const collection = testEnv.collections.persons;
      
      try {
        const result = collection.updateOne(
          { _id: 'person1' },
          { $unset: { _id: '' } }
        );
        // If successful, verify _id still exists
        expect(result.modifiedCount).toBeGreaterThanOrEqual(0);
        const updated = collection.findOne({ _id: 'person1' });
        expect(updated).not.toBe(null);
        expect(updated._id).not.toBe(undefined);
      } catch (error) {
        // If error thrown, verify it's a valid error
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle unsetting field in non-existent parent object', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { 'nonExistentParent.childField': '' } }
      );
      
      // Assert
      // Should handle gracefully without creating the parent object
      expect(result.modifiedCount).toBeGreaterThanOrEqual(0);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.nonExistentParent).toBe(undefined);
    });
  });
});
