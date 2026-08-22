import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createGasMocks } from '../../tools/gas-mocks/gas-mocks.cjs';
import { legacyScripts } from '../../tools/gas-mocks/script-order.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '..', '..');

/**
 * Loads a legacy script into the current context
 * @param {string} relativePath - Path to the script relative to the repository root
 */
function loadLegacyScript(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  vm.runInThisContext(source, { filename: absolutePath });
}

const gasMocks = createGasMocks({
  driveRoot: path.join(storageRoot, '.gas-drive'),
  propertiesFile: path.join(storageRoot, '.gas-script-properties.json')
});

if (!globalThis.__jsonDbAppLegacyLoaded) {
  legacyScripts.forEach(loadLegacyScript);
  globalThis.__jsonDbAppLegacyLoaded = true;
}

globalThis.DriveApp = gasMocks.DriveApp;
globalThis.PropertiesService = gasMocks.PropertiesService;
globalThis.ScriptProperties = gasMocks.ScriptProperties;
globalThis.LockService = gasMocks.LockService;
globalThis.Utilities = gasMocks.Utilities;
globalThis.Logger = gasMocks.Logger;
globalThis.MimeType = gasMocks.MimeType;

export { gasMocks };
