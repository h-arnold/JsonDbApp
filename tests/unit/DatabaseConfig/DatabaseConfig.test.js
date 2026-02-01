/**
 * DatabaseConfig.test.js - DatabaseConfig Class Tests (Vitest)
 * 
 * Comprehensive tests for the DatabaseConfig class including:
 * - Configuration creation and validation
 * - Default and custom values
 * - Parameter validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestFolder, trackFolderId } from '../../helpers/database-test-helpers.js';

let testFolderId;

beforeEach(() => {
  testFolderId = createTestFolder();
});

describe('DatabaseConfig Setup - Create Test Environment', () => {
  it('should create test folder for DatabaseConfig tests', () => {
    expect(testFolderId).toBeDefined();
    const folder = DriveApp.getFolderById(testFolderId);
    expect(folder).toBeDefined();
  });
});

describe('DatabaseConfig Creation and Default Values', () => {
  it('should create DatabaseConfig with default values', () => {
    const config = new DatabaseConfig();
    trackFolderId(config.rootFolderId);
    
    expect(config).not.toBeNull();
    expect(config.rootFolderId).toBeDefined();
    expect(config.autoCreateCollections).toBe(true);
    expect(config.lockTimeout).toBe(30000);
    expect(config.retryAttempts).toBe(3);
    expect(config.retryDelayMs).toBe(1000);
    expect(config.cacheEnabled).toBe(true);
    expect(config.logLevel).toBe('INFO');
    expect(config.backupOnInitialise).toBe(false);
    expect(config.stripDisallowedCollectionNameCharacters).toBe(false);
  });

  it('should create DatabaseConfig with custom values', () => {
    const customConfig = {
      rootFolderId: testFolderId,
      autoCreateCollections: false,
      lockTimeout: 60000,
      retryAttempts: 5,
      retryDelayMs: 2000,
      cacheEnabled: false,
      logLevel: 'DEBUG',
      backupOnInitialise: true,
      stripDisallowedCollectionNameCharacters: true
    };
    
    const config = new DatabaseConfig(customConfig);
    trackFolderId(config.rootFolderId);
    
    expect(config.rootFolderId).toBe(customConfig.rootFolderId);
    expect(config.autoCreateCollections).toBe(false);
    expect(config.lockTimeout).toBe(60000);
    expect(config.retryAttempts).toBe(5);
    expect(config.retryDelayMs).toBe(2000);
    expect(config.cacheEnabled).toBe(false);
    expect(config.logLevel).toBe('DEBUG');
    expect(config.backupOnInitialise).toBe(true);
    expect(config.stripDisallowedCollectionNameCharacters).toBe(true);
  });

  it('should merge custom config with defaults', () => {
    const partialConfig = {
      lockTimeout: 45000,
      retryAttempts: 7,
      logLevel: 'WARN',
      rootFolderId: testFolderId
    };
    
    const config = new DatabaseConfig(partialConfig);
    trackFolderId(config.rootFolderId);
    
    expect(config.lockTimeout).toBe(45000);
    expect(config.retryAttempts).toBe(7);
    expect(config.retryDelayMs).toBe(1000);
    expect(config.logLevel).toBe('WARN');
    expect(config.autoCreateCollections).toBe(true);
    expect(config.cacheEnabled).toBe(true);
    expect(config.rootFolderId).toBeDefined();
    expect(config.backupOnInitialise).toBe(false);
    expect(config.stripDisallowedCollectionNameCharacters).toBe(false);
  });

  it('should preserve sanitisation flag through clone and serialization', () => {
    const config = new DatabaseConfig({ stripDisallowedCollectionNameCharacters: true });
    trackFolderId(config.rootFolderId);
    const clone = config.clone();
    
    expect(clone.stripDisallowedCollectionNameCharacters).toBe(true);

    const serialised = clone.toJSON();
    expect(serialised.stripDisallowedCollectionNameCharacters).toBe(true);

    const deserialised = DatabaseConfig.fromJSON(serialised);
    expect(deserialised.stripDisallowedCollectionNameCharacters).toBe(true);
  });
});

describe('DatabaseConfig Validation', () => {
  it('should validate lock timeout parameter', () => {
    expect(() => {
      new DatabaseConfig({ lockTimeout: 'invalid' });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ lockTimeout: -1 });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ lockTimeout: 499 });
    }).toThrow();

    const cfg = new DatabaseConfig({ lockTimeout: 500 });
    expect(cfg.lockTimeout).toBe(500);
  });

  it('should validate retryAttempts and retryDelayMs parameters', () => {
    expect(() => {
      new DatabaseConfig({ retryAttempts: 'invalid' });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ retryAttempts: 0 });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ retryDelayMs: 'invalid' });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ retryDelayMs: -1 });
    }).toThrow();

    const cfg = new DatabaseConfig({ lockTimeout: 500, retryAttempts: 1, retryDelayMs: 0 });
    expect(cfg.lockTimeout).toBe(500);
    expect(cfg.retryAttempts).toBe(1);
    expect(cfg.retryDelayMs).toBe(0);
  });

  it('should validate log level parameter', () => {
    expect(() => {
      new DatabaseConfig({ logLevel: 'INVALID' });
    }).toThrow();
    
    const configWithNull = new DatabaseConfig({ logLevel: null });
    expect(configWithNull.logLevel).toBe('INFO');
    
    const configWithUndefined = new DatabaseConfig({ logLevel: undefined });
    expect(configWithUndefined.logLevel).toBe('INFO');
    
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    validLevels.forEach(level => {
      const validConfig = new DatabaseConfig({ logLevel: level });
      expect(validConfig.logLevel).toBe(level);
    });
  });

  it('should validate boolean parameters', () => {
    expect(() => {
      new DatabaseConfig({ autoCreateCollections: 'invalid' });
    }).toThrow();
    
    expect(() => {
      new DatabaseConfig({ cacheEnabled: 'invalid' });
    }).toThrow();
    
    expect(() => {
      new DatabaseConfig({ stripDisallowedCollectionNameCharacters: 'invalid' });
    }).toThrow();

    const validConfig1 = new DatabaseConfig({
      autoCreateCollections: true,
      cacheEnabled: false,
      backupOnInitialise: true,
      stripDisallowedCollectionNameCharacters: true
    });
    expect(validConfig1.autoCreateCollections).toBe(true);
    expect(validConfig1.cacheEnabled).toBe(false);
    expect(validConfig1.backupOnInitialise).toBe(true);
    expect(validConfig1.stripDisallowedCollectionNameCharacters).toBe(true);

    expect(() => {
      new DatabaseConfig({ backupOnInitialise: 'invalid' });
    }).toThrow();
  });

  it('should validate rootFolderId parameter', () => {
    const configWithEmpty = new DatabaseConfig({ rootFolderId: '' });
    expect(configWithEmpty.rootFolderId).toBeDefined();
    expect(configWithEmpty.rootFolderId.length).toBeGreaterThan(0);
    
    const configWithNull = new DatabaseConfig({ rootFolderId: null });
    expect(configWithNull.rootFolderId).toBeDefined();
    
    expect(() => {
      new DatabaseConfig({ rootFolderId: 123 });
    }).toThrow();
    
    expect(() => {
      new DatabaseConfig({ rootFolderId: {} });
    }).toThrow();
    
    const validConfig = new DatabaseConfig({ rootFolderId: 'test-folder-id' });
    expect(validConfig.rootFolderId).toBe('test-folder-id');
  });

  it('testValidMinimumLockTimeout', () => {
    const config = new DatabaseConfig({ lockTimeout: 500 });
    expect(config.lockTimeout).toBe(500);
  });

  it('testTooLowLockTimeoutThrowsError', () => {
    expect(() => {
      new DatabaseConfig({ lockTimeout: 499 });
    }).toThrow(/must be between 500/);
  });
});
