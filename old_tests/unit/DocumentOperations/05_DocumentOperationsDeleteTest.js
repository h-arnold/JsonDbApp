// DocumentOperations Delete Operations Tests

function createDocumentOperationsDeleteTestSuite() {
  const suite = new TestSuite('DocumentOperations Delete Operations');
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);

  suite.addTest('should delete existing document by ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc = { name: 'Deletable User', email: 'deletable@example.com' };
    const insertedDoc = docOps.insertDocument(testDoc);
    // Act
    const result = docOps.deleteDocument(insertedDoc._id);
    // Assert
    TestFramework.assertDefined(result, 'Delete result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Delete should be acknowledged');
    TestFramework.assertEquals(result.deletedCount, 1, 'Should delete 1 document');
    // Verify document was deleted from memory
    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    TestFramework.assertNull(foundDoc, 'Document should no longer exist');
    // Verify document was deleted from Drive
    testCollection._loadData();
    const savedDoc = testCollection._documents[insertedDoc._id];
    TestFramework.assertUndefined(savedDoc, 'Document should be deleted from Drive');
  });

  suite.addTest('should return error result when deleting non-existent document', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const nonExistentId = 'non-existent-id-789';
    // Act
    const result = docOps.deleteDocument(nonExistentId);
    // Assert
    TestFramework.assertDefined(result, 'Delete result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Delete should be acknowledged');
    TestFramework.assertEquals(result.deletedCount, 0, 'Should delete 0 documents');
  });

  suite.addTest('should throw error when deleting with invalid ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.deleteDocument(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null ID');
    TestFramework.assertThrows(() => {
      docOps.deleteDocument(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for undefined ID');
    TestFramework.assertThrows(() => {
      docOps.deleteDocument('');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty string ID');
  });

  return suite;
}
