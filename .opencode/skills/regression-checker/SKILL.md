---
name: regression-checker
description: Run the repository health gate, capture a baseline from the first run, compare follow-up runs against it, and track repository health while progressing through multi-step work.
license: MIT
compatibility: opencode
---

# Regression Checker

Use this skill when you need a deterministic health signal while working through a
multi-step implementation, especially for changes that need a stable baseline over time.

JsonDbApp has no dedicated regression-checker CLI. The health gate is the project's existing
npm scripts: lint followed by the full unit-test suite.

## What it does

- runs the repository health gate from the root npm scripts
- captures or reuses a session baseline from the first run
- compares the current tree against the saved baseline
- surfaces lint and test failures with stable report artefacts

## Quick start

From the repository root:

```bash
npm run lint && npm run test
```

Capture the combined stdout into a session artefact so later runs can be compared:

```bash
mkdir -p .opencode/scratchpad/regression-checker/<sessionId>
{ npm run lint && npm run test; } 2>&1 | tee .opencode/scratchpad/regression-checker/<sessionId>/<run-name>.txt
```

`sessionId` should be the current Git branch name or another stable identifier. Keep it unchanged
for every run in the same piece of work so reports stay comparable.

> **Timeout:** Always set at least a 600000 ms (10 minute) timeout when invoking this via the
> `shell` tool. The full test suite can take several minutes and the default 120s timeout is not
> sufficient.

## How to use it with multi-step work

1. Choose one stable session ID for the whole task. Keep that identity unchanged for every run
   so reports stay comparable.
2. Run the gate once before the first section to establish the baseline. Save its output as
   `baseline.txt` under `.opencode/scratchpad/regression-checker/<sessionId>/`.
3. Do not run the full gate between red, green or refactor phases. Use focused, section-scoped
   tests and lint for in-section verification instead; the full gate adds little signal
   mid-section.
4. Run the gate with the same session ID once at each full section completion, before the commit
   gate. Save each run's output under a stable name (for example
   `section-01.txt`, `section-02.txt`).
5. After the final cleanup pass, run one last comparison with the same session ID if that pass
   changed any files. If it changed nothing, record that and skip the run.
6. Treat that final comparison as a gate. Any new failures relative to the baseline mean the
   work is not ready; fix the failures, re-review the corrected tree, and re-run the gate until
   it is clean.
7. Record the status and artefact path in your progress notes before moving on.

## What to inspect

- lint exit status and the count of errors and warnings (the gate requires zero of each)
- test exit status and the pass/fail suite counts
- which checks failed, and whether each failure already existed in the baseline
- whether this run created the baseline

## Report artefacts

Artefacts live under `.opencode/scratchpad/regression-checker/<sessionId>/`:

| File             | Contains                                                 |
| ---------------- | -------------------------------------------------------- |
| `baseline.txt`   | Combined lint and test output from the first run         |
| `<run-name>.txt` | Combined lint and test output for a later checkpoint     |
| `notes.txt`      | Optional record of statuses and decisions per checkpoint |

Use `read` on an artefact to inspect failure details without re-running the gate.

## Validation and safety

- The gate is `npm run lint && npm run test`; both scripts must exit zero.
- `npm run lint` checks `src/**/*.js` and `tests/**/*.js` with zero warnings permitted by the
  project's review process.
- `npm run test` runs the full Vitest suite from `tests/vitest.config.js`.
- A failed gate fails the checkpoint. Do not treat a known failure as acceptable without
  recording it in the baseline and explaining why it is out of scope.

## Notes

- Treat the gate as the signal for whether the workspace is improving or regressing while the
  work advances.
- Keep the session ID and artefact names stable so runs remain comparable across checkpoints.
