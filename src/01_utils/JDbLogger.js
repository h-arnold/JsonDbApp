/**
 * JDbLogger - Provides standardized logging functionality for GAS DB
 *
 * This class provides different log levels and formats messages consistently
 * across the entire library. Designed to work with Google Apps Script's
 * console logging capabilities. Also provides an execution-time logging
 * facility (`timeSync`) that measures synchronous operations and delivers
 * structured timing events to registered listeners.
 */
class JDbLogger {
  /**
   * Set the current logging level by name
   * @param {string} levelName - The log level name (ERROR, WARN, INFO, DEBUG)
   */
  static setLevelByName(levelName) {
    const level = JDbLogger.LOG_LEVELS[levelName.toUpperCase()];
    if (level !== undefined) {
      JDbLogger.currentLevel = level;
    } else {
      throw new Error(`Invalid log level name: ${levelName}`);
    }
  }

  /**
   * Format a log message with timestamp and level
   * @param {string} level - The log level name
   * @param {string} message - The message to log
   * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
   *   supplier function returning one; suppliers are normally resolved by callers before
   *   formatMessage runs, so function acceptance here is defensive only.
   * @returns {string} Formatted log message
   */
  static formatMessage(level, message, context = null) {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level}] ${message}`;

    if (context) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }

    return formatted;
  }

  /**
   * Resolve a lazy log-context supplier immediately before formatting.
   * @param {Object|Function|null} context - Context object or zero-argument supplier function
   *   returning one.
   * @returns {Object|null} Resolved context ready for formatMessage; a non-function value,
   *   including null, passes through unchanged.
   * @throws {*} When a supplied function throws; plain level logs have no operation error to
   *   protect, so the exception propagates unchanged (fail loud).
   * @remarks Callers invoke this only AFTER their level check has passed and BEFORE formatMessage,
   *   so a gated-out supplier is never called and a function context never reaches stringification
   *   unresolved. Shares the unguarded resolution semantics of _resolveTimingContext without its
   *   error-path guarding, which only applies to timed operations.
   */
  static _resolveLevelContext(context) {
    return typeof context === 'function' ? context() : context;
  }

  /**
   * Log an error message
   * @param {string} message - The error message
   * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
   *   supplier function returning one.
   * @remarks The supplier is resolved only after the level check passes and before formatMessage
   *   runs, so a gated-out supplier is never invoked and a function context never reaches
   *   stringification. A throwing supplier propagates unchanged (fail loud).
   */
  static error(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.ERROR) {
      const resolvedContext = JDbLogger._resolveLevelContext(context);
      const formatted = JDbLogger.formatMessage('ERROR', message, resolvedContext);
      console.error(formatted);
    }
  }

  /**
   * Log a warning message
   * @param {string} message - The warning message
   * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
   *   supplier function returning one.
   * @remarks The supplier is resolved only after the level check passes and before formatMessage
   *   runs, so a gated-out supplier is never invoked and a function context never reaches
   *   stringification. A throwing supplier propagates unchanged (fail loud).
   */
  static warn(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.WARN) {
      const resolvedContext = JDbLogger._resolveLevelContext(context);
      const formatted = JDbLogger.formatMessage('WARN', message, resolvedContext);
      console.warn(formatted);
    }
  }

  /**
   * Log an info message
   * @param {string} message - The info message
   * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
   *   supplier function returning one.
   * @remarks The supplier is resolved only after the level check passes and before formatMessage
   *   runs, so a gated-out supplier is never invoked and a function context never reaches
   *   stringification. A throwing supplier propagates unchanged (fail loud).
   */
  static info(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.INFO) {
      const resolvedContext = JDbLogger._resolveLevelContext(context);
      const formatted = JDbLogger.formatMessage('INFO', message, resolvedContext);
      console.log(formatted);
    }
  }

  /**
   * Log a debug message
   * @param {string} message - The debug message
   * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
   *   supplier function returning one.
   * @remarks The supplier is resolved only after the level check passes and before formatMessage
   *   runs, so a gated-out supplier is never invoked and a function context never reaches
   *   stringification. A throwing supplier propagates unchanged (fail loud).
   */
  static debug(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.DEBUG) {
      const resolvedContext = JDbLogger._resolveLevelContext(context);
      const formatted = JDbLogger.formatMessage('DEBUG', message, resolvedContext);
      console.log(formatted);
    }
  }

  /**
   * Create a logger instance for a specific component
   * @param {string} component - The component name
   * @returns {Object} Component-specific logger
   */
  static createComponentLogger(component) {
    return {
      /**
       * Log an error message for this component.
       * @param {string} message - Message to record.
       * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
       *   supplier function returning one; forwarded uninvoked, so gating stays owned by the
       *   static method.
       */
      error: (message, context = null) => {
        JDbLogger.error(`[${component}] ${message}`, context);
      },
      /**
       * Log a warning for this component.
       * @param {string} message - Message to record.
       * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
       *   supplier function returning one; forwarded uninvoked, so gating stays owned by the
       *   static method.
       */
      warn: (message, context = null) => {
        JDbLogger.warn(`[${component}] ${message}`, context);
      },
      /**
       * Log informational details for this component.
       * @param {string} message - Message to record.
       * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
       *   supplier function returning one; forwarded uninvoked, so gating stays owned by the
       *   static method.
       */
      info: (message, context = null) => {
        JDbLogger.info(`[${component}] ${message}`, context);
      },
      /**
       * Log verbose debug details for this component.
       * @param {string} message - Message to record.
       * @param {Object|Function|null} [context=null] - Optional structured context object or lazy
       *   supplier function returning one; forwarded uninvoked, so gating stays owned by the
       *   static method.
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
       * @param {Object|Function|null} [context=null] - Structured context object or lazy supplier
       *   function returning one; omitted or undefined contexts are normalised to null.
       * @returns {*} The value returned by fn, passed through unchanged.
       * @throws {Error} When arguments are invalid before any timing starts (same rules as the
       *   static form).
       * @remarks Full delegation to the _timeSync seam (SPEC §4.2): every behavioural rule —
       *   component attribution, label handling, DEBUG gating, exception asymmetry, console
       *   prefixing — is seam-owned; this closure only supplies the component name directly to
       *   _timeSync so static and component use cannot drift apart.
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
   *   function returning one; omitted or undefined contexts are normalised to null.
   * @returns {*} The value returned by fn, passed through unchanged.
   * @throws {Error} When validation fails before any timing starts: label must be a non-empty
   *   string, fn must be a function, and context must be an object, a function, or null. Plain
   *   Errors are thrown so JDbLogger stays dependency-free (no ErrorHandler reference).
   * @remarks Public entry point; delegates to _timeSync with component = null so static use and
   *   component-logger use share every behavioural rule implemented in the seam.
   */
  static timeSync(label, fn, context = null) {
    return JDbLogger._timeSync(null, label, fn, context);
  }

  /**
   * Register a listener that receives every emitted timing event synchronously.
   * @param {Function} listenerFn - Callback invoked with each plain-object timing event.
   * @returns {Function} Unsubscribe closure; calling it more than once is safe (idempotent).
   * @throws {Error} When listenerFn is not a function (fail fast, plain Error).
   * @remarks Listeners fire in registration order and receive the same event object per emission.
   */
  static addTimingListener(listenerFn) {
    if (typeof listenerFn !== 'function') {
      throw new Error('Operation failed: listenerFn must be a function');
    }

    JDbLogger._timingListeners.push(listenerFn);

    let unsubscribed = false;

    /**
     * Remove the registered listener exactly once; repeat calls do nothing.
     * @returns {void}
     */
    const unsubscribe = () => {
      if (unsubscribed) {
        return;
      }
      unsubscribed = true;
      const index = JDbLogger._timingListeners.indexOf(listenerFn);
      if (index >= 0) {
        JDbLogger._timingListeners.splice(index, 1);
      }
    };

    return unsubscribe;
  }

  /**
   * Internal seam implementing every behavioural rule of the timing facility; both entry points
   * (static timeSync and component loggers) delegate here so behaviour cannot drift apart.
   * @param {string|null} component - Component name owning the record, or null for static use.
   * @param {string} label - Non-empty label identifying the timed operation.
   * @param {Function} fn - Zero-argument operation to execute and measure.
   * @param {Object|Function|null} context - Structured context object or lazy supplier function;
   *   undefined is normalised to null first so context-less calls never throw.
   * @returns {*} The value returned by fn, unchanged.
   * @throws {Error} When arguments are invalid (validated before any timing starts).
   * @remarks Exception asymmetry by design: on the SUCCESS path listener and supplier exceptions
   *   propagate unchanged (fail loud); on the ERROR path dispatch and supplier resolution are
   *   guarded per call (reported via console.error) so secondary failures can never mask the
   *   original operation error, which always reaches the caller with its identity preserved.
   *   Measurement precedes the DEBUG gate so both clock reads occur on every call (SPEC §3).
   */
  static _timeSync(component, label, fn, context) {
    if (context === undefined) {
      context = null;
    }
    JDbLogger._validateTimingArguments(label, fn, context);

    // Measurement runs unconditionally first so both _now() reads occur on every call regardless
    // of the DEBUG gate below (SPEC §3 accepted measurement tax).
    const measurement = JDbLogger._measureTimedOperation(fn);

    // DEBUG gate. When suppressed the measured outcome passes straight through: no supplier
    // resolution, no formatting, no console output, no dispatch, and a function context is never
    // invoked.
    if (JDbLogger.currentLevel < JDbLogger.LOG_LEVELS.DEBUG) {
      if (measurement.error !== null) {
        throw measurement.error;
      }
      return measurement.result;
    }

    const durationMs = measurement.end - measurement.start;
    const errorPath = measurement.error !== null;
    const resolvedContext = JDbLogger._resolveTimingContext(context, errorPath);

    JDbLogger._emitTimingRecord(component, label, resolvedContext, durationMs);

    const event = JDbLogger._buildTimingEvent(
      component,
      label,
      durationMs,
      measurement.end,
      measurement.error
    );

    if (errorPath) {
      // ERROR path: guarded dispatch keeps secondary listener failures from masking the original
      // operation error, which is rethrown unchanged below.
      JDbLogger._dispatchTimingEvent(event, true);
      throw measurement.error;
    }

    // SUCCESS path: listeners receive the same event object in registration order and their
    // exceptions propagate unchanged (fail loud).
    JDbLogger._dispatchTimingEvent(event, false);
    return measurement.result;
  }

  /**
   * Validate timing arguments before any measurement starts.
   * @param {string} label - Label claimed for the timed operation.
   * @param {Function} fn - Operation claimed for measurement.
   * @param {Object|Function|null} context - Context claim after undefined-normalisation.
   * @throws {Error} With a plain 'Operation failed: ...' message naming the offending argument.
   * @remarks Plain Errors keep JDbLogger dependency-free (no ErrorHandler load-order coupling),
   *   consistent with setLevelByName.
   */
  static _validateTimingArguments(label, fn, context) {
    if (typeof label !== 'string' || label.length === 0) {
      throw new Error('Operation failed: label must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new Error('Operation failed: fn must be a function');
    }
    if (context !== null && typeof context !== 'object' && typeof context !== 'function') {
      throw new Error('Operation failed: context must be an object, a function, or null');
    }
  }

  /**
   * Execute the wrapped operation exactly once between two clock reads taken through _now().
   * @param {Function} fn - Operation to execute and bracket with clock reads.
   * @returns {{start: number, result: *, error: *, end: number}} Measurement outcome holding both
   *   clock reads plus exactly one meaningful outcome field: result when fn succeeded, otherwise
   *   the caught throwable (result is then null).
   * @remarks The caught throwable is preserved untouched — identity included — so callers can
   *   rethrow the original error verbatim after emission.
   */
  static _measureTimedOperation(fn) {
    const start = JDbLogger._now();
    let result = null;
    let error = null;
    try {
      result = fn();
    } catch (caught) {
      error = caught;
    }
    const end = JDbLogger._now();
    return { start, result, error, end };
  }

  /**
   * Resolve the timing context at most once, after the measured operation has finished.
   * @param {Object|Function|null} context - Context object or zero-argument supplier function.
   * @param {boolean} guardExceptions - True on the operation error path, where a failing supplier
   *   must not mask the original error.
   * @returns {Object|null} Resolved context, or null when guarded resolution failed.
   * @throws {*} On the unguarded (success) path a throwing supplier propagates, aborting the call
   *   after fn has already run so its return value is lost (intended fail-loud behaviour).
   * @remarks Resolution order is post-gate-check and pre-formatMessage; a function context never
   *   reaches formatting unresolved.
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
   * @returns {{component: (string|null), label: string, durationMs: number, timestamp: string, error: (string|null)}} Event carrying exactly the contracted fields.
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
   * @param {{component: (string|null), label: string, durationMs: number, timestamp: string, error: (string|null)}} event - Event delivered by reference to each listener.
   * @param {boolean} guardExceptions - True on the operation error path, where each listener is
   *   isolated from the others.
   * @remarks Asymmetric by design: on the success path a throwing listener propagates immediately
   *   to the caller (fail loud); on the error path a throwing listener is reported via
   *   console.error and remaining listeners still fire, so the original operation error always
   *   wins.
   */
  static _dispatchTimingEvent(event, guardExceptions) {
    JDbLogger._timingListeners.forEach((listenerFn) => {
      if (!guardExceptions) {
        listenerFn(event);
        return;
      }
      try {
        listenerFn(event);
      } catch (listenerError) {
        console.error(`Operation failed: timing listener threw: ${String(listenerError)}`);
      }
    });
  }

  /**
   * Internal clock seam returning the current wall-clock time.
   * @returns {number} Milliseconds elapsed since the Unix epoch.
   * @remarks Sole clock source of the timing facility; tests substitute Date.now via the mock
   *   clock helper rather than replacing this seam.
   */
  static _now() {
    return Date.now();
  }
}

// initialise static properties after class declaration
JDbLogger.LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

JDbLogger.currentLevel = JDbLogger.LOG_LEVELS.DEBUG;

/**
 * Registered timing listeners in registration order (private static state).
 * @type {Array<Function>}
 */
JDbLogger._timingListeners = [];
