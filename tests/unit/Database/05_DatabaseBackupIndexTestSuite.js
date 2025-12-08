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
    // Search all files and match on name rather than relying on MimeType
    const files = folder.getFiles();
    let count = 0;
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().includes('database_index') && file.getName().endsWith('.json')) {
        count++;
      }
    }
    return count;
  }

  /**
   * Helper to list index files in the test folder and return their IDs
   */
  function listIndexFiles(folderId) {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const ids = [];
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().includes('database_index') && file.getName().endsWith('.json')) {
        ids.push(file.getId());
      }
    }
    return ids;
  }

  /**
   * Delete a script property using the correct GAS API and protect tests running in non-GAS environments.
   * Falls back to global ScriptProperties (if present) or a noop when neither is available.
   */
  function deleteScriptProperty(key) {
    if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
      // Prefer optional chaining where safe: call getScriptProperties() then deleteProperty if present
      PropertiesService.getScriptProperties?.()?.deleteProperty?.(key);
    } else if (typeof ScriptProperties !== 'undefined' && ScriptProperties.deleteProperty) {
      // Legacy or alternate global - safe fallback
      ScriptProperties.deleteProperty?.(key);
    } else {
      // In test/CI environments where no GAS PropertiesService exists, ignore to avoid runtime errors.
      if (typeof Logger !== 'undefined' && Logger.log) {
        Logger.log?.('deleteScriptProperty: PropertiesService not available; key=' + key);
      }
    }
  }

  suite.addTest('should NOT create index file when backupOnInitialise is false', function() {
    // Arrange
    const uniqueKey = 'GASDB_MASTER_INDEX_TEST_NO_BACKUP_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, {
      masterIndexKey: uniqueKey,
      backupOnInitialise: false
    });
    // Ensure no pre-existing master index script property before starting
    deleteScriptProperty(uniqueKey);
    // Cleanup handled later via DATABASE_TEST_DATA.createdFileIds
    const database = new Database(config);
    const initialIndexFiles = listIndexFiles(config.rootFolderId);
    const initialIndexCount = initialIndexFiles.length;

    database.createDatabase(); // Creates MasterIndex in ScriptProperties (accessed via PropertiesService)
    database.initialise();     // Should NOT create index file
    
    // Create a collection - this triggered the bug previously
    const collectionName = 'test_col_no_backup';
    database.createCollection(collectionName);
    
    // Assert: count index files and ensure we didn't create any (allow for pre-existing index files)
    const indexFileCount = countIndexFiles(config.rootFolderId);
    TestFramework.assertEquals(initialIndexCount, indexFileCount, 'No index file should be created when backupOnInitialise is false');
    
    // Cleanup
    deleteScriptProperty(uniqueKey);
    // Collection file cleanup is handled by global cleanup via DATABASE_TEST_DATA.createdFileIds if we track it
    const collection = database.getCollection(collectionName);
    const collectionFileId = collection?.getDriveFileId?.();
    if (collectionFileId) {
      DATABASE_TEST_DATA.createdFileIds.push(collectionFileId);
    }
    if (database?.indexFileId) {
      DATABASE_TEST_DATA.createdFileIds.push(database.indexFileId);
    }
  });

  suite.addTest('should create index file when backupOnInitialise is true', function() {
    // Arrange
    const uniqueKey = 'GASDB_MASTER_INDEX_TEST_WITH_BACKUP_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, { 
      masterIndexKey: uniqueKey,
      backupOnInitialise: true 
    });

    // Ensure no pre-existing master index script property before starting
    deleteScriptProperty(uniqueKey);

    // Act
    const database = new Database(config);
    database.createDatabase();
    database.initialise(); // Should create index file immediately due to backupOnInitialise: true

    // Assert
    const indexFileCount = countIndexFiles(config.rootFolderId);
    TestFramework.assertTrue(indexFileCount >= 1, 'Index file should be created when backupOnInitialise is true');

    // Cleanup
    deleteScriptProperty(uniqueKey);
    if (database.indexFileId) {
      DATABASE_TEST_DATA.createdFileIds.push(database.indexFileId);
    }
  });

  suite.addTest('createCollection should not create index file when backup disabled', function() {
    // Arrange
    const uniqueKey = 'GASDB_MASTER_INDEX_TEST_CREATECOL_NO_BACKUP_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, {
      masterIndexKey: uniqueKey,
      backupOnInitialise: false
    });

    // Ensure no pre-existing master index script property before starting
    deleteScriptProperty(uniqueKey);

    // Act
    const database = new Database(config);
    database.createDatabase();
    database.initialise();

    // Ensure we track any pre-existing collection file for cleanup
    const collectionName = 'test_col_creation_check';
    // Avoid auto-creating the collection during existence checks (getCollection autogenerates if autoCreateCollections is enabled)
    const existingCollections = database.listCollections();
    let preExistingCollectionFileId = null;
    if (existingCollections.indexOf(collectionName) >= 0) {
      const preExistingCollection = database.getCollection(collectionName);
      preExistingCollectionFileId = preExistingCollection?.getDriveFileId?.();
    }
    if (preExistingCollectionFileId) {
      DATABASE_TEST_DATA.createdFileIds.push(preExistingCollectionFileId);
    }

    // Act - create a collection while backup is disabled
    const initialIndexFiles = listIndexFiles(config.rootFolderId);
    const initialCount = initialIndexFiles.length;

    database.createCollection(collectionName);

    // Assert: verify that we didn't increase the number of index files
    const finalIndexFiles = listIndexFiles(config.rootFolderId);
    const finalCount = finalIndexFiles.length;
    TestFramework.assertEquals(initialCount, finalCount, 'createCollection should not create index file when backup disabled');

    // Track any new index files (shouldn't be any) for cleanup if they were created by someone else
    finalIndexFiles.forEach(id => {
      if (initialIndexFiles.indexOf(id) === -1) {
        DATABASE_TEST_DATA.createdFileIds.push(id);
      }
    });

    // Cleanup
    deleteScriptProperty(uniqueKey);
    const collection = database.getCollection(collectionName);
    const collectionFileId = collection?.getDriveFileId?.();
    if (collectionFileId) {
      DATABASE_TEST_DATA.createdFileIds.push(collectionFileId);
    }
  });
  return suite;
}
