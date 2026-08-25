/**
 * bench-harness.test.js - Deterministic unit coverage for the benchmark harness helpers.
 *
 * Covers the pure logic inside tools/benchmarks/bench.cjs: the timing-event aggregator
 * (including error-event handling), report summarisation/rendering, and the coordinated-write
 * scenario's preparation contract. The harness itself remains manual tooling outside CI;
 * these tests exercise its exported pure surface only and never run a benchmark.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  SCENARIOS,
  createTimingAggregator,
  renderScenarioTable,
  summariseLabelStats
} from '../../../tools/benchmarks/bench.cjs';
import { createIsolatedTestCollection } from '../../helpers/collection-test-helpers.js';

/** Label reused by aggregator-focused fixtures. */
const LABEL_A = 'collection.find';

/** Second label reused by aggregator-focused fixtures. */
const LABEL_B = 'masterIndex.save';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bench.cjs createTimingAggregator', () => {
  /**
   * Builds one timing-event fixture matching the JDbLogger listener contract.
   * @param {string} label - Timed-operation label.
   * @param {number} durationMs - Measured duration.
   * @param {(string|null)} error - Error string carried by failed operations, else null.
   * @returns {Object} Timing event shaped like the facility's dispatched events.
   */
  const buildEvent = (label, durationMs, error = null) => ({
    component: 'Test',
    label,
    durationMs,
    timestamp: new Date(0).toISOString(),
    error
  });

  it('commits buffered durations into accumulated totals per label', () => {
    // Arrange: one aggregator fed events for two labels
    const aggregator = createTimingAggregator();

    // Act: buffer and commit measured events
    aggregator.handleEvent(buildEvent(LABEL_A, 10));
    aggregator.handleEvent(buildEvent(LABEL_B, 20));
    aggregator.commitPending();
    aggregator.handleEvent(buildEvent(LABEL_A, 30));
    aggregator.commitPending();

    // Assert: totals accumulate across commits keyed by label
    expect(aggregator.snapshotTotals().get(LABEL_A)).toEqual([10, 30]);
    expect(aggregator.snapshotTotals().get(LABEL_B)).toEqual([20]);
  });

  it('grows the stored totals arrays in place so commits stay linear', () => {
    // Arrange: aggregator plus a held reference to one label's totals array
    const aggregator = createTimingAggregator();
    aggregator.handleEvent(buildEvent(LABEL_A, 10));
    aggregator.commitPending();
    const retainedTotals = aggregator.snapshotTotals().get(LABEL_A);

    // Act: commit another batch for the same label
    aggregator.handleEvent(buildEvent(LABEL_A, 20));
    aggregator.commitPending();

    // Assert: same array instance was extended (concat would have replaced it)
    expect(aggregator.snapshotTotals().get(LABEL_A)).toBe(retainedTotals);
    expect(retainedTotals).toEqual([10, 20]);
  });

  it('discards buffered durations before they are committed', () => {
    // Arrange: aggregator with uncommitted events
    const aggregator = createTimingAggregator();
    aggregator.handleEvent(buildEvent(LABEL_A, 10));

    // Act
    aggregator.discardPending();

    // Assert: nothing reached the totals
    aggregator.commitPending();
    expect(aggregator.snapshotTotals().size).toBe(0);
  });

  it('counts error-carrying events per label instead of aggregating their durations', () => {
    // Arrange: mixed success and failure events for one label
    const aggregator = createTimingAggregator();
    aggregator.handleEvent(buildEvent(LABEL_A, 10));
    aggregator.handleEvent(buildEvent(LABEL_A, 99, 'Operation failed: boom'));
    aggregator.handleEvent(buildEvent(LABEL_A, 30));

    // Act
    aggregator.commitPending();

    // Assert: only successful samples feed the statistics; failures are counted separately
    expect(aggregator.snapshotTotals().get(LABEL_A)).toEqual([10, 30]);
    expect(aggregator.snapshotErrorCounts().get(LABEL_A)).toBe(1);
  });

  it('accumulates committed error counts across commits', () => {
    // Arrange: aggregator fed failures across two measured passes
    const aggregator = createTimingAggregator();
    aggregator.handleEvent(buildEvent(LABEL_A, 11, 'Operation failed: first'));
    aggregator.commitPending();
    aggregator.handleEvent(buildEvent(LABEL_A, 12, 'Operation failed: second'));
    aggregator.commitPending();

    // Act
    const totalErrors = aggregator.snapshotErrorCounts().get(LABEL_A);

    // Assert: both failures counted; no duration samples leaked into totals
    expect(totalErrors).toBe(2);
    expect(aggregator.snapshotTotals().has(LABEL_A)).toBe(false);
  });

  it('discards pending error counts alongside pending durations', () => {
    // Arrange: failure buffered but never committed
    const aggregator = createTimingAggregator();
    aggregator.handleEvent(buildEvent(LABEL_A, 11, 'Operation failed: discarded'));

    // Act
    aggregator.discardPending();

    // Assert: neither statistics surface saw the event
    aggregator.commitPending();
    expect(aggregator.snapshotErrorCounts().size).toBe(0);
    expect(aggregator.snapshotTotals().size).toBe(0);
  });

  it('clears accumulated durations and error counts on resetTotals', () => {
    // Arrange: aggregator with committed successes and failures
    const aggregator = createTimingAggregator();
    aggregator.handleEvent(buildEvent(LABEL_A, 10));
    aggregator.handleEvent(buildEvent(LABEL_A, 11, 'Operation failed: boom'));
    aggregator.commitPending();

    // Act
    aggregator.resetTotals();

    // Assert: reset clears both maps
    expect(aggregator.snapshotTotals().size).toBe(0);
    expect(aggregator.snapshotErrorCounts().size).toBe(0);
  });

  it('returns snapshot copies that do not alias internal state', () => {
    // Arrange: aggregator with committed data
    const aggregator = createTimingAggregator();
    aggregator.handleEvent(buildEvent(LABEL_A, 10));
    aggregator.commitPending();

    // Act: mutate both snapshots
    aggregator.snapshotTotals().set(LABEL_B, [1]);
    aggregator.snapshotErrorCounts().set(LABEL_B, 7);

    // Assert: internals unaffected
    expect(aggregator.snapshotTotals().has(LABEL_B)).toBe(false);
    expect(aggregator.snapshotErrorCounts().has(LABEL_B)).toBe(false);
  });
});

