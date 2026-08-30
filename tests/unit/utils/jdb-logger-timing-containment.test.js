/**
 * jdb-logger-timing-containment.test.js - Containment semantics of the timing facility
 *
 * Encodes the hardened failure contract of `timeSync`: every secondary
 * instrumentation failure — throwing listeners, throwing context suppliers,
 * record-emission failures from hostile contexts, and failing clock reads — is
 * contained and reported via console.error on BOTH timed paths, so only fn's own
 * outcome ever reaches the caller. Also pins the stacked-timer short-circuit,
 * under which nested timed calls run bare and exactly one outer event emits.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCaptureRegistry,
  newFailureReports
} from '../../helpers/jdb-logger-timing-test-helpers.js';

const { startCapture, flushActiveCaptures } = createCaptureRegistry();

describe('JDbLogger secondary failure containment', () => {
  afterEach(() => {
    flushActiveCaptures();
  });

  it('reports a throwing first listener without blocking later listeners or displacing the result', () => {
    // Arrange — a frozen target array makes the first-registered capture listener throw.
    startCapture(Object.freeze([]));
    const survivingEvents = [];
    startCapture(survivingEvents);
    const errorSpy = vi.spyOn(console, 'error');

    try {
      const callsBefore = errorSpy.mock.calls.length;

      // Act
      const result = JDbLogger.timeSync('x', () => 'intact');

      // Assert
      expect(result).toBe('intact');
      expect(survivingEvents).toHaveLength(1);
      expect(survivingEvents[0].label).toBe('x');
      expect(newFailureReports(errorSpy, callsBefore).length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('delivers to later listeners on the error path even when an earlier listener throws', () => {
    // Arrange — a frozen target array makes the first-registered capture listener throw.
    startCapture(Object.freeze([]));
    const survivingEvents = [];
    startCapture(survivingEvents);
    const originalError = new Error('primary failure');
    const errorSpy = vi.spyOn(console, 'error');

    try {
      const callsBefore = errorSpy.mock.calls.length;

      // Act
      let caught = null;
      try {
        JDbLogger.timeSync('x', () => {
          throw originalError;
        });
      } catch (error) {
        caught = error;
      }

      // Assert
      expect(caught).toBe(originalError);
      expect(survivingEvents).toHaveLength(1);
      expect(survivingEvents[0]).toMatchObject({ label: 'x', error: 'primary failure' });
      expect(newFailureReports(errorSpy, callsBefore).length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('contains record-emission failures for a circular context and preserves the result', () => {
    // Arrange
    const capture = startCapture();
    const circularContext = { note: 'self-referential' };
    circularContext.self = circularContext;
    const errorSpy = vi.spyOn(console, 'error');

    try {
      const callsBefore = errorSpy.mock.calls.length;

      // Act
      const result = JDbLogger.timeSync('circular', () => 'safe', circularContext);

      // Assert
      expect(result).toBe('safe');
      expect(capture.events).toHaveLength(1);
      expect(capture.events[0].label).toBe('circular');
      expect(newFailureReports(errorSpy, callsBefore).length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('contains record-emission failures on the error path without masking the original error', () => {
    // Arrange
    const capture = startCapture();
    const circularContext = { note: 'self-referential' };
    circularContext.self = circularContext;
    const originalError = new Error('real failure');
    const errorSpy = vi.spyOn(console, 'error');

    try {
      const callsBefore = errorSpy.mock.calls.length;

      // Act
      let caught = null;
      try {
        JDbLogger.timeSync(
          'circular',
          () => {
            throw originalError;
          },
          circularContext
        );
      } catch (error) {
        caught = error;
      }

      // Assert
      expect(caught).toBe(originalError);
      expect(capture.events).toHaveLength(1);
      expect(capture.events[0].error).toBe('real failure');
      expect(newFailureReports(errorSpy, callsBefore).length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('contains a throwing context supplier on the success path and still returns the result', () => {
    // Arrange
    const capture = startCapture();
    const errorSpy = vi.spyOn(console, 'error');
    let fnRan = false;

    /**
     * Context supplier that always throws.
     * @returns {Object} Never returns normally.
     * @throws {Error} A sentinel supplier error.
     */
    const throwingSupplier = () => {
      throw new Error('supplier exploded');
    };

    try {
      const callsBefore = errorSpy.mock.calls.length;

      // Act
      const result = JDbLogger.timeSync(
        'x',
        () => {
          fnRan = true;
          return 'value kept';
        },
        throwingSupplier
      );

      // Assert
      expect(fnRan).toBe(true);
      expect(result).toBe('value kept');
      expect(capture.events).toHaveLength(1);
      expect(newFailureReports(errorSpy, callsBefore).length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('contains a throwing supplier on the error path, emits the event, and rethrows the original error', () => {
    // Arrange
    const capture = startCapture();
    const operationError = new Error('operation failed');
    const errorSpy = vi.spyOn(console, 'error');

    /**
     * Context supplier that always throws.
     * @returns {Object} Never returns normally.
     * @throws {Error} A secondary supplier error.
     */
    const throwingSupplier = () => {
      throw new Error('supplier exploded too');
    };

    try {
      const callsBefore = errorSpy.mock.calls.length;

      // Act
      let caught = null;
      try {
        JDbLogger.timeSync(
          'x',
          () => {
            throw operationError;
          },
          throwingSupplier
        );
      } catch (error) {
        caught = error;
      }

      // Assert
      expect(caught).toBe(operationError);
      expect(capture.events).toHaveLength(1);
      expect(capture.events[0].error).toBe('operation failed');
      expect(newFailureReports(errorSpy, callsBefore).length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('JDbLogger stacked-timer short-circuit', () => {
  let originalLevel;
  let currentTimeMs;
  let dateNowSpy;
  let readClockSpy;

  beforeEach(() => {
    originalLevel = JDbLogger.currentLevel;
    currentTimeMs = 2000;
    // Deterministic clock values only: raw Date.now call counts are unstable
    // here because Vitest's console interceptor reads Date.now while printing
    // the DEBUG record, so counts are taken at the facility's own seam instead.
    dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => currentTimeMs);
    readClockSpy = vi.spyOn(JDbLogger, '_readClock');
  });

  afterEach(() => {
    flushActiveCaptures();
    JDbLogger.currentLevel = originalLevel;
    readClockSpy.mockRestore();
    dateNowSpy.mockRestore();
  });

  it('runs nested static timed calls directly so exactly one outer event emits', () => {
    // Arrange
    const capture = startCapture();

    // Act
    const result = JDbLogger.timeSync('outer', () => {
      currentTimeMs += 10;
      return JDbLogger.timeSync('inner', () => {
        currentTimeMs += 5;
        return 'inner-result';
      });
    });

    // Assert — two seam reads (outer start/end); inner runs bare with no emission.
    expect(result).toBe('inner-result');
    expect(readClockSpy).toHaveBeenCalledTimes(2);
    expect(capture.events).toEqual([
      {
        component: null,
        label: 'outer',
        durationMs: 15,
        timestamp: new Date(2015).toISOString(),
        error: null
      }
    ]);
  });

  it('short-circuits component-logger nesting so only the outer component event emits', () => {
    // Arrange
    const capture = startCapture();
    const outerLogger = JDbLogger.createComponentLogger('OuterComponent');
    const innerLogger = JDbLogger.createComponentLogger('InnerComponent');

    // Act
    const result = outerLogger.timeSync('outer-op', () =>
      innerLogger.timeSync('inner-op', () => 'nested-done')
    );

    // Assert — the nested component timer contributes zero seam reads.
    expect(result).toBe('nested-done');
    expect(readClockSpy).toHaveBeenCalledTimes(2);
    expect(capture.events).toEqual([
      {
        component: 'OuterComponent',
        label: 'outer-op',
        durationMs: 0,
        timestamp: new Date(2000).toISOString(),
        error: null
      }
    ]);
  });

  it('surfaces inner timed errors as the outer operation error with a single outer error event', () => {
    // Arrange
    const capture = startCapture();
    const innerError = new Error('inner blew up');

    // Act
    let caught = null;
    try {
      JDbLogger.timeSync('outer', () => {
        currentTimeMs += 4;
        return JDbLogger.timeSync('inner', () => {
          throw innerError;
        });
      });
    } catch (error) {
      caught = error;
    }

    // Assert — the erroring inner timer contributes zero seam reads.
    expect(caught).toBe(innerError);
    expect(readClockSpy).toHaveBeenCalledTimes(2);
    expect(capture.events).toEqual([
      {
        component: null,
        label: 'outer',
        durationMs: 4,
        timestamp: new Date(2004).toISOString(),
        error: 'inner blew up'
      }
    ]);
  });
});

describe('JDbLogger contained clock failures', () => {
  let originalLevel;
  let dateNowSpy;

  beforeEach(() => {
    originalLevel = JDbLogger.currentLevel;
    dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('clock exploded');
    });
  });

  afterEach(() => {
    flushActiveCaptures();
    JDbLogger.currentLevel = originalLevel;
    dateNowSpy.mockRestore();
  });

  it('still runs the wrapped operation once and returns its result when clock reads fail', () => {
    // Arrange
    const errorSpy = vi.spyOn(console, 'error');

    try {
      const callsBefore = errorSpy.mock.calls.length;
      let invocations = 0;

      // Act
      const result = JDbLogger.timeSync('x', () => {
        invocations += 1;
        return 'untouched';
      });

      // Assert
      expect(invocations).toBe(1);
      expect(result).toBe('untouched');
      expect(newFailureReports(errorSpy, callsBefore).length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('preserves the original operation error when clock reads fail on the error path', () => {
    // Arrange
    const errorSpy = vi.spyOn(console, 'error');

    try {
      const callsBefore = errorSpy.mock.calls.length;
      const operationError = new Error('operation failed anyway');
      let invocations = 0;

      // Act
      let caught = null;
      try {
        JDbLogger.timeSync('x', () => {
          invocations += 1;
          throw operationError;
        });
      } catch (error) {
        caught = error;
      }

      // Assert
      expect(invocations).toBe(1);
      expect(caught).toBe(operationError);
      expect(newFailureReports(errorSpy, callsBefore).length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
