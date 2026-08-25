import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGasMocks } from '../../tools/gas-mocks/gas-mocks.cjs';
import { assignGlobalServices, loadLegacyScript } from '../../tools/gas-mocks/legacy-boot.cjs';
import { legacyScripts } from '../../tools/gas-mocks/script-order.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageRoot = path.resolve(__dirname, '..');

const gasMocks = createGasMocks({
  driveRoot: path.join(storageRoot, '.gas-drive'),
  propertiesFile: path.join(storageRoot, '.gas-script-properties.json')
});

if (!globalThis.__jsonDbAppLegacyLoaded) {
  legacyScripts.forEach(loadLegacyScript);
  globalThis.__jsonDbAppLegacyLoaded = true;
}

assignGlobalServices(gasMocks);

export { gasMocks };
