/**
 * CollectionIntegrationTest.js - Integration Tests for Collection Query Pipeline
 * 
 * Comprehensive integration tests for the complete query pipeline:
 * Collection API → DocumentOperations → QueryEngine
 * 
 * Tests include:
 * - Complete query pipeline integration
 * - Error propagation through all layers  
 * - Performance with realistic data volumes (1000+ documents)
 * - Concurrent query execution
 * - Memory management with complex nested queries
 * - MongoDB compatibility verification across all query types
 * - Backwards compatibility with Section 5 patterns
 * - Robustness with malformed or edge case queries
 * 
 * Following TDD principles and British English naming conventions.
 */

// Global test data storage for integration tests
const INTEGRATION_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_Integration_Test_' + new Date().getTime(),
  testFileId: null,
  testCollectionName: 'integration_test_collection',
  createdFileIds: [], // Track all files created for cleanup
  createdFolderIds: [], // Track all folders created for cleanup
  testCollection: null,
  testFileService: null,
  testDatabase: null,
  largeDataset: null // For performance testing
};

/**
 * Setup integration test environment with realistic data volumes
 */
function setupIntegrationTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Integration-Setup');
  
  try {
    // Create test folder
    const folder = DriveApp.createFolder(INTEGRATION_TEST_DATA.testFolderName);
    INTEGRATION_TEST_DATA.testFolderId = folder.getId();
    INTEGRATION_TEST_DATA.createdFolderIds.push(INTEGRATION_TEST_DATA.testFolderId);
    
    // Create FileService instance with proper dependencies
    const fileOps = new FileOperations(logger);
    INTEGRATION_TEST_DATA.testFileService = new FileService(fileOps, logger);
    
    // Create mock database object
    INTEGRATION_TEST_DATA.testDatabase = {
      _markDirty: function() {
        // Mock implementation for integration tests
      }
    };
    
    // Generate large dataset for performance testing (1000+ documents)
    INTEGRATION_TEST_DATA.largeDataset = generateLargeTestDataset(1200);
    
    logger.info('Created integration test environment', { 
      folderId: INTEGRATION_TEST_DATA.testFolderId, 
      name: INTEGRATION_TEST_DATA.testFolderName,
      datasetSize: INTEGRATION_TEST_DATA.largeDataset.length
    });
    
  } catch (error) {
    logger.error('Failed to create integration test environment', { error: error.message });
    throw error;
  }
}

/**
 * Clean up integration test environment
 */
function cleanupIntegrationTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Integration-Cleanup');
  let cleanedFiles = 0;
  let failedFiles = 0;
  let cleanedFolders = 0;
  let failedFolders = 0;
  
  // Clean up created test files
  INTEGRATION_TEST_DATA.createdFileIds.forEach(fileId => {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
      cleanedFiles++;
    } catch (error) {
      failedFiles++;
      logger.warn('Failed to clean up test file', { fileId, error: error.message });
    }
  });
  
  // Clean up created test folders
  INTEGRATION_TEST_DATA.createdFolderIds.forEach(folderId => {
    try {
      DriveApp.getFolderById(folderId).setTrashed(true);
      cleanedFolders++;
    } catch (error) {
      failedFolders++;
      logger.warn('Failed to clean up test folder', { folderId, error: error.message });
    }
  });
  
  // Reset test data
  INTEGRATION_TEST_DATA.createdFileIds = [];
  INTEGRATION_TEST_DATA.createdFolderIds = [];
  INTEGRATION_TEST_DATA.testCollection = null;
  INTEGRATION_TEST_DATA.testFileId = null;
  INTEGRATION_TEST_DATA.largeDataset = null;
  
  logger.info('Integration test cleanup completed', { 
    cleanedFiles, 
    failedFiles, 
    cleanedFolders, 
    failedFolders 
  });
}

/**
 * Generate large test dataset for performance testing
 * @param {number} size - Number of documents to generate
 * @returns {Array} Array of test documents
 */
