/**
 * legacy-boot.test.js - Vitest tests for tools/gas-mocks/legacy-boot.cjs
 *
 * Verifies the shared boot plumbing consumed by both the Vitest setup file and the benchmark
 * harness: the legacy-script loader (including its fail-fast contract) and the GAS service
 * publisher driven by the mock bundle's own keys, so consumers cannot drift when services
 * change.
 */

import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { assignGlobalServices, loadLegacyScript } from '../../../tools/gas-mocks/legacy-boot.cjs';
import { createGasMocks } from '../../../tools/gas-mocks/gas-mocks.cjs';

/** Service names injected onto globalThis by tests and removed again afterwards. */
const injectedGlobalNames = [];

afterEach(() => {
  // Cleanup: never leak synthetic services into other suites sharing the runtime
  for (const name of injectedGlobalNames.splice(0)) {
    delete globalThis[name];
  }
});

describe('tools/gas-mocks/legacy-boot.cjs', () => {
  describe('assignGlobalServices', () => {
    /**
     * Publishes a service name through the helper and registers it for cleanup.
     * @param {Object} bundle - Bundle whose keys are published.
     * @returns {string[]} The published service names.
     */
    const publishAndTrack = (bundle) => {
      const names = Object.keys(bundle);
      injectedGlobalNames.push(...names);
      assignGlobalServices(bundle);
      return names;
    };

    it('publishes every service in the bundle onto globalThis under its own name', () => {
      // Arrange: synthetic bundle with distinct sentinel values
      const bundle = { DriveApp: { marker: 'drive' }, LockService: { marker: 'lock' } };

      // Act
      const names = publishAndTrack(bundle);

      // Assert: every key reachable on globalThis by identity
      for (const name of names) {
        expect(globalThis[name]).toBe(bundle[name]);
      }
    });

    it('publishes the full real mock bundle produced by createGasMocks', () => {
      // Arrange: real mocks rooted inside an OS-temporary directory
      const driveRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-boot-test-'));
      try {
        const gasMocks = createGasMocks({
          driveRoot: driveRoot,
          propertiesFile: path.join(driveRoot, 'properties.json')
        });

        // Act
        publishAndTrack(gasMocks);

        // Assert: every returned service is published under its own name
        for (const [name, service] of Object.entries(gasMocks)) {
          expect(globalThis[name]).toBe(service);
        }
      } finally {
        fs.rmSync(driveRoot, { recursive: true, force: true });
      }
    });
  });

  describe('loadLegacyScript', () => {
    it('fails fast when a legacy script cannot be read', () => {
      // Arrange: a manifest-style path that does not exist beneath the repository root

      // Act + Assert: the failure surfaces instead of being swallowed
      expect(() => loadLegacyScript('src/01_utils/does-not-exist.js')).toThrow();
    });
  });
});
