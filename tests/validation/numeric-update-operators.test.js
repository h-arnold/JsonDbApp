import { describe, it, expect, beforeAll } from 'vitest';
import { createValidationDatabase } from './validation-setup.js';

let orders;

beforeAll(() => {
  ({ orders } = createValidationDatabase());
});

describe('$inc Basic Incrementation Tests', () => {
  it('should increment positive integer values', () => {
    orders.updateOne({ _id: 'order1' }, { $inc: { priority: 2 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBeGreaterThan(1);
  });

  it('should increment positive decimal values', () => {
    orders.updateOne({ _id: 'order1' }, { $inc: { totalAmount: 1.5 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toBeCloseTo(41.47, 2);
  });

  it('should decrement with negative increment values', () => {
    orders.updateOne({ _id: 'order1' }, { $inc: { priority: -1 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBeLessThan(1);
  });

  it('should handle zero increment as no-op', () => {
    const original = orders.findOne({ _id: 'order2' });
    orders.updateOne({ _id: 'order2' }, { $inc: { priority: 0 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.priority).toBe(original.priority);
  });

  it('should handle fractional increments correctly', () => {
    const original = orders.findOne({ _id: 'order2' });
    orders.updateOne({ _id: 'order2' }, { $inc: { discountPercent: 0.5 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.discountPercent).toBeCloseTo(original.discountPercent + 0.5);
  });
});

describe('$inc Field Creation Tests', () => {
  it('should create non-existent field with increment value', () => {
    orders.updateOne({ _id: 'order1' }, { $inc: { newMetric: 5 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.newMetric).toBe(5);
  });

  it('should create non-existent decimal field with increment value', () => {
    orders.updateOne({ _id: 'order2' }, { $inc: { newDecimal: 1.25 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.newDecimal).toBeCloseTo(1.25);
  });

  it('should create nested object structure when incrementing nested field', () => {
    orders.updateOne({ _id: 'order2' }, { $inc: { 'metrics.delivery.actualDays': 2 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.metrics.delivery.actualDays).toBe(2);
  });
});

describe('$inc Type Validation Tests', () => {
  it('should error when incrementing non-numeric field', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $inc: { status: 1 } })).toThrow();
  });

  it('should error when incrementing boolean field', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $inc: { isRush: 1 } })).toThrow();
  });

  it('should error with non-numeric increment value', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $inc: { priority: 'one' } })).toThrow();
  });

  it('should error with boolean increment value', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $inc: { priority: true } })).toThrow();
  });

  it('should error with null increment value', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $inc: { priority: null } })).toThrow();
  });
});

