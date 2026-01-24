/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_ROOT = path.join(os.tmpdir(), 'gasdb-drive');
const DEFAULT_PROPERTIES_FILE = path.join(os.tmpdir(), 'gasdb-script-properties.json');

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
  if (!raw) {
    return fallback;
  }
  return JSON.parse(raw);
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

  setTrashed(trashed) {
    this.trashed = Boolean(trashed);
    this.store.folders.set(this.id, this);
  }

  createFile(name, contents, mimeType) {
    const id = generateId();
    const filePath = path.join(this.folderPath, name);
    ensureDir(this.folderPath);
    fs.writeFileSync(filePath, contents);
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
      .filter(file => file.filePath.startsWith(this.folderPath))
      .filter(file => !file.trashed);
    return new MockFileIterator(files);
  }

  getFilesByType(mimeType) {
    const files = Array.from(this.store.files.values())
      .filter(file => file.filePath.startsWith(this.folderPath))
      .filter(file => !file.trashed)
      .filter(file => file.mimeType === mimeType);
    return new MockFileIterator(files);
  }

  getFoldersByName(name) {
    const folders = Array.from(this.store.folders.values())
      .filter(folder => !folder.trashed)
      .filter(folder => folder.name === name);
    return new MockFolderIterator(folders);
  }
}

class MockProperties {
  constructor(filePath) {
    this.filePath = filePath;
    this.cache = readJson(filePath, {});
  }

  getProperty(key) {
    return this.cache[key] || null;
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
  constructor() {
    this.locked = false;
  }

  waitLock(timeoutInMillis) {
    const start = Date.now();
    while (this.locked) {
      if (Date.now() - start > timeoutInMillis) {
        throw new Error('Lock wait timeout');
      }
    }
    this.locked = true;
  }

  releaseLock() {
    this.locked = false;
  }
}

function createGasMocks(options = {}) {
  const rootPath = options.driveRoot || DEFAULT_ROOT;
  const propertiesPath = options.propertiesFile || DEFAULT_PROPERTIES_FILE;
  ensureDir(rootPath);

  const store = {
    files: new Map(),
    folders: new Map()
  };

  const rootFolder = new MockFolder({
    id: generateId(),
    name: 'root',
    folderPath: rootPath,
    store
  });
  store.folders.set(rootFolder.getId(), rootFolder);

  const scriptProperties = new MockProperties(propertiesPath);
  const lock = new MockLock();

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
        .filter(folder => !folder.trashed)
        .filter(folder => folder !== rootFolder);
      return new MockFolderIterator(folders);
    }
  };

  const PropertiesService = {
    getScriptProperties() {
      return scriptProperties;
    }
  };

  const ScriptProperties = {
    deleteProperty(key) {
      scriptProperties.deleteProperty(key);
    }
  };

  const LockService = {
    getScriptLock() {
      return lock;
    }
  };

  const Utilities = {
    sleep(milliseconds) {
      const start = Date.now();
      while (Date.now() - start < milliseconds) {
        // busy wait
      }
    }
  };

  const Logger = {
    log(data) {
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
    Utilities,
    Logger,
    MimeType
  };
}

module.exports = {
  createGasMocks
};
