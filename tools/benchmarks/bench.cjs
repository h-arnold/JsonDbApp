/**
 * bench.cjs - Execution-time benchmark harness for JsonDbApp.
 *
 * Manual developer tooling, run through `npm run bench`. It boots the full legacy src surface
 * over the mocked GAS services inside an OS-temporary Drive root, seeds one collection
 * deterministically, then measures each scenario THROUGH the JDbLogger timing facility itself:
 * a registered timing listener aggregates real facility events per label, so reported figures
 * cover the whole instrumented pathway instead of re-measuring wall-clock snippets locally.
 *
 * Mutating scenarios re-establish their preconditions before EVERY measured iteration; events
 * emitted during precondition work are discarded so only the measured body contributes to each
 * label's statistics. Events reporting a failed operation (an error-carrying event) are counted
 * per label in the report's errors column instead of inflating the duration statistics. Every
 * scenario performs one unmeasured warm-up pass first. The exit code is 0 for any completed run
 * regardless of measurement variance; setup failures throw (fail fast). Not wired into Vitest
 * or CI.
 *
 * Environment overrides: `BENCH_DOCS` (default 200) seeds the collection; `BENCH_ITERATIONS`
 * (default 5) sets the measured iteration count per scenario. Both must be positive integers.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createGasMocks } = require('../gas-mocks/gas-mocks.cjs');
const { assignGlobalServices, loadLegacyScript } = require('../gas-mocks/legacy-boot.cjs');
const { legacyScripts } = require('../gas-mocks/script-order.cjs');

/** Bench-only addition appended after the shared manifest (`src/04_core/99_PublicAPI.js`). */
const PUBLIC_API_SCRIPT = 'src/04_core/99_PublicAPI.js';

/** Prefix for the OS-temporary Drive root directory created per run. */
const TEMP_ROOT_PREFIX = 'jsondb-bench-';

/** Script-properties file name placed inside the temporary Drive root. */
const PROPERTIES_FILE_NAME = 'bench-script-properties.json';

/** Name of the single collection under benchmark. */
const BENCH_COLLECTION_NAME = 'benchmark_collection';

/** Master-index key scoped to the bench so runs stay isolated from any persisted state. */
const BENCH_MASTER_INDEX_KEY = 'GASDB_BENCH_MASTER_INDEX';

/** Logger level required for timing-listener dispatch (the facility's DEBUG gate). */
const LOG_LEVEL_DEBUG = 'DEBUG';

/** Environment variable overriding the seeded document count. */
const ENV_BENCH_DOCS = 'BENCH_DOCS';

/** Environment variable overriding the measured iteration count per scenario. */
const ENV_BENCH_ITERATIONS = 'BENCH_ITERATIONS';

/** Default seeded document count when BENCH_DOCS is unset. */
const DEFAULT_BENCH_DOCS = 200;

/** Default measured iteration count per scenario when BENCH_ITERATIONS is unset. */
const DEFAULT_BENCH_ITERATIONS = 5;

/** Radix used when parsing integer environment overrides. */
const RADIX_DECIMAL = 10;

/** Inclusive lower bound accepted for both environment overrides. */
const MINIMUM_SETTING_VALUE = 1;

/** Number of distinct group values spread across seeded documents. */
const GROUP_COUNT = 10;

/** Modulus used to derive the boolean `active` field deterministically. */
const EVEN_MODULUS = 2;

/** Step applied to each document index before clamping into the score span. */
const SCORE_STEP = 37;

/** Exclusive upper bound for deterministic score values. */
const SCORE_SPAN = 1000;

/** Modulus selecting the small flagged batch exercised by updateMany. */
const FLAGGED_DOC_MODULUS = 25;

/** Group value targeted by the filtered findOne scenario. */
const FIND_ONE_GROUP_NAME = 'group-3';

/** Group value targeted by the countDocuments scenario. */
const COUNT_GROUP_NAME = 'group-7';

/** Seeded document updated by the single-document operator-update scenario. */
const TARGET_DOC_NAME = 'user-0';

/** Size of the disposable batch inserted before each deleteMany measurement. */
const DELETE_BATCH_SIZE = 5;

/** Cached readFile calls performed inside one measured iteration. */
const READ_REPEATS_PER_ITERATION = 5;

