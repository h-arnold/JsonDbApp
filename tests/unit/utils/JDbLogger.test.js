/**
 * JDbLogger.test.js - Vitest tests for the JDbLogger base surface
 *
 * Covers level control with typed JDbLoggerError validation, formatMessage
 * context validation (function contexts rejected), timing-listener registration
 * guards, and lazy-context supplier resolution across all four levels and the
 * component wrappers. Timing-facility behaviour lives in
 * jdb-logger-timing.test.js and jdb-logger-timing-containment.test.js.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureThrow,
  createCaptureRegistry,
  expectTypedFailure,
  expectTypedFailureWithMessage
} from '../../helpers/jdb-logger-timing-test-helpers.js';

const { startCapture, flushActiveCaptures } = createCaptureRegistry();

describe('JDbLogger basic functionality', () => {
  it('should have logger methods', () => {
    expect(typeof JDbLogger.error).toBe('function');
    expect(typeof JDbLogger.warn).toBe('function');
    expect(typeof JDbLogger.info).toBe('function');
    expect(typeof JDbLogger.debug).toBe('function');
  });
});

describe('JDbLogger typed errors', () => {
  it('exposes a dependency-free JDbLoggerError class carrying the standard name', () => {
    // Act
    const failure = new JDbLogger.JDbLoggerError('Operation failed: probe');

    // Assert
    expect(JDbLogger.JDbLoggerError).toBeDefined();
    expect(failure).toBeInstanceOf(Error);
    expect(failure.name).toBe('JDbLoggerError');
    expect(failure.message).toBe('Operation failed: probe');
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

  it('rejects unknown level names with a typed error and leaves the level untouched', () => {
    // Arrange
    const originalLevel = JDbLogger.currentLevel;

    // Act
    const thrown = captureThrow(() => JDbLogger.setLevelByName('NOPE'));

    // Assert
    expectTypedFailureWithMessage(thrown, 'Operation failed: invalid log level name: NOPE');
    expect(JDbLogger.currentLevel).toBe(originalLevel);
  });
});

describe('JDbLogger component logger', () => {
  it('should create component logger', () => {
    const componentLogger = JDbLogger.createComponentLogger('TestComponent');
    expect(typeof componentLogger.error).toBe('function');
    expect(typeof componentLogger.info).toBe('function');
  });
});

describe('JDbLogger timing listener registration', () => {
  afterEach(() => {
    flushActiveCaptures();
  });

  it('rejects a null listener with a typed error without registering anything', () => {
    // Arrange
    const probe = startCapture();

    // Act
    const thrown = captureThrow(() => JDbLogger.addTimingListener(null));

    // Assert — the rejection happens before any mutation, so only the probe receives events.
    expectTypedFailureWithMessage(thrown, 'Operation failed: listenerFn must be a function');

    JDbLogger.timeSync('probe', () => null);
    expect(probe.events).toHaveLength(1);
  });

  it('rejects non-function listener values with a typed error without registering anything', () => {
    // Arrange
    const probe = startCapture();

    // Act
    const thrown = captureThrow(() => JDbLogger.addTimingListener('not-a-function'));

    // Assert
    expectTypedFailureWithMessage(thrown, 'Operation failed: listenerFn must be a function');

    JDbLogger.timeSync('probe', () => null);
    expect(probe.events).toHaveLength(1);
  });
});

describe('JDbLogger formatMessage context validation', () => {
  let originalLevel;

  beforeEach(() => {
    originalLevel = JDbLogger.currentLevel;
    JDbLogger.setLevelByName('DEBUG');
  });

  afterEach(() => {
    flushActiveCaptures();
    JDbLogger.currentLevel = originalLevel;
  });

  it('rejects a function handed straight to formatMessage as the context', () => {
    // Act
    const thrown = captureThrow(() =>
      JDbLogger.formatMessage('DEBUG', 'gated message', () => ({ ignored: true }))
    );

    // Assert
    expectTypedFailure(thrown);
  });

  it('rejects a level-method context that resolves to a function at format time', () => {
    // Arrange
    /**
     * Builds a malformed supplier resolving to a bare function instead of structured context.
     * @returns {Function} Supplier yielding a function-shaped context.
     */
    const functionContextSupplier = () => {
      /**
       * Malformed resolved context shaped as a function.
       * @returns {null} Nothing of value; the shape alone is the failure.
       */
      const malformedResolvedContext = () => null;
      return malformedResolvedContext;
    };

    // Act — pass the supplier uninvoked so level-method resolution invokes it once and its
    // returned function reaches formatMessage as the resolved context.
    const thrown = captureThrow(() => JDbLogger.info('bad context', functionContextSupplier));

    // Assert
    expectTypedFailure(thrown);
  });

  it('keeps accepting object suppliers through level methods and timeSync', () => {
    // Arrange
    const capture = startCapture();
    const logSpy = vi.spyOn(console, 'log');

    try {
      // Act
      JDbLogger.info('plain supplier', () => ({ source: 'level-method' }));
      const result = JDbLogger.timeSync(
        'plain supplier op',
        () => 'done',
        () => ({
          source: 'timed'
        })
      );

      // Assert
      expect(result).toBe('done');
      expect(logSpy.mock.calls[0][0]).toContain('"source":"level-method"');
      expect(logSpy.mock.calls[1][0]).toContain('"source":"timed"');
      expect(capture.events).toHaveLength(1);
    } finally {
      logSpy.mockRestore();
    }
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
});
