/**
 * JDbLogger.test.js - Vitest tests for JDbLogger
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureTimingEvents } from '../../helpers/timing-capture-test-helpers.js';
import { createMockClock } from '../../helpers/mock-time-helpers.js';

const activeCaptures = [];

/**
 * Starts a timing capture registered for teardown in afterEach.
 * @param {Array<Object>} [targetEvents] - Optional shared collection array.
 * @returns {Object} Capture handle with collected events and an idempotent restore.
 */
const startCapture = (targetEvents) => {
  const handle = captureTimingEvents(targetEvents);
  activeCaptures.push(handle);
  return handle;
};

describe('JDbLogger basic functionality', () => {
  it('should have logger methods', () => {
    expect(typeof JDbLogger.error).toBe('function');
    expect(typeof JDbLogger.warn).toBe('function');
    expect(typeof JDbLogger.info).toBe('function');
    expect(typeof JDbLogger.debug).toBe('function');
  });
});

describe('JDbLogger levels', () => {
  it('should set log level by name', () => {
    const originalLevel = JDbLogger.currentLevel;

    JDbLogger.setLevelByName('ERROR');
    expect(JDbLogger.currentLevel).toBe(JDbLogger.LOG_LEVELS.ERROR);

    JDbLogger.setLevelByName('DEBUG');
    expect(JDbLogger.currentLevel).toBe(JDbLogger.LOG_LEVELS.DEBUG);

    JDbLogger.currentLevel = originalLevel;
  });
});

describe('JDbLogger component logger', () => {
  it('should create component logger', () => {
    const componentLogger = JDbLogger.createComponentLogger('TestComponent');
    expect(typeof componentLogger.error).toBe('function');
    expect(typeof componentLogger.info).toBe('function');
  });
});

