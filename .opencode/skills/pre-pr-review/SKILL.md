---
name: pre-pr-review
description: Pre-PR code review orchestrator. Runs the lint and test health gate first and blocks on any failure, then runs a set of code review focuses in parallel (repo rule compliance, KISS/DRY, de-sloppification, performance/Big-O, logging rules, plus optional focuses), synthesises them into a single PR_REVIEW.md at the repo root, walks through each finding with the user via the question tool to capture a decision, records those decisions in detail in the review document, and raises GitHub Issues for deferred findings (combined where similar or overlapping) once all decisions are recorded.
license: MIT
compatibility: opencode
---

# Pre-PR Review

Use this skill before opening a pull request. It produces a single synthesised review document at the
repo root named `PR_REVIEW.md`.

The skill does **not** run automated checks itself beyond the health gate. Every review agent is
explicitly told not to run lint or tests — those are expected to already pass and are verified by
the health gate up front.

## What it does

1. Runs the repository health gate and blocks if it fails.
2. Captures the diff between the current branch and `main`.
3. Launches the review focuses in parallel.
4. Synthesises the results into `PR_REVIEW.md` at the repo root.
5. Walks through each finding to capture decisions, then creates GitHub Issues for any deferred
   findings (combined where similar or overlapping).

## Quick start

From the repository root, invoke the skill directly (e.g. `pre-pr-review`). No arguments are required;
the branch name and `main` are detected automatically.

## Core principles

- Delegate outcomes, not implementation. Review sub-agents contain their own methodology.
- Sub-agents cannot spawn sub-agents. The skill coordinates all parallel calls.
- Only task-specific files are handed to a sub-agent, as `@`-prefixed paths in the prompt
  body (e.g. `@src/02_components/DocumentOperations.js`); the `jsondbapp-at-mention-inject`
  plugin attaches each `@path` token's contents to the sub-agent's prompt automatically. Agents
  still read their own standards (AGENTS.md, module docs) per their own instructions.
- British English in all outputs and the synthesised document.
- Stay within scope: no auto-fix, no commit/push, no CI wiring.

## Step 1 — Health gate

Run the full gate from the repo root with a long timeout (the test suite can take minutes):

```bash
npm run lint && npm run test
```

> **Timeout:** Always set at least a 600000 ms (10 minute) timeout when invoking this via the
> `shell` tool.

`npm run lint` checks `src/**/*.js` and `tests/**/*.js`; `npm run test` runs the full Vitest suite
from `tests/vitest.config.js`. Both must exit zero. The review process requires zero lint errors
and zero warnings.

**If the gate fails:**

- Stop immediately. Do not start the review.
- Report the failing checks to the user and instruct them to fix those first, then re-run this
  skill.
- The gate is the signal for whether the branch is healthy enough to review.

**If clean:** proceed to Step 2.

See `regression-checker/SKILL.md` for the baseline and artefact discipline to use when the health
gate is run repeatedly across a multi-step change.

## Step 2 — Diff and scope

Capture the change set between the current branch and `main`:

```bash
git diff main...HEAD --stat
git diff main...HEAD
```

Save the full diff and the `--stat` summary to the scratchpad. Build the changed-file list and
classify which areas are touched:

- Source: any path under `src/`
- Tests: any path under `tests/`
- Tooling, docs and config: `.opencode/`, `docs/`, or root-level config files

This classification drives which optional focuses run (Step 3).

## Step 3 — Parallel review agents

Launch every focus as a separate subagent via the `subagent` tool in a **single message** (multiple tool calls) so they
run in parallel. The skill owns all coordination; never instruct a subagent to spawn other agents.

For every focus, the handoff prompt MUST include:

- The actual changed files (and changed test files) for that focus, as `@`-prefixed paths
  in the prompt body (e.g. `@src/02_components/DocumentOperations.js`), so the
  `jsondbapp-at-mention-inject` plugin attaches their contents. Do not paste file contents into
  the prompt body.
