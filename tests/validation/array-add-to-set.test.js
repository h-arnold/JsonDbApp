import { describe, it, expect, beforeAll } from 'vitest';
import { createValidationDatabase } from './validation-setup.js';

let orders;

beforeAll(() => {
  ({ orders } = createValidationDatabase());
});

describe('$addToSet Operator Tests', () => {
  it('should add a value to a set if it is not already present', () => {
    orders.updateOne({ _id: 'order1' }, { $addToSet: { tags: 'unique' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags).toContain('unique');
  });

  it('should not add a value to a set if it is already present', () => {
    orders.updateOne({ _id: 'order1' }, { $addToSet: { tags: 'online' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags.filter((t) => t === 'online').length).toBe(1);
  });

  it('should add a unique object to an array of objects', () => {
    orders.updateOne({ _id: 'order1' }, { $addToSet: { items: { sku: 'uniqueObj', quantity: 1 } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.items.some(({ sku }) => sku === 'uniqueObj')).toBe(true);
  });

  it('should not add a duplicate object to an array of objects', () => {
    orders.updateOne({ _id: 'order1' }, { $addToSet: { items: { sku: 'uniqueObj', quantity: 1 } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.items.filter(({ sku }) => sku === 'uniqueObj').length).toBe(1);
  });

  it('should add multiple unique values with $each', () => {
    orders.updateOne({ _id: 'order1' }, { $addToSet: { tags: { $each: ['x', 'y'] } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags).toEqual(expect.arrayContaining(['x', 'y']));
  });

  it('should create an array field if it does not exist', () => {
    orders.updateOne({ _id: 'order2' }, { $addToSet: { notes: 'first' } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.notes).toEqual(['first']);
  });

  it('should throw an error when used on a non-array field', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $addToSet: { status: 'bad' } })).toThrow();
  });
});
