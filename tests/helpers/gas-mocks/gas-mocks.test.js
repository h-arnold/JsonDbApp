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

  it('provides a root folder with an id that can be resolved', () => {
    const root = DriveApp.getRootFolder();

    expect(root).toBeDefined();
    expect(typeof root.getId).toBe('function');

    const rootId = root.getId();
    const resolved = DriveApp.getFolderById(rootId);

    expect(resolved.getId()).toBe(rootId);
    expect(typeof resolved.getName).toBe('function');
  });

  it('serialises Drive folders and files as empty objects', () => {
    const root = DriveApp.getRootFolder();
    const folder = DriveApp.createFolder('mock-serialise');
    const file = folder.createFile('serialise.json', '{}', MimeType.JSON);

    expect(JSON.stringify(root)).toBe('{}');
    expect(JSON.stringify(folder)).toBe('{}');
    expect(JSON.stringify(file)).toBe('{}');
  });

  it('exposes root folder name and serialises identifiers as JSON strings', () => {
    const root = DriveApp.getRootFolder();
    const rootId = root.getId();

    expect(root.getName()).toBe('My Drive');
    expect(JSON.stringify(rootId)).toBe(`\"${rootId}\"`);
    expect(JSON.stringify(root.getName())).toBe('"My Drive"');
  });
});
