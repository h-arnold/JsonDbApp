/**
 * 02_CollectionManagementTestSuite.js - Collection Management Test Suite
 *
 * Exports the test suite for collection creation and management in Database.
 */


function createCollectionManagementTestSuite() {
  const suite = new TestSuite('Collection Management');

  suite.addTest('should create new collection', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = DATABASE_TEST_DATA.testCollectionNames[0];
    // Act - This should fail initially (TDD Red phase)
    try {
      const collection = database.createCollection(collectionName);
      // Assert
      TestFramework.assertNotNull(collection, 'Collection should be created');
      TestFramework.assertEquals(collection.name, collectionName, 'Collection name should match');
      TestFramework.assertNotNull(collection.driveFileId, 'Collection should have drive file ID');
      // Track created file for clean-up
      DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
    } catch (error) {
      throw new Error('Database.createCollection() not implemented: ' + error.message);
    }
  });

  suite.addTest('should access existing collection', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = DATABASE_TEST_DATA.testCollectionNames[0];
    // Act - This should fail initially (TDD Red phase)
    try {
      const collection = database.collection(collectionName);
      // Assert
      TestFramework.assertNotNull(collection, 'Collection should be accessible');
      TestFramework.assertEquals(collection.name, collectionName, 'Collection name should match');
    } catch (error) {
      throw new Error('Database.collection() not implemented: ' + error.message);
    }
  });

  suite.addTest('should auto-create collection when configured', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = DATABASE_TEST_DATA.testCollectionNames[1];
    // Act - This should fail initially (TDD Red phase)
    try {
      // This should auto-create since autoCreateCollections is true
      const collection = database.collection(collectionName);
      // Assert
      TestFramework.assertNotNull(collection, 'Collection should be auto-created');
      TestFramework.assertEquals(collection.name, collectionName, 'Collection name should match');
      // Track created file for clean-up
      if (collection.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
    } catch (error) {
      throw new Error('Database auto-create collection not implemented: ' + error.message);
    }
  });

  suite.addTest('should list all collections', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    // Act - This should fail initially (TDD Red phase)
    try {
      const collections = database.listCollections();
      // Assert
      TestFramework.assertTrue(Array.isArray(collections), 'Should return array');
      TestFramework.assertTrue(collections.length >= 0, 'Should have collections or empty array');
      // Should contain previously created collections
      const collectionName1 = DATABASE_TEST_DATA.testCollectionNames[0];
      const collectionName2 = DATABASE_TEST_DATA.testCollectionNames[1];
      if (collections.length > 0) {
        // If collections exist, they should be in the list
        const hasTestCollection = collections.some(name => 
          name === collectionName1 || name === collectionName2
        );
        TestFramework.assertTrue(hasTestCollection, 'Should contain created test collections');
      }
    } catch (error) {
      throw new Error('Database.listCollections() not implemented: ' + error.message);
    }
  });

  suite.addTest('should delete collection', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = DATABASE_TEST_DATA.testCollectionNames[2]; // tempCollection
    // First create a collection to delete
    try {
      const collection = database.createCollection(collectionName);
      if (collection && collection.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
    } catch (error) {
      // Expected to fail in Red phase
    }
    // Act - This should fail initially (TDD Red phase)
    try {
      const result = database.dropCollection(collectionName);
      // Assert
      TestFramework.assertTrue(result, 'Drop collection should return true');
      // Verify collection is no longer listed
      const collections = database.listCollections();
      const collectionExists = collections.includes(collectionName);
      TestFramework.assertFalse(collectionExists, 'Collection should no longer exist');
    } catch (error) {
      throw new Error('Database.dropCollection() not implemented: ' + error.message);
    }
  });

  suite.addTest('should throw error if collection does not exist and autoCreateCollections is false', function() {
    // Arrange
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, { autoCreateCollections: false });
    const database = new Database(config);
    database.initialise();
    // Act & Assert
    TestFramework.assertThrows(() => {
      database.collection('nonExistentCollection');
    }, Error, 'Should throw error when collection does not exist with autoCreateCollections disabled');
  });

  suite.addTest('should handle collection name validation', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    // Act & Assert - This should fail initially (TDD Red phase)
    try {
      // Test invalid collection names
      TestFramework.assertThrows(() => {
        database.createCollection('');
      }, Error, 'Should throw error for empty collection name');
      TestFramework.assertThrows(() => {
        database.createCollection(null);
      }, Error, 'Should throw error for null collection name');
      TestFramework.assertThrows(() => {
        database.createCollection('invalid/name');
      }, Error, 'Should throw error for collection name with invalid characters');
      TestFramework.assertThrows(() => {
        database.createCollection('index');
      }, Error, 'Should throw error for reserved collection name');
    } catch (error) {
      throw new Error('Collection name validation not implemented: ' + error.message);
    }
  });

  suite.addTest('should sanitise invalid collection names when permissive mode enabled', function() {
    // Arrange - create unique config for sanitisation tests
    const uniqueKey = DATABASE_TEST_DATA.testConfig.masterIndexKey + '_SANITISE_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, {
      masterIndexKey: uniqueKey,
      stripDisallowedCollectionNameCharacters: true
    });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();
    const originalName = 'permissive/Collection';
    const expectedName = 'permissiveCollection';
    try {
      // Act
      const collection = database.createCollection(originalName);
      if (collection && collection.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      // Assert
      TestFramework.assertEquals(collection.name, expectedName, 'Collection name should be sanitised before returning');
      const reaccessed = database.collection(originalName);
      TestFramework.assertEquals(reaccessed.name, expectedName, 'Should re-access collection by original name via sanitisation');
      const collectionList = database.listCollections();
      TestFramework.assertTrue(collectionList.includes(expectedName), 'listCollections should list sanitised name');
      const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
      const miCollections = masterIndex.getCollections();
      TestFramework.assertTrue(miCollections.hasOwnProperty(expectedName), 'MasterIndex should store sanitised collection name');
    } finally {
      PropertiesService.getScriptProperties().deleteProperty(config.masterIndexKey);
    }
  });

  suite.addTest('should refuse reserved names even after sanitisation', function() {
    const uniqueKey = DATABASE_TEST_DATA.testConfig.masterIndexKey + '_SANITISE_RESERVED_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, {
      masterIndexKey: uniqueKey,
      stripDisallowedCollectionNameCharacters: true,
      autoCreateCollections: false
    });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();
    try {
      TestFramework.assertThrows(() => {
        database.createCollection('index/');
      }, Error, 'Should throw error for reserved name after sanitisation');
    } finally {
      PropertiesService.getScriptProperties().deleteProperty(config.masterIndexKey);
    }
  });

  suite.addTest('should prevent duplicate collections that collide after sanitisation', function() {
    const uniqueKey = DATABASE_TEST_DATA.testConfig.masterIndexKey + '_SANITISE_DUPLICATE_' + new Date().getTime();
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, {
      masterIndexKey: uniqueKey,
      stripDisallowedCollectionNameCharacters: true
    });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();
    try {
      const first = database.createCollection('dup/name');
      if (first && first.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(first.driveFileId);
      }
      TestFramework.assertThrows(() => {
        database.createCollection('dup:name');
      }, Error, 'Should reject second collection when sanitised names collide');
      const reaccessed = database.collection('dup:name');
      TestFramework.assertEquals(reaccessed.name, 'dupname', 'Should return existing collection when referencing equivalent name');
    } finally {
      PropertiesService.getScriptProperties().deleteProperty(config.masterIndexKey);
    }
  });

  return suite;
}