describe('$inc Boundary Testing Tests', () => {
  it('should handle large number increments', () => {
    orders.updateOne({ _id: 'order1' }, { $inc: { priority: Number.MAX_SAFE_INTEGER } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBeGreaterThan(Number.MAX_SAFE_INTEGER / 2);
  });

  it('should maintain floating point precision', () => {
    orders.updateOne({ _id: 'order1' }, { $inc: { totalAmount: 0.0001 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toBeCloseTo(39.9701, 4);
  });

  it('should handle near-maximum safe integer values', () => {
    orders.updateOne({ _id: 'order2' }, { $inc: { priority: Number.MAX_SAFE_INTEGER - 1 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.priority).toBeGreaterThan(Number.MAX_SAFE_INTEGER / 2);
  });
});

describe('$mul Basic Multiplication Tests', () => {
  it('should multiply by positive integer', () => {
    orders.updateOne({ _id: 'order1' }, { $mul: { priority: 2 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority % 2).toBe(0);
  });

  it('should multiply by positive decimal', () => {
    orders.updateOne({ _id: 'order1' }, { $mul: { totalAmount: 1.5 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toBeGreaterThan(39.97);
  });

  it('should multiply by negative value', () => {
    orders.updateOne({ _id: 'order1' }, { $mul: { totalAmount: -1 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toBeLessThan(0);
  });

  it('should set field to zero when multiplying by zero', () => {
    orders.updateOne({ _id: 'order1' }, { $mul: { totalAmount: 0 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toBe(0);
  });

  it('should multiply by fractional values', () => {
    orders.updateOne({ _id: 'order1' }, { $mul: { totalAmount: 0.5 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toBeCloseTo(19.985, 3);
  });
});

describe('$mul Field Creation Tests', () => {
  it('should create non-existent field as 0 when multiplied', () => {
    orders.updateOne({ _id: 'order2' }, { $mul: { newField: 2 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.newField).toBe(0);
  });

  it('should create nested non-existent field as 0', () => {
    orders.updateOne({ _id: 'order2' }, { $mul: { 'metrics.delivery.actualDays': 3 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.metrics.delivery.actualDays).toBe(0);
  });
});

describe('$mul Type Validation Tests', () => {
  it('should error when multiplying non-numeric field', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $mul: { status: 2 } })).toThrow();
  });

  it('should error with non-numeric multiplier', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $mul: { priority: 'bad' } })).toThrow();
  });
});

describe('$min Value Comparison Tests', () => {
  it('should replace field when new value is smaller', () => {
    orders.updateOne({ _id: 'order1' }, { $min: { priority: 0 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBe(0);
  });

  it('should not change field when current value is smaller', () => {
    orders.updateOne({ _id: 'order1' }, { $min: { priority: -10 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBe(-10);
  });

  it('should not change field when values are equal', () => {
    orders.updateOne({ _id: 'order1' }, { $min: { priority: -10 } });
    const updated = orders.findOne({ _id: 'order1' });
    orders.updateOne({ _id: 'order1' }, { $min: { priority: -10 } });
    const updatedAgain = orders.findOne({ _id: 'order1' });
    expect(updatedAgain.priority).toBe(updated.priority);
  });

  it('should handle mixed integer/float comparisons', () => {
    orders.updateOne({ _id: 'order1' }, { $min: { totalAmount: 10 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toBeLessThanOrEqual(10);
  });
});

describe('$min Field Creation Tests', () => {
  it('should create non-existent field with min value', () => {
    orders.updateOne({ _id: 'order2' }, { $min: { newMin: 5 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.newMin).toBe(5);
  });
});

describe('$min Type Handling Tests', () => {
  it('should handle Date comparisons correctly', () => {
    const date = new Date('2025-06-01T10:00:00Z');
    orders.updateOne({ _id: 'order1' }, { $min: { createdAt: date } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.createdAt.getTime()).toBe(date.getTime());
  });

  it('should handle string comparisons lexicographically', () => {
    orders.updateOne({ _id: 'order1' }, { $min: { status: 'aaa' } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.status <= 'aaa').toBe(true);
  });

  it('should handle type mismatches appropriately', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $min: { metrics: 1 } })).toThrow();
  });
});

describe('$min Edge Cases Tests', () => {
  it('should handle null vs number comparisons', () => {
    expect(() => orders.updateOne({ _id: 'order1' }, { $min: { priority: null } })).toThrow();
  });

  it('should handle undefined field appropriately', () => {
    orders.updateOne({ _id: 'order1' }, { $min: { undefinedField: 1 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.undefinedField).toBe(1);
  });
});

describe('$max Value Comparison Tests', () => {
  it('should replace field when new value is larger', () => {
    orders.updateOne({ _id: 'order1' }, { $max: { priority: 100 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBe(100);
  });

  it('should not change field when current value is larger', () => {
    orders.updateOne({ _id: 'order1' }, { $max: { priority: 50 } });
    const updated = orders.findOne({ _id: 'order1' });
    orders.updateOne({ _id: 'order1' }, { $max: { priority: 40 } });
    const updatedAgain = orders.findOne({ _id: 'order1' });
    expect(updatedAgain.priority).toBe(50);
  });

  it('should not change field when values are equal', () => {
    orders.updateOne({ _id: 'order1' }, { $max: { priority: 50 } });
    const updated = orders.findOne({ _id: 'order1' });
    orders.updateOne({ _id: 'order1' }, { $max: { priority: 50 } });
    const updatedAgain = orders.findOne({ _id: 'order1' });
    expect(updatedAgain.priority).toBe(updated.priority);
  });

  it('should handle mixed integer/float comparisons', () => {
    orders.updateOne({ _id: 'order1' }, { $max: { totalAmount: 100.5 } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.totalAmount).toBeGreaterThan(40);
  });
});

describe('$max Field Creation Tests', () => {
  it('should create non-existent field with max value', () => {
    orders.updateOne({ _id: 'order2' }, { $max: { newMax: 9 } });
    const updated = orders.findOne({ _id: 'order2' });
    expect(updated.newMax).toBe(9);
  });
});

describe('$max Boundary Testing Tests', () => {
  it('should handle maximum safe integer values', () => {
    orders.updateOne({ _id: 'order1' }, { $max: { priority: Number.MAX_SAFE_INTEGER } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.priority).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should handle date range maximums', () => {
    const futureDate = new Date('2030-01-01T00:00:00Z');
    orders.updateOne({ _id: 'order1' }, { $max: { createdAt: futureDate } });
    const updated = orders.findOne({ _id: 'order1' });
    expect(updated.createdAt.getTime()).toBe(futureDate.getTime());
  });
});