describe('JDbLogger timeSync', () => {
  let clock;
  let originalLevel;

  beforeEach(() => {
    clock = createMockClock(1000);
    originalLevel = JDbLogger.currentLevel;
  });

  afterEach(() => {
    while (activeCaptures.length > 0) {
      activeCaptures.pop().restore();
    }
    JDbLogger.currentLevel = originalLevel;
    clock.restore();
  });

  describe('result passthrough', () => {
    it("returns the wrapped supplier's result unchanged", () => {
      // Arrange
      const sentinel = { ok: true };

      // Act
      const result = JDbLogger.timeSync('x', () => sentinel);

      // Assert
      expect(result).toBe(sentinel);
    });
  });

  describe('timing event capture', () => {
    it('emits a fully populated success event after the measured interval', () => {
      // Arrange
      const capture = startCapture();

      // Act
      JDbLogger.timeSync('x', () => {
        clock.advanceTime(42);
        return 'done';
      });

      // Assert
      expect(capture.events).toHaveLength(1);
      const event = capture.events[0];
      expect(event.component).toBeNull();
      expect(event.label).toBe('x');
      expect(event.durationMs).toBe(42);
      expect(event.timestamp).toBe(new Date(1042).toISOString());
      expect(event.error).toBeNull();
      expect(event).toEqual({
        component: null,
        label: 'x',
        durationMs: 42,
        timestamp: new Date(1042).toISOString(),
        error: null
      });
    });
  });

  describe('debug gating', () => {
    it('logs exactly one console record per timed operation when DEBUG is enabled', () => {
      // Arrange
      startCapture();
      const logSpy = vi.spyOn(console, 'log');

      try {
        // Act
        JDbLogger.timeSync('x', () => 'result');

        // Assert — invocation count only; console content is never asserted.
        expect(logSpy).toHaveBeenCalledTimes(1);
      } finally {
        logSpy.mockRestore();
      }
    });

    it('writes no console record when the level is suppressed below DEBUG', () => {
      // Arrange
      startCapture();
      JDbLogger.setLevelByName('ERROR');
      const logSpy = vi.spyOn(console, 'log');

      try {
        // Act
        JDbLogger.timeSync('x', () => 'result');

        // Assert — invocation count only; console content is never asserted.
        expect(logSpy).not.toHaveBeenCalled();
      } finally {
        logSpy.mockRestore();
      }
    });

    it('skips listener dispatch and supplier resolution when suppressed below DEBUG', () => {
      // Arrange
      const capture = startCapture();
      const supplier = vi.fn(() => ({ key: 'value' }));
      JDbLogger.setLevelByName('WARN');

      // Act
      const result = JDbLogger.timeSync('gated-out', () => 'still-ran', supplier);

      // Assert
      expect(result).toBe('still-ran');
      expect(supplier).not.toHaveBeenCalled();
      expect(capture.events).toHaveLength(0);
    });
  });

  describe('error path', () => {
    it('rethrows the original error and records it on the emitted event', () => {
      // Arrange
      const capture = startCapture();
      const originalError = new Error('operation exploded');

      // Act
      let caught = null;
      try {
        JDbLogger.timeSync('x', () => {
          clock.advanceTime(7);
          throw originalError;
        });
      } catch (error) {
        caught = error;
      }

      // Assert
      expect(caught).toBe(originalError);
      expect(capture.events).toHaveLength(1);
      expect(capture.events[0].error).toBe('operation exploded');
      expect(capture.events[0].durationMs).toBe(7);
    });

    it('reports a throwing listener through console.error without masking the original error', () => {
      // Arrange — a frozen target array makes the capture listener throw on delivery.
      startCapture(Object.freeze([]));
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

        // Assert — call-count increase only; console content is never asserted.
        expect(caught).toBe(originalError);
        expect(errorSpy.mock.calls.length).toBeGreaterThan(callsBefore);
      } finally {
        errorSpy.mockRestore();
      }
    });
  });

  describe('listener failure propagation', () => {
    it('propagates a throwing listener to the caller on the success path', () => {
      // Arrange — a frozen target array makes the capture listener throw on delivery.
      startCapture(Object.freeze([]));

      // Act + Assert
      expect(() => JDbLogger.timeSync('x', () => 'unused')).toThrow(TypeError);
    });
  });

  describe('validation', () => {
    it('rejects an empty label', () => {
      expect(() => JDbLogger.timeSync('', () => null)).toThrow();
    });

    it('rejects a non-function operation', () => {
      expect(() => JDbLogger.timeSync('x', 'not-a-function')).toThrow();
    });

    it('rejects a numeric context', () => {
      expect(() => JDbLogger.timeSync('x', () => null, 42)).toThrow();
    });

    it('rejects a string context', () => {
      expect(() => JDbLogger.timeSync('x', () => null, 'context')).toThrow();
    });

    it('treats an omitted context as null', () => {
      // Arrange
      const capture = startCapture();

      // Act
      const result = JDbLogger.timeSync('x', () => 'fine');

      // Assert
      expect(result).toBe('fine');
      expect(capture.events).toHaveLength(1);
    });
  });

  describe('listener lifecycle', () => {
    it('allows repeated unsubscribe calls and stops deliveries afterwards', () => {
      // Arrange
      const capture = startCapture();

      // Act
      capture.restore();
      expect(() => capture.restore()).not.toThrow();

      JDbLogger.timeSync('post-restore', () => null);

      // Assert
      expect(capture.events).toHaveLength(0);
    });

    it('delivers each event to every concurrently registered listener in registration order', () => {
      // Arrange — one shared buffer records both listeners' deliveries in firing order.
      const shared = [];
      startCapture(shared);
      startCapture(shared);

      // Act
      JDbLogger.timeSync('fan-out', () => null);

      // Assert — one entry per registered listener, same event object delivered to each.
      expect(shared).toHaveLength(2);
      expect(shared[0]).toBe(shared[1]);
    });
  });
});

