/**
 * QueryEngineTest.js - QueryEngine Class Tests (Section 6 - Red Phase)
 * 
 * Comprehensive tests for the QueryEngine class including:
 * - Basic document matching against query patterns
 * - Field access utilities (including nested fields)
 * - Query validation
 * - Comparison operators ($eq, $gt, $lt)
 * - Logical operators ($and, $or)
 * - Implicit AND behaviour (multiple fields)
 * - Error handling for invalid queries
 * 
 * Following TDD Red-Green-Refactor cycle for Section 6 implementation
 * Tests use MockQueryData for comprehensive document scenarios
 */

// Global test data storage for QueryEngine tests
const QUERY_ENGINE_TEST_DATA = {
  testDocuments: [],
  edgeCaseDocuments: [],
  testQueryEngine: null,
  testStartTime: null
};

/**
 * Setup test environment with mock data
 */
function setupQueryEngineTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('QueryEngine-Setup');
  
  try {
    QUERY_ENGINE_TEST_DATA.testStartTime = new Date();
    QUERY_ENGINE_TEST_DATA.testDocuments = MockQueryData.getAllTestDocuments();
    QUERY_ENGINE_TEST_DATA.edgeCaseDocuments = MockQueryData.getEdgeCaseDocuments();
    
    logger.info('QueryEngine test environment ready', { 
      documentCount: QUERY_ENGINE_TEST_DATA.testDocuments.length,
      edgeCaseCount: QUERY_ENGINE_TEST_DATA.edgeCaseDocuments.length
    });
    
  } catch (error) {
    logger.error('Failed to setup QueryEngine test environment', { error: error.message });
    throw error;
  }
}

/**
 * Cleanup test environment
 */
function cleanupQueryEngineTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('QueryEngine-Cleanup');
  
  QUERY_ENGINE_TEST_DATA.testDocuments = [];
  QUERY_ENGINE_TEST_DATA.edgeCaseDocuments = [];
  QUERY_ENGINE_TEST_DATA.testQueryEngine = null;
  
  logger.info('QueryEngine test cleanup completed');
}

/**
 * QueryEngine Basic Functionality Tests (12 test cases)
 * Tests core document matching and field access functionality
 */
function createQueryEngineBasicTestSuite() {
  const suite = new TestSuite('QueryEngine Basic Functionality');
  
  // Setup test environment before all tests
  suite.setBeforeAll(function() {
    setupQueryEngineTestEnvironment();
  });
  
  // Clean up after all tests
  suite.setAfterAll(function() {
    cleanupQueryEngineTestEnvironment();
  });
  
  suite.addTest('should have QueryEngine class available', function() {
    // Act & Assert
    TestFramework.assertEquals('function', typeof QueryEngine, 'QueryEngine should be a constructor function');
  });
  
  suite.addTest('should create QueryEngine instance', function() {
    // Act
    const queryEngine = new QueryEngine();
    
    // Assert
    TestFramework.assertNotNull(queryEngine, 'QueryEngine instance should be created');
    TestFramework.assertTrue(queryEngine instanceof QueryEngine, 'Should be instance of QueryEngine');
  });
  
  suite.addTest('should have executeQuery method', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    
    // Act & Assert
    TestFramework.assertEquals('function', typeof queryEngine.executeQuery, 'Should have executeQuery method');
  });
  
  suite.addTest('should match all documents with empty query', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers().slice(0, 3); // First 3 users
    const query = {};
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(Array.isArray(results), 'Results should be an array');
    TestFramework.assertEquals(testDocs.length, results.length, 'Should return all documents for empty query');
  });
  
  suite.addTest('should match documents by simple field equality', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { name: "John Smith" };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(Array.isArray(results), 'Results should be an array');
    TestFramework.assertEquals(1, results.length, 'Should return exactly one matching document');
    TestFramework.assertEquals("John Smith", results[0].name, 'Returned document should have correct name');
    TestFramework.assertEquals("user1", results[0]._id, 'Should return the correct user');
  });
  
  suite.addTest('should match documents by numeric field equality', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: 30 };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertEquals(1, results.length, 'Should return one document with age 30');
    TestFramework.assertEquals(30, results[0].age, 'Returned document should have age 30');
  });
  
  suite.addTest('should match documents by boolean field equality', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { active: true };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(results.length > 0, 'Should return active users');
    results.forEach(function(doc) {
      TestFramework.assertEquals(true, doc.active, 'All returned documents should be active');
    });
  });
  
  suite.addTest('should match documents by nested field access', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { "profile.department": "Engineering" };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(results.length > 0, 'Should return users in Engineering department');
    results.forEach(function(doc) {
      TestFramework.assertEquals("Engineering", doc.profile.department, 'All returned documents should be in Engineering');
    });
  });
  
  suite.addTest('should match documents by deeply nested field access', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { "settings.notifications.email": true };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(results.length > 0, 'Should return users with email notifications enabled');
    results.forEach(function(doc) {
      if (doc.settings && doc.settings.notifications) {
        TestFramework.assertEquals(true, doc.settings.notifications.email, 'All returned documents should have email notifications enabled');
      }
    });
  });
  
  suite.addTest('should return empty array for non-matching query', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { name: "Non Existent User" };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(Array.isArray(results), 'Results should be an array');
    TestFramework.assertEquals(0, results.length, 'Should return empty array for non-matching query');
  });
  
  suite.addTest('should handle null and undefined field values', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { lastLogin: null };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(Array.isArray(results), 'Results should be an array');
    results.forEach(function(doc) {
      TestFramework.assertEquals(null, doc.lastLogin, 'All returned documents should have null lastLogin');
    });
  });
  
  suite.addTest('should handle documents with missing fields', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { orders: undefined };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(Array.isArray(results), 'Results should be an array');
    // Should match documents where the 'orders' field is undefined/missing
    results.forEach(function(doc) {
      TestFramework.assertTrue(doc.orders === undefined, 'All returned documents should have undefined orders field');
    });
  });
  
  return suite;
}

