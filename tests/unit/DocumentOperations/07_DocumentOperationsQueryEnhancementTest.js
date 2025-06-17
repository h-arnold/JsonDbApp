// DocumentOperations Query Enhancement Tests

function createDocumentOperationsQueryEnhancementTestSuite() {
  const suite = new TestSuite('DocumentOperations Query Enhancement');
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);

  suite.addTest('should find document by field-based query with exact match', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test documents using MockQueryData
    const testUsers = MockQueryData.getTestUsers();
    const johnUser = testUsers[0]; // John Smith
    const sarahUser = testUsers[1]; // Sarah Johnson
    docOps.insertDocument(johnUser);
    docOps.insertDocument(sarahUser);
    // Act - Search for John by name
    const result = docOps.findByQuery({ name: "John Smith" });
    // Assert
    TestFramework.assertDefined(result, 'findByQuery result should be defined');
    TestFramework.assertEquals(result._id, johnUser._id, 'Should find John Smith by name');
    TestFramework.assertEquals(result.name, johnUser.name, 'Found document should have correct name');
    TestFramework.assertEquals(result.email, johnUser.email, 'Found document should have correct email');
  });

  suite.addTest('should find document by comparison operator query', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test documents
    const testUsers = MockQueryData.getTestUsers();
    testUsers.forEach(user => docOps.insertDocument(user));
    // Act - Search for users older than 25
    const result = docOps.findByQuery({ age: { $gt: 25 } });
    // Assert
    TestFramework.assertDefined(result, 'findByQuery result should be defined');
    TestFramework.assertTrue(result.age > 25, 'Found user should be older than 25');
  });

  suite.addTest('should find document by logical AND query', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test documents
    const testUsers = MockQueryData.getTestUsers();
    testUsers.forEach(user => docOps.insertDocument(user));
    // Act - Search for active users older than 25
    const result = docOps.findByQuery({
      $and: [
        { active: true },
        { age: { $gt: 25 } }
      ]
    });
    // Assert
    TestFramework.assertDefined(result, 'findByQuery result should be defined');
    TestFramework.assertTrue(result.active, 'Found user should be active');
    TestFramework.assertTrue(result.age > 25, 'Found user should be older than 25');
  });

  suite.addTest('should find document by logical OR query', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test documents
    const testUsers = MockQueryData.getTestUsers();
    testUsers.forEach(user => docOps.insertDocument(user));
    // Act - Search for users named John OR users older than 35
    const result = docOps.findByQuery({
      $or: [
        { name: "John Smith" },
        { age: { $gt: 35 } }
      ]
    });
    // Assert
    TestFramework.assertDefined(result, 'findByQuery result should be defined');
    const matchesName = result.name === "John Smith";
    const matchesAge = result.age > 35;
    TestFramework.assertTrue(matchesName || matchesAge, 'Found user should match name OR age condition');
  });

  suite.addTest('should find document by nested field query', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test documents
    const testUsers = MockQueryData.getTestUsers();
    testUsers.forEach(user => docOps.insertDocument(user));
    // Act - Search by nested profile field
    const result = docOps.findByQuery({ "profile.yearsOfService": 5 });
    // Assert
    TestFramework.assertDefined(result, 'findByQuery result should be defined');
    TestFramework.assertEquals(result.profile.yearsOfService, 5, 'Found user should have 5 years of service');
  });

  suite.addTest('should find multiple documents by query', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test documents
    const testUsers = MockQueryData.getTestUsers();
    testUsers.forEach(user => docOps.insertDocument(user));
    // Act - Search for all active users
    const results = docOps.findMultipleByQuery({ active: true });
    // Assert
    TestFramework.assertDefined(results, 'findMultipleByQuery result should be defined');
    TestFramework.assertTrue(Array.isArray(results), 'Result should be an array');
    TestFramework.assertTrue(results.length >= 2, 'Should find multiple active users');
    results.forEach(user => {
      TestFramework.assertTrue(user.active, 'All found users should be active');
    });
  });

  suite.addTest('should count documents by query accurately', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test documents
    const testUsers = MockQueryData.getTestUsers();
    testUsers.forEach(user => docOps.insertDocument(user));
    // Act - Count active users
    const activeCount = docOps.countByQuery({ active: true });
    const totalCount = docOps.countByQuery({});
    const inactiveCount = docOps.countByQuery({ active: false });
    // Assert
    TestFramework.assertEquals('number', typeof activeCount, 'Active count should be a number');
    TestFramework.assertEquals('number', typeof totalCount, 'Total count should be a number');
    TestFramework.assertEquals('number', typeof inactiveCount, 'Inactive count should be a number');
    TestFramework.assertEquals(totalCount, activeCount + inactiveCount, 'Counts should add up correctly');
    TestFramework.assertTrue(activeCount >= 2, 'Should find at least 2 active users');
  });

  suite.addTest('should handle QueryEngine integration errors properly', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act & Assert - Invalid query should throw InvalidQueryError
    TestFramework.assertThrows(() => {
      docOps.findByQuery({ age: { $invalidOperator: 25 } });
    }, InvalidQueryError, 'Should throw InvalidQueryError for unsupported operator');
    TestFramework.assertThrows(() => {
      docOps.findByQuery(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null query');
    TestFramework.assertThrows(() => {
      docOps.countByQuery("invalid query");
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for string query');
  });

  suite.addTest('should handle empty results for non-matching queries', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test documents
    const testUsers = MockQueryData.getTestUsers();
    testUsers.forEach(user => docOps.insertDocument(user));
    // Act - Search for non-existent data
    const singleResult = docOps.findByQuery({ name: "NonExistent User" });
    const multipleResults = docOps.findMultipleByQuery({ age: { $gt: 100 } });
    const countResult = docOps.countByQuery({ active: "maybe" });
    // Assert
    TestFramework.assertNull(singleResult, 'findByQuery should return null for no matches');
    TestFramework.assertTrue(Array.isArray(multipleResults), 'findMultipleByQuery should return array');
    TestFramework.assertEquals(0, multipleResults.length, 'findMultipleByQuery should return empty array for no matches');
    TestFramework.assertEquals(0, countResult, 'countByQuery should return 0 for no matches');
  });

  suite.addTest('should handle large result sets efficiently', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert large dataset
    const largeDataset = MockQueryData.getLargeDataset(100); // 100 documents
    largeDataset.forEach(doc => docOps.insertDocument(doc));
    const startTime = new Date().getTime();
    // Act - Query large dataset
    const results = docOps.findMultipleByQuery({ category: "test" });
    const count = docOps.countByQuery({ category: "test" });
    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    // Assert
    TestFramework.assertTrue(Array.isArray(results), 'Should return array for large dataset');
    TestFramework.assertEquals('number', typeof count, 'Count should be a number');
    TestFramework.assertTrue(duration < 1000, 'Query should complete within 1 second'); // Performance check
    TestFramework.assertTrue(results.length === count, 'Array length should match count');
  });

  suite.addTest('should maintain backwards compatibility with existing ID-based methods', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Insert test document
    const testDoc = { name: 'Compatibility Test', value: 42 };
    const inserted = docOps.insertDocument(testDoc);
    // Act & Assert - Existing methods should still work
    const foundById = docOps.findDocumentById(inserted._id);
    TestFramework.assertDefined(foundById, 'findDocumentById should still work');
    TestFramework.assertEquals(foundById._id, inserted._id, 'Found document should have correct ID');
    const allDocs = docOps.findAllDocuments();
    TestFramework.assertTrue(Array.isArray(allDocs), 'findAllDocuments should still work');
    TestFramework.assertTrue(allDocs.length >= 1, 'Should find at least one document');
    const exists = docOps.documentExists(inserted._id);
    TestFramework.assertTrue(exists, 'documentExists should still work');
    const count = docOps.countDocuments();
    TestFramework.assertEquals('number', typeof count, 'countDocuments should still work');
  });

  suite.addTest('should validate queries and propagate errors properly', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act & Assert - Test various invalid query scenarios
    TestFramework.assertThrows(() => {
      docOps.findByQuery(undefined);
    }, InvalidArgumentError, 'Should reject undefined query');
    TestFramework.assertThrows(() => {
      docOps.findMultipleByQuery([]);
    }, InvalidArgumentError, 'Should reject array query');
    TestFramework.assertThrows(() => {
      docOps.countByQuery({ $invalidOperator: [] });
    }, InvalidQueryError, 'Should reject queries with invalid operators');
    // Test malformed nested queries
    TestFramework.assertThrows(() => {
      docOps.findByQuery({ $and: "not an array" });
    }, InvalidQueryError, 'Should reject malformed $and query');
  });

  return suite;
}