- The explicit constraint: _"Do NOT run lint or tests. All automated checks are expected
  to pass already and are verified by the health gate before this review began."_
  - The instruction to focus primarily on the diff findings, but also to report incidental issues
    discovered while inspecting the changed files (e.g. in surrounding code read for context). Incidental
    findings should be clearly separated from diff findings and labelled as incidental so the orchestrator
    can surface them in `PR_REVIEW.md` for the user to triage. Every claim needs file:line evidence.
- The requested outcome: a structured review (Critical / Improvement / Nitpick) for that focus only.

### Core focuses (always run)

1. **Repo rule compliance** → `code-reviewer`
   - Focus on AGENTS.md rules, module-specific checklists, and the universal/module standards in the
     code-reviewer instructions.
2. **KISS & DRY** → `code-reviewer`
   - Focus on simplicity, SOLID, duplication-versus-wrong-abstraction (WET), and speculative abstraction.
3. **De-Sloppification** → `de-sloppification`
   - Full slop hunt on the changed code per its own workflow.
4. **Performance (Big-O)** → `code-reviewer`
   - Focus on algorithmic complexity of hot paths and routines. Identify loops, nested iteration, and
     data-structure choices that could be faster; express cost in Big-O notation and name the routine.
5. **Logging rules compliance** → `code-reviewer`
   - Focus on error and logging policy: the error standards in `AGENTS.md`, `ErrorHandler.ErrorTypes`
     and project error codes, and correct use of `src/01_utils/JDbLogger.js`. Check for no `console.*`
     in source, correct log boundaries, no double-logging, and rethrow-at-boundary discipline.

### Optional focuses (run only when the area is in the diff)

Enable each only if its area appears in the Step 2 classification.

- **Security & secrets** → `code-reviewer`
  - Hardcoded credentials/keys, `PropertiesService`/`ScriptApp` misuse, unsafe `HtmlService` output,
    and injection-prone string building.
- **Test-coverage gaps** → `code-reviewer`
  - Changed logic with no corresponding test, per `docs/developers/Testing_Framework.md`. Flag
    untested paths; do not write tests.
- **Error-handling robustness** → `code-reviewer`
  - Broad `catch`/swallow, missing rethrow at boundaries, and missing input validation on public
    methods.

## Step 4 — Synthesise into PR_REVIEW.md

Write the synthesised document to `PR_REVIEW.md` at the repository root. Structure:

```markdown
# Pre-PR Review — <branch-name>

- **Base branch:** main
- **Generated:** <ISO timestamp>
- **Health gate:** PASS | BLOCKED (see failures above)
- **Changed files:** <count> (<diff --stat summary pasted here>)

## Verdict

**Pass / Needs Improvement / Fail** — one sentence rationale. Fail if any focus reported a Critical.

## Focus areas

### Repo rule compliance

<verbatim Critical/Improvement/Nitpick items from the agent, with file:line evidence>

### KISS & DRY

...

### De-Sloppification

...

### Performance (Big-O)

...

### Logging rules compliance

...

### Security & secrets (optional)

...

### Test-coverage gaps (optional)

...

### Error-handling robustness (optional)

...
```

Paste each agent's items verbatim (with their file:line evidence). Keep the agent's separation between
diff findings and incidental findings intact — render incidental items in their own subsection
(e.g. `#### Incidental (triage)`) so the user can distinguish blocking PR issues from separate
cleanup opportunities. Omit a section only if that focus did not run (optional focus not in scope);
label omitted optional sections with `_(not in scope for this diff)_`.

## Step 5 — Decision pass with the user

Before finalising, walk through **every** finding in the synthesised `PR_REVIEW.md` with the user. For
each finding, capture the user's decision on whether and how to address it. Where appropriate, ask for
the chosen approach (e.g. fix now, defer, wontfix, or a specific remediation strategy) so the outcome is
unambiguous.

Guidance:

