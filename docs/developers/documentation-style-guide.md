# Documentation Style Guide

Rules for writing Markdown under `docs/`, the repository-root `README.md` and agent instruction files in JsonDbApp. Contributors, the docs agent and the code reviewer use this as the single source of truth. Agent instruction files link here rather than repeating the rules.

## Audience and writing style

| Audience                    | Where                                                                | Assumptions                                                                                                                                           | Style                                                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developers new to JsonDbApp | User-facing guides under `docs/` and the repository-root `README.md` | Comfortable with JavaScript, databases and the constraints of Google Apps Script, but unfamiliar with this project's API. Reads to accomplish a task. | About JsonDbApp only. State the next action and the smallest example that works. Explain project-specific terms; avoid generic tutorials. Clear, concise and specific.      |
| Developers and AI agents    | `docs/developers/`, `docs/developers/data-shapes/`                   | Fluent in standard development practice and familiar with Google Apps Script. Reads to understand internals, contracts or workflows.                  | About JsonDbApp only. No generic preamble or advice. Clear, concise and specific. Use the simplest wording that preserves nuance, and plain English over jargon.            |
| Agents                      | `AGENTS.md`, `.opencode/agents/*.md`, `.opencode/commands/*.md`      | Instructions are followed literally.                                                                                                                  | Unambiguous imperative language: "must" and "must not". State expected behaviour and constraints directly, with no narrative context or prose that weakens the instruction. |

When the general tone guidance below conflicts with the row above, the audience row wins.

## What a canonical doc is for

State the rules and reasoning a reader needs to act correctly. Describe behaviour as it is now, or as it is planned to become — not the sequence of work that produced it.

Documenting planned, unimplemented or partially implemented features is allowed and often necessary. State them as current status, keep them accurate, and reconcile them when the implementation lands.

## Don't duplicate the code or JSDoc

A doc must tell the reader something the code does not already tell them clearly. Before keeping a sentence, ask: would an experienced engineer who has read the code, config, JSDoc and test names still act wrongly without it? If not, delete it.

Treat JSDoc as the owner of a symbol's contract:

- Do not restate its parameters, return values, options or usage examples. Link to the symbol instead.
- Document what JSDoc cannot carry: why a rule exists, how components fit together, and the constraints a reader must respect.
- If JSDoc is missing or wrong, correct the JSDoc rather than compensating for it in prose.

## What never belongs

- **Delivery narrative** — what was implemented, in which order, by which increment, with what evidence. That belongs in release notes, not in a canonical doc.
- **Status markers for shipped work** — "ready for implementation", "the next document should be…", a proposed file tree left in place after the code lands. Update the affected doc when the work ships.
- **Proof catalogues** — which suite, fixture or increment proves which claim.
- **Volatile facts** — versions, test counts, coverage percentages, file and line counts, machine-specific paths and commit hashes. Cite the config file or command that reports the value instead.
- **Restated APIs** — see Don't duplicate the code or JSDoc.
- **Generic tutorials** for Google Apps Script, JavaScript, Vitest or editors.
- **Inventories** that the filesystem, scripts or test names already express.
- **Planning vocabulary** — section, phase, option or increment numbers, issue numbers or "first-version scope" as headings or narrative structure.
- **Planning-artefact references** — citing a spec or action plan for authority or historical reasoning. State the rule, the contract or the current status directly instead.
- **Negative change commentary** — "no new counter is introduced", "this change does not redesign X", "unchanged / not added". State the invariant positively instead.

## Keep changes proportional

- Aim for a net-neutral or net-negative diff. If you add a section, remove, merge or relocate stale content from the same document.
- Prefer splitting an overstretched doc over growing it; see Choose where a doc lives.
- Do not pad a doc to match the perceived depth of its neighbours. Length is a consequence of the material.
- When touching a doc for a substantive update, prune nearby duplication and dense prose. Keep that cleanup local to the document.

## Write concisely

- Prefer short sentences, direct instructions and plain language. Remove filler, repetition and claims that do not change the reader's action.
- Choose the simplest wording that preserves meaning. Avoid inflated language, jargon and decorative synonyms such as "robust" or "comprehensive".
- Put the most important decision, requirement or warning first. Do not bury a caveat at the end of a paragraph.
- Keep one idea per paragraph, expressed in two or three short sentences.
- Break up common density patterns: one bullet listing many files, several rules joined by nested em-dashes, several examples for one rule, and prose that restates a table.
- Use British English.

## Tone

