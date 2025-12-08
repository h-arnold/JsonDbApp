/**
 * 05_DatabaseBackupIndexTestSuite.js - Database Backup Index Test Suite
 *
 * Tests the behavior of the backupOnInitialise configuration option, ensuring
 * that database_index_*.json files are only created when explicitly enabled.
 */

function createDatabaseBackupIndexTestSuite() {
  const suite = new TestSuite('Database Backup Index Tests');

  // Use the shared environment setup/cleanup
  suite.setBeforeAll(setupDatabaseTestEnvironment);
  suite.setAfterAll(cleanupDatabaseTestEnvironment);

  /**
   * Helper to count index files in the test folder
   */
  function countIndexFiles(folderId) {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
    let count = 0;
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().includes('database_index') && file.getName().endsWith('.json')) {
        count++;
      }
    }
    return count;
  }

  suite.addTest('should NOT create index file when backupOnInitialise is false', function() {
    // Arrange
    const uniqueKey = 'GASDB_MASTER_INDEX_TEST_NO_BACKUP_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, { 
      masterIndexKey: uniqueKey,
      backupOnInitialise: false 
    });
    
    // Act
    const database = new Database(config);
    database.createDatabase(); // Creates MasterIndex in ScriptProperties
    database.initialise();     // Should NOT create index file
    
    // Create a collection - this triggered the bug previously
    const collectionName = 'test_col_no_backup';
    database.createCollection(collectionName);
    
    // Assert
    const indexFileCount = countIndexFiles(config.rootFolderId);
    TestFramework.assertEquals(0, indexFileCount, 'No index file should be created when backupOnInitialise is false');
    
    // Cleanup
    ScriptProperties.deleteProperty(uniqueKey);
    // Collection file cleanup is handled by global cleanup via DATABASE_TEST_DATA.createdFileIds if we track it
    // But here we just check the index file count.
    // We should track the collection file for cleanup though.
    const collection = database.getCollection(collectionName);
    if (collection && collection.getDriveFileId()) {
      DATABASE_TEST_DATA.createdFileIds.push(collection.getDriveFileId());
    }
  });

  suite.addTest('should create index file when backupOnInitialise is true', function() {
    // Arrange
    const uniqueKey = 'GASDB_MASTER_INDEX_TEST_WITH_BACKUP_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, { 
      masterIndexKey: uniqueKey,
      backupOnInitialise: true 
    });
    
    // Act
    const database = new Database(config);
    database.createDatabase();
    database.initialise(); // Should create index file immediately due to backupOnInitialise: true
    
    // Assert
    const indexFileCount = countIndexFiles(config.rootFolderId);
    TestFramework.assertTrue(indexFileCount >= 1, 'Index file should be created when backupOnInitialise is true');
    
    // Cleanup
    ScriptProperties.deleteProperty(uniqueKey);
    if (database.indexFileId) {
      DATABASE_TEST_DATA.createdFileIds.push(database.indexFileId);
    }
  });

  suite.addTest('should NOT update index file on collection creation if backupOnInitialise is false', function() {
    // Arrange
    const uniqueKey = 'GASDB_MASTER_INDEX_TEST_NO_UPDATE_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, { 
      masterIndexKey: uniqueKey,
      backupOnInitialise: false 
    });
    
    const database = new Database(config);
    database.createDatabase();
    database.initialise();
    
    // Manually create an index file to simulate a pre-existing one (e.g. from a manual backup)
    // This ensures we are testing that it doesn't get UPDATED/RECREATED, not just that it doesn't exist.
    // However, the bug was that it created a NEW file.
    // If we start with 0 files, and end with 0 files, we are good.
    // If we start with 1 file, and end with 1 file (and not 2), we are also good.
    
    // Let's stick to the 0 file case as it's cleaner and was the reported issue.
    // The previous test covered this, but let's be explicit about createCollection.
    
    const collectionName = 'test_col_creation_check';
    database.createCollection(collectionName);
    
    const indexFileCount = countIndexFiles(config.rootFolderId);
    TestFramework.assertEquals(0, indexFileCount, 'createCollection should not create index file when backup disabled');
    
    // Cleanup
    ScriptProperties.deleteProperty(uniqueKey);
    const collection = database.getCollection(collectionName);
    if (collection && collection.getDriveFileId()) {
      DATABASE_TEST_DATA.createdFileIds.push(collection.getDriveFileId());
    }
  });

  return suite;
}