function generateLargeTestDataset(size) {
  const dataset = [];
  const departments = ['Engineering', 'Marketing', 'Sales', 'Support', 'HR'];
  const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool'];
  const skills = ['JavaScript', 'Node.js', 'Python', 'Java', 'React', 'Angular', 'Vue.js'];
  
  for (let i = 0; i < size; i++) {
    const baseDate = new Date('2020-01-01');
    const randomDays = Math.floor(Math.random() * 1460); // 4 years worth of days
    
    dataset.push({
      _id: `user_${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: 18 + Math.floor(Math.random() * 47), // Age 18-65
      active: Math.random() > 0.2, // 80% active
      salary: 25000 + Math.floor(Math.random() * 75000), // £25k-£100k
      joinDate: new Date(baseDate.getTime() + (randomDays * 24 * 60 * 60 * 1000)),
      profile: {
        title: `Role ${i % 20}`, // 20 different roles
        department: departments[i % departments.length],
        yearsOfService: Math.floor(Math.random() * 15),
        skills: skills.slice(0, 1 + Math.floor(Math.random() * 4)), // 1-4 skills
        rating: Math.round((Math.random() * 4 + 1) * 10) / 10 // 1.0-5.0, 1 decimal
      },
      address: {
        city: cities[i % cities.length],
        postcode: `SW${Math.floor(Math.random() * 20)}${Math.floor(Math.random() * 10)}XX`,
        country: 'UK'
      },
      metadata: {
        createdAt: new Date(baseDate.getTime() + (randomDays * 24 * 60 * 60 * 1000)),
        version: 1,
        tags: i % 5 === 0 ? ['premium'] : [] // 20% premium users
      }
    });
  }
  
  return dataset;
}

/**
 * Helper function to create a test collection with populated data
 * @param {Array} documents - Documents to insert into collection
 * @returns {Collection} Configured test collection
 */
function createPopulatedTestCollection(documents = []) {
  const folder = DriveApp.getFolderById(INTEGRATION_TEST_DATA.testFolderId);
  const fileName = 'integration_test_' + new Date().getTime() + '.json';
  
  // Create initial collection data structure
  const collectionData = {
    documents: {},
    metadata: {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      documentCount: 0
    }
  };
  
  // Add documents to collection data
  documents.forEach(doc => {
    collectionData.documents[doc._id] = doc;
    collectionData.metadata.documentCount++;
  });
  
  // Create file with populated data
  const file = folder.createFile(fileName, JSON.stringify(collectionData, null, 2));
  const fileId = file.getId();
  INTEGRATION_TEST_DATA.createdFileIds.push(fileId);
  
  // Create and return collection instance
  return new Collection(
    INTEGRATION_TEST_DATA.testCollectionName,
    fileId,
    INTEGRATION_TEST_DATA.testDatabase,
    INTEGRATION_TEST_DATA.testFileService
  );
}

/**
 * Test 1: Complete query pipeline integration
 * Tests Collection API → DocumentOperations → QueryEngine flow
 */
function createQueryPipelineIntegrationTestSuite() {
  const suite = new TestSuite('Query Pipeline Integration');
  
  suite.addTest('testCompleteQueryPipelineFieldMatching', function() {
    // Arrange - Create collection with test data
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Execute field-based query through complete pipeline
    const engineeringUsers = collection.find({ 'profile.department': 'Engineering' });
    
    // Assert - Verify pipeline worked correctly
    AssertionUtilities.assertTrue(Array.isArray(engineeringUsers), 'Should return array');
    AssertionUtilities.assertTrue(engineeringUsers.length > 0, 'Should find engineering users');
    
    engineeringUsers.forEach(user => {
      AssertionUtilities.assertEquals(user.profile.department, 'Engineering', 
        'All returned users should be in Engineering');
    });
  });
  
  suite.addTest('testCompleteQueryPipelineComparisonOperators', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Test comparison operators through pipeline
    const seniorUsers = collection.find({ age: { $gt: 35 } });
    const exactAgeUsers = collection.find({ age: { $eq: 30 } });
    
    // Assert
    AssertionUtilities.assertTrue(Array.isArray(seniorUsers), 'Should return array for $gt query');
    AssertionUtilities.assertTrue(Array.isArray(exactAgeUsers), 'Should return array for $eq query');
    
    seniorUsers.forEach(user => {
      AssertionUtilities.assertTrue(user.age > 35, 'All users should be older than 35');
    });
    
    exactAgeUsers.forEach(user => {
      AssertionUtilities.assertEquals(user.age, 30, 'All users should be exactly 30 years old');
    });
  });
  
  suite.addTest('testCompleteQueryPipelineNestedFields', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Test nested field queries through pipeline
    const skilledUsers = collection.find({ 'profile.skills': 'JavaScript' });
    const londonUsers = collection.find({ 'address.city': 'London' });
    
    // Assert
    AssertionUtilities.assertTrue(Array.isArray(skilledUsers), 'Should return array for nested field query');
    AssertionUtilities.assertTrue(Array.isArray(londonUsers), 'Should return array for nested address query');
    
    skilledUsers.forEach(user => {
      AssertionUtilities.assertTrue(user.profile.skills.includes('JavaScript'), 
        'All users should have JavaScript skill');
    });
    
    londonUsers.forEach(user => {
      AssertionUtilities.assertEquals(user.address.city, 'London', 
        'All users should be in London');
    });
  });
  
  suite.addTest('testCompleteQueryPipelineUpdateOperations', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Test update through pipeline
    const updateResult = collection.updateOne(
      { 'profile.department': 'Engineering' },
      { name: 'Updated Engineer', email: 'updated@example.com' }
    );
    
    // Assert
    AssertionUtilities.assertEquals(updateResult.modifiedCount, 1, 'Should update one document');
    
    // Verify update took effect
    const updatedUser = collection.findOne({ name: 'Updated Engineer' });
    AssertionUtilities.assertNotNull(updatedUser, 'Should find updated user');
    AssertionUtilities.assertEquals(updatedUser.email, 'updated@example.com', 'Email should be updated');
  });
  
  suite.addTest('testCompleteQueryPipelineDeleteOperations', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    const initialCount = collection.countDocuments({});
    
    // Act - Test delete through pipeline
    const deleteResult = collection.deleteOne({ 'profile.department': 'Marketing' });
    
    // Assert
    AssertionUtilities.assertEquals(deleteResult.deletedCount, 1, 'Should delete one document');
    
    // Verify deletion took effect
    const remainingCount = collection.countDocuments({});
    AssertionUtilities.assertEquals(remainingCount, initialCount - 1, 'Document count should decrease');
    
    const marketingUsers = collection.find({ 'profile.department': 'Marketing' });
    AssertionUtilities.assertTrue(marketingUsers.length < testUsers.filter(u => u.profile.department === 'Marketing').length, 
      'Should have fewer marketing users after deletion');
  });
  
  return suite;
}

/**
 * Test 2: Error propagation through all layers
 * Tests that errors are properly caught and propagated from QueryEngine → DocumentOperations → Collection
 */
function createErrorPropagationTestSuite() {
  const suite = new TestSuite('Error Propagation Integration');
  
  suite.addTest('testInvalidQueryErrorPropagation', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test malformed query error propagation
    try {
      collection.find({ $invalidOperator: 'test' });
      AssertionUtilities.fail('Should throw InvalidQueryError for unsupported operator');
    } catch (error) {
      AssertionUtilities.assertEquals(error.constructor.name, 'InvalidQueryError', 
        'Should propagate InvalidQueryError from QueryEngine');
      AssertionUtilities.assertTrue(error.message.includes('$invalidOperator'), 
        'Error message should mention invalid operator');
    }
  });
  
  suite.addTest('testInvalidArgumentErrorPropagation', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test invalid arguments error propagation
    try {
      collection.find(null);
      AssertionUtilities.fail('Should throw InvalidArgumentError for null query');
    } catch (error) {
      AssertionUtilities.assertEquals(error.constructor.name, 'InvalidArgumentError', 
        'Should propagate InvalidArgumentError from DocumentOperations');
    }
  });
  
  suite.addTest('testDocumentNotFoundErrorPropagation', function() {
    // Arrange
    const collection = createPopulatedTestCollection([]); // Empty collection
    
    // Act & Assert - Test document not found error propagation
    const result = collection.findOne({ name: 'NonExistentUser' });
    AssertionUtilities.assertNull(result, 'Should return null for non-existent document');
    
    // Test update on non-existent document
    const updateResult = collection.updateOne({ name: 'NonExistentUser' }, { updated: true });
    AssertionUtilities.assertEquals(updateResult.modifiedCount, 0, 'Should not modify any documents');
  });
  
  suite.addTest('testRecursionDepthErrorPropagation', function() {
    // Arrange
    const collection = createPopulatedTestCollection([]);
    
    // Create deeply nested query to test recursion protection
    let deepQuery = { field: 'value' };
    for (let i = 0; i < 20; i++) {
      deepQuery = { $and: [deepQuery, { anotherField: 'value' }] };
    }
    
    // Act & Assert - Test recursion depth protection
    try {
      collection.find(deepQuery);
      AssertionUtilities.fail('Should throw error for excessively deep query');
    } catch (error) {
      AssertionUtilities.assertTrue(error.message.includes('recursion') || error.message.includes('depth'), 
        'Should throw recursion/depth related error');
    }
  });
  
  return suite;
}

/**
 * Test 3: Performance with realistic data volumes (1000+ documents)
 * Tests query performance and memory efficiency with large datasets
 */
function createPerformanceTestSuite() {
  const suite = new TestSuite('Performance Integration');
  
  suite.addTest('testLargeDatasetQueryPerformance', function() {
    // Arrange
    const collection = createPopulatedTestCollection(INTEGRATION_TEST_DATA.largeDataset);
    
    // Act & Assert - Test various query patterns on large dataset
    const startTime = new Date().getTime();
    
    // Simple field query
    const engineeringUsers = collection.find({ 'profile.department': 'Engineering' });
    const fieldQueryTime = new Date().getTime() - startTime;
    
    // Comparison operator query
    const comparisonStartTime = new Date().getTime();
    const highEarners = collection.find({ salary: { $gt: 75000 } });
    const comparisonQueryTime = new Date().getTime() - comparisonStartTime;
    
    // Complex nested query
    const complexStartTime = new Date().getTime();
    const complexResults = collection.find({ 
      'profile.department': 'Engineering', 
      salary: { $gt: 50000 },
      active: true 
    });
    const complexQueryTime = new Date().getTime() - complexStartTime;
    
    // Assert - Performance thresholds (all queries should complete within reasonable time)
    AssertionUtilities.assertTrue(fieldQueryTime < 2000, 
      `Field query should complete within 2 seconds, took ${fieldQueryTime}ms`);
    AssertionUtilities.assertTrue(comparisonQueryTime < 2000, 
      `Comparison query should complete within 2 seconds, took ${comparisonQueryTime}ms`);
    AssertionUtilities.assertTrue(complexQueryTime < 3000, 
      `Complex query should complete within 3 seconds, took ${complexQueryTime}ms`);
    
    // Assert - Result correctness
    AssertionUtilities.assertTrue(engineeringUsers.length > 0, 'Should find engineering users');
    AssertionUtilities.assertTrue(highEarners.length > 0, 'Should find high earners');
    AssertionUtilities.assertTrue(complexResults.length > 0, 'Should find complex query results');
    
    // All high earners should have salary > 75000
    highEarners.forEach(user => {
      AssertionUtilities.assertTrue(user.salary > 75000, 'All users should be high earners');
    });
  });
  
  suite.addTest('testLargeDatasetMemoryManagement', function() {
    // Arrange
    const collection = createPopulatedTestCollection(INTEGRATION_TEST_DATA.largeDataset);
    
    // Act - Perform multiple large queries to test memory management
    const queries = [
      { active: true },
      { 'profile.department': 'Engineering' },
      { salary: { $gt: 40000 } },
      { 'address.city': 'London' },
      { 'profile.yearsOfService': { $gt: 5 } }
    ];
    
    const results = [];
    queries.forEach(query => {
      const queryResults = collection.find(query);
      results.push(queryResults.length);
    });
    
    // Assert - All queries should return reasonable results
    results.forEach((count, index) => {
      AssertionUtilities.assertTrue(count >= 0, `Query ${index} should return non-negative count`);
    });
    
    // Test count operations for memory efficiency
    const totalDocs = collection.countDocuments({});
    AssertionUtilities.assertEquals(totalDocs, INTEGRATION_TEST_DATA.largeDataset.length, 
      'Count should match dataset size');
  });
  
  return suite;
}

/**
 * Test 4: Concurrent query execution
 * Tests that multiple queries can be executed simultaneously without conflicts
 */
function createConcurrentQueryTestSuite() {
  const suite = new TestSuite('Concurrent Query Integration');
  
  suite.addTest('testConcurrentReadOperations', function() {
    // Arrange
    const collection = createPopulatedTestCollection(INTEGRATION_TEST_DATA.largeDataset.slice(0, 500));
    
    // Act - Simulate concurrent read operations
    const query1Results = collection.find({ 'profile.department': 'Engineering' });
    const query2Results = collection.find({ salary: { $gt: 50000 } });
    const query3Results = collection.find({ active: true });
    const countResult = collection.countDocuments({ 'address.city': 'London' });
    
    // Assert - All operations should succeed without interference
    AssertionUtilities.assertTrue(Array.isArray(query1Results), 'Query 1 should return array');
    AssertionUtilities.assertTrue(Array.isArray(query2Results), 'Query 2 should return array');
    AssertionUtilities.assertTrue(Array.isArray(query3Results), 'Query 3 should return array');
    AssertionUtilities.assertTrue(typeof countResult === 'number', 'Count should return number');
    
    // Results should be consistent with expectations
    query1Results.forEach(user => {
      AssertionUtilities.assertEquals(user.profile.department, 'Engineering', 
        'All query 1 results should be Engineering users');
    });
    
    query2Results.forEach(user => {
      AssertionUtilities.assertTrue(user.salary > 50000, 
        'All query 2 results should have salary > 50000');
    });
  });
  
  suite.addTest('testConcurrentMixedOperations', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Mix of read, update, and count operations
    const findResult = collection.find({ 'profile.department': 'Engineering' });
    const updateResult = collection.updateOne(
      { 'profile.department': 'Marketing' }, 
      { name: 'Updated Marketing User' }
    );
    const countResult = collection.countDocuments({ active: true });
    const findOneResult = collection.findOne({ name: 'Updated Marketing User' });
    
    // Assert - All operations should succeed
    AssertionUtilities.assertTrue(Array.isArray(findResult), 'Find should return array');
    AssertionUtilities.assertEquals(updateResult.modifiedCount, 1, 'Update should modify one document');
    AssertionUtilities.assertTrue(typeof countResult === 'number', 'Count should return number');
    AssertionUtilities.assertNotNull(findOneResult, 'Should find updated user');
    AssertionUtilities.assertEquals(findOneResult.name, 'Updated Marketing User', 
      'Updated user should have correct name');
  });
  
  return suite;
}

/**
 * Test 5: Memory management with complex nested queries
 * Tests memory efficiency with deeply nested queries and large result sets
 */
function createMemoryManagementTestSuite() {
  const suite = new TestSuite('Memory Management Integration');
  
  suite.addTest('testComplexNestedQueryMemoryUsage', function() {
    // Arrange
    const collection = createPopulatedTestCollection(INTEGRATION_TEST_DATA.largeDataset);
    
    // Act - Execute complex nested queries
    const complexQuery1 = {
      'profile.department': 'Engineering',
      salary: { $gt: 40000 },
      active: true,
      'address.city': 'London'
    };
    
    const complexQuery2 = {
      'profile.yearsOfService': { $gt: 3 },
      'profile.rating': { $gt: 4.0 },
      'metadata.tags': 'premium'
    };
    
    const result1 = collection.find(complexQuery1);
    const result2 = collection.find(complexQuery2);
    
    // Assert - Results should be accurate and memory efficient
    AssertionUtilities.assertTrue(Array.isArray(result1), 'Complex query 1 should return array');
    AssertionUtilities.assertTrue(Array.isArray(result2), 'Complex query 2 should return array');
    
    // Verify query accuracy
    result1.forEach(user => {
      AssertionUtilities.assertEquals(user.profile.department, 'Engineering', 'Should be Engineering user');
      AssertionUtilities.assertTrue(user.salary > 40000, 'Should have salary > 40000');
      AssertionUtilities.assertTrue(user.active, 'Should be active');
      AssertionUtilities.assertEquals(user.address.city, 'London', 'Should be in London');
    });
    
    result2.forEach(user => {
      AssertionUtilities.assertTrue(user.profile.yearsOfService > 3, 'Should have experience > 3 years');
      AssertionUtilities.assertTrue(user.profile.rating > 4.0, 'Should have rating > 4.0');
      AssertionUtilities.assertTrue(user.metadata.tags.includes('premium'), 'Should be premium user');
    });
  });
  
  suite.addTest('testLargeResultSetMemoryHandling', function() {
    // Arrange
    const collection = createPopulatedTestCollection(INTEGRATION_TEST_DATA.largeDataset);
    
    // Act - Query that returns large result set
    const largeResultSet = collection.find({ active: true }); // Should return ~80% of dataset
    
    // Assert - Large result set should be handled efficiently
    AssertionUtilities.assertTrue(Array.isArray(largeResultSet), 'Should return array');
    AssertionUtilities.assertTrue(largeResultSet.length > 800, 'Should return large number of results');
    
    // Verify all results meet criteria
    largeResultSet.forEach(user => {
      AssertionUtilities.assertTrue(user.active, 'All users should be active');
    });
    
    // Test count operation on same query for memory efficiency comparison
    const countResult = collection.countDocuments({ active: true });
    AssertionUtilities.assertEquals(countResult, largeResultSet.length, 
      'Count should match find result length');
  });
  
  return suite;
}

/**
 * Test 6: MongoDB compatibility verification across all query types
 * Tests that query syntax and behaviour matches MongoDB standards
 */
function createMongoDBCompatibilityTestSuite() {
  const suite = new TestSuite('MongoDB Compatibility Integration');
  
  suite.addTest('testMongoDBFieldQueryCompatibility', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test MongoDB-standard field queries
    
    // Direct field matching (MongoDB standard)
    const directMatch = collection.find({ name: 'John Smith' });
    AssertionUtilities.assertTrue(directMatch.length > 0, 'Direct field matching should work');
    
    // Nested field dot notation (MongoDB standard)
    const nestedMatch = collection.find({ 'profile.department': 'Engineering' });
    AssertionUtilities.assertTrue(nestedMatch.length > 0, 'Nested field dot notation should work');
    
    // Array field matching (MongoDB standard)
    const arrayMatch = collection.find({ 'profile.skills': 'JavaScript' });
    AssertionUtilities.assertTrue(arrayMatch.length > 0, 'Array field matching should work');
    
    // Boolean field matching (MongoDB standard)
    const booleanMatch = collection.find({ active: true });
    AssertionUtilities.assertTrue(booleanMatch.length > 0, 'Boolean field matching should work');
  });
  
  suite.addTest('testMongoDBComparisonOperatorCompatibility', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test MongoDB-standard comparison operators
    
    // $eq operator (MongoDB standard)
    const eqMatch = collection.find({ age: { $eq: 30 } });
    eqMatch.forEach(user => {
      AssertionUtilities.assertEquals(user.age, 30, '$eq operator should match exactly');
    });
    
    // $gt operator (MongoDB standard)
    const gtMatch = collection.find({ age: { $gt: 35 } });
    gtMatch.forEach(user => {
      AssertionUtilities.assertTrue(user.age > 35, '$gt operator should match greater than');
    });
    
    // $lt operator (MongoDB standard)
    const ltMatch = collection.find({ age: { $lt: 25 } });
    ltMatch.forEach(user => {
      AssertionUtilities.assertTrue(user.age < 25, '$lt operator should match less than');
    });
  });
  
  suite.addTest('testMongoDBMethodSignatureCompatibility', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test MongoDB-standard method signatures
    
    // find() method (MongoDB standard)
    const findAll = collection.find({});
    AssertionUtilities.assertTrue(Array.isArray(findAll), 'find({}) should return array');
    
    // findOne() method (MongoDB standard)
    const findOneResult = collection.findOne({ name: 'John Smith' });
    AssertionUtilities.assertTrue(findOneResult === null || typeof findOneResult === 'object', 
      'findOne should return object or null');
    
    // countDocuments() method (MongoDB standard)
    const countResult = collection.countDocuments({});
    AssertionUtilities.assertTrue(typeof countResult === 'number', 'countDocuments should return number');
    
    // updateOne() method (MongoDB standard)
    const updateResult = collection.updateOne({ name: 'John Smith' }, { updated: true });
    AssertionUtilities.assertTrue(typeof updateResult.modifiedCount === 'number', 
      'updateOne should return result with modifiedCount');
    
    // deleteOne() method (MongoDB standard)
    const deleteResult = collection.deleteOne({ name: 'Non-existent User' });
    AssertionUtilities.assertTrue(typeof deleteResult.deletedCount === 'number', 
      'deleteOne should return result with deletedCount');
  });
  
  return suite;
}

/**
 * Test 7: Backwards compatibility with Section 5 patterns
 * Tests that existing ID-based query patterns continue to work
 */
function createBackwardsCompatibilityTestSuite() {
  const suite = new TestSuite('Backwards Compatibility Integration');
  
  suite.addTest('testSection5IdBasedQueriesStillWork', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test Section 5 ID-based patterns still work
    
    // findOne by ID (Section 5 pattern)
    const userById = collection.findOne({ _id: 'user1' });
    AssertionUtilities.assertNotNull(userById, 'Should find user by ID');
    AssertionUtilities.assertEquals(userById._id, 'user1', 'Should return correct user');
    
    // updateOne by ID (Section 5 pattern)
    const updateResult = collection.updateOne({ _id: 'user1' }, { updated: true });
    AssertionUtilities.assertEquals(updateResult.modifiedCount, 1, 'Should update user by ID');
    
    // deleteOne by ID (Section 5 pattern)
    const deleteResult = collection.deleteOne({ _id: 'user2' });
    AssertionUtilities.assertEquals(deleteResult.deletedCount, 1, 'Should delete user by ID');
    
    // Verify deletion
    const deletedUser = collection.findOne({ _id: 'user2' });
    AssertionUtilities.assertNull(deletedUser, 'Deleted user should not be found');
  });
  
  suite.addTest('testSection5AndSection6PatternsCoexist', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test that Section 5 and Section 6 patterns work together
    
    // Section 5: Find by ID
    const userById = collection.findOne({ _id: 'user1' });
    AssertionUtilities.assertNotNull(userById, 'Section 5 ID query should work');
    
    // Section 6: Find by field
    const userByName = collection.findOne({ name: userById.name });
    AssertionUtilities.assertNotNull(userByName, 'Section 6 field query should work');
    AssertionUtilities.assertEquals(userById._id, userByName._id, 'Should find same user');
    
    // Mixed operations
    const engineeringCount = collection.countDocuments({ 'profile.department': 'Engineering' });
    const totalCount = collection.countDocuments({});
    
    AssertionUtilities.assertTrue(engineeringCount <= totalCount, 
      'Engineering count should not exceed total');
    AssertionUtilities.assertTrue(engineeringCount >= 0, 'Engineering count should be non-negative');
  });
  
  return suite;
}

/**
 * Test 8: Robustness with malformed or edge case queries
 * Tests system behaviour with invalid, edge case, and boundary condition queries
 */
function createRobustnessTestSuite() {
  const suite = new TestSuite('Robustness Integration');
  
  suite.addTest('testMalformedQueryRobustness', function() {
    // Arrange
    const collection = createPopulatedTestCollection([]);
    
    // Act & Assert - Test various malformed queries
    
    // Null query
    try {
      collection.find(null);
      AssertionUtilities.fail('Should throw error for null query');
    } catch (error) {
      AssertionUtilities.assertEquals(error.constructor.name, 'InvalidArgumentError', 
        'Should throw InvalidArgumentError for null query');
    }
    
    // Undefined query - should default to {} and return all documents (MongoDB compatible)
    const undefinedResult = collection.find(undefined);
    AssertionUtilities.assertTrue(Array.isArray(undefinedResult), 'Undefined query should return array');
    AssertionUtilities.assertEquals(undefinedResult.length, 0, 'Should return empty array from empty collection');
    
    // Non-object query
    try {
      collection.find('invalid query');
      AssertionUtilities.fail('Should throw error for string query');
    } catch (error) {
      AssertionUtilities.assertEquals(error.constructor.name, 'InvalidArgumentError', 
        'Should throw InvalidArgumentError for string query');
    }
  });
  
  suite.addTest('testEdgeCaseQueryRobustness', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test edge case queries
    
    // Empty query (should return all documents)
    const allUsers = collection.find({});
    AssertionUtilities.assertEquals(allUsers.length, testUsers.length, 
      'Empty query should return all documents');
    
    // Query with non-existent field
    const nonExistentField = collection.find({ nonExistentField: 'value' });
    AssertionUtilities.assertEquals(nonExistentField.length, 0, 
      'Query with non-existent field should return empty array');
    
    // Query with null value
    const nullValueQuery = collection.find({ someField: null });
    AssertionUtilities.assertTrue(Array.isArray(nullValueQuery), 
      'Query with null value should return array');
    
    // Query with undefined value
    const undefinedValueQuery = collection.find({ someField: undefined });
    AssertionUtilities.assertTrue(Array.isArray(undefinedValueQuery), 
      'Query with undefined value should return array');
  });
  
  suite.addTest('testBoundaryConditionRobustness', function() {
    // Arrange
    const collection = createPopulatedTestCollection([]);
    
    // Act & Assert - Test boundary conditions
    
    // Query on empty collection
    const emptyCollectionResult = collection.find({ any: 'query' });
    AssertionUtilities.assertTrue(Array.isArray(emptyCollectionResult), 
      'Query on empty collection should return array');
    AssertionUtilities.assertEquals(emptyCollectionResult.length, 0, 
      'Query on empty collection should return empty array');
    
    // Count on empty collection
    const emptyCount = collection.countDocuments({});
    AssertionUtilities.assertEquals(emptyCount, 0, 'Count on empty collection should be 0');
    
    // Update on empty collection
    const emptyUpdateResult = collection.updateOne({ any: 'query' }, { updated: true });
    AssertionUtilities.assertEquals(emptyUpdateResult.modifiedCount, 0, 
      'Update on empty collection should modify 0 documents');
    
    // Delete on empty collection
    const emptyDeleteResult = collection.deleteOne({ any: 'query' });
    AssertionUtilities.assertEquals(emptyDeleteResult.deletedCount, 0, 
      'Delete on empty collection should delete 0 documents');
  });
  
  return suite;
}

/**
 * Run all Collection integration tests
 * This function orchestrates all integration test suites
 */
function runCollectionIntegrationTests() {
  try {
    setupIntegrationTestEnvironment();
    
    const logger = GASDBLogger.createComponentLogger('Integration-TestExecution');
    logger.info('Starting Collection integration tests');
    
    const testFramework = registerCollectionIntegrationTests();
    
    console.log('\n=== COLLECTION INTEGRATION TESTS ===');
    const results = testFramework.runAllTests();
    
    logger.info('Collection integration tests completed', {
      totalTests: results.getPassed().length + results.getFailed().length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      passRate: results.getPassRate().toFixed(1) + '%',
      executionTime: results.getTotalExecutionTime() + 'ms'
    });
    
    return results;
    
  } catch (error) {
    console.error('Failed to run Collection integration tests:', error);
    throw error;
  } finally {
    cleanupIntegrationTestEnvironment();
  }
}

/**
 * Register all Collection integration test suites with the TestFramework
 * This function creates and registers all test suites for integration testing
 */
function registerCollectionIntegrationTests() {
  const testFramework = new TestFramework();
  
  // Register all integration test suites
  testFramework.registerTestSuite(createQueryPipelineIntegrationTestSuite());
  testFramework.registerTestSuite(createErrorPropagationTestSuite());
  testFramework.registerTestSuite(createPerformanceTestSuite());
  testFramework.registerTestSuite(createConcurrentQueryTestSuite());
  testFramework.registerTestSuite(createMemoryManagementTestSuite());
  testFramework.registerTestSuite(createMongoDBCompatibilityTestSuite());
  testFramework.registerTestSuite(createBackwardsCompatibilityTestSuite());
  testFramework.registerTestSuite(createRobustnessTestSuite());
  
  return testFramework;
}

/**
 * Run Collection integration tests using the TestFramework
 * Alternative entry point that follows standard test framework patterns
 */
function runCollectionIntegrationTestsWithFramework() {
  try {
    setupIntegrationTestEnvironment();
    
    const logger = GASDBLogger.createComponentLogger('Integration-TestExecution');
    logger.info('Starting Collection integration tests');
    
    const testFramework = registerCollectionIntegrationTests();
    const results = testFramework.runAllTests();
    
    // Log comprehensive results
    logger.info('Collection integration tests completed', {
      totalTests: results.getPassed().length + results.getFailed().length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      passRate: results.getPassRate().toFixed(1) + '%',
      executionTime: results.getTotalExecutionTime() + 'ms'
    });
    
    return results;
    
  } catch (error) {
    const logger = GASDBLogger.createComponentLogger('Integration-TestExecution');
    logger.error('Failed to run Collection integration tests', { error: error.message });
    throw error;
  } finally {
    cleanupIntegrationTestEnvironment();
  }
}
