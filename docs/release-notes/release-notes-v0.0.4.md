## JsonDbApp v0.0.4 — Patch release

Release date: 2026-01-28

### Summary

Enhancements to collection name sanitisation (now configurable), improved local testing support via GAS API mocks and recorder stubs, documentation and development environment improvements, and a small bug fix correcting the error type thrown for corrupted collection metadata. Includes test updates and tooling additions to make local development and testing easier.

[Get copies of the latest scripts here](https://drive.google.com/drive/folders/1Y_2UTeT_eY7uWZ_4964FeFcjnwa1tOm-?usp=sharing)

### Highlights

- Add configurable collection name sanitisation with a new option to control sanitisation behaviour.
- Add GAS API mock plan and local Node-based stubs to support local testing of GAS integrations.
- Fix: use `TypeError` when a corrupted `collections` property is detected (replacing a generic `Error`).
- Improved developer experience: add a Dev Container, `ACTION_PLAN.md` and tooling to simplify local setup and testing.
- Tests updated and new/modified suites to cover the above behaviour and improve reliability.

### PRs merged

- #22 — Enhance collection name sanitisation with configurable option (merged)
- #19 — Add GAS API mock plan and local Node-based stubs (merged)

### Full changelog

- d286fea — feat: Enhance collection name sanitisation with configurable option (#22)
- 6ce793c — feat: Add GAS API mock plan and local Node-based stubs (#19)
- 92ace0f — docs: Update README with project copy instructions and clarify test versions
- 7910a72 — fix: change error type from Error to TypeError for corrupted collections property
- Added: `.devcontainer/` and Dev Container configuration, `ACTION_PLAN.md`, and improved CI/dev tooling
- Added: `tools/gas-mocks/` and `tools/gas-recorder/` to support local testing and recordings
- Added: `src/appsscript.json` and small project configuration updates
- Tests: Updated and added several unit and integration tests covering Database and Collection behaviours
- Misc: package updates and documentation tweaks

### Upgrade notes

- No breaking changes introduced.
- To enable the new sanitisation behaviour, check `DatabaseConfig` for the collection name sanitisation option and adjust as needed.
