// DocumentOperations Update Operations Tests

function createDocumentOperationsUpdateTestSuite() {
  const suite = new TestSuite('DocumentOperations Update Operations');
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);

  suite.addTest('should update existing document by ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const originalDoc = { name: 'Original User', email: 'original@example.com' };
    const insertedDoc = docOps.insertDocument(originalDoc);
    const updatedData = { name: 'Updated User', email: 'updated@example.com', status: 'active' };
    // Act
    const result = docOps.updateDocument(insertedDoc._id, updatedData);
    // Assert
    TestFramework.assertDefined(result, 'Update result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Update should be acknowledged');
    TestFramework.assertEquals(result.modifiedCount, 1, 'Should modify 1 document');
    // Verify document was updated in memory
    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    TestFramework.assertEquals(foundDoc.name, updatedData.name, 'Document name should be updated');
    TestFramework.assertEquals(foundDoc.email, updatedData.email, 'Document email should be updated');
    TestFramework.assertEquals(foundDoc.status, updatedData.status, 'New fields should be added');
    TestFramework.assertEquals(foundDoc._id, insertedDoc._id, 'Document _id should be preserved');
    // Verify document was updated in Drive
    testCollection._loadData();
    const savedDoc = testCollection._documents[insertedDoc._id];
    TestFramework.assertEquals(savedDoc.name, updatedData.name, 'Saved document should be updated');
  });

  suite.addTest('should return error result when updating non-existent document', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const nonExistentId = 'non-existent-id-456';
    const updateData = { name: 'Updated User' };
    // Act
    const result = docOps.updateDocument(nonExistentId, updateData);
    // Assert
    TestFramework.assertDefined(result, 'Update result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Update should be acknowledged');
    TestFramework.assertEquals(result.modifiedCount, 0, 'Should modify 0 documents');
  });

  suite.addTest('should throw error when updating with invalid parameters', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.updateDocument(null, { name: 'Test' });
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null ID');
    TestFramework.assertThrows(() => {
      docOps.updateDocument('valid-id', null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null update data');
    TestFramework.assertThrows(() => {
      docOps.updateDocument('', { name: 'Test' });
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty ID');
    TestFramework.assertThrows(() => {
      docOps.updateDocument('valid-id', 'not-an-object');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-object update data');
  });

  return suite;
}