- Work through findings **strictly one item at a time** in order of severity (Critical → Improvement →
  Nitpick), including incidental items. Do not present or ask about the next finding until the current
  one has been decided.
- **Explain in chat, ask with the tool.** Put the full explanation of the finding — what it is, its
  `file:line` evidence, the options, and their trade-offs — in the chat message, then use the
  **question** tool **only** to capture the choice. Do not attempt to compress a complex issue into the
  tool's option labels or character limits; the tool is for selecting an option, not for conveying the
  detail. The chat explanation is the source of detail.
- Record each decision in full detail — do not reduce it to a single word. Capture the chosen option and
  any specifics the user provides about _how_ the issue should be addressed (e.g. the intended fix,
  the trade-offs considered, or why a finding is being rejected).
- **Deferral means a GitHub Issue.** When presenting the defer option, state explicitly that choosing it
  assumes a GitHub Issue will be created recording the deferred work. Do not create the Issue during the
  decision pass; collect all deferrals first so similar or overlapping findings can be combined into a
  single Issue in Step 7.

## Step 6 — Record decisions in PR_REVIEW.md

Append a **Decisions** section to `PR_REVIEW.md` that documents, in detail, every decision captured in
Step 5. Each decision MUST be written so that another engineer can pick up the document later and act on
it without further context from the conversation. For each finding include:

- The finding reference (focus area + severity + `file:line`).
- The decision (e.g. Fix now / Defer / Wontfix). A **Defer** decision implies a GitHub Issue will be
  raised (see Step 7); note any intended Issue scope and which other findings it might be combined with.
- The detailed rationale and, where applicable, the agreed approach for addressing it.

Structure:

```markdown
## Decisions

### Repo rule compliance

- **[Critical] `src/02_components/DocumentOperations.js:42`** — Decision: Defer (GitHub Issue). Approach: extract the
  duplicated validation into a shared helper and add a unit test; deferred because it is not on
  the hot path. Rationale: user wants the PR to ship first. To be combined with the KISS & DRY finding at
  `src/02_components/DocumentOperations.js:90` into a single follow-up Issue.
- **[Nitpick] `tests/unit/document-operations/document-operations.test.js:88`** — Decision: Wontfix. Rationale: intentional deviation agreed
  with the team; documented so a future reviewer does not re-raise it.

...
```

## Step 7 — Create GitHub Issues for deferred findings

Only after **all** decisions have been recorded in `PR_REVIEW.md` (Step 6), create the GitHub Issues for
findings decided as **Defer**.

- Review the full set of deferrals together and combine similar or overlapping findings into a single
  Issue rather than raising one Issue per finding, so related work is not scattered.
- Create each Issue with `gh issue create`, using a title that names the affected area/behaviour and a
  body that includes the finding details, `file:line` evidence, the agreed approach/rationale, and a
  link back to `PR_REVIEW.md`.
- After creating the Issues, update each corresponding **Defer** entry in the Decisions section with its
  GitHub Issue number/URL so the document and tracker stay in sync.
- If no findings were deferred, skip this step.

## Step 8 — Return to the user

Print a brief summary:

- The overall verdict (Pass / Needs Improvement / Fail).
- Health gate result.
- The list of focuses run.
- The GitHub Issues created for deferred findings (numbers/URLs), if any.
- The path to `PR_REVIEW.md` (now including the recorded decisions).

Do not mark the review complete while any Critical item remains unaddressed; instead report the
Critical items so the user can address them and re-run the skill.

## Notes

- Keep the lint and test gate as the check for branch health. Never bypass the gate.
- Parallelise all review agents in one message to keep the review fast.
- The skill synthesises; it does not re-litigate individual findings. Trust agent evidence.
- A **Defer** decision always implies a GitHub Issue. Deferrals are collected across all findings and
  Issues are only created in Step 7, after every decision is recorded, so overlapping findings can be
  merged into one Issue.
- In the decision pass, explain each finding fully in chat and use the `question` tool only to
  capture the selection; handle exactly one finding per exchange.
