/**
 * JDbLogger - Provides standardised logging functionality for GAS DB
 *
 * This class provides different log levels and formats messages consistently
 * across the entire library. Designed to work with Google Apps Script's
 * console logging capabilities. Also provides an execution-time logging
 * facility (`timeSync`) that measures synchronous operations and delivers
 * structured timing events to registered listeners.
 *
 * The logger is deliberately dependency-free: validation
 * failures raise the local JDbLoggerError type declared below rather than any
 * ErrorHandler type, and every secondary instrumentation failure is contained
 * and reported through console.error so it can never displace a measured
 * operation's own result or mask its original error.
 */

/**
 * Dependency-free typed error raised for every JDbLogger validation failure.
 *
 * Declared locally so the logger never references ErrorHandler; extending Error satisfies the
 * project convention that error names end in 'Error' and gives consumers a
 * catchable type exposed as JDbLogger.JDbLoggerError.
 */
class JDbLoggerError extends Error {
  /**
   * Create a typed logger failure.
   * @param {string} message - Failure description in the standard
   *   'Operation failed: ...' message format.
   */
  constructor(message) {
    super(message);
    this.name = 'JDbLoggerError';
  }
}

/**
 * Standardised dependency-free logger for GAS DB.
 *
 * Exposes level methods with lazy-context support, component-scoped loggers,
 * and the execution-time timing facility (`timeSync`) whose secondary
 * instrumentation failures are fully contained.
 */
class JDbLogger {
  /**
   * Set the current logging level by name.
   * @param {string} levelName - The log level name (ERROR, WARN, INFO, DEBUG).
   * @returns {void}
   * @throws {JDbLoggerError} When the name is not a recognised log level; the
   *   current level is left untouched.
   */
  static setLevelByName(levelName) {
    const level = JDbLogger.LOG_LEVELS[levelName.toUpperCase()];
    if (level === undefined) {
      throw new JDbLoggerError(`Operation failed: invalid log level name: ${levelName}`);
    }
    JDbLogger.currentLevel = level;
  }