/**
 * QueryEngine Comparison Operators Tests (9 test cases)
 * Tests $eq, $gt, $lt operators with various data types
 */
function createQueryEngineComparisonTestSuite() {
  const suite = new TestSuite('QueryEngine Comparison Operators');
  
  suite.setBeforeAll(function() {
    setupQueryEngineTestEnvironment();
  });
  
  suite.setAfterAll(function() {
    cleanupQueryEngineTestEnvironment();
  });
  
  suite.addTest('should support explicit $eq operator with strings', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { name: { $eq: "John Smith" } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertEquals(1, results.length, 'Should return one matching document');
    TestFramework.assertEquals("John Smith", results[0].name, 'Should match correct document');
  });
  
  suite.addTest('should support explicit $eq operator with numbers', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: { $eq: 25 } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertEquals(1, results.length, 'Should return one matching document');
    TestFramework.assertEquals(25, results[0].age, 'Should match correct age');
  });
  
  suite.addTest('should support explicit $eq operator with booleans', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { active: { $eq: false } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return inactive users');
    results.forEach(function(doc) {
      TestFramework.assertEquals(false, doc.active, 'All returned documents should be inactive');
    });
  });
  
  suite.addTest('should support $gt operator with numbers', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: { $gt: 25 } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return users older than 25');
    results.forEach(function(doc) {
      TestFramework.assertTrue(doc.age > 25, 'All returned documents should have age > 25, got: ' + doc.age);
    });
  });
  
  suite.addTest('should support $lt operator with numbers', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: { $lt: 30 } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return users younger than 30');
    results.forEach(function(doc) {
      TestFramework.assertTrue(doc.age < 30, 'All returned documents should have age < 30, got: ' + doc.age);
    });
  });
  
  suite.addTest('should support $gt operator with dates', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const cutoffDate = new Date("2021-01-01T00:00:00Z");
    const query = { registeredOn: { $gt: cutoffDate } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return users registered after cutoff date');
    results.forEach(function(doc) {
      TestFramework.assertTrue(doc.registeredOn > cutoffDate, 'All returned documents should be registered after cutoff');
    });
  });
  
  suite.addTest('should support $lt operator with dates', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const cutoffDate = new Date("2021-01-01T00:00:00Z");
    const query = { registeredOn: { $lt: cutoffDate } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return users registered before cutoff date');
    results.forEach(function(doc) {
      TestFramework.assertTrue(doc.registeredOn < cutoffDate, 'All returned documents should be registered before cutoff');
    });
  });
  
  suite.addTest('should support comparison operators with nested fields', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { "profile.yearsOfService": { $gt: 3 } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return users with more than 3 years of service');
    results.forEach(function(doc) {
      TestFramework.assertTrue(doc.profile.yearsOfService > 3, 'All returned documents should have > 3 years of service');
    });
  });
  
  suite.addTest('should handle comparison operators with non-matching values', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { age: { $gt: 100 } };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertEquals(0, results.length, 'Should return no results for impossible age condition');
  });
  
  return suite;
}

