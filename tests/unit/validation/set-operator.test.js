/**
 * $set (Field Update) Operator Validation Tests
 *
 * Tests MongoDB-compatible $set operator against ValidationMockData.
 * Covers:
 * - Basic field setting (all types: string, number, boolean, array, object)
 * - Type changes (string to number, number to array, object to primitive, null to non-null)
 * - Object creation (nested structures via dot notation, partial updates, mixed existing/new fields)
 * - Edge cases (_id field, undefined vs null, empty string vs null)
 */

import { describe, it, expect } from 'vitest';
import { describeValidationOperatorSuite } from '../../helpers/validation-test-helpers.js';

describeValidationOperatorSuite('$set Field Update Operator Tests', (getTestEnv) => {
  describe('Basic field setting - overwrite existing values', () => {
    it('should overwrite existing string values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { 'name.first': 'Alexandra' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.name.first).toBe('Alexandra');
      expect(updated.name.last).toBe('Brown');
    });

    it('should overwrite existing numeric values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $set: { age: 35, score: 92.7 } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.age).toBe(35);
      expect(updated.score).toBe(92.7);
    });

    it('should overwrite existing boolean values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { isActive: false, 'preferences.newsletter': false } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.isActive).toBe(false);
      expect(updated.preferences.newsletter).toBe(false);
    });

    it('should overwrite existing array values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const newTags = ['updated', 'test', 'values'];

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { 'preferences.tags': newTags } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.tags).toEqual(newTags);
    });

    it('should overwrite existing object values', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const newContact = { email: 'new.email@example.com', phones: ['999-111-2222'] };

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $set: { contact: newContact } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.contact).toEqual(newContact);
    });
  });

  describe('Basic field setting - create new fields', () => {
    it('should create new top-level fields', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { newField: 'new value', anotherField: 42 } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.newField).toBe('new value');
      expect(updated.anotherField).toBe(42);
    });

    it('should set nested fields using dot notation', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { 'preferences.settings.theme': 'auto' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.settings.theme).toBe('auto');
      expect(updated.preferences.settings.notifications).not.toBe(undefined);
    });

    it('should set deeply nested fields', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { 'preferences.settings.notifications.email.frequency': 'daily' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.settings.notifications.email.frequency).toBe('daily');
      expect(updated.preferences.settings.notifications.email.enabled).toBe(true);
    });
  });

  describe('Type changes', () => {
    it('should change string field to number', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.orders;
      collection.updateOne({ _id: 'order1' }, { $set: { stringField: 'text123' } });

      // Act
      const result = collection.updateOne({ _id: 'order1' }, { $set: { stringField: 456 } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'order1' });
      expect(updated.stringField).toBe(456);
      expect(typeof updated.stringField).toBe('number');
    });

    it('should change number field to array', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.orders;
      const newArray = [1, 2, 3, 'mixed', true];

      // Act
      const result = collection.updateOne({ _id: 'order1' }, { $set: { priority: newArray } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'order1' });
      expect(updated.priority).toEqual(newArray);
      expect(Array.isArray(updated.priority)).toBe(true);
    });

    it('should change object field to primitive', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.orders;

      // Act
      const result = collection.updateOne({ _id: 'order1' }, { $set: { metrics: 'simplified' } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'order1' });
      expect(updated.metrics).toBe('simplified');
      expect(typeof updated.metrics).toBe('string');
    });

    it('should change null field to non-null value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person2' },
        { $set: { lastLogin: new Date('2025-06-28T12:00:00Z') } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person2' });
      expect(updated.lastLogin).not.toBe(null);
      expect(updated.lastLogin instanceof Date).toBe(true);
    });
  });

  describe('Object creation', () => {
    it('should create nested object structure via dot notation', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        {
          $set: {
            'profile.bio.summary': 'Software developer',
            'profile.bio.skills': ['JavaScript', 'MongoDB']
          }
        }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.profile.bio.summary).toBe('Software developer');
      expect(updated.profile.bio.skills).toEqual(['JavaScript', 'MongoDB']);
    });

    it('should perform partial object updates', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { 'preferences.settings.language': 'en-GB' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.settings.language).toBe('en-GB');
      expect(updated.preferences.settings.theme).not.toBe(undefined);
      expect(updated.preferences.settings.notifications).not.toBe(undefined);
    });

    it('should handle mixed existing and new nested fields', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        {
          $set: {
            'preferences.settings.theme': 'system', // existing
            'preferences.settings.timezone': 'GMT', // new
            'preferences.newCategory.option1': true // completely new branch
          }
        }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.settings.theme).toBe('system');
      expect(updated.preferences.settings.timezone).toBe('GMT');
      expect(updated.preferences.newCategory.option1).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should not allow changing the _id field via $set', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person1' });
      expect(original).not.toBe(null);
      expect(original._id).toBe('person1');

      // Act
      const result = collection.updateOne({ _id: 'person1' }, { $set: { _id: 'newId' } });

      // Assert
      // Attempting to change _id should not move or re-key the document.
      // We expect no actual modification to be recorded.
      expect(result.modifiedCount).toBe(0);

      const updated = collection.findOne({ _id: 'person1' });
      expect(updated).toEqual(original);

      const moved = collection.findOne({ _id: 'newId' });
      expect(moved).toBe(null);
    });

    it('should handle undefined vs null assignment', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { nullField: null, undefinedField: undefined } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.nullField).toBe(null);
      // Note: JavaScript/JSON typically converts undefined to null or omits the field
      expect(updated.undefinedField === undefined || updated.undefinedField === null).toBe(true);
    });

    it('should distinguish empty string from null assignment', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { emptyStringField: '', nullField: null } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.emptyStringField).toBe('');
      expect(updated.nullField).toBe(null);
      expect(updated.emptyStringField).not.toBe(updated.nullField);
    });
  });
});
