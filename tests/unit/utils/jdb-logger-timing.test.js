/**
 * jdb-logger-timing.test.js - Vitest tests for the JDbLogger timing facility
 *
 * Covers the deterministic core of `timeSync`: result passthrough, success and
 * error event shapes under the mock clock, DEBUG gating of records/dispatch/
 * supplier resolution, the measured-duration-wins collision rule on console
 * records, argument validation with typed errors, listener lifecycle including
 * snapshot dispatch, and component-logger parity.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockClock } from '../../helpers/mock-time-helpers.js';
import {
  captureThrow,
  createCaptureRegistry,
  expectTypedFailureWithMessage
} from '../../helpers/jdb-logger-timing-test-helpers.js';

const { startCapture, flushActiveCaptures } = createCaptureRegistry();

/** A primitive throwable used to pin non-Error throw coercion and identity. */
const PRIMITIVE_THROWN = 'boom';

describe('JDbLogger timeSync', () => {
  let clock;
  let originalLevel;

  beforeEach(() => {
    clock = createMockClock(1000);
    originalLevel = JDbLogger.currentLevel;
  });

  afterEach(() => {
    flushActiveCaptures();
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
      expect(capture.events).toEqual([
        {
          component: null,
          label: 'x',
          durationMs: 42,
          timestamp: new Date(1042).toISOString(),
          error: null
        }
      ]);
    });
  });

  describe('console record', () => {
    it('lets the measured numeric duration win a durationMs key collision in the record', () => {
      // Arrange
      startCapture();
      const logSpy = vi.spyOn(console, 'log');

      try {
        // Act
        JDbLogger.timeSync(
          'collide',
          () => {
            clock.advanceTime(42);
            return null;
          },
          { durationMs: 'fake' }
        );

        // Assert — the record carries the measured value, never the colliding context entry.
        expect(logSpy).toHaveBeenCalledTimes(1);
        const record = logSpy.mock.calls[0][0];
        expect(record).toContain('[TIMING] collide');
        expect(record).toContain('"durationMs":42');
        expect(record).not.toContain('fake');
      } finally {
        logSpy.mockRestore();
      }
    });

    it('renders a supplied object context into the record without displacing the result', () => {
      // Arrange
      const capture = startCapture();
      const logSpy = vi.spyOn(console, 'log');

      try {
        // Act
        const result = JDbLogger.timeSync('supplied', () => 'ok', () => ({ source: 'object' }));

        // Assert
        expect(result).toBe('ok');
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy.mock.calls[0][0]).toContain('[TIMING] supplied');
        expect(logSpy.mock.calls[0][0]).toContain('"source":"object"');
        expect(capture.events).toHaveLength(1);
      } finally {
        logSpy.mockRestore();
      }
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

  describe('error-path event shape', () => {
    it('emits a complete error-path event for a static timed failure', () => {
      // Arrange
      const capture = startCapture();
      const originalError = new Error('kaboom');

      // Act
      let caught = null;
      try {
        JDbLogger.timeSync('static-op', () => {
          clock.advanceTime(7);
          throw originalError;
        });
      } catch (error) {
        caught = error;
      }

      // Assert
      expect(caught).toBe(originalError);
      expect(capture.events).toEqual([
        {
          component: null,
          label: 'static-op',
          durationMs: 7,
          timestamp: new Date(1007).toISOString(),
          error: 'kaboom'
        }
      ]);
    });

    it('emits a complete error-path event attributed to the owning component', () => {
      // Arrange
      const capture = startCapture();
      const componentLogger = JDbLogger.createComponentLogger('Worker');
      const originalError = new Error('worker failed');

      // Act
      let caught = null;
      try {
        componentLogger.timeSync('worker-op', () => {
          clock.advanceTime(3);
          throw originalError;
        });
      } catch (error) {
        caught = error;
      }

      // Assert
      expect(caught).toBe(originalError);
      expect(capture.events).toEqual([
        {
          component: 'Worker',
          label: 'worker-op',
          durationMs: 3,
          timestamp: new Date(1003).toISOString(),
          error: 'worker failed'
        }
      ]);
    });

    it('coerces a thrown primitive into the error field and rethrows it with identity intact', () => {
      // Arrange
      const capture = startCapture();

      // Act
      let caught = null;
      try {
        JDbLogger.timeSync('primitive-op', () => {
          clock.advanceTime(5);
          throw PRIMITIVE_THROWN;
        });
      } catch (error) {
        caught = error;
      }

      // Assert
      expect(caught).toBe(PRIMITIVE_THROWN);
      expect(capture.events).toEqual([
        {
          component: null,
          label: 'primitive-op',
          durationMs: 5,
          timestamp: new Date(1005).toISOString(),
          error: 'boom'
        }
      ]);
    });
  });

  describe('validation', () => {
    it('rejects an empty label with a typed error', () => {
      // Act
      const thrown = captureThrow(() => JDbLogger.timeSync('', () => null));

      // Assert
      expectTypedFailureWithMessage(thrown, 'Operation failed: label must be a non-empty string');
    });

    it('rejects a non-function operation with a typed error', () => {
      // Act
      const thrown = captureThrow(() => JDbLogger.timeSync('x', 'not-a-function'));

      // Assert
      expectTypedFailureWithMessage(thrown, 'Operation failed: fn must be a function');
    });

    it('rejects a numeric context with a typed error', () => {
      // Act
      const thrown = captureThrow(() => JDbLogger.timeSync('x', () => null, 42));

      // Assert
      expectTypedFailureWithMessage(
        thrown,
        'Operation failed: context must be an object, a function, or null'
      );
    });

    it('rejects a string context with a typed error', () => {
      // Act
      const thrown = captureThrow(() => JDbLogger.timeSync('x', () => null, 'context'));

      // Assert
      expectTypedFailureWithMessage(
        thrown,
        'Operation failed: context must be an object, a function, or null'
      );
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

    it('keeps delivering to following listeners when one unsubscribes during dispatch', () => {
      // Arrange — this behaviour needs a raw addTimingListener because only a hand-rolled
      // listener can unsubscribe itself mid-dispatch; its closure unsubscribes idempotently so
      // no listener state leaks past this test.
      const beforeRemoval = [];
      startCapture(beforeRemoval);
      const removals = [];

      /**
       * Listener that removes itself upon its first delivery.
       * @param {Object} event - Delivered timing event.
       * @returns {void}
       */
      const selfRemovingListener = (event) => {
        removals.push(event);
        unsubscribeSelf();
      };
      const unsubscribeSelf = JDbLogger.addTimingListener(selfRemovingListener);
      const afterRemoval = [];
      startCapture(afterRemoval);

      // Act
      JDbLogger.timeSync('mid-unsub', () => null);

      // Assert — snapshot dispatch must reach the listener registered after the remover.
      expect(beforeRemoval).toHaveLength(1);
      expect(removals).toHaveLength(1);
      expect(afterRemoval).toHaveLength(1);

      // Repeat unsubscribe stays idempotent and safe.
      expect(() => unsubscribeSelf()).not.toThrow();

      // Act — subsequent deliveries exclude only the removed listener.
      JDbLogger.timeSync('post-unsub', () => null);

      // Assert
      expect(beforeRemoval).toHaveLength(2);
      expect(removals).toHaveLength(1);
      expect(afterRemoval).toHaveLength(2);
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
    flushActiveCaptures();
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
