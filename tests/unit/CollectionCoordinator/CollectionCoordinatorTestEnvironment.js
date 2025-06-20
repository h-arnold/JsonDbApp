// CollectionCoordinatorTestEnvironment.js
// Shared setup/teardown for CollectionCoordinator unit tests

var COLLECTION_COORDINATOR_TEST_DATA = {
  testFolderId: null,
  createdFileIds: []
};

function setupCollectionCoordinatorTestEnvironment() {
  var logger = GASDBLogger.createComponentLogger('CollectionCoordinator-Setup');
  logger.info('Setting up CollectionCoordinator test environment');
  // Create a dedicated test folder in Drive
  var folder = DriveApp.createFolder('GASDB_CollectionCoordinator_UnitTest_' + new Date().getTime());
  COLLECTION_COORDINATOR_TEST_DATA.testFolderId = folder.getId();
  // Track for cleanup: DO NOT call TestFramework here. Instead, let the orchestrator or test suite register the folder ID with the correct TestFramework instance.
  // The folder ID is available as COLLECTION_COORDINATOR_TEST_DATA.testFolderId for registration in orchestrator or suite setup.
}

function cleanupCollectionCoordinatorTestEnvironment() {
  var logger = GASDBLogger.createComponentLogger('CollectionCoordinator-Cleanup');
  logger.info('Cleaning up CollectionCoordinator test environment');
  // Remove test folder and any files created
  try {
    if (COLLECTION_COORDINATOR_TEST_DATA.testFolderId) {
      var folder = DriveApp.getFolderById(COLLECTION_COORDINATOR_TEST_DATA.testFolderId);
      folder.setTrashed(true);
    }
    // Remove any additional files tracked
    (COLLECTION_COORDINATOR_TEST_DATA.createdFileIds || []).forEach(function(fileId) {
      try {
        var file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
      } catch (e) {}
    });
  } catch (e) {
    logger.error('Cleanup failed: ' + e);
  }
  COLLECTION_COORDINATOR_TEST_DATA.testFolderId = null;
  COLLECTION_COORDINATOR_TEST_DATA.createdFileIds = [];
}
