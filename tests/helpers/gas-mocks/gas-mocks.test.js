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

  it('matches ScriptCache getAll/removeAll behaviour from recorder output', () => {
    const cache = CacheService.getScriptCache();
    const prefix = `vitest-cache-${Date.now()}`;
    const keyOne = `${prefix}-one`;
    const keyTwo = `${prefix}-two`;
    const keyThree = `${prefix}-three`;

    cache.removeAll([keyOne, keyTwo, keyThree]);
    cache.put(keyOne, 'value-1', 120);
    cache.putAll(
      {
        [keyTwo]: 'value-2',
        [keyThree]: 'value-3'
      },
      120
    );

    expect(cache.getAll([keyOne, keyTwo, keyThree, `${prefix}-missing`])).toEqual({
      [keyOne]: 'value-1',
      [keyTwo]: 'value-2',
      [keyThree]: 'value-3'
    });

    cache.remove(keyTwo);
    expect(cache.getAll([keyTwo, keyThree])).toEqual({
      [keyThree]: 'value-3'
    });

    cache.removeAll([keyOne, keyThree]);
    expect(cache.getAll([keyOne, keyThree])).toEqual({});
  });

  it('requires deleteTrigger argument identity from getProjectTriggers', () => {
    const created = ScriptApp.newTrigger('flushPendingWritesHandler')
      .timeBased()
      .after(60000)
      .create();
    const projectTriggers = ScriptApp.getProjectTriggers();
    const triggerFromProject = projectTriggers.find(
      (item) => item.getUniqueId() === created.getUniqueId()
    );

    expect(created.getUniqueId()).toMatch(/^\d+$/);
    expect(() => ScriptApp.deleteTrigger(created)).toThrow(
      'Unexpected error while getting the method or property deleteTrigger on object ScriptApp.'
    );
    expect(() => ScriptApp.deleteTrigger(triggerFromProject)).not.toThrow();
  });
});
