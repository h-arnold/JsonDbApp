/**
 * ErrorHandler.test.js - Vitest tests for ErrorHandler
 */

describe('ErrorHandler ErrorTypes', () => {
  it('should have error types', () => {
    expect(typeof ErrorHandler.ErrorTypes).toBe('object');
    expect(typeof ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND).toBe('function');
    expect(typeof ErrorHandler.ErrorTypes.DUPLICATE_KEY).toBe('function');
    expect(typeof ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE).toBe('function');
    expect(typeof ErrorHandler.ErrorTypes.MODIFICATION_CONFLICT).toBe('function');
    expect(typeof ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT).toBe('function');
  });
});

describe('ErrorHandler createError', () => {
  it('should create DocumentNotFoundError', () => {
    const error = ErrorHandler.createError('DOCUMENT_NOT_FOUND', { id: 'test123' }, 'testCollection');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DocumentNotFoundError');
    expect(error.code).toBe('DOCUMENT_NOT_FOUND');
  });

  it('should create LockAcquisitionFailureError', () => {
    const lockFail = ErrorHandler.createError('LOCK_ACQUISITION_FAILURE', 'resourceA', 'test reason');
    expect(lockFail.name).toBe('LockAcquisitionFailureError');
    expect(lockFail.code).toBe('LOCK_ACQUISITION_FAILURE');
  });

  it('should create ModificationConflictError', () => {
    const modConflict = ErrorHandler.createError('MODIFICATION_CONFLICT', 'resourceB', 'token1', 'token2', 'conflict reason');
    expect(modConflict.name).toBe('ModificationConflictError');
    expect(modConflict.code).toBe('MODIFICATION_CONFLICT');
  });

  it('should create CoordinationTimeoutError', () => {
    const coordTimeout = ErrorHandler.createError('COORDINATION_TIMEOUT', 'operationX', 1234, 'timeout reason');
    expect(coordTimeout.name).toBe('CoordinationTimeoutError');
    expect(coordTimeout.code).toBe('COORDINATION_TIMEOUT');
  });

  it('should create all error types', () => {
    const base = ErrorHandler.createError('GASDB_ERROR', 'Base error', 'BASE_CODE', { foo: 'bar' });
    expect(base.name).toBe('GASDBError');
    expect(base.code).toBe('BASE_CODE');

    const invalidQuery = ErrorHandler.createError('INVALID_QUERY', { foo: 1 }, 'bad syntax');
    expect(invalidQuery.name).toBe('InvalidQueryError');
    expect(invalidQuery.code).toBe('INVALID_QUERY');

    const lockTimeout = ErrorHandler.createError('LOCK_TIMEOUT', 'resourceX', 1000);
    expect(lockTimeout.name).toBe('LockTimeoutError');
    expect(lockTimeout.code).toBe('LOCK_TIMEOUT');

    const fileIO = ErrorHandler.createError('FILE_IO_ERROR', 'read', 'fileId123', new Error('fail'));
    expect(fileIO.name).toBe('FileIOError');
    expect(fileIO.code).toBe('FILE_IO_ERROR');

    const conflict = ErrorHandler.createError('CONFLICT_ERROR', 'resourceY', 'tokenA', 'tokenB');
    expect(conflict.name).toBe('ConflictError');
    expect(conflict.code).toBe('CONFLICT_ERROR');

    const masterIdx = ErrorHandler.createError('MASTER_INDEX_ERROR', 'update', 'fail reason');
    expect(masterIdx.name).toBe('MasterIndexError');
    expect(masterIdx.code).toBe('MASTER_INDEX_ERROR');

    const collNotFound = ErrorHandler.createError('COLLECTION_NOT_FOUND', 'collX');
    expect(collNotFound.name).toBe('CollectionNotFoundError');
    expect(collNotFound.code).toBe('COLLECTION_NOT_FOUND');

    const configErr = ErrorHandler.createError('CONFIGURATION_ERROR', 'settingA', 'bad', 'bad config');
    expect(configErr.name).toBe('ConfigurationError');
    expect(configErr.code).toBe('CONFIGURATION_ERROR');

    const fileNotFound = ErrorHandler.createError('FILE_NOT_FOUND', 'fileId999');
    expect(fileNotFound.name).toBe('FileNotFoundError');
    expect(fileNotFound.code).toBe('FILE_NOT_FOUND');

    const permDenied = ErrorHandler.createError('PERMISSION_DENIED', 'fileId888', 'delete');
    expect(permDenied.name).toBe('PermissionDeniedError');
    expect(permDenied.code).toBe('PERMISSION_DENIED');

    const quota = ErrorHandler.createError('QUOTA_EXCEEDED', 'write', 'daily');
    expect(quota.name).toBe('QuotaExceededError');
    expect(quota.code).toBe('QUOTA_EXCEEDED');

    const fileFmt = ErrorHandler.createError('INVALID_FILE_FORMAT', 'fileId777', 'json', 'bad format');
    expect(fileFmt.name).toBe('InvalidFileFormatError');
    expect(fileFmt.code).toBe('INVALID_FILE_FORMAT');

    const argErr = ErrorHandler.createError('INVALID_ARGUMENT', 'paramX', 'bad', 'bad arg');
    expect(argErr.name).toBe('InvalidArgumentError');
    expect(argErr.code).toBe('INVALID_ARGUMENT');

    const opErr = ErrorHandler.createError('OPERATION_ERROR', 'opX', 'fail');
    expect(opErr.name).toBe('OperationError');
    expect(opErr.code).toBe('OPERATION_ERROR');
  });
});

describe('ErrorHandler validation', () => {
  it('should throw for null value', () => {
    expect(() => ErrorHandler.validateRequired(null, 'testParam')).toThrow(Error);
  });

  it('should throw for wrong type', () => {
    expect(() => ErrorHandler.validateType('string', 'number', 'testParam')).toThrow(Error);
  });

  it('should throw for empty string', () => {
    expect(() => ErrorHandler.validateNotEmpty('', 'testParam')).toThrow(Error);
  });
});
