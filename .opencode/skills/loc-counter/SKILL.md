---
name: loc-counter
description: Counts lines of code and compares changes to determine LOC reduction, particularly useful for deduplication tasks.
license: MIT
compatibility: opencode
---

# LOC Counter Skill

## Purpose

Counts lines of code (LOC) and provides comparison capabilities to determine if changes have resulted in code reduction. Optimised for deduplication verification tasks.

## When to Use

- **Before refactoring/dedup**: Establish baseline LOC count
- **After changes**: Verify LOC reduction
- **Code review**: Quantify code simplification
- **Deduplication tasks**: Measure DRYness improvements

## Prerequisites

Requires `scc` (Sloc, Cloc and Code) to be installed.

### Recommended: Direct Binary Download (Linux/Unix)

The most reliable installation method uses pre-built binaries from GitHub releases:

```bash
# 1. Download the latest release for your architecture
# Linux x86_64 (most common):
curl -L -o /tmp/scc.tar.gz https://github.com/boyter/scc/releases/latest/download/scc_Linux_x86_64.tar.gz

# 2. Extract and install to ~/.local/bin (no sudo required)
mkdir -p ~/.local/bin
tar -xzf /tmp/scc.tar.gz -C ~/.local/bin/

# 3. Add to PATH (persistent)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 4. Verify
scc --version
```

**Note:** The apt package (`sudo apt install scc`) is **not available** on Debian/Ubuntu. Use the direct binary download above instead.

### Troubleshooting

- **Permission denied on /usr/local/bin**: Use `~/.local/bin` as shown above
- **install.sh blocked**: Some environments block shell script execution; use direct binary download
- **404 on GitHub URLs**: Ensure you're using the correct filename format with underscores, e.g., `scc_Linux_x86_64.tar.gz` not `scc-Linux-x86_64`

## Invocation

Run `scc` directly with the `shell` tool and read its JSON output. There is no `loc-counter` agent
or helper CLI; the actions below are `scc` invocations plus simple bookkeeping in the scratchpad.

## Actions

### 1. Count

Count LOC for a file or directory:

```bash
scc --format json src
scc --format json src/02_components/DocumentOperations.js
```

**Output**: `scc` JSON with total lines, code, comments, blanks, complexity, and a per-language
breakdown.

### 2. Compare

Count each state separately and subtract the totals:

```bash
# Compare two directories
scc --format json src
scc --format json src-refactored

# Compare the working tree against a Git revision by extracting the revision first
# Extract into a clean directory so stale files from a previous run cannot skew the count
rm -rf .opencode/scratchpad/loc-counter/compare
mkdir -p .opencode/scratchpad/loc-counter/compare
git archive HEAD~1 | tar -x -C .opencode/scratchpad/loc-counter/compare
scc --format json .opencode/scratchpad/loc-counter/compare
scc --format json .
```

The working-tree count relies on `.gitignore`: `.opencode/scratchpad/*` is ignored and
`scc` honours `.gitignore` by default, so the extracted copy is not double-counted. Always
re-extract into a clean directory so stale files never inflate the before count.

**Output**: Report the delta (`after − before`) for lines, code, and comments, plus the
percentage change.

### 3. Baseline

Establish a baseline for later comparison:

```bash
mkdir -p .opencode/scratchpad/loc-counter/my-refactor
scc --format json src > .opencode/scratchpad/loc-counter/my-refactor/baseline.json
```

The baseline is saved under `.opencode/scratchpad/loc-counter/<name>/baseline.json`.

### 4. Check Reduction

Check whether changes resulted in a LOC reduction for a named task:

```bash
mkdir -p .opencode/scratchpad/loc-counter/dedup-task-001
scc --format json src > .opencode/scratchpad/loc-counter/dedup-task-001/after.json
```

Compare `after.json` against that task's `baseline.json` and report:

- `reduction: true/false` (`true` when total lines decreased)
- `loc_delta: <number>` (negative = reduction)
- `percentage_change: <number>`

## Output Format

All counts come from `scc --format json`, which prints a JSON array with one object per language.
Each entry carries `Name`, `Lines`, `Code`, `Comment`, `Blank`, `Complexity`, `Count`, and a
`Files` array:

```json
[
  {
    "Name": "JavaScript",
    "Lines": 11200,
    "Code": 9800,
    "Comment": 1000,
    "Blank": 400,
    "Complexity": 120,
    "Count": 40,
    "Files": []
  }
]
```

Comparisons add the derived delta on top of that:

```json
{
  "before": { "lines": 15234, "code": 11200 },
  "after": { "lines": 14123, "code": 10500 },
  "delta": { "lines": -1111, "code": -700, "percentage": -7.29 },
  "reduction": true
}
```

## Report Location

Reports are saved under `.opencode/scratchpad/loc-counter/<session-name>/`:

- `baseline.json` — Baseline counts
- `after.json` — Post-change counts for comparison
- `summary.txt` — Optional human-readable summary

## scc Options

Underlying `scc` command supports these relevant flags:

- `--by-file`: Show output for each file (verbose)
- `--exclude-dir`: Exclude specific directories
- `--include-ext`: Only include specific extensions
- `--no-duplicates`: Exclude duplicate files from count
- `--format json`: Output results in JSON format
- `--ci`: Enable CI-friendly output (ASCII only)

Pass options directly:

```bash
scc --format json --exclude-dir node_modules src
```

**Note on trace output:** If you see verbose TRACE messages, this may be caused by a configuration file. Run without the `-t` flag (which enables trace) or check for any `scc` configuration files that may have tracing enabled.

## DRYness Metrics

`scc` provides DRYness estimation. Use for dedup verification:

```bash
scc --dryness src
```

The tabular output reports `Unique Lines of Code (ULOC)` and `DRYness %` (ULOC / SLOC). The higher
the ratio, the more DRY the code and the less duplication. `--format json` carries only the `ULOC`
field, so use the tabular output when you need the DRYness figure.

## Best Practices

1. **Use baselines**: Always establish a baseline before starting dedup work
2. **Name sessions**: Use descriptive names like `dedup-example` or `refactor-api-layer`
3. **Compare frequently**: Check reduction after each significant change
4. **Review outliers**: Investigate files with unexpected LOC increases
5. **Combine with complexity**: complexity is calculated by default, so use the `Complexity` field in the JSON to verify code quality improvements alongside LOC reduction

## Example Dedup Workflow

```bash
# 1. Establish baseline before dedup
mkdir -p .opencode/scratchpad/loc-counter/dedup-query-engine
scc --format json src > .opencode/scratchpad/loc-counter/dedup-query-engine/baseline.json

# 2. Perform deduplication work...

# 3. Re-count and compare against the baseline
scc --format json src > .opencode/scratchpad/loc-counter/dedup-query-engine/after.json

# 4. If the baseline shows a reduction, verify quality with a per-file breakdown
scc --format json --by-file src
```
