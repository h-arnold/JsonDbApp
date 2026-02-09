## JsonDbApp v0.1.0 — Minor release

Release date: 2026-02-06

### Summary

This release focuses on a comprehensive documentation overhaul and a significant internal refactor to reduce complexity and make the codebase easier to maintain. There are also developer-experience improvements (linting/tooling, test framework migration and CI enhancements) and ongoing DRY/KISS guidance implemented across docs and tests.

**This is primarily a maintenance release with no breaking changes to public APIs.**

🔗[Get copies of the latest scripts here](https://drive.google.com/drive/folders/1EqZJjMRCHfXDvVtGbqrD85xFuQBYGf11?usp=drive_link)

#### Breaking Change

`Database.collection` and `Database.getCollection` were methods with largely duplicated functionality. The refactor has removed `Database.collection` in favour of a single canonical `getCollection` method. If you were using `Database.collection` directly, please switch to `Database.getCollection`.

---

### Highlights 🔧

- **Documentation**: Added comprehensive documentation and setup guides, consolidated note/info blocks and improved examples (query/update) and constructor documentation for easier onboarding and reference. 📚
- **Refactor & Simplicity**: Significant internal refactor to reduce complexity, remove redundant files and "de-clutter" the code for easier maintenance and clearer contributor guidance. ✂️
- **Testing**: Migrated tests to the **Vitest** framework, eliminated duplication (DRY) and restructured test suites for maintainability and improved clarity. ✅
- **Tooling & CI**: Added/updated tooling for developer ergonomics — **Prettier**, **Husky**, **JSDoc** plugin, and updated GitHub Actions for documentation deployment. ⚙️
- **Linting**: Lowered some lint severities and silenced complexity warnings in core utilities to reduce noise while preserving quality. 🧹
- **Guidance**: Updated and implemented recommendations from `KISS_AND_DRY.md` (recommend Validate-driven errors and a canonical `getCollection` approach). 💡

---

### PRs merged

- #48 — docs: clarify constructor examples
- #47 — Implement suggestions from `KISS_AND_DRY.md`
- #46 — Update `KISS_AND_DRY.md` to recommend Validate-driven errors and canonical `getCollection`
- #45 — Refactor tests to eliminate duplication (DRY)
- #44 — Silence lint complexity warnings in core utilities
- #43 — Update DRY testing refactor guidance
- #41 — De-Clause the code (de-clutter/cleanups)
- #29 — Refactor tests to Vitest framework and enhance test structure
- #23 — Lower lint severities, add JSDoc plugin, Prettier, Husky and CI updates

---

### Full changelog

- 53bef17 — Update GitHub Actions workflow for documentation deployment
- 069b8e9 — docs: consolidate note and info blocks for improved readability
- 76dd21e — docs: add comprehensive documentation for JsonDbApp and setup guides
- f7dbd29 — docs: streamline query and update examples for improved readability
- 4bb08e4 — Add documentation for JsonDbApp
- 029bfe4 — docs: remove unnecessary blank lines for improved readability
- 6aec06f — refactor: consolidate documentation and remove redundant files for improved clarity and maintainability
- bfd42ce — docs: clarify constructor examples (#48)
- deb67bc — Implement all suggestions from KISS_AND_DRY.md (#47)
- 5bcbd8f — Update KISS_AND_DRY.md to recommend Validate-driven errors and canonical getCollection (#46)
- 1aa0026 — Refactor tests to eliminate duplication (DRY) (#45)
- 3978dd8 — Silence lint complexity warnings in core utilities (#44)
- b16b9f6 — Update DRY testing refactor guidance (#43)
- cded06d — De-Claude the code (#41)
- 5fbc9e3 — refactor: enhance refactoring guidelines with shared helper identification strategy and extraction steps
- 2ac9785 — Refactor tests to Vitest framework and enhance test structure (#29)
- de8348d — Lower lint severities, add JSDoc plugin, Prettier, Husky and CI (#23)

---

### Upgrade notes ⚠️

- No breaking changes introduced — existing public APIs should continue to work as before. If you use any internal modules directly (not recommended), review the refactor notes and tests for any changed internals.
- Documentation has been restructured and improved; consult the new docs for setup, examples and contribution guidelines.

---

If you have any questions about the changes or want to help with follow-up cleanups, please open an issue or a PR.