/**
 * QueryEngine Logical Operators Tests (8 test cases)
 * Tests $and, $or operators and implicit AND behaviour
 */
function createQueryEngineLogicalTestSuite() {
  const suite = new TestSuite('QueryEngine Logical Operators');
  
  suite.setBeforeAll(function() {
    setupQueryEngineTestEnvironment();
  });
  
  suite.setAfterAll(function() {
    cleanupQueryEngineTestEnvironment();
  });
  
  suite.addTest('should support explicit $and operator', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      $and: [
        { active: true },
        { age: { $gt: 25 } }
      ]
    };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return users that are active AND older than 25');
    results.forEach(function(doc) {
      TestFramework.assertEquals(true, doc.active, 'All returned documents should be active');
      TestFramework.assertTrue(doc.age > 25, 'All returned documents should have age > 25');
    });
  });
  
  suite.addTest('should support $or operator', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      $or: [
        { age: { $lt: 25 } },
        { age: { $gt: 35 } }
      ]
    };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return users younger than 25 OR older than 35');
    results.forEach(function(doc) {
      TestFramework.assertTrue(doc.age < 25 || doc.age > 35, 'All returned documents should be < 25 OR > 35 years old');
    });
  });
  
  suite.addTest('should support implicit AND with multiple fields', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      active: true,
      "profile.department": "Engineering"
    };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return active users in Engineering');
    results.forEach(function(doc) {
      TestFramework.assertEquals(true, doc.active, 'All returned documents should be active');
      TestFramework.assertEquals("Engineering", doc.profile.department, 'All returned documents should be in Engineering');
    });
  });
  
  suite.addTest('should support nested logical operators', function() {
    // Arrange
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
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return active users in Engineering OR Product');
    results.forEach(function(doc) {
      TestFramework.assertEquals(true, doc.active, 'All returned documents should be active');
      TestFramework.assertTrue(
        doc.profile.department === "Engineering" || doc.profile.department === "Product",
        'All returned documents should be in Engineering or Product'
      );
    });
  });
  
  suite.addTest('should support $or with comparison operators', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      $or: [
        { age: { $lt: 25 } },
        { score: { $gt: 90 } }
      ]
    };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return users younger than 25 OR with score > 90');
    results.forEach(function(doc) {
      TestFramework.assertTrue(
        doc.age < 25 || doc.score > 90, 
        'All returned documents should be < 25 years OR score > 90'
      );
    });
  });
  
  suite.addTest('should handle empty $and conditions', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { $and: [] };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertEquals(testDocs.length, results.length, 'Empty $and should match all documents');
  });
  
  suite.addTest('should handle empty $or conditions', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { $or: [] };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertEquals(0, results.length, 'Empty $or should match no documents');
  });
  
  suite.addTest('should support complex multi-field implicit AND', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const query = { 
      active: true,
      age: { $gt: 25 },
      "profile.department": "Engineering",
      "settings.theme": "dark"
    };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    results.forEach(function(doc) {
      TestFramework.assertEquals(true, doc.active, 'Document should be active');
      TestFramework.assertTrue(doc.age > 25, 'Document should have age > 25');
      TestFramework.assertEquals("Engineering", doc.profile.department, 'Document should be in Engineering');
      TestFramework.assertEquals("dark", doc.settings.theme, 'Document should have dark theme');
    });
  });
  
  return suite;
}

/**
 * QueryEngine Error Handling Tests (5 test cases)
 * Tests validation and error handling for invalid queries
 */
