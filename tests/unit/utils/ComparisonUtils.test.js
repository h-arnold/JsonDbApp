/**
 * ComparisonUtils.test.js - Vitest tests for ComparisonUtils
 */

describe('ComparisonUtils equals', () => {
  it('should handle primitives and strict equality', () => {
    expect(ComparisonUtils.equals(5, 5)).toBe(true);
    expect(ComparisonUtils.equals(5, '5')).toBe(false);
    expect(ComparisonUtils.equals(null, null)).toBe(true);
    expect(ComparisonUtils.equals(undefined, undefined)).toBe(true);
    expect(ComparisonUtils.equals(null, undefined)).toBe(false);
  });

  it('should handle dates', () => {
    const d1 = new Date('2024-01-01T00:00:00.000Z');
    const d2 = new Date('2024-01-01T00:00:00.000Z');
    const d3 = new Date('2024-01-02T00:00:00.000Z');
    expect(ComparisonUtils.equals(d1, d2)).toBe(true);
    expect(ComparisonUtils.equals(d1, d3)).toBe(false);
  });

  it('should handle deep objects and arrays', () => {
    const objA = { a: 1, b: { c: 2 }, arr: [1, 2, 3] };
    const objB = { a: 1, b: { c: 2 }, arr: [1, 2, 3] };
    const objC = { a: 1, b: { c: 2 }, arr: [1, 2, 4] };
    expect(ComparisonUtils.equals(objA, objB)).toBe(true);
    expect(ComparisonUtils.equals(objA, objC)).toBe(false);
  });

  it('should handle array contains scalar toggle', () => {
    const arr = [1, 2, 3];
    expect(ComparisonUtils.equals(arr, 2)).toBe(false);
    expect(ComparisonUtils.equals(arr, 2, { arrayContainsScalar: true })).toBe(true);
    expect(ComparisonUtils.equals([1, '2', 3], 2, { arrayContainsScalar: true })).toBe(false);
  });
});

describe('ComparisonUtils compareOrdering', () => {
  it('should compare numbers', () => {
    expect(ComparisonUtils.compareOrdering(5, 3)).toBeGreaterThan(0);
    expect(ComparisonUtils.compareOrdering(3, 5)).toBeLessThan(0);
    expect(ComparisonUtils.compareOrdering(4, 4)).toBe(0);
  });

  it('should compare strings', () => {
    expect(ComparisonUtils.compareOrdering('b', 'a')).toBeGreaterThan(0);
    expect(ComparisonUtils.compareOrdering('a', 'b')).toBeLessThan(0);
    expect(ComparisonUtils.compareOrdering('abc', 'abc')).toBe(0);
  });

  it('should compare dates', () => {
    const d1 = new Date('2024-01-01T00:00:00.000Z');
    const d2 = new Date('2024-01-02T00:00:00.000Z');
    expect(ComparisonUtils.compareOrdering(d2, d1)).toBeGreaterThan(0);
    expect(ComparisonUtils.compareOrdering(d1, d2)).toBeLessThan(0);
    expect(ComparisonUtils.compareOrdering(d1, new Date(d1.getTime()))).toBe(0);
  });

  it('should handle non-comparable types', () => {
    expect(ComparisonUtils.compareOrdering({}, {})).toBe(0);
    expect(ComparisonUtils.compareOrdering(5, '5')).toBe(0);
  });
});

describe('ComparisonUtils applyOperators', () => {
  it('should apply single operators', () => {
    expect(ComparisonUtils.applyOperators(5, { $gt: 3 })).toBe(true);
    expect(ComparisonUtils.applyOperators(5, { $eq: 5 })).toBe(true);
    expect(ComparisonUtils.applyOperators(5, { $lt: 10 })).toBe(true);
    expect(ComparisonUtils.applyOperators(5, { $gt: 5 })).toBe(false);
  });

  it('should apply multiple operators', () => {
    expect(ComparisonUtils.applyOperators(5, { $gt: 1, $lt: 10 })).toBe(true);
    expect(ComparisonUtils.applyOperators(5, { $gt: 1, $lt: 4 })).toBe(false);
  });

  it('should throw for unsupported operators', () => {
    expect(() => ComparisonUtils.applyOperators(5, { $ne: 3 })).toThrow(InvalidQueryError);
  });
});

describe('ComparisonUtils isOperatorObject', () => {
  it('should identify operator objects', () => {
    expect(ComparisonUtils.isOperatorObject({ $gt: 5 })).toBe(true);
    expect(ComparisonUtils.isOperatorObject({ $gt: 5, normal: 1 })).toBe(false);
    expect(ComparisonUtils.isOperatorObject({})).toBe(false);
    expect(ComparisonUtils.isOperatorObject(null)).toBe(false);
  });
});

describe('ComparisonUtils subsetMatch', () => {
  it('should match plain fields', () => {
    const candidate = { a: 1, b: 2, extra: true };
    expect(ComparisonUtils.subsetMatch(candidate, { a: 1, b: 2 })).toBe(true);
    expect(ComparisonUtils.subsetMatch(candidate, { a: 1, c: 3 })).toBe(false);
  });

  it('should match with operators', () => {
    const candidate = { a: 5, b: 10 };
    expect(ComparisonUtils.subsetMatch(candidate, { a: { $gt: 3 }, b: { $lt: 20 } })).toBe(true);
    expect(ComparisonUtils.subsetMatch(candidate, { a: { $gt: 5 } })).toBe(false);
  });

  it('should match mixed fields and operators', () => {
    const candidate = { sku: 'prod2', price: 24, stock: 50 };
    expect(ComparisonUtils.subsetMatch(candidate, { sku: 'prod2', price: { $lt: 25 } })).toBe(true);
    expect(ComparisonUtils.subsetMatch(candidate, { sku: 'prod2', price: { $lt: 10 } })).toBe(
      false
    );
  });

  it('should handle operator object directly', () => {
    expect(ComparisonUtils.subsetMatch(5, { $gt: 3 })).toBe(true);
    expect(ComparisonUtils.subsetMatch({ a: 1 }, { $gt: 0 })).toBe(false);
  });
});
