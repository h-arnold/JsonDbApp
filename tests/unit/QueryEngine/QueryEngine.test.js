/**
 * QueryEngineTest.js - QueryEngine Class Tests
 * 
 * Comprehensive tests for the QueryEngine class including:
 * - Basic document matching against query patterns
 * - Field access utilities (including nested fields)
 * - Query validation
 * - Comparison operators ($eq, $gt, $lt)
 * - Logical operators ($and, $or)
 * - Implicit AND behaviour (multiple fields)
 * - Error handling for invalid queries
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import MockQueryData from '../../data/MockQueryData.js';

/**
 * Setup test environment with mock data
 */
function setupQueryEngineTestEnvironment() {
  MockQueryData.getAllTestDocuments();
  MockQueryData.getEdgeCaseDocuments();
}

/**
 * Cleanup test environment
 */
function cleanupQueryEngineTestEnvironment() {
  // Cleanup if needed
}

/**
 * QueryEngine Basic Functionality Tests (12 test cases)
 * Tests core document matching and field access functionality
 */
describe('QueryEngine Basic Functionality', () => {
  beforeAll(() => {
    setupQueryEngineTestEnvironment();
  });

  afterAll(() => {
    cleanupQueryEngineTestEnvironment();
  });

  it('should have QueryEngine class available', () => {
    expect(typeof QueryEngine).toBe('function');
  });

  it('should create QueryEngine instance', () => {
    const queryEngine = new QueryEngine();

    expect(queryEngine).not.toBeNull();
    expect(queryEngine instanceof QueryEngine).toBe(true);
  });

  it('should have executeQuery method', () => {
    const queryEngine = new QueryEngine();

    expect(typeof queryEngine.executeQuery).toBe('function');
  });

  it('should match all documents with empty query', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers().slice(0, 3);
    const query = {};

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(testDocs.length);
  });

  it('should match documents by simple field equality', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { name: "John Smith" };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("John Smith");
    expect(results[0]._id).toBe("user1");
  });

  it('should match documents by numeric field equality', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: 30 };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(results.length).toBe(1);
    expect(results[0].age).toBe(30);
  });

  it('should match documents by boolean field equality', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { active: true };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.active).toBe(true);
    });
  });

  it('should match documents by nested field access', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { "profile.department": "Engineering" };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.profile.department).toBe("Engineering");
    });
  });

  it('should match documents by deeply nested field access', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { "settings.notifications.email": true };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      if (doc.settings && doc.settings.notifications) {
        expect(doc.settings.notifications.email).toBe(true);
      }
    });
  });

  it('should return empty array for non-matching query', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { name: "Non Existent User" };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should handle null and undefined field values', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { lastLogin: null };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(Array.isArray(results)).toBe(true);
    results.forEach((doc) => {
      expect(doc.lastLogin).toBe(null);
    });
  });

  it('should handle documents with missing fields', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { orders: undefined };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results).not.toBeNull();
    expect(Array.isArray(results)).toBe(true);
    results.forEach((doc) => {
      expect(doc.orders === undefined).toBe(true);
    });
  });
});

/**
 * QueryEngine Comparison Operators Tests (9 test cases)
 * Tests $eq, $gt, $lt operators with various data types
 */