function createQueryEngineErrorTestSuite() {
  const suite = new TestSuite('QueryEngine Error Handling');
  
  suite.setBeforeAll(function() {
    setupQueryEngineTestEnvironment();
  });
  
  suite.setAfterAll(function() {
    cleanupQueryEngineTestEnvironment();
  });
  
  suite.addTest('should throw InvalidQueryError for invalid query structure', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const invalidQuery = "invalid query string";
    
    // Act & Assert
    TestFramework.assertThrows(function() {
      queryEngine.executeQuery(testDocs, invalidQuery);
    }, Error, 'Should throw error for invalid query structure');
  });
  
  suite.addTest('should throw InvalidQueryError for unsupported operators', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const queryWithUnsupportedOp = { age: { $regex: "pattern" } };
    
    // Act & Assert
    TestFramework.assertThrows(function() {
      queryEngine.executeQuery(testDocs, queryWithUnsupportedOp);
    }, Error, 'Should throw error for unsupported operators');
  });
  
  suite.addTest('should throw error for null or undefined documents array', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const query = { name: "John" };
    
    // Act & Assert
    TestFramework.assertThrows(function() {
      queryEngine.executeQuery(null, query);
    }, Error, 'Should throw error for null documents array');
    
    TestFramework.assertThrows(function() {
      queryEngine.executeQuery(undefined, query);
    }, Error, 'Should throw error for undefined documents array');
  });
  
  suite.addTest('should handle malformed logical operators gracefully', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const malformedQuery = { $and: "not an array" };
    
    // Act & Assert
    TestFramework.assertThrows(function() {
      queryEngine.executeQuery(testDocs, malformedQuery);
    }, Error, 'Should throw error for malformed $and operator');
  });
  
  suite.addTest('should provide clear error messages for query validation failures', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getTestUsers();
    const invalidQuery = { $unknownOperator: { field: "value" } };
    
    // Act
    let errorMessage = '';
    try {
      queryEngine.executeQuery(testDocs, invalidQuery);
    } catch (error) {
      errorMessage = error.message;
    }
    
    // Assert
    TestFramework.assertTrue(errorMessage.length > 0, 'Error message should not be empty');
    TestFramework.assertTrue(
      errorMessage.includes('query') || errorMessage.includes('operator') || errorMessage.includes('invalid'),
      'Error message should provide meaningful context about query issue'
    );
  });
  
  return suite;
}

/**
 * QueryEngine Edge Cases Tests (6 test cases)
 * Tests edge cases and boundary conditions
 */
function createQueryEngineEdgeCasesTestSuite() {
  const suite = new TestSuite('QueryEngine Edge Cases');
  
  suite.setBeforeAll(function() {
    setupQueryEngineTestEnvironment();
  });
  
  suite.setAfterAll(function() {
    cleanupQueryEngineTestEnvironment();
  });
  
  suite.addTest('should handle empty documents array', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const emptyDocs = [];
    const query = { name: "John" };
    
    // Act
    const results = queryEngine.executeQuery(emptyDocs, query);
    
    // Assert
    TestFramework.assertNotNull(results, 'Results should not be null');
    TestFramework.assertTrue(Array.isArray(results), 'Results should be an array');
    TestFramework.assertEquals(0, results.length, 'Should return empty array for empty input');
  });
  
  suite.addTest('should handle documents with null values', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const docsWithNulls = [
      { _id: "doc1", name: null, value: 42 },
      { _id: "doc2", name: "John", value: null },
      { _id: "doc3", name: "Jane", value: 24 }
    ];
    const query = { name: null };
    
    // Act
    const results = queryEngine.executeQuery(docsWithNulls, query);
    
    // Assert
    TestFramework.assertEquals(1, results.length, 'Should match document with null name');
    TestFramework.assertEquals("doc1", results[0]._id, 'Should return correct document');
  });
  
  suite.addTest('should handle documents with deeply nested null values', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getEdgeCaseDocuments();
    const query = { "nestedEmpty.null": null };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length >= 0, 'Should handle nested null values without error');
  });
  
  suite.addTest('should handle very deeply nested field access', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const testDocs = MockQueryData.getEdgeCaseDocuments();
    const query = { "deeplyNested.level1.level2.level3.level4.value": "deeply nested value" };
    
    // Act
    const results = queryEngine.executeQuery(testDocs, query);
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should match deeply nested value');
    TestFramework.assertEquals("deeply nested value", 
      results[0].deeplyNested.level1.level2.level3.level4.value, 
      'Should return correct deeply nested document');
  });
  
  suite.addTest('should handle numeric field names and special characters', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const docsWithSpecialFields = [
      { _id: "doc1", "123": "numeric field", "special@field": "value" },
      { _id: "doc2", "123": "another value", "special@field": "different" }
    ];
    const query = { "123": "numeric field" };
    
    // Act
    const results = queryEngine.executeQuery(docsWithSpecialFields, query);
    
    // Assert
    TestFramework.assertEquals(1, results.length, 'Should match document with numeric field name');
    TestFramework.assertEquals("doc1", results[0]._id, 'Should return correct document');
  });
  
  suite.addTest('should handle large number of documents efficiently', function() {
    // Arrange
    const queryEngine = new QueryEngine();
    const largeDocs = [];
    for (let i = 0; i < 1000; i++) {
      largeDocs.push({
        _id: "doc" + i,
        index: i,
        group: i % 10,
        active: i % 3 === 0  // Changed from i % 2 === 0 to i % 3 === 0
      });
    }
    const query = { group: 5, active: true };
    
    // Act
    const startTime = new Date().getTime();
    const results = queryEngine.executeQuery(largeDocs, query);
    const endTime = new Date().getTime();
    const executionTime = endTime - startTime;
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should return matching documents');
    TestFramework.assertTrue(executionTime < 1000, 'Should execute within reasonable time (< 1 second)');
    results.forEach(function(doc) {
      TestFramework.assertEquals(5, doc.group, 'All results should have group 5');
      TestFramework.assertEquals(true, doc.active, 'All results should be active');
    });
  });
  
  return suite;
}

