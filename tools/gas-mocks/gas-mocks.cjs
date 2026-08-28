const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_ROOT = path.join(os.tmpdir(), 'gasdb-drive');
const DEFAULT_PROPERTIES_FILE = path.join(os.tmpdir(), 'gasdb-script-properties.json');
const JSON_INDENT_SPACES = 2;

let nextId = 1;

/**
 * Generates a unique mock identifier combining a timestamp with a monotonically
 * increasing counter so concurrent mock sessions never collide.
 * @returns {string} A unique mock identifier.
 */
function generateId() {
  const id = `mock-${Date.now()}-${nextId}`;
  nextId += 1;
  return id;
}

/**
 * Ensures the directory at the given path exists, creating it recursively when absent.
 * @param {string} dirPath - Absolute directory path to ensure.
 * @returns {void}
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Reads and parses a JSON file, returning a fallback value when the file is missing or
 * contains invalid JSON.
 * @param {string} filePath - Path of the JSON file to read.
 * @param {*} fallback - Value returned when the file is absent or unparseable.
 * @returns {*} Parsed JSON content, or the fallback value.
 */
function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Invalid JSON in file — return fallback.
    console.warn('Failed to parse JSON file:', err?.message ?? err);
    return fallback;
  }
}

/**
 * Serialises data to JSON and writes it to disk, creating parent directories as needed.
 * @param {string} filePath - Destination file path.
 * @param {*} data - Data to serialise and persist.
 * @returns {void}
 */
function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, JSON_INDENT_SPACES));
}

/**
 * Iterates over a snapshot of mock files or folders, exposing a hasNext/next cursor.
 * @param {Array<Object>} items - Items to iterate; copied so later mutations do not affect iteration.
 */
class MockFileIterator {
  /**
   * Creates an iterator over a snapshot of items.
   * @param {Array<Object>} items - Items to iterate; copied so later mutations do not affect iteration.
   */
  constructor(items) {
    this.items = items.slice();
  }

  /**
   * Reports whether further items remain to be consumed.
   * @returns {boolean} True when at least one item is pending.
   */
  hasNext() {
    return this.items.length > 0;
  }

  /**
   * Returns the next item, throwing when the iteration is exhausted.
   * @returns {Object} The next item in the sequence.
   * @throws {Error} When no further items remain.
   */
  next() {
    if (!this.hasNext()) {
      throw new Error('No more files');
    }
    return this.items.shift();
  }
}

/**
 * Iterates over a snapshot of mock folders, exposing a hasNext/next cursor.
 * @param {Array<Object>} items - Folders to iterate; copied so later mutations do not affect iteration.
 */
class MockFolderIterator {
  /**
   * Creates an iterator over a snapshot of folders.
   * @param {Array<Object>} items - Folders to iterate; copied so later mutations do not affect iteration.
   */
  constructor(items) {
    this.items = items.slice();
  }

  /**
   * Reports whether further folders remain to be consumed.
   * @returns {boolean} True when at least one folder is pending.
   */
  hasNext() {
    return this.items.length > 0;
  }

  /**
   * Returns the next folder, throwing when the iteration is exhausted.
   * @returns {Object} The next folder in the sequence.
   * @throws {Error} When no further folders remain.
   */
  next() {
    if (!this.hasNext()) {
      throw new Error('No more folders');
    }
    return this.items.shift();
  }
}

/**
 * In-memory representation of a Drive file backed by on-disk content for blob reads.
 * @param {Object} params - Construction parameters.
 * @param {string} params.id - Unique file identifier.
 * @param {string} params.name - File name.
 * @param {string} params.mimeType - MIME type of the file content.
 * @param {string} params.filePath - Absolute on-disk path holding the file content.
 * @param {Object} params.store - Shared mock store holding file and folder maps.
 */
class MockFile {
  /**
   * Constructs an in-memory file representation.
   * @param {Object} params - Construction parameters.
   * @param {string} params.id - Unique file identifier.
   * @param {string} params.name - File name.
   * @param {string} params.mimeType - MIME type of the file content.
   * @param {string} params.filePath - Absolute on-disk path holding the file content.
   * @param {Object} params.store - Shared mock store holding file and folder maps.
   */
  constructor({ id, name, mimeType, filePath, store }) {
    this.id = id;
    this.name = name;
    this.mimeType = mimeType;
    this.filePath = filePath;
    this.store = store;
    this.trashed = false;
  }

