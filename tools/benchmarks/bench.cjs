/**
 * bench.cjs - Execution-time benchmark harness for JsonDbApp (SPEC.md §4.6).
 *
 * Manual developer tooling, run through `npm run bench`. It boots the full legacy src surface
 * over the mocked GAS services inside an OS-temporary Drive root, seeds one collection
 * deterministically, then measures each scenario THROUGH the JDbLogger timing facility itself:
 * a registered timing listener aggregates real facility events per label, so reported figures
 * cover the whole instrumented pathway instead of re-measuring wall-clock snippets locally.
 *
 * Mutating scenarios re-establish their preconditions before EVERY measured iteration; events
 * emitted during precondition work are discarded so only the measured body contributes to each
 * label's statistics. Every scenario performs one unmeasured warm-up pass first. The exit code
 * is 0 for any completed run regardless of measurement variance; setup failures throw (fail
 * fast). Not wired into Vitest or CI.
 *
 * Environment overrides: `BENCH_DOCS` (default 200) seeds the collection; `BENCH_ITERATIONS`
 * (default 5) sets the measured iteration count per scenario. Both must be positive integers.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const { createGasMocks } = require('../gas-mocks/gas-mocks.cjs');
const { legacyScripts } = require('../gas-mocks/script-order.cjs');

/** Repository root; all legacy scripts are resolved relative to it. */
const REPO_ROOT = path.resolve(__dirname, '..', '..');

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

/** Separator between aligned table columns. */
const COLUMN_SEPARATOR = '   ';

/** Column headings of the per-scenario statistics table. */
const TABLE_HEADERS = ['Label', 'Count', 'Min (ms)', 'Max (ms)', 'Mean (ms)'];

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
     * Inserts one marker document so the collection is dirty and every measured coordinated
     * write persists real work. Marker documents accumulate across iterations by design.
     * @param {{collection: Object, fileId: string}} state - Shared benchmark state.
     * @returns {void}
     */
    prepare(state) {
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
 * Loads one legacy src script into the current context exactly as the Vitest setup does.
 * @param {string} relativePath - Path to the script relative to the repository root.
 * @returns {void}
 * @throws {Error} When the script cannot be read or parsed (fail fast).
 */
function loadLegacyScript(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  vm.runInThisContext(source, { filename: absolutePath });
}

/**
 * Publishes the mocked GAS services onto globalThis in the same shape as the Vitest setup.
 * @param {Object} gasMocks - Mock service bundle returned by `createGasMocks`.
 * @returns {void}
 */
function assignGlobalServices(gasMocks) {
  globalThis.DriveApp = gasMocks.DriveApp;
  globalThis.PropertiesService = gasMocks.PropertiesService;
  globalThis.ScriptProperties = gasMocks.ScriptProperties;
  globalThis.LockService = gasMocks.LockService;
  globalThis.Utilities = gasMocks.Utilities;
  globalThis.Logger = gasMocks.Logger;
  globalThis.MimeType = gasMocks.MimeType;
}

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
 * Creates the timing-event aggregator backing the harness. Events land in a pending buffer;
 * callers discard precondition events and commit measured events, so per-label statistics
 * accumulate across iterations while preparation costs stay excluded.
 * @returns {Object} Aggregator exposing handleEvent, discardPending, commitPending, and
 *   snapshotTotals.
 */
function createTimingAggregator() {
  const pendingByLabel = new Map();
  const totalsByLabel = new Map();

  return {
    /**
     * Receives one timing event dispatched by the facility.
     * @param {{label: string, durationMs: number}} event - Timing event emitted by JDbLogger.
     * @returns {void}
     */
    handleEvent(event) {
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
    },

    /**
     * Commits buffered measured events into the accumulated totals.
     * @returns {void}
     */
    commitPending() {
      for (const [label, durations] of pendingByLabel) {
        const existing = totalsByLabel.has(label) ? totalsByLabel.get(label) : [];
        totalsByLabel.set(label, existing.concat(durations));
      }
      pendingByLabel.clear();
    },

    /**
     * Returns a copy of the accumulated totals keyed by label.
     * @returns {Map<string, number[]>} Durations observed per label.
     */
    snapshotTotals() {
      return new Map(totalsByLabel);
    },

    /**
     * Clears the accumulated totals so each scenario reports its own statistics only.
     * @returns {void}
     */
    resetTotals() {
      totalsByLabel.clear();
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
 * @param {Map<string, number[]>} totalsByLabel - Accumulated durations keyed by label.
 * @returns {Array<{label: string, count: number, minMs: number, maxMs: number, meanMs: number}>}
 *   Per-label summaries ready for rendering.
 */
function summariseLabelStats(totalsByLabel) {
  const summaries = [];
  for (const [label, durations] of totalsByLabel) {
    summaries.push({ label: label, ...summariseDurations(durations) });
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
    const labelSummaries = summariseLabelStats(aggregator.snapshotTotals());
    results.push({ name: scenario.name, labelSummaries: labelSummaries });
  }
  return results;
}

/**
 * Formats one millisecond figure for the report.
 * @param {number} durationMs - Duration in milliseconds.
 * @returns {string} Fixed-precision decimal string.
 */
function formatDurationMs(durationMs) {
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
      formatDurationMs(summary.meanMs)
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

main();
