# GAS API Mock Plan (Method Signatures + Data Shapes)

This plan summarizes the Google Apps Script reference signatures for the APIs exercised by JsonDbApp tests and maps them to the mock surface area.

## DriveApp
**Docs:** https://developers.google.com/apps-script/reference/drive/drive-app

| Method | Signature (per docs) | Mock notes |
| --- | --- | --- |
| `getRootFolder` | `DriveApp.getRootFolder(): Folder` | Return singleton root folder. |
| `createFolder` | `DriveApp.createFolder(name: String): Folder` | Create a folder under root. |
| `createFile` | `DriveApp.createFile(name: String, content: String, mimeType: String): File` | Create a file in root folder. |
| `getFolderById` | `DriveApp.getFolderById(id: String): Folder` | Lookup by ID; throw if missing. |
| `getFileById` | `DriveApp.getFileById(id: String): File` | Lookup by ID; throw if missing. |
| `getFolders` | `DriveApp.getFolders(): FolderIterator` | Iterate folders under root. |

### Folder
**Docs:** https://developers.google.com/apps-script/reference/drive/folder

| Method | Signature | Mock notes |
| --- | --- | --- |
| `getId` | `Folder.getId(): String` | Return stable ID. |
| `getName` | `Folder.getName(): String` | Return folder name. |
| `createFile` | `Folder.createFile(name: String, content: String, mimeType: String): File` | Write JSON/text content to local disk. |
| `getFiles` | `Folder.getFiles(): FileIterator` | Iterate files in folder. |
| `getFilesByType` | `Folder.getFilesByType(mimeType: String): FileIterator` | Filter by MIME. |
| `getFoldersByName` | `Folder.getFoldersByName(name: String): FolderIterator` | Used by recorder; return matches. |
| `setTrashed` | `Folder.setTrashed(trashed: Boolean): void` | Mark folder as deleted; keep but exclude from list. |

### File
**Docs:** https://developers.google.com/apps-script/reference/drive/file

| Method | Signature | Mock notes |
| --- | --- | --- |
| `getId` | `File.getId(): String` | Return stable ID. |
| `getName` | `File.getName(): String` | Return file name. |
| `getMimeType` | `File.getMimeType(): String` | Return MIME type string. |
| `getBlob` | `File.getBlob(): Blob` | Return Blob object with `getDataAsString()` and `getContentType()`. |
| `setContent` | `File.setContent(content: String): File` | Update file contents; returns file for chaining. |
| `isTrashed` | `File.isTrashed(): Boolean` | Return true if file is trashed. |
| `getSize` | `File.getSize(): Integer` | Return file size in bytes. |
| `getLastUpdated` | `File.getLastUpdated(): Date` | Return last modified date. |
| `getDateCreated` | `File.getDateCreated(): Date` | Return creation date. |
| `setTrashed` | `File.setTrashed(trashed: Boolean): void` | Mark file as deleted. |

### Iterators
**Docs:**
- FileIterator: https://developers.google.com/apps-script/reference/drive/file-iterator
- FolderIterator: https://developers.google.com/apps-script/reference/drive/folder-iterator

| Method | Signature | Mock notes |
| --- | --- | --- |
| `hasNext` | `FileIterator.hasNext(): Boolean` / `FolderIterator.hasNext(): Boolean` | Boolean whether more items exist. |
| `next` | `FileIterator.next(): File` / `FolderIterator.next(): Folder` | Return next item, throw if empty. |

## PropertiesService + Properties
**Docs:**
- PropertiesService: https://developers.google.com/apps-script/reference/properties/properties-service
- Properties: https://developers.google.com/apps-script/reference/properties/properties

| Method | Signature | Mock notes |
| --- | --- | --- |
| `getScriptProperties` | `PropertiesService.getScriptProperties(): Properties` | Singleton store backed by JSON. |
| `getProperty` | `Properties.getProperty(key: String): String` | Return value or `null`. |
| `setProperty` | `Properties.setProperty(key: String, value: String): Properties` | Store string values. |
| `deleteProperty` | `Properties.deleteProperty(key: String): void` | Remove key. |

## LockService + Lock
**Docs:**
- LockService: https://developers.google.com/apps-script/reference/lock/lock-service
- Lock: https://developers.google.com/apps-script/reference/lock/lock

| Method | Signature | Mock notes |
| --- | --- | --- |
| `getScriptLock` | `LockService.getScriptLock(): Lock` | Return singleton lock. |
| `waitLock` | `Lock.waitLock(timeoutInMillis: Integer): void` | Acquire lock or throw on timeout. |
| `releaseLock` | `Lock.releaseLock(): void` | Release lock; no-op if not held. |

## Utilities
**Docs:** https://developers.google.com/apps-script/reference/utilities/utilities

| Method | Signature | Mock notes |
| --- | --- | --- |
| `sleep` | `Utilities.sleep(milliseconds: Integer): void` | Use blocking sleep or simulated delay. |

## Logger
**Docs:** https://developers.google.com/apps-script/reference/base/logger

| Method | Signature | Mock notes |
| --- | --- | --- |
| `log` | `Logger.log(data: Object): void` | Forward to console. |

## MimeType
**Docs:** https://developers.google.com/apps-script/reference/base/mime-type

| Constant | Value (per docs) | Mock notes |
| --- | --- | --- |
| `PLAIN_TEXT` | `"text/plain"` | Used for index files. |
| `JSON` | `"application/json"` | Used for JSON fixtures. |

## Expected Data Shapes

- **Folder**: `{ id: string, name: string, trashed: boolean }`
- **File**: `{ id: string, name: string, mimeType: string, trashed: boolean }`
  - Note: Mocks may maintain additional internal fields (e.g. `filePath` or raw `contents`) that are not part of the public GAS `File` API. File content should be accessed via `file.getBlob().getDataAsString()`.
- **Properties**: `{ [key: string]: string }`
- **Iterators**: `{ hasNext(): boolean, next(): File | Folder }`
- **Lock**: `{ waitLock(timeout: number): void, releaseLock(): void }`