  /**
   * Returns the file's unique identifier.
   * @returns {string} The file identifier.
   */
  getId() {
    return this.id;
  }

  /**
   * Returns the file name.
   * @returns {string} The file name.
   */
  getName() {
    return this.name;
  }

  /**
   * Returns the file MIME type.
   * @returns {string} The MIME type.
   */
  getMimeType() {
    return this.mimeType;
  }

  /**
   * Returns a minimal serialisable view of the file.
   * @returns {Object} Empty object placeholder for serialisation symmetry.
   */
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
      /**
       * Reads the backing file content as a string.
       * @returns {string} File content, or an empty string when the backing file is absent.
       */
      getDataAsString() {
        if (!fs.existsSync(filePath)) {
          return '';
        }
        return fs.readFileSync(filePath, 'utf8');
      },
      /**
       * Returns the MIME type of the blob.
       * @returns {string} The blob MIME type.
       */
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
    const fileContent = content === null || content === undefined ? '' : String(content);
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
   * @returns {number} File size, or zero when the backing content is absent.
   */
  getSize() {
    if (fs.existsSync(this.filePath)) {
      return fs.statSync(this.filePath).size;
    }
    return 0;
  }

  /**
   * Returns the last modified date.
   * @returns {Date} Last modified date, or the current time when content is absent.
   */
  getLastUpdated() {
    if (fs.existsSync(this.filePath)) {
      return fs.statSync(this.filePath).mtime;
    }
    return new Date();
  }

  /**
   * Returns the creation date.
   * @returns {Date} Creation date, or the current time when content is absent.
   */
  getDateCreated() {
    if (fs.existsSync(this.filePath)) {
      return fs.statSync(this.filePath).birthtime;
    }
    return new Date();
  }

  /**
   * Marks the file as trashed (or un-trashed) and persists the change in the store.
   * @param {boolean} trashed - Whether the file should be trashed.
   * @returns {void}
   */
  setTrashed(trashed) {
    this.trashed = Boolean(trashed);
    this.store.files.set(this.id, this);
  }
}

/**
 * In-memory representation of a Drive folder holding files and sub-folders.
 * @param {Object} params - Construction parameters.
 * @param {string} params.id - Unique folder identifier.
 * @param {string} params.name - Folder name.
 * @param {string} params.folderPath - Absolute on-disk path backing the folder.
 * @param {Object} params.store - Shared mock store holding file and folder maps.
 */
class MockFolder {
  /**
   * Constructs an in-memory folder representation.
   * @param {Object} params - Construction parameters.
   * @param {string} params.id - Unique folder identifier.
   * @param {string} params.name - Folder name.
   * @param {string} params.folderPath - Absolute on-disk path backing the folder.
   * @param {Object} params.store - Shared mock store holding file and folder maps.
   */
  constructor({ id, name, folderPath, store }) {
    this.id = id;
    this.name = name;
    this.folderPath = folderPath;
    this.store = store;
    this.trashed = false;
  }

  /**
   * Returns the folder's unique identifier.
   * @returns {string} The folder identifier.
   */
  getId() {
    return this.id;
  }

  /**
   * Returns the folder name.
   * @returns {string} The folder name.
   */
  getName() {
    return this.name;
  }

  /**
   * Returns a minimal serialisable view of the folder.
   * @returns {Object} Empty object placeholder for serialisation symmetry.
   */
  toJSON() {
    return {};
  }

  /**
   * Marks the folder as trashed (or un-trashed) and persists the change in the store.
   * @param {boolean} trashed - Whether the folder should be trashed.
   * @returns {void}
   */
  setTrashed(trashed) {
    this.trashed = Boolean(trashed);
    this.store.folders.set(this.id, this);
  }

