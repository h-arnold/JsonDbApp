# GAS Mocks

This directory provides a faithful local mock surface for the Google Apps Script APIs used by JsonDbApp tests.

## Files

- `plan.md`: method signatures + data shapes mapped from GAS reference docs.
- `gas-mocks.js`: Node-based mock implementations + stubs aligned to the plan.

## Usage

```js
const { createGasMocks } = require('./tools/gas-mocks/gas-mocks');
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
