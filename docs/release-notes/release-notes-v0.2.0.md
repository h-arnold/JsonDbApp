## JsonDbApp v0.2.0 — Minor release

Release date: 2026-03-23

### Summary

This release focuses on stronger coordination and locking behaviour for multi-step collection operations. It introduces separate timing controls for lock leases and coordination windows, reloads `MasterIndex` state while `ScriptLock` is held to avoid stale overwrites, and rounds out the release with documentation refreshes.

**This release adds new configuration options without introducing breaking changes to existing callers.**

---

### Highlights 🔧

- **Lock coordination**: Split the legacy `lockTimeout` behaviour into `collectionLockLeaseMs` and `coordinationTimeoutMs` so lease duration and coordination windows can be configured separately.
- **Safer concurrent writes**: `MasterIndex` now reloads the latest `ScriptProperties` state under `ScriptLock`, reducing the risk of cross-instance stale writes.
- **Lease renewal**: Collection coordination can renew an active lock lease before final metadata persistence when a long-running operation approaches expiry.
- **Validation & docs**: Added validation around the new timing settings and refreshed documentation links and release notes.

---

### PRs merged

- #50 — Introduce `collectionLockLeaseMs` and `coordinationTimeoutMs`; add lock renewal and validations
- #49 — Reload `MasterIndex` state under `ScriptLock` to prevent stale overwrites and add cross-instance lock tests

---

### Full changelog

- dafec87 — Introduce `collectionLockLeaseMs` and `coordinationTimeoutMs`; add lock renewal and validations (#50)
- a3d4420 — Reload `MasterIndex` state under `ScriptLock` to prevent stale overwrites and add cross-instance lock tests (#49)
- 6389bf5 — docs: update links to project copy in README and Quick Start Guide
- 09305c4 — docs: update release notes for v0.1.0, fix formatting and improve clarity

---

### Upgrade notes ⚠️

- Existing `lockTimeout` configuration remains supported as a legacy alias, but new deployments should prefer `collectionLockLeaseMs` and `coordinationTimeoutMs`.
- No public API removals are included in this release.

---

If you maintain long-running write flows, review the new timing options and tune them explicitly rather than relying on the legacy alias.
