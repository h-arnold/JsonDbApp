/**
 * FileOperations Vitest refactor covering legacy checklist scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../setup/gas-mocks.setup.js';

const {
  FileOperations,
  JDbLogger,
  ErrorHandler,
  InvalidArgumentError,
  InvalidFileFormatError,
  QuotaExceededError,
  PermissionDeniedError,
  FileNotFoundError
} = globalThis;

const createdFileIds = new Set();
const createdFolderIds = new Set();

const generateName = (prefix = 'fileops') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

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
      // ignore missing files in cleanup
    }
  });
  createdFolderIds.forEach((id) => {
    try {
      DriveApp.getFolderById(id).setTrashed(true);
    } catch {
      // ignore missing folders in cleanup
    }
  });
  createdFileIds.clear();
  createdFolderIds.clear();
};

const readRawContent = (fileId) => DriveApp.getFileById(fileId).getBlob().getDataAsString();

describe('FileOperations Setup - Create Test Files', () => {
  let fileOps;
  let folderId;
  let fileId;
  let testData;

  beforeEach(() => {
    const logger = JDbLogger.createComponentLogger('FileOperations-Setup');
    fileOps = new FileOperations(logger);
    testData = {
      test: 'testDataFromSetup',
      collection: 'test',
      collectionName: 'testCollectionFromSetup',
      metadata: {
        version: 1,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      },
      documents: [{ _id: 'doc1_setup', data: 'sample document 1 from setup' }]
    };
    folderId = createFolder();
    fileId = createFile(folderId, `${generateName('file')}.json`, testData);
  });

  afterEach(() => {
    cleanupResources();
  });

  it('should create test folder in Drive root', () => {
    const folder = DriveApp.getFolderById(folderId);

    expect(folder.getId()).toBe(folderId);
    expect(folder.getName()).toBeDefined();
  });

  it('should create initial test file with JSON content', () => {
    const raw = readRawContent(fileId);
    const parsed = JSON.parse(raw);

    expect(parsed.collectionName).toBe(testData.collectionName);
    expect(parsed.metadata.created).toBeDefined();
    expect(parsed.documents[0]._id).toBe(testData.documents[0]._id);
  });

  it('should verify test file can be accessed', () => {
    const result = fileOps.readFile(fileId);

    expect(result.collectionName).toBe(testData.collectionName);
    expect(result.metadata).toBeDefined();
    expect(result.documents.length).toBe(1);
  });
});

describe('FileOperations Functionality', () => {
  let fileOps;
  let folderId;
  let fileId;
  let testData;

  beforeEach(() => {
    const logger = JDbLogger.createComponentLogger('FileOperations-Func');
    fileOps = new FileOperations(logger);
    folderId = createFolder();
    testData = {
      test: 'baseline',
      collection: 'func',
      metadata: { created: new Date().toISOString(), updated: new Date().toISOString() },
      documents: [{ _id: 'doc1', name: 'first' }]
    };
    fileId = createFile(folderId, `${generateName('file')}.json`, testData);
  });

  afterEach(() => {
    cleanupResources();
  });

  it('should read file content from Drive using real file ID', () => {
    const result = fileOps.readFile(fileId);

    expect(result.test).toBe(testData.test);
    expect(result.collection).toBe('func');
  });

  it('should write data to existing Drive file', () => {
    const updatedData = { ...testData, test: 'updated_data', documents: [{ _id: '1', name: 'updated' }] };

    fileOps.writeFile(fileId, updatedData);
    const readResult = fileOps.readFile(fileId);

    expect(readResult.test).toBe('updated_data');
    expect(readResult.documents[0].name).toBe('updated');
  });

  it('should create new file in test folder', () => {
    const newTestData = { documents: {}, metadata: { created: new Date().toISOString() } };
    const createdFileId = fileOps.createFile(`${generateName('new-file')}.json`, newTestData, folderId);

    expect(createdFileId).toBeDefined();
    expect(createdFileId.length).toBeGreaterThan(0);
  });

  it('should check if file exists in Drive', () => {
    const existsResult = fileOps.fileExists(fileId);
    const notExistsResult = fileOps.fileExists('non-existent-id');

    expect(existsResult).toBe(true);
    expect(notExistsResult).toBe(false);
  });

  it('should delete file from Drive', () => {
    const tempFileId = fileOps.createFile(`${generateName('delete')}.json`, { remove: true }, folderId);

    const deletionResult = fileOps.deleteFile(tempFileId);
    const existsAfterDeletion = fileOps.fileExists(tempFileId);

    expect(deletionResult).toBe(true);
    expect(existsAfterDeletion).toBe(false);
  });

  it('should retrieve file metadata from Drive', () => {
    const metadata = fileOps.getFileMetadata(fileId);

    expect(metadata.id).toBe(fileId);
    expect(metadata.name).toBeDefined();
    expect(metadata.modifiedTime).toBeInstanceOf(Date);
    expect(metadata.mimeType).toBeDefined();
  });
});

describe('FileOperations Error Handling', () => {
  let fileOps;
  let originalDriveApp;

  beforeEach(() => {
    fileOps = new FileOperations(JDbLogger.createComponentLogger('FileOperations-Errors'));
    originalDriveApp = global.DriveApp;
  });

  afterEach(() => {
    global.DriveApp = originalDriveApp;
    cleanupResources();
  });

  it('should handle Drive API quota exceeded error with retry', () => {
    global.DriveApp = {
      getFileById: vi.fn(() => {
        throw new Error('Quota exceeded');
      })
    };

    expect(() => fileOps.readFile('quota-file')).toThrow(QuotaExceededError);
  });

  it('should handle Drive API permission denied error', () => {
    global.DriveApp = {
      getFileById: vi.fn(() => {
        throw new Error('Permission denied');
      })
    };

    expect(() => fileOps.readFile('restricted-file')).toThrow(PermissionDeniedError);
  });

  it('should handle Drive API file not found error', () => {
    global.DriveApp = {
      getFileById: vi.fn(() => {
        throw new Error('File not found');
      })
    };

    expect(() => fileOps.readFile('missing-file')).toThrow(FileNotFoundError);
  });

  it('should retry operations on transient failures', () => {
    let attempts = 0;
    global.DriveApp = {
      getFileById: vi.fn(() => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('Transient error');
        }
        return {
          getBlob: () => ({
            getDataAsString: () => JSON.stringify({ recovered: true })
          })
        };
      })
    };

    const result = fileOps.readFile('transient-file');

    expect(result.recovered).toBe(true);
    expect(attempts).toBe(3);
  });

  it('should handle malformed JSON in file content', () => {
    global.DriveApp = {
      getFileById: vi.fn(() => ({
        getBlob: () => ({
          getDataAsString: () => '{ "incomplete": "json", "missing": }'
        })
      }))
    };

    expect(() => fileOps.readFile('malformed-json')).toThrow(InvalidFileFormatError);
  });

  it('should handle corrupted files with partial JSON and date strings', () => {
    global.DriveApp = {
      getFileById: vi.fn(() => ({
        getBlob: () => ({
          getDataAsString: () => '{ "created": "2023-06-15T10:30:00.000Z", "data": { "incomplete"'
        })
      }))
    };

    expect(() => fileOps.readFile('corrupted-json')).toThrow(InvalidFileFormatError);
  });

  it('should handle files with invalid JSON that could trigger double-parsing detection', () => {
    global.DriveApp = {
      getFileById: vi.fn(() => ({
        getBlob: () => ({
          getDataAsString: () => '"{\\"already\\":\\"stringified\\"}"'
        })
      }))
    };

    expect(() => fileOps.readFile('double-parse')).toThrow(InvalidFileFormatError);
  });

  it('should handle empty files gracefully without date processing', () => {
    global.DriveApp = {
      getFileById: vi.fn(() => ({
        getBlob: () => ({
          getDataAsString: () => ''
        })
      }))
    };

    expect(() => fileOps.readFile('empty-file')).toThrow(InvalidFileFormatError);
  });
});

describe('FileOperations Edge Cases', () => {
  let fileOps;
  let folderId;
  let fileId;

  beforeEach(() => {
    fileOps = new FileOperations(JDbLogger.createComponentLogger('FileOperations-Edge'));
    folderId = createFolder();
    fileId = createFile(folderId, `${generateName('edge')}.json`, {});
  });

  afterEach(() => {
    cleanupResources();
  });

  it('should handle very large file content gracefully', () => {
    const largeData = {
      content: new Array(2000).fill('x').join(''),
      metadata: { size: 'large' },
      timestamp: new Date().toISOString()
    };

    fileOps.writeFile(fileId, largeData);
    const readData = fileOps.readFile(fileId);

    expect(readData.metadata.size).toBe('large');
    expect(readData.content.length).toBeGreaterThan(1500);
  });

  it('should handle special characters in file names and content', () => {
    const specialData = {
      content: 'Special chars: £€$¥©®™',
      unicode: '你好世界',
      emoji: '🚀📊💾',
      timestamp: new Date().toISOString()
    };
    const specialFileId = fileOps.createFile('test-file-with-special-chars.json', specialData, folderId);

    const readData = fileOps.readFile(specialFileId);

    expect(readData.unicode).toBe('你好世界');
    expect(readData.emoji).toBe('🚀📊💾');
  });

  it('should handle empty files and null data appropriately', () => {
    fileOps.writeFile(fileId, {});
    const readData = fileOps.readFile(fileId);

    expect(Object.keys(readData).length).toBe(0);
    expect(() => fileOps.writeFile(fileId, null)).toThrow(InvalidArgumentError);
  });
});

describe('FileOperations Cleanup - Remove Test Files', () => {
  let fileOps;
  let folderId;
  let fileId;

  beforeEach(() => {
    fileOps = new FileOperations(JDbLogger.createComponentLogger('FileOperations-Cleanup'));
    folderId = createFolder();
    fileId = createFile(folderId, `${generateName('cleanup')}.json`, { cleanup: true });
  });

  afterEach(() => {
    cleanupResources();
  });

  it('should delete all created test files', () => {
    const result = fileOps.deleteFile(fileId);

    expect(result).toBe(true);
    expect(fileOps.fileExists(fileId)).toBe(false);
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

describe('FileOperations Date Handling', () => {
  let fileOps;
  let folderId;
  let fileId;

  beforeEach(() => {
    fileOps = new FileOperations(JDbLogger.createComponentLogger('FileOperations-Date'));
    folderId = createFolder();
    fileId = createFile(folderId, `${generateName('date')}.json`, {});
  });

  afterEach(() => {
    cleanupResources();
  });

  it('should preserve Date objects through write-read cycle', () => {
    const testDate = new Date('2023-06-15T10:30:00.000Z');
    const testData = {
      created: testDate,
      updated: new Date('2024-01-01T00:00:00.000Z'),
      metadata: { lastAccess: new Date('2024-06-11T15:45:30.123Z') },
      documents: [{ _id: 'doc1', joinDate: new Date('2020-03-15T08:00:00.000Z') }]
    };

    fileOps.writeFile(fileId, testData);
    const result = fileOps.readFile(fileId);

    expect(result.created).toBeInstanceOf(Date);
    expect(result.updated).toBeInstanceOf(Date);
    expect(result.metadata.lastAccess).toBeInstanceOf(Date);
    expect(result.documents[0].joinDate).toBeInstanceOf(Date);
    expect(result.created.getTime()).toBe(testDate.getTime());
  });

  it('should store Date objects as ISO strings in actual file content', () => {
    const testDate = new Date('2023-12-25T12:00:00.000Z');
    const testData = { eventDate: testDate, description: 'Test event' };

    fileOps.writeFile(fileId, testData);
    const rawParsed = JSON.parse(readRawContent(fileId));

    expect(typeof rawParsed.eventDate).toBe('string');
    expect(rawParsed.eventDate).toBe(testDate.toISOString());
    const result = fileOps.readFile(fileId);
    expect(result.eventDate).toBeInstanceOf(Date);
  });

  it('should handle arrays with multiple Date objects', () => {
    const testData = {
      events: [
        { date: new Date('2023-01-01T00:00:00.000Z'), type: 'start' },
        { date: new Date('2023-06-01T12:00:00.000Z'), type: 'middle' },
        { date: new Date('2023-12-31T23:59:59.999Z'), type: 'end' }
      ],
      milestones: [new Date('2023-03-15T09:30:00.000Z'), new Date('2023-09-22T16:45:00.000Z')]
    };

    fileOps.writeFile(fileId, testData);
    const result = fileOps.readFile(fileId);

    expect(result.events.every((e) => e.date instanceof Date)).toBe(true);
    expect(result.milestones.every((m) => m instanceof Date)).toBe(true);
  });

  it('should handle deeply nested Date objects', () => {
    const testData = {
      user: {
        profile: {
          personal: {
            birthDate: new Date('1990-05-15T00:00:00.000Z'),
            preferences: { timeZone: 'UTC', lastUpdated: new Date('2024-06-11T10:00:00.000Z') }
          },
          professional: {
            startDate: new Date('2015-09-01T09:00:00.000Z'),
            certifications: [{
              name: 'GCP',
              obtainedDate: new Date('2020-12-01T00:00:00.000Z'),
              expiryDate: new Date('2023-12-01T00:00:00.000Z')
            }]
          }
        }
      }
    };

    fileOps.writeFile(fileId, testData);
    const result = fileOps.readFile(fileId);

    expect(result.user.profile.personal.birthDate).toBeInstanceOf(Date);
    expect(result.user.profile.personal.preferences.lastUpdated).toBeInstanceOf(Date);
    expect(result.user.profile.professional.startDate).toBeInstanceOf(Date);
    expect(result.user.profile.professional.certifications[0].obtainedDate).toBeInstanceOf(Date);
    expect(result.user.profile.professional.certifications[0].expiryDate).toBeInstanceOf(Date);
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

    fileOps.writeFile(fileId, testData);
    const result = fileOps.readFile(fileId);

    expect(result.actualDate).toBeInstanceOf(Date);
    expect(result.isoString).toBeInstanceOf(Date);
    expect(typeof result.notADate).toBe('string');
    expect(typeof result.regularString).toBe('string');
    expect(typeof result.number).toBe('number');
    expect(result.nullValue).toBeNull();
  });

  it('should handle edge cases with invalid date-like strings', () => {
    const testData = {
      validDate: new Date('2023-06-15T10:30:00.000Z'),
      almostDate1: '2023-13-32T25:70:70.000Z',
      almostDate2: '2023-06-15T10:30:00',
      almostDate3: '2023/06/15 10:30:00',
      almostDate4: 'Thu Jun 15 2023 10:30:00 GMT+0000',
      notDate: 'this is not a date at all',
      empty: ''
    };

    fileOps.writeFile(fileId, testData);
    const result = fileOps.readFile(fileId);

    expect(result.validDate).toBeInstanceOf(Date);
    expect(typeof result.almostDate1).toBe('string');
    expect(typeof result.almostDate2).toBe('string');
    expect(typeof result.almostDate3).toBe('string');
    expect(typeof result.almostDate4).toBe('string');
    expect(typeof result.notDate).toBe('string');
    expect(typeof result.empty).toBe('string');
  });

  it('should handle Date objects with various time zones and precision', () => {
    const testData = {
      utcDate: new Date('2023-06-15T10:30:00.000Z'),
      preciseDate: new Date('2023-06-15T10:30:00.123Z'),
      noMilliseconds: new Date('2023-06-15T10:30:00Z'),
      oldDate: new Date('1970-01-01T00:00:00.000Z'),
      futureDate: new Date('2099-12-31T23:59:59.999Z')
    };

    fileOps.writeFile(fileId, testData);
    const result = fileOps.readFile(fileId);

    expect(result.preciseDate.getMilliseconds()).toBe(123);
    expect(result.noMilliseconds.getMilliseconds()).toBe(0);
    expect(result.oldDate.getFullYear()).toBe(1970);
    expect(result.futureDate.getFullYear()).toBe(2099);
  });
});
