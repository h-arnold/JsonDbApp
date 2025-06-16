/**
 * Creates a test suite for Collection update operations.
 *
 * This suite covers:
 * - Updating a document by its ID.
 * - Updating documents using field-based filters, including multiple fields and nested fields.
 * - Handling unsupported update operators.
 * - Updating documents using comparison filters (e.g., $gt).
 * - Verifying update results and MongoDB-compatible return formats.
 * - Ensuring correct behavior when no documents match the update filter.
 *
 * @function
 * @returns {TestSuite} The configured test suite for Collection update operations.
 */
/**
 * Test Collection update operations
 */
function createCollectionUpdateOperationsTestSuite() {
  const suite = new TestSuite('Collection Update Operations');
  
  suite.addTest('testCollectionUpdateOneById', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'updateOneByIdTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ name: 'Original Doc', value: 100, status: 'active' });
    const docId = insertResult.insertedId;
    
    // Test updateOne by ID with document replacement
    const updateDoc = { name: 'Updated Doc', value: 150, status: 'modified', newField: 'added' };
    const updateResult = collection.updateOne({ _id: docId }, updateDoc);
    
    // Verify MongoDB-compatible return format
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should be acknowledged');
  });
  
  suite.addTest('testCollectionUpdateOneUnsupportedFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Collection API now supports field-based queries with QueryEngine
    const collection = new Collection(
      'updateOneUnsupportedFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    collection.insertOne({ name: 'Test', value: 100 });
    
    // Test field-based filter - should work with QueryEngine
    const updateResult = collection.updateOne({ name: 'Test' }, { name: 'Updated', value: 200 });
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 document by field-based filter');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify update worked
    const updatedDoc = collection.findOne({ name: 'Updated' });
    TestFramework.assertNotNull(updatedDoc, 'Should find updated document');
    TestFramework.assertEquals(200, updatedDoc.value, 'Should have updated value');
  });
  
  suite.addTest('testCollectionUpdateOneUnsupportedOperators', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'updateOneUnsupportedOperatorsTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ name: 'Test Doc', value: 100 });
    const docId = insertResult.insertedId;
    
    // Test unsupported $set operator - should throw with Section 7 message
    TestFramework.assertThrows(() => {
      collection.updateOne({ _id: docId }, { $set: { name: 'Updated' } });
    }, OperationError, 'Should throw OperationError for $set operator');
  });
  
  // RED PHASE: Collection API Enhancement Tests - Field-based update filters
  suite.addTest('testCollectionUpdateOneByFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', salary: 75000 });
    collection.insertOne({ name: 'Bob', department: 'Marketing', salary: 65000 });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', salary: 80000 });
    
    // Act & Assert - Should update first matching document by field filter
    const updateResult = collection.updateOne(
      { department: 'Engineering' },
      { name: 'Alice Updated', department: 'Engineering', salary: 85000 }
    );
    
    // Verify MongoDB-compatible return format
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify only first matching document was updated
    const engineeringDocs = collection.find({ department: 'Engineering' });
    TestFramework.assertEquals(2, engineeringDocs.length, 'Should still have 2 Engineering docs');
    
    const updatedDoc = engineeringDocs.find(doc => doc.name === 'Alice Updated');
    TestFramework.assertNotNull(updatedDoc, 'Should find updated Alice document');
    TestFramework.assertEquals(85000, updatedDoc.salary, 'Salary should be updated');
  });
  
  suite.addTest('testCollectionUpdateOneByMultipleFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateMultiFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', level: 'Senior', active: true });
    collection.insertOne({ name: 'Bob', department: 'Engineering', level: 'Junior', active: true });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', level: 'Senior', active: false });
    
    // Act & Assert - Should update document matching multiple field criteria
    const updateResult = collection.updateOne(
      { department: 'Engineering', level: 'Senior', active: true },
      { name: 'Alice Promoted', department: 'Engineering', level: 'Principal', active: true }
    );
    
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 document with all criteria');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    
    // Verify correct document was updated
    const promotedDoc = collection.findOne({ level: 'Principal' });
    TestFramework.assertNotNull(promotedDoc, 'Should find promoted document');
    TestFramework.assertEquals('Alice Promoted', promotedDoc.name, 'Should be updated Alice');
  });
  
  suite.addTest('testCollectionUpdateOneByNestedFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateNestedFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert documents with nested fields
    collection.insertOne({ 
      name: 'Alice', 
      profile: { email: 'alice@company.com', team: 'Backend' },
      metadata: { lastLogin: new Date('2023-01-15') }
    });
    collection.insertOne({ 
      name: 'Bob', 
      profile: { email: 'bob@company.com', team: 'Frontend' },
      metadata: { lastLogin: new Date('2023-01-20') }
    });
    
    // Act & Assert - Should update document by nested field filter
    const updateResult = collection.updateOne(
      { 'profile.team': 'Backend' },
      { 
        name: 'Alice Backend Lead', 
        profile: { email: 'alice.lead@company.com', team: 'Backend' },
        metadata: { lastLogin: new Date() }
      }
    );
    
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 Backend document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    
    // Verify correct document was updated
    const updatedDoc = collection.findOne({ 'profile.email': 'alice.lead@company.com' });
    TestFramework.assertNotNull(updatedDoc, 'Should find updated document');
    TestFramework.assertEquals('Alice Backend Lead', updatedDoc.name, 'Should be updated Alice');
  });
  
  suite.addTest('testCollectionUpdateOneByComparisonFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateComparisonFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents with numeric values
    collection.insertOne({ name: 'Alice', score: 85, bonus: 1000 });
    collection.insertOne({ name: 'Bob', score: 92, bonus: 1500 });
    collection.insertOne({ name: 'Charlie', score: 78, bonus: 800 });
    
    // Act & Assert - Should update first document matching comparison filter
    const updateResult = collection.updateOne(
      { score: { $gt: 90 } },
      { name: 'Bob High Performer', score: 92, bonus: 2000 }
    );
    
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 high-score document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    
    // Verify correct document was updated
    const updatedDoc = collection.findOne({ bonus: 2000 });
    TestFramework.assertNotNull(updatedDoc, 'Should find updated document');
    TestFramework.assertEquals('Bob High Performer', updatedDoc.name, 'Should be updated Bob');
  });
  
  suite.addTest('testCollectionUpdateOneNoMatch', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateNoMatchTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering' });
    collection.insertOne({ name: 'Bob', department: 'Marketing' });
    
    // Act & Assert - Should return zero matches when filter matches no documents
    const updateResult = collection.updateOne(
      { department: 'NonExistent' },
      { name: 'Updated', department: 'NonExistent' }
    );
    
    TestFramework.assertEquals(0, updateResult.matchedCount, 'Should match 0 documents');
    TestFramework.assertEquals(0, updateResult.modifiedCount, 'Should modify 0 documents');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should still be acknowledged');
  });
  
  return suite;
}