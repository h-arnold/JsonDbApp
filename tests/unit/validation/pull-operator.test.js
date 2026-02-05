/**
 * $pull (Array Remove) Operator Validation Tests
 *
 * Tests MongoDB-compatible $pull operator against ValidationMockData.
 * Covers:
 * - Basic value removal (specific values, all occurrences)
 * - Edge cases (non-array fields, non-existent values, empty arrays)
 * - Operator predicates (numeric comparisons, mixed field+operator)
 * - Exact object removal
 * - No-op & count behaviour
 */

import { describe, it, expect } from 'vitest';
import { describeValidationOperatorSuite } from '../../helpers/validation-test-helpers.js';

describeValidationOperatorSuite('$pull Array Remove Operator Tests', (getTestEnv) => {
  describe('Basic value removal', () => {
    it('should remove a specific value from an array', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person3' },
        { $pull: { 'preferences.tags': 'alerts' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person3' });
      expect(updated.preferences.tags).toEqual(['news', 'sports']);
    });

    it('should remove all occurrences of a value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.orders;

      // Act
      const result = collection.updateOne(
        { _id: 'order3' },
        { $pull: { items: { sku: 'prod1' } } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'order3' });
      expect(updated.items.length).toBe(1);
      const remainingSkus = updated.items.map((item) => item.sku);
      expect(remainingSkus.includes('prod1')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle pulling from a non-array field gracefully', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act & Assert
      expect(() => {
        const result = collection.updateOne(
          { _id: 'person1' },
          { $pull: { 'name.first': 'Anna' } }
        );
        expect(result.modifiedCount).toBe(0);
      }).not.toThrow();
    });

    it('should handle pulling a non-existent value', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      const original = collection.findOne({ _id: 'person1' });
      const originalTags = original.preferences.tags;

      // Act
      const result = collection.updateOne(
        { _id: 'person1' },
        { $pull: { 'preferences.tags': 'non-existent-tag' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(0);
      const updated = collection.findOne({ _id: 'person1' });
      expect(updated.preferences.tags).toEqual(originalTags);
    });

    it('should handle pulling from an empty array', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;

      // Act
      const result = collection.updateOne(
        { _id: 'person2' },
        { $pull: { 'preferences.tags': 'any-tag' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(0);
      const updated = collection.findOne({ _id: 'person2' });
      expect(updated.preferences.tags).toEqual([]);
    });
  });

  describe('Operator predicates', () => {
    it('should remove numeric values matching operator object', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      collection.updateOne({ _id: 'person4' }, { $set: { numbers: [10, 60, 95] } });

      // Act
      const pullResult = collection.updateOne(
        { _id: 'person4' },
        { $pull: { numbers: { $gt: 50 } } }
      );

      // Assert
      expect(pullResult.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'person4' });
      expect(updated.numbers).toEqual([10]);
    });

    it('should remove objects matching mixed field and operator predicates', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.orders;

      // Act
      const result = collection.updateOne(
        { _id: 'order1' },
        { $pull: { items: { sku: 'prod2', price: { $lt: 25 } } } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'order1' });
      const remainingSkus = updated.items.map((i) => i.sku);
      expect(remainingSkus.includes('prod2')).toBe(false);
      expect(updated.items.length).toBe(1);
    });
  });

  describe('Exact object removal', () => {
    it('should remove exact matching object in array', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.inventory;
      const before = collection.findOne({ _id: 'inv1' });
      const toRemove = { type: 'low-stock', product: 'prod3', threshold: 10 };

      // Act
      const result = collection.updateOne({ _id: 'inv1' }, { $pull: { alerts: toRemove } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const updated = collection.findOne({ _id: 'inv1' });
      expect(updated.alerts.length).toBe(before.alerts.length - 1);
      expect(updated.alerts.some((a) => a.type === 'low-stock')).toBe(false);
      expect(updated.alerts.some((a) => a.type === 'maintenance')).toBe(true);
    });
  });

  describe('Operator object edge cases', () => {
    it('should not match operator object against object element directly', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.inventory;
      const before = collection.findOne({ _id: 'inv3' });
      const beforeAlerts = before.alerts.slice();

      // Act
      const result = collection.updateOne({ _id: 'inv3' }, { $pull: { alerts: { $gt: 0 } } });

      // Assert
      expect(result.modifiedCount).toBe(0);
      const after = collection.findOne({ _id: 'inv3' });
      expect(after.alerts).toEqual(beforeAlerts);
    });

    it('should not match when predicate references missing field', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.inventory;
      const before = collection.findOne({ _id: 'inv1' });

      // Act
      const result = collection.updateOne(
        { _id: 'inv1' },
        { $pull: { alerts: { nonExistentField: 'whatever' } } }
      );

      // Assert
      expect(result.modifiedCount).toBe(0);
      const after = collection.findOne({ _id: 'inv1' });
      expect(after.alerts.length).toBe(before.alerts.length);
    });

    it('should match null equality correctly', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.orders;
      collection.updateOne({ _id: 'order2' }, { $push: { tags: null } });

      // Act
      const result = collection.updateOne({ _id: 'order2' }, { $pull: { tags: null } });

      // Assert
      expect(result.modifiedCount).toBe(1);
      const after = collection.findOne({ _id: 'order2' });
      expect(after.tags.includes(null)).toBe(false);
    });

    it('should compare dates by timestamp for operator removal', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.inventory;
      collection.updateOne(
        { _id: 'inv2' },
        { $set: { dates: [new Date('2025-06-10T00:00:00Z'), new Date('2025-06-20T00:00:00Z')] } }
      );

      // Act
      const result = collection.updateOne(
        { _id: 'inv2' },
        { $pull: { dates: { $lt: new Date('2025-06-15T00:00:00Z') } } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const after = collection.findOne({ _id: 'inv2' });
      expect(after.dates.length).toBe(1);
      expect(after.dates[0] instanceof Date || typeof after.dates[0] === 'string').toBe(true);
    });

    it('should remove object using partial predicate', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.inventory;
      const before = collection.findOne({ _id: 'inv3' });
      const originalLen = before.alerts.length;

      // Act
      const result = collection.updateOne(
        { _id: 'inv3' },
        { $pull: { alerts: { type: 'oversupply' } } }
      );

      // Assert
      expect(result.modifiedCount).toBe(1);
      const after = collection.findOne({ _id: 'inv3' });
      expect(after.alerts.length).toBe(originalLen - 1);
      expect(after.alerts.some((a) => a.type === 'oversupply')).toBe(false);
      expect(after.alerts.some((a) => a.type === 'capacity')).toBe(true);
    });
  });

  describe('No-op & count behaviour', () => {
    it('should report no modification when pulling from non-existent array field', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.orders;
      const before = collection.findOne({ _id: 'order1' });

      // Act
      const result = collection.updateOne(
        { _id: 'order1' },
        { $pull: { nonExistentArrayField: 'value' } }
      );

      // Assert
      expect(result.modifiedCount).toBe(0);
      const after = collection.findOne({ _id: 'order1' });
      expect(after.items).toEqual(before.items);
    });

    it('should report no modification when operator predicate matches nothing', () => {
      // Arrange
      const testEnv = getTestEnv();

      const collection = testEnv.collections.persons;
      collection.updateOne({ _id: 'person4' }, { $set: { numbers: [10, 20, 30] } });

      // Act
      const result = collection.updateOne({ _id: 'person4' }, { $pull: { numbers: { $gt: 500 } } });

      // Assert
      expect(result.modifiedCount).toBe(0);
      const after = collection.findOne({ _id: 'person4' });
      expect(after.numbers).toEqual([10, 20, 30]);
    });
  });
});
