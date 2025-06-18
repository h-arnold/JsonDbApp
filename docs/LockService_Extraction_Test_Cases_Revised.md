# LockService Extraction Test Cases (Revised)

## Overview

Focused test cases to verify the successful extraction of only Google Apps Script lock operations from `MasterIndex` into a separate `LockService` wrapper.

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

## Mock Object Tests (3 tests)

### Mock LockService Tests
- `testCreateMockLockService` - Verify mock LockService creation and basic behaviour
- `testMockLockServiceCallTracking` - Verify mock tracks method calls correctly
- `testMasterIndexWithMockLockService` - Verify MasterIndex works with mocked LockService

## Test Execution Strategy

### Test Order
1. LockService unit tests (isolated)
2. Mock object validation
3. MasterIndex constructor injection tests
4. Backwards compatibility verification
5. Integration tests with mocked dependencies

### Success Criteria
- All new LockService tests pass
- All existing MasterIndex tests continue to pass unchanged
- No regression in MasterIndex functionality
- Proper delegation to injected LockService verified
- All coordination logic remains in MasterIndex
