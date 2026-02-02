/**
 * FileService.test.js - FileService Class Tests (Vitest)
 *
 * Comprehensive tests for the FileService class including:
 * - Optimised interface with batch operations
 * - Error recovery and quota handling
 * - Integration with FileOperations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const createFileServiceTestContext = (overrides = {}) => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    ...(overrides.mockLogger || {})
  };

  const mockFileOps = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    createFile: vi.fn(),
    deleteFile: vi.fn(),
    fileExists: vi.fn(),
    getFileMetadata: vi.fn(),
    ...(overrides.mockFileOps || {})
  };

  const fileService = new FileService(mockFileOps, mockLogger);

  return { fileService, mockFileOps, mockLogger };
};

const ERROR_TYPES = ErrorHandler.ErrorTypes;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileService Functionality', () => {
  let fileService;
  let mockFileOps;

  beforeEach(() => {
    ({ fileService, mockFileOps } = createFileServiceTestContext());
  });

  it('should initialise with FileOperations dependency', () => {
    expect(fileService).toBeDefined();
    expect(fileService).toBeInstanceOf(FileService);
  });

  it('should throw error if FileOperations not provided', () => {
    const loggerStub = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    expect(() => new FileService(null, loggerStub)).toThrow(ERROR_TYPES.CONFIGURATION_ERROR);
  });

  it('should throw error if logger not provided', () => {
    expect(() => new FileService(mockFileOps, null)).toThrow(ERROR_TYPES.CONFIGURATION_ERROR);
  });

  it('should read file through optimised interface', () => {
    const mockData = {
      test: 'fileServiceTestData',
      collection: 'fileservice_test',
      documents: [
        { _id: 'doc1', data: 'Test document 1' },
        { _id: 'doc2', data: 'Test document 2' }
      ]
    };

    mockFileOps.readFile.mockReturnValue(mockData);

    const result = fileService.readFile('test-file-id');

    expect(result).toBeDefined();
    expect(result.test).toBe('fileServiceTestData');
    expect(result.collection).toBe('fileservice_test');
    expect(result.documents.length).toBe(2);
    expect(mockFileOps.readFile).toHaveBeenCalledWith('test-file-id');
  });

  it('should write file through optimised interface', () => {
    const updatedData = {
      test: 'updated_data',
      timestamp: '2024-01-01T00:00:00.000Z',
      collection: 'updated_collection'
    };

    mockFileOps.writeFile.mockReturnValue(undefined);

    fileService.writeFile('test-file-id', updatedData);

    expect(mockFileOps.writeFile).toHaveBeenCalledWith('test-file-id', updatedData);
  });

  it('should create file through optimised interface', () => {
    const testData = {
      documents: [{ _id: 'doc1', data: 'Created doc' }],
      metadata: { created: '2024-01-01T00:00:00.000Z', createdBy: 'FileService' }
    };
    const newFileId = 'new-file-id-123';

    mockFileOps.createFile.mockReturnValue(newFileId);

    const result = fileService.createFile('test-file.json', testData, 'folder-id');

    expect(result).toBe(newFileId);
    expect(mockFileOps.createFile).toHaveBeenCalledWith('test-file.json', testData, 'folder-id');
  });

  it('should check file existence through optimised interface', () => {
    mockFileOps.fileExists.mockImplementation((fileId) => fileId === 'existing-file-id');

    const existsResult = fileService.fileExists('existing-file-id');
    const notExistsResult = fileService.fileExists('non-existent-file-id');

    expect(existsResult).toBe(true);
    expect(notExistsResult).toBe(false);
  });

  it('should get file metadata through optimised interface', () => {
    const mockMetadata = {
      id: 'test-file-id',
      name: 'test-file.json',
      modifiedTime: '2024-01-01T00:00:00.000Z',
      size: 1024
    };

    mockFileOps.getFileMetadata.mockReturnValue(mockMetadata);

    const metadata = fileService.getFileMetadata('test-file-id');

    expect(metadata).toBeDefined();
    expect(metadata.id).toBe('test-file-id');
    expect(metadata.name).toBe('test-file.json');
    expect(metadata.modifiedTime).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should delete file through optimised interface', () => {
    mockFileOps.deleteFile.mockReturnValue(true);

    const result = fileService.deleteFile('test-file-id');

    expect(result).toBe(true);
    expect(mockFileOps.deleteFile).toHaveBeenCalledWith('test-file-id');
  });
});

describe('FileService Caching', () => {
  let fileService;
  let mockFileOps;

  beforeEach(() => {
    ({ fileService, mockFileOps } = createFileServiceTestContext());
  });

  it('should cache file content on first read', () => {
    const mockData = { test: 'cache_test', data: 'cached content' };
    mockFileOps.readFile.mockReturnValue(mockData);

    const result1 = fileService.readFile('test-file-id');
    const result2 = fileService.readFile('test-file-id');

    expect(mockFileOps.readFile).toHaveBeenCalledTimes(1);
    expect(result1.test).toBe('cache_test');
    expect(result2.test).toBe('cache_test');
  });

  it('should return cached results consistently', () => {
    const mockData = { test: 'consistency_test', value: 42 };
    mockFileOps.readFile.mockReturnValue(mockData);

    const results = [
      fileService.readFile('test-file-id'),
      fileService.readFile('test-file-id'),
      fileService.readFile('test-file-id')
    ];

    expect(results.every((result) => result.value === 42)).toBe(true);
    expect(mockFileOps.readFile).toHaveBeenCalledTimes(1);
  });

  it('should update cache after write', () => {
    const initialData = { test: 'initial', value: 1 };
    const updatedData = { test: 'updated', value: 2 };

    mockFileOps.readFile.mockReturnValueOnce(initialData).mockReturnValue(updatedData);

    fileService.readFile('test-file-id');
    fileService.writeFile('test-file-id', updatedData);

    const cachedResult = fileService.readFile('test-file-id');
    expect(cachedResult.value).toBe(2);
    expect(mockFileOps.readFile).toHaveBeenCalledTimes(1);
    expect(fileService.getCacheStats().size).toBe(1);
  });

  it('should clear cache when disabled', () => {
    const mockData = { test: 'cache_test' };
    mockFileOps.readFile.mockReturnValue(mockData);

    fileService.readFile('test-file-id');
    expect(fileService.getCacheStats().size).toBe(1);

    fileService.setCacheEnabled(false);

    expect(fileService.getCacheStats().size).toBe(0);
    expect(fileService.getCacheStats().enabled).toBe(false);
  });

  it('should remove from cache after delete', () => {
    const mockData = { test: 'delete_test' };
    mockFileOps.readFile.mockReturnValue(mockData);
    mockFileOps.deleteFile.mockReturnValue(true);

    fileService.readFile('test-file-id');
    expect(fileService.getCacheStats().size).toBe(1);

    fileService.deleteFile('test-file-id');

    expect(fileService.getCacheStats().size).toBe(0);
  });

  it('should manage cache size with LRU eviction', () => {
    mockFileOps.readFile.mockReturnValue({ test: 'lru_test' });

    for (let i = 0; i <= 50; i++) {
      fileService.readFile(`file-${i}`);
    }

    const stats = fileService.getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
  });

  it('should provide cache statistics', () => {
    const stats = fileService.getCacheStats();

    expect(stats).toEqual({ size: 0, maxSize: 50, enabled: true });
  });

  it('should clear cache manually', () => {
    mockFileOps.readFile.mockReturnValue({ test: 'clear_test' });

    fileService.readFile('file-1');
    fileService.readFile('file-2');
    expect(fileService.getCacheStats().size).toBe(2);

    fileService.clearCache();

    expect(fileService.getCacheStats().size).toBe(0);
  });
});

describe('FileService Batch Operations', () => {
  let fileService;
  let mockFileOps;

  beforeEach(() => {
    ({ fileService, mockFileOps } = createFileServiceTestContext());
  });

  it('should batch read multiple files', () => {
    mockFileOps.readFile.mockImplementation((fileId) => ({
      id: fileId,
      content: `Content for ${fileId}`
    }));

    const fileIds = ['file-1', 'file-2', 'file-3'];
    const results = fileService.batchReadFiles(fileIds);

    expect(results.length).toBe(3);
    expect(results[0].id).toBe('file-1');
    expect(results[1].id).toBe('file-2');
    expect(results[2].id).toBe('file-3');
  });

  it('should handle errors in batch read operations', () => {
    mockFileOps.readFile.mockImplementation((fileId) => {
      if (fileId === 'invalid-file') {
        throw new ERROR_TYPES.FILE_NOT_FOUND(fileId);
      }
      return { id: fileId, content: `Content for ${fileId}` };
    });

    const results = fileService.batchReadFiles(['file-1', 'invalid-file', 'file-2']);

    expect(results.length).toBe(3);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
    expect(results[2]).not.toBeNull();
  });

  it('should batch get metadata for multiple files', () => {
    mockFileOps.getFileMetadata.mockImplementation((fileId) => ({
      id: fileId,
      name: `${fileId}.json`,
      modifiedTime: '2024-01-01T00:00:00.000Z',
      size: 1024
    }));

    const results = fileService.batchGetMetadata(['file-1', 'file-2', 'file-3']);

    expect(results.length).toBe(3);
    expect(results[0].id).toBe('file-1');
    expect(results[1].id).toBe('file-2');
    expect(results[2].id).toBe('file-3');
  });

  it('should handle errors in batch metadata operations', () => {
    mockFileOps.getFileMetadata.mockImplementation((fileId) => {
      if (fileId === 'invalid-file') {
        throw new ERROR_TYPES.FILE_NOT_FOUND(fileId);
      }
      return { id: fileId, name: `${fileId}.json` };
    });

    const results = fileService.batchGetMetadata(['file-1', 'invalid-file', 'file-2']);

    expect(results.length).toBe(3);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
    expect(results[2]).not.toBeNull();
  });

  it('should throw error for invalid fileIds parameter in batchReadFiles', () => {
    expect(() => fileService.batchReadFiles('not-an-array')).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should throw error for invalid fileIds parameter in batchGetMetadata', () => {
    expect(() => fileService.batchGetMetadata(null)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });
});

describe('FileService Error Handling', () => {
  let fileService;
  let mockFileOps;

  beforeEach(() => {
    ({ fileService, mockFileOps } = createFileServiceTestContext());
  });

  it('should throw error when reading file without fileId', () => {
    expect(() => fileService.readFile(null)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
    expect(() => fileService.readFile('')).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should throw error when writing file without fileId', () => {
    expect(() => fileService.writeFile(null, {})).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
    expect(() => fileService.writeFile('', {})).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should throw error when writing file without data', () => {
    expect(() => fileService.writeFile('file-id', null)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
    expect(() => fileService.writeFile('file-id', undefined)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should throw error when creating file without fileName', () => {
    expect(() => fileService.createFile(null, {})).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
    expect(() => fileService.createFile('', {})).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should throw error when creating file without data', () => {
    expect(() => fileService.createFile('test.json', null)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
    expect(() => fileService.createFile('test.json', undefined)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should throw error when deleting file without fileId', () => {
    expect(() => fileService.deleteFile(null)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
    expect(() => fileService.deleteFile('')).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should throw error when checking existence without fileId', () => {
    expect(() => fileService.fileExists(null)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
    expect(() => fileService.fileExists('')).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should throw error when getting metadata without fileId', () => {
    expect(() => fileService.getFileMetadata(null)).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
    expect(() => fileService.getFileMetadata('')).toThrow(ERROR_TYPES.INVALID_ARGUMENT);
  });

  it('should handle errors gracefully in mixed batch operations', () => {
    mockFileOps.readFile.mockImplementation((fileId) => {
      if (fileId === 'error-file') {
        throw new ERROR_TYPES.FILE_IO_ERROR('read', fileId);
      }
      return { id: fileId, data: 'success' };
    });

    const results = fileService.batchReadFiles(['success-file', 'error-file', 'another-success']);

    expect(results.length).toBe(3);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
    expect(results[2]).not.toBeNull();
  });

  it('should surface quota exceeded errors from FileOperations', () => {
    const quotaError = new ERROR_TYPES.QUOTA_EXCEEDED('readFile', 'Drive API');
    mockFileOps.readFile.mockImplementation(() => {
      throw quotaError;
    });

    expect(() => fileService.readFile('quota-file')).toThrow(ERROR_TYPES.QUOTA_EXCEEDED);
  });

  it('should retry subsequent reads after failures instead of tripping a circuit breaker', () => {
    const ioError = new ERROR_TYPES.FILE_IO_ERROR('readFile', 'file-id', new Error('failure'));
    mockFileOps.readFile.mockImplementation(() => {
      throw ioError;
    });

    expect(() => fileService.readFile('file-id')).toThrow(ERROR_TYPES.FILE_IO_ERROR);
    expect(() => fileService.readFile('file-id')).toThrow(ERROR_TYPES.FILE_IO_ERROR);
    expect(mockFileOps.readFile).toHaveBeenCalledTimes(2);
  });
});

describe('FileService Integration with FileOperations', () => {
  let fileService;
  let mockFileOps;

  beforeEach(() => {
    ({ fileService, mockFileOps } = createFileServiceTestContext());
  });

  it('should coordinate operations between FileOperations and FileService', () => {
    const testData = {
      integration: true,
      timestamp: '2024-01-01T00:00:00.000Z',
      coordination: 'FileOperations-FileService'
    };
    const fileId = 'integration-test-file';

    mockFileOps.createFile.mockReturnValue(fileId);
    mockFileOps.readFile.mockReturnValue(testData);

    const createdFileId = fileService.createFile('test.json', testData, 'folder-id');
    const serviceReadResult = fileService.readFile(createdFileId);

    expect(createdFileId).toBe(fileId);
    expect(serviceReadResult.integration).toBe(true);
    expect(serviceReadResult.coordination).toBe('FileOperations-FileService');
  });

  it('should maintain consistency during multiple file operations', () => {
    const initialData = { version: 1, content: 'initial' };
    const updates = [
      { version: 2, content: 'update1' },
      { version: 3, content: 'update2' },
      { version: 4, content: 'final' }
    ];
    const fileId = 'consistency-test-file';

    mockFileOps.createFile.mockReturnValue(fileId);
    mockFileOps.writeFile.mockReturnValue(undefined);

    let currentData = initialData;
    mockFileOps.readFile.mockImplementation(() => currentData);

    const createdFileId = fileService.createFile('test.json', initialData, 'folder-id');

    updates.forEach((update) => {
      fileService.writeFile(createdFileId, update);
      currentData = update;
    });

    const finalState = fileService.readFile(createdFileId);

    expect(finalState.version).toBe(4);
    expect(finalState.content).toBe('final');
  });

  it('should use cache to minimise Drive API calls', () => {
    const testData = { optimisation: 'test', callCount: 'minimised' };
    const fileId = 'api-optimisation-test';

    mockFileOps.createFile.mockReturnValue(fileId);
    mockFileOps.readFile.mockReturnValue(testData);
    mockFileOps.fileExists.mockReturnValue(true);
    mockFileOps.getFileMetadata.mockReturnValue({
      id: fileId,
      name: 'test.json',
      modifiedTime: '2024-01-01T00:00:00.000Z'
    });

    fileService.createFile('test.json', testData, 'folder-id');

    const read1 = fileService.readFile(fileId);
    const read2 = fileService.readFile(fileId);
    const exists = fileService.fileExists(fileId);
    const metadata = fileService.getFileMetadata(fileId);

    expect(read1.optimisation).toBe('test');
    expect(read2.optimisation).toBe('test');
    expect(exists).toBe(true);
    expect(metadata.id).toBe(fileId);
    expect(mockFileOps.readFile).not.toHaveBeenCalled();
  });
});
