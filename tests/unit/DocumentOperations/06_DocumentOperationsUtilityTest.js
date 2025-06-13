// DocumentOperations Utility and Helper Tests

function createDocumentOperationsUtilityTestSuite() {
  const suite = new TestSuite('DocumentOperations Utility Operations');
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);

  suite.addTest('should count documents correctly', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act & Assert - Empty collection
    let count = docOps.countDocuments();
    TestFramework.assertEquals(count, 0, 'Empty collection should have 0 documents');
    // Add documents and verify count
    docOps.insertDocument({ name: 'User 1' });
    count = docOps.countDocuments();
    TestFramework.assertEquals(count, 1, 'Collection should have 1 document');
    docOps.insertDocument({ name: 'User 2' });
    docOps.insertDocument({ name: 'User 3' });
    count = docOps.countDocuments();
    TestFramework.assertEquals(count, 3, 'Collection should have 3 documents');
    // Delete a document and verify count
    const allDocs = docOps.findAllDocuments();
    docOps.deleteDocument(allDocs[0]._id);
    count = docOps.countDocuments();
    TestFramework.assertEquals(count, 2, 'Collection should have 2 documents after deletion');
    // Verify count persists in Drive
    testCollection._loadData();
    const documentsInDrive = Object.keys(testCollection._documents).length;
    TestFramework.assertEquals(documentsInDrive, 2, 'Drive should also have 2 documents');
  });

  suite.addTest('should check document existence correctly', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc = { name: 'Existence Test User' };
    const insertedDoc = docOps.insertDocument(testDoc);
    // Act & Assert
    TestFramework.assertTrue(docOps.documentExists(insertedDoc._id), 'Should return true for existing document');
    TestFramework.assertFalse(docOps.documentExists('non-existent-id'), 'Should return false for non-existent document');
    // Verify existence persists in Drive
    testCollection._loadData();
    const existsInDrive = testCollection._documents.hasOwnProperty(insertedDoc._id);
    TestFramework.assertTrue(existsInDrive, 'Document should exist in Drive');
  });

  suite.addTest('should throw error when checking existence with invalid ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.documentExists(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null ID');
    TestFramework.assertThrows(() => {
      docOps.documentExists(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for undefined ID');
    TestFramework.assertThrows(() => {
      docOps.documentExists('');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty string ID');
  });

  suite.addTest('should generate valid document IDs', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act - Access private method via public interface (insert without ID)
    const doc1 = docOps.insertDocument({ name: 'Test 1' });
    const doc2 = docOps.insertDocument({ name: 'Test 2' });
    const doc3 = docOps.insertDocument({ name: 'Test 3' });
    // Assert
    TestFramework.assertDefined(doc1._id, 'Generated ID should be defined');
    TestFramework.assertDefined(doc2._id, 'Generated ID should be defined');
    TestFramework.assertDefined(doc3._id, 'Generated ID should be defined');
    TestFramework.assertEquals('string', typeof doc1._id, 'Generated ID should be string');
    TestFramework.assertEquals('string', typeof doc2._id, 'Generated ID should be string');
    TestFramework.assertEquals('string', typeof doc3._id, 'Generated ID should be string');
    TestFramework.assertTrue(doc1._id.length > 0, 'Generated ID should not be empty');
    TestFramework.assertTrue(doc2._id.length > 0, 'Generated ID should not be empty');
    TestFramework.assertTrue(doc3._id.length > 0, 'Generated ID should not be empty');
    // All IDs should be unique
    TestFramework.assertNotEquals(doc1._id, doc2._id, 'Generated IDs should be unique');
    TestFramework.assertNotEquals(doc1._id, doc3._id, 'Generated IDs should be unique');
    TestFramework.assertNotEquals(doc2._id, doc3._id, 'Generated IDs should be unique');
    // Verify IDs are saved properly in Drive
    testCollection._loadData();
    TestFramework.assertTrue(testCollection._documents.hasOwnProperty(doc1._id), 'Doc1 ID should exist in Drive');
    TestFramework.assertTrue(testCollection._documents.hasOwnProperty(doc2._id), 'Doc2 ID should exist in Drive');
    TestFramework.assertTrue(testCollection._documents.hasOwnProperty(doc3._id), 'Doc3 ID should exist in Drive');
  });

  return suite;
}
