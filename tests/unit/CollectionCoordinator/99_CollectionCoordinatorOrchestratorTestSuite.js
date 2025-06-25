// 99_CollectionCoordinatorOrchestratorTestSuite.js
// Orchestrator for all CollectionCoordinator unit test suites

function runAllCollectionCoordinatorUnitTests() {
  const testFramework = new TestFramework();

  try {
    // Set up test environment before registering suites
    setupCollectionCoordinatorTestEnvironment();
    
    // Track test environment resources for cleanup
    if (COLLECTION_COORDINATOR_TEST_DATA.testFolderId) {
      testFramework.trackResourceFile(COLLECTION_COORDINATOR_TEST_DATA.testFolderId);
    }
    if (COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId) {
      testFramework.trackResourceFile(COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId);
    }

    // Register all CollectionCoordinator test suites
    testFramework.registerTestSuite(createCollectionCoordinatorConstructorValidationTestSuite());
    testFramework.registerTestSuite(createCollectionCoordinatorCoordinateTestSuite());
    testFramework.registerTestSuite(createCollectionCoordinatorAcquireOperationLockTestSuite());
    testFramework.registerTestSuite(createCollectionCoordinatorModificationTokenTestSuite());
    testFramework.registerTestSuite(createCollectionCoordinatorConflictResolutionTestSuite());
    testFramework.registerTestSuite(createCollectionCoordinatorUpdateMasterIndexTestSuite());
    testFramework.registerTestSuite(createCollectionCoordinatorLockReleaseAndTimeoutTestSuite());

    // Run all tests
    const results = testFramework.runAllTests();
    
    // Log results
    GASDBLogger.info('CollectionCoordinator Unit Tests Complete', {
      totalTests: results.results.length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      success: results.getFailed().length === 0
    });
    
    return results;

  } catch (error) {
    GASDBLogger.error('CollectionCoordinator test execution failed', { 
      error: error.message, 
      stack: error.stack 
    });
    throw error;
    
  } finally {
    // Always clean up test environment
    try {
      cleanupCollectionCoordinatorTestEnvironment();
    } catch (cleanupError) {
      GASDBLogger.warn('Error during test environment cleanup', { 
        error: cleanupError.message 
      });
    }
  }
}

/**
 * Register CollectionCoordinator test suites with a TestFramework instance
 * Useful for external test orchestration
 */
function registerCollectionCoordinatorTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createCollectionCoordinatorConstructorValidationTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorCoordinateTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorAcquireOperationLockTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorModificationTokenTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorConflictResolutionTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorUpdateMasterIndexTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorLockReleaseAndTimeoutTestSuite());
  return testFramework;
}