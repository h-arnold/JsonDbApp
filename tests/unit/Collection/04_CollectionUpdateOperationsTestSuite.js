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
    
    const collection = new Collection(
      'updateOneUnsupportedOperatorsTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ name: 'Test Doc', value: 100 });
    const docId = insertResult.insertedId;
    
    // Test $set operator - should now work with Section 7 implementation
    const updateResult = collection.updateOne({ _id: docId }, { $set: { name: 'Updated' } });
    
    // Assert - Should succeed and update the document
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match one document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify one document');
    TestFramework.assertTrue(updateResult.acknowledged, 'Should be acknowledged');
    
    // Verify document was updated
    const updatedDoc = collection.findOne({ _id: docId });
    TestFramework.assertEquals('Updated', updatedDoc.name, 'Should have updated name');
    TestFramework.assertEquals(100, updatedDoc.value, 'Should preserve other fields');
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
  
  // RED PHASE: Collection API Enhancement Tests - New Methods and Advanced Operations
  
  suite.addTest('testCollectionUpdateManyReturnsModifiedCount', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateManyTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ department: 'Engineering', level: 'Junior', salary: 70000 });
    collection.insertOne({ department: 'Engineering', level: 'Senior', salary: 90000 });
    collection.insertOne({ department: 'Marketing', level: 'Junior', salary: 65000 });
    collection.insertOne({ department: 'Engineering', level: 'Principal', salary: 120000 });
    
    // Act - RED PHASE: This should fail because updateMany doesn't exist yet
    const updateResult = collection.updateMany(
      { department: 'Engineering' },
      { $inc: { salary: 5000 } }
    );
    
    // Assert - When implemented, should update multiple documents
    TestFramework.assertEquals(3, updateResult.matchedCount, 'Should match 3 Engineering documents');
    TestFramework.assertEquals(3, updateResult.modifiedCount, 'Should modify 3 Engineering documents');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should be acknowledged');
  });
  
  suite.addTest('testCollectionReplaceOneById', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'replaceOneByIdTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ 
      name: 'Original Doc', 
      value: 100, 
      status: 'active',
      metadata: { created: new Date(), version: 1 }
    });
    const docId = insertResult.insertedId;
    
    // Act - RED PHASE: This should fail because replaceOne doesn't exist yet
    const replacementDoc = { 
      name: 'Completely Replaced', 
      description: 'This is a completely new document',
      version: 2
    };
    const replaceResult = collection.replaceOne({ _id: docId }, replacementDoc);
    
    // Assert - When implemented, should completely replace the document
    TestFramework.assertEquals(1, replaceResult.matchedCount, 'Should match 1 document');
    TestFramework.assertEquals(1, replaceResult.modifiedCount, 'Should replace 1 document');
    TestFramework.assertTrue(replaceResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify document was completely replaced (old fields gone, new fields present)
    const replacedDoc = collection.findOne({ _id: docId });
    TestFramework.assertEquals('Completely Replaced', replacedDoc.name, 'Should have new name');
    TestFramework.assertEquals('This is a completely new document', replacedDoc.description, 'Should have new description');
    TestFramework.assertEquals(2, replacedDoc.version, 'Should have new version');
    TestFramework.assertUndefined(replacedDoc.value, 'Should not have old value field');
    TestFramework.assertUndefined(replacedDoc.status, 'Should not have old status field');
    TestFramework.assertUndefined(replacedDoc.metadata, 'Should not have old metadata field');
  });
  
  suite.addTest('testCollectionReplaceOneByFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'replaceOneByFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', role: 'Developer' });
    collection.insertOne({ name: 'Bob', department: 'Engineering', role: 'Manager' });
    collection.insertOne({ name: 'Charlie', department: 'Marketing', role: 'Analyst' });
    
    // Act - RED PHASE: This should fail because replaceOne doesn't exist yet
    const replacementDoc = { 
      name: 'Alice Smith', 
      department: 'Product', 
      role: 'Product Manager',
      startDate: new Date()
    };
    const replaceResult = collection.replaceOne({ name: 'Alice' }, replacementDoc);
    
    // Assert - When implemented, should replace first matching document
    TestFramework.assertEquals(1, replaceResult.matchedCount, 'Should match 1 document');
    TestFramework.assertEquals(1, replaceResult.modifiedCount, 'Should replace 1 document');
    TestFramework.assertTrue(replaceResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was replaced
    const replacedDoc = collection.findOne({ name: 'Alice Smith' });
    TestFramework.assertNotNull(replacedDoc, 'Should find replaced document');
    TestFramework.assertEquals('Product', replacedDoc.department, 'Should have new department');
    TestFramework.assertEquals('Product Manager', replacedDoc.role, 'Should have new role');
    TestFramework.assertNotNull(replacedDoc.startDate, 'Should have new startDate field');
  });
  
  suite.addTest('testCollectionReplaceCorrectDocument', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'replaceCorrectDocTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents with similar properties
    collection.insertOne({ name: 'Alice', age: 30, department: 'Engineering' });
    collection.insertOne({ name: 'Alice', age: 25, department: 'Marketing' });
    collection.insertOne({ name: 'Bob', age: 30, department: 'Engineering' });
    
    // Act - RED PHASE: This should fail because replaceOne doesn't exist yet
    const replacementDoc = { 
      name: 'Alice Senior', 
      age: 31, 
      department: 'Engineering',
      title: 'Senior Engineer'
    };
    const replaceResult = collection.replaceOne({ name: 'Alice', age: 30 }, replacementDoc);
    
    // Assert - When implemented, should replace only the specific matching document
    TestFramework.assertEquals(1, replaceResult.matchedCount, 'Should match 1 specific document');
    TestFramework.assertEquals(1, replaceResult.modifiedCount, 'Should replace 1 document');
    
    // Verify correct document was replaced and others remain unchanged
    const replacedDoc = collection.findOne({ name: 'Alice Senior' });
    TestFramework.assertNotNull(replacedDoc, 'Should find replaced document');
    TestFramework.assertEquals(31, replacedDoc.age, 'Should have new age');
    TestFramework.assertEquals('Senior Engineer', replacedDoc.title, 'Should have new title');
    
    // Verify other Alice document is unchanged
    const otherAlice = collection.findOne({ name: 'Alice', age: 25 });
    TestFramework.assertNotNull(otherAlice, 'Other Alice document should remain');
    TestFramework.assertEquals('Marketing', otherAlice.department, 'Other Alice should be unchanged');
  });
  
  suite.addTest('testCollectionUpdateWithMultipleOperators', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateMultipleOperatorsTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ 
      name: 'Test User',
      stats: { score: 100, level: 1 },
      tags: ['beginner'],
      lastActive: new Date('2023-01-01')
    });
    const docId = insertResult.insertedId;
    
    // Act - Should now work with Section 7 implementation (multiple operators supported)
    const updateResult = collection.updateOne({ _id: docId }, {
      $set: { name: 'Advanced User', lastActive: new Date('2024-01-01') },
      $inc: { 'stats.score': 50, 'stats.level': 1 },
      $push: { tags: 'advanced' }
    });
    
    // Assert - Should succeed and apply all operators
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match one document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify one document');
    TestFramework.assertTrue(updateResult.acknowledged, 'Should be acknowledged');
    
    // Verify all updates were applied
    const updatedDoc = collection.findOne({ _id: docId });
    TestFramework.assertEquals('Advanced User', updatedDoc.name, 'Should have updated name');
    TestFramework.assertEquals(150, updatedDoc.stats.score, 'Should have incremented score');
    TestFramework.assertEquals(2, updatedDoc.stats.level, 'Should have incremented level');
    TestFramework.assertTrue(updatedDoc.tags.includes('beginner'), 'Should preserve original tag');
    TestFramework.assertTrue(updatedDoc.tags.includes('advanced'), 'Should have added new tag');
  });
  
  suite.addTest('testCollectionErrorPropagation', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'errorPropagationTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test invalid filter parameter
    TestFramework.assertThrows(() => {
      collection.updateOne(null, { name: 'Updated' });
    }, InvalidArgumentError, 'Should propagate InvalidArgumentError for null filter');
    
    // Test invalid update parameter
    TestFramework.assertThrows(() => {
      collection.updateOne({ _id: 'test' }, null);
    }, InvalidArgumentError, 'Should propagate InvalidArgumentError for null update');
    
    // Test empty update object
    TestFramework.assertThrows(() => {
      collection.updateOne({ _id: 'test' }, {});
    }, InvalidArgumentError, 'Should throw error for empty update object');
  });
  
  suite.addTest('testCollectionLockingDuringUpdate', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'lockingDuringUpdateTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ name: 'Lock Test', value: 100 });
    const docId = insertResult.insertedId;
    
    // Act & Assert - Should fail in Red phase (advanced locking not implemented)
    // This test will initially pass with basic functionality but fail when we add proper locking
    const updateResult = collection.updateOne({ _id: docId }, { name: 'Updated', value: 200 });
    
    // Basic assertion that should work with current implementation
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should update document');
    
    // TODO: Add proper lock testing when Section 8 coordination is implemented
    // For now, this serves as a placeholder for future lock validation
  });
  
  suite.addTest('testCollectionUpdateLogging', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateLoggingTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ name: 'Log Test', value: 100 });
    const docId = insertResult.insertedId;
    
    // Act - Perform update operation
    const updateResult = collection.updateOne({ _id: docId }, { name: 'Updated Log Test', value: 200 });
    
    // Assert - Basic functionality works (logging validation requires Section 8)
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should update document');
    
    // TODO: Add proper logging verification when enhanced logging is implemented
    // For now, this ensures the operation completes without logging errors
  });

  return suite;
}