/**
 * FileOperations.test.js - FileOperations Class Tests (Vitest)
 *
 * Comprehensive tests for the FileOperations class including:
 * - Direct Drive API interactions
 * - Retry logic and error handling
 * - File CRUD operations
 * - Date handling and serialization
 *
 * Converted from old_tests/unit/FileOperationsTest.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const createTestData = () => ({
  test: 'testDataFromSetup',
  collection: 'test',
  collectionName: 'testCollectionFromSetup',
  metadata: {
    version: 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  },
  documents: [
    { _id: 'doc1_setup', data: 'sample document 1 from setup' }
  ]
});

const createFileOperationsTestContext = (overrides = {}) => {
  const initialData = overrides.initialData ? ObjectUtils.deepClone(overrides.initialData) : createTestData();
  const testFileId = overrides.testFileId || 'test-file-id-123';
  const testFolderId = overrides.testFolderId || 'test-folder-id-456';
  const fileName = overrides.fileName || 'test-file.json';
  let storedContent = JSON.stringify(initialData);

  const mockFile = {
    getId: vi.fn(() => testFileId),
    getName: vi.fn(() => fileName),
    getBlob: vi.fn(() => ({
      getDataAsString: vi.fn(() => storedContent),
      getContentType: vi.fn(() => 'application/json')
    })),
    setContent: vi.fn((content) => {
      storedContent = content;
    }),
    setTrashed: vi.fn(),
    isTrashed: vi.fn(() => false),
    getSize: vi.fn(() => overrides.fileSize ?? 1024),
    getLastUpdated: vi.fn(() => overrides.modifiedTime ?? new Date('2024-01-01T00:00:00.000Z')),
    getDateCreated: vi.fn(() => overrides.createdTime ?? new Date('2023-01-01T00:00:00.000Z'))
  };

  const mockFolder = {
    getId: vi.fn(() => testFolderId),
    createFile: vi.fn((name, content) => {
      storedContent = content;
      mockFile.getName = vi.fn(() => name);
      return mockFile;
    })
  };

  const mockDriveApp = {
    getFileById: vi.fn(() => mockFile),
    getFolderById: vi.fn(() => mockFolder),
    createFolder: vi.fn(() => mockFolder)
  };

  const originalDriveApp = global.DriveApp;
  const originalUtilities = global.Utilities;

  global.DriveApp = mockDriveApp;
  global.Utilities = {
    ...(originalUtilities || {}),
    sleep: vi.fn()
  };

  const fileOps = new FileOperations();

  return {
    fileOps,
    mockDriveApp,
    mockFile,
    mockFolder,
    testFileId,
    testFolderId,
    setFileContent: (content) => {
      storedContent = JSON.stringify(content);
    },
    setRawFileContent: (content) => {
      storedContent = content;
    },
    getStoredContent: () => storedContent,
    restoreGlobals: () => {
      global.DriveApp = originalDriveApp;
      global.Utilities = originalUtilities;
    }
  };
};

const ERROR_TYPES = ErrorHandler.ErrorTypes;

describe('FileOperations Functionality', () => {
  let context;
  let fileOps;
  let mockDriveApp;
  let mockFile;
  let mockFolder;
  let testFileId;
  let testFolderId;
  let testData;

  beforeEach(() => {
    testData = createTestData();
    context = createFileOperationsTestContext({ initialData: testData });
    ({ fileOps, mockDriveApp, mockFile, mockFolder, testFileId, testFolderId } = context);
  });

  afterEach(() => {
    context.restoreGlobals();
    vi.restoreAllMocks();
  });

  it('should read file content from Drive using real file ID', () => {
    const result = fileOps.readFile(testFileId);

    expect(result).toBeDefined();
    expect(result.test).toBe(testData.test);
    expect(result.collection).toBe('test');
  });

  it('should write data to existing Drive file', () => {
    const updatedData = {
      test: 'updated_data',
      timestamp: new Date().toISOString(),
      collection: 'updated_test',
      documents: [{ _id: '1', name: 'test_document' }]
    };

    fileOps.writeFile(testFileId, updatedData);
    const readResult = fileOps.readFile(testFileId);
    const storedContent = JSON.parse(context.getStoredContent());

    expect(mockFile.setContent).toHaveBeenCalledTimes(1);
    expect(storedContent.collection).toBe('updated_test');
    expect(readResult.test).toBe('updated_data');
    expect(readResult.collection).toBe('updated_test');
    expect(readResult.documents).toBeDefined();
  });

  it('should create new file in test folder', () => {
    const fileName = 'test-collection-123.json';
    const newTestData = { documents: {}, metadata: { created: new Date().toISOString() } };
    const newFileId = 'new-file-id-789';

    mockFile.getId = vi.fn(() => newFileId);

    const createdFileId = fileOps.createFile(fileName, newTestData, testFolderId);

    expect(mockDriveApp.getFolderById).toHaveBeenCalledWith(testFolderId);
    expect(mockFolder.createFile).toHaveBeenCalledWith(
      fileName,
      expect.stringContaining('"metadata"'),
      'application/json'
    );
    expect(createdFileId).toBe(newFileId);
  });

  it('should check if file exists in Drive', () => {
    mockFile.isTrashed = vi.fn(() => false);
    const existsResult = fileOps.fileExists(testFileId);

    mockDriveApp.getFileById = vi.fn(() => {
      throw new Error('File not found');
    });

    const notExistsResult = fileOps.fileExists('non-existent-file-id');

    expect(existsResult).toBe(true);
    expect(notExistsResult).toBe(false);
  });

  it('should delete file from Drive', () => {
    const result = fileOps.deleteFile(testFileId);

    expect(result).toBe(true);
    expect(mockFile.setTrashed).toHaveBeenCalledWith(true);
  });

  it('should retrieve file metadata from Drive', () => {
    const metadata = fileOps.getFileMetadata(testFileId);

    expect(metadata.id).toBe(testFileId);
    expect(metadata.name).toBe('test-file.json');
    expect(metadata.mimeType).toBe('application/json');
    expect(metadata.modifiedTime).toBeInstanceOf(Date);
    expect(mockFile.getBlob).toHaveBeenCalled();
  });
});

describe('FileOperations Error Handling', () => {
  let context;
  let fileOps;
  let mockDriveApp;
  let mockFile;
  let testFileId;

  beforeEach(() => {
    context = createFileOperationsTestContext();
    ({ fileOps, mockDriveApp, mockFile, testFileId } = context);
  });

  afterEach(() => {
    context.restoreGlobals();
    vi.restoreAllMocks();
  });

  it('should handle Drive API quota exceeded error with retry', () => {
    mockDriveApp.getFileById = vi.fn(() => {
      throw new Error('Quota exceeded: Too many requests');
    });

    expect(() => fileOps.readFile(testFileId)).toThrow(ERROR_TYPES.QUOTA_EXCEEDED);
    expect(mockDriveApp.getFileById).toHaveBeenCalledTimes(3);
    expect(global.Utilities.sleep).toHaveBeenCalledTimes(2);
  });

  it('should handle Drive API permission denied error', () => {
    mockDriveApp.getFileById = vi.fn(() => {
      throw new Error('Permission denied');
    });

    expect(() => fileOps.readFile(testFileId)).toThrow(ERROR_TYPES.PERMISSION_DENIED);
    expect(mockDriveApp.getFileById).toHaveBeenCalledTimes(1);
  });

  it('should handle Drive API file not found error', () => {
    mockDriveApp.getFileById = vi.fn(() => {
      throw new Error('File not found');
    });

    expect(() => fileOps.readFile(testFileId)).toThrow(ERROR_TYPES.FILE_NOT_FOUND);
  });

  it('should retry operations on transient failures', () => {
    let attempts = 0;
    mockDriveApp.getFileById = vi.fn(() => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('Transient network error');
      }
      return mockFile;
    });

    const result = fileOps.readFile(testFileId);

    expect(result.test).toBeDefined();
    expect(mockDriveApp.getFileById).toHaveBeenCalledTimes(3);
    expect(global.Utilities.sleep).toHaveBeenCalledTimes(2);
  });

  it('should handle malformed JSON in file content', () => {
    const malformedJsonContent = '{ "incomplete": "json", "missing": }';

    mockDriveApp.getFileById = vi.fn(() => ({
      getBlob: vi.fn(() => ({
        getDataAsString: vi.fn(() => malformedJsonContent)
      }))
    }));

    expect(() => fileOps.readFile('malformed-json-file-id')).toThrow(ERROR_TYPES.INVALID_FILE_FORMAT);
  });

  it('should handle corrupted files with partial JSON and date strings', () => {
    const corruptedContent = '{ "created": "2023-06-15T10:30:00.000Z", "data": { "incomplete"';

    mockDriveApp.getFileById = vi.fn(() => ({
      getBlob: vi.fn(() => ({
        getDataAsString: vi.fn(() => corruptedContent)
      }))
    }));

    expect(() => fileOps.readFile('corrupted-with-dates-file-id')).toThrow(ERROR_TYPES.INVALID_FILE_FORMAT);
  });

  it('should handle files with invalid JSON that could trigger double-parsing detection', () => {
    const doubleParseContent = '"{\"already\": \"stringified\", \"date\": \"2023-06-15T10:30:00.000Z\"}"';

    mockDriveApp.getFileById = vi.fn(() => ({
      getBlob: vi.fn(() => ({
        getDataAsString: vi.fn(() => doubleParseContent)
      }))
    }));

    expect(() => fileOps.readFile('double-parse-file-id')).toThrow(ERROR_TYPES.INVALID_FILE_FORMAT);
  });

  it('should handle empty files gracefully without date processing', () => {
    mockDriveApp.getFileById = vi.fn(() => ({
      getBlob: vi.fn(() => ({
        getDataAsString: vi.fn(() => '')
      }))
    }));

    expect(() => fileOps.readFile('empty-file-id')).toThrow(ERROR_TYPES.INVALID_FILE_FORMAT);
  });
});

describe('FileOperations Edge Cases', () => {
  let context;
  let fileOps;
  let mockFile;
  let testFileId;
  let testFolderId;

  beforeEach(() => {
    context = createFileOperationsTestContext({ initialData: {} });
    ({ fileOps, mockFile, testFileId, testFolderId } = context);
  });

  afterEach(() => {
    context.restoreGlobals();
    vi.restoreAllMocks();
  });

  it('should handle very large file content gracefully', () => {
    const largeData = {
      content: new Array(100).fill('large content chunk').join(' '),
      metadata: { size: 'large' },
      timestamp: new Date().toISOString()
    };

    fileOps.writeFile(testFileId, largeData);
    const readData = fileOps.readFile(testFileId);

    expect(readData).toBeDefined();
    expect(readData.metadata.size).toBe('large');
    expect(readData.content.length).toBeGreaterThan(1000);
  });

  it('should handle special characters in file names and content', () => {
    const specialFileName = 'test-file-with-special-chars.json';
    const specialData = {
      content: 'Special chars: £€$¥©®™',
      unicode: '你好世界',
      emoji: '🚀📊💾',
      timestamp: new Date().toISOString()
    };

    const newFileId = 'new-special-file-id';
    mockFile.getId = vi.fn(() => newFileId);

    const createdFileId = fileOps.createFile(specialFileName, specialData, testFolderId);
    const readData = fileOps.readFile(createdFileId);

    expect(createdFileId).toBe(newFileId);
    expect(readData.unicode).toBe('你好世界');
    expect(readData.emoji).toBe('🚀📊💾');
  });

  it('should handle empty files and null data appropriately', () => {
    const emptyData = {};

    fileOps.writeFile(testFileId, emptyData);
    const readData = fileOps.readFile(testFileId);

    expect(readData).toBeDefined();
    expect(Object.keys(readData).length).toBe(0);
  });
});

describe('FileOperations Date Handling', () => {
  let context;
  let fileOps;
  let testFileId;

  beforeEach(() => {
    context = createFileOperationsTestContext();
    ({ fileOps, testFileId } = context);
  });

  afterEach(() => {
    context.restoreGlobals();
    vi.restoreAllMocks();
  });

  it('should preserve Date objects through write-read cycle', () => {
    const testDate = new Date('2023-06-15T10:30:00.000Z');
    const testData = {
      created: testDate,
      updated: new Date('2024-01-01T00:00:00.000Z'),
      metadata: {
        lastAccess: new Date('2024-06-11T15:45:30.123Z')
      },
      documents: [
        {
          _id: 'doc1',
          joinDate: new Date('2020-03-15T08:00:00.000Z'),
          lastLogin: new Date('2024-06-10T14:25:00.000Z')
        }
      ]
    };

    fileOps.writeFile(testFileId, testData);
    const result = fileOps.readFile(testFileId);

    expect(result.created instanceof Date).toBe(true);
    expect(result.updated instanceof Date).toBe(true);
    expect(result.metadata.lastAccess instanceof Date).toBe(true);
    expect(result.documents[0].joinDate instanceof Date).toBe(true);
    expect(result.documents[0].lastLogin instanceof Date).toBe(true);
    expect(result.created.getTime()).toBe(testDate.getTime());
    expect(result.documents[0].joinDate.getFullYear()).toBe(2020);
    expect(result.metadata.lastAccess.getMilliseconds()).toBe(123);
  });

  it('should store Date objects as ISO strings in actual file content', () => {
    const testDate = new Date('2023-12-25T12:00:00.000Z');
    const testData = {
      eventDate: testDate,
      description: 'Test event'
    };

    fileOps.writeFile(testFileId, testData);

    const rawParsed = JSON.parse(context.getStoredContent());

    expect(typeof rawParsed.eventDate).toBe('string');
    expect(rawParsed.eventDate).toBe(testDate.toISOString());
    expect(rawParsed.eventDate).toContain('2023-12-25T12:00:00.000Z');
  });

  it('should handle arrays with multiple Date objects', () => {
    const testData = {
      events: [
        { date: new Date('2023-01-01T00:00:00.000Z'), type: 'start' },
        { date: new Date('2023-06-01T12:00:00.000Z'), type: 'middle' },
        { date: new Date('2023-12-31T23:59:59.999Z'), type: 'end' }
      ],
      milestones: [
        new Date('2023-03-15T09:30:00.000Z'),
        new Date('2023-09-22T16:45:00.000Z')
      ]
    };

    fileOps.writeFile(testFileId, testData);
    const result = fileOps.readFile(testFileId);

    expect(Array.isArray(result.events)).toBe(true);
    expect(Array.isArray(result.milestones)).toBe(true);
    result.events.forEach((event) => {
      expect(event.date instanceof Date).toBe(true);
    });
    result.milestones.forEach((milestone) => {
      expect(milestone instanceof Date).toBe(true);
    });
    expect(result.events[0].date.getFullYear()).toBe(2023);
    expect(result.events[2].date.getMonth()).toBe(11);
    expect(result.milestones[0].getMonth()).toBe(2);
  });

  it('should handle deeply nested Date objects', () => {
    const testData = {
      user: {
        profile: {
          personal: {
            birthDate: new Date('1990-05-15T00:00:00.000Z'),
            preferences: {
              timeZone: 'UTC',
              lastUpdated: new Date('2024-06-11T10:00:00.000Z')
            }
          },
          professional: {
            startDate: new Date('2015-09-01T09:00:00.000Z'),
            certifications: [
              {
                name: 'GCP',
                obtainedDate: new Date('2020-12-01T00:00:00.000Z'),
                expiryDate: new Date('2023-12-01T00:00:00.000Z')
              }
            ]
          }
        }
      }
    };

    fileOps.writeFile(testFileId, testData);
    const result = fileOps.readFile(testFileId);

    expect(result.user.profile.personal.birthDate instanceof Date).toBe(true);
    expect(result.user.profile.personal.preferences.lastUpdated instanceof Date).toBe(true);
    expect(result.user.profile.professional.startDate instanceof Date).toBe(true);
    expect(result.user.profile.professional.certifications[0].obtainedDate instanceof Date).toBe(true);
    expect(result.user.profile.professional.certifications[0].expiryDate instanceof Date).toBe(true);
    expect(result.user.profile.personal.birthDate.getFullYear()).toBe(1990);
    expect(result.user.profile.professional.startDate.getFullYear()).toBe(2015);
  });

  it('should handle mixed Date objects and ISO strings correctly', () => {
    const testData = {
      actualDate: new Date('2023-06-15T10:30:00.000Z'),
      isoString: '2023-06-15T10:30:00.000Z',
      notADate: '2023-not-a-date',
      regularString: 'just a string',
      number: 12345,
      boolean: true,
      nullValue: null
    };

    fileOps.writeFile(testFileId, testData);
    const result = fileOps.readFile(testFileId);

    expect(result.actualDate instanceof Date).toBe(true);
    expect(result.isoString instanceof Date).toBe(true);
    expect(typeof result.notADate).toBe('string');
    expect(typeof result.regularString).toBe('string');
    expect(typeof result.number).toBe('number');
    expect(typeof result.boolean).toBe('boolean');
    expect(result.nullValue).toBeNull();
    expect(result.actualDate.getTime()).toBe(result.isoString.getTime());
  });

  it('should handle edge cases with invalid date-like strings', () => {
    const testData = {
      validDate: new Date('2023-06-15T10:30:00.000Z'),
      almostDate1: '2023-13-32T25:70:70.000Z',
      almostDate2: '2023-06-15T10:30:00',
      almostDate3: '2023/06/15 10:30:00',
      almostDate4: 'Thu Jun 15 2023 10:30:00 GMT+0000',
      notDate: 'this is not a date at all',
      empty: '',
      undefined: undefined
    };

    fileOps.writeFile(testFileId, testData);
    const result = fileOps.readFile(testFileId);

    expect(result.validDate instanceof Date).toBe(true);
    expect(typeof result.almostDate1).toBe('string');
    expect(typeof result.almostDate2).toBe('string');
    expect(typeof result.almostDate3).toBe('string');
    expect(typeof result.almostDate4).toBe('string');
    expect(typeof result.notDate).toBe('string');
    expect(typeof result.empty).toBe('string');
    expect(result.undefined).toBeUndefined();
  });

  it('should handle Date objects with various time zones and precision', () => {
    const testData = {
      utcDate: new Date('2023-06-15T10:30:00.000Z'),
      preciseDate: new Date('2023-06-15T10:30:00.123Z'),
      noMilliseconds: new Date('2023-06-15T10:30:00Z'),
      oldDate: new Date('1970-01-01T00:00:00.000Z'),
      futureDate: new Date('2099-12-31T23:59:59.999Z')
    };

    fileOps.writeFile(testFileId, testData);
    const result = fileOps.readFile(testFileId);

    Object.keys(testData).forEach((key) => {
      expect(result[key] instanceof Date).toBe(true);
      expect(result[key].getTime()).toBe(testData[key].getTime());
    });

    expect(result.preciseDate.getMilliseconds()).toBe(123);
    expect(result.noMilliseconds.getMilliseconds()).toBe(0);
    expect(result.oldDate.getFullYear()).toBe(1970);
    expect(result.futureDate.getFullYear()).toBe(2099);
  });
});