describe('JDbLogger component logger timeSync', () => {
  let clock;
  let originalLevel;
  let componentLogger;

  beforeEach(() => {
    clock = createMockClock(1000);
    originalLevel = JDbLogger.currentLevel;
    componentLogger = JDbLogger.createComponentLogger('TestComponent');
  });

  afterEach(() => {
    while (activeCaptures.length > 0) {
      activeCaptures.pop().restore();
    }
    JDbLogger.currentLevel = originalLevel;
    clock.restore();
  });

  describe('component attribution', () => {
    it('tags emitted events with the owning component and leaves the label unprefixed', () => {
      // Arrange
      const capture = startCapture();

      // Act
      const result = componentLogger.timeSync('op', () => 'done');

      // Assert
      expect(result).toBe('done');
      expect(capture.events).toHaveLength(1);
      expect(capture.events[0].component).toBe('TestComponent');
      expect(capture.events[0].label).toBe('op');
    });
  });

  describe('static-form parity', () => {
    it('still attributes events from the static form to a null component', () => {
      // Arrange
      const capture = startCapture();

      // Act
      JDbLogger.timeSync('op', () => 'done');

      // Assert
      expect(capture.events).toHaveLength(1);
      expect(capture.events[0].component).toBeNull();
    });
  });

  describe('debug gating', () => {
    it('dispatches nothing and never invokes a function context when suppressed below DEBUG', () => {
      // Arrange
      const capture = startCapture();
      const contextSupplier = vi.fn(() => ({ key: 'value' }));
      JDbLogger.setLevelByName('WARN');

      // Act
      const result = componentLogger.timeSync('gated-out', () => 'still-ran', contextSupplier);

      // Assert
      expect(result).toBe('still-ran');
      expect(contextSupplier).not.toHaveBeenCalled();
      expect(capture.events).toHaveLength(0);
    });
  });
});