  /**
   * Creates a new file within this folder and registers it in the shared store.
   * @param {string} name - Name of the file to create.
   * @param {string} contents - Initial file contents.
   * @param {string} mimeType - MIME type of the new file.
   * @returns {MockFile} The created file.
   */
  createFile(name, contents, mimeType) {
    const id = generateId();
    const filePath = path.join(this.folderPath, name);
    ensureDir(this.folderPath);
    const fileContent = contents === null || contents === undefined ? '' : String(contents);
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

  /**
   * Returns an iterator over the non-trashed files directly within this folder.
   * @returns {MockFileIterator} Iterator of files in this folder.
   */
  getFiles() {
    const files = Array.from(this.store.files.values())
      .filter((file) => path.dirname(file.filePath) === this.folderPath)
      .filter((file) => !file.trashed);
    return new MockFileIterator(files);
  }

  /**
   * Returns an iterator over the non-trashed files of a given MIME type within this folder.
   * @param {string} mimeType - MIME type to filter by.
   * @returns {MockFileIterator} Iterator of matching files in this folder.
   */
  getFilesByType(mimeType) {
    const files = Array.from(this.store.files.values())
      .filter((file) => path.dirname(file.filePath) === this.folderPath)
      .filter((file) => !file.trashed)
      .filter((file) => file.mimeType === mimeType);
    return new MockFileIterator(files);
  }

  /**
   * Returns an iterator over the non-trashed folders sharing the given name.
   * @param {string} name - Folder name to match.
   * @returns {MockFolderIterator} Iterator of matching folders.
   */
  getFoldersByName(name) {
    const folders = Array.from(this.store.folders.values())
      .filter((folder) => !folder.trashed)
      .filter((folder) => folder.name === name);
    return new MockFolderIterator(folders);
  }
}

/**
 * Mock implementation of Apps Script script properties backed by a JSON file.
 * @param {string} filePath - Path of the JSON file backing the properties store.
 */
class MockProperties {
  /**
   * Constructs a mock script-properties store backed by a JSON file.
   * @param {string} filePath - Path of the JSON file backing the properties store.
   */
  constructor(filePath) {
    this.filePath = filePath;
    this.cache = readJson(filePath, {});
  }

  /**
   * Returns the property value for a key, or null when the key is absent.
   * @param {string} key - Property key to read.
   * @returns {*} The stored property value, or null when absent.
   */
  getProperty(key) {
    return Object.hasOwn(this.cache, key) ? this.cache[key] : null;
  }

  /**
   * Sets a property value, coercing it to a string, and persists the store.
   * @param {string} key - Property key to write.
   * @param {*} value - Value to store (coerced to a string).
   * @returns {MockProperties} This store, for chaining.
   */
  setProperty(key, value) {
    this.cache[key] = String(value);
    writeJson(this.filePath, this.cache);
    return this;
  }

  /**
   * Deletes a property and persists the updated store.
   * @param {string} key - Property key to delete.
   * @returns {void}
   */
  deleteProperty(key) {
    delete this.cache[key];
    writeJson(this.filePath, this.cache);
  }
}

/**
 * Mock implementation of the Apps Script script lock with single-threaded re-entrancy
 * tracking. NOTE: this does not simulate true concurrent lock contention.
 */
class MockLock {
  locked = false;
  recursion = 0;

