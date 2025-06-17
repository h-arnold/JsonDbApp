// 00_CollectionInitialisationTestSuite.js
// Test suite for Collection initialisation

/**
 * Creates a test suite for verifying the initialisation and lazy loading behavior of the Collection class.
 *
 * The suite includes:
 * - A test to ensure a Collection instance is properly created and initialized with the correct properties.
 * - A test to verify that data in the Collection is loaded lazily, i.e., not loaded until the first operation is performed.
 *
 * @returns {TestSuite} The configured test suite for Collection initialisation.
 */
function createCollectionInitialisationTestSuite() {
  const suite = new TestSuite('Collection Initialisation');
  
  suite.addTest('testCollectionInitialisation', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - This SHOULD fail in Red phase, making the test fail
    const collection = new Collection(
      COLLECTION_TEST_DATA.testCollectionName,
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    TestFramework.assertNotNull(collection, 'Collection should be created');
    TestFramework.assertEquals(COLLECTION_TEST_DATA.testCollectionName, collection.getName(), 'Collection name should match');
    TestFramework.assertFalse(collection.isDirty(), 'New collection should not be dirty');
  });
  
  suite.addTest('testCollectionLazyLoading', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert
    const collection = new Collection(
      'lazyTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Data should not be loaded initially - first operation should trigger loading
    const documents = collection.find({});
    TestFramework.assertArrayEquals([], documents, 'Empty collection should return empty array');
  });
  
  return suite;
}
