/**
 * LockService Collection Operation Test Suite
 * Tests for LockService collection lock operations moved from MasterIndex
 */

/**
 * Creates test suite for LockService collection lock operations
 * These tests were moved from MasterIndexTest.js Virtual Locking Mechanism tests
 * @returns {TestSuite} The collection lock operation test suite
 */
function createLockServiceCollectionOperationTestSuite() {
  const suite = new TestSuite('LockService Collection Operations');

  suite.addTest('should acquire lock for collection successfully', function() {
    // Arrange
    const lockService = new DbLockService();
    const collectionName = 'lockTestCollection';
    const operationId = 'test-operation-123';
    
    // Act
    const lockAcquired = lockService.acquireCollectionLock(collectionName, operationId);
    
    // Assert
    TestFramework.assertTrue(lockAcquired, 'Lock should be acquired successfully');
    TestFramework.assertTrue(lockService.isCollectionLocked(collectionName), 'Collection should be locked');
  });
  
  suite.addTest('should prevent multiple locks on same collection', function() {
    // Arrange
    const lockService = new DbLockService();
    const collectionName = 'conflictTestCollection';
    
    // Act
    const firstLock = lockService.acquireCollectionLock(collectionName, 'operation-1');
    const secondLock = lockService.acquireCollectionLock(collectionName, 'operation-2');
    
    // Assert
    TestFramework.assertTrue(firstLock, 'First lock should be acquired');
    TestFramework.assertFalse(secondLock, 'Second lock should be rejected');
  });
  
  suite.addTest('should release lock correctly', function() {
    // Arrange
    const lockService = new DbLockService();
    const collectionName = 'releaseTestCollection';
    const operationId = 'test-operation-456';
    
    // Act
    lockService.acquireCollectionLock(collectionName, operationId);
    const lockReleased = lockService.releaseCollectionLock(collectionName, operationId);
    
    // Assert
    TestFramework.assertTrue(lockReleased, 'Lock should be released successfully');
    TestFramework.assertFalse(lockService.isCollectionLocked(collectionName), 'Collection should not be locked');
  });
  
  suite.addTest('should handle lock timeout correctly', function() {
    // Arrange
    const lockService = new DbLockService({ lockTimeout: 100 }); // 100ms timeout for testing
    const collectionName = 'timeoutTestCollection';
    
    // Act
    lockService.acquireCollectionLock(collectionName, 'test-operation');
    
    // Wait for timeout (simulate with date manipulation)
    const originalDate = Date.now;
    Date.now = () => originalDate() + 150; // Simulate 150ms later
    
    const isExpired = lockService.cleanupExpiredCollectionLocks();
    
    // Restore Date.now
    Date.now = originalDate;
    
    // Assert
    TestFramework.assertTrue(isExpired, 'Should detect expired locks');
    TestFramework.assertFalse(lockService.isCollectionLocked(collectionName), 'Expired lock should be cleaned up');
  });
  
  suite.addTest('should persist locks to ScriptProperties', function() {
    // Arrange
    const lockService = new DbLockService();
    const collectionName = 'persistLockTest';
    
    // Act
    lockService.acquireCollectionLock(collectionName, 'persist-operation');
    
    // Create new instance to test persistence
    const newLockService = new DbLockService();
    
    // Assert
    TestFramework.assertTrue(newLockService.isCollectionLocked(collectionName), 'Lock should be persisted');
  });

  return suite;
}
