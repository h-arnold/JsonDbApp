/**
 * DatabaseConfigTest.js - DatabaseConfig Class Tests
 * 
 * Comprehensive tests for the DatabaseConfig class including:
 * - Configuration creation and validation
 * - Default and custom values
 * - Parameter validation
 * 
 */

// Global test data storage for DatabaseConfig tests
const DATABASECONFIG_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_DatabaseConfig_Test_' + new Date().getTime(),
  createdFolderIds: []
};

/**
 * Setup function for DatabaseConfig tests
 */
function createDatabaseConfigSetupTestSuite() {
  const suite = new TestSuite('DatabaseConfig Setup - Create Test Environment');
  
  suite.addTest('should create test folder for DatabaseConfig tests', function() {
    // Arrange
    const logger = JDbLogger.createComponentLogger('DatabaseConfig-Setup');
    
    // Act
    try {
      const folder = DriveApp.createFolder(DATABASECONFIG_TEST_DATA.testFolderName);
      DATABASECONFIG_TEST_DATA.testFolderId = folder.getId();
      DATABASECONFIG_TEST_DATA.createdFolderIds.push(DATABASECONFIG_TEST_DATA.testFolderId);
      
      // Assert
      TestFramework.assertDefined(DATABASECONFIG_TEST_DATA.testFolderId, 'Test folder should be created');
      TestFramework.assertTrue(DATABASECONFIG_TEST_DATA.testFolderId.length > 0, 'Folder ID should not be empty');
      logger.info('Created test folder for DatabaseConfig', { 
        folderId: DATABASECONFIG_TEST_DATA.testFolderId, 
        name: DATABASECONFIG_TEST_DATA.testFolderName 
      });
      
    } catch (error) {
      logger.error('Failed to create test folder for DatabaseConfig', { error: error.message });
      throw error;
    }
  });
  
  return suite;
}

/**
 * Test DatabaseConfig class creation and default values
 */
