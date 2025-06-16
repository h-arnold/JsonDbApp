/**
 * Collection Integration Test Orchestrator
 * Holds test runner, setup, and teardown functions for all Collection integration tests.
 */

// Global test data storage for integration tests
const INTEGRATION_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_Integration_Test_' + new Date().getTime(),
  testFileId: null,
  testCollectionName: 'integration_test_collection',
  createdFileIds: [], // Track all files created for cleanup
  createdFolderIds: [], // Track all folders created for cleanup
  testCollection: null,
  testFileService: null,
  testDatabase: null,
  largeDataset: null // For performance testing
};

/**
 * Setup integration test environment with realistic data volumes
 */
function setupIntegrationTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Integration-Setup');
  try {
    // Create test folder
    const folder = DriveApp.createFolder(INTEGRATION_TEST_DATA.testFolderName);
    INTEGRATION_TEST_DATA.testFolderId = folder.getId();
    INTEGRATION_TEST_DATA.createdFolderIds.push(INTEGRATION_TEST_DATA.testFolderId);
    // Create FileService instance with proper dependencies
    const fileOps = new FileOperations(logger);
    INTEGRATION_TEST_DATA.testFileService = new FileService(fileOps, logger);
    // Create mock database object
    INTEGRATION_TEST_DATA.testDatabase = {
      _markDirty: function() {
        // Mock implementation for integration tests
      }
    };
    // Generate large dataset for performance testing (1000+ documents)
    INTEGRATION_TEST_DATA.largeDataset = generateLargeTestDataset(1200);
    logger.info('Created integration test environment', { 
      folderId: INTEGRATION_TEST_DATA.testFolderId, 
      name: INTEGRATION_TEST_DATA.testFolderName,
      datasetSize: INTEGRATION_TEST_DATA.largeDataset.length
    });
  } catch (error) {
    logger.error('Failed to create integration test environment', { error: error.message });
    throw error;
  }
}

/**
 * Clean up integration test environment
 */
function cleanupIntegrationTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Integration-Cleanup');
  let cleanedFiles = 0;
  let failedFiles = 0;
  let cleanedFolders = 0;
  let failedFolders = 0;
  // Clean up created test files
  INTEGRATION_TEST_DATA.createdFileIds.forEach(fileId => {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
      cleanedFiles++;
    } catch (error) {
      failedFiles++;
      logger.warn('Failed to clean up test file', { fileId, error: error.message });
    }
  });
  // Clean up created test folders
  INTEGRATION_TEST_DATA.createdFolderIds.forEach(folderId => {
    try {
      DriveApp.getFolderById(folderId).setTrashed(true);
      cleanedFolders++;
    } catch (error) {
      failedFolders++;
      logger.warn('Failed to clean up test folder', { folderId, error: error.message });
    }
  });
  // Reset test data
  INTEGRATION_TEST_DATA.createdFileIds = [];
  INTEGRATION_TEST_DATA.createdFolderIds = [];
  INTEGRATION_TEST_DATA.testCollection = null;
  INTEGRATION_TEST_DATA.testFileId = null;
  INTEGRATION_TEST_DATA.largeDataset = null;
  logger.info('Integration test cleanup completed', { 
    cleanedFiles, 
    failedFiles, 
    cleanedFolders, 
    failedFolders 
  });
}

/**
 * Generate large test dataset for performance testing
 * @param {number} size - Number of documents to generate
 * @returns {Array} Array of test documents
 */
