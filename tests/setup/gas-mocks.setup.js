import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createGasMocks } from '../../tools/gas-mocks/gas-mocks.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '..', '..');

const legacyScripts = [
  'src/01_utils/ErrorHandler.js',
  'src/01_utils/Validation.js',
  'src/01_utils/JDbLogger.js',
  'src/01_utils/IdGenerator.js',
  'src/01_utils/ComparisonUtils.js',
  'src/04_core/DatabaseConfig.js',
  'src/01_utils/ObjectUtils.js',
  'src/03_services/DbLockService.js',
  'src/02_components/CollectionMetadata.js',
  'src/04_core/MasterIndex.js',
  'src/02_components/FileOperations.js',
  'src/03_services/FileService.js',
  'src/02_components/DocumentOperations.js',
  'src/02_components/QueryEngine.js',
  'src/02_components/UpdateEngine.js',
  'src/02_components/CollectionCoordinator.js',
  'src/04_core/Collection/01_CollectionReadOperations.js',
  'src/04_core/Collection/02_CollectionWriteOperations.js',
  'src/04_core/Collection/99_Collection.js'
];

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
