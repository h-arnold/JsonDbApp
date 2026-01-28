// DocumentOperations Constructor Tests

function createDocumentOperationsConstructorTestSuite() {
  const suite = new TestSuite('DocumentOperations Constructor');
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);

  suite.addTest('should create DocumentOperations with valid collection reference', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    // Act
    const docOps = new DocumentOperations(testCollection);
    // Assert
    TestFramework.assertDefined(docOps, 'DocumentOperations should be created');
    TestFramework.assertEquals('function', typeof docOps.insertDocument, 'Should have insertDocument method');
    TestFramework.assertEquals('function', typeof docOps.findDocumentById, 'Should have findDocumentById method');
    TestFramework.assertEquals('function', typeof docOps.findAllDocuments, 'Should have findAllDocuments method');
    TestFramework.assertEquals('function', typeof docOps.updateDocument, 'Should have updateDocument method');
    TestFramework.assertEquals('function', typeof docOps.deleteDocument, 'Should have deleteDocument method');
    TestFramework.assertEquals('function', typeof docOps.countDocuments, 'Should have countDocuments method');
    TestFramework.assertEquals('function', typeof docOps.documentExists, 'Should have documentExists method');
  });

  return suite;
}
