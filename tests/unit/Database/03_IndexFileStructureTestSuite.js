/**
 * 03_IndexFileStructureTestSuite.js - Index File Structure Test Suite
 *
 * Exports the test suite for index file structure and operations in Database.
 */


function createIndexFileStructureTestSuite() {
  const suite = new TestSuite('Index File Structure');

  suite.addTest('should create index file with correct structure', function() {
    // Arrange
  const configWithBackup = Object.assign({}, DATABASE_TEST_DATA.testConfig, { backupOnInitialise: true });
  const database = new Database(configWithBackup);
    // Act - This should fail initially (TDD Red phase)
    try {
      database.initialise();
      // Read the index file to verify structure
      const indexData = database.loadIndex();
      // Assert
      TestFramework.assertNotNull(indexData, 'Index data should exist');
      TestFramework.assertDefined(indexData.collections, 'Index should have collections property');
      TestFramework.assertDefined(indexData.lastUpdated, 'Index should have lastUpdated property');
      TestFramework.assertTrue(typeof indexData.collections === 'object', 'Collections should be an object');
    } catch (error) {
      throw new Error('Index file structure not implemented: ' + error.message);
    }
  });

  suite.addTest('should update index file when collections change', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = 'indexTestCollection';
    // Act - This should fail initially (TDD Red phase)
    try {
      // Create a collection
      const collection = database.createCollection(collectionName);
      // Load index and verify it was updated
      const indexData = database.loadIndex();
      // Assert
      TestFramework.assertTrue(indexData.collections.hasOwnProperty(collectionName), 'Index should contain new collection');
      const collectionData = indexData.collections[collectionName];
      TestFramework.assertEquals(collectionData.name, collectionName, 'Collection name should match');
      TestFramework.assertNotNull(collectionData.fileId, 'Collection should have file ID');
      TestFramework.assertDefined(collectionData.created, 'Collection should have created timestamp');
      TestFramework.assertDefined(collectionData.lastUpdated, 'Collection should have lastUpdated timestamp');
      // Track created file for clean-up
      if (collection && collection.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
    } catch (error) {
      throw new Error('Index file updates not implemented: ' + error.message);
    }
  });

  suite.addTest('should synchronise with master index', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = 'masterIndexSyncTest';
    // Act
    database.createCollection(collectionName);
    const masterIndex = new MasterIndex({ masterIndexKey: DATABASE_TEST_DATA.testConfig.masterIndexKey });
    const miCollections = masterIndex.getCollections();
    // Assert
    TestFramework.assertTrue(
      miCollections.hasOwnProperty(collectionName),
      'MasterIndex should include new collection created by Database'
    );
  });

  suite.addTest('should record sanitised collection names in index file when sanitisation enabled', function() {
    const uniqueKey = DATABASE_TEST_DATA.testConfig.masterIndexKey + '_INDEX_SANITISE_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, {
      masterIndexKey: uniqueKey,
      stripDisallowedCollectionNameCharacters: true,
      backupOnInitialise: true
    });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();
    try {
      const collection = database.createCollection('index/backup');
      if (collection && collection.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      if (database.indexFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(database.indexFileId);
      }
      const indexData = database.loadIndex();
      TestFramework.assertTrue(
        indexData.collections.hasOwnProperty('indexbackup'),
        'Index file should list sanitised collection name'
      );
      TestFramework.assertEquals(
        indexData.collections.indexbackup.name,
        'indexbackup',
        'Stored collection entry should use sanitised name'
      );
    } finally {
      PropertiesService.getScriptProperties().deleteProperty(config.masterIndexKey);
    }
  });

  return suite;
}
