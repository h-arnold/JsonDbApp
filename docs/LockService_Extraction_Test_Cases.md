# LockService Extraction Test Cases

## Overview

Comprehensive test cases to verify the successful extraction of lock management functionality from `MasterIndex` into a separate `LockService`.

## LockService Unit Tests

### Constructor Tests
- `testLockServiceConstructorWithDefaultConfig` - Verify default configuration is applied
- `testLockServiceConstructorWithCustomConfig` - Verify custom configuration is accepted
- `testLockServiceConstructorWithInvalidConfig` - Verify error handling for invalid config

### Lock Acquisition Tests
- `testAcquireLockSuccess` - Verify successful lock acquisition with valid parameters
- `testAcquireLockWithCustomTimeout` - Verify lock acquisition with custom timeout
- `testAcquireLockInvalidKey` - Verify error thrown for invalid key parameter
- `testAcquireLockInvalidTimeout` - Verify error thrown for invalid timeout parameter
- `testAcquireLockTimeout` - Verify timeout error when lock cannot be acquired
- `testAcquireLockScriptLockFailure` - Verify error handling when underlying GAS lock fails

### Lock Release Tests
- `testReleaseLockSuccess` - Verify successful lock release with valid lock instance
- `testReleaseLockInvalidInstance` - Verify error handling for invalid lock instance
- `testReleaseLockNullInstance` - Verify error handling for null lock instance
- `testReleaseLockAlreadyReleased` - Verify handling of already released locks

### Error Handling Tests
- `testLockServiceErrorPropagation` - Verify proper error propagation from GAS LockService
- `testLockServiceInvalidArgumentErrors` - Verify appropriate error types for invalid arguments
- `testLockServiceTimeoutErrorFormat` - Verify timeout errors contain appropriate details

## MasterIndex Integration Tests

### Constructor Injection Tests
- `testMasterIndexConstructorWithDefaultLockService` - Verify default LockService is created
- `testMasterIndexConstructorWithInjectedLockService` - Verify injected LockService is used
- `testMasterIndexConstructorWithNullLockService` - Verify error handling for null LockService

### Lock-Protected Operations Tests
- `testAddCollectionUsesLockService` - Verify `addCollection` uses injected LockService
- `testAddCollectionsUsesLockService` - Verify `addCollections` uses injected LockService
- `testUpdateCollectionMetadataUsesLockService` - Verify metadata updates use LockService
- `testResolveConflictUsesLockService` - Verify conflict resolution uses LockService
- `testAcquireLockUsesLockService` - Verify lock acquisition delegates to LockService
- `testReleaseLockUsesLockService` - Verify lock release delegates to LockService
- `testCleanupExpiredLocksUsesLockService` - Verify cleanup operations use LockService

### Lock Failure Handling Tests
- `testAddCollectionLockTimeout` - Verify timeout handling in addCollection
- `testUpdateMetadataLockTimeout` - Verify timeout handling in updateCollectionMetadata
- `testResolveConflictLockTimeout` - Verify timeout handling in resolveConflict
- `testLockServiceFailurePropagation` - Verify LockService errors are properly propagated

### Backwards Compatibility Tests
- `testMasterIndexAPIUnchanged` - Verify all public methods remain unchanged
- `testMasterIndexBehaviourPreserved` - Verify existing functionality works identically
- `testMasterIndexConfigurationCompatible` - Verify existing config options still work

## Mock Object Tests

### Mock LockService Tests
- `testCreateMockLockService` - Verify mock LockService creation
- `testMockLockServiceAcquireBehaviour` - Verify mock acquire method behaviour
- `testMockLockServiceReleaseBehaviour` - Verify mock release method behaviour
- `testMockLockServiceTimeoutSimulation` - Verify mock can simulate timeouts
- `testMockLockServiceCallTracking` - Verify mock tracks method calls for verification

### Mock Integration Tests
- `testMasterIndexWithMockLockService` - Verify MasterIndex works with mocked LockService
- `testMockLockServiceMethodCallCounts` - Verify expected number of lock service calls
- `testMockLockServiceParameterValidation` - Verify correct parameters passed to lock service

## Performance and Behaviour Tests

### Lock Contention Tests
- `testConcurrentLockAcquisition` - Verify behaviour under concurrent lock requests
- `testLockReleaseUnderContention` - Verify proper release behaviour under contention
- `testLockTimeoutUnderLoad` - Verify timeout handling under high load

### Resource Management Tests
- `testLockProperlyReleased` - Verify locks are always released after operations
- `testLockReleaseOnException` - Verify locks released even when operations throw errors
- `testNoLockLeaks` - Verify no lock instances remain unreleased

### Configuration Tests
- `testLockTimeoutConfiguration` - Verify lock timeout configuration is respected
- `testLockServiceConfigurationPropagation` - Verify config properly passed to LockService

## Error Scenario Tests

### Exception Handling Tests
- `testLockServiceExceptionHandling` - Verify proper handling of LockService exceptions
- `testMasterIndexExceptionPropagation` - Verify exceptions properly propagated to callers
- `testLockReleaseOnOperationFailure` - Verify locks released when operations fail

### Edge Case Tests
- `testLockServiceWithZeroTimeout` - Verify behaviour with zero timeout
- `testLockServiceWithNegativeTimeout` - Verify error handling for negative timeout
- `testLockServiceWithExtremelyLargeTimeout` - Verify handling of very large timeouts

## Integration with Existing Codebase

### Existing Test Compatibility
- `testExistingMasterIndexTestsStillPass` - Verify all existing tests continue to pass
- `testExistingMockObjectsStillWork` - Verify existing mock objects remain functional
- `testExistingTestFrameworkCompatible` - Verify test framework still works correctly

### Documentation Tests
- `testLockServiceDocumentationAccuracy` - Verify JSDoc comments are accurate
- `testMasterIndexDocumentationUpdated` - Verify MasterIndex docs reflect changes
- `testCodeExamplesInDocumentation` - Verify documentation examples work correctly

## Test Execution Strategy

### Test Order
1. LockService unit tests (isolated)
2. Mock object creation and validation
3. MasterIndex constructor injection tests
4. Integration tests with mocked dependencies
5. Backwards compatibility verification
6. Performance and edge case tests

### Test Data Requirements
- Mock Google Apps Script LockService
- Sample collection metadata objects
- Various timeout configurations
- Error simulation scenarios

### Success Criteria
- All new tests pass
- All existing tests continue to pass
- No regression in functionality
- Proper error handling maintained
- Performance characteristics preserved
