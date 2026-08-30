/**
 * script-order.test.js - Vitest tests for tools/gas-mocks/script-order.cjs
 *
 * Verifies the shared legacy-script load-order manifest consumed by both the Vitest setup
 * file and the benchmark harness, so the two can never drift apart. Ordering assertions are
 * structural (derived from the imported manifest itself) and coverage is pinned against a
 * filesystem walk of the src tree, so a newly added src script missing from the manifest
 * fails loudly instead of drifting silently.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { legacyScripts } from '../../../tools/gas-mocks/script-order.cjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Real legacy scripts deliberately absent from the manifest because only the benchmark harness
 * appends them, after this manifest has been loaded.
 */
const BENCH_ONLY_SCRIPTS = ['src/04_core/99_PublicAPI.js'];

/** Matches a multi-file class composer file such as `99_Collection.js`. */
const COMPOSER_FILE_PATTERN = /^99_.+\.js$/;

/**
 * Lists every .js file beneath a directory, recursively, as sorted POSIX-style paths relative
 * to the repository root.
 * @param {string} absoluteDir - Directory to walk.
 * @param {string} relativeDir - Repository-relative prefix of absoluteDir ('' at the root).
 * @returns {string[]} Sorted repository-relative paths of every .js file found.
 */
function collectScriptFiles(absoluteDir, relativeDir) {
  const collected = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      collected.push(...collectScriptFiles(path.join(absoluteDir, entry.name), relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      collected.push(relativePath);
    }
  }
  return collected.sort();
}

/**
 * Groups manifest entries together with their load positions by the directory containing them.
 * @param {string[]} scripts - Manifest entries in load order.
 * @returns {Map<string, Array<{entry: string, position: number}>>} Directory name to members map.
 */
function groupEntriesByDirectory(scripts) {
  const groups = new Map();
  scripts.forEach((entry, position) => {
    const directory = path.posix.dirname(entry);
    if (!groups.has(directory)) {
      groups.set(directory, []);
    }
    groups.get(directory).push({ entry, position });
  });
  return groups;
}

describe('tools/gas-mocks/script-order.cjs', () => {
  it('exports a non-empty ordered array of src-relative JavaScript paths', () => {
    // Assert: shape of the exported manifest
    expect(Array.isArray(legacyScripts)).toBe(true);
    expect(legacyScripts.length).toBeGreaterThan(0);
    for (const entry of legacyScripts) {
      expect(typeof entry).toBe('string');
      expect(entry.length).toBeGreaterThan(0);
      expect(entry.startsWith('src/')).toBe(true);
      expect(entry.endsWith('.js')).toBe(true);
    }
  });

  it('lists each legacy script exactly once', () => {
    // Act
    const distinctEntries = new Set(legacyScripts);

    // Assert: a duplicated entry would load one script twice over shared globals
    expect(distinctEntries.size).toBe(legacyScripts.length);
  });

  it('starts at the dependency-free foundation and ends at the collection composer', () => {
    // Assert: anchors of the documented load order
    expect(legacyScripts[0]).toBe('src/01_utils/ErrorHandler.js');
    expect(legacyScripts[legacyScripts.length - 1]).toBe('src/04_core/Collection/99_Collection.js');
  });

  it('loads every utility script before any component or service script', () => {
    // Arrange: layer prefixes whose relative order dependent modules rely on
    const utilityPrefix = 'src/01_utils/';
    const dependentPrefixes = ['src/02_components/', 'src/03_services/'];

    // Act
    let lastUtilityPosition = -1;
    let firstDependentPosition = Number.MAX_SAFE_INTEGER;
    legacyScripts.forEach((entry, position) => {
      if (entry.startsWith(utilityPrefix)) {
        lastUtilityPosition = Math.max(lastUtilityPosition, position);
      }
      const isDependent = dependentPrefixes.some((prefix) => entry.startsWith(prefix));
      if (isDependent) {
        firstDependentPosition = Math.min(firstDependentPosition, position);
      }
    });

    // Assert: utilities occupy strictly earlier positions than any dependent script
    expect(lastUtilityPosition).toBeGreaterThanOrEqual(0);
    expect(firstDependentPosition).toBeLessThan(legacyScripts.length);
    expect(lastUtilityPosition).toBeLessThan(firstDependentPosition);
  });

  it('composes each multi-file class only after its numbered fragments are loaded', () => {
    // Act
    const groups = groupEntriesByDirectory(legacyScripts);

    // Assert: within every directory owning a composer file, the composer loads last
    for (const [directory, members] of groups) {
      const composers = members.filter((member) =>
        COMPOSER_FILE_PATTERN.test(path.posix.basename(member.entry))
      );
      if (composers.length === 0) {
        continue;
      }
      expect(composers, `${directory} should own at most one composer`).toHaveLength(1);
      for (const member of members) {
        if (member.entry !== composers[0].entry) {
          const message = `${member.entry} must load before ${composers[0].entry}`;
          expect(member.position, message).toBeLessThan(composers[0].position);
        }
      }
    }
  });

  it('includes JDbLogger so the logger is loaded before dependent modules', () => {
    // Assert: logger presence in the manifest
    expect(legacyScripts).toContain('src/01_utils/JDbLogger.js');
  });

  it('excludes the public API shim which only the benchmark harness appends', () => {
    // Assert: bench-only script must not leak into the test-setup load order
    expect(legacyScripts).not.toContain('src/04_core/99_PublicAPI.js');
  });

  it('covers every legacy src script on disk exactly once', () => {
    // Arrange: walk the real src tree, ignoring only the documented bench-only shim
    const scriptsOnDisk = collectScriptFiles(path.join(REPO_ROOT, 'src'), 'src').filter(
      (scriptPath) => !BENCH_ONLY_SCRIPTS.includes(scriptPath)
    );

    // Act
    const manifestSet = new Set(legacyScripts);
    const missingFromManifest = scriptsOnDisk.filter((scriptPath) => !manifestSet.has(scriptPath));
    const duplicatedInManifest = scriptsOnDisk.filter(
      (scriptPath) => legacyScripts.filter((entry) => entry === scriptPath).length > 1
    );

    // Assert: exact one-to-one coverage between disk and manifest
    expect(scriptsOnDisk.length).toBeGreaterThan(0);
    expect(missingFromManifest, 'scripts on disk but absent from the manifest').toEqual([]);
    expect(duplicatedInManifest, 'scripts listed more than once in the manifest').toEqual([]);
    expect(legacyScripts.length).toBe(scriptsOnDisk.length);
  });

  it('references only legacy scripts that exist on disk', () => {
    // Act
    const staleEntries = legacyScripts.filter(
      (scriptPath) => !fs.existsSync(path.join(REPO_ROOT, scriptPath))
    );

    // Assert: no manifest entry may point at a nonexistent file
    expect(staleEntries, 'manifest entries pointing at nonexistent files').toEqual([]);
  });
});
