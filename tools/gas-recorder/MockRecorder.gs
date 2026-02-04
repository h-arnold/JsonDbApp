/**
 * MockRecorder.gs
 *
 * Records real Google Apps Script API behavior to JSON for local mocks.
 * Run createGasMockRecording() in a GAS project.
 */

function createGasMockRecording() {
  var now = new Date();
  var timestamp = now.toISOString().replace(/[:.]/g, '-');
  var record = {
    meta: {
      generatedAt: now.toISOString(),
      timezone: Session.getScriptTimeZone(),
      scriptId: ScriptApp.getScriptId()
    },
    propertiesService: recordPropertiesService(),
    driveApp: recordDriveApp(),
    lockService: recordLockService(),
    utilities: recordUtilities(),
    logger: recordLogger(),
    mimeType: recordMimeType()
  };

  var output = JSON.stringify(record, null, 2);
  var folder = ensureRecordingFolder_();
  var fileName = 'gas-api-recording-' + timestamp + '.json';
  var file = folder.createFile(fileName, output, MimeType.PLAIN_TEXT);

  Logger.log('Mock recording written: ' + file.getId());
  return file.getId();
}

/**
 * Records DriveApp.getRootFolder() and Folder.getId() output to JSON.
 * @returns {string} Drive file ID of the snapshot file.
 */
function recordRootFolderSnapshot() {
  var now = new Date();
  var timestamp = now.toISOString().replace(/[:.]/g, '-');
  var root = DriveApp.getRootFolder();
  var snapshot = {
    meta: {
      generatedAt: now.toISOString(),
      timezone: Session.getScriptTimeZone(),
      scriptId: ScriptApp.getScriptId()
    },
    rootFolder: {
      id: root.getId(),
      name: root.getName()
    }
  };

  var output = JSON.stringify(snapshot, null, 2);
  var folder = ensureRecordingFolder_();
  var fileName = 'gas-root-folder-snapshot-' + timestamp + '.json';
  var file = folder.createFile(fileName, output, MimeType.PLAIN_TEXT);

  Logger.log('Root folder snapshot written: ' + file.getId());
  return file.getId();
}

function recordPropertiesService() {
  var props = PropertiesService.getScriptProperties();
  var testKey = 'GASDB_MOCK_RECORD_PROPERTIES_' + new Date().getTime();
  var initial = props.getProperty(testKey);
  props.setProperty(testKey, 'value-1');
  var afterSet = props.getProperty(testKey);
  props.setProperty(testKey, 'value-2');
  var afterUpdate = props.getProperty(testKey);
  props.deleteProperty(testKey);
  var afterDelete = props.getProperty(testKey);

  return {
    testKey: testKey,
    initial: initial,
    afterSet: afterSet,
    afterUpdate: afterUpdate,
    afterDelete: afterDelete
  };
}

function recordDriveApp() {
  var root = DriveApp.getRootFolder();
  var folderName = 'GASDB_Mock_Record_' + new Date().getTime();
  var folder = DriveApp.createFolder(folderName);

  var fileName = 'mock-data.json';
  var payload = JSON.stringify({ ok: true, createdAt: new Date().toISOString() }, null, 2);
  var file = folder.createFile(fileName, payload, 'application/json');

  var fileById = DriveApp.getFileById(file.getId());
  var folderById = DriveApp.getFolderById(folder.getId());

  // Capture file content methods
  var blob = fileById.getBlob();
  var blobContent = blob.getDataAsString();
  var blobContentType = blob.getContentType();

  // Capture file metadata methods
  var fileSize = fileById.getSize();
  var fileLastUpdated = fileById.getLastUpdated();
  var fileDateCreated = fileById.getDateCreated();
  var fileIsTrashed = fileById.isTrashed();

  // Update file content
  var updatedContent = JSON.stringify({ ok: true, updatedAt: new Date().toISOString() }, null, 2);
  fileById.setContent(updatedContent);
  var contentAfterSet = fileById.getBlob().getDataAsString();

  var filesIterator = folderById.getFiles();
  var files = [];
  while (filesIterator.hasNext()) {
    var nextFile = filesIterator.next();
    files.push({
      id: nextFile.getId(),
      name: nextFile.getName(),
      mimeType: nextFile.getMimeType()
    });
  }

  var textFilesIterator = folderById.getFilesByType(MimeType.PLAIN_TEXT);
  var textFiles = [];
  while (textFilesIterator.hasNext()) {
    var textFile = textFilesIterator.next();
    textFiles.push({
      id: textFile.getId(),
      name: textFile.getName(),
      mimeType: textFile.getMimeType()
    });
  }

  fileById.setTrashed(true);
  var isTrashedAfterSet = fileById.isTrashed();
  folderById.setTrashed(true);

  return {
    rootFolder: {
      id: root.getId(),
      name: root.getName()
    },
    createdFolder: {
      id: folder.getId(),
      name: folderName
    },
    createdFile: {
      id: file.getId(),
      name: fileName,
      mimeType: file.getMimeType()
    },
    getFileById: {
      id: fileById.getId(),
      name: fileById.getName()
    },
    fileBlob: {
      content: blobContent,
      contentType: blobContentType
    },
    fileMetadata: {
      size: fileSize,
      lastUpdated: fileLastUpdated ? fileLastUpdated.toISOString() : null,
      dateCreated: fileDateCreated ? fileDateCreated.toISOString() : null,
      isTrashed: fileIsTrashed
    },
    setContent: {
      original: payload,
      updated: contentAfterSet
    },
    setTrashed: {
      isTrashedAfterSet: isTrashedAfterSet
    },
    listFiles: files,
    listTextFiles: textFiles
  };
}

function recordLockService() {
  var lock = LockService.getScriptLock();
  var start = new Date().toISOString();
  lock.waitLock(10000);
  var acquired = new Date().toISOString();
  lock.releaseLock();
  var released = new Date().toISOString();

  return {
    waitedAt: start,
    acquiredAt: acquired,
    releasedAt: released
  };
}

function recordUtilities() {
  var before = new Date().getTime();
  Utilities.sleep(10);
  var after = new Date().getTime();

  return {
    sleepRequestedMs: 10,
    before: before,
    after: after,
    delta: after - before
  };
}

function recordLogger() {
  Logger.log('Mock recorder Logger.log() test');
  return {
    logged: true
  };
}

function recordMimeType() {
  return {
    plainText: MimeType.PLAIN_TEXT,
    json: MimeType.JSON
  };
}

function ensureRecordingFolder_() {
  var root = DriveApp.getRootFolder();
  var folders = root.getFoldersByName('GASDB_Mock_Recordings');
  if (folders.hasNext()) {
    return folders.next();
  }
  return root.createFolder('GASDB_Mock_Recordings');
}
