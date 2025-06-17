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

  // Advanced update operation tests
  suite.addTest('should update document with operators by ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const original = { name: 'Alice', age: 30, tags: ['user'] };
    const inserted = docOps.insertDocument(original);
    const ops = { $inc: { age: 5 }, $push: { tags: 'admin' } };
    // Act
    const result = docOps.updateDocumentWithOperators(inserted._id, ops);
    // Assert
    TestFramework.assertDefined(result, 'Result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Operation should be acknowledged');
    TestFramework.assertEquals(result.modifiedCount, 1, 'Should modify one document');
    const updated = docOps.findDocumentById(inserted._id);
    TestFramework.assertEquals(updated.age, 35, 'Age should be incremented');
    TestFramework.assertTrue(Array.isArray(updated.tags), 'Tags should be array');
    TestFramework.assertTrue(updated.tags.includes('admin'), 'Tag should be added');
    // Verify persisted
    testCollection._loadData();
    const saved = testCollection._documents[inserted._id];
    TestFramework.assertEquals(saved.age, 35, 'Persisted age updated');
    TestFramework.assertTrue(saved.tags.includes('admin'), 'Persisted tags updated');
  });

  suite.addTest('should update documents matching query with single match', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const a = docOps.insertDocument({ name: 'Bob', score: 10 });
    docOps.insertDocument({ name: 'Carol', score: 5 });
    const ops = { $set: { passed: true } };
    // Act
    const count = docOps.updateDocumentByQuery({ score: { $gt: 8 } }, ops);
    // Assert
    TestFramework.assertEquals(count, 1, 'Should update one document');
    const updated = docOps.findDocumentById(a._id);
    TestFramework.assertTrue(updated.passed, 'Field should be set');
  });

  suite.addTest('should update documents matching query with multiple matches', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const u1 = docOps.insertDocument({ name: 'Eve', active: false });
    const u2 = docOps.insertDocument({ name: 'Frank', active: false });
    docOps.insertDocument({ name: 'Grace', active: true });
    const ops = { $set: { active: true } };
    // Act
    const count = docOps.updateDocumentByQuery({ active: false }, ops);
    // Assert
    TestFramework.assertEquals(count, 2, 'Should update two documents');
    [u1, u2].forEach(u => {
      const doc = docOps.findDocumentById(u._id);
      TestFramework.assertTrue(doc.active, 'Document should be active');
    });
  });

  suite.addTest('should throw error when updateByQuery finds no matches', function() {
    // Arrange
    const docOps = new DocumentOperations(DOCUMENT_OPERATIONS_TEST_DATA.testCollection);
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.updateDocumentByQuery({ missing: true }, { $set: { x: 1 } });
    }, DocumentNotFoundError, 'Should throw when no documents match');
  });

  suite.addTest('should replace document by ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const orig = docOps.insertDocument({ a: 1, b: 2 });
    const replacement = { a: 9, c: 3 };
    // Act
    const result = docOps.replaceDocument(orig._id, replacement);
    // Assert
    TestFramework.assertTrue(result.acknowledged, 'Replace should be acknowledged');
    TestFramework.assertEquals(result.modifiedCount, 1, 'Should replace one document');
    const found = docOps.findDocumentById(orig._id);
    TestFramework.assertEquals(found.a, 9, 'Field a replaced');
    TestFramework.assertUndefined(found.b, 'Field b removed');
    TestFramework.assertEquals(found.c, 3, 'Field c added');
  });

  suite.addTest('should replace documents matching query', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const d1 = docOps.insertDocument({ val: 0 });
    docOps.insertDocument({ val: 1 });
    const replacement = { val: 100 };
    // Act
    const count = docOps.replaceDocumentByQuery({ val: 0 }, replacement);
    // Assert
    TestFramework.assertEquals(count, 1, 'Should replace one document');
    const updated = docOps.findDocumentById(d1._id);
    TestFramework.assertEquals(updated.val, 100, 'Value should be replaced');
  });

  suite.addTest('should integrate with UpdateEngine for operator-based updates', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const doc = docOps.insertDocument({ nested: { count: 2 } });
    const ops = { $set: { 'nested.count': 5 } };
    // Act
    const result = docOps.updateDocumentWithOperators(doc._id, ops);
    // Assert
    TestFramework.assertEquals(docOps.findDocumentById(doc._id).nested.count, 5, 'Nested field should update');
  });

  suite.addTest('should throw error for unsupported update operators', function() {
    // Arrange
    const docOps = new DocumentOperations(DOCUMENT_OPERATIONS_TEST_DATA.testCollection);
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.updateDocumentWithOperators('any-id', { '$invalidOp': {} });
    }, InvalidQueryError, 'Should throw for unsupported operator');
  });

  suite.addTest('should throw error when no operators provided to updateDocumentWithOperators', function() {
    // Arrange
    const docOps = new DocumentOperations(DOCUMENT_OPERATIONS_TEST_DATA.testCollection);
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.updateDocumentWithOperators('any-id', { invalidField: 'value' });
    }, InvalidArgumentError, 'Should throw when no operators provided');
  });

  return suite;
}
