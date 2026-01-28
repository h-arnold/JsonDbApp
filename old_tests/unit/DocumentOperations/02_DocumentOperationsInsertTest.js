// DocumentOperations Insert Operations Tests

function createDocumentOperationsInsertTestSuite() {
  const suite = new TestSuite('DocumentOperations Insert Operations');
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);

  suite.addTest('should insert document with automatic ID generation', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc = { name: 'Test User', email: 'test@example.com' };
    // Act
    const result = docOps.insertDocument(testDoc);
    // Assert
    TestFramework.assertDefined(result, 'Insert result should be defined');
    TestFramework.assertDefined(result._id, 'Inserted document should have _id');
    TestFramework.assertEquals('string', typeof result._id, 'Document _id should be string');
    TestFramework.assertTrue(result._id.length > 0, 'Document _id should not be empty');
    TestFramework.assertEquals(result.name, testDoc.name, 'Document name should be preserved');
    TestFramework.assertEquals(result.email, testDoc.email, 'Document email should be preserved');
    // Verify document was saved to Drive
    testCollection._loadData();
    const savedDoc = testCollection._documents[result._id];
    TestFramework.assertDefined(savedDoc, 'Document should be saved to Drive');
    TestFramework.assertEquals(savedDoc.name, testDoc.name, 'Saved document name should match');
  });

  suite.addTest('should insert document with provided ID when valid', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const customId = 'custom-id-123';
    const testDoc = { _id: customId, name: 'Test User', email: 'test@example.com' };
    // Act
    const result = docOps.insertDocument(testDoc);
    // Assert
    TestFramework.assertDefined(result, 'Insert result should be defined');
    TestFramework.assertEquals(result._id, customId, 'Document should retain provided _id');
    TestFramework.assertEquals(result.name, testDoc.name, 'Document name should be preserved');
    TestFramework.assertEquals(result.email, testDoc.email, 'Document email should be preserved');
    // Verify document was saved to Drive with correct ID
    testCollection._loadData();
    const savedDoc = testCollection._documents[customId];
    TestFramework.assertDefined(savedDoc, 'Document should be saved to Drive with custom ID');
  });

  suite.addTest('should throw error when inserting document with duplicate ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const duplicateId = 'duplicate-id-123';
    const firstDoc = { _id: duplicateId, name: 'First User' };
    const secondDoc = { _id: duplicateId, name: 'Second User' };
    // Act - Insert first document
    docOps.insertDocument(firstDoc);
    // Assert - Second insert should fail
    TestFramework.assertThrows(() => {
      docOps.insertDocument(secondDoc);
    }, ConflictError, 'Should throw ConflictError for duplicate ID');
  });

  suite.addTest('should throw error when inserting invalid document', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.insertDocument(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null document');
    TestFramework.assertThrows(() => {
      docOps.insertDocument(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for undefined document');
    TestFramework.assertThrows(() => {
      docOps.insertDocument('not-an-object');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for string');
    TestFramework.assertThrows(() => {
      docOps.insertDocument([]);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for array');
  });

  return suite;
}
