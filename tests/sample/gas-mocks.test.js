import { describe, it, expect } from 'vitest';

describe('Gas mocks run inside Viitest', () => {
  it('creates a file via DriveApp and honours properties updates', () => {
    const folder = DriveApp.createFolder('vitest-sandbox');
    const payload = { ready: true };
    const content = JSON.stringify(payload);
    const file = folder.createFile('status.json', content, MimeType.JSON);

    expect(file.getName()).toBe('status.json');
    expect(file.getMimeType()).toBe(MimeType.JSON);
    expect(file.getBlob().getDataAsString()).toBe(content);

    const scriptProps = ScriptProperties;
    scriptProps.setProperty('vitest-key', 'enabled');
    expect(scriptProps.getProperty('vitest-key')).toBe('enabled');
    scriptProps.deleteProperty('vitest-key');
    expect(scriptProps.getProperty('vitest-key')).toBeNull();
  });

  it('re-uses the script lock and releases cleanly', () => {
    const lock = LockService.getScriptLock();
    lock.waitLock(100);
    expect(() => lock.waitLock(1)).not.toThrow();
    lock.releaseLock();
    expect(() => lock.waitLock(10)).not.toThrow();
    lock.releaseLock();
  });
});
