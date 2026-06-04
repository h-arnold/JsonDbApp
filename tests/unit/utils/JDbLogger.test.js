/**
 * JDbLogger.test.js - Vitest tests for JDbLogger
 */

describe('JDbLogger basic functionality', () => {
  it('should have logger methods', () => {
    expect(typeof JDbLogger.error).toBe('function');
    expect(typeof JDbLogger.warn).toBe('function');
    expect(typeof JDbLogger.info).toBe('function');
    expect(typeof JDbLogger.debug).toBe('function');
  });
});

describe('JDbLogger levels', () => {
  it('should set log level by name', () => {
    const originalLevel = JDbLogger.currentLevel;

    JDbLogger.setLevelByName('ERROR');
    expect(JDbLogger.currentLevel).toBe(JDbLogger.LOG_LEVELS.ERROR);

    JDbLogger.setLevelByName('DEBUG');
    expect(JDbLogger.currentLevel).toBe(JDbLogger.LOG_LEVELS.DEBUG);

    JDbLogger.currentLevel = originalLevel;
  });
});

describe('JDbLogger component logger', () => {
  it('should create component logger', () => {
    const componentLogger = JDbLogger.createComponentLogger('TestComponent');
    expect(typeof componentLogger.error).toBe('function');
    expect(typeof componentLogger.info).toBe('function');
  });
});