- Start with the purpose or benefit before detailed instructions.
- Use respectful language such as "You can…" and "Before you…". Avoid impersonal or authoritarian phrasing.
- Pair a warning with the reason and the next action. Be reassuring without weakening a genuine risk.
- Avoid marketing language, forced enthusiasm, emojis and conversational padding. Warmth comes from clarity and useful context, not extra adjectives.

## Formatting

- Use one H1, then logically nested H2/H3 headings with no skipped levels.
- Use numbered lists for sequences and bullets for unordered guidance.
- Use tables for compact comparisons and repeated field/value patterns, not long prose.
- Put commands and configuration in fenced code blocks with a language identifier.
- Use callouts sparingly for requirements and warnings; state the consequence and next action.
- Use bold for key terms or actions, not whole paragraphs.
- Put descriptive links close to the claim they support.
- Add a short verification step when the reader must confirm success.
- Use a table of contents only when a document is long enough to need navigation.

## Structure a document

A reader often arrives from search or a link and reads only a screen before acting. Make that first screen enough to act correctly, and make the rest quick to scan.

- Open with one or two sentences that state what the doc covers and the main rule or decision it gives. Put this before background, examples and caveats, and keep volatile facts out of it so the opening stays true.
- Order sections from the general rule to the specifics, and the common path before edge cases and exceptions. Give the rule before its qualifications.
- Give each section one subject. Merge sections that answer the same question; separate a section that answers two.
- Write headings that name the subject or the conclusion ("Validation runs in the API handler"), not generic labels such as "Details" or "Notes". Headings act as the scannable outline and as link anchors, so each must make sense on its own.
- Keep the steps of a procedure together and in order. Do not scatter one step's rule, warning and example across different sections.
- Place a diagram, table or code example directly after the sentence it explains, not in a section at the end.
- Make each section understandable on its own, since readers may land on it directly from a link. Link to the owning doc for the full rule rather than restating it (see Ownership and navigation).

## Verify references

- Check every source, config and spec path against the working tree before citing it. Prefer a stable path or symbol name to a line number, which drifts.
- Name list items by topic or heading anchor, not by position such as "discrepancy 7".
- When two docs make conflicting claims, verify against the code and correct both.

## Ownership and navigation

- Give each topic one owning doc. Where two docs need the same rule, keep the full statement in the owner and link from the other.
- Keep `mkdocs.yml`, `docs/README.md` and the files on disk in agreement. Add or remove nav entries when docs are added or removed. Give nav entries distinct labels; qualify entries whose subjects share a name.
- If a rule appears in both a doc and an agent instruction file, keep one authoritative statement and make the other a pointer. Check that they agree.

## Choose where a doc lives

Place a new doc by its audience and subject, matching the folders already in use:

| Folder                         | Audience and content                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/` (root)                 | User-facing guides for developers new to JsonDbApp: `Quick_Start.md`, `Examples.md`, `Querying.md`, `Updates.md`, the landing page `index.md` and the index `README.md`. |
| `docs/developers/`             | Developer architecture, component and policy docs.                                                                                                                       |
| `docs/developers/data-shapes/` | Canonical data-shape contracts, maintained by the data-shapes agent.                                                                                                     |
| `docs/release-notes/`          | Versioned release notes; excluded from periodic audits.                                                                                                                  |

Before creating a doc, check whether an owning doc already covers the subject (see Ownership and navigation). Extend that doc rather than start a rival.

Split a doc when it covers subjects with different audiences or owners, when readers need to link to one part without the rest, or when a section has become a subject of its own. Judge by subject, not line count. When you split:

- Keep the original as a short index that names each child doc and links to it.
- Give each child one subject and a name that persists (see Naming).
- Add or update the nav entries in `mkdocs.yml` and the listing in `docs/README.md`.

When a folder grows past a screenful of files, add an `INDEX.md` that lists and links its docs.

## Naming

Use persistent, codebase-specific names for files, titles and headings. Avoid names tied to transient planning artefacts — `option-b-implementation.md`, `section-3-approach.md` or `choice-2-explanation.md`. Prefer names such as `master-index-conflict-resolution.md` or `modification-token-lifecycle.md`.

## Terminology

Use **JsonDbApp** (one word) consistently. Check the root `README.md` and `mkdocs.yml` before introducing a product name or variant.

## Scope of periodic documentation audits

- Exclude `docs/release-notes/**` **content**: release notes necessarily record past state. Navigation and index coverage for release-note files remains in scope.
- This style guide and agent instruction files are outside audit scope. Contradictions between them and the docs are checked centrally during an audit.
