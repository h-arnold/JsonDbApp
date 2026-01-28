### Objective

Define how to make collection-name sanitisation optionally permissive via configuration so that calling code can choose between rejecting invalid names or stripping disallowed characters before proceeding.

### Steps

1. **DatabaseConfig updates**
   - Add a new boolean flag (e.g. `stripDisallowedCollectionNameCharacters`) to `src/04_core/DatabaseConfig.js` with a default of `false`.
   - Validate the flag in `_validateConfig` alongside the other boolean flags.
   - Carry the flag through `clone()`, `toJSON()`, and `fromJSON()` so serialisation/persistence keeps the user intent.

2. **Database behaviour adjustments**
   - Enhance `_validateCollectionName` (or introduce a helper) in `src/04_core/Database.js` to accept the new config flag.
   - When the flag is enabled, sanitise the incoming name by removing all characters matching the existing invalid-character regex (`[\/\\:*?"<>|]`) and ensure the resulting string still meets the reserved-name checks.
   - Update every call site that validates collection names (`collection()`, `createCollection()`, `getCollection()`, `dropCollection()`, etc.) to work with the sanitized name when the flag is on and to throw as before when it is off. Any name returned to the caller should reflect the cleaned version.
   - Ensure the sanitisation helper documents its behaviour via JSDoc and logs the adjusted name when trimming characters to aid debugging.
   - Guard against the sanitised result becoming empty, matching a reserved keyword, or colliding with an existing collection before creating files; log adjustments only when characters were stripped and ensure caches/MasterIndex lookups all use the cleaned name so downstream operations remain consistent.

3. **Tests & documentation**
   - Extend the relevant test suites (e.g. `tests/unit/DatabaseConfigTest.js` and whichever database/collection tests exist) to cover both modes: confirm the default behaviour still rejects invalid names and that the new flag allows stripping (including the reserved-name check after sanitisation).
   - Update any documentation references (e.g. `docs/developers/DatabaseConfig.md` and `docs/developers/Database.md`) to describe the new config flag and explain how sanitisation behaves when enabled.
   - If serialization tests exist (e.g. `tests/unit/UtilityTests/ObjectUtilsTest.js`), ensure they continue to verify the new flag survives serialisation.
   - Remember to refresh any logging or help text that references collection name validation so it aligns with the two-mode behaviour.
   - Add or update the following explicit test cases:
     - `tests/unit/DatabaseConfigTest.js`
       - Assert `stripDisallowedCollectionNameCharacters` defaults to `false`, rejects non-boolean inputs, and is copied through `clone()`.
       - Extend serialization/deserialization coverage to ensure `toJSON()`/`fromJSON()` and any `ObjectUtils`-based tests keep the flag value intact.
     - `tests/unit/UtilityTests/ObjectUtilsTest.js`
       - Confirm `ObjectUtils.serialise()`/`deserialise()` can round-trip a `DatabaseConfig` that has `stripDisallowedCollectionNameCharacters` set to `true`.
     - `tests/unit/Database/02_CollectionManagementTestSuite.js`
       - Strict mode: existing checks still throw for invalid characters, empty names, and reserved words.
       - Permissive mode: invalid characters are stripped, the cleaned name is what `collection()`, `createCollection()`, `getCollection()`, and `dropCollection()` return/list/store, and reserved-name re-check runs on the cleaned value (e.g. `"index/"` still rejected).
       - Permissive mode: confirm sanitized names are used for caches/MasterIndex lookups so re-accessing the collection by the cleaned name succeeds and duplicates that collide after stripping are rejected.
     - `tests/unit/DatabaseInitializationRefactorTest.js` and `tests/unit/Database/03_IndexFileStructureTestSuite.js`
       - Verify master index/index file entries record the sanitized name when the flag is enabled so persistence stays consistent.
     - `tests/unit/Collection/*` suites that assert `collection.getName()` or rely on stored names
       - Ensure those expectations reflect the cleaned name when sanitisation is on while still expecting strict behaviour otherwise.

4. **Follow-up**
   - Run or mention the need to run unit tests covering the changed behaviour.
   - Prepare to push and request the user to run the GAS tests/`clasp push` per project guidelines once code changes are verified.
