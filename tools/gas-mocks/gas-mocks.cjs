const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_ROOT = path.join(os.tmpdir(), 'gasdb-drive');
const DEFAULT_PROPERTIES_FILE = path.join(os.tmpdir(), 'gasdb-script-properties.json');
const DEFAULT_CACHE_TTL_SECONDS = 600;
const MAX_CACHE_TTL_SECONDS = 21600;
const MAX_CACHE_KEY_LENGTH = 250;
const MAX_CACHE_VALUE_BYTES = 100 * 1024;

let nextId = 1;

function generateId() {
  const id = `mock-${Date.now()}-${nextId}`;
  nextId += 1;
  return id;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Invalid JSON in file — return fallback.
    /* eslint-disable-next-line no-console */
    console.warn('Failed to parse JSON file:', err?.message ?? err);
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

class MockFileIterator {
  constructor(items) {
    this.items = items.slice();
  }

  hasNext() {
    return this.items.length > 0;
  }

  next() {
    if (!this.hasNext()) {
      throw new Error('No more files');
    }
    return this.items.shift();
  }
}

class MockFolderIterator {
  constructor(items) {
    this.items = items.slice();
  }

  hasNext() {
    return this.items.length > 0;
  }

  next() {
    if (!this.hasNext()) {
      throw new Error('No more folders');
    }
    return this.items.shift();
  }
}

class MockFile {
  constructor({ id, name, mimeType, filePath, store }) {
    this.id = id;
    this.name = name;
    this.mimeType = mimeType;
    this.filePath = filePath;
    this.store = store;
    this.trashed = false;
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  getMimeType() {
    return this.mimeType;
  }

  toJSON() {
    return {};
  }

  /**
   * Returns a Blob object for the file with content and MIME type.
   * @returns {Object} Blob-like object with getDataAsString() and getContentType().
   */
  getBlob() {
    const filePath = this.filePath;
    const mimeType = this.mimeType;
    return {
      getDataAsString() {
        if (!fs.existsSync(filePath)) {
          return '';
        }
        return fs.readFileSync(filePath, 'utf8');
      },
      getContentType() {
        return mimeType;
      }
    };
  }

  /**
   * Updates the file contents in the underlying mock storage.
   * @param {string} content - New file contents.
   * @returns {MockFile} This file, for chaining.
   */
  setContent(content) {
    ensureDir(path.dirname(this.filePath));
    const fileContent = content == null ? '' : String(content);
    fs.writeFileSync(this.filePath, fileContent);
    this.store?.files?.set(this.id, this);
    return this;
  }

  /**
   * Indicates whether the file is currently trashed.
   * @returns {boolean} True if the file is trashed.
   */
  isTrashed() {
    return this.trashed;
  }

  /**
   * Returns the file size in bytes.
   * @returns {number} File size.
   */
  getSize() {
    if (fs.existsSync(this.filePath)) {
      return fs.statSync(this.filePath).size;
    }
    return 0;
  }

  /**
   * Returns the last modified date.
   * @returns {Date} Last modified date.
   */
  getLastUpdated() {
    if (fs.existsSync(this.filePath)) {
      return fs.statSync(this.filePath).mtime;
    }
    return new Date();
  }

  /**
   * Returns the creation date.
   * @returns {Date} Creation date.
   */
  getDateCreated() {
    if (fs.existsSync(this.filePath)) {
      return fs.statSync(this.filePath).birthtime;
    }
    return new Date();
  }

  setTrashed(trashed) {
    this.trashed = Boolean(trashed);
    this.store.files.set(this.id, this);
  }
}

class MockFolder {
  constructor({ id, name, folderPath, store }) {
    this.id = id;
    this.name = name;
    this.folderPath = folderPath;
    this.store = store;
    this.trashed = false;
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  toJSON() {
    return {};
  }

  setTrashed(trashed) {
    this.trashed = Boolean(trashed);
    this.store.folders.set(this.id, this);
  }

  createFile(name, contents, mimeType) {
    const id = generateId();
    const filePath = path.join(this.folderPath, name);
    ensureDir(this.folderPath);
    const fileContent = contents == null ? '' : String(contents);
    fs.writeFileSync(filePath, fileContent);
    const file = new MockFile({
      id,
      name,
      mimeType,
      filePath,
      store: this.store
    });
    this.store.files.set(id, file);
    return file;
  }

  getFiles() {
    const files = Array.from(this.store.files.values())
      .filter((file) => path.dirname(file.filePath) === this.folderPath)
      .filter((file) => !file.trashed);
    return new MockFileIterator(files);
  }

  getFilesByType(mimeType) {
    const files = Array.from(this.store.files.values())
      .filter((file) => path.dirname(file.filePath) === this.folderPath)
      .filter((file) => !file.trashed)
      .filter((file) => file.mimeType === mimeType);
    return new MockFileIterator(files);
  }

  getFoldersByName(name) {
    const folders = Array.from(this.store.folders.values())
      .filter((folder) => !folder.trashed)
      .filter((folder) => folder.name === name);
    return new MockFolderIterator(folders);
  }
}

class MockProperties {
  constructor(filePath) {
    this.filePath = filePath;
    this.cache = readJson(filePath, {});
  }

  getProperty(key) {
    return Object.hasOwn(this.cache, key) ? this.cache[key] : null;
  }

  setProperty(key, value) {
    this.cache[key] = String(value);
    writeJson(this.filePath, this.cache);
    return this;
  }

  deleteProperty(key) {
    delete this.cache[key];
    writeJson(this.filePath, this.cache);
  }
}

class MockLock {
  locked = false;
  recursion = 0;

  /**
   * Acquires the lock or throws on timeout.
   * NOTE: This implementation uses a busy-wait loop that blocks the JavaScript event loop.
   * In single-threaded Node.js, this won't properly simulate concurrent lock contention
   * like the real GAS LockService does. This mock is suitable for single-threaded
   * sequential test scenarios but won't simulate true concurrent lock behavior.
   * @param {number} timeoutInMillis - Maximum time to wait in milliseconds.
   * @throws {Error} When timeout is reached.
   */
  waitLock(timeoutInMillis) {
    const start = Date.now();
    if (this.locked && this.recursion > 0) {
      this.recursion += 1;
      return;
    }
    while (this.locked) {
      if (Date.now() - start > timeoutInMillis) {
        throw new Error('Lock wait timeout');
      }
    }
    this.locked = true;
    this.recursion = 1;
  }

  releaseLock() {
    if (!this.locked || this.recursion <= 0) {
      this.locked = false;
      this.recursion = 0;
      return;
    }
    this.recursion -= 1;
    if (this.recursion === 0) {
      this.locked = false;
    }
  }
}

class MockCache {
  constructor() {
    this._entries = new Map();
  }

  get(key) {
    this._assertKey(key);
    const entry = this._entries.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this._entries.delete(key);
      return null;
    }
    return entry.value;
  }

  getAll(keys) {
    this._assertKeyArray(keys, 'keys');
    const result = {};
    keys.forEach((key) => {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    });
    return result;
  }

  put(key, value, expirationInSeconds = DEFAULT_CACHE_TTL_SECONDS) {
    this._assertKey(key);
    this._assertValue(value);
    this._assertExpiration(expirationInSeconds);
    this._entries.set(key, {
      value: String(value),
      expiresAt: Date.now() + expirationInSeconds * 1000
    });
  }

  putAll(values, expirationInSeconds = DEFAULT_CACHE_TTL_SECONDS) {
    this._assertObject(values, 'values');
    this._assertExpiration(expirationInSeconds);
    Object.keys(values).forEach((key) => {
      this.put(key, values[key], expirationInSeconds);
    });
  }

  remove(key) {
    this._assertKey(key);
    this._entries.delete(key);
  }

  removeAll(keys) {
    this._assertKeyArray(keys, 'keys');
    keys.forEach((key) => this.remove(key));
  }

  _assertKey(key) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Cache key must be a non-empty string');
    }
    if (key.length > MAX_CACHE_KEY_LENGTH) {
      throw new Error(`Cache key exceeds max length ${MAX_CACHE_KEY_LENGTH}`);
    }
  }

  _assertKeyArray(keys, name) {
    if (!Array.isArray(keys)) {
      throw new Error(`${name} must be an array`);
    }
    keys.forEach((key) => this._assertKey(key));
  }

  _assertObject(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${name} must be an object`);
    }
  }

  _assertValue(value) {
    const asString = String(value);
    const bytes = Buffer.byteLength(asString, 'utf8');
    if (bytes > MAX_CACHE_VALUE_BYTES) {
      throw new Error(`Cache value exceeds max size ${MAX_CACHE_VALUE_BYTES} bytes`);
    }
  }

  _assertExpiration(expirationInSeconds) {
    if (!Number.isInteger(expirationInSeconds) || expirationInSeconds <= 0) {
      throw new Error('expirationInSeconds must be a positive integer');
    }
    if (expirationInSeconds > MAX_CACHE_TTL_SECONDS) {
      throw new Error(`expirationInSeconds exceeds max ${MAX_CACHE_TTL_SECONDS}`);
    }
  }
}

class MockTrigger {
  constructor({ uniqueId, handlerFunction, eventType, schedule }) {
    this._uniqueId = uniqueId;
    this._handlerFunction = handlerFunction;
    this._eventType = eventType;
    this._schedule = schedule;
  }

  getUniqueId() {
    return this._uniqueId;
  }

  getHandlerFunction() {
    return this._handlerFunction;
  }

  getEventType() {
    return this._eventType;
  }

  getTriggerSource() {
    return 'CLOCK';
  }

  toJSON() {
    return {
      uniqueId: this._uniqueId,
      handlerFunction: this._handlerFunction,
      eventType: this._eventType,
      schedule: this._schedule
    };
  }
}

class MockClockTriggerBuilder {
  constructor(parentBuilder) {
    this._parentBuilder = parentBuilder;
    this._schedule = null;
  }

  after(milliseconds) {
    if (!Number.isInteger(milliseconds) || milliseconds <= 0) {
      throw new Error('milliseconds must be a positive integer');
    }
    this._schedule = { type: 'after', milliseconds };
    return this;
  }

  everyMinutes(minutes) {
    const allowed = [1, 5, 10, 15, 30];
    if (!allowed.includes(minutes)) {
      throw new Error('minutes must be one of 1, 5, 10, 15, 30');
    }
    this._schedule = { type: 'everyMinutes', minutes };
    return this;
  }

  create() {
    if (!this._schedule) {
      throw new Error('No schedule configured for clock trigger');
    }
    return this._parentBuilder._createTrigger('CLOCK', this._schedule);
  }
}

class MockTriggerBuilder {
  constructor(scriptApp, handlerFunction) {
    this._scriptApp = scriptApp;
    this._handlerFunction = handlerFunction;
  }

  timeBased() {
    return new MockClockTriggerBuilder(this);
  }

  _createTrigger(eventType, schedule) {
    const trigger = new MockTrigger({
      uniqueId: generateId(),
      handlerFunction: this._handlerFunction,
      eventType,
      schedule
    });
    this._scriptApp._triggers.set(trigger.getUniqueId(), trigger);
    return trigger;
  }
}

class MockScriptApp {
  constructor(scriptId) {
    this._scriptId = scriptId;
    this._triggers = new Map();
  }

  getScriptId() {
    return this._scriptId;
  }

  newTrigger(functionName) {
    if (typeof functionName !== 'string' || functionName.trim().length === 0) {
      throw new Error('functionName must be a non-empty string');
    }
    return new MockTriggerBuilder(this, functionName);
  }

  getProjectTriggers() {
    return Array.from(this._triggers.values());
  }

  deleteTrigger(trigger) {
    if (!trigger || typeof trigger.getUniqueId !== 'function') {
      throw new Error('trigger must be a Trigger object');
    }
    this._triggers.delete(trigger.getUniqueId());
  }
}

function createGasMocks(options = {}) {
  const rootPath = options.driveRoot || DEFAULT_ROOT;
  const propertiesPath = options.propertiesFile || DEFAULT_PROPERTIES_FILE;
  const scriptId = options.scriptId || 'mock-script-id';
  ensureDir(rootPath);

  const store = {
    files: new Map(),
    folders: new Map()
  };

  const rootFolder = new MockFolder({
    id: generateId(),
    name: 'My Drive',
    folderPath: rootPath,
    store
  });
  store.folders.set(rootFolder.getId(), rootFolder);

  const scriptProperties = new MockProperties(propertiesPath);
  const lock = new MockLock();
  const scriptCache = new MockCache();
  const userCache = new MockCache();
  const documentCache = new MockCache();
  const scriptApp = new MockScriptApp(scriptId);

  const DriveApp = {
    getRootFolder() {
      return rootFolder;
    },
    createFolder(name) {
      const id = generateId();
      const folderPath = path.join(rootPath, name);
      ensureDir(folderPath);
      const folder = new MockFolder({ id, name, folderPath, store });
      store.folders.set(id, folder);
      return folder;
    },
    createFile(name, contents, mimeType) {
      const id = generateId();
      const filePath = path.join(rootPath, name);
      ensureDir(rootPath);
      const fileContent = contents == null ? '' : String(contents);
      fs.writeFileSync(filePath, fileContent);
      const file = new MockFile({
        id,
        name,
        mimeType,
        filePath,
        store
      });
      store.files.set(id, file);
      return file;
    },
    getFolderById(id) {
      const folder = store.folders.get(id);
      if (!folder || folder.trashed) {
        throw new Error(`Folder not found: ${id}`);
      }
      return folder;
    },
    getFileById(id) {
      const file = store.files.get(id);
      if (!file || file.trashed) {
        throw new Error(`File not found: ${id}`);
      }
      return file;
    },
    getFolders() {
      const folders = Array.from(store.folders.values())
        .filter((folder) => !folder.trashed)
        .filter((folder) => folder !== rootFolder);
      return new MockFolderIterator(folders);
    }
  };

  const PropertiesService = {
    getScriptProperties() {
      return scriptProperties;
    }
  };

  const ScriptProperties = {
    getProperty(key) {
      return scriptProperties.getProperty(key);
    },
    setProperty(key, value) {
      return scriptProperties.setProperty(key, value);
    },
    deleteProperty(key) {
      scriptProperties.deleteProperty(key);
    }
  };

  const LockService = {
    getScriptLock() {
      return lock;
    }
  };

  const CacheService = {
    getScriptCache() {
      return scriptCache;
    },
    getUserCache() {
      return userCache;
    },
    getDocumentCache() {
      return documentCache;
    }
  };

  const ScriptApp = {
    getScriptId() {
      return scriptApp.getScriptId();
    },
    newTrigger(functionName) {
      return scriptApp.newTrigger(functionName);
    },
    getProjectTriggers() {
      return scriptApp.getProjectTriggers();
    },
    deleteTrigger(trigger) {
      return scriptApp.deleteTrigger(trigger);
    }
  };

  const Utilities = {
    /**
     * Mock implementation of Utilities.sleep.
     * NOTE: This implementation uses a busy-wait loop that blocks the JavaScript event loop
     * and wastes CPU cycles. While it simulates the blocking behavior of Utilities.sleep(),
     * it's inefficient and could cause issues in test environments. Most tests should not
     * depend on actual timing delays.
     * @param {number} milliseconds - Sleep duration in milliseconds.
     */
    sleep(milliseconds) {
      const start = Date.now();
      while (Date.now() - start < milliseconds) {
        // busy wait
      }
    }
  };

  const Logger = {
    log(data) {
      /* eslint-disable-next-line no-console */
      console.log(data);
    }
  };

  const MimeType = {
    PLAIN_TEXT: 'text/plain',
    JSON: 'application/json'
  };

  return {
    DriveApp,
    PropertiesService,
    ScriptProperties,
    LockService,
    CacheService,
    ScriptApp,
    Utilities,
    Logger,
    MimeType
  };
}

module.exports = {
  createGasMocks
};
