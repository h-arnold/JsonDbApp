/**
 * Creates a test suite for verifying Collection delete operations.
 *
 * The suite includes tests for:
 * - Deleting a document by its _id.
 * - Deleting documents using field-based filters.
 * - Deleting documents using multiple field filters.
 * - Deleting documents using nested field filters.
 * - Deleting documents using comparison operators in filters.
 * - Ensuring no documents are deleted when the filter matches none.
 *
 * @function
 * @returns {TestSuite} The configured test suite for Collection delete operations.
 */
/**
 * Test Collection delete operations
 */
function createCollectionDeleteOperationsTestSuite() {
  const suite = new TestSuite('Collection Delete Operations');
  
  suite.addTest('testCollectionDeleteOneById', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('deleteOneByIdTestCollection');
    
    // Insert test documents
    const doc1 = collection.insertOne({ name: 'Delete Doc 1', value: 100 });
    const doc2 = collection.insertOne({ name: 'Delete Doc 2', value: 200 });
    
    // Test deleteOne by ID
    const deleteResult = collection.deleteOne({ _id: doc1.insertedId });
    
    // Verify MongoDB-compatible return format
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
  });
  
  suite.addTest('testCollectionDeleteOneUnsupportedFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('deleteOneUnsupportedFilterTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Test', value: 100 });
    collection.insertOne({ name: 'Other', value: 200 });
    
    // Test field-based filter - should work with QueryEngine
    const deleteResult = collection.deleteOne({ name: 'Test' });
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 document by field-based filter');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify delete worked
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(1, remainingDocs.length, 'Should have 1 document remaining');
    TestFramework.assertEquals('Other', remainingDocs[0].name, 'Remaining document should be Other');
  });
  
  // RED PHASE: Collection API Enhancement Tests - Field-based delete filters
  suite.addTest('testCollectionDeleteOneByFieldFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('deleteFieldFilterTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active' });
    collection.insertOne({ name: 'Bob', department: 'Marketing', status: 'active' });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'inactive' });
    
    // Act & Assert - Should delete first matching document by field filter
    const deleteResult = collection.deleteOne({ department: 'Engineering' });
    
    // Verify MongoDB-compatible return format
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was deleted (one Engineering doc should remain)
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(2, remainingDocs.length, 'Should have 2 documents remaining');
    
    const engineeringDocs = collection.find({ department: 'Engineering' });
    TestFramework.assertEquals(1, engineeringDocs.length, 'Should have 1 Engineering document remaining');
  });
  
  suite.addTest('testCollectionDeleteOneByMultipleFieldFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('deleteMultiFieldFilterTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active', level: 'Senior' });
    collection.insertOne({ name: 'Bob', department: 'Engineering', status: 'inactive', level: 'Senior' });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'active', level: 'Junior' });
    
    // Act & Assert - Should delete document matching multiple field criteria
    const deleteResult = collection.deleteOne({ 
      department: 'Engineering', 
      status: 'active', 
      level: 'Senior' 
    });
    
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 document matching all criteria');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was deleted
    const remainingDocs = collection.find({ department: 'Engineering' });
    TestFramework.assertEquals(2, remainingDocs.length, 'Should have 2 Engineering documents remaining');
    
    const activeEngineerDocs = collection.find({ department: 'Engineering', status: 'active' });
    TestFramework.assertEquals(1, activeEngineerDocs.length, 'Should have 1 active Engineering document remaining');
    TestFramework.assertEquals('Charlie', activeEngineerDocs[0].name, 'Charlie should remain');
  });
  
  suite.addTest('testCollectionDeleteOneByNestedFieldFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('deleteNestedFieldFilterTestCollection');
    
    // Insert documents with nested fields
    collection.insertOne({ 
      name: 'Alice', 
      profile: { email: 'alice@company.com', team: 'Backend' },
      settings: { notifications: true }
    });
    collection.insertOne({ 
      name: 'Bob', 
      profile: { email: 'bob@company.com', team: 'Frontend' },
      settings: { notifications: false }
    });
    collection.insertOne({ 
      name: 'Charlie', 
      profile: { email: 'charlie@company.com', team: 'Backend' },
      settings: { notifications: true }
    });
    
    // Act & Assert - Should delete document by nested field filter
    const deleteResult = collection.deleteOne({ 'profile.team': 'Frontend' });
    
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 Frontend document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was deleted
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(2, remainingDocs.length, 'Should have 2 documents remaining');
    
    const frontendDocs = collection.find({ 'profile.team': 'Frontend' });
    TestFramework.assertEquals(0, frontendDocs.length, 'Should have no Frontend documents remaining');
  });
  
  suite.addTest('testCollectionDeleteOneByComparisonFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('deleteComparisonFilterTestCollection');
    
    // Insert test documents with numeric values
    collection.insertOne({ name: 'Alice', score: 85, lastActive: new Date('2023-01-15') });
    collection.insertOne({ name: 'Bob', score: 92, lastActive: new Date('2023-01-20') });
    collection.insertOne({ name: 'Charlie', score: 78, lastActive: new Date('2023-01-10') });
    
    // Act & Assert - Should delete first document matching comparison filter
    const deleteResult = collection.deleteOne({ score: { $lt: 80 } });
    
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 low-score document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was deleted
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(2, remainingDocs.length, 'Should have 2 documents remaining');
    
    const lowScoreDocs = collection.find({ score: { $lt: 80 } });
    TestFramework.assertEquals(0, lowScoreDocs.length, 'Should have no low-score documents remaining');
  });
  
  suite.addTest('testCollectionDeleteOneNoMatch', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('deleteNoMatchTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering' });
    collection.insertOne({ name: 'Bob', department: 'Marketing' });
    
    // Act & Assert - Should return zero deletions when filter matches no documents
    const deleteResult = collection.deleteOne({ department: 'NonExistent' });
    
    TestFramework.assertEquals(0, deleteResult.deletedCount, 'Should delete 0 documents');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should still be acknowledged');
    
    // Verify no documents were deleted
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(2, remainingDocs.length, 'Should still have 2 documents');
  });
  
  return suite;
}
