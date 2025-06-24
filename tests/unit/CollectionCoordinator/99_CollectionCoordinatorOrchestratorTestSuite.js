// 99_CollectionCoordinatorOrchestratorTestSuite.js
// Orchestrator for all CollectionCoordinator unit test suites

function runAllCollectionCoordinatorUnitTests() {
  const testFramework = new TestFramework();

  // Register all CollectionCoordinator test suites
  testFramework.registerTestSuite(createCollectionCoordinatorConstructorValidationTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorCoordinateTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorAcquireOperationLockTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorModificationTokenTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorConflictResolutionTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorUpdateMasterIndexTestSuite());
  testFramework.registerTestSuite(createCollectionCoordinatorLockReleaseAndTimeoutTestSuite());

  // Register the test folder for cleanup with the correct TestFramework instance
  // This must be done after setup, but before running tests, and before teardown
  // So we use the beforeAll/afterAll hooks of the first suite to ensure correct timing
  // Determine first and last suites for proper setup/teardown
  const suites = Array.from(testFramework.getTestSuites().values());
  const firstSuite = suites[0];
  const lastSuite = suites[suites.length - 1];
  if (firstSuite) {
    firstSuite
      .setBeforeAll(function() {
        if (typeof setupCollectionCoordinatorTestEnvironment === 'function') {
          setupCollectionCoordinatorTestEnvironment();
          if (COLLECTION_COORDINATOR_TEST_DATA && COLLECTION_COORDINATOR_TEST_DATA.testFolderId) {
            testFramework.trackResourceFile(COLLECTION_COORDINATOR_TEST_DATA.testFolderId);
          }
        }
      })
      .setBeforeEach(function() {
        // Track any files created by individual tests
        if (Array.isArray(COLLECTION_COORDINATOR_TEST_DATA.createdFileIds)) {
          COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.forEach(function(fileId) {
            testFramework.trackResourceFile(fileId);
          });
          COLLECTION_COORDINATOR_TEST_DATA.createdFileIds = [];
        }
      });
  }
  if (lastSuite) {
    lastSuite.setAfterAll(function() {
      if (typeof cleanupCollectionCoordinatorTestEnvironment === 'function') {
        cleanupCollectionCoordinatorTestEnvironment();
      }
    });
  }

  // Run all tests
  const results = testFramework.runAllTests();

  // Print summary
  Logger.log('CollectionCoordinator Unit Test Results:');
  Logger.log(results.getSummary());
  return results;
}