describe('QueryEngine Comparison Operators', () => {
  beforeAll(() => {
    setupQueryEngineTestEnvironment();
  });

  afterAll(() => {
    cleanupQueryEngineTestEnvironment();
  });

  it('should support explicit $eq operator with strings', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { name: { $eq: "John Smith" } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length).toBe(1);
    expect(results[0].name).toBe("John Smith");
  });

  it('should support explicit $eq operator with numbers', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: { $eq: 25 } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length).toBe(1);
    expect(results[0].age).toBe(25);
  });

  it('should support explicit $eq operator with booleans', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { active: { $eq: false } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.active).toBe(false);
    });
  });

  it('should support $gt operator with numbers', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: { $gt: 25 } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.age > 25).toBe(true);
    });
  });

  it('should support $lt operator with numbers', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: { $lt: 30 } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.age < 30).toBe(true);
    });
  });

  it('should support $gt operator with dates', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const cutoffDate = new Date("2021-01-01T00:00:00Z");
    const query = { registeredOn: { $gt: cutoffDate } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.registeredOn > cutoffDate).toBe(true);
    });
  });

  it('should support $lt operator with dates', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const cutoffDate = new Date("2021-01-01T00:00:00Z");
    const query = { registeredOn: { $lt: cutoffDate } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.registeredOn < cutoffDate).toBe(true);
    });
  });

  it('should support comparison operators with nested fields', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { "profile.yearsOfService": { $gt: 3 } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.profile.yearsOfService > 3).toBe(true);
    });
  });

  it('should handle comparison operators with non-matching values', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: { $gt: 100 } };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length).toBe(0);
  });
});

/**
 * QueryEngine Logical Operators Tests (8 test cases)
 * Tests $and, $or operators and implicit AND behaviour
 */
describe('QueryEngine Logical Operators', () => {
  beforeAll(() => {
    setupQueryEngineTestEnvironment();
  });

  afterAll(() => {
    cleanupQueryEngineTestEnvironment();
  });

  it('should support explicit $and operator', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      $and: [
        { active: true },
        { age: { $gt: 25 } }
      ]
    };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.active).toBe(true);
      expect(doc.age > 25).toBe(true);
    });
  });

  it('should support $or operator', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      $or: [
        { age: { $lt: 25 } },
        { age: { $gt: 35 } }
      ]
    };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.age < 25 || doc.age > 35).toBe(true);
    });
  });

  it('should support implicit AND with multiple fields', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      active: true,
      "profile.department": "Engineering"
    };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.active).toBe(true);
      expect(doc.profile.department).toBe("Engineering");
    });
  });

  it('should support nested logical operators', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      $and: [
        { active: true },
        { 
          $or: [
            { "profile.department": "Engineering" },
            { "profile.department": "Product" }
          ]
        }
      ]
    };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.active).toBe(true);
      expect(
        doc.profile.department === "Engineering" || doc.profile.department === "Product"
      ).toBe(true);
    });
  });

  it('should support $or with comparison operators', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      $or: [
        { age: { $lt: 25 } },
        { score: { $gt: 90 } }
      ]
    };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    results.forEach((doc) => {
      expect(doc.age < 25 || doc.score > 90).toBe(true);
    });
  });

  it('should handle empty $and conditions', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { $and: [] };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length).toBe(testDocs.length);
  });

  it('should handle empty $or conditions', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { $or: [] };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length).toBe(0);
  });

  it('should support complex multi-field implicit AND', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      active: true,
      age: { $gt: 25 },
      "profile.department": "Engineering",
      "settings.theme": "dark"
    };

    const results = queryEngine.executeQuery(testDocs, query);

    results.forEach((doc) => {
      expect(doc.active).toBe(true);
      expect(doc.age > 25).toBe(true);
      expect(doc.profile.department).toBe("Engineering");
      expect(doc.settings.theme).toBe("dark");
    });
  });
});

/**
 * QueryEngine Error Handling Tests (5 test cases)
 * Tests validation and error handling for invalid queries
 */