function generateLargeTestDataset(size) {
  const dataset = [];
  const departments = ['Engineering', 'Marketing', 'Sales', 'Support', 'HR'];
  const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool'];
  const skills = ['JavaScript', 'Node.js', 'Python', 'Java', 'React', 'Angular', 'Vue.js'];
  for (let i = 0; i < size; i++) {
    const baseDate = new Date('2020-01-01');
    const randomDays = Math.floor(Math.random() * 1460); // 4 years worth of days
    dataset.push({
      _id: `user_${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: 18 + Math.floor(Math.random() * 47), // Age 18-65
      active: Math.random() > 0.2, // 80% active
      salary: 25000 + Math.floor(Math.random() * 75000), // £25k-£100k
      joinDate: new Date(baseDate.getTime() + (randomDays * 24 * 60 * 60 * 1000)),
      profile: {
        title: `Role ${i % 20}`,
        department: departments[i % departments.length],
        yearsOfService: Math.floor(Math.random() * 15),
        skills: skills.slice(0, 1 + Math.floor(Math.random() * 4)),
        rating: Math.round((Math.random() * 4 + 1) * 10) / 10
      },
      address: {
        city: cities[i % cities.length],
        postcode: `SW${Math.floor(Math.random() * 20)}${Math.floor(Math.random() * 10)}XX`,
        country: 'UK'
      },
      metadata: {
        createdAt: new Date(baseDate.getTime() + (randomDays * 24 * 60 * 60 * 1000)),
        version: 1,
        tags: i % 5 === 0 ? ['premium'] : []
      }
    });
  }
  return dataset;
}

/**
 * Helper function to create a test collection with populated data
 * @param {Array} documents - Documents to insert into collection
 * @returns {Collection} Configured test collection
 */
function createPopulatedTestCollection(documents = []) {
  const folder = DriveApp.getFolderById(INTEGRATION_TEST_DATA.testFolderId);
  const fileName = 'integration_test_' + new Date().getTime() + '.json';
  // Create initial collection data structure
  const collectionData = {
    documents: {},
    metadata: {
      created: new Date(),
      lastUpdated: new Date(),
      documentCount: 0
    }
  };
  // Add documents to collection data
  documents.forEach(doc => {
    collectionData.documents[doc._id] = doc;
    collectionData.metadata.documentCount++;
  });
  // Create file with populated data
  const file = folder.createFile(fileName, JSON.stringify(collectionData, null, 2));
  const fileId = file.getId();
  INTEGRATION_TEST_DATA.createdFileIds.push(fileId);
  // Create and return collection instance
  return new Collection(
    INTEGRATION_TEST_DATA.testCollectionName,
    fileId,
    INTEGRATION_TEST_DATA.testDatabase,
    INTEGRATION_TEST_DATA.testFileService
  );
}

/**
 * Run all Collection integration tests
 * This function orchestrates all integration test suites
 */
function runCollectionIntegrationTests() {
  try {
    setupIntegrationTestEnvironment();
    const logger = GASDBLogger.createComponentLogger('Integration-TestExecution');
    logger.info('Starting Collection integration tests');
    const testFramework = registerCollectionIntegrationTests();
    console.log('\n=== COLLECTION INTEGRATION TESTS ===');
    const results = testFramework.runAllTests();
    logger.info('Collection integration tests completed', {
      totalTests: results.getPassed().length + results.getFailed().length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      passRate: results.getPassRate().toFixed(1) + '%',
      executionTime: results.getTotalExecutionTime() + 'ms'
    });
    return results;
  } catch (error) {
    console.error('Failed to run Collection integration tests:', error);
    throw error;
  } finally {
    cleanupIntegrationTestEnvironment();
  }
}

/**
 * Register all Collection integration test suites with the TestFramework
 * This function creates and registers all test suites for integration testing
 */
function registerCollectionIntegrationTests() {
  const testFramework = new TestFramework();
  // Register all integration test suites
  testFramework.registerTestSuite(createQueryPipelineIntegrationTestSuite());
  testFramework.registerTestSuite(createErrorPropagationTestSuite());
  testFramework.registerTestSuite(createPerformanceTestSuite());
  testFramework.registerTestSuite(createConcurrentQueryTestSuite());
  testFramework.registerTestSuite(createMemoryManagementTestSuite());
  testFramework.registerTestSuite(createMongoDBCompatibilityTestSuite());
  testFramework.registerTestSuite(createBackwardsCompatibilityTestSuite());
  testFramework.registerTestSuite(createRobustnessTestSuite());
  return testFramework;
}

/**
 * Run Collection integration tests using the TestFramework
 * Alternative entry point that follows standard test framework patterns
 */
function runCollectionIntegrationTestsWithFramework() {
  try {
    setupIntegrationTestEnvironment();
    const logger = GASDBLogger.createComponentLogger('Integration-TestExecution');
    logger.info('Starting Collection integration tests');
    const testFramework = registerCollectionIntegrationTests();
    const results = testFramework.runAllTests();
    // Log comprehensive results
    logger.info('Collection integration tests completed', {
      totalTests: results.getPassed().length + results.getFailed().length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      passRate: results.getPassRate().toFixed(1) + '%',
      executionTime: results.getTotalExecutionTime() + 'ms'
    });
    return results;
  } catch (error) {
    const logger = GASDBLogger.createComponentLogger('Integration-TestExecution');
    logger.error('Failed to run Collection integration tests', { error: error.message });
    throw error;
  } finally {
    cleanupIntegrationTestEnvironment();
  }
}