/**
 * CollectionCoordinatorTestDataGenerator.js - Generate and save real test data
 * 
 * This utility creates proper test data using real GAS APIs and saves it to Drive
 * for inspection and use in test environment setup.
 */

/**
 * Generate and save test data to Drive without cleanup
 * This creates real data structures that can be inspected and used for testing
 */
function generateCollectionCoordinatorTestData() {
  const logger = GASDBLogger.createComponentLogger('TestDataGenerator');
  
  try {
    logger.info('Generating CollectionCoordinator test data');
    
    // Create test folder
    const testFolder = DriveApp.createFolder('GASDB_TestData_Generator_' + new Date().getTime());
    logger.info('Created test folder', { folderId: testFolder.getId() });
    
    // Create initial collection data structure (matches expected format)
    const collectionData = {
      collection: 'coordinatorTest',
      metadata: {
        version: 1,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        documentCount: 3,
        modificationToken: 'initial-token-' + new Date().getTime()
      },
      documents: {
        'coord-test-1': {
          _id: 'coord-test-1',
          name: 'Test Document 1',
          category: 'testing',
          value: 100,
          active: true,
          created: new Date().toISOString()
        },
        'coord-test-2': {
          _id: 'coord-test-2',
          name: 'Test Document 2',
          category: 'coordination',
          value: 200,
          active: false,
          created: new Date().toISOString()
        },
        'coord-test-3': {
          _id: 'coord-test-3',
          name: 'Test Document 3',
          category: 'testing',
          value: 300,
          active: true,
          created: new Date().toISOString()
        }
      }
    };
    
    // Create collection file
    const collectionFile = testFolder.createFile(
      'test_collection_data.json',
      JSON.stringify(collectionData, null, 2),
      'application/json'
    );
    logger.info('Created collection file', { fileId: collectionFile.getId() });
    
    // Create real components to get proper serialization
    const fileOps = new FileOperations(logger);
    const fileService = new FileService(fileOps, logger);
    const masterIndex = new MasterIndex();
    
    // Create database config
    const dbConfig = new DatabaseConfig({
      name: 'testDB',
      rootFolderId: testFolder.getId()
    });
    
    // Create minimal database
    const database = {
      name: 'testDB',
      config: dbConfig,
      _masterIndex: masterIndex,
      getMasterIndex: () => masterIndex
    };
    
    // Create real Collection
    const collection = new Collection(
      'coordinatorTest',
      collectionFile.getId(),
      database,
      fileService
    );
    
    // Load and initialize the collection
    collection._ensureLoaded();
    
    // Register with master index
    masterIndex.addCollection('coordinatorTest', collection._metadata);
    
    // Get serialized states
    const masterIndexData = masterIndex.load() || masterIndex._data;
    const collectionMetadata = collection._metadata;
    const dbConfigData = dbConfig.toJSON();
    
    // Save various data structures to files for inspection
    testFolder.createFile(
      'master_index_data.json',
      JSON.stringify(masterIndexData, null, 2),
      'application/json'
    );
    
    testFolder.createFile(
      'collection_metadata.json',
      JSON.stringify(collectionMetadata, null, 2),
      'application/json'
    );
    
    testFolder.createFile(
      'database_config.json',
      JSON.stringify(dbConfigData, null, 2),
      'application/json'
    );
    
    // Test serialization/deserialization
    const serializedMetadata = ObjectUtils.serialise(collectionMetadata);
    const deserializedMetadata = ObjectUtils.deserialise(serializedMetadata);
    
    testFolder.createFile(
      'serialized_metadata_test.json',
      JSON.stringify({
        original: collectionMetadata,
        serialized: serializedMetadata,
        deserialized: deserializedMetadata,
        testPassed: deserializedMetadata instanceof CollectionMetadata
      }, null, 2),
      'application/json'
    );
    
    // Create test coordination configurations
    const coordinationConfigs = {
      default: {
        coordinationEnabled: true,
        lockTimeout: 2000,
        retryAttempts: 3,
        retryDelayMs: 100,
        conflictResolutionStrategy: 'reload'
      },
      disabled: {
        coordinationEnabled: false
      },
      aggressive: {
        coordinationEnabled: true,
        lockTimeout: 500,
        retryAttempts: 5,
        retryDelayMs: 50,
        conflictResolutionStrategy: 'reload'
      }
    };
    
    testFolder.createFile(
      'coordination_configs.json',
      JSON.stringify(coordinationConfigs, null, 2),
      'application/json'
    );
    
    // Test CollectionCoordinator creation
    const coordinator = new CollectionCoordinator(
      collection,
      masterIndex,
      coordinationConfigs.default
    );
    
    testFolder.createFile(
      'coordinator_test_results.json',
      JSON.stringify({
        coordinatorCreated: !!coordinator,
        coordinatorConfig: coordinator._config,
        collectionName: coordinator._collection.name,
        masterIndexCollections: Object.keys(masterIndex.getCollections())
      }, null, 2),
      'application/json'
    );
    
    // Generate summary report
    const summaryReport = {
      generatedAt: new Date().toISOString(),
      testFolderId: testFolder.getId(),
      testFolderName: testFolder.getName(),
      collectionFileId: collectionFile.getId(),
      components: {
        masterIndex: {
          created: !!masterIndex,
          collections: Object.keys(masterIndex.getCollections()),
          dataKeys: Object.keys(masterIndexData || {})
        },
        collection: {
          created: !!collection,
          name: collection.name,
          documentCount: collection._metadata?.documentCount,
          loaded: collection._loaded
        },
        coordinator: {
          created: !!coordinator,
          coordinationEnabled: coordinator._config.coordinationEnabled
        }
      },
      serialization: {
        objectUtilsAvailable: typeof ObjectUtils !== 'undefined',
        collectionMetadataSerializable: !!serializedMetadata,
        deserializationWorks: deserializedMetadata instanceof CollectionMetadata
      }
    };
    
    testFolder.createFile(
      'generation_summary.json',
      JSON.stringify(summaryReport, null, 2),
      'application/json'
    );
    
    logger.info('Test data generation complete', {
      folderId: testFolder.getId(),
      folderName: testFolder.getName(),
      summary: summaryReport
    });
    
    // Output key information to console
    console.log('=== COLLECTION COORDINATOR TEST DATA GENERATED ===');
    console.log('Folder ID: ' + testFolder.getId());
    console.log('Folder Name: ' + testFolder.getName());
    console.log('Collection File ID: ' + collectionFile.getId());
    console.log('Generated Files:');
    console.log('- test_collection_data.json');
    console.log('- master_index_data.json');
    console.log('- collection_metadata.json');
    console.log('- database_config.json');
    console.log('- serialized_metadata_test.json');
    console.log('- coordination_configs.json');
    console.log('- coordinator_test_results.json');
    console.log('- generation_summary.json');
    console.log('================================================');
    
    return {
      folderId: testFolder.getId(),
      collectionFileId: collectionFile.getId(),
      summaryReport: summaryReport
    };
    
  } catch (error) {
    logger.error('Test data generation failed', { 
      error: error.message, 
      stack: error.stack 
    });
    throw error;
  }
}

/**
 * Clean up test data folder (optional)
 * @param {string} folderId - Folder ID to clean up
 */
function cleanupTestDataFolder(folderId) {
  const logger = GASDBLogger.createComponentLogger('TestDataCleanup');
  
  try {
    if (folderId) {
      const folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
      logger.info('Cleaned up test data folder', { folderId });
    }
  } catch (error) {
    logger.warn('Could not clean up test data folder', { folderId, error: error.message });
  }
}