function createDatabaseConfigCreationTestSuite() {
  const suite = new TestSuite('DatabaseConfig Creation and Default Values');
  
  suite.addTest('should create DatabaseConfig with default values', function() {
    // Act - This should fail initially (TDD Red phase)
    try {
      const config = new DatabaseConfig();
      // Assert - These assertions will fail until DatabaseConfig is implemented
      TestFramework.assertNotNull(config, 'DatabaseConfig should be created');
      TestFramework.assertDefined(config.rootFolderId, 'Root folder ID should be defined');
      TestFramework.assertTrue(config.autoCreateCollections, 'Auto create collections should be true by default');
      TestFramework.assertEquals(config.lockTimeout, 30000, 'Default lockTimeout should be 30000ms');
      TestFramework.assertEquals(config.retryAttempts, 3, 'Default retryAttempts should be 3');
      TestFramework.assertEquals(config.retryDelayMs, 1000, 'Default retryDelayMs should be 1000ms');
      TestFramework.assertTrue(config.cacheEnabled, 'Cache should be enabled by default');
      TestFramework.assertEquals(config.logLevel, 'INFO', 'Default log level should be INFO');
      TestFramework.assertFalse(config.backupOnInitialise, 'backupOnInitialise should be false by default');
      TestFramework.assertFalse(config.stripDisallowedCollectionNameCharacters, 'Sanitisation flag should default to false');
    } catch (error) {
      throw new Error('DatabaseConfig not implemented: ' + error.message);
    }
  });
  suite.addTest('should create DatabaseConfig with custom values', function() {
    // Arrange
    const customConfig = {
      rootFolderId: DATABASECONFIG_TEST_DATA.testFolderId,
      autoCreateCollections: false,
      lockTimeout: 60000,
      retryAttempts: 5,
      retryDelayMs: 2000,
      cacheEnabled: false,
      logLevel: 'DEBUG',
      backupOnInitialise: true,
      stripDisallowedCollectionNameCharacters: true
    };
    // Act - This should fail initially (TDD Red phase)
    try {
      const config = new DatabaseConfig(customConfig);
      // Assert
      TestFramework.assertEquals(config.rootFolderId, customConfig.rootFolderId, 'Root folder ID should match');
      TestFramework.assertFalse(config.autoCreateCollections, 'Auto create should be disabled');
      TestFramework.assertEquals(config.lockTimeout, 60000, 'Custom lockTimeout should be used');
      TestFramework.assertEquals(config.retryAttempts, 5, 'Custom retryAttempts should be used');
      TestFramework.assertEquals(config.retryDelayMs, 2000, 'Custom retryDelayMs should be used');
      TestFramework.assertFalse(config.cacheEnabled, 'Cache should be disabled');
      TestFramework.assertEquals(config.logLevel, 'DEBUG', 'Log level should be DEBUG');
      TestFramework.assertTrue(config.backupOnInitialise, 'backupOnInitialise should be true when set');
      TestFramework.assertTrue(config.stripDisallowedCollectionNameCharacters, 'Sanitisation flag should respect custom value');
    } catch (error) {
      throw new Error('DatabaseConfig constructor not implemented: ' + error.message);
    }
  });
  suite.addTest('should merge custom config with defaults', function() {
    // Arrange
    const partialConfig = {
      lockTimeout: 45000,
      retryAttempts: 7,
      logLevel: 'WARN'
    };
    // Act
    try {
      const config = new DatabaseConfig(partialConfig);
      // Assert - partial config should override defaults, others should remain default
      TestFramework.assertEquals(config.lockTimeout, 45000, 'Custom lockTimeout should be used');
      TestFramework.assertEquals(config.retryAttempts, 7, 'Custom retryAttempts should be used');
      TestFramework.assertEquals(config.retryDelayMs, 1000, 'Default retryDelayMs should be preserved');
      TestFramework.assertEquals(config.logLevel, 'WARN', 'Custom log level should be used');
      TestFramework.assertTrue(config.autoCreateCollections, 'Default autoCreateCollections should be preserved');
      TestFramework.assertTrue(config.cacheEnabled, 'Default cacheEnabled should be preserved');
      TestFramework.assertDefined(config.rootFolderId, 'Default rootFolderId should be set');
      TestFramework.assertFalse(config.backupOnInitialise, 'Default backupOnInitialise should be preserved (false)');
      TestFramework.assertFalse(config.stripDisallowedCollectionNameCharacters, 'Sanitisation flag should default to false');
    } catch (error) {
      throw new Error('DatabaseConfig merging not implemented: ' + error.message);
    }
  });

  suite.addTest('should preserve sanitisation flag through clone and serialization', function() {
    const config = new DatabaseConfig({ stripDisallowedCollectionNameCharacters: true });
    const clone = config.clone();
    TestFramework.assertTrue(clone.stripDisallowedCollectionNameCharacters, 'clone() should retain the sanitisation flag');

    const serialised = clone.toJSON();
    TestFramework.assertTrue(serialised.stripDisallowedCollectionNameCharacters, 'toJSON() should include the sanitisation flag');

    const deserialised = DatabaseConfig.fromJSON(serialised);
    TestFramework.assertTrue(deserialised.stripDisallowedCollectionNameCharacters, 'fromJSON() should restore the sanitisation flag');
  });
  
  return suite;
}

/**
 * Test DatabaseConfig validation functionality
 */