/** Name given to marker documents whose insert makes each coordinated write dirty. */
const COORDINATED_WRITE_MARKER_NAME = 'coordinated-write-marker';

/** Decimal places shown for millisecond figures in the report. */
const MS_PRECISION_DIGITS = 3;

/** Placeholder printed for duration statistics a label cannot have (no successful samples). */
const MISSING_VALUE_PLACEHOLDER = '-';

/** Separator between aligned table columns. */
const COLUMN_SEPARATOR = '   ';

/** Column headings of the per-scenario statistics table. */
const TABLE_HEADERS = ['Label', 'Count', 'Min (ms)', 'Max (ms)', 'Mean (ms)', 'Errors'];

/**
 * Scenario definitions. Each `measure` body is the measured work; an optional `prepare`
 * re-establishes preconditions before every measured iteration (its timing events are
 * discarded). Read-only scenarios share the seeded state across iterations and therefore
 * declare no `prepare`.
 */
const SCENARIOS = [
  {
    /**
     * Measures a full-collection scan through `collection.find`.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    measure(state) {
      state.collection.find({});
    },
    /** Scenario name shown in the report. */
    name: 'full find'
  },
  {
    /**
     * Measures a filtered single-document lookup through `collection.findOne`.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    measure(state) {
      state.collection.findOne({ group: FIND_ONE_GROUP_NAME });
    },
    /** Scenario name shown in the report. */
    name: 'filtered findOne'
  },
  {
    /**
     * Measures a filtered count through `collection.countDocuments`.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    measure(state) {
      state.collection.countDocuments({ group: COUNT_GROUP_NAME });
    },
    /** Scenario name shown in the report. */
    name: 'countDocuments'
  },
  {
    /**
     * Re-seeds the flagged batch's mutable field to its baseline so every measured iteration
     * applies operators to a full match set instead of drifting towards a no-op.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    prepare(state) {
      state.collection.updateMany({ flagged: true }, { $set: { tweaks: 0 } });
    },
    /**
     * Measures `collection.updateMany` applying `$inc` across the small flagged batch.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    measure(state) {
      state.collection.updateMany({ flagged: true }, { $inc: { tweaks: 1 } });
    },
    /** Scenario name shown in the report. */
    name: 'updateMany over a small matched batch'
  },
  {
    /**
     * Re-inserts the disposable batch removed by the previous measured deleteMany so every
     * measured iteration deletes a full batch again.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    prepare(state) {
      insertDisposableBatch(state);
    },
    /**
     * Measures `collection.deleteMany` removing the small disposable batch.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    measure(state) {
      state.collection.deleteMany({ disposable: true });
    },
    /** Scenario name shown in the report. */
    name: 'deleteMany over a small matched batch'
  },
  {
    /**
     * Resets the target document's counter to its baseline so the measured `$inc` always
     * performs real operator work on a live document.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    prepare(state) {
      state.collection.updateOne({ name: TARGET_DOC_NAME }, { $set: { counter: 0 } });
    },
    /**
     * Measures a single-document operator update through `collection.updateOne`.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    measure(state) {
      state.collection.updateOne({ name: TARGET_DOC_NAME }, { $inc: { counter: 1 } });
    },
    /** Scenario name shown in the report. */
    name: 'single-document operator update'
  },
  {
    /**
     * Measures repeated cached reads through `fileService.readFile`; the warm-up pass primes
     * the FileService cache so every measured call takes the cached pathway.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    measure(state) {
      const fileService = state.collection.getFileService();
      for (let repeat = 0; repeat < READ_REPEATS_PER_ITERATION; repeat += 1) {
        fileService.readFile(state.fileId);
      }
    },
    /** Scenario name shown in the report. */
    name: 'repeated cached readFile'
  },
  {
    /**
     * Clears any marker document left by a previous iteration before inserting the fresh one
     * so every measured coordinated write persists comparable work; without the delete the
     * markers would accumulate and inflate later saves. Both operations run in the unmeasured
     * preparation phase.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    prepare(state) {
      state.collection.deleteMany({ name: COORDINATED_WRITE_MARKER_NAME });
      state.collection.insertOne({ name: COORDINATED_WRITE_MARKER_NAME });
    },
    /**
     * Measures one coordinated write through `collection.save` (lock acquisition, persistence,
     * and master-index metadata update).
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    measure(state) {
      state.collection.save();
    },
    /** Scenario name shown in the report. */
    name: 'coordinated write through coordinate'
  }
];

