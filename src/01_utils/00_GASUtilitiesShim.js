/**
 * 00_GASUtilitiesShim.js
 *
 * Purpose: Provide minimal stubs for Google Apps Script Utilities in non-GAS environments
 * so the codebase can run in Node/npm and during local testing without refactors.
 *
 * Loaded early (00_ prefix) so consumers like IdGenerator and FileOperations can use it.
 */

// Guard: only define if Utilities is not already provided by GAS
if (typeof Utilities === 'undefined') {
  // Define internal shim and attach to global scope
  const _UtilitiesShim = (function () {
    /**
     * Generate a UUID (v4) using Node's crypto if available, otherwise a JS fallback.
     * In GAS, Utilities.getUuid() is already provided.
     */
    function getUuid() {
      // Try Node's crypto if available (no throw propagation required)
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
          return crypto.randomUUID();
        } catch { /* ignore and fall back */ }
      }
      // Fallback: use a simple v4-like generator (same as IdGenerator fallback)
      const chars = '0123456789abcdef';
      let result = '';
      for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
          result += '-';
        } else if (i === 14) {
          result += '4';
        } else if (i === 19) {
          result += chars[Math.floor(Math.random() * 4) + 8];
        } else {
          result += chars[Math.floor(Math.random() * 16)];
        }
      }
      return result;
    }

    /**
     * Sleep for a number of milliseconds.
     * In GAS, Utilities.sleep(ms) blocks the thread; here we emulate synchronously for simplicity.
     * NOTE: This is a blocking sleep to preserve retry logic semantics in current code paths.
     */
    function sleep(ms) {
      // Prefer Atomics.wait if available (Node >= 9 with worker threads)
      // to avoid busy-looping; otherwise, fallback to a simple busy wait.
      const hasAtomics = typeof Atomics !== 'undefined' && typeof SharedArrayBuffer !== 'undefined';
      if (hasAtomics) {
        const sab = new SharedArrayBuffer(4);
        const ia = new Int32Array(sab);
        Atomics.wait(ia, 0, 0, ms);
        return;
      }
      const end = Date.now() + ms;
      while (Date.now() < end) { /* blocking wait */ }
    }

    return { getUuid, sleep };
  })();
  // Expose to global for all modules evaluated afterwards
  try { (globalThis || global || window).Utilities = _UtilitiesShim; } catch { /* best effort */ }
}
