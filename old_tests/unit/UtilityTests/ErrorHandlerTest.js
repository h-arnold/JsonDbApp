/**
 * ErrorHandlerTest.js - ErrorHandler Class Tests
 * 
 * Tests for the ErrorHandler utility class including error types,
 * error creation, and validation functions.
 * 
 * Migrated from Section1Tests.js - runUtilityClassTests() (error portion)
 */

/**
 * ErrorHandler Tests
 * Tests for the ErrorHandler utility class functionality
 */
function createErrorHandlerTestSuite() {
  const suite = new TestSuite('ErrorHandler Tests');
  
  // ErrorHandler error types tests
  suite.addTest('testErrorHandlerErrorTypes', function() {
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes === 'object', 'ErrorHandler should have ErrorTypes');
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND === 'function', 'Should have DocumentNotFoundError');
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes.DUPLICATE_KEY === 'function', 'Should have DuplicateKeyError');
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE === 'function', 'Should have LockAcquisitionFailureError');
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes.MODIFICATION_CONFLICT === 'function', 'Should have ModificationConflictError');
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT === 'function', 'Should have CoordinationTimeoutError');
  });
  
  suite.addTest('testErrorCreation', function() {
    const error = ErrorHandler.createError('DOCUMENT_NOT_FOUND', { id: 'test123' }, 'testCollection');
    TestFramework.assertTrue(error instanceof Error, 'Should create Error instance');
    TestFramework.assertEquals('DocumentNotFoundError', error.name, 'Should have correct error name');
    TestFramework.assertEquals('DOCUMENT_NOT_FOUND', error.code, 'Should have correct error code');

    // New error types
    const lockFail = ErrorHandler.createError('LOCK_ACQUISITION_FAILURE', 'resourceA', 'test reason');
    TestFramework.assertEquals('LockAcquisitionFailureError', lockFail.name, 'Should create LockAcquisitionFailureError');
    TestFramework.assertEquals('LOCK_ACQUISITION_FAILURE', lockFail.code, 'Should have correct code');

    const modConflict = ErrorHandler.createError('MODIFICATION_CONFLICT', 'resourceB', 'token1', 'token2', 'conflict reason');
    TestFramework.assertEquals('ModificationConflictError', modConflict.name, 'Should create ModificationConflictError');
    TestFramework.assertEquals('MODIFICATION_CONFLICT', modConflict.code, 'Should have correct code');

    const coordTimeout = ErrorHandler.createError('COORDINATION_TIMEOUT', 'operationX', 1234, 'timeout reason');
    TestFramework.assertEquals('CoordinationTimeoutError', coordTimeout.name, 'Should create CoordinationTimeoutError');
    TestFramework.assertEquals('COORDINATION_TIMEOUT', coordTimeout.code, 'Should have correct code');
  });
  
  suite.addTest('testErrorValidation', function() {
    // Test validation functions
    TestFramework.assertThrows(
      () => ErrorHandler.validateRequired(null, 'testParam'),
      Error,
      'Should throw for null value'
    );
    
    TestFramework.assertThrows(
      () => ErrorHandler.validateType('string', 'number', 'testParam'),
      Error,
      'Should throw for wrong type'
    );
    
    TestFramework.assertThrows(
      () => ErrorHandler.validateNotEmpty('', 'testParam'),
      Error,
      'Should throw for empty string'
    );
  });
  
  suite.addTest('testAllErrorTypesCreation', function() {
    // GASDBError (base)
    const base = ErrorHandler.createError('GASDB_ERROR', 'Base error', 'BASE_CODE', { foo: 'bar' });
    TestFramework.assertEquals('GASDBError', base.name, 'Should create GASDBError');
    TestFramework.assertEquals('BASE_CODE', base.code, 'Should have correct code');

    // InvalidQueryError
    const invalidQuery = ErrorHandler.createError('INVALID_QUERY', { foo: 1 }, 'bad syntax');
    TestFramework.assertEquals('InvalidQueryError', invalidQuery.name, 'Should create InvalidQueryError');
    TestFramework.assertEquals('INVALID_QUERY', invalidQuery.code, 'Should have correct code');

    // LockTimeoutError
    const lockTimeout = ErrorHandler.createError('LOCK_TIMEOUT', 'resourceX', 1000);
    TestFramework.assertEquals('LockTimeoutError', lockTimeout.name, 'Should create LockTimeoutError');
    TestFramework.assertEquals('LOCK_TIMEOUT', lockTimeout.code, 'Should have correct code');

    // FileIOError
    const fileIO = ErrorHandler.createError('FILE_IO_ERROR', 'read', 'fileId123', new Error('fail'));
    TestFramework.assertEquals('FileIOError', fileIO.name, 'Should create FileIOError');
    TestFramework.assertEquals('FILE_IO_ERROR', fileIO.code, 'Should have correct code');

    // ConflictError
    const conflict = ErrorHandler.createError('CONFLICT_ERROR', 'resourceY', 'tokenA', 'tokenB');
    TestFramework.assertEquals('ConflictError', conflict.name, 'Should create ConflictError');
    TestFramework.assertEquals('CONFLICT_ERROR', conflict.code, 'Should have correct code');

    // MasterIndexError
    const masterIdx = ErrorHandler.createError('MASTER_INDEX_ERROR', 'update', 'fail reason');
    TestFramework.assertEquals('MasterIndexError', masterIdx.name, 'Should create MasterIndexError');
    TestFramework.assertEquals('MASTER_INDEX_ERROR', masterIdx.code, 'Should have correct code');

    // CollectionNotFoundError
    const collNotFound = ErrorHandler.createError('COLLECTION_NOT_FOUND', 'collX');
    TestFramework.assertEquals('CollectionNotFoundError', collNotFound.name, 'Should create CollectionNotFoundError');
    TestFramework.assertEquals('COLLECTION_NOT_FOUND', collNotFound.code, 'Should have correct code');

    // ConfigurationError
    const configErr = ErrorHandler.createError('CONFIGURATION_ERROR', 'settingA', 'bad', 'bad config');
    TestFramework.assertEquals('ConfigurationError', configErr.name, 'Should create ConfigurationError');
    TestFramework.assertEquals('CONFIGURATION_ERROR', configErr.code, 'Should have correct code');

    // FileNotFoundError
    const fileNotFound = ErrorHandler.createError('FILE_NOT_FOUND', 'fileId999');
    TestFramework.assertEquals('FileNotFoundError', fileNotFound.name, 'Should create FileNotFoundError');
    TestFramework.assertEquals('FILE_NOT_FOUND', fileNotFound.code, 'Should have correct code');

    // PermissionDeniedError
    const permDenied = ErrorHandler.createError('PERMISSION_DENIED', 'fileId888', 'delete');
    TestFramework.assertEquals('PermissionDeniedError', permDenied.name, 'Should create PermissionDeniedError');
    TestFramework.assertEquals('PERMISSION_DENIED', permDenied.code, 'Should have correct code');

    // QuotaExceededError
    const quota = ErrorHandler.createError('QUOTA_EXCEEDED', 'write', 'daily');
    TestFramework.assertEquals('QuotaExceededError', quota.name, 'Should create QuotaExceededError');
    TestFramework.assertEquals('QUOTA_EXCEEDED', quota.code, 'Should have correct code');

    // InvalidFileFormatError
    const fileFmt = ErrorHandler.createError('INVALID_FILE_FORMAT', 'fileId777', 'json', 'bad format');
    TestFramework.assertEquals('InvalidFileFormatError', fileFmt.name, 'Should create InvalidFileFormatError');
    TestFramework.assertEquals('INVALID_FILE_FORMAT', fileFmt.code, 'Should have correct code');

    // InvalidArgumentError
    const argErr = ErrorHandler.createError('INVALID_ARGUMENT', 'paramX', 'bad', 'bad arg');
    TestFramework.assertEquals('InvalidArgumentError', argErr.name, 'Should create InvalidArgumentError');
    TestFramework.assertEquals('INVALID_ARGUMENT', argErr.code, 'Should have correct code');

    // OperationError
    const opErr = ErrorHandler.createError('OPERATION_ERROR', 'opX', 'fail');
    TestFramework.assertEquals('OperationError', opErr.name, 'Should create OperationError');
    TestFramework.assertEquals('OPERATION_ERROR', opErr.code, 'Should have correct code');
  });
  
  return suite;
}

/**
 * Register the ErrorHandler test suite with the TestFramework
 */
function registerErrorHandlerTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createErrorHandlerTestSuite());
  return testFramework;
}

/**
 * Run ErrorHandler Tests independently
 */
function runErrorHandlerTests() {
  JDbLogger.info('Running ErrorHandler Tests: Error Handling Functionality');
  
  const testFramework = registerErrorHandlerTests();
  const results = testFramework.runTestSuite('ErrorHandler Tests');
  
  // Log summary
  JDbLogger.info('ErrorHandler Test Results:');
  JDbLogger.info(results.getSummary());
  
  return results;
}