/**
 * Creates the OS-temporary mock Drive, loads every legacy script in manifest order, publishes
 * the global services, and appends the public API script LAST.
 * @returns {string} Path of the temporary Drive root (caller owns cleanup).
 */
function initialiseMockDrive() {
  const driveRoot = fs.mkdtempSync(path.join(os.tmpdir(), TEMP_ROOT_PREFIX));
  const gasMocks = createGasMocks({
    driveRoot: driveRoot,
    propertiesFile: path.join(driveRoot, PROPERTIES_FILE_NAME)
  });
  legacyScripts.forEach(loadLegacyScript);
  assignGlobalServices(gasMocks);
  loadLegacyScript(PUBLIC_API_SCRIPT);
  return driveRoot;
}

/**
 * Derives the database root folder identifier from the mock instance itself so the configured
 * folder is guaranteed to resolve under the mock's driveRoot.
 * @returns {string} Root folder identifier.
 * @throws {Error} When the identifier cannot be resolved (fail fast).
 */
function resolveRootFolderId() {
  const rootFolderId = globalThis.DriveApp.getRootFolder().getId();
  if (typeof rootFolderId !== 'string' || rootFolderId.length === 0) {
    throw new Error('Operation failed: could not resolve rootFolderId from the mock DriveApp');
  }
  return rootFolderId;
}

/**
 * Builds the database configuration used for the benchmark run.
 * @param {string} rootFolderId - Root folder identifier derived from the mock DriveApp.
 * @returns {Object} Configuration consumed by `createAndInitialiseDatabase`.
 * @remarks logLevel DEBUG is REQUIRED: the timing facility dispatches listener events only when
 *   the logger passes the DEBUG gate, and this harness measures exclusively through those events.
 */
function buildDatabaseConfig(rootFolderId) {
  return {
    rootFolderId: rootFolderId,
    masterIndexKey: BENCH_MASTER_INDEX_KEY,
    logLevel: LOG_LEVEL_DEBUG
  };
}

/**
 * Reads and validates a positive-integer environment override.
 * @param {Object} environment - Environment-like mapping (normally `process.env`).
 * @param {string} settingName - Environment variable name.
 * @param {number} fallbackValue - Value used when the variable is unset.
 * @returns {number} Validated setting value.
 * @throws {Error} When the variable is set but is not a positive integer (fail fast).
 */
function readPositiveIntegerSetting(environment, settingName, fallbackValue) {
  const rawValue = environment[settingName];
  if (rawValue === undefined) {
    return fallbackValue;
  }
  const parsedValue = Number.parseInt(rawValue, RADIX_DECIMAL);
  if (!Number.isInteger(parsedValue) || parsedValue < MINIMUM_SETTING_VALUE) {
    throw new Error(
      `Operation failed: ${settingName} must be a positive integer (received '${rawValue}')`
    );
  }
  return parsedValue;
}

/**
 * Reads the benchmark run settings, honouring both environment overrides.
 * @param {Object} environment - Environment-like mapping (normally `process.env`).
 * @returns {{documentCount: number, iterations: number}} Validated run settings.
 */
function readSettings(environment) {
  return {
    documentCount: readPositiveIntegerSetting(environment, ENV_BENCH_DOCS, DEFAULT_BENCH_DOCS),
    iterations: readPositiveIntegerSetting(
      environment,
      ENV_BENCH_ITERATIONS,
      DEFAULT_BENCH_ITERATIONS
    )
  };
}

/**
 * Builds one deterministic seed document from its index.
 * @param {number} index - Zero-based seed position.
 * @returns {Object} Seed document with stable field values.
 */
function buildBenchmarkDocument(index) {
  return {
    name: `user-${index}`,
    group: `group-${index % GROUP_COUNT}`,
    score: (index * SCORE_STEP) % SCORE_SPAN,
    active: index % EVEN_MODULUS === 0,
    flagged: index % FLAGGED_DOC_MODULUS === 0
  };
}

/**
 * Seeds the collection deterministically via the public insert pathway.
 * @param {Object} collection - Collection instance under benchmark.
 * @param {number} documentCount - Number of documents to seed.
 * @returns {void}
 */
