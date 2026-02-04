/**
 * DocumentOperations Query Enhancement Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupTestEnvironment,
  resetCollection
} from '../../helpers/document-operations-test-helpers.js';
import MockQueryData from '../../data/MockQueryData.js';

describe('DocumentOperations Query Enhancement', () => {
  let env, docOps;

  beforeEach(() => {
    env = setupTestEnvironment();
    resetCollection(env.collection);
    docOps = new DocumentOperations(env.collection);
  });

  /**
   * Inserts standard user documents into the collection for query tests
   * @returns {Array<object>} Users inserted into the collection
   */
  const seedTestUsers = () => {
    const users = MockQueryData.getTestUsers();
    users.forEach((user) => docOps.insertDocument(user));
    return users;
  };

  it('should find document by field-based query with exact match', () => {
    const [johnUser] = seedTestUsers();

    const result = docOps.findByQuery({ name: 'John Smith' });

    expect(result).toBeDefined();
    expect(result._id).toBe(johnUser._id);
    expect(result.name).toBe(johnUser.name);
    expect(result.email).toBe(johnUser.email);
  });

  it('should find document by comparison operator query', () => {
    seedTestUsers();

    const result = docOps.findByQuery({ age: { $gt: 25 } });

    expect(result).toBeDefined();
    expect(result.age).toBeGreaterThan(25);
  });

  it('should find document by logical AND query', () => {
    seedTestUsers();

    const result = docOps.findByQuery({
      $and: [{ active: true }, { age: { $gt: 25 } }]
    });

    expect(result).toBeDefined();
    expect(result.active).toBe(true);
    expect(result.age).toBeGreaterThan(25);
  });

  it('should find document by logical OR query', () => {
    seedTestUsers();

    const result = docOps.findByQuery({
      $or: [{ name: 'John Smith' }, { age: { $gt: 35 } }]
    });

    expect(result).toBeDefined();
    const matchesName = result.name === 'John Smith';
    const matchesAge = result.age > 35;
    expect(matchesName || matchesAge).toBe(true);
  });

  it('should find document by nested field query', () => {
    seedTestUsers();

    const result = docOps.findByQuery({ 'profile.yearsOfService': 5 });

    expect(result).toBeDefined();
    expect(result.profile.yearsOfService).toBe(5);
  });

  it('should find multiple documents by query', () => {
    seedTestUsers();

    const results = docOps.findMultipleByQuery({ active: true });

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(2);
    results.forEach((user) => {
      expect(user.active).toBe(true);
    });
  });

  it('should count documents by query accurately', () => {
    seedTestUsers();

    const activeCount = docOps.countByQuery({ active: true });
    const totalCount = docOps.countByQuery({});
    const inactiveCount = docOps.countByQuery({ active: false });

    expect(typeof activeCount).toBe('number');
    expect(typeof totalCount).toBe('number');
    expect(typeof inactiveCount).toBe('number');
    expect(totalCount).toBe(activeCount + inactiveCount);
    expect(activeCount).toBeGreaterThanOrEqual(2);
  });

  it('should handle QueryEngine integration errors properly', () => {
    expect(() => {
      docOps.findByQuery({ age: { $invalidOperator: 25 } });
    }).toThrow(InvalidQueryError);

    expect(() => {
      docOps.findByQuery(null);
    }).toThrow(InvalidArgumentError);

    expect(() => {
      docOps.countByQuery('invalid query');
    }).toThrow(InvalidArgumentError);
  });

  it('should handle empty results for non-matching queries', () => {
    seedTestUsers();

    const singleResult = docOps.findByQuery({ name: 'NonExistent User' });
    const multipleResults = docOps.findMultipleByQuery({ age: { $gt: 100 } });
    const countResult = docOps.countByQuery({ active: 'maybe' });

    expect(singleResult).toBeNull();
    expect(Array.isArray(multipleResults)).toBe(true);
    expect(multipleResults.length).toBe(0);
    expect(countResult).toBe(0);
  });

  it('should handle large result sets efficiently', () => {
    const largeDataset = MockQueryData.getLargeDataset(100);
    largeDataset.forEach((doc) => docOps.insertDocument(doc));
    const startTime = new Date().getTime();

    const results = docOps.findMultipleByQuery({ category: 'test' });
    const count = docOps.countByQuery({ category: 'test' });
    const endTime = new Date().getTime();
    const duration = endTime - startTime;

    expect(Array.isArray(results)).toBe(true);
    expect(typeof count).toBe('number');
    expect(duration).toBeLessThan(1000);
    expect(results.length).toBe(count);
  });

  it('should maintain backwards compatibility with existing ID-based methods', () => {
    const testDoc = { name: 'Compatibility Test', value: 42 };
    const inserted = docOps.insertDocument(testDoc);

    const foundById = docOps.findDocumentById(inserted._id);
    expect(foundById).toBeDefined();
    expect(foundById._id).toBe(inserted._id);

    const allDocs = docOps.findAllDocuments();
    expect(Array.isArray(allDocs)).toBe(true);
    expect(allDocs.length).toBeGreaterThanOrEqual(1);

    const exists = docOps.documentExists(inserted._id);
    expect(exists).toBe(true);

    const count = docOps.countDocuments();
    expect(typeof count).toBe('number');
  });

  it('should validate queries and propagate errors properly', () => {
    expect(() => {
      docOps.findByQuery(undefined);
    }).toThrow(InvalidArgumentError);

    expect(() => {
      docOps.findMultipleByQuery([]);
    }).toThrow(InvalidArgumentError);

    expect(() => {
      docOps.countByQuery({ $invalidOperator: [] });
    }).toThrow(InvalidQueryError);

    expect(() => {
      docOps.findByQuery({ $and: 'not an array' });
    }).toThrow(InvalidQueryError);
  });
});
