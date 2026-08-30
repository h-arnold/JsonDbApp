/* global JDbLogger */

/**
 * Shared helpers for the JDbLogger Vitest suites: teardown-safe capture registries,
 * throw-capture utilities, typed-error assertions, and failure-report filtering for the
 * execution-time logging facility's containment contract.
 */

import { captureTimingEvents } from './timing-capture-test-helpers.js';

/**
 * Creates a teardown-safe timing-capture registry for one suite file.
 *
 * Suites obtain captures exclusively through `startCapture` and flush them all in
 * `afterEach`; Vitest's `clearMocks` does not clear JDbLogger's static listener list,
 * so explicit unsubscription is what keeps suites independent.
 * @returns {{startCapture: Function, flushActiveCaptures: Function}} Registry providing
 *   capture handles plus a flush that unsubscribes every active capture exactly once.
 */
export const createCaptureRegistry = () => {
  const activeCaptures = [];

  /**
   * Starts a timing capture registered for teardown via flushActiveCaptures.
   * @param {Array<Object>} [targetEvents] - Optional shared collection array; passing one
   *   array to several captures lets tests observe the order in which listeners fire.
   * @returns {Object} Capture handle with collected events and an idempotent restore.
   */
  const startCapture = (targetEvents) => {
    const handle = captureTimingEvents(targetEvents);
    activeCaptures.push(handle);
    return handle;
  };

  /**
   * Restores every capture started through this registry.
   * @returns {void}
   */
  const flushActiveCaptures = () => {
    while (activeCaptures.length > 0) {
      activeCaptures.pop().restore();
    }
  };

  return { startCapture, flushActiveCaptures };
};

/**
 * Invokes an action and captures anything it throws.
 * @param {Function} action - Zero-argument thunk expected to throw.
 * @returns {*} The caught throwable, or null when the action returned normally.
 */
export const captureThrow = (action) => {
  try {
    action();
  } catch (error_) {
    return error_;
  }
  return null;
};

/**
 * Asserts a caught throwable is a JDbLoggerError following the standard message format.
 * @param {*} thrown - Caught value from captureThrow; null means nothing was thrown.
 * @returns {void}
 */
export const expectTypedFailure = (thrown) => {
  expect(JDbLogger.JDbLoggerError).toBeDefined();
  if (!thrown || typeof thrown.message !== 'string') {
    expect.unreachable(`expected a thrown JDbLoggerError but received: ${String(thrown)}`);
  }
  expect(thrown).toBeInstanceOf(JDbLogger.JDbLoggerError);
  expect(thrown.name).toBe('JDbLoggerError');
  expect(thrown.message.startsWith('Operation failed:')).toBe(true);
};

/**
 * Asserts a caught throwable is a JDbLoggerError carrying an exact message.
 * @param {*} thrown - Caught value from captureThrow.
 * @param {string} message - Exact expected message text.
 * @returns {void}
 */
export const expectTypedFailureWithMessage = (thrown, message) => {
  expectTypedFailure(thrown);
  expect(thrown.message).toBe(message);
};

/**
 * Collects console.error reports emitted after a baseline call count that follow the facility's
 * 'Operation failed:' reporting format, ignoring unrelated console noise from other layers.
 * @param {Object} errorSpy - Vitest spy installed over console.error.
 * @param {number} callsBefore - Baseline console.error call count recorded before acting.
 * @returns {Array<string>} New failure-report messages starting with the standard prefix.
 */
export const newFailureReports = (errorSpy, callsBefore) =>
  errorSpy.mock.calls
    .slice(callsBefore)
    .map((call) => call[0])
    .filter((text) => typeof text === 'string' && text.startsWith('Operation failed:'));
