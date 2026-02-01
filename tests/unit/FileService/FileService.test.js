/**
 * FileService.test.js - FileService Class Tests (Vitest)
 * 
 * Comprehensive tests for the FileService class including:
 * - Optimised interface with batch operations
 * - Error recovery and quota handling
 * - Integration with FileOperations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FileService Functionality', () => {
  let mockFileOps;
  let mockLogger;
  let fileService;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    mockFileOps = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createFile: vi.fn(),
      deleteFile: vi.fn(),
      fileExists: vi.fn(),
      getFileMetadata: vi.fn()
    };

    fileService = new FileService(mockFileOps, mockLogger);
  });

  it('should initialise with FileOperations dependency', () => {
    expect(fileService).toBeDefined();
    expect(fileService instanceof FileService).toBe(true);
  });

  it('should throw error if FileOperations not provided', () => {
    expect(() => new FileService(null, mockLogger)).toThrow('Invalid configuration for fileOps');
  });

  it('should throw error if logger not provided', () => {
    expect(() => new FileService(mockFileOps, null)).toThrow('Invalid configuration for logger');
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
    mockFileOps.readFile.mockReturnValue(updatedData);
    
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
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
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
    expect(metadata.name).toBeDefined();
    expect(metadata.modifiedTime).toBeDefined();
  });

  it('should delete file through optimised interface', () => {
    mockFileOps.deleteFile.mockReturnValue(true);
    
    const result = fileService.deleteFile('test-file-id');
    
    expect(result).toBe(true);
    expect(mockFileOps.deleteFile).toHaveBeenCalledWith('test-file-id');
  });
});

describe('FileService Caching', () => {
  let mockFileOps;
  let mockLogger;
  let fileService;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    mockFileOps = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createFile: vi.fn(),
      deleteFile: vi.fn(),
      fileExists: vi.fn(),
      getFileMetadata: vi.fn()
    };

    fileService = new FileService(mockFileOps, mockLogger);
  });

  it('should cache file content on first read', () => {
    const mockData = { test: 'cache_test', data: 'cached content' };
    mockFileOps.readFile.mockReturnValue(mockData);
    
    // First read - should call FileOperations
    const result1 = fileService.readFile('test-file-id');
    expect(mockFileOps.readFile).toHaveBeenCalledTimes(1);
    
    // Second read - should use cache
    const result2 = fileService.readFile('test-file-id');
    expect(mockFileOps.readFile).toHaveBeenCalledTimes(1); // Still only called once
    
    expect(result1.test).toBe('cache_test');
    expect(result2.test).toBe('cache_test');
  });

  it('should return cached results consistently', () => {
    const mockData = { test: 'consistency_test', value: 42 };
    mockFileOps.readFile.mockReturnValue(mockData);
    
    const results = [];
    const readCount = 3;
    
    for (let i = 0; i < readCount; i++) {
      results.push(fileService.readFile('test-file-id'));
    }
    
    expect(results.length).toBe(readCount);
    
    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(JSON.stringify(results[i])).toBe(JSON.stringify(results[0]));
    }
    
    // FileOperations should only be called once
    expect(mockFileOps.readFile).toHaveBeenCalledTimes(1);
  });

  it('should update cache after write', () => {
    const initialData = { test: 'initial', value: 1 };
    const updatedData = { test: 'updated', value: 2 };
    
    mockFileOps.readFile.mockReturnValueOnce(initialData).mockReturnValueOnce(updatedData);
    mockFileOps.writeFile.mockReturnValue(undefined);
    
    // Read to populate cache
    fileService.readFile('test-file-id');
    
    // Write to update
    fileService.writeFile('test-file-id', updatedData);
    
    // Cache should be updated
    const stats = fileService.getCacheStats();
    expect(stats.size).toBe(1);
  });

  it('should clear cache when disabled', () => {
    const mockData = { test: 'cache_test' };
    mockFileOps.readFile.mockReturnValue(mockData);
    
    // Populate cache
    fileService.readFile('test-file-id');
    expect(fileService.getCacheStats().size).toBe(1);
    
    // Disable cache
    fileService.setCacheEnabled(false);
    
    // Cache should be cleared
    expect(fileService.getCacheStats().size).toBe(0);
    expect(fileService.getCacheStats().enabled).toBe(false);
  });

  it('should remove from cache after delete', () => {
    const mockData = { test: 'delete_test' };
    mockFileOps.readFile.mockReturnValue(mockData);
    mockFileOps.deleteFile.mockReturnValue(true);
    
    // Populate cache
    fileService.readFile('test-file-id');
    expect(fileService.getCacheStats().size).toBe(1);
    
    // Delete file
    fileService.deleteFile('test-file-id');
    
    // Cache should be cleared for that file
    expect(fileService.getCacheStats().size).toBe(0);
  });

  it('should manage cache size with LRU eviction', () => {
    const mockData = { test: 'lru_test' };
    mockFileOps.readFile.mockReturnValue(mockData);
    
    // Read files up to max cache size + 1
    const maxSize = 50;
    for (let i = 0; i <= maxSize; i++) {
      fileService.readFile(`file-${i}`);
    }
    
    // Cache should not exceed max size
    const stats = fileService.getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
  });

  it('should provide cache statistics', () => {
    const stats = fileService.getCacheStats();
    
    expect(stats).toBeDefined();
    expect(stats.size).toBeDefined();
    expect(stats.maxSize).toBe(50);
    expect(stats.enabled).toBe(true);
  });

  it('should clear cache manually', () => {
    const mockData = { test: 'clear_test' };
    mockFileOps.readFile.mockReturnValue(mockData);
    
    // Populate cache
    fileService.readFile('file-1');
    fileService.readFile('file-2');
    expect(fileService.getCacheStats().size).toBe(2);
    
    // Clear cache
    fileService.clearCache();
    
    expect(fileService.getCacheStats().size).toBe(0);
  });
});

describe('FileService Batch Operations', () => {
  let mockFileOps;
  let mockLogger;
  let fileService;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    mockFileOps = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createFile: vi.fn(),
      deleteFile: vi.fn(),
      fileExists: vi.fn(),
      getFileMetadata: vi.fn()
    };

    fileService = new FileService(mockFileOps, mockLogger);
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
        throw new Error('File not found');
      }
      return { id: fileId, content: `Content for ${fileId}` };
    });
    
    const fileIds = ['file-1', 'invalid-file', 'file-2'];
    const results = fileService.batchReadFiles(fileIds);
    
    expect(results.length).toBe(3);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull(); // Failed read
    expect(results[2]).not.toBeNull();
  });

  it('should batch get metadata for multiple files', () => {
    mockFileOps.getFileMetadata.mockImplementation((fileId) => ({
      id: fileId,
      name: `${fileId}.json`,
      modifiedTime: '2024-01-01T00:00:00.000Z',
      size: 1024
    }));
    
    const fileIds = ['file-1', 'file-2', 'file-3'];
    const results = fileService.batchGetMetadata(fileIds);
    
    expect(results.length).toBe(3);
    expect(results[0].id).toBe('file-1');
    expect(results[1].id).toBe('file-2');
    expect(results[2].id).toBe('file-3');
  });

  it('should handle errors in batch metadata operations', () => {
    mockFileOps.getFileMetadata.mockImplementation((fileId) => {
      if (fileId === 'invalid-file') {
        throw new Error('File not found');
      }
      return { id: fileId, name: `${fileId}.json` };
    });
    
    const fileIds = ['file-1', 'invalid-file', 'file-2'];
    const results = fileService.batchGetMetadata(fileIds);
    
    expect(results.length).toBe(3);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull(); // Failed request
    expect(results[2]).not.toBeNull();
  });

  it('should throw error for invalid fileIds parameter in batchReadFiles', () => {
    expect(() => fileService.batchReadFiles('not-an-array')).toThrow('fileIds must be an array');
  });

  it('should throw error for invalid fileIds parameter in batchGetMetadata', () => {
    expect(() => fileService.batchGetMetadata(null)).toThrow('fileIds must be an array');
  });
});

describe('FileService Error Handling', () => {
  let mockFileOps;
  let mockLogger;
  let fileService;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    mockFileOps = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createFile: vi.fn(),
      deleteFile: vi.fn(),
      fileExists: vi.fn(),
      getFileMetadata: vi.fn()
    };

    fileService = new FileService(mockFileOps, mockLogger);
  });

  it('should throw error when reading file without fileId', () => {
    expect(() => fileService.readFile(null)).toThrow('fileId is required');
    expect(() => fileService.readFile('')).toThrow('fileId is required');
  });

  it('should throw error when writing file without fileId', () => {
    expect(() => fileService.writeFile(null, {})).toThrow('fileId is required');
    expect(() => fileService.writeFile('', {})).toThrow('fileId is required');
  });

  it('should throw error when writing file without data', () => {
    expect(() => fileService.writeFile('file-id', null)).toThrow('data is required');
    expect(() => fileService.writeFile('file-id', undefined)).toThrow('data is required');
  });

  it('should throw error when creating file without fileName', () => {
    expect(() => fileService.createFile(null, {})).toThrow('fileName is required');
    expect(() => fileService.createFile('', {})).toThrow('fileName is required');
  });

  it('should throw error when creating file without data', () => {
    expect(() => fileService.createFile('test.json', null)).toThrow('data is required');
    expect(() => fileService.createFile('test.json', undefined)).toThrow('data is required');
  });

  it('should throw error when deleting file without fileId', () => {
    expect(() => fileService.deleteFile(null)).toThrow('fileId is required');
    expect(() => fileService.deleteFile('')).toThrow('fileId is required');
  });

  it('should throw error when checking existence without fileId', () => {
    expect(() => fileService.fileExists(null)).toThrow('fileId is required');
    expect(() => fileService.fileExists('')).toThrow('fileId is required');
  });

  it('should throw error when getting metadata without fileId', () => {
    expect(() => fileService.getFileMetadata(null)).toThrow('fileId is required');
    expect(() => fileService.getFileMetadata('')).toThrow('fileId is required');
  });

  it('should handle errors gracefully in mixed batch operations', () => {
    mockFileOps.readFile.mockImplementation((fileId) => {
      if (fileId === 'error-file') {
        throw new Error('Read failed');
      }
      return { id: fileId, data: 'success' };
    });
    
    const fileIds = ['success-file', 'error-file', 'another-success'];
    const results = fileService.batchReadFiles(fileIds);
    
    expect(results.length).toBe(3);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
    expect(results[2]).not.toBeNull();
  });
});

describe('FileService Integration with FileOperations', () => {
  let mockFileOps;
  let mockLogger;
  let fileService;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    mockFileOps = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createFile: vi.fn(),
      deleteFile: vi.fn(),
      fileExists: vi.fn(),
      getFileMetadata: vi.fn()
    };

    fileService = new FileService(mockFileOps, mockLogger);
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
    
    // Create with FileService
    const createdFileId = fileService.createFile('test.json', testData, 'folder-id');
    
    // Read with FileService (simulating both direct and service reads)
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
    
    // Track the current state
    let currentData = initialData;
    mockFileOps.readFile.mockImplementation(() => currentData);
    
    // Create file
    const createdFileId = fileService.createFile('test.json', initialData, 'folder-id');
    
    // Multiple rapid updates
    for (const update of updates) {
      fileService.writeFile(createdFileId, update);
      currentData = update;
    }
    
    // Read final state
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
    
    // Create file - this adds to cache
    fileService.createFile('test.json', testData, 'folder-id');
    
    // Read multiple times (should leverage caching - won't call readFile at all since created file is cached)
    const read1 = fileService.readFile(fileId);
    const read2 = fileService.readFile(fileId);
    
    // Check existence (should use cache)
    const exists = fileService.fileExists(fileId);
    
    // Get metadata
    const metadata = fileService.getFileMetadata(fileId);
    
    expect(read1.optimisation).toBe('test');
    expect(read2.optimisation).toBe('test');
    expect(exists).toBe(true);
    expect(metadata.id).toBe(fileId);
    
    // readFile should not be called at all due to creation caching
    expect(mockFileOps.readFile).toHaveBeenCalledTimes(0);
  });
});