function seedCollection(collection, documentCount) {
  for (let index = 0; index < documentCount; index += 1) {
    collection.insertOne(buildBenchmarkDocument(index));
  }
}

/**
 * Re-inserts the disposable batch consumed by the deleteMany scenario.
 * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
 * @returns {void}
 */
function insertDisposableBatch(state) {
  for (let position = 0; position < DELETE_BATCH_SIZE; position += 1) {
    state.collection.insertOne({ disposable: true });
  }
}

/**
 * Decides whether one timing event reports a failed operation rather than a successful
 * measurement.
 * @param {{error: (string|null)}} event - Timing event emitted by JDbLogger.
 * @returns {boolean} True when the event carries an operation error.
 */
function isFailedOperationEvent(event) {
  return event.error !== null && event.error !== undefined;
}

/**
 * Creates the timing-event aggregator backing the harness. Events land in a pending buffer;
 * callers discard precondition events and commit measured events, so per-label statistics
 * accumulate across iterations while preparation costs stay excluded. Events carrying an
 * operation error are never aggregated into the duration statistics; they are counted per
 * label instead and surfaced through the report's errors column.
 * @returns {Object} Aggregator exposing handleEvent, discardPending, commitPending,
 *   snapshotTotals, snapshotErrorCounts, and resetTotals.
 */
function createTimingAggregator() {
  const pendingByLabel = new Map();
  const pendingErrorCountsByLabel = new Map();
  const totalDurationsByLabel = new Map();
  const totalErrorCountsByLabel = new Map();

  return {
    /**
     * Receives one timing event dispatched by the facility. Error-carrying events increment
     * their label's pending error count; successful events buffer their duration.
     * @param {{label: string, durationMs: number, error: (string|null)}} event - Timing event
     *   emitted by JDbLogger.
     * @returns {void}
     */
    handleEvent(event) {
      if (isFailedOperationEvent(event)) {
        const existingCount = pendingErrorCountsByLabel.has(event.label)
          ? pendingErrorCountsByLabel.get(event.label)
          : 0;
        pendingErrorCountsByLabel.set(event.label, existingCount + 1);
        return;
      }
      if (!pendingByLabel.has(event.label)) {
        pendingByLabel.set(event.label, []);
      }
      pendingByLabel.get(event.label).push(event.durationMs);
    },

    /**
     * Discards buffered events (warm-up and precondition phases).
     * @returns {void}
     */
    discardPending() {
      pendingByLabel.clear();
      pendingErrorCountsByLabel.clear();
    },

    /**
     * Commits buffered measured events into the accumulated totals. Durations are pushed
     * into the stored arrays in place so repeated commits stay linear in buffered size.
     * @returns {void}
     */
    commitPending() {
      for (const [label, durations] of pendingByLabel) {
        const existing = totalDurationsByLabel.has(label) ? totalDurationsByLabel.get(label) : [];
        existing.push(...durations);
        totalDurationsByLabel.set(label, existing);
      }
      for (const [label, errorCount] of pendingErrorCountsByLabel) {
        const existingCount = totalErrorCountsByLabel.has(label)
          ? totalErrorCountsByLabel.get(label)
          : 0;
        totalErrorCountsByLabel.set(label, existingCount + errorCount);
      }
      pendingByLabel.clear();
      pendingErrorCountsByLabel.clear();
    },

    /**
     * Returns a copy of the accumulated totals keyed by label.
     * @returns {Map<string, number[]>} Durations observed per label.
     */
    snapshotTotals() {
      return new Map(totalDurationsByLabel);
    },

    /**
     * Returns a copy of the accumulated per-label failed-operation counts.
     * @returns {Map<string, number>} Error events observed per label.
     */
    snapshotErrorCounts() {
      return new Map(totalErrorCountsByLabel);
    },

    /**
     * Clears the accumulated totals so each scenario reports its own statistics only.
     * @returns {void}
     */
    resetTotals() {
      totalDurationsByLabel.clear();
      totalErrorCountsByLabel.clear();
    }
  };
}

/**
 * Summarises one label's duration samples into report statistics.
 * @param {number[]} durations - Measured durations in milliseconds for one label.
 * @returns {{count: number, minMs: number, maxMs: number, meanMs: number}} Summary statistics.
 */
