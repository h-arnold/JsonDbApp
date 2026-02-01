import { describe, it, expect, beforeEach } from 'vitest';
import '../../setup/gas-mocks.setup.js';

// Note: UpdateEngine is loaded globally via gas-mocks.setup.js
// using vm.runInThisContext(). Do not import as ES6 module.

describe('UpdateEngine Tests', () => {
  let engine;

  beforeEach(() => {
    engine = new UpdateEngine();
  });

  it('should update string field with $set', () => {
    const doc = { name: 'Alice' };
    const update = { $set: { name: 'Bob' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.name).toBe('Bob');
    expect(doc.name).toBe('Alice');
  });

  it('should create deep path with $set', () => {
    const doc = {};
    const update = { $set: { 'a.b.c': 5 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.a.b.c).toBe(5);
  });

  it('should increment with positive value', () => {
    const doc = { count: 1 };
    const update = { $inc: { count: 2 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.count).toBe(3);
  });

  it('should increment with negative value', () => {
    const doc = { count: 5 };
    const update = { $inc: { count: -2 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.count).toBe(3);
  });

  it('should multiply numeric value', () => {
    const doc = { count: 2 };
    const update = { $mul: { count: 3 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.count).toBe(6);
  });

  it('should set minimum numeric value', () => {
    const doc = { value: 10 };
    const update = { $min: { value: 5 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.value).toBe(5);
  });

  it('should set maximum numeric value', () => {
    const doc = { value: 10 };
    const update = { $max: { value: 15 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.value).toBe(15);
  });

  it('should unset simple field', () => {
    const doc = { a: 1, b: 2 };
    const update = { $unset: { a: '' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.a).toBeUndefined();
    expect(result.b).toBe(2);
  });

  it('should unset nested field', () => {
    const doc = { a: { b: 2, c: 3 } };
    const update = { $unset: { 'a.b': '' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.a.b).toBeUndefined();
    expect(result.a.c).toBe(3);
  });

  it('should push value into array', () => {
    const doc = { arr: [1, 2] };
    const update = { $push: { arr: 3 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.arr).toEqual([1, 2, 3]);
  });

  it('should pull all matching values from array', () => {
    const doc = { arr: [1, 2, 3, 2] };
    const update = { $pull: { arr: 2 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.arr).toEqual([1, 3]);
  });

  it('should not add duplicate to set with $addToSet', () => {
    const doc = { arr: [1, 2] };
    const update = { $addToSet: { arr: 2 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.arr).toEqual([1, 2]);
  });

  it('should throw for invalid operator', () => {
    const doc = { a: 1 };
    const update = { $foo: { a: 2 } };
    
    expect(() => engine.applyOperators(doc, update)).toThrow();
  });

  it('should set various data types', () => {
    const originalDoc = { a: 1 };
    const update = { $set: { str: 'text', num: 123, bool: true, arr: [1, 2], obj: { k: 'v' }, n: null } };
    const result = engine.applyOperators(originalDoc, update);

    expect(result.str).toBe('text');
    expect(result.num).toBe(123);
    expect(result.bool).toBe(true);
    expect(result.arr).toEqual([1, 2]);
    expect(result.obj.k).toBe('v');
    expect(result.n).toBeNull();
    expect(result.a).toBe(1);
    expect(originalDoc.a).toBe(1);
  });

  it('should create new top-level field with $set', () => {
    const doc = { existing: 'value' };
    const update = { $set: { newField: 'newValue' } };
    const result = engine.applyOperators(doc, update);

    expect(result.newField).toBe('newValue');
    expect(result.existing).toBe('value');
  });

  it('should throw when $inc target is non-numeric', () => {
    const doc = { val: 'text' };
    const update = { $inc: { val: 1 } };

    expect(() => engine.applyOperators(doc, update)).toThrow();
  });

  it('should throw when $mul target is non-numeric', () => {
    const doc = { val: 'text' };
    const update = { $mul: { val: 2 } };

    expect(() => engine.applyOperators(doc, update)).toThrow();
  });

  it('should throw $min on non-comparable values', () => {
    expect(() => {
      const doc1 = { val: 'text' };
      const update1 = { $min: { val: 1 } };
      engine.applyOperators(doc1, update1);
    }).toThrow();

    expect(() => {
      const doc2 = { val: { a: 1 } };
      const update2 = { $min: { val: 10 } };
      engine.applyOperators(doc2, update2);
    }).toThrow();
  });

  it('should throw $max on non-comparable values', () => {
    expect(() => {
      const doc1 = { val: 'text' };
      const update1 = { $max: { val: 1 } };
      engine.applyOperators(doc1, update1);
    }).toThrow();

    expect(() => {
      const doc2 = { val: { a: 1 } };
      const update2 = { $max: { val: 10 } };
      engine.applyOperators(doc2, update2);
    }).toThrow();
  });

  it('should apply multiple operators in single update', () => {
    const doc = { a: 1, b: 10, d: 'original' };
    const update = { $set: { c: 3, d: 'changed' }, $inc: { a: 1 }, $mul: { b: 2 } };
    const result = engine.applyOperators(doc, update);

    expect(result.a).toBe(2);
    expect(result.b).toBe(20);
    expect(result.c).toBe(3);
    expect(result.d).toBe('changed');
  });

  it('should allow $set to change field type', () => {
    const doc = { field: 123 };
    const update = { $set: { field: 'new string value' } };
    const result = engine.applyOperators(doc, update);

    expect(result.field).toBe('new string value');
    expect(typeof result.field).toBe('string');
  });

  it('should preserve numeric type with numeric operators', () => {
    const doc = { num1: 1.5, num2: 5 };
    const update = { $inc: { num1: 1, num2: 2.5 } };
    const result = engine.applyOperators(doc, update);

    expect(result.num1).toBe(2.5);
    expect(typeof result.num1).toBe('number');
    expect(result.num2).toBe(7.5);
    expect(typeof result.num2).toBe('number');
  });

  it('should handle null and undefined with $set', () => {
    const doc = { a: 1, b: 2 };
    const update = { $set: { a: null, c: undefined } };
    const result = engine.applyOperators(doc, update);

    expect(result.a).toBeNull();
    expect(result.b).toBe(2);
    expect(Object.prototype.hasOwnProperty.call(result, 'c')).toBe(true);
    expect(result.c).toBeUndefined();
  });

  it('should handle extreme values with $inc', () => {
    const doc1 = { val: Number.MAX_SAFE_INTEGER };
    const update1 = { $inc: { val: 1 } };
    const result1 = engine.applyOperators(doc1, update1);
    expect(result1.val).toBe(Number.MAX_SAFE_INTEGER + 1);

    const doc2 = { val: Number.MAX_VALUE };
    const update2 = { $inc: { val: Number.MAX_VALUE } };
    const result2 = engine.applyOperators(doc2, update2);
    expect(result2.val).toBe(Infinity);

    const doc3 = { val: -Number.MAX_SAFE_INTEGER };
    const update3 = { $inc: { val: -1 } };
    const result3 = engine.applyOperators(doc3, update3);
    expect(result3.val).toBe(-Number.MAX_SAFE_INTEGER - 1);
  });

  it('should not change value with $min when equal', () => {
    const doc = { val: 5 };
    const update = { $min: { val: 5 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.val).toBe(5);
  });

  it('should not change value with $max when equal', () => {
    const doc = { val: 10 };
    const update = { $max: { val: 10 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.val).toBe(10);
  });

  it('should throw for empty update object', () => {
    const doc = { a: 1 };
    const update = {};
    
    expect(() => engine.applyOperators(doc, update)).toThrow();
  });

  it('should throw for update with no dollar operators', () => {
    const doc = { a: 1 };
    const update = { a: 2, b: 3 };
    
    expect(() => engine.applyOperators(doc, update)).toThrow();
  });

  it('should unset simple field completely', () => {
    const doc = { name: 'Alice', age: 30, city: 'London' };
    const update = { $unset: { age: '' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.name).toBe('Alice');
    expect(result.city).toBe('London');
    expect(result.age).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result, 'age')).toBe(false);
    expect(doc.age).toBe(30);
  });

  it('should unset deeply nested field', () => {
    const doc = { 
      user: { 
        profile: { name: 'Bob', email: 'bob@example.com' },
        settings: { theme: 'dark' }
      },
      status: 'active'
    };
    const update = { $unset: { 'user.profile.email': '' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.user.profile.name).toBe('Bob');
    expect(result.user.settings.theme).toBe('dark');
    expect(result.status).toBe('active');
    expect(result.user.profile.email).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result.user.profile, 'email')).toBe(false);
  });

  it('should not error when unsetting non-existent field', () => {
    const doc = { a: 1, b: 2 };
    const update = { $unset: { nonExistent: '', 'nested.field': '' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
    expect(result.nonExistent).toBeUndefined();
    expect(result.nested).toBeUndefined();
  });

  it('should unset array element by index', () => {
    const doc = { items: ['apple', 'banana', 'cherry'], count: 3 };
    const update = { $unset: { 'items.1': '' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.items[0]).toBe('apple');
    expect(result.items[1]).toBeUndefined();
    expect(result.items[2]).toBe('cherry');
    expect(result.items.length).toBe(3);
    expect(result.count).toBe(3);
  });

  it('should push single value to array', () => {
    const doc = { tags: ['javascript', 'mongodb'] };
    const update = { $push: { tags: 'database' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.tags).toEqual(['javascript', 'mongodb', 'database']);
    expect(doc.tags).toEqual(['javascript', 'mongodb']);
  });

  it('should push multiple values with $each', () => {
    const doc = { scores: [10, 20] };
    const update = { $push: { scores: { $each: [30, 40, 50] } } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.scores).toEqual([10, 20, 30, 40, 50]);
    expect(doc.scores).toEqual([10, 20]);
  });

  it('should pull by value equality', () => {
    const doc = { numbers: [1, 2, 3, 2, 4, 2] };
    const update = { $pull: { numbers: 2 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.numbers).toEqual([1, 3, 4]);
    expect(doc.numbers).toEqual([1, 2, 3, 2, 4, 2]);
  });

  it('should add unique value with $addToSet', () => {
    const doc = { categories: ['tech', 'news'] };
    const update = { $addToSet: { categories: 'sports' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.categories).toEqual(['tech', 'news', 'sports']);
    expect(doc.categories).toEqual(['tech', 'news']);
  });

  it('should add multiple unique values with $addToSet and $each', () => {
    const doc = { tags: ['red', 'blue'] };
    const update = { $addToSet: { tags: { $each: ['green', 'yellow', 'purple'] } } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.tags).toEqual(['red', 'blue', 'green', 'yellow', 'purple']);
    expect(doc.tags).toEqual(['red', 'blue']);
  });

  it('should ignore duplicates with $addToSet', () => {
    const doc = { items: ['apple', 'banana', 'cherry'] };
    const update1 = { $addToSet: { items: 'banana' } };
    const result1 = engine.applyOperators(doc, update1);
    
    expect(result1.items).toEqual(['apple', 'banana', 'cherry']);
    
    const update2 = { $addToSet: { items: { $each: ['apple', 'date', 'banana', 'elderberry'] } } };
    const result2 = engine.applyOperators(doc, update2);
    
    expect(result2.items).toEqual(['apple', 'banana', 'cherry', 'date', 'elderberry']);
  });

  it('should push nested array as single element', () => {
    const doc = { matrix: [[1, 2], [3, 4]] };
    const update = { $push: { matrix: [5, 6] } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.matrix.length).toBe(3);
    expect(result.matrix[0]).toEqual([1, 2]);
    expect(result.matrix[1]).toEqual([3, 4]);
    expect(result.matrix[2]).toEqual([5, 6]);
  });

  it('should pull matching nested objects', () => {
    const doc = { 
      coordinates: [
        { x: 1, y: 2 }, 
        { x: 3, y: 4 }, 
        { x: 1, y: 2 }, 
        { x: 5, y: 6 }
      ] 
    };
    const update = { $pull: { coordinates: { x: 1, y: 2 } } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.coordinates.length).toBe(2);
    expect(result.coordinates[0].x).toBe(3);
    expect(result.coordinates[0].y).toBe(4);
    expect(result.coordinates[1].x).toBe(5);
    expect(result.coordinates[1].y).toBe(6);
  });

  it('should set specific array position', () => {
    const doc = { items: ['first', 'second', 'third'] };
    const update = { $set: { 'items.1': 'modified' } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.items[0]).toBe('first');
    expect(result.items[1]).toBe('modified');
    expect(result.items[2]).toBe('third');
    expect(result.items.length).toBe(3);
  });

  it('should throw when $push on non-array field', () => {
    const doc = { field: 'not an array' };
    const update = { $push: { field: 'value' } };
    
    expect(() => engine.applyOperators(doc, update)).toThrow();
  });

  it('should handle $pull on non-array field as no-op', () => {
    const doc = { field: 42 };
    const update = { $pull: { field: 42 } };
    const result = engine.applyOperators(doc, update);
    
    expect(result.field).toBe(42);
    expect(doc.field).toBe(42);
  });

  it('should throw when $addToSet on non-array field', () => {
    const doc = { field: { key: 'value' } };
    const update = { $addToSet: { field: 'new value' } };
    
    expect(() => engine.applyOperators(doc, update)).toThrow();
  });
});