describe('JDbLogger lazy context', () => {
  let originalLevel;

  beforeEach(() => {
    originalLevel = JDbLogger.currentLevel;
    JDbLogger.setLevelByName('DEBUG');
  });

  afterEach(() => {
    JDbLogger.currentLevel = originalLevel;
  });

  /**
   * Builds a supplier spy returning a fresh structured context.
   * @param {string} source - Marker recorded in the returned context.
   * @returns {Function} Vitest spy that yields a `{ source }` object when invoked.
   */
  const createSupplierSpy = (source) => vi.fn(() => ({ source }));

  describe('static level supplier gating', () => {
    it('invokes the error-level supplier exactly once when an ERROR record is emitted', () => {
      // Arrange
      const supplier = createSupplierSpy('error');

      // Act
      JDbLogger.error('lazy error context', supplier);

      // Assert
      expect(supplier).toHaveBeenCalledTimes(1);
    });

    it('invokes the warn-level supplier exactly once when a WARN record is emitted', () => {
      // Arrange
      const supplier = createSupplierSpy('warn');

      // Act
      JDbLogger.warn('lazy warn context', supplier);

      // Assert
      expect(supplier).toHaveBeenCalledTimes(1);
    });

    it('invokes the info-level supplier exactly once when an INFO record is emitted', () => {
      // Arrange
      const supplier = createSupplierSpy('info');

      // Act
      JDbLogger.info('lazy info context', supplier);

      // Assert
      expect(supplier).toHaveBeenCalledTimes(1);
    });

    it('invokes the debug-level supplier exactly once when a DEBUG record is emitted', () => {
      // Arrange
      const supplier = createSupplierSpy('debug');

      // Act
      JDbLogger.debug('lazy debug context', supplier);

      // Assert
      expect(supplier).toHaveBeenCalledTimes(1);
    });

    it('never invokes the error-level supplier when the ERROR gate is closed', () => {
      // Arrange — ERROR is the lowest valid level, so its gate only closes below the named
      // scale; assign that sub-level sentinel directly to the static level state.
      JDbLogger.currentLevel = JDbLogger.LOG_LEVELS.ERROR - 1;
      const supplier = createSupplierSpy('error-suppressed');

      // Act
      JDbLogger.error('gated-out error context', supplier);

      // Assert
      expect(supplier).not.toHaveBeenCalled();
    });

    it('never invokes the warn-level supplier when records are suppressed to ERROR', () => {
      // Arrange
      JDbLogger.setLevelByName('ERROR');
      const supplier = createSupplierSpy('warn-suppressed');

      // Act
      JDbLogger.warn('gated-out warn context', supplier);

      // Assert
      expect(supplier).not.toHaveBeenCalled();
    });

    it('never invokes the info-level supplier when records are suppressed to WARN', () => {
      // Arrange
      JDbLogger.setLevelByName('WARN');
      const supplier = createSupplierSpy('info-suppressed');

      // Act
      JDbLogger.info('gated-out info context', supplier);

      // Assert
      expect(supplier).not.toHaveBeenCalled();
    });

    it('never invokes the debug-level supplier when records are suppressed to INFO', () => {
      // Arrange
      JDbLogger.setLevelByName('INFO');
      const supplier = createSupplierSpy('debug-suppressed');

      // Act
      JDbLogger.debug('gated-out debug context', supplier);

      // Assert
      expect(supplier).not.toHaveBeenCalled();
    });
  });

  describe('supplier resolution order', () => {
    it('hands formatMessage the resolved context object rather than the supplier function', () => {
      // Arrange
      const resolvedContext = { key: 'value' };

      /**
       * Supplier returning the resolved context object.
       * @returns {Object} The resolved context object.
       */
      const supplier = () => resolvedContext;
      const formatSpy = vi.spyOn(JDbLogger, 'formatMessage');

      try {
        // Act
        JDbLogger.debug('lazy message', supplier);

        // Assert — resolution happens after the level check and before formatting, so the seam
        // receives the resolved object and never a function.
        expect(formatSpy).toHaveBeenCalledTimes(1);
        const [level, , contextArgument] = formatSpy.mock.calls[0];
        expect(level).toBe('DEBUG');
        expect(typeof contextArgument).not.toBe('function');
        expect(contextArgument).toEqual(resolvedContext);
      } finally {
        formatSpy.mockRestore();
      }
    });
  });

  describe('component wrapper pass-through', () => {
    let componentLogger;

    beforeEach(() => {
      componentLogger = JDbLogger.createComponentLogger('TestComponent');
    });

    it('forwards the error wrapper context uninvoked when the level drops below the named scale', () => {
      // Arrange — ERROR is the lowest valid level, so its gate only closes below the named
      // scale; assign that sub-level sentinel directly to the static level state.
      JDbLogger.currentLevel = JDbLogger.LOG_LEVELS.ERROR - 1;
      const supplier = createSupplierSpy('wrapper-error');

      // Act
      componentLogger.error('gated out', supplier);

      // Assert
      expect(supplier).not.toHaveBeenCalled();
    });

    it('forwards the warn wrapper context uninvoked when records are suppressed to ERROR', () => {
      // Arrange
      JDbLogger.setLevelByName('ERROR');
      const supplier = createSupplierSpy('wrapper-warn');

      // Act
      componentLogger.warn('gated out', supplier);

      // Assert
      expect(supplier).not.toHaveBeenCalled();
    });

    it('forwards the info wrapper context uninvoked when records are suppressed to WARN', () => {
      // Arrange
      JDbLogger.setLevelByName('WARN');
      const supplier = createSupplierSpy('wrapper-info');

      // Act
      componentLogger.info('gated out', supplier);

      // Assert
      expect(supplier).not.toHaveBeenCalled();
    });

    it('forwards the debug wrapper context uninvoked when records are suppressed to INFO', () => {
      // Arrange
      JDbLogger.setLevelByName('INFO');
      const supplier = createSupplierSpy('wrapper-debug');

      // Act
      componentLogger.debug('gated out', supplier);

      // Assert
      expect(supplier).not.toHaveBeenCalled();
    });
  });

  describe('timeSync supplier exceptions', () => {
    it('propagates a throwing supplier after fn ran on the success path', () => {
      // Arrange
      const supplierError = new Error('supplier exploded');
      let fnRan = false;

      /**
       * Context supplier that always throws.
       * @returns {Object} Never returns normally.
       * @throws {Error} The sentinel supplier error.
       */
      const throwingSupplier = () => {
        throw supplierError;
      };

      // Act + Assert — the operation runs first; its return value is lost to the supplier failure.
      expect(() => {
        JDbLogger.timeSync(
          'x',
          () => {
            fnRan = true;
            return 'value lost';
          },
          throwingSupplier
        );
      }).toThrow(supplierError);
      expect(fnRan).toBe(true);
    });

    it('rethrows the original operation error unchanged when the supplier also throws on the error path', () => {
      // Arrange
      const operationError = new Error('operation failed');

      /**
       * Context supplier that always throws.
       * @returns {Object} Never returns normally.
       * @throws {Error} A secondary supplier error.
       */
      const throwingSupplier = () => {
        throw new Error('supplier exploded too');
      };
      const errorSpy = vi.spyOn(console, 'error');

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

        // Assert — call-count increase only; console content is never asserted.
        expect(caught).toBe(operationError);
        expect(errorSpy.mock.calls.length).toBeGreaterThan(callsBefore);
      } finally {
        errorSpy.mockRestore();
      }
    });
  });
});