function summariseDurations(durations) {
  let minimum = durations[0];
  let maximum = durations[0];
  let total = 0;
  for (const duration of durations) {
    if (duration < minimum) {
      minimum = duration;
    }
    if (duration > maximum) {
      maximum = duration;
    }
    total += duration;
  }
  return {
    count: durations.length,
    minMs: minimum,
    maxMs: maximum,
    meanMs: total / durations.length
  };
}

/**
 * Converts accumulated totals into ordered per-label summaries (first-observation order).
 * Labels whose events all carried errors appear too, with empty duration statistics and
 * their error count, so failures can never disappear from the report silently.
 * @param {Map<string, number[]>} totalDurationsByLabel - Accumulated durations keyed by label.
 * @param {Map<string, number>} totalErrorCountsByLabel - Accumulated failed-operation counts
 *   keyed by label.
 * @returns {Array<{label: string, count: number, minMs: (?number), maxMs: (?number),
 *   meanMs: (?number), errorCount: number}>} Per-label summaries ready for rendering; the
 *   duration statistics are null for labels without successful samples.
 */
function summariseLabelStats(totalDurationsByLabel, totalErrorCountsByLabel) {
  const summaries = [];
  const seenLabels = new Set();
  for (const [label, durations] of totalDurationsByLabel) {
    seenLabels.add(label);
    summaries.push({
      label: label,
      errorCount: totalErrorCountsByLabel.has(label) ? totalErrorCountsByLabel.get(label) : 0,
      ...summariseDurations(durations)
    });
  }
  for (const [label, errorCount] of totalErrorCountsByLabel) {
    if (!seenLabels.has(label)) {
      summaries.push({
        label: label,
        count: 0,
        minMs: null,
        maxMs: null,
        meanMs: null,
        errorCount: errorCount
      });
    }
  }
  return summaries;
}

/**
 * Runs one unmeasured warm-up pass so caches, lazy loads, and JIT-style warm paths settle
 * before statistics are collected.
 * @param {Object} scenario - Scenario under measurement.
 * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
 * @param {Object} aggregator - Timing-event aggregator.
 * @returns {void}
 */
function runWarmUpPass(scenario, state, aggregator) {
  if (typeof scenario.prepare === 'function') {
    scenario.prepare(state);
  }
  scenario.measure(state);
  aggregator.discardPending();
}

/**
 * Measures one scenario: warm-up first, then `iterations` measured passes. Mutating scenarios
 * re-establish preconditions inside every measured pass; their events are discarded so only
 * the measured body contributes.
 * @param {Object} scenario - Scenario under measurement.
 * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
 * @param {number} iterations - Measured iteration count.
 * @param {Object} aggregator - Timing-event aggregator.
 * @returns {void}
 */
function runMeasuredScenario(scenario, state, iterations, aggregator) {
  runWarmUpPass(scenario, state, aggregator);
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    if (typeof scenario.prepare === 'function') {
      scenario.prepare(state);
    }
    aggregator.discardPending();
    scenario.measure(state);
    aggregator.commitPending();
  }
}

/**
 * Runs every scenario in declaration order and collects its per-label statistics.
 * @param {Array<Object>} scenarios - Scenario definitions.
 * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
 * @param {number} iterations - Measured iteration count per scenario.
 * @param {Object} aggregator - Timing-event aggregator.
 * @returns {Array<{name: string, labelSummaries: Array<Object>}>} Results per scenario.
 */
function runAllScenarios(scenarios, state, iterations, aggregator) {
  const results = [];
  for (const scenario of scenarios) {
    aggregator.resetTotals();
    runMeasuredScenario(scenario, state, iterations, aggregator);
    const labelSummaries = summariseLabelStats(
      aggregator.snapshotTotals(),
      aggregator.snapshotErrorCounts()
    );
    results.push({ name: scenario.name, labelSummaries: labelSummaries });
  }
  return results;
}

/**
 * Formats one millisecond figure for the report, or a placeholder when a label has no
 * successful samples to summarise.
 * @param {?number} durationMs - Duration in milliseconds, or null when unavailable.
 * @returns {string} Fixed-precision decimal string, or the placeholder.
 */
function formatDurationMs(durationMs) {
  if (durationMs === null) {
    return MISSING_VALUE_PLACEHOLDER;
  }
  return durationMs.toFixed(MS_PRECISION_DIGITS);
}

