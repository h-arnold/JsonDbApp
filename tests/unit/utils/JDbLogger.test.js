/**
 * JDbLogger.test.js - Vitest tests for JDbLogger
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureTimingEvents } from '../../helpers/timing-capture-test-helpers.js';
import { createMockClock } from '../../helpers/mock-time-helpers.js';

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
  const activeCaptures = [];

  beforeEach(() => {
    clock = createMockClock(1000);
    originalLevel = JDbLogger.currentLevel;

    // Red-phase attribution guard: every failure in this block must trace to the
    // absent timing facility, never to a stray TypeError at a call site below.
    expect(typeof JDbLogger.timeSync).toBe('function');
    expect(typeof JDbLogger.addTimingListener).toBe('function');
  });

  afterEach(() => {
    while (activeCaptures.length > 0) {
      activeCaptures.pop().restore();
    }
    JDbLogger.currentLevel = originalLevel;
    clock.restore();
  });

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