  /**
   * Acquires the lock or throws on timeout.
   * NOTE: This implementation uses a busy-wait loop that blocks the JavaScript event loop.
   * In single-threaded Node.js, this won't properly simulate concurrent lock contention
   * like the real GAS LockService does. This mock is suitable for single-threaded
   * sequential test scenarios but won't simulate true concurrent lock behaviour.
   * @param {number} timeoutInMillis - Maximum time to wait in milliseconds.
   * @throws {Error} When the timeout is reached before the lock is available.
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

  /**
   * Releases one level of lock acquisition, clearing the lock only when fully released.
   * @returns {void}
   */
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

/**
 * Builds a fresh set of mock GAS services (DriveApp, PropertiesService, ScriptProperties,
 * LockService, Utilities, Logger, MimeType) backed by on-disk temporary storage.
 * @param {Object} [options={}] - Override options for the mock environment.
 * @param {string} [options.driveRoot] - Root directory for mock Drive content.
 * @param {string} [options.propertiesFile] - Path for the mock script-properties file.
 * @returns {Object} The assembled mock service bundle.
 */
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
    name: 'My Drive',
    folderPath: rootPath,
    store
  });
  store.folders.set(rootFolder.getId(), rootFolder);

  const scriptProperties = new MockProperties(propertiesPath);
  const lock = new MockLock();

  const DriveApp = {
    /**
     * Returns the mock root folder.
     * @returns {MockFolder} The root folder.
     */
    getRootFolder() {
      return rootFolder;
    },
    /**
     * Creates a folder within the mock Drive root and registers it in the store.
     * @param {string} name - Folder name to create.
     * @returns {MockFolder} The created folder.
     */
    createFolder(name) {
      const id = generateId();
      const folderPath = path.join(rootPath, name);
      ensureDir(folderPath);
      const folder = new MockFolder({ id, name, folderPath, store });
      store.folders.set(id, folder);
      return folder;
    },
    /**
     * Creates a file within the mock Drive root and registers it in the store.
     * @param {string} name - File name to create.
     * @param {string} contents - Initial file contents.
     * @param {string} mimeType - MIME type of the new file.
     * @returns {MockFile} The created file.
     */
    createFile(name, contents, mimeType) {
      const id = generateId();
      const filePath = path.join(rootPath, name);
      ensureDir(rootPath);
      const fileContent = contents === null || contents === undefined ? '' : String(contents);
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
    /**
     * Returns the folder with the given identifier.
     * @param {string} id - Folder identifier to look up.
     * @returns {MockFolder} The matching folder.
     * @throws {Error} When the folder is absent or trashed.
     */
    getFolderById(id) {
      const folder = store.folders.get(id);
      if (!folder || folder.trashed) {
        throw new Error(`Folder not found: ${id}`);
      }
      return folder;
    },
    /**
     * Returns the file with the given identifier.
     * @param {string} id - File identifier to look up.
     * @returns {MockFile} The matching file.
     * @throws {Error} When the file is absent or trashed.
     */
    getFileById(id) {
      const file = store.files.get(id);
      if (!file || file.trashed) {
        throw new Error(`File not found: ${id}`);
      }
      return file;
    },
    /**
     * Returns an iterator over all non-trashed folders except the root.
     * @returns {MockFolderIterator} Iterator of child folders.
     */
    getFolders() {
      const folders = Array.from(store.folders.values())
        .filter((folder) => !folder.trashed)
        .filter((folder) => folder !== rootFolder);
      return new MockFolderIterator(folders);
    }
  };

  const PropertiesService = {
    /**
     * Returns the mock script properties instance.
     * @returns {MockProperties} The script properties store.
     */
    getScriptProperties() {
      return scriptProperties;
    }
  };

  const ScriptProperties = {
    /**
     * Reads a script property by key.
     * @param {string} key - Property key to read.
     * @returns {*} The stored value, or null when absent.
     */
    getProperty(key) {
      return scriptProperties.getProperty(key);
    },
    /**
     * Writes a script property value.
     * @param {string} key - Property key to write.
     * @param {*} value - Value to store.
     * @returns {*} The result of the underlying property write.
     */
    setProperty(key, value) {
      return scriptProperties.setProperty(key, value);
    },
    /**
     * Deletes a script property.
     * @param {string} key - Property key to delete.
     * @returns {void}
     */
    deleteProperty(key) {
      scriptProperties.deleteProperty(key);
    }
  };

  const LockService = {
    /**
     * Returns the shared mock script lock.
     * @returns {MockLock} The script lock instance.
     */
    getScriptLock() {
      return lock;
    }
  };

  const Utilities = {
    /**
     * Mock implementation of Utilities.sleep.
     * NOTE: This implementation uses a busy-wait loop that blocks the JavaScript event loop
     * and wastes CPU cycles. While it simulates the blocking behaviour of Utilities.sleep(),
     * it's inefficient and could cause issues in test environments. Most tests should not
     * depend on actual timing delays.
     * @param {number} milliseconds - Sleep duration in milliseconds.
     * @returns {void}
     */
    sleep(milliseconds) {
      const start = Date.now();
      while (Date.now() - start < milliseconds) {
        // busy wait
      }
    }
  };

  const Logger = {
    /**
     * Writes data to the console for test inspection.
     * @param {*} data - Data to log.
     * @returns {void}
     */
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
