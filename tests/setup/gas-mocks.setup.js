import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGasMocks } from '../../tools/gas-mocks/gas-mocks.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageRoot = path.resolve(__dirname, '..');

const gasMocks = createGasMocks({
  driveRoot: path.join(storageRoot, '.gas-drive'),
  propertiesFile: path.join(storageRoot, '.gas-script-properties.json')
});

globalThis.DriveApp = gasMocks.DriveApp;
globalThis.PropertiesService = gasMocks.PropertiesService;
globalThis.ScriptProperties = gasMocks.ScriptProperties;
globalThis.LockService = gasMocks.LockService;
globalThis.Utilities = gasMocks.Utilities;
globalThis.Logger = gasMocks.Logger;
globalThis.MimeType = gasMocks.MimeType;

export { gasMocks };
