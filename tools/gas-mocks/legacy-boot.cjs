/**
 * legacy-boot.cjs - Shared legacy-script loader and GAS service publisher.
 *
 * Single source of truth for booting the classic-script src surface over the mocked GAS
 * services. Consumed by tests/setup/gas-mocks.setup.js and tools/benchmarks/bench.cjs so
 * the loader implementation and the published service set cannot drift apart. The load
 * ORDER itself lives in script-order.cjs.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/** Repository root; every legacy script path is resolved relative to it. */
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Loads one legacy src script into the current context as a classic script, exactly as the
 * GAS runtime would.
 * @param {string} relativePath - Path to the script relative to the repository root.
 * @returns {void}
 * @throws {Error} When the script cannot be read or parsed (fail fast).
 */
function loadLegacyScript(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  vm.runInThisContext(source, { filename: absolutePath });
}

/**
 * Publishes every mocked GAS service in the bundle onto globalThis under its own name.
 * @param {Object} gasMocks - Mock service bundle returned by `createGasMocks`.
 * @returns {void}
 * @remarks The bundle's own keys drive publication, so a service added to `createGasMocks`
 *   is picked up by every consumer automatically instead of via a hand-copied name list.
 */
function assignGlobalServices(gasMocks) {
  for (const serviceName of Object.keys(gasMocks)) {
    globalThis[serviceName] = gasMocks[serviceName];
  }
}

module.exports = {
  loadLegacyScript,
  assignGlobalServices
};
