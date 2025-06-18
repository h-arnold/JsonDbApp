# LockService Extraction Test Cases (Revised)

## Overview

Focused test cases to verify the successful extraction of only Google Apps Script lock operations from `MasterIndex` into a separate `LockService` wrapper using real GAS environment with proper setup and teardown.

## LockService Unit Tests (8 tests)

### Constructor Tests
- `testLockServiceConstructorWithDefaultConfig` - Verify default configuration
- `testLockServiceConstructorWithInvalidConfig` - Verify error handling for invalid config

### Lock Operation Tests
- `testAcquireScriptLockSuccess` - Verify successful GAS lock acquisition
- `testAcquireScriptLockTimeout` - Verify timeout error when lock cannot be acquired
- `testAcquireScriptLockInvalidTimeout` - Verify error thrown for invalid timeout
- `testReleaseScriptLockSuccess` - Verify successful lock release
- `testReleaseScriptLockInvalidInstance` - Verify error handling for invalid lock instance
- `testReleaseScriptLockNullInstance` - Verify error handling for null lock instance

## MasterIndex Integration Tests (6 tests)

### Constructor Injection Tests
- `testMasterIndexConstructorWithDefaultLockService` - Verify default LockService is created
- `testMasterIndexConstructorWithInjectedLockService` - Verify injected LockService is used

### GAS Lock Delegation Tests
- `testMasterIndexUsesInjectedLockService` - Verify MasterIndex delegates to injected LockService
- `testMasterIndexLockServiceMethodCalls` - Verify correct parameters passed to LockService
- `testMasterIndexLockServiceTimeout` - Verify timeout handling delegates properly
- `testMasterIndexLockServiceRelease` - Verify lock release delegates properly

## Backwards Compatibility Tests (4 tests)

### API Compatibility
- `testMasterIndexAPIUnchanged` - Verify all public methods work identically
- `testMasterIndexBehaviourPreserved` - Verify existing functionality unchanged
- `testExistingMasterIndexTestsStillPass` - Verify all existing tests continue to pass
- `testMasterIndexConfigurationCompatible` - Verify existing config options still work

## Total Test Count: 22 tests

- **LockService Unit Tests**: 8 tests
- **MasterIndex Integration Tests**: 6 tests  
- **Backwards Compatibility Tests**: 4 tests
- **Real Environment Integration Tests**: 4 tests

### LockService Integration Tests
- `testLockServiceWithRealGASLockService` - Verify LockService works with real Google Apps Script LockService
- `testLockServiceConcurrentOperations` - Verify lock behaviour with actual concurrent operations
- `testMasterIndexWithRealLockService` - Verify MasterIndex works with real LockService instance
- `testLockServiceErrorHandlingWithRealEnvironment` - Verify error handling in real GAS environment

## Test Execution Strategy

### Test Environment Setup and Teardown

The tests will use real Google Apps Script environment with proper lifecycle management:

```javascript
// Global test data storage
const LOCKSERVICE_TEST_DATA = {
  createdProperties: [],
  testMasterIndexKey: 'GASDB_TEST_LOCKSERVICE_MASTER_INDEX'
};

/**
 * Setup LockService test environment
 */
function setupLockServiceTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('LockService-Setup');
  // Store original master index if it exists
  const originalIndex = PropertiesService.getScriptProperties().getProperty('GASDB_MASTER_INDEX');
  if (originalIndex) {
    LOCKSERVICE_TEST_DATA.originalMasterIndex = originalIndex;
  }
  
  // Create test master index
  PropertiesService.getScriptProperties().setProperty(
    LOCKSERVICE_TEST_DATA.testMasterIndexKey, 
    JSON.stringify({ version: 1, collections: {}, locks: {} })
  );
  LOCKSERVICE_TEST_DATA.createdProperties.push(LOCKSERVICE_TEST_DATA.testMasterIndexKey);
  
  logger.info('LockService test environment setup completed');
}

/**
 * Clean up LockService test environment
 */
function cleanupLockServiceTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('LockService-Cleanup');
  
  // Clean up created properties
  LOCKSERVICE_TEST_DATA.createdProperties.forEach(key => {
    try {
      PropertiesService.getScriptProperties().deleteProperty(key);
    } catch (error) {
      logger.warn('Failed to delete property during cleanup', { key, error: error.message });
    }
  });
  
  // Restore original master index if it existed
  if (LOCKSERVICE_TEST_DATA.originalMasterIndex) {
    PropertiesService.getScriptProperties().setProperty('GASDB_MASTER_INDEX', LOCKSERVICE_TEST_DATA.originalMasterIndex);
  }
  
  // Clear test data
  LOCKSERVICE_TEST_DATA.createdProperties = [];
  delete LOCKSERVICE_TEST_DATA.originalMasterIndex;
  
  logger.info('LockService test cleanup completed');
}
```

### Test Order

1. LockService unit tests (isolated with real GAS LockService)
2. Real environment validation 
3. MasterIndex constructor injection tests
4. Integration tests with real LockService instances
5. Backwards compatibility verification

### Success Criteria

- All new LockService tests pass with real GAS environment
- All existing MasterIndex tests continue to pass unchanged
- No regression in MasterIndex functionality
- Proper delegation to injected LockService verified in real environment
- All coordination logic remains in MasterIndex
- Test cleanup properly restores original environment state
