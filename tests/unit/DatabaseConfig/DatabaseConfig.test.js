/**
 * DatabaseConfig.test.js - DatabaseConfig Class Tests (Vitest)
 *
 * Comprehensive tests for the DatabaseConfig class including:
 * - Configuration creation and validation
 * - Default and custom values
 * - Parameter validation
 */

import { describe, it, expect, vi } from 'vitest';

describe('DatabaseConfig Creation and Default Values', () => {
  it('should create DatabaseConfig with default values', () => {
    const config = new DatabaseConfig();

    expect(config).not.toBeNull();
    expect(config.rootFolderId).toBeDefined();
    expect(config.autoCreateCollections).toBe(true);
    expect(config.lockTimeout).toBe(30000);
    expect(config.retryAttempts).toBe(3);
    expect(config.retryDelayMs).toBe(1000);
    expect(config.lockRetryBackoffBase).toBe(2);
    expect(config.cacheEnabled).toBe(true);
    expect(config.logLevel).toBe('INFO');
    expect(config.fileRetryAttempts).toBe(3);
    expect(config.fileRetryDelayMs).toBe(1000);
    expect(config.fileRetryBackoffBase).toBe(2);
    expect(config.queryEngineMaxNestedDepth).toBe(10);
    expect(config.queryEngineSupportedOperators).toEqual(['$eq', '$gt', '$lt', '$and', '$or']);
    expect(config.queryEngineLogicalOperators).toEqual(['$and', '$or']);
    expect(config.backupOnInitialise).toBe(false);
    expect(config.stripDisallowedCollectionNameCharacters).toBe(false);
  });

  it('should cache the default root folder id', () => {
    const originalRootFolder = DriveApp.getRootFolder;
    const mockFolder = {
      getId: vi.fn(() => 'root-folder-id')
    };
    const spy = vi.spyOn(DriveApp, 'getRootFolder').mockReturnValue(mockFolder);

    DatabaseConfig._defaultRootFolderId = null;

    const first = new DatabaseConfig({ rootFolderId: null });
    const second = new DatabaseConfig({ rootFolderId: undefined });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(first.rootFolderId).toBe('root-folder-id');
    expect(second.rootFolderId).toBe('root-folder-id');

    spy.mockRestore();
    DriveApp.getRootFolder = originalRootFolder;
    DatabaseConfig._defaultRootFolderId = null;
  });

  it('should create DatabaseConfig with custom values', () => {
    const customConfig = {
      rootFolderId: 'custom-folder-id',
      autoCreateCollections: false,
      lockTimeout: 60000,
      retryAttempts: 5,
      retryDelayMs: 2000,
      lockRetryBackoffBase: 3,
      cacheEnabled: false,
      logLevel: 'DEBUG',
      fileRetryAttempts: 4,
      fileRetryDelayMs: 1500,
      fileRetryBackoffBase: 4,
      queryEngineMaxNestedDepth: 12,
      queryEngineSupportedOperators: ['$eq', '$gt', '$and'],
      queryEngineLogicalOperators: ['$and'],
      backupOnInitialise: true,
      stripDisallowedCollectionNameCharacters: true
    };

    const config = new DatabaseConfig(customConfig);

    expect(config.rootFolderId).toBe(customConfig.rootFolderId);
    expect(config.autoCreateCollections).toBe(false);
    expect(config.lockTimeout).toBe(60000);
    expect(config.retryAttempts).toBe(5);
    expect(config.retryDelayMs).toBe(2000);
    expect(config.lockRetryBackoffBase).toBe(3);
    expect(config.cacheEnabled).toBe(false);
    expect(config.logLevel).toBe('DEBUG');
    expect(config.fileRetryAttempts).toBe(4);
    expect(config.fileRetryDelayMs).toBe(1500);
    expect(config.fileRetryBackoffBase).toBe(4);
    expect(config.queryEngineMaxNestedDepth).toBe(12);
    expect(config.queryEngineSupportedOperators).toEqual(['$eq', '$gt', '$and']);
    expect(config.queryEngineLogicalOperators).toEqual(['$and']);
    expect(config.backupOnInitialise).toBe(true);
    expect(config.stripDisallowedCollectionNameCharacters).toBe(true);
  });

  it('should merge custom config with defaults', () => {
    const partialConfig = {
      lockTimeout: 45000,
      retryAttempts: 7,
      logLevel: 'WARN'
    };

    const config = new DatabaseConfig(partialConfig);

    expect(config.lockTimeout).toBe(45000);
    expect(config.retryAttempts).toBe(7);
    expect(config.retryDelayMs).toBe(1000);
    expect(config.lockRetryBackoffBase).toBe(2);
    expect(config.logLevel).toBe('WARN');
    expect(config.autoCreateCollections).toBe(true);
    expect(config.cacheEnabled).toBe(true);
    expect(config.rootFolderId).toBeDefined();
    expect(config.fileRetryAttempts).toBe(3);
    expect(config.fileRetryDelayMs).toBe(1000);
    expect(config.fileRetryBackoffBase).toBe(2);
    expect(config.queryEngineMaxNestedDepth).toBe(10);
    expect(config.queryEngineSupportedOperators).toEqual(['$eq', '$gt', '$lt', '$and', '$or']);
    expect(config.queryEngineLogicalOperators).toEqual(['$and', '$or']);
    expect(config.backupOnInitialise).toBe(false);
    expect(config.stripDisallowedCollectionNameCharacters).toBe(false);
  });

  it('should preserve sanitisation flag through clone and serialization', () => {
    const config = new DatabaseConfig({ stripDisallowedCollectionNameCharacters: true });
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

  it('should validate lock retry backoff base', () => {
    expect(() => {
      new DatabaseConfig({ lockRetryBackoffBase: 'invalid' });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ lockRetryBackoffBase: 0 });
    }).toThrow();

    const cfg = new DatabaseConfig({ lockRetryBackoffBase: 1 });
    expect(cfg.lockRetryBackoffBase).toBe(1);
  });

  it('should validate file retry configuration', () => {
    expect(() => {
      new DatabaseConfig({ fileRetryAttempts: 'invalid' });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ fileRetryAttempts: 0 });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ fileRetryDelayMs: 'invalid' });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ fileRetryDelayMs: -1 });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ fileRetryBackoffBase: 'invalid' });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ fileRetryBackoffBase: 0 });
    }).toThrow();

    const cfg = new DatabaseConfig({
      fileRetryAttempts: 2,
      fileRetryDelayMs: 0,
      fileRetryBackoffBase: 2
    });
    expect(cfg.fileRetryAttempts).toBe(2);
    expect(cfg.fileRetryDelayMs).toBe(0);
    expect(cfg.fileRetryBackoffBase).toBe(2);
  });

  it('should validate query engine configuration', () => {
    expect(() => {
      new DatabaseConfig({ queryEngineMaxNestedDepth: 'invalid' });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ queryEngineMaxNestedDepth: -1 });
    }).toThrow();

    try {
      new DatabaseConfig({ queryEngineSupportedOperators: 'invalid' });
      throw new Error('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorHandler.ErrorTypes.INVALID_ARGUMENT);
      expect(error.context.providedValue).toBe('invalid');
    }

    expect(() => {
      new DatabaseConfig({ queryEngineSupportedOperators: [] });
    }).toThrow();

    expect(() => {
      new DatabaseConfig({ queryEngineSupportedOperators: ['$eq', ''] });
    }).toThrow();

    try {
      new DatabaseConfig({ queryEngineLogicalOperators: 'invalid' });
      throw new Error('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorHandler.ErrorTypes.INVALID_ARGUMENT);
      expect(error.context.providedValue).toBe('invalid');
    }

    expect(() => {
      new DatabaseConfig({
        queryEngineSupportedOperators: ['$eq'],
        queryEngineLogicalOperators: ['$and']
      });
    }).toThrow();

    const cfg = new DatabaseConfig({
      queryEngineMaxNestedDepth: 2,
      queryEngineSupportedOperators: ['$eq', '$and'],
      queryEngineLogicalOperators: ['$and']
    });
    expect(cfg.queryEngineMaxNestedDepth).toBe(2);
    expect(cfg.queryEngineSupportedOperators).toEqual(['$eq', '$and']);
    expect(cfg.queryEngineLogicalOperators).toEqual(['$and']);
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
    validLevels.forEach((level) => {
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
