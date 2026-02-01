/**
 * Environment.test.js - Vitest tests for Environment
 */

describe('Environment Tests', () => {
  it('should have clasp configuration and dependencies', () => {
    expect(typeof JDbLogger.info).toBe('function');
    expect(typeof ErrorHandler.ErrorTypes).toBe('object');
  });

  it('should have Drive access', () => {
    expect(() => DriveApp.getFolders()).not.toThrow();
  });
});