describe('QueryEngine Error Handling', () => {
  beforeAll(() => {
    setupQueryEngineTestEnvironment();
  });

  afterAll(() => {
    cleanupQueryEngineTestEnvironment();
  });

  it('should throw InvalidQueryError for invalid query structure', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const invalidQuery = "invalid query string";

    expect(() => {
      queryEngine.executeQuery(testDocs, invalidQuery);
    }).toThrow();
  });

  it('should throw InvalidQueryError for unsupported operators', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const queryWithUnsupportedOp = { age: { $regex: "pattern" } };

    expect(() => {
      queryEngine.executeQuery(testDocs, queryWithUnsupportedOp);
    }).toThrow();
  });

  it('should throw error for null or undefined documents array', () => {
    const queryEngine = new QueryEngine();
    const query = { name: "John" };

    expect(() => {
      queryEngine.executeQuery(null, query);
    }).toThrow();

    expect(() => {
      queryEngine.executeQuery(undefined, query);
    }).toThrow();
  });

  it('should handle malformed logical operators gracefully', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const malformedQuery = { $and: "not an array" };

    expect(() => {
      queryEngine.executeQuery(testDocs, malformedQuery);
    }).toThrow();
  });

  it('should provide clear error messages for query validation failures', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const invalidQuery = { $unknownOperator: { field: "value" } };

    let errorMessage = '';
    try {
      queryEngine.executeQuery(testDocs, invalidQuery);
    } catch (error) {
      errorMessage = error.message;
    }

    expect(errorMessage.length > 0).toBe(true);
    expect(
      errorMessage.includes('query') || errorMessage.includes('operator') || errorMessage.includes('invalid')
    ).toBe(true);
  });
});

/**
 * QueryEngine Edge Cases Tests (6 test cases)
 * Tests edge cases and boundary conditions
 */
describe('QueryEngine Edge Cases', () => {
  beforeAll(() => {
    setupQueryEngineTestEnvironment();
  });

  afterAll(() => {
    cleanupQueryEngineTestEnvironment();
  });

  it('should handle empty documents array', () => {
    const queryEngine = new QueryEngine();
    const emptyDocs = [];
    const query = { name: "John" };

    const results = queryEngine.executeQuery(emptyDocs, query);

    expect(results).not.toBeNull();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should handle documents with null values', () => {
    const queryEngine = new QueryEngine();
    const docsWithNulls = [
      { _id: "doc1", name: null, value: 42 },
      { _id: "doc2", name: "John", value: null },
      { _id: "doc3", name: "Jane", value: 24 }
    ];
    const query = { name: null };

    const results = queryEngine.executeQuery(docsWithNulls, query);

    expect(results.length).toBe(1);
    expect(results[0]._id).toBe("doc1");
  });

  it('should handle documents with deeply nested null values', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getEdgeCaseDocuments();
    const query = { "nestedEmpty.null": null };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length >= 0).toBe(true);
  });

  it('should handle very deeply nested field access', () => {
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getEdgeCaseDocuments();
    const query = { "deeplyNested.level1.level2.level3.level4.value": "deeply nested value" };

    const results = queryEngine.executeQuery(testDocs, query);

    expect(results.length > 0).toBe(true);
    expect(results[0].deeplyNested.level1.level2.level3.level4.value).toBe("deeply nested value");
  });

  it('should handle numeric field names and special characters', () => {
    const queryEngine = new QueryEngine();
    const docsWithSpecialFields = [
      { _id: "doc1", "123": "numeric field", "special@field": "value" },
      { _id: "doc2", "123": "another value", "special@field": "different" }
    ];
    const query = { "123": "numeric field" };

    const results = queryEngine.executeQuery(docsWithSpecialFields, query);

    expect(results.length).toBe(1);
    expect(results[0]._id).toBe("doc1");
  });

  it('should handle large number of documents efficiently', () => {
    const queryEngine = new QueryEngine();
    const largeDocs = [];
    for (let i = 0; i < 1000; i++) {
      largeDocs.push({
        _id: "doc" + i,
        index: i,
        group: i % 10,
        active: i % 3 === 0
      });
    }
    const query = { group: 5, active: true };

    const startTime = new Date().getTime();
    const results = queryEngine.executeQuery(largeDocs, query);
    const endTime = new Date().getTime();
    const executionTime = endTime - startTime;

    expect(results.length > 0).toBe(true);
    expect(executionTime < 1000).toBe(true);
    results.forEach((doc) => {
      expect(doc.group).toBe(5);
      expect(doc.active).toBe(true);
    });
  });
});
