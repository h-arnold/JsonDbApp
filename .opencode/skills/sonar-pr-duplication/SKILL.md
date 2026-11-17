---
name: sonar-pr-duplication
description: Inspect the latest SonarQube or SonarCloud pull request report, retrieve duplication details with line numbers, quality gate status, coverage metrics, and open issue summaries using direct SonarCloud Web API calls via gh. Use when a user asks about SonarQube duplication comments, quality gate failures, coverage on a PR, or the latest Sonar report for the current branch.
---

# Sonar PR Duplication

Use this skill when the task is about the SonarQube or SonarCloud pull request report, especially
duplication, quality gate status, coverage, or open Sonar issues on the PR.

Call SonarCloud's public Web API directly with `gh api` — no separate script required.

---

## 1. Project and PR Identification

Extract the Sonar project key and PR number from one of:

- The Sonar bot comment on the PR (look for `id=h-arnold_JsonDbApp&pullRequest=252` in the URL)
- A known pattern: `h-arnold/JsonDbApp` → Sonar project key `h-arnold_JsonDbApp`
- The PR number from `gh pr view --json number`

```bash
# Get current PR number
gh pr view --json number

# Sonar project key is typically: owner/repo with '/' replaced by '_'
# e.g. h-arnold/JsonDbApp -> h-arnold_JsonDbApp
```

---

## 2. Overall Quality Gate & Metrics

```bash
COMPONENT="h-arnold_JsonDbApp"
PR=252

gh api "https://sonarcloud.io/api/measures/component?component=$COMPONENT&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density&pullRequest=$PR"
```

Returns overall project-level values. For new-code metrics, use the Sonar bot PR comment or the `sinceLeakPeriod=true` filter on issues.

---

## 3. Per-File Duplication & Coverage

```bash
gh api "https://sonarcloud.io/api/measures/component_tree?component=$COMPONENT&pullRequest=$PR&metricKeys=duplicated_lines_density,coverage&ps=100"
```

Filters files with `duplicated_lines_density > 0` to identify duplication hotspots.

---

## 4. Duplicated Block Line Ranges

For a specific file, call the duplication endpoint with the full Sonar file key (project key + `:` + file path from repo root):

```bash
FILE_KEY="h-arnold_JsonDbApp:src/02_components/DocumentOperations.js"

gh api "https://sonarcloud.io/api/duplications/show?key=$FILE_KEY&pullRequest=$PR"
```

Returns block pairings with `from` (start line) and `size` (number of lines). A block pair means the lines `[from, from+size)` are duplicated between the two references.

---

## 5. Open Issues (Code Smells, Bugs, Vulnerabilities)

```bash
gh api "https://sonarcloud.io/api/issues/search?component=$COMPONENT&pullRequest=$PR&statuses=OPEN,CONFIRMED&ps=100"
```

Each issue includes `type` (BUG, VULNERABILITY, CODE_SMELL), `severity`, `message`, `component` (file path), and `line`.

---

## 6. Quality Gate Status

```bash
gh api "https://sonarcloud.io/api/qualitygates/project_status?projectKey=$COMPONENT&pullRequest=$PR"
```

Returns the gate status (`OK`, `ERROR`) and any failed conditions.

---

## Worked Pipeline (Single PR)

```bash
COMPONENT="h-arnold_JsonDbApp"
PR=252

# 1. Overall metrics
gh api "https://sonarcloud.io/api/measures/component?component=$COMPONENT&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density&pullRequest=$PR"

# 2. Files with duplication, sorted by density
gh api "https://sonarcloud.io/api/measures/component_tree?component=$COMPONENT&pullRequest=$PR&metricKeys=duplicated_lines_density,coverage&ps=100" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for comp in d.get('components', []):
    measures = {m['metric']: m['value'] for m in comp.get('measures', [])}
    dup = measures.get('duplicated_lines_density')
    if dup and float(dup) > 0:
        cov = measures.get('coverage', '?')
        print(f'  {comp[\"path\"]}: dup={dup}% cov={cov}%')"

# 3. Open issues
gh api "https://sonarcloud.io/api/issues/search?component=$COMPONENT&pullRequest=$PR&statuses=OPEN,CONFIRMED&ps=100" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Total: {d[\"total\"]}')
for issue in d.get('issues', []):
    print(f'  [{issue[\"severity\"]}] {issue[\"type\"]}: {issue[\"message\"]} ({issue[\"component\"]}:{issue.get(\"line\",\"?\")})')"

# 4. Duplicated blocks for a specific file (run per hotspot file)
FILE_KEY="h-arnold_JsonDbApp:src/02_components/DocumentOperations.js"
gh api "https://sonarcloud.io/api/duplications/show?key=$FILE_KEY&pullRequest=$PR" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for dup in d.get('duplications', []):
    blocks = dup['blocks']
    for b in blocks:
        ref = d['files'][b['_ref']]['name']
        print(f'  {ref}: lines {b[\"from\"]}-{b[\"from\"]+b[\"size\"]-1} ({b[\"size\"]} lines)')"
```

---

## Output Expectations

Summarise:

- the PR number and Sonar project key used
- the quality gate status and any failing conditions
- coverage metrics (overall + per-file when available)
- total open issues by type/severity
- the files sorted by duplication density
- the duplicated block pairings and line ranges for each flagged file

If the Sonar API returns empty data, say that clearly and stop rather than guessing.
