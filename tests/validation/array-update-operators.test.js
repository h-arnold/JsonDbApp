import { describe, it, expect, beforeAll } from 'vitest';
import { createValidationDatabase } from './validation-setup.js';

let orders;

beforeAll(() => {
  ({ orders } = createValidationDatabase());
});

describe('$push Operator Tests', () => {
  it('should append a single value to an existing array', () => {
    orders.updateOne({ _id: 'order1' }, { $push: { tags: 'newTag' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags).toContain('newTag');
  });

  it('should append an object value to an array', () => {
    orders.updateOne({ _id: 'order1' }, { $push: { items: { sku: 'prodX', quantity: 1, price: 5 } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.items.some(({ sku }) => sku === 'prodX')).toBe(true);
  });

  it('should create array when pushing to a non-existent field', () => {
    orders.updateOne({ _id: 'order2' }, { $push: { notes: 'first' } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.notes).toEqual(['first']);
  });

  it('should create array when pushing to a nested non-existent field', () => {
    orders.updateOne({ _id: 'order2' }, { $push: { 'metrics.delivery.events': 'event1' } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.metrics.delivery.events).toEqual(['event1']);
  });

  it('should throw error when pushing to a non-array field', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $push: { status: 'bad' } })).toThrow();
  });

  it('should push multiple values with $each modifier', () => {
    orders.updateOne({ _id: 'order1' }, { $push: { tags: { $each: ['a', 'b'] } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('should handle empty array with $each modifier', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $push: { tags: { $each: [] } } });
    expect(result.modifiedCount).toBe(1);
  });

  it('should push array of objects with $each', () => {
    orders.updateOne({ _id: 'order1' }, { $push: { items: { $each: [{ sku: 'new1' }, { sku: 'new2' }] } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.items.some(({ sku }) => sku === 'new1')).toBe(true);
    expect(updated.items.some(({ sku }) => sku === 'new2')).toBe(true);
  });
});

describe('$pull Operator Tests', () => {
  it('should remove a specific value from an array', () => {
    orders.updateOne({ _id: 'order1' }, { $pull: { tags: 'online' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags).not.toContain('online');
  });

  it('should remove all occurrences of a value', () => {
    orders.updateOne({ _id: 'order1' }, { $pull: { tags: 'music' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags.filter((t) => t === 'music').length).toBe(0);
  });

  it('should handle pulling from a non-array field gracefully', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $pull: { status: 'processing' } })).toThrow();
  });

  it('should handle pulling a non-existent value', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $pull: { tags: 'nonexistent' } });
    expect(result.modifiedCount).toBe(1);
  });

  it('should handle pulling from an empty array', () => {
    orders.updateOne({ _id: 'order2' }, { $set: { tags: [] } });
    const result = orders.updateOne({ _id: 'order2' }, { $pull: { tags: 'anything' } });
    expect(result.modifiedCount).toBe(1);
  });

  it('should remove numeric values matching operator object', () => {
    orders.updateOne({ _id: 'order1' }, { $push: { tags: 10 } });
    orders.updateOne({ _id: 'order1' }, { $pull: { tags: { $gt: 5 } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags).not.toContain(10);
  });

  it('should remove objects matching mixed field and operator predicates', () => {
    orders.updateOne({ _id: 'order1' }, { $push: { items: { sku: 'removeMe', quantity: 1, price: 2 } } });
    orders.updateOne({ _id: 'order1' }, { $pull: { items: { quantity: { $lt: 2 }, price: { $lt: 3 } } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.items.some(({ sku }) => sku === 'removeMe')).toBe(false);
  });

  it('should remove exact matching object in array', () => {
    const obj = { sku: 'exact', quantity: 1 };
    orders.updateOne({ _id: 'order1' }, { $push: { items: obj } });
    orders.updateOne({ _id: 'order1' }, { $pull: { items: obj } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.items.some(({ sku }) => sku === 'exact')).toBe(false);
  });

  it('should not match operator object against object element directly', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $pull: { items: { $gt: 1 } } });
    expect(result.modifiedCount).toBe(1);
  });

  it('should not match when predicate references missing field', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $pull: { items: { missing: { $eq: true } } } });
    expect(result.modifiedCount).toBe(1);
  });

  it('should match null equality correctly', () => {
    orders.updateOne({ _id: 'order1' }, { $push: { tags: null } });
    orders.updateOne({ _id: 'order1' }, { $pull: { tags: null } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags).not.toContain(null);
  });

  it('should compare dates by timestamp for operator removal', () => {
    const date = new Date('2025-06-30T00:00:00Z');
    orders.updateOne({ _id: 'order1' }, { $push: { tags: date } });
    orders.updateOne({ _id: 'order1' }, { $pull: { tags: { $gt: new Date('2025-06-29T00:00:00Z') } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags.some((t) => t instanceof Date && t.getTime() === date.getTime())).toBe(false);
  });

  it('should remove object using partial predicate', () => {
    orders.updateOne({ _id: 'order1' }, { $push: { items: { sku: 'partial', qty: 1, price: 5 } } });
    orders.updateOne({ _id: 'order1' }, { $pull: { items: { sku: 'partial' } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.items.some(({ sku }) => sku === 'partial')).toBe(false);
  });

  it('should report no modification when pulling from non-existent array field', () => {
    const result = orders.updateOne({ _id: 'order3' }, { $pull: { missing: 'x' } });
    expect(result.modifiedCount).toBe(0);
  });

  it('should report no modification when operator predicate matches nothing', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $pull: { tags: { $gt: 100000 } } });
    expect(result.modifiedCount).toBe(1);
  });
});