  /**
   * Format a log message with timestamp and level.
   * @param {string} level - The log level name.
   * @param {string} message - The message to log.
   * @param {Object|null} [context=null] - Structured context object; callers resolve lazy
   *   suppliers beforehand (see _resolveTimingContext).
   * @returns {string} Formatted log message.
   * @throws {JDbLoggerError} When context is neither an object nor null, so malformed contexts
   *   fail loudly instead of garbling output (fail fast).
   */
  static formatMessage(level, message, context = null) {
    if (context !== null && typeof context !== 'object') {
      throw new JDbLoggerError('Operation failed: context must be an object or null');
    }

    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level}] ${message}`;

    if (context) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }

    return formatted;
  }

  /**
   * Log an error message.
   * @param {string} message - The error message.
   * @param {Object|Function|null} [context=null] - Structured context object or lazy supplier
   *   function returning one; see _resolveTimingContext for the shared supplier-gating contract.
   * @remarks Supplier resolution runs unguarded here: plain level logs protect no measured
   *   outcome, so a throwing supplier propagates unchanged (fail loud).
   */
  static error(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.ERROR) {
      const resolvedContext = JDbLogger._resolveTimingContext(context, false);
      console.error(JDbLogger.formatMessage('ERROR', message, resolvedContext));
    }
  }

  /**
   * Log a warning message.
   * @param {string} message - The warning message.
   * @param {Object|Function|null} [context=null] - Structured context object or lazy supplier
   *   function returning one; see _resolveTimingContext for the shared supplier-gating contract.
   * @remarks Supplier resolution runs unguarded here: plain level logs protect no measured
   *   outcome, so a throwing supplier propagates unchanged (fail loud).
   */
  static warn(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.WARN) {
      const resolvedContext = JDbLogger._resolveTimingContext(context, false);
      console.warn(JDbLogger.formatMessage('WARN', message, resolvedContext));
    }
  }

  /**
   * Log an info message.
   * @param {string} message - The info message.
   * @param {Object|Function|null} [context=null] - Structured context object or lazy supplier
   *   function returning one; see _resolveTimingContext for the shared supplier-gating contract.
   * @remarks Supplier resolution runs unguarded here: plain level logs protect no measured
   *   outcome, so a throwing supplier propagates unchanged (fail loud).
   */
  static info(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.INFO) {
      const resolvedContext = JDbLogger._resolveTimingContext(context, false);
      console.log(JDbLogger.formatMessage('INFO', message, resolvedContext));
    }
  }

  /**
   * Log a debug message.
   * @param {string} message - The debug message.
   * @param {Object|Function|null} [context=null] - Structured context object or lazy supplier
   *   function returning one; see _resolveTimingContext for the shared supplier-gating contract.
   * @remarks Supplier resolution runs unguarded here: plain level logs protect no measured
   *   outcome, so a throwing supplier propagates unchanged (fail loud).
   */
  static debug(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.DEBUG) {
      const resolvedContext = JDbLogger._resolveTimingContext(context, false);
      console.log(JDbLogger.formatMessage('DEBUG', message, resolvedContext));
    }
  }

  /**
   * Create a logger instance for a specific component.
   * @param {string} component - The component name.
   * @returns {Object} Component-specific logger whose level methods forward contexts uninvoked
   *   and whose timeSync delegates to the shared seam with this component name.
   */
  static createComponentLogger(component) {
    return {
      /**
       * Log an error message for this component.
       * @param {string} message - Message to record.
       * @param {Object|Function|null} [context=null] - Structured context or lazy supplier,
       *   forwarded uninvoked so gating stays owned by the static method.
       */
      error: (message, context = null) => {
        JDbLogger.error(`[${component}] ${message}`, context);
      },
      /**
       * Log a warning for this component.
       * @param {string} message - Message to record.
       * @param {Object|Function|null} [context=null] - Structured context or lazy supplier,
       *   forwarded uninvoked so gating stays owned by the static method.
       */
      warn: (message, context = null) => {
        JDbLogger.warn(`[${component}] ${message}`, context);
      },
      /**
       * Log informational details for this component.
       * @param {string} message - Message to record.
       * @param {Object|Function|null} [context=null] - Structured context or lazy supplier,
       *   forwarded uninvoked so gating stays owned by the static method.
       */
      info: (message, context = null) => {
        JDbLogger.info(`[${component}] ${message}`, context);
      },
      /**
       * Log verbose debug details for this component.
       * @param {string} message - Message to record.
       * @param {Object|Function|null} [context=null] - Structured context or lazy supplier,
       *   forwarded uninvoked so gating stays owned by the static method.
       */
      debug: (message, context = null) => {
        JDbLogger.debug(`[${component}] ${message}`, context);
      },
      /**
       * Time a synchronous operation owned by this component and emit its DEBUG record plus
       * structured timing event.
       * @param {string} label - Non-empty label identifying the timed operation; recorded
       *   unprefixed on events.
       * @param {Function} fn - Zero-argument operation to execute and measure.
       * @param {Object|Function|null} [context=null] - Structured context object or lazy
       *   supplier function returning one.
       * @returns {*} The value returned by fn, passed through unchanged.
       * @throws {JDbLoggerError} When arguments are invalid before any timing starts (same
       *   rules as the static form).
       * @throws {*} Whatever fn throws, rethrown with its identity preserved verbatim.
       * @remarks Full delegation to the _timeSync seam: component attribution, DEBUG gating,
       *   secondary-failure containment and the stacked-timer short-circuit are all seam-owned,
       *   so static and component use cannot drift apart.
       */
      timeSync: (label, fn, context = null) => {
        return JDbLogger._timeSync(component, label, fn, context);
      }
    };
  }

  /**
   * Time a synchronous operation and emit a DEBUG record plus a structured timing event on
   * completion.
   * @param {string} label - Non-empty label identifying the timed operation.
   * @param {Function} fn - Zero-argument operation to execute and measure.
   * @param {Object|Function|null} [context=null] - Structured context object or lazy supplier
   *   function returning one; omitted or undefined contexts normalise to null via this default
   *   parameter.
   * @returns {*} The value returned by fn, passed through unchanged.
   * @throws {JDbLoggerError} When arguments are invalid before any timing starts: label must be
   *   a non-empty string, fn must be a function, and context must be an object, a function, or
   *   null.
   * @throws {*} Whatever fn throws, rethrown with its identity preserved verbatim.
   * @remarks Public entry point; delegates to _timeSync with component = null so static use and
   *   component-logger use share every behavioural rule implemented in the seam, including
   *   secondary-failure containment and the stacked-timer short-circuit.
   */
  static timeSync(label, fn, context = null) {
    return JDbLogger._timeSync(null, label, fn, context);
  }

  /**
   * Register a listener that receives every emitted timing event synchronously.
   * @param {Function} listenerFn - Callback invoked with each plain-object timing event.
   * @returns {Function} Unsubscribe closure; calling it more than once is safe (idempotent).
   * @throws {JDbLoggerError} When listenerFn is not a function; registration state is untouched.
   * @remarks Listeners fire in registration order and receive the same event object per
   *   emission. Dispatch iterates a snapshot of the listener collection, so a listener
   *   unsubscribing mid-dispatch cannot skip those registered after it.
   */
  static addTimingListener(listenerFn) {
    if (typeof listenerFn !== 'function') {
      throw new JDbLoggerError('Operation failed: listenerFn must be a function');
    }

    JDbLogger._timingListeners.add(listenerFn);

    /**
     * Remove the registered listener from the store; repeat calls do nothing because Set
     * deletion is idempotent.
     * @returns {void}
     */
    const unsubscribe = () => {
      JDbLogger._timingListeners.delete(listenerFn);
    };

    return unsubscribe;
  }

  /**
   * Internal seam implementing every behavioural rule of the timing facility; both entry points
   * (static timeSync and component loggers) delegate here so behaviour cannot drift apart.
   * @param {string|null} component - Component name owning the record, or null for static use.
   * @param {string} label - Non-empty label identifying the timed operation.
   * @param {Function} fn - Zero-argument operation to execute and measure.
   * @param {Object|Function|null} context - Structured context object or lazy supplier function.
   * @returns {*} The value returned by fn, unchanged.
   * @throws {JDbLoggerError} When arguments are invalid (validated before any timing starts).
   * @throws {*} Whatever fn throws, rethrown with its identity preserved verbatim.
   * @remarks Containment contract: the clock reads, supplier resolution, record emission, event
   *   construction and listener dispatch are secondary instrumentation steps guarded identically
   *   on the success and error paths — each failure is reported via console.error in the
   *   'Operation failed: ...' format and can never displace fn's result nor mask its original
   *   error, which alone reaches the caller. Measurement precedes the DEBUG gate so both clock
   *   reads occur on every ungated call, even when emission is suppressed. While a measurement
   *   is active (_measurementDepth above zero), nested timeSync calls validate their arguments
   *   then execute fn directly — no clock reads, no record, no event — so each user-visible
   *   operation emits exactly its single outermost boundary label.
   */
  static _timeSync(component, label, fn, context) {
    JDbLogger._validateTimingArguments(label, fn, context);

    // Stacked-timer short-circuit: an already-running measurement adopts nested timed calls
    // silently, avoiding duplicate fixed costs and double-counted inner durations.
    if (JDbLogger._measurementDepth > 0) {
      return fn();
    }

    JDbLogger._measurementDepth += 1;
    try {
      const measurement = JDbLogger._measureTimedOperation(fn);
      const errorPath = measurement.error !== null;

      // DEBUG gate. When suppressed the measured outcome passes straight through: no supplier
      // resolution, no formatting, no console output, no dispatch, and a function context is
      // never invoked.
      if (JDbLogger.currentLevel < JDbLogger.LOG_LEVELS.DEBUG) {
        if (errorPath) {
          throw measurement.error;
        }
        return measurement.result;
      }

      const durationMs = measurement.end - measurement.start;
      const resolvedContext = JDbLogger._resolveTimingContext(context, true);

      JDbLogger._runContainedStep(() => {
        JDbLogger._emitTimingRecord(component, label, resolvedContext, durationMs);
      }, 'timing record emission');

      JDbLogger._runContainedStep(() => {
        JDbLogger._dispatchTimingEvent(
          JDbLogger._buildTimingEvent(
            component,
            label,
            durationMs,
            measurement.end,
            measurement.error
          )
        );
      }, 'timing event dispatch');

      if (errorPath) {
        throw measurement.error;
      }
      return measurement.result;
    } finally {
      JDbLogger._measurementDepth -= 1;
    }
  }

  /**
   * Validate timing arguments before any measurement starts.
   * @param {string} label - Label claimed for the timed operation.
   * @param {Function} fn - Operation claimed for measurement.
   * @param {Object|Function|null} context - Context claim after undefined-normalisation by the
   *   entry-point default parameters.
   * @returns {void}
   * @throws {JDbLoggerError} Naming the offending argument; local typed errors keep JDbLogger
   *   dependency-free rather than referencing ErrorHandler.
   */
  static _validateTimingArguments(label, fn, context) {
    if (typeof label !== 'string' || label.length === 0) {
      throw new JDbLoggerError('Operation failed: label must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new JDbLoggerError('Operation failed: fn must be a function');
    }
    if (context !== null && typeof context !== 'object' && typeof context !== 'function') {
      throw new JDbLoggerError('Operation failed: context must be an object, a function, or null');
    }
  }

  /**
   * Execute the wrapped operation exactly once between two contained clock reads.
   * @param {Function} fn - Operation to execute and bracket with clock reads.
   * @returns {{start: number, result: *, error: *, end: number}} Measurement outcome holding
   *   both effective clock readings plus exactly one meaningful outcome field: result when fn
   *   succeeded, otherwise the caught throwable (result is then null).
   * @remarks Each clock read is contained individually (see _readClock); when a read fails the
   *   affected bound inherits its successful counterpart, degrading durationMs sensibly to a
   *   number (zero when both fail) rather than NaN or an aborted call. The caught throwable is
   *   preserved untouched — identity included — so callers can rethrow the original error
   *   verbatim after emission.
   */
  static _measureTimedOperation(fn) {
    const startReading = JDbLogger._readClock();
    let result = null;
    let error = null;
    try {
      result = fn();
    } catch (error_) {
      error = error_;
    }
    const endReading = JDbLogger._readClock();

    // Degraded clock mode: a failed reading falls back to its successful counterpart, or to
    // zero when both fail, keeping durationMs a number without disturbing fn's outcome.
    let start = startReading;
    let end = endReading;
    if (start === null) {
      start = end !== null ? end : 0;
      end = start;
    } else if (end === null) {
      end = start;
    }

    return { start, result, error, end };
  }

  /**
   * Read the wall clock directly, containing failures so a broken clock cannot abort a measured
   * operation before, during or after fn.
   * @returns {number|null} Milliseconds elapsed since the Unix epoch, or null when the read
   *   failed (the failure having been reported via console.error).
   * @remarks Calls Date.now() inline rather than through a substitution seam; deterministic
   *   tests control time by spying on Date.now itself via the mock-clock helper.
   */
  static _readClock() {
    try {
      return Date.now();
    } catch (clockError) {
      console.error(`Operation failed: timing clock read threw: ${String(clockError)}`);
      return null;
    }
  }

  /**
   * Run one secondary instrumentation step with its failure contained.
   * @param {Function} step - Zero-argument thunk performing the instrumentation work.
   * @param {string} description - Short role name woven into the failure report.
   * @returns {*} Whatever step returns, or null when it threw (after reporting the failure).
   * @remarks Containment behaves identically on the success and error paths of the measured
   *   operation: the failure is reported via console.error ('Operation failed: <description>
   *   threw: ...') and never displaces fn's result nor masks its original error.
   */
  static _runContainedStep(step, description) {
    try {
      return step();
    } catch (secondaryError) {
      console.error(`Operation failed: ${description} threw: ${String(secondaryError)}`);
      return null;
    }
  }

  /**
   * Resolve a lazy log-context supplier into structured context.
   *
   * Shared supplier-gating contract (stated once here; callers reference it briefly): suppliers
   * are invoked at most once per emission, only AFTER the caller's level or DEBUG gate has
   * passed and BEFORE formatMessage runs, so a gated-out supplier is never invoked and a
   * function context never reaches stringification unresolved.
   *
   * @param {Object|Function|null} context - Context object or zero-argument supplier function
   *   returning one.
   * @param {boolean} guardExceptions - True for timed operations, where a secondary failure must
   *   never displace the measured outcome; false for plain level logs, which protect no outcome.
   * @returns {Object|null} Resolved context ready for formatMessage; a non-function value,
   *   including null, passes through unchanged.
   * @throws {*} When guardExceptions is false a throwing supplier propagates unchanged (fail
   *   loud); when true, resolution failures are reported via console.error and null is
   *   returned instead, per the containment contract documented on _timeSync.
   */
  static _resolveTimingContext(context, guardExceptions) {
    if (typeof context !== 'function') {
      return context;
    }
    if (!guardExceptions) {
      return context();
    }
    try {
      return context();
    } catch (supplierError) {
      console.error(`Operation failed: timing context supplier threw: ${String(supplierError)}`);
      return null;
    }
  }

  /**
   * Emit the DEBUG record for one completed measurement through the standard debug pathway.
   * @param {string|null} component - Component name owning the record, or null for static use.
   * @param {string} label - Timed-operation label.
   * @param {Object|null} resolvedContext - Already-resolved context (never a function).
   * @param {number} durationMs - Measured duration in milliseconds; wins key collisions.
   * @returns {void}
   * @throws {*} When formatting fails (for example a circular context breaking JSON.stringify);
   *   the calling seam contains this via _runContainedStep.
   * @remarks The seam owns the [<Component>] prefix; formatMessage independently stamps its own
   *   wall-clock timestamp, which is why unit assertions target events rather than console lines.
   */
  static _emitTimingRecord(component, label, resolvedContext, durationMs) {
    const message = component === null ? `[TIMING] ${label}` : `[${component}] [TIMING] ${label}`;
    JDbLogger.debug(message, { ...resolvedContext, durationMs });
  }

  /**
   * Build the plain-object timing event delivered to every listener.
   * @param {string|null} component - Component name attributed to the event, or null.
   * @param {string} label - Timed-operation label.
   * @param {number} durationMs - Measured duration in milliseconds.
   * @param {number} end - END clock reading from which the timestamp derives.
   * @param {*} thrown - Throwable caught from the operation, or null on success.
   * @returns {{component: (string|null), label: string, durationMs: number, timestamp: string,
   *   error: (string|null)}} Event carrying exactly the contracted fields.
   * @remarks The resolved context is intentionally excluded from events (it appears only on the
   *   console record), and timestamp derives from the measured end value, unlike formatMessage.
   */
  static _buildTimingEvent(component, label, durationMs, end, thrown) {
    let errorMessage = null;
    if (thrown !== null) {
      errorMessage = thrown instanceof Error ? thrown.message : String(thrown);
    }
    return {
      component: component,
      label: label,
      durationMs: durationMs,
      timestamp: new Date(end).toISOString(),
      error: errorMessage
    };
  }

  /**
   * Dispatch one timing event to all registered listeners synchronously, in registration order.
   * @param {{component: (string|null), label: string, durationMs: number, timestamp: string,
   *   error: (string|null)}} event - Event delivered by reference to each listener.
   * @returns {void}
   * @remarks Delivery iterates a snapshot of the listener collection, so a listener
   *   unsubscribing mid-dispatch cannot skip those registered after it. Every listener is
   *   isolated on both paths: a throwing listener is reported via console.error and the
   *   remaining listeners still fire, so secondary failures can never displace the measured
   *   operation's outcome.
   */
  static _dispatchTimingEvent(event) {
    const listeners = Array.from(JDbLogger._timingListeners);
    for (const listenerFn of listeners) {
      try {
        listenerFn(event);
      } catch (listenerError) {
        console.error(`Operation failed: timing listener threw: ${String(listenerError)}`);
      }
    }
  }
}

// Initialise static properties after class declaration (GAS V8 does not support static class
// field declarations inside the class body).
JDbLogger.LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

JDbLogger.currentLevel = JDbLogger.LOG_LEVELS.DEBUG;

/**
 * Registered timing listeners in registration order (private static state). A Set preserves
 * insertion order for delivery while giving cheap idempotent removal.
 * @type {Set<Function>}
 */
JDbLogger._timingListeners = new Set();

/**
 * Depth of currently active timed measurements (private static re-entrancy flag). A positive
 * value triggers the stacked-timer short-circuit in _timeSync and is restored via try/finally.
 * @type {number}
 */
JDbLogger._measurementDepth = 0;

/**
 * Typed error raised for JDbLogger validation failures, exposed statically so consumers can
 * catch it while the logger itself stays dependency-free.
 * @type {typeof JDbLoggerError}
 */
JDbLogger.JDbLoggerError = JDbLoggerError;
