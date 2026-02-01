import { describe, it, expect, beforeAll } from 'vitest';
import { createValidationDatabase } from './validation-setup.js';

let orders;

beforeAll(() => {
  ({ orders } = createValidationDatabase());
});

describe('$set Basic Field Setting Tests', () => {
  it('should overwrite existing string values', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $set: { status: 'shipped' } });
    expect(result.modifiedCount).toBe(1);
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.status).toBe('shipped');
  });

  it('should overwrite existing numeric values', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { priority: 5 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBe(5);
  });

  it('should overwrite existing boolean values', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { isRush: true } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.isRush).toBe(true);
  });

  it('should overwrite existing array values', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { tags: ['updated'] } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.tags).toEqual(['updated']);
  });

  it('should overwrite existing object values', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { metrics: { processTime: 99 } } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics.processTime).toBe(99);
  });

  it('should create new top-level fields', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { newField: 'value' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.newField).toBe('value');
  });

  it('should set nested fields using dot notation', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { 'delivery.address': '123 Main St' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.delivery.address).toBe('123 Main St');
  });

  it('should set deeply nested fields', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { 'metrics.delivery.actualDays': 2 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics.delivery.actualDays).toBe(2);
  });
});

describe('$set Type Changes Tests', () => {
  it('should change string field to number', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { status: 123 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.status).toBe(123);
  });

  it('should change number field to array', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { totalAmount: [1, 2, 3] } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toEqual([1, 2, 3]);
  });

  it('should change object field to primitive', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { metrics: 'primitive' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics).toBe('primitive');
  });

  it('should change null field to non-null value', () => {
    orders.updateOne({ _id: 'order2' }, { $set: { customerNotes: 'note' } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.customerNotes).toBe('note');
  });
});

describe('$set Object Creation Tests', () => {
  it('should create nested object structure via dot notation', () => {
    orders.updateOne({ _id: 'order2' }, { $set: { 'shipping.address.city': 'London' } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.shipping.address.city).toBe('London');
  });

  it('should perform partial object updates', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { 'metrics.delivery.estimatedDays': 5 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics.delivery.estimatedDays).toBe(5);
  });

  it('should handle mixed existing and new nested fields', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { 'metrics.delivery.newField': 'x', 'metrics.delivery.actualDays': 7 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics.delivery.newField).toBe('x');
    expect(updated.metrics.delivery.actualDays).toBe(7);
  });
});

describe('$set Edge Cases Tests', () => {
  it('should handle _id field setting appropriately', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { _id: 'order1' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated._id).toBe('order1');
  });

  it('should handle undefined vs null assignment', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { customerNotes: undefined } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.customerNotes).toBeUndefined();
  });

  it('should distinguish empty string from null assignment', () => {
    orders.updateOne({ _id: 'order1' }, { $set: { customerNotes: '' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.customerNotes).toBe('');
  });
});

describe('$unset Basic Field Removal Tests', () => {
  it('should remove top-level fields', () => {
    orders.updateOne({ _id: 'order1' }, { $unset: { priority: '' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBeUndefined();
  });

  it('should remove multiple top-level fields', () => {
    orders.updateOne({ _id: 'order1' }, { $unset: { priority: '', isRush: '' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBeUndefined();
    expect(updated.isRush).toBeUndefined();
  });

  it('should remove nested fields using dot notation', () => {
    orders.updateOne({ _id: 'order1' }, { $unset: { 'metrics.delivery.actualDays': '' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics.delivery.actualDays).toBeUndefined();
  });

  it('should remove deeply nested fields', () => {
    orders.updateOne({ _id: 'order1' }, { $unset: { 'metrics.delivery': '' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics.delivery).toBeUndefined();
  });
});

describe('$unset Object Structure Preservation Tests', () => {
  it('should leave parent object when removing field', () => {
    orders.updateOne({ _id: 'order1' }, { $unset: { 'metrics.delivery.actualDays': '' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics.delivery).toEqual(expect.any(Object));
  });

  it('should leave empty object when removing all fields', () => {
    orders.updateOne({ _id: 'order2' }, { $unset: { metrics: '' } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.metrics).toBeUndefined();
  });

  it('should maintain object hierarchy when removing nested field', () => {
    orders.updateOne({ _id: 'order1' }, { $unset: { 'metrics.delivery.estimatedDays': '' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.metrics).toBeDefined();
  });
});

describe('$unset Edge Cases Tests', () => {
  it('should handle unsetting non-existent field gracefully', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $unset: { nonExistent: '' } });
    expect(result.modifiedCount).toBe(1);
  });

  it('should handle _id field unset appropriately', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $unset: { _id: '' } });
    expect(result.modifiedCount).toBe(1);
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated._id).toBe('order1');
  });

  it('should handle unsetting field in non-existent parent object', () => {
    const result = orders.updateOne({ _id: 'order1' }, { $unset: { 'nonexistent.parent.child': '' } });
    expect(result.modifiedCount).toBe(1);
  });
});
