/**
 * Test Collection insert operations
 */
/**
 * Creates a test suite for verifying collection insert operations.
 *
 * This suite includes tests for:
 * - Inserting a single document and verifying the MongoDB-compatible return format.
 * - Inserting a document with an explicit `_id` and ensuring the provided ID is used.
 *
 * @function
 * @returns {TestSuite} The configured test suite for collection insert operations.
 */
function createCollectionInsertOperationsTestSuite() {
  const suite = new TestSuite('Collection Insert Operations');
  
  suite.addTest('testCollectionInsertOne', function() {
    // Arrange
    const collectionName = 'insertTestCollection';
    const fileId = createTestCollectionFile(collectionName);
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      collectionName,
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    const testDoc = { name: 'Insert Test Doc', value: 300, tags: ['test', 'insert'] };
    const result = collection.insertOne(testDoc);
    
    // Verify MongoDB-compatible return format
    TestFramework.assertTrue(result.hasOwnProperty('insertedId'), 'Result should have insertedId property');
    TestFramework.assertTrue(result.hasOwnProperty('acknowledged'), 'Result should have acknowledged property');
    TestFramework.assertTrue(result.acknowledged, 'Operation should be acknowledged');
    TestFramework.assertNotNull(result.insertedId, 'Should return valid insertedId');
  });
  
  suite.addTest('testCollectionInsertOneWithExplicitId', function() {
    // Arrange
    const collectionName = 'insertExplicitIdTestCollection';
    const fileId = createTestCollectionFile(collectionName);
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      collectionName,
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    const testDoc = { _id: 'explicit-id-123', name: 'Explicit ID Doc', value: 400 };
    const result = collection.insertOne(testDoc);
    
    TestFramework.assertEquals('explicit-id-123', result.insertedId, 'Should use provided ID');
    TestFramework.assertTrue(result.acknowledged, 'Operation should be acknowledged');
  });
  
  return suite;
}