/**
 * Register all QueryEngine test suites
 */
function createQueryEngineTestSuites() {
  const logger = JDbLogger.createComponentLogger('QueryEngine-TestRegistration');
  
  try {
    // Register all test suites
    const basicSuite = createQueryEngineBasicTestSuite();
    const comparisonSuite = createQueryEngineComparisonTestSuite();
    const logicalSuite = createQueryEngineLogicalTestSuite();
    const errorSuite = createQueryEngineErrorTestSuite();
    const edgeCasesSuite = createQueryEngineEdgeCasesTestSuite();
    
    // Register with global test framework
    registerTestSuite(basicSuite);
    registerTestSuite(comparisonSuite);
    registerTestSuite(logicalSuite);
    registerTestSuite(errorSuite);
    registerTestSuite(edgeCasesSuite);
    
    logger.info('QueryEngine test suites registered successfully', {
      basicTests: basicSuite.getTestNames().length,
      comparisonTests: comparisonSuite.getTestNames().length,
      logicalTests: logicalSuite.getTestNames().length,
      errorTests: errorSuite.getTestNames().length,
      edgeCasesTests: edgeCasesSuite.getTestNames().length,
      totalTests: basicSuite.getTestNames().length + comparisonSuite.getTestNames().length + 
                  logicalSuite.getTestNames().length + errorSuite.getTestNames().length + 
                  edgeCasesSuite.getTestNames().length
    });
    
    return {
      basic: basicSuite,
      comparison: comparisonSuite,
      logical: logicalSuite,
      error: errorSuite,
      edgeCases: edgeCasesSuite
    };
    
  } catch (error) {
    logger.error('Failed to register QueryEngine test suites', { error: error.message });
    throw error;
  }
}

/**
 * Run all QueryEngine tests
 * Convenience function to run all QueryEngine-related test suites
 */
function runQueryEngineTests() {
  const logger = JDbLogger.createComponentLogger('QueryEngine-TestRunner');
  
  try {
    logger.info('Starting QueryEngine test execution');
    
    // Create and register test suites
    const testSuites = createQueryEngineTestSuites();
    
    // Run all tests using the global test framework
    const results = runAllTests();
    
    // Log comprehensive results
    results.logComprehensiveResults();
    
    logger.info('QueryEngine test execution completed', {
      totalTests: results.results.length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      passRate: results.getPassRate(),
      executionTime: results.getTotalExecutionTime()
    });
    
    return results;
    
  } catch (error) {
    logger.error('Failed to run QueryEngine tests', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

/**
 * Register all QueryEngine test suites (alternative entry point)
 * For use with external test runners
 */
function registerQueryEngineTests() {
  const logger = JDbLogger.createComponentLogger('QueryEngine-TestRegistration');
  
  try {
    const testFramework = new TestFramework();
    
    // Create and register all test suites
    const basicSuite = createQueryEngineBasicTestSuite();
    const comparisonSuite = createQueryEngineComparisonTestSuite();
    const logicalSuite = createQueryEngineLogicalTestSuite();
    const errorSuite = createQueryEngineErrorTestSuite();
    const edgeCasesSuite = createQueryEngineEdgeCasesTestSuite();
    
    testFramework.registerTestSuite(basicSuite);
    testFramework.registerTestSuite(comparisonSuite);
    testFramework.registerTestSuite(logicalSuite);
    testFramework.registerTestSuite(errorSuite);
    testFramework.registerTestSuite(edgeCasesSuite);
    
    logger.info('QueryEngine test suites registered with TestFramework', {
      totalSuites: 5,
      totalTests: basicSuite.getTestNames().length + comparisonSuite.getTestNames().length + 
                  logicalSuite.getTestNames().length + errorSuite.getTestNames().length + 
                  edgeCasesSuite.getTestNames().length
    });
    
    return testFramework;
    
  } catch (error) {
    logger.error('Failed to register QueryEngine tests with TestFramework', { 
      error: error.message 
    });
    throw error;
  }
}
