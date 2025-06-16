/**
 * Test Collection data loading and saving
 */
/**
 * Creates a test suite for verifying collection data operations such as loading, saving,
 * and handling corrupted data files in a Google Apps Script environment.
 *
 * The suite includes tests for:
 * - Loading collection data from a valid Drive file.
 * - Handling corrupted collection data files gracefully.
 * - Saving collection data to Drive and verifying the dirty state.
 *
 * @function
 * @returns {TestSuite} The configured test suite for collection data operations.
 */
function createCollectionDataOperationsTestSuite() {
  const suite = new TestSuite('Collection Data Operations');
  
  suite.addTest('testCollectionLoadDataFromDrive', function() {
    // Arrange - create file with test data
    const folder = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId);
    const testData = {
      metadata: {
        created: new Date('2023-01-01').toISOString(),
        lastUpdated: new Date('2023-01-02').toISOString(),
        documentCount: 2
      },
      documents: {
        'doc1': { _id: 'doc1', name: 'Test Doc 1', value: 100 },
        'doc2': { _id: 'doc2', name: 'Test Doc 2', value: 200 }
      }
    };
    
    const file = folder.createFile('testDataCollection.json', JSON.stringify(testData));
    COLLECTION_TEST_DATA.createdFileIds.push(file.getId());
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'dataTestCollection',
      file.getId(),
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Trigger data loading
    const documents = collection.find({});
    TestFramework.assertEquals(2, documents.length, 'Should load 2 documents from file');
    TestFramework.assertEquals('Test Doc 1', documents[0].name, 'First document should match file data');
  });
  
  suite.addTest('testCollectionLoadDataCorruptedFile', function() {
    // Arrange - create corrupted file
    const folder = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId);
    const file = folder.createFile('corruptedCollection.json', '{ "invalid": json data }');
    COLLECTION_TEST_DATA.createdFileIds.push(file.getId());
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'corruptedTestCollection',
      file.getId(),
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Should handle corrupted file gracefully
    TestFramework.assertThrows(() => {
      collection.find({});
    }, OperationError, 'Should throw OperationError for corrupted file');
  });
  
  suite.addTest('testCollectionSaveDataToDrive', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'saveTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert a document to make collection dirty
    const result = collection.insertOne({ name: 'Test Save Doc', value: 500 });
    TestFramework.assertTrue(collection.isDirty(), 'Collection should be dirty after insert');
    
    // Save to Drive
    collection.save();
    TestFramework.assertFalse(collection.isDirty(), 'Collection should not be dirty after save');
  });
  
  return suite;
}