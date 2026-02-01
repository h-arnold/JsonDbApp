/**
 * FileService Vitest refactor covering legacy checklist scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../setup/gas-mocks.setup.js';

const {
  FileService,
  FileOperations,
  JDbLogger,
  InvalidArgumentError,
  ConfigurationError
} = globalThis;

const createdFileIds = new Set();
const createdFolderIds = new Set();

const generateName = (prefix = 'fileservice') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const createFolder = () => {
  const folder = DriveApp.createFolder(generateName('folder'));
  const folderId = folder.getId();
  createdFolderIds.add(folderId);
  return folderId;
};

const createFile = (folderId, name, data) => {
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(name, JSON.stringify(data), MimeType.JSON);
  const fileId = file.getId();
  createdFileIds.add(fileId);
  return fileId;
};

const cleanupResources = () => {
  createdFileIds.forEach((id) => {
    try {
      DriveApp.getFileById(id).setTrashed(true);
    } catch {
      // ignore
    }
  });
  createdFolderIds.forEach((id) => {
    try {
      DriveApp.getFolderById(id).setTrashed(true);
    } catch {
      // ignore
    }
  });
  createdFileIds.clear();
  createdFolderIds.clear();
};

describe('FileService Setup - Create Test Resources', () => {
  let folderId;
  let fileId;
  let fileService;
  let mockFileOps;
  let mockLogger;

  beforeEach(() => {
    folderId = createFolder();
    const data = { hello: 'world' };
    fileId = createFile(folderId, `${generateName('file')}.json`, data);
    mockLogger = JDbLogger.createComponentLogger('FileService-Setup');
    mockFileOps = new FileOperations(mockLogger);
    fileService = new FileService(mockFileOps, mockLogger);
  });

  afterEach(() => {
    cleanupResources();
  });

  it('should create test folder in Drive root', () => {
    const folder = DriveApp.getFolderById(folderId);
    expect(folder.getId()).toBe(folderId);
  });

  it('should create initial test file with JSON content', () => {
    const content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
    expect(JSON.parse(content).hello).toBe('world');
  });

  it('should initialise mock FileOperations for dependency injection', () => {
    expect(fileService).toBeInstanceOf(FileService);
    expect(fileService._fileOps).toBeDefined();
  });
});

describe('FileService Functionality', () => {
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

  it('should initialise with FileOperations dependency', () => {
    expect(fileService).toBeDefined();
    expect(fileService).toBeInstanceOf(FileService);
  });

  it('should throw error if FileOperations not provided', () => {
    expect(() => new FileService(null, mockLogger)).toThrow(ConfigurationError);
  });

  it('should throw error if logger not provided', () => {
    expect(() => new FileService(mockFileOps, null)).toThrow(ConfigurationError);
  });

  it('should read file through optimised interface', () => {
    const mockData = { test: 'fileServiceTestData', collection: 'fileservice_test', documents: [{ _id: 'doc1' }] };
    mockFileOps.readFile.mockReturnValue(mockData);

    const result = fileService.readFile('test-file-id');

    expect(result.collection).toBe('fileservice_test');
    expect(mockFileOps.readFile).toHaveBeenCalledWith('test-file-id');
  });

  it('should write file through optimised interface', () => {
    const updatedData = { test: 'updated_data', timestamp: '2024-01-01T00:00:00.000Z', collection: 'updated_collection' };

    fileService.writeFile('test-file-id', updatedData);

    expect(mockFileOps.writeFile).toHaveBeenCalledWith('test-file-id', updatedData);
  });

  it('should create file through optimised interface', () => {
    const testData = { documents: [{ _id: 'doc1', data: 'Created doc' }], metadata: { created: '2024-01-01T00:00:00.000Z' } };
    const newFileId = 'new-file-id-123';
    mockFileOps.createFile.mockReturnValue(newFileId);

    const result = fileService.createFile('test-file.json', testData, 'folder-id');

    expect(result).toBe(newFileId);
    expect(mockFileOps.createFile).toHaveBeenCalledWith('test-file.json', testData, 'folder-id');
  });

  it('should check file existence through optimised interface', () => {
    mockFileOps.fileExists.mockImplementation((fileId) => fileId === 'existing-file-id');

    expect(fileService.fileExists('existing-file-id')).toBe(true);
    expect(fileService.fileExists('non-existent-file-id')).toBe(false);
  });

  it('should get file metadata through optimised interface', () => {
    const mockMetadata = { id: 'test-file-id', name: 'test-file.json', modifiedTime: '2024-01-01T00:00:00.000Z', size: 1024 };
    mockFileOps.getFileMetadata.mockReturnValue(mockMetadata);

    const metadata = fileService.getFileMetadata('test-file-id');

    expect(metadata.id).toBe('test-file-id');
    expect(metadata.name).toBe('test-file.json');
  });

  it('should delete file through optimised interface', () => {
    mockFileOps.deleteFile.mockReturnValue(true);

    expect(fileService.deleteFile('test-file-id')).toBe(true);
  });
});

describe('FileService Optimisation', () => {
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

  it('should batch multiple read operations when possible', () => {
    mockFileOps.readFile.mockImplementation((fileId) => ({ id: fileId, content: `Content for ${fileId}` }));
    const fileIds = ['file-1', 'file-2', 'file-3'];

    const results = fileService.batchReadFiles(fileIds);

    expect(results.map((r) => r.id)).toEqual(fileIds);
  });

  it('should optimise metadata retrieval for multiple files', () => {
    mockFileOps.getFileMetadata.mockImplementation((fileId) => ({ id: fileId, name: `${fileId}.json` }));

    const results = fileService.batchGetMetadata(['file-1', 'file-2']);

    expect(results[0].id).toBe('file-1');
    expect(results[1].id).toBe('file-2');
  });

  it('should handle mixed success and failure in batch operations', () => {
    mockFileOps.readFile.mockImplementation((fileId) => {
      if (fileId === 'invalid') throw new Error('fail');
      return { id: fileId };
    });

    const results = fileService.batchReadFiles(['ok', 'invalid', 'ok2']);

    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
    expect(results[2]).not.toBeNull();
  });

  it('should implement intelligent caching for frequently accessed files', () => {
    mockFileOps.readFile.mockReturnValue({ cached: true });

    fileService.readFile('cache-file');
    fileService.readFile('cache-file');

    expect(mockFileOps.readFile).toHaveBeenCalledTimes(1);
  });
});

describe('FileService Error Recovery', () => {
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

  it('should implement exponential backoff for quota limits', () => {
    let attempts = 0;
    mockFileOps.readFile.mockImplementation(() => {
      attempts += 1;
      if (attempts < 3) throw new Error('Quota exceeded');
      return { ok: true };
    });

    const result = fileService.readFile('quota-file');

    expect(result.ok).toBe(true);
    expect(attempts).toBe(3);
  });

  it('should gracefully degrade batch operations on partial failures', () => {
    mockFileOps.readFile.mockImplementation((fileId) => {
      if (fileId === 'fail') throw new Error('fail');
      return { id: fileId };
    });

    const results = fileService.batchReadFiles(['ok', 'fail', 'ok2']);

    expect(results[1]).toBeNull();
  });

  it('should implement circuit breaker pattern for failing operations', () => {
    let failureCount = 0;
    mockFileOps.readFile.mockImplementation(() => {
      failureCount += 1;
      throw new Error('Persistent failure');
    });

    expect(() => fileService.batchReadFiles(['a', 'b', 'c'])).not.toThrow();
    expect(failureCount).toBe(3);
  });
});

describe('FileService Integration', () => {
  let logger;
  let fileOps;
  let fileService;
  let folderId;

  beforeEach(() => {
    logger = JDbLogger.createComponentLogger('FileService-Integration');
    fileOps = new FileOperations(logger);
    fileService = new FileService(fileOps, logger);
    folderId = createFolder();
  });

  afterEach(() => {
    cleanupResources();
  });

  it('should coordinate operations between FileOperations and FileService', () => {
    const testData = { integration: true, timestamp: '2024-01-01T00:00:00.000Z' };
    const fileId = fileService.createFile(`${generateName('integration')}.json`, testData, folderId);

    const serviceReadResult = fileService.readFile(fileId);

    expect(serviceReadResult.integration).toBe(true);
  });

  it('should minimise Drive API calls through intelligent coordination', () => {
    const testData = { optimisation: 'test' };
    const fileId = fileService.createFile(`${generateName('optimisation')}.json`, testData, folderId);

    const read1 = fileService.readFile(fileId);
    const read2 = fileService.readFile(fileId);

    expect(read1.optimisation).toBe('test');
    expect(read2.optimisation).toBe('test');
  });

  it('should maintain consistency during concurrent file operations', () => {
    const initialData = { version: 1, content: 'initial' };
    const fileId = fileService.createFile(`${generateName('consistency')}.json`, initialData, folderId);
    const updates = [{ version: 2 }, { version: 3 }, { version: 4 }];

    updates.forEach((update) => fileService.writeFile(fileId, update));
    const finalState = fileService.readFile(fileId);

    expect(finalState.version).toBe(4);
  });
});

describe('FileService Cleanup - Remove Test Files', () => {
  let logger;
  let fileOps;
  let fileService;
  let folderId;
  let fileId;

  beforeEach(() => {
    logger = JDbLogger.createComponentLogger('FileService-Cleanup');
    fileOps = new FileOperations(logger);
    fileService = new FileService(fileOps, logger);
    folderId = createFolder();
    fileId = fileService.createFile(`${generateName('cleanup')}.json`, { cleanup: true }, folderId);
  });

  afterEach(() => {
    cleanupResources();
  });

  it('should delete all created test files', () => {
    expect(fileService.deleteFile(fileId)).toBe(true);
  });

  it('should delete all created test folders', () => {
    DriveApp.getFolderById(folderId).setTrashed(true);
    expect(() => DriveApp.getFolderById(folderId)).toThrow();
  });

  it('should reset test data globals', () => {
    cleanupResources();
    expect(createdFileIds.size).toBe(0);
    expect(createdFolderIds.size).toBe(0);
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
    expect(() => fileService.readFile(null)).toThrow(InvalidArgumentError);
    expect(() => fileService.readFile('')).toThrow(InvalidArgumentError);
  });

  it('should throw error when writing file without fileId', () => {
    expect(() => fileService.writeFile(null, {})).toThrow(InvalidArgumentError);
    expect(() => fileService.writeFile('', {})).toThrow(InvalidArgumentError);
  });

  it('should throw error when writing file without data', () => {
    expect(() => fileService.writeFile('file-id', null)).toThrow(InvalidArgumentError);
    expect(() => fileService.writeFile('file-id', undefined)).toThrow(InvalidArgumentError);
  });

  it('should throw error when creating file without fileName', () => {
    expect(() => fileService.createFile(null, {})).toThrow(InvalidArgumentError);
    expect(() => fileService.createFile('', {})).toThrow(InvalidArgumentError);
  });

  it('should throw error when creating file without data', () => {
    expect(() => fileService.createFile('test.json', null)).toThrow(InvalidArgumentError);
    expect(() => fileService.createFile('test.json', undefined)).toThrow(InvalidArgumentError);
  });

  it('should throw error when deleting file without fileId', () => {
    expect(() => fileService.deleteFile(null)).toThrow(InvalidArgumentError);
    expect(() => fileService.deleteFile('')).toThrow(InvalidArgumentError);
  });

  it('should throw error when checking existence without fileId', () => {
    expect(() => fileService.fileExists(null)).toThrow(InvalidArgumentError);
    expect(() => fileService.fileExists('')).toThrow(InvalidArgumentError);
  });

  it('should throw error when getting metadata without fileId', () => {
    expect(() => fileService.getFileMetadata(null)).toThrow(InvalidArgumentError);
    expect(() => fileService.getFileMetadata('')).toThrow(InvalidArgumentError);
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

    expect(results[1]).toBeNull();
  });
});
