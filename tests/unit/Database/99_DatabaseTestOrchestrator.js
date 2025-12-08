/**
 * 99_DatabaseTestOrchestrator.js - Orchestrates all Database test suites
 *
 * Registers and runs all Database test suites, handling environment setup and teardown.
 */

// Import environment setup/teardown
// (Assume all files are loaded in Apps Script context)


function runDatabaseTests() {
  try {
    JDbLogger.info('Starting Database Test Execution');
    // Setup test environment once for all suites
    setupDatabaseTestEnvironment();
    try {
      // Register all test suites using global convenience functions
      registerTestSuite(createDatabaseInitializationTestSuite());
      registerTestSuite(createCollectionManagementTestSuite());
      registerTestSuite(createIndexFileStructureTestSuite());
      // Register backup index suite
      registerTestSuite(createDatabaseBackupIndexTestSuite());
      // Register integration suite
      registerTestSuite(createDatabaseMasterIndexIntegrationTestSuite());
      // Register merged recovery tests
      if (typeof createDatabaseRecoverMethodTestSuite === 'function') {
        registerTestSuite(createDatabaseRecoverMethodTestSuite());
      }
      // Register merged strict MasterIndex-only access tests
      if (typeof createCollectionMethodsNoFallbackTestSuite === 'function') {
        registerTestSuite(createCollectionMethodsNoFallbackTestSuite());
      }
      // Run all tests
      const results = runAllTests();
      return results;
    } finally {
      // Always clean up test environment
      cleanupDatabaseTestEnvironment();
    }
  } catch (error) {
    JDbLogger.error('Failed to execute Database tests', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    JDbLogger.info('Database Test Execution Complete');
  }
}
