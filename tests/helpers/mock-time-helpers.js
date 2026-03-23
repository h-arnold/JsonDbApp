/* global Utilities */

import { vi } from 'vitest';

/**
 * Creates a controllable clock for timing-sensitive tests.
 * @param {number} [startTimeMs=0] - Initial timestamp returned by Date.now().
 * @returns {Object} Clock controls for advancing time and restoring spies.
 */
export const createMockClock = (startTimeMs = 0) => {
  let currentTimeMs = startTimeMs;
  const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => currentTimeMs);
  let sleepSpy = null;

  return {
    /**
     * Advances the mocked clock by the requested duration.
     * @param {number} milliseconds - Time to add to the mocked clock.
     * @returns {number} Updated current timestamp.
     */
    advanceTime(milliseconds) {
      currentTimeMs += milliseconds;
      return currentTimeMs;
    },

    /**
     * Replaces Utilities.sleep() with a no-op that advances the mocked clock.
     * @returns {Object} Spy wrapping Utilities.sleep().
     */
    mockUtilitiesSleep() {
      sleepSpy = vi.spyOn(Utilities, 'sleep').mockImplementation((milliseconds) => {
        currentTimeMs += milliseconds;
      });
      return sleepSpy;
    },

    /**
     * Restores all spies created by this clock.
     */
    restore() {
      if (sleepSpy) {
        sleepSpy.mockRestore();
      }
      dateNowSpy.mockRestore();
    }
  };
};
