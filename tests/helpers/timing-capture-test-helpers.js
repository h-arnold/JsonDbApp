/* global JDbLogger */

/**
 * Timing capture helper for JDbLogger timing-event assertions.
 *
 * Every timing test must obtain its listeners exclusively through
 * `captureTimingEvents()` and call `restore()` in `afterEach`: Vitest's
 * `clearMocks` does not clear `JDbLogger`'s static listener list, so explicit
 * unsubscription is what keeps suites independent.
 */

/**
 * Registers a single JDbLogger timing listener that records every event it receives.
 *
 * `JDbLogger` is a global loaded by the GAS mocks setup and is referenced directly
 * (no import) so the helper exercises the same global surface as production code.
 * @param {Array<Object>} [targetEvents=[]] - Optional shared collection array. Passing one
 *   array to several concurrent captures lets tests observe the order in which the
 *   registered listeners fire, because each listener appends to the same buffer.
 * @returns {{events: Array<Object>, restore: Function}} Capture handle providing the
 *   collected events and an idempotent `restore()` that unsubscribes the listener.
 */
export const captureTimingEvents = (targetEvents = []) => {
  /**
   * Listener recording every timing event dispatched by JDbLogger.
   * @param {Object} event - Timing event received from JDbLogger.
   * @returns {void}
   */
  const listenerFn = (event) => {
    targetEvents.push(event);
  };

  const unsubscribe = JDbLogger.addTimingListener(listenerFn);

  return {
    /**
     * Collected timing events in dispatch order.
     * @type {Array<Object>}
     */
    events: targetEvents,

    /**
     * Unsubscribes the listener registered by this capture. Safe to call more than
     * once because JDbLogger's returned unsubscribe closure is idempotent.
     * @returns {void}
     */
    restore() {
      unsubscribe();
    }
  };
};

/**
 * Selects captured timing events whose label exactly matches the given value.
 * @param {Array<Object>} events - Captured timing events.
 * @param {string} label - Exact event label to select.
 * @returns {Array<Object>} Events carrying the requested label.
 */
export const eventsWithLabel = (events, label) => events.filter((event) => event.label === label);

/**
 * Asserts that every required label was emitted at least once among the
 * captured events, naming the missing label and the captured alternatives on
 * failure so red-phase gaps are directly attributable.
 * @param {Array<Object>} events - Captured timing events.
 * @param {Array<string>} requiredLabels - Labels that must have been emitted.
 * @returns {void}
 */
export const expectLabelsPresent = (events, requiredLabels) => {
  const capturedLabels = events.map((event) => event.label);
  for (const label of requiredLabels) {
    expect(
      capturedLabels.includes(label),
      `expected a "${label}" timing event; captured labels: [${capturedLabels.join(', ')}]`
    ).toBe(true);
  }
};
