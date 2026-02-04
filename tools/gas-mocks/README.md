# GAS Mocks

This directory provides a partial local mock surface for the Google Apps Script APIs used by JsonDbApp tests.

The mocks cover the core subset of APIs needed by most JsonDbApp tests. They provide basic functionality for `DriveApp`, `PropertiesService`, `LockService`, `Utilities`, `Logger`, and `MimeType` constants.

**Note:** The mock implementations have some limitations:

- Lock and sleep operations use busy-wait loops that block the event loop and won't properly simulate concurrent behaviour in single-threaded Node.js.
- The mocks are suitable for single-threaded sequential test scenarios but won't simulate true concurrent lock contention.

DriveApp provides a singleton root folder via `getRootFolder()`, and `Folder.getId()` returns the mock folder identifier so tests can resolve it via `DriveApp.getFolderById()`.

## Files

- `plan.md`: method signatures + data shapes mapped from GAS reference docs.
- `gas-mocks.cjs`: Node-based mock implementations + stubs aligned to the plan (CommonJS module).

## Usage

```js
const { createGasMocks } = require('./tools/gas-mocks/gas-mocks.cjs');
const mocks = createGasMocks();

global.DriveApp = mocks.DriveApp;
global.PropertiesService = mocks.PropertiesService;
global.ScriptProperties = mocks.ScriptProperties;
global.LockService = mocks.LockService;
global.Utilities = mocks.Utilities;
global.Logger = mocks.Logger;
global.MimeType = mocks.MimeType;
```

Configure optional paths:

```js
const mocks = createGasMocks({
  driveRoot: '/tmp/gasdb-drive',
  propertiesFile: '/tmp/gasdb-script-properties.json'
});
```