/**
 * Computes per-column display widths across header and data rows.
 * @param {Array<string[]>} rows - Table rows, header first.
 * @returns {number[]} Width of each column.
 */
function computeColumnWidths(rows) {
  const widths = [];
  for (let columnIndex = 0; columnIndex < TABLE_HEADERS.length; columnIndex += 1) {
    let widest = TABLE_HEADERS[columnIndex].length;
    for (const row of rows) {
      if (row[columnIndex].length > widest) {
        widest = row[columnIndex].length;
      }
    }
    widths.push(widest);
  }
  return widths;
}

/**
 * Renders one table row with left-aligned labels and right-aligned figures.
 * @param {string[]} row - Cell values for the row.
 * @param {number[]} widths - Per-column display widths.
 * @returns {string} Aligned row text.
 */
function formatTableRow(row, widths) {
  const cells = [];
  for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
    if (columnIndex === 0) {
      cells.push(row[columnIndex].padEnd(widths[columnIndex]));
    } else {
      cells.push(row[columnIndex].padStart(widths[columnIndex]));
    }
  }
  return cells.join(COLUMN_SEPARATOR);
}

/**
 * Prints one scenario's statistics table.
 * @param {Array<Object>} labelSummaries - Per-label summaries for the scenario.
 * @returns {void}
 */
function renderScenarioTable(labelSummaries) {
  const rows = [TABLE_HEADERS];
  for (const summary of labelSummaries) {
    rows.push([
      summary.label,
      String(summary.count),
      formatDurationMs(summary.minMs),
      formatDurationMs(summary.maxMs),
      formatDurationMs(summary.meanMs),
      String(summary.errorCount)
    ]);
  }
  const widths = computeColumnWidths(rows);
  for (const row of rows) {
    console.log(formatTableRow(row, widths));
  }
}

/**
 * Prints the complete benchmark report.
 * @param {Array<{name: string, labelSummaries: Array<Object>}>} scenarioResults - Results per
 *   scenario.
 * @param {{documentCount: number, iterations: number}} settings - Validated run settings.
 * @returns {void}
 */
function printReport(scenarioResults, settings) {
  console.log('JsonDbApp execution-time benchmark');
  console.log(
    `Seeded documents: ${settings.documentCount} | Measured iterations per scenario: ${settings.iterations}`
  );
  console.log('');
  for (const result of scenarioResults) {
    console.log(`Scenario: ${result.name}`);
    renderScenarioTable(result.labelSummaries);
    console.log('');
  }
}

/**
 * Executes one benchmark run against a freshly initialised database.
 * @param {{documentCount: number, iterations: number}} settings - Validated run settings.
 * @returns {void}
 * @throws {*} When any setup or scenario step fails (fail fast).
 */
function executeBenchmarkRun(settings) {
  const rootFolderId = resolveRootFolderId();
  const database = createAndInitialiseDatabase(buildDatabaseConfig(rootFolderId));
  const collection = database.createCollection(BENCH_COLLECTION_NAME);
  seedCollection(collection, settings.documentCount);

  const state = { collection: collection, fileId: collection.getDriveFileId() };
  const aggregator = createTimingAggregator();
  const unsubscribe = JDbLogger.addTimingListener(aggregator.handleEvent);
  try {
    const scenarioResults = runAllScenarios(SCENARIOS, state, settings.iterations, aggregator);
    printReport(scenarioResults, settings);
  } finally {
    unsubscribe();
  }
}

/**
 * Entry point: parses settings, boots the mocked environment, runs the benchmark, and cleans
 * up the temporary Drive root.
 * @returns {void}
 * @throws {*} When setup fails; completed runs always exit normally (exit code 0).
 */
function main() {
  const settings = readSettings(process.env);
  const driveRoot = initialiseMockDrive();
  try {
    executeBenchmarkRun(settings);
  } finally {
    fs.rmSync(driveRoot, { recursive: true, force: true });
  }
}

// Run the harness only when invoked directly (`npm run bench`); importing the module from
// unit tests must stay side-effect free so its pure helpers can be exercised in isolation.
if (require.main === module) {
  main();
}

module.exports = {
  SCENARIOS,
  createTimingAggregator,
  summariseLabelStats,
  renderScenarioTable
};
