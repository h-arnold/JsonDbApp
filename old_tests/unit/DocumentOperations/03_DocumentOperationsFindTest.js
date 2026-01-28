// DocumentOperations Find Operations Tests

function createDocumentOperationsFindTestSuite() {
  const suite = new TestSuite('DocumentOperations Find Operations');
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);

  suite.addTest('should find document by valid ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc = { name: 'Findable User', email: 'findable@example.com' };
    const insertedDoc = docOps.insertDocument(testDoc);
    // Act
    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    // Assert
    TestFramework.assertDefined(foundDoc, 'Found document should be defined');
    TestFramework.assertEquals(foundDoc._id, insertedDoc._id, 'Found document should have correct _id');
    TestFramework.assertEquals(foundDoc.name, testDoc.name, 'Found document should have correct name');
    TestFramework.assertEquals(foundDoc.email, testDoc.email, 'Found document should have correct email');
  });

  suite.addTest('should return null when document not found by ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const nonExistentId = 'non-existent-id-123';
    // Act
    const foundDoc = docOps.findDocumentById(nonExistentId);
    // Assert
    TestFramework.assertNull(foundDoc, 'Should return null for non-existent document');
  });

  suite.addTest('should throw error when finding with invalid ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.findDocumentById(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null ID');
    TestFramework.assertThrows(() => {
      docOps.findDocumentById(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for undefined ID');
    TestFramework.assertThrows(() => {
      docOps.findDocumentById('');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty string ID');
  });

  suite.addTest('should find all documents when collection has content', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc1 = { name: 'User One', email: 'one@example.com' };
    const testDoc2 = { name: 'User Two', email: 'two@example.com' };
    const testDoc3 = { name: 'User Three', email: 'three@example.com' };
    docOps.insertDocument(testDoc1);
    docOps.insertDocument(testDoc2);
    docOps.insertDocument(testDoc3);
    // Act
    const allDocs = docOps.findAllDocuments();
    // Assert
    TestFramework.assertDefined(allDocs, 'All documents result should be defined');
    TestFramework.assertTrue(Array.isArray(allDocs), 'Should return an array');
    TestFramework.assertEquals(allDocs.length, 3, 'Should return all 3 documents');
    // Verify all documents are present
    const names = allDocs.map(doc => doc.name);
    TestFramework.assertTrue(names.includes('User One'), 'Should include User One');
    TestFramework.assertTrue(names.includes('User Two'), 'Should include User Two');
    TestFramework.assertTrue(names.includes('User Three'), 'Should include User Three');
  });

  suite.addTest('should return empty array when finding all documents in empty collection', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act
    const allDocs = docOps.findAllDocuments();
    // Assert
    TestFramework.assertDefined(allDocs, 'All documents result should be defined');
    TestFramework.assertTrue(Array.isArray(allDocs), 'Should return an array');
    TestFramework.assertEquals(allDocs.length, 0, 'Should return empty array for empty collection');
  });

  return suite;
}