function createDatabaseConfigValidationTestSuite() {
  const suite = new TestSuite('DatabaseConfig Validation');
  
  suite.addTest('should validate lock timeout parameter', function() {
    // Non-number timeout
    TestFramework.assertThrows(() => {
      new DatabaseConfig({ lockTimeout: 'invalid' });
    }, Error, 'Should throw error for non-number lockTimeout');

    // Negative timeout
    TestFramework.assertThrows(() => {
      new DatabaseConfig({ lockTimeout: -1 });
    }, Error, 'Should throw error for negative lockTimeout');

    // Below minimum threshold
    TestFramework.assertThrows(() => {
      new DatabaseConfig({ lockTimeout: 499 });
    }, Error, 'Should throw error for lockTimeout < 500ms');

    // Minimum valid timeout
    const cfg = new DatabaseConfig({ lockTimeout: 500 });
    TestFramework.assertEquals(cfg.lockTimeout, 500, 'lockTimeout should be accepted at minimum value');
  });
  suite.addTest('should validate retryAttempts and retryDelayMs parameters', function() {
    // retryAttempts: non-number
    TestFramework.assertThrows(() => {
      new DatabaseConfig({ retryAttempts: 'invalid' });
    }, Error, 'Should throw error for non-number retryAttempts');
    // retryAttempts: less than 1
    TestFramework.assertThrows(() => {
      new DatabaseConfig({ retryAttempts: 0 });
    }, Error, 'Should throw error for retryAttempts < 1');
    // retryDelayMs: non-number
    TestFramework.assertThrows(() => {
      new DatabaseConfig({ retryDelayMs: 'invalid' });
    }, Error, 'Should throw error for non-number retryDelayMs');
    // retryDelayMs: negative
    TestFramework.assertThrows(() => {
      new DatabaseConfig({ retryDelayMs: -1 });
    }, Error, 'Should throw error for negative retryDelayMs');
    // Valid minimums
    const cfg = new DatabaseConfig({ lockTimeout: 500, retryAttempts: 1, retryDelayMs: 0 });
    TestFramework.assertEquals(cfg.lockTimeout, 500, 'lockTimeout should be accepted at minimum value');
    TestFramework.assertEquals(cfg.retryAttempts, 1, 'retryAttempts should be accepted at minimum value');
    TestFramework.assertEquals(cfg.retryDelayMs, 0, 'retryDelayMs should be accepted at minimum value');
  });
  suite.addTest('should validate log level parameter', function() {
    // Act & Assert - Test invalid log level values
    try {
      // Test invalid log level
      TestFramework.assertThrows(() => {
        new DatabaseConfig({ logLevel: 'INVALID' });
      }, Error, 'Should throw error for invalid log level');
      
      // Test null log level (should be allowed - constructor sets default)
      const configWithNull = new DatabaseConfig({ logLevel: null });
      TestFramework.assertEquals(configWithNull.logLevel, 'INFO', 'Null log level should default to INFO');
      
      // Test undefined log level (should be allowed - constructor sets default)
      const configWithUndefined = new DatabaseConfig({ logLevel: undefined });
      TestFramework.assertEquals(configWithUndefined.logLevel, 'INFO', 'Undefined log level should default to INFO');
      
      // Test valid log levels should work
      const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
      validLevels.forEach(level => {
        const validConfig = new DatabaseConfig({ logLevel: level });
        TestFramework.assertEquals(validConfig.logLevel, level, `Valid log level ${level} should be accepted`);
      });
      
    } catch (error) {
      throw new Error('DatabaseConfig log level validation not implemented: ' + error.message);
    }
  });
  suite.addTest('should validate boolean parameters', function() {
    // Act & Assert - Test invalid boolean values
    try {
      // Test invalid autoCreateCollections
      TestFramework.assertThrows(() => {
        new DatabaseConfig({ autoCreateCollections: 'invalid' });
      }, Error, 'Should throw error for non-boolean autoCreateCollections');
      
      // Test invalid cacheEnabled
      TestFramework.assertThrows(() => {
        new DatabaseConfig({ cacheEnabled: 'invalid' });
      }, Error, 'Should throw error for non-boolean cacheEnabled');
      
      // Test invalid sanitisation flag
      TestFramework.assertThrows(() => {
        new DatabaseConfig({ stripDisallowedCollectionNameCharacters: 'invalid' });
      }, Error, 'Should throw error for non-boolean sanitisation flag');

      // Test valid boolean values should work
      const validConfig1 = new DatabaseConfig({
        autoCreateCollections: true,
        cacheEnabled: false,
        backupOnInitialise: true,
        stripDisallowedCollectionNameCharacters: true
      });
      TestFramework.assertTrue(validConfig1.autoCreateCollections, 'Valid boolean true should be accepted');
      TestFramework.assertFalse(validConfig1.cacheEnabled, 'Valid boolean false should be accepted');
      TestFramework.assertTrue(validConfig1.backupOnInitialise, 'Valid boolean true for backupOnInitialise should be accepted');
      TestFramework.assertTrue(validConfig1.stripDisallowedCollectionNameCharacters, 'Valid boolean true for sanitisation flag should be accepted');

      // Test invalid backupOnInitialise
      TestFramework.assertThrows(() => {
        new DatabaseConfig({ backupOnInitialise: 'invalid' });
      }, Error, 'Should throw error for non-boolean backupOnInitialise');
      
    } catch (error) {
      throw new Error('DatabaseConfig boolean validation not implemented: ' + error.message);
    }
  });
  suite.addTest('should validate rootFolderId parameter', function() {
    // Act & Assert - Test invalid rootFolderId values
    try {
      // Test empty string rootFolderId (should be allowed - defaults to root folder)
      const configWithEmpty = new DatabaseConfig({ rootFolderId: '' });
      TestFramework.assertDefined(configWithEmpty.rootFolderId, 'Empty rootFolderId should default to Drive root');
      TestFramework.assertTrue(configWithEmpty.rootFolderId.length > 0, 'Root folder ID should not remain empty');
      
      // Test null rootFolderId (should be allowed for default behaviour)
      const configWithNull = new DatabaseConfig({ rootFolderId: null });
      TestFramework.assertDefined(configWithNull.rootFolderId, 'Null rootFolderId should default to Drive root');
      
      // Test non-string rootFolderId (should throw error)
      TestFramework.assertThrows(() => {
        new DatabaseConfig({ rootFolderId: 123 });
      }, Error, 'Should throw error for non-string rootFolderId');
      
      TestFramework.assertThrows(() => {
        new DatabaseConfig({ rootFolderId: {} });
      }, Error, 'Should throw error for object rootFolderId');
      
      // Test valid rootFolderId
      const validConfig = new DatabaseConfig({ rootFolderId: DATABASECONFIG_TEST_DATA.testFolderId });
      TestFramework.assertEquals(validConfig.rootFolderId, DATABASECONFIG_TEST_DATA.testFolderId, 'Valid rootFolderId should be accepted');
      
    } catch (error) {
      throw new Error('DatabaseConfig rootFolderId validation not implemented: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Cleanup function for DatabaseConfig tests
 */
function createDatabaseConfigCleanupTestSuite() {
  const suite = new TestSuite('DatabaseConfig Cleanup - Remove Test Resources');
  
  suite.addTest('should clean up test folders', function() {
    // Arrange
    const logger = JDbLogger.createComponentLogger('DatabaseConfig-Cleanup');
    let cleanedFolders = 0;
    let failedFolders = 0;
    
    // Act
    DATABASECONFIG_TEST_DATA.createdFolderIds.forEach(folderId => {
      try {
        const folder = DriveApp.getFolderById(folderId);
        folder.setTrashed(true);
        cleanedFolders++;
      } catch (error) {
        failedFolders++;
        logger.warn('Failed to delete folder', { folderId, error: error.message });
      }
    });
    
    // Assert
    logger.info('DatabaseConfig cleanup summary', { 
      cleanedFolders: cleanedFolders, 
      failedFolders: failedFolders,
      totalFolders: DATABASECONFIG_TEST_DATA.createdFolderIds.length
    });
    
    TestFramework.assertEquals(failedFolders, 0, 'All test folders should be cleaned up successfully');
  });
  
  return suite;
}

/**
 * Run all DatabaseConfig tests
 * This function orchestrates all test suites for DatabaseConfig
 */
function runDatabaseConfigTests() {
  try {
    JDbLogger.info('Starting DatabaseConfig Test Execution');
    
    // Register all test suites using global convenience functions
    registerTestSuite(createDatabaseConfigSetupTestSuite());
    registerTestSuite(createDatabaseConfigCreationTestSuite());
    registerTestSuite(createDatabaseConfigValidationTestSuite());
    registerTestSuite(createDatabaseConfigCleanupTestSuite());
    
    // Run all tests
    const results = runAllTests();
    
    JDbLogger.info('DatabaseConfig Test Execution Complete');
    
    return results;
    
  } catch (error) {
    JDbLogger.error('Failed to execute DatabaseConfig tests', { error: error.message, stack: error.stack });
    throw error;
  }
}

function testDatabaseConfigLockTimeoutValidation() {
  const testSuite = new TestSuite('DatabaseConfig lockTimeout validation');

  testSuite.addTest('testValidMinimumLockTimeout', function() {
    const config = new DatabaseConfig({ lockTimeout: 500 });
    AssertionUtilities.assertEquals(
      config.lockTimeout,
      500,
      'lockTimeout should be set to 500ms'
    );
  });

  testSuite.addTest('testTooLowLockTimeoutThrowsError', function() {
    try {
      new DatabaseConfig({ lockTimeout: 499 });
      AssertionUtilities.fail('Constructor should throw error for lockTimeout < 500');
    } catch (e) {
      AssertionUtilities.assertTrue(
        e instanceof Error,
        'Error should be thrown for invalid lockTimeout'
      );
      AssertionUtilities.assertTrue(
        /at least 500ms/.test(e.message),
        'Error message should indicate minimum lock timeout requirement'
      );
    }
  });

  return testSuite;
}
