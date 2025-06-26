/**
 * Creates a test suite for verifying the count operations of the Collection class.
 *
 * The suite includes tests for:
 * - Counting all documents in an empty and populated collection.
 * - Counting documents using field-based filters, including multiple fields and nested fields.
 * - Counting documents using comparison operators ($gt, $lt, $eq).
 * - Ensuring correct behavior when filters match no documents.
 *
 * @function
 * @returns {TestSuite} The test suite containing all count operation tests for the Collection class.
 */
/**
 * Test Collection count operations
 */
function createCollectionCountOperationsTestSuite() {
  const suite = new TestSuite('Collection Count Operations');
  
  suite.addTest('testCollectionCountDocumentsAll', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('countDocumentsAllTestCollection');
    
    // Test count on empty collection
    let count = collection.countDocuments({});
    TestFramework.assertEquals(0, count, 'Empty collection should have count 0');
    
    // Insert test documents
    collection.insertOne({ name: 'Count Doc 1', value: 100 });
    collection.insertOne({ name: 'Count Doc 2', value: 200 });
    collection.insertOne({ name: 'Count Doc 3', value: 300 });
    
    // Test count after inserts
    count = collection.countDocuments({});
    TestFramework.assertEquals(3, count, 'Collection should have count 3 after 3 inserts');
  });
  
  suite.addTest('testCollectionCountDocumentsUnsupportedFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('countDocumentsUnsupportedFilterTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Test', value: 100 });
    collection.insertOne({ name: 'Other', value: 200 });
    collection.insertOne({ name: 'Test', value: 300 });
    
    // Test field-based filter - should work with QueryEngine
    const count = collection.countDocuments({ name: 'Test' });
    TestFramework.assertEquals(2, count, 'Should count 2 documents by field-based filter');
    
    // Test non-matching filter
    const noMatchCount = collection.countDocuments({ name: 'NonExistent' });
    TestFramework.assertEquals(0, noMatchCount, 'Should count 0 documents for non-matching filter');
  });
  
  // RED PHASE: Collection API Enhancement Tests - Field-based count filters
  suite.addTest('testCollectionCountDocumentsByFieldFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('countFieldFilterTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active' });
    collection.insertOne({ name: 'Bob', department: 'Marketing', status: 'active' });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'inactive' });
    collection.insertOne({ name: 'David', department: 'Engineering', status: 'active' });
    
    // Act & Assert - Should count documents by field filter
    const engineeringCount = collection.countDocuments({ department: 'Engineering' });
    TestFramework.assertEquals(3, engineeringCount, 'Should count 3 Engineering documents');
    
    const marketingCount = collection.countDocuments({ department: 'Marketing' });
    TestFramework.assertEquals(1, marketingCount, 'Should count 1 Marketing document');
    
    const activeCount = collection.countDocuments({ status: 'active' });
    TestFramework.assertEquals(3, activeCount, 'Should count 3 active documents');
    
    const inactiveCount = collection.countDocuments({ status: 'inactive' });
    TestFramework.assertEquals(1, inactiveCount, 'Should count 1 inactive document');
  });
  
  suite.addTest('testCollectionCountDocumentsByMultipleFieldFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('countMultiFieldFilterTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active', level: 'Senior' });
    collection.insertOne({ name: 'Bob', department: 'Engineering', status: 'inactive', level: 'Senior' });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'active', level: 'Junior' });
    collection.insertOne({ name: 'David', department: 'Marketing', status: 'active', level: 'Senior' });
    
    // Act & Assert - Should count documents matching multiple field criteria
    const activeEngineeringCount = collection.countDocuments({ 
      department: 'Engineering', 
      status: 'active' 
    });
    TestFramework.assertEquals(2, activeEngineeringCount, 'Should count 2 active Engineering documents');
    
    const seniorActiveCount = collection.countDocuments({ 
      level: 'Senior', 
      status: 'active' 
    });
    TestFramework.assertEquals(2, seniorActiveCount, 'Should count 2 active Senior documents');
    
    const specificCount = collection.countDocuments({ 
      department: 'Engineering', 
      status: 'active', 
      level: 'Senior' 
    });
    TestFramework.assertEquals(1, specificCount, 'Should count 1 document matching all criteria');
  });
  
  suite.addTest('testCollectionCountDocumentsByNestedFieldFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('countNestedFieldFilterTestCollection');
    
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
    collection.insertOne({ 
      name: 'David', 
      profile: { email: 'david@company.com', team: 'DevOps' },
      settings: { notifications: true }
    });
    
    // Act & Assert - Should count documents by nested field filter
    const backendCount = collection.countDocuments({ 'profile.team': 'Backend' });
    TestFramework.assertEquals(2, backendCount, 'Should count 2 Backend documents');
    
    const frontendCount = collection.countDocuments({ 'profile.team': 'Frontend' });
    TestFramework.assertEquals(1, frontendCount, 'Should count 1 Frontend document');
    
    const notificationsCount = collection.countDocuments({ 'settings.notifications': true });
    TestFramework.assertEquals(3, notificationsCount, 'Should count 3 documents with notifications enabled');
  });
  
  suite.addTest('testCollectionCountDocumentsByComparisonFilter', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('countComparisonFilterTestCollection');
    
    // Insert test documents with numeric values
    collection.insertOne({ name: 'Alice', score: 85, experience: 5 });
    collection.insertOne({ name: 'Bob', score: 92, experience: 3 });
    collection.insertOne({ name: 'Charlie', score: 78, experience: 7 });
    collection.insertOne({ name: 'David', score: 88, experience: 2 });
    
    // Act & Assert - Should count documents using comparison filters
    const highScoreCount = collection.countDocuments({ score: { $gt: 85 } });
    TestFramework.assertEquals(2, highScoreCount, 'Should count 2 documents with score > 85');
    
    const lowScoreCount = collection.countDocuments({ score: { $lt: 80 } });
    TestFramework.assertEquals(1, lowScoreCount, 'Should count 1 document with score < 80');
    
    const experiencedCount = collection.countDocuments({ experience: { $gt: 4 } });
    TestFramework.assertEquals(2, experiencedCount, 'Should count 2 documents with experience > 4');
    
    const exactScoreCount = collection.countDocuments({ score: { $eq: 88 } });
    TestFramework.assertEquals(1, exactScoreCount, 'Should count 1 document with score = 88');
  });
  
  suite.addTest('testCollectionCountDocumentsNoMatch', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('countNoMatchTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering' });
    collection.insertOne({ name: 'Bob', department: 'Marketing' });
    
    // Act & Assert - Should return zero count when filter matches no documents
    const nonExistentCount = collection.countDocuments({ department: 'NonExistent' });
    TestFramework.assertEquals(0, nonExistentCount, 'Should count 0 documents for non-existent department');
    
    const impossibleCount = collection.countDocuments({ score: { $gt: 1000 } });
    TestFramework.assertEquals(0, impossibleCount, 'Should count 0 documents for impossible criteria');
  });
  
  return suite;
}