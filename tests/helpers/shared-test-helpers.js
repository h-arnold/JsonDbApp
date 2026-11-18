/**
 * Shared Test Helpers for Vitest
 *
 * Provides resource tracking, fixture creation, and dependency setup shared by the
 * component test-helper modules.
 */

/**
 * Creates an isolated set of tracked test resources.
 * @returns {object} Sets of file IDs, folder IDs, and master index keys
 */
export const createTestResourceTracker = () => ({
  fileIds: new Set(),
  folderIds: new Set(),
  masterIndexKeys: new Set()
});

/**
 * Generates a unique timestamp-based identifier.
 * @returns {string} Timestamp identifier
 */
export const generateTimestamp = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Creates and registers a unique master index key.
 * @param {object} testResources - Tracked test resources
 * @param {string} prefix - Prefix for the generated key
 * @returns {string} Master index key
 */
export const createMasterIndexKey = (testResources, prefix) => {
  const key = `${prefix}${generateTimestamp()}`;
  testResources.masterIndexKeys.add(key);
  return key;
};

/**
 * Creates and registers a test folder in the mock Drive.
 * @param {object} testResources - Tracked test resources
 * @param {string} prefix - Prefix for the generated folder name
 * @returns {string} Folder ID
 */
export const createTestFolder = (testResources, prefix) => {
  const folderName = `${prefix}${generateTimestamp()}`;
  const folderId = DriveApp.createFolder(folderName).getId();
  testResources.folderIds.add(folderId);
  return folderId;
};

/**
 * Creates a file in a folder and registers it for cleanup.
 * @param {object} testResources - Tracked test resources
 * @param {string} folderId - Parent folder ID
 * @param {string} fileName - Name of the file
 * @param {string} content - File content
 * @param {string} [mimeType] - Optional MIME type
 * @returns {string} File ID
 */
export const createTrackedFile = (testResources, folderId, fileName, content, mimeType) => {
  const file = DriveApp.getFolderById(folderId).createFile(fileName, content, mimeType);
  const fileId = file.getId();
  testResources.fileIds.add(fileId);
  return fileId;
};

/**
 * Removes all resources registered with a tracker.
 * @param {object} testResources - Tracked test resources
 */
export const cleanupTestResources = (testResources) => {
  if (testResources.masterIndexKeys.size > 0) {
    const scriptProperties = PropertiesService.getScriptProperties();
    for (const key of testResources.masterIndexKeys) {
      scriptProperties.deleteProperty(key);
    }
  }

  for (const fileId of testResources.fileIds) {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch {
      // File may already be deleted, ignore
    }
  }

  for (const folderId of testResources.folderIds) {
    try {
      DriveApp.getFolderById(folderId).setTrashed(true);
    } catch {
      // Folder may already be deleted, ignore
    }
  }

  testResources.masterIndexKeys.clear();
  testResources.fileIds.clear();
  testResources.folderIds.clear();
};

/**
 * Builds the shared dependency set for component test environments.
 * @param {string} loggerName - Component logger name
 * @param {string} masterIndexKey - Master index ScriptProperties key
 * @param {string} folderId - Root folder ID of the test database
 * @param {object} [databaseOverrides] - Additional properties for the mock database
 * @returns {object} Logger, file service, master index, database config, and mock database
 */
export const createTestEnvironment = (
  loggerName,
  masterIndexKey,
  folderId,
  databaseOverrides = {}
) => {
  const logger = JDbLogger.createComponentLogger(loggerName);
  const fileOps = new FileOperations(logger);
  const fileService = new FileService(fileOps, logger);
  const masterIndex = new MasterIndex({ masterIndexKey, version: 1 });
  const dbConfig = new DatabaseConfig({ name: 'testDB', rootFolderId: folderId });
  const database = {
    name: 'testDB',
    config: dbConfig,
    _masterIndex: masterIndex,
    _fileOps: fileOps,
    _fileService: fileService,
    /**
     * Gets the master index
     * @returns {Object} The master index
     */
    getMasterIndex: () => masterIndex,
    ...databaseOverrides
  };

  return { logger, fileService, masterIndex, dbConfig, database };
};
