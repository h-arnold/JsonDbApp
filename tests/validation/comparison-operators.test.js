import { describe, it, expect, beforeAll } from 'vitest';
import { createValidationDatabase } from './validation-setup.js';

let persons;

beforeAll(() => {
  ({ persons } = createValidationDatabase());
});

describe('$eq Equality Operator Tests', () => {
  it('should match string values exactly', () => {
    const results = persons.find({ 'name.first': { $eq: 'Anna' } });
    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe('person1');
  });

  it('should match numeric values exactly', () => {
    const results = persons.find({ age: { $eq: 29 } });
    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe('person1');
  });

  it('should match zero values correctly', () => {
    const results = persons.find({ age: { $eq: 0 } });
    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe('person2');
  });

  it('should match boolean values exactly', () => {
    const results = persons.find({ isActive: { $eq: true } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person1');
    expect(ids).toContain('person3');
  });

  it('should match null values correctly', () => {
    const results = persons.find({ lastLogin: { $eq: null } });
    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe('person2');
  });

  it('should match Date objects by exact timestamp', () => {
    const targetDate = new Date('2025-06-20T10:30:00Z');
    const results = persons.find({ lastLogin: { $eq: targetDate } });
    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe('person1');
  });

  it('should match nested objects exactly', () => {
    const results = persons.find({ name: { $eq: { first: 'Anna', last: 'Brown' } } });
    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe('person1');
  });

  it('should distinguish empty string from null', () => {
    const emptyResults = persons.find({ 'contact.email': { $eq: '' } });
    const nullResults = persons.find({ 'contact.email': { $eq: null } });
    expect(emptyResults).toHaveLength(1);
    expect(emptyResults[0]._id).toBe('person6');
    expect(nullResults).toHaveLength(1);
    expect(nullResults[0]._id).toBe('person3');
  });

  it('should distinguish zero from false', () => {
    const zeroResults = persons.find({ age: { $eq: 0 } });
    const falseResults = persons.find({ isActive: { $eq: false } });
    expect(zeroResults).toHaveLength(1);
    expect(zeroResults[0]._id).toBe('person2');
    const falseIds = falseResults.map(({ _id }) => _id);
    expect(falseIds).toContain('person2');
  });

  it('should be case sensitive for strings', () => {
    const lowerResults = persons.find({ 'name.first': { $eq: 'anna' } });
    const upperResults = persons.find({ 'name.first': { $eq: 'Anna' } });
    expect(lowerResults).toHaveLength(0);
    expect(upperResults).toHaveLength(1);
  });

  it('should match nested fields with dot notation', () => {
    const results = persons.find({ 'contact.email': { $eq: 'anna.brown@example.com' } });
    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe('person1');
  });

  it('should match deep nested fields', () => {
    const results = persons.find({ 'preferences.settings.notifications.email.enabled': { $eq: true } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person1');
    expect(ids).toContain('person3');
  });

  it('should handle non-existent nested paths', () => {
    const results = persons.find({ 'nonexistent.field': { $eq: 'value' } });
    expect(results).toHaveLength(0);
  });
});

describe('$gt Greater Than Operator Tests', () => {
  it('should compare integers correctly', () => {
    const results = persons.find({ age: { $gt: 40 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toEqual(expect.arrayContaining(['person3', 'person5', 'person6']));
  });

  it('should compare floats correctly', () => {
    const results = persons.find({ score: { $gt: 90.0 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toEqual(expect.arrayContaining(['person3', 'person5']));
  });

  it('should handle mixed integer and float comparison', () => {
    const results = persons.find({ score: { $gt: 80 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person1');
  });

  it('should handle negative numbers correctly', () => {
    const results = persons.find({ balance: { $gt: -200 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person3');
  });

  it('should handle zero boundary cases', () => {
    const results = persons.find({ balance: { $gt: 0 } });
    results.forEach((doc) => {
      expect(doc.balance).toBeGreaterThan(0);
    });
  });

  it('should compare Date objects chronologically', () => {
    const results = persons.find({ lastLogin: { $gt: new Date('2025-06-20T10:30:00Z') } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toEqual(expect.arrayContaining(['person4', 'person6']));
  });

  it('should compare strings lexicographically', () => {
    const results = persons.find({ 'name.first': { $gt: 'C' } });
    results.forEach(({ name }) => {
      expect(name.first > 'C').toBe(true);
    });
  });

  it('should handle case sensitivity in string comparison', () => {
    const results = persons.find({ 'name.first': { $gt: 'anna' } });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should not compare number with string', () => {
    const results = persons.find({ age: { $gt: '30' } });
    expect(results).toHaveLength(0);
  });

  it('should handle null values in comparison', () => {
    const results = persons.find({ lastLogin: { $gt: null } });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle missing fields in comparison', () => {
    const results = persons.find({ 'nonexistent.field': { $gt: 1 } });
    expect(results).toHaveLength(0);
  });
});

describe('$lt Less Than Operator Tests', () => {
  it('should compare integers correctly', () => {
    const results = persons.find({ age: { $lt: 30 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person1');
    expect(ids).toContain('person2');
  });

  it('should compare floats correctly', () => {
    const results = persons.find({ score: { $lt: 50 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person6');
  });

  it('should handle negative number boundaries', () => {
    const results = persons.find({ balance: { $lt: -100 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person3');
  });

  it('should handle zero boundary cases', () => {
    const results = persons.find({ balance: { $lt: 1 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person2');
  });

  it('should compare Date objects chronologically', () => {
    const results = persons.find({ lastLogin: { $lt: new Date('2025-06-20T10:30:00Z') } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person3');
  });

  it('should compare strings lexicographically', () => {
    const results = persons.find({ 'name.first': { $lt: 'C' } });
    results.forEach(({ name }) => {
      expect(name.first < 'C').toBe(true);
    });
  });

  it('should handle large number boundaries', () => {
    const results = persons.find({ balance: { $lt: 1000000 } });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle floating point precision', () => {
    const results = persons.find({ score: { $lt: 85.50001 } });
    const ids = results.map(({ _id }) => _id);
    expect(ids).toContain('person1');
  });

  it('should handle null in less than comparison', () => {
    const results = persons.find({ lastLogin: { $lt: null } });
    expect(results).toHaveLength(0);
  });

  it('should handle missing fields correctly', () => {
    const results = persons.find({ 'missing.field': { $lt: 1 } });
    expect(results).toHaveLength(0);
  });
});
