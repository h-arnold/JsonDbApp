import { describe, it, expect, beforeAll } from 'vitest';
import { createValidationDatabase } from './validation-setup.js';

let persons;

beforeAll(() => {
  ({ persons } = createValidationDatabase());
});

describe('$and Logical AND Operator Tests', () => {
  it('should match documents satisfying both field conditions', () => {
    const results = persons.find({ $and: [{ isActive: true }, { age: { $gt: 30 } }] });
    results.forEach(({ isActive, age }) => {
      expect(isActive).toBe(true);
      expect(age).toBeGreaterThan(30);
    });
  });

  it('should match documents satisfying multiple field conditions', () => {
    const results = persons.find({ $and: [{ age: { $gt: 30 } }, { balance: { $gt: 0 } }, { isActive: true }] });
    results.forEach(({ age, balance, isActive }) => {
      expect(age).toBeGreaterThan(30);
      expect(balance).toBeGreaterThan(0);
      expect(isActive).toBe(true);
    });
  });

  it('should work with mixed comparison operators', () => {
    const results = persons.find({ $and: [{ age: { $gt: 20 } }, { age: { $lt: 40 } }] });
    results.forEach(({ age }) => {
      expect(age).toBeGreaterThan(20);
      expect(age).toBeLessThan(40);
    });
  });

  it('should handle nested $and operations', () => {
    const results = persons.find({ $and: [{ $and: [{ isActive: true }, { age: { $gt: 30 } }] }, { score: { $gt: 80 } }] });
    results.forEach(({ isActive, age, score }) => {
      expect(isActive).toBe(true);
      expect(age).toBeGreaterThan(30);
      expect(score).toBeGreaterThan(80);
    });
  });

  it('should match all documents with empty $and array', () => {
    const results = persons.find({ $and: [] });
    expect(results.length).toBe(persons.find({}).length);
  });

  it('should handle single condition in $and', () => {
    const results = persons.find({ $and: [{ isActive: false }] });
    results.forEach(({ isActive }) => {
      expect(isActive).toBe(false);
    });
  });

  it('should return no results for contradictory conditions', () => {
    const results = persons.find({ $and: [{ isActive: true }, { isActive: false }] });
    expect(results).toHaveLength(0);
  });
});

describe('$or Logical OR Operator Tests', () => {
  it('should match documents satisfying either field condition', () => {
    const results = persons.find({ $or: [{ isActive: false }, { age: { $lt: 25 } }] });
    results.forEach(({ isActive, age }) => {
      expect(isActive === false || age < 25).toBe(true);
    });
  });

  it('should match documents satisfying any of multiple conditions', () => {
    const results = persons.find({ $or: [{ age: { $lt: 25 } }, { balance: { $gt: 5000 } }, { score: { $gt: 90 } }] });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should work with mixed comparison operators', () => {
    const results = persons.find({ $or: [{ age: { $lt: 25 } }, { age: { $gt: 60 } }] });
    results.forEach(({ age }) => {
      expect(age < 25 || age > 60).toBe(true);
    });
  });

  it('should handle nested $or operations', () => {
    const results = persons.find({ $or: [{ $or: [{ isActive: true }, { age: { $gt: 60 } }] }, { balance: { $lt: 0 } }] });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should match no documents with empty $or array', () => {
    const results = persons.find({ $or: [] });
    expect(results).toHaveLength(0);
  });

  it('should handle single condition in $or', () => {
    const results = persons.find({ $or: [{ isActive: true }] });
    results.forEach(({ isActive }) => {
      expect(isActive).toBe(true);
    });
  });

  it('should handle duplicate conditions in $or', () => {
    const results = persons.find({ $or: [{ isActive: true }, { isActive: true }] });
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Combined Logical Operations Tests', () => {
  it('should handle $and containing $or clauses', () => {
    const results = persons.find({ $and: [{ $or: [{ age: { $lt: 25 } }, { age: { $gt: 60 } }] }, { isActive: true }] });
    results.forEach(({ age, isActive }) => {
      expect(isActive).toBe(true);
      expect(age < 25 || age > 60).toBe(true);
    });
  });

  it('should handle $or containing $and clauses', () => {
    const results = persons.find({
      $or: [
        { $and: [{ isActive: true }, { balance: { $gt: 0 } }] },
        { $and: [{ isActive: false }, { score: { $gt: 90 } }] }
      ]
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle complex nested logical operations', () => {
    const results = persons.find({
      $and: [
        { $or: [{ isActive: true }, { age: { $lt: 30 } }] },
        { $or: [{ balance: { $gt: 0 } }, { score: { $gt: 90 } }] }
      ]
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle implicit AND with explicit $and', () => {
    const results = persons.find({
      isActive: true,
      $and: [{ age: { $gt: 20 } }]
    });
    results.forEach(({ isActive, age }) => {
      expect(isActive).toBe(true);
      expect(age).toBeGreaterThan(20);
    });
  });

  it('should handle implicit AND with explicit $or', () => {
    const results = persons.find({
      isActive: true,
      $or: [{ age: { $lt: 25 } }, { balance: { $gt: 1000 } }]
    });
    results.forEach(({ isActive }) => {
      expect(isActive).toBe(true);
    });
  });

  it('should handle multiple fields with multiple logical operators', () => {
    const results = persons.find({
      isActive: true,
      $and: [{ score: { $gt: 80 } }, { $or: [{ balance: { $gt: 1000 } }, { age: { $lt: 35 } }] }]
    });
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Logical Operator Error Handling Tests', () => {
  it('should throw error for invalid $and structure', () => {
    expect(() => persons.find({ $and: { bad: true } })).toThrow();
  });

  it('should throw error for invalid $or structure', () => {
    expect(() => persons.find({ $or: { bad: true } })).toThrow();
  });
});