describe('bench.cjs report surfacing of failed measurements', () => {
  it('reports errorCount per label alongside the duration statistics', () => {
    // Arrange: totals holding successes for one label and errors only for another
    const aggregator = createTimingAggregator();
    aggregator.handleEvent({
      component: 'Test',
      label: LABEL_A,
      durationMs: 10,
      timestamp: new Date(0).toISOString(),
      error: null
    });
    aggregator.handleEvent({
      component: 'Test',
      label: LABEL_B,
      durationMs: 5,
      timestamp: new Date(0).toISOString(),
      error: 'Operation failed: boom'
    });
    aggregator.commitPending();

    // Act
    const summaries = summariseLabelStats(
      aggregator.snapshotTotals(),
      aggregator.snapshotErrorCounts()
    );

    // Assert: every observed label appears, carrying its own error count
    expect(summaries).toHaveLength(2);
    const successful = summaries.find((summary) => summary.label === LABEL_A);
    const failed = summaries.find((summary) => summary.label === LABEL_B);
    expect(successful.count).toBe(1);
    expect(successful.errorCount).toBe(0);
    expect(failed.count).toBe(0);
    expect(failed.errorCount).toBe(1);
    expect(failed.minMs).toBeNull();
    expect(failed.maxMs).toBeNull();
    expect(failed.meanMs).toBeNull();
  });

  it('renders an errors column so failures cannot inflate statistics silently', () => {
    // Arrange: one summary row with a non-zero error count
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act
    renderScenarioTable([
      { label: LABEL_A, count: 2, minMs: 1, maxMs: 3, meanMs: 2, errorCount: 1 }
    ]);

    // Assert: header and row expose the error count, ordered after the mean column
    const printedLines = logSpy.mock.calls.map((call) => call.join(' '));
    const headerLine = printedLines[0];
    const dataLine = printedLines[1];
    expect(headerLine).toContain('Errors');
    expect(headerLine.indexOf('Errors')).toBeGreaterThan(headerLine.indexOf('Mean (ms)'));
    expect(dataLine).toContain('1');
  });
});

describe('bench.cjs coordinated-write scenario preparation', () => {
  /**
   * Locates the coordinated-write scenario definition.
   * @returns {Object} The scenario under test.
   */
  const findCoordinatedWriteScenario = () =>
    SCENARIOS.find((scenario) => scenario.name === 'coordinated write through coordinate');

  it('clears previously inserted markers so each iteration persists comparable work', () => {
    // Arrange: real isolated collection driven through the scenario's state shape
    const { collection } = createIsolatedTestCollection('bench-marker-scenario');
    const scenario = findCoordinatedWriteScenario();
    const state = { collection: collection, fileId: 'unused' };
    const markerName = 'coordinated-write-marker';

    // Act: simulate two measured iterations whose prepare phases ran back to back
    scenario.prepare(state);
    scenario.prepare(state);

    // Assert: markers never accumulate; exactly one fresh marker exists
    expect(collection.countDocuments({ name: markerName })).toBe(1);
  });

  it('keeps the deletion in the unmeasured prepare phase and saves alone in measure', () => {
    // Arrange: recording stub isolating which operations each phase performs
    const scenario = findCoordinatedWriteScenario();
    const calls = [];
    const state = {
      collection: {
        /**
         * Records a deleteMany call.
         * @param {Object} filter - Deletion filter.
         * @returns {void}
         */
        deleteMany: (filter) => calls.push(['deleteMany', filter]),
        /**
         * Records an insertOne call.
         * @param {Object} document - Inserted document.
         * @returns {void}
         */
        insertOne: (document) => calls.push(['insertOne', document]),
        /**
         * Records a save call.
         * @returns {void}
         */
        save: () => calls.push(['save'])
      }
    };

    // Act
    scenario.prepare(state);
    scenario.measure(state);

    // Assert: prepare clears then re-inserts; measure only persists
    expect(calls).toEqual([
      ['deleteMany', { name: 'coordinated-write-marker' }],
      ['insertOne', { name: 'coordinated-write-marker' }],
      ['save']
    ]);
  });
});
