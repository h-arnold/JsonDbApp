# GAS Mock Recorder

These Google Apps Script utilities capture real API behavior into a JSON file so we can build faithful local mocks.

## How to use

1. Create or open a Google Apps Script project linked to this repo.
2. Add `MockRecorder.gs` to the project (or paste the contents into a new script file).
3. Run `createGasMockRecording()`.
4. A JSON file will be written to a `GASDB_Mock_Recordings` folder in your Drive root.

## Output

The recording includes:

- `propertiesService`: Script Properties set/get/delete behavior.
- `driveApp`: Folder/file creation, listing, `getFilesByType`, and trash operations.
- `lockService`: Script lock acquisition and release timings.
- `utilities`: `Utilities.sleep` timing deltas.
- `logger`: Logger invocation confirmation.
- `mimeType`: MIME type constant values.

Use the JSON output as the fixture input for local filesystem-backed mocks.
