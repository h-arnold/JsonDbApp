---
name: deploy-gas
description: Push the JsonDbApp sources to an existing Apps Script project with clasp, redeploy to a single stable deployment, and return the live web-app URL so the user can test from any device. Supports a remote, headless `clasp login --no-localhost` handshake via login-pty.mjs.
license: MIT
compatibility: Mistral Vibe CLI
user-invocable: true
allowed-tools:
  - bash
  - read_file
  - write_file
  - question
---

# Deploy GAS

Use this skill when a feature has been implemented and you want to send the current
sources to the Apps Script backend so the user can test them (typically from a phone).
It replaces the manual ritual: `clasp push` → new deployment → open & test.

Two flows are provided:

- **Deploy** — push, redeploy, and return the URL.
- **Login** (one-time / after a fresh remote environment) — perform a headless
  `clasp login --no-localhost` OAuth handshake through the `login-pty.mjs` helper.

## Prerequisites

- `.clasp.json` exists in `src/` and contains `"scriptId"`. `src/` is the
  Apps Script project root directory, so this is where clasp reads its config
  from and where all push/deploy commands run (do not commit it — it is gitignored).
- `clasp` is installed at `node_modules/.bin/clasp` (already a devDependency via
  `@google/clasp`).
- Credentials exist either at `~/.clasprc.json` (default) or are produced now by the
  **Login** flow.

## Commands (all run from `src/`, the Apps Script project root)

- Push and all other clasp commands below run from `src/` via the
  `../node_modules/.bin/clasp` path prefix (clasp reads the local `.clasp.json` there).

---

## Flow 1: Deploy and return the URL

Run these steps with the `bash` tool:

1. **Push the sources.** `--force` is required, otherwise clasp prompts interactively about
   the manifest.

   ```bash
   cd src && ../node_modules/.bin/clasp push --force
   ```

2. **Resolve the stable deployment ID.** Read `src/.clasp.json`. Two cases:
   - It already has a `"deploymentId"` (in `src/.clasp.json`): use that value.
   - It does not (first run): create the stable deployment and persist the ID so later runs
     reuse the same URL:

     ```bash
     cd src && ../node_modules/.bin/clasp deploy -d "jsondbapp stable" --json
     ```

     Parse `deploymentId` from the JSON and write it back into `src/.clasp.json`
     as `"deploymentId": "<id>"` (keep all existing fields intact). This is gitignored, so it
     is safe to persist locally.

3. **Redeploy the stable deployment to the new HEAD.** This updates the existing deployment
   version while keeping the same deployment ID/URL.

   ```bash
   cd src && ../node_modules/.bin/clasp deploy -i <deploymentId> -d "redeploy" --json
   ```

4. **Return the live URL.**

   ```bash
   cd src && ../node_modules/.bin/clasp open-web-app --json <deploymentId>
   ```

   Parse `url` from the JSON output and present it to the user verbatim. They open it on their
   phone. The URL looks like `https://script.google.com/macros/s/.../exec`.

Use the stable URL from the first run on all later runs (steps where the ID is already stored
skip step 2's create).

---

## Flow 2: Login (remote / headless, one-time)

Use this when there is no valid `~/.clasprc.json`, e.g. on a fresh machine. Run from the repo root.

1. **Check whether you are already logged in.**

   ```bash
   node_modules/.bin/clasp show-authorized-user
   ```

   If it returns a user, skip to Flow 1. Otherwise continue.

2. **Launch the PTY helper detached.** It spawns `clasp login --no-localhost` under a
   pseudo-terminal and bridges output/input to two fresh files in the scratch workspace
   `.opencode/scratchpad/clasp-login/`. Launch it from the **repo root** (the helper invokes
   `node_modules/.bin/clasp` relative to its working directory), passing absolute scratch paths:

   ```bash
   mkdir -p .opencode/scratchpad/clasp-login
   setsid node .opencode/skills/deploy-gas/login-pty.mjs \
     "$PWD/.opencode/scratchpad/clasp-login/out.txt" \
     "$PWD/.opencode/scratchpad/clasp-login/in.txt" </dev/null >/dev/null 2>&1 &
   ```

   The helper stays alive across separate tool calls because it is detached. The bash tool
   call that launches it will appear to hang and hit its timeout — that is expected: the helper
   is intentionally left running to await your pasted URL. Issue it detached (as above) and
   proceed; later `cat`/`printf` calls against `out.txt`/`in.txt` run normally.

3. **Read the authorisation URL.** Poll `out.txt` until it contains
   `Authorize clasp by visiting this url:`. Extract that URL.

   ```bash
   cat .opencode/scratchpad/clasp-login/out.txt
   ```

4. **Ask the user to authorise.** Use the `question` tool. Present the authorisation URL and
   ask them to open it in their browser, sign in, and then paste back the redirect URL that
   appears in the address bar. Use a free-text question so they can paste the full URL.

5. **Write the pasted URL back to the helper.**

   ```bash
   printf '<pasted-redirect-url>\n' > .opencode/scratchpad/clasp-login/in.txt
   ```

   Use the URL exactly as returned by the user.

6. **Confirm success.** Poll `out.txt` again until it contains
   `You are logged in as <email>.` (or the helper prints `[[LOGIN_PTY_COMPLETE]]`). If you see
   `[[LOGIN_PTY_ERROR]]`, report the error and stop.

7. **Clean up** the scratch files:

   ```bash
   rm -rf .opencode/scratchpad/clasp-login
   ```

Then run Flow 1 as usual. The stored credentials let all subsequent runs proceed
non-interactively.

---

## Troubleshooting

- **`Permission denied` on the helper run** — do not launch the login helper from `/tmp` or
  other `noexec` mounts; launch it from the repo root as shown (scratch output files can still
  live in `.opencode/scratchpad/`).
- **clasp asks a question during `push`:** always use `--force`.
- **No web-app entry point found** — the deployment is not configured as a web app, so it does
  not expose a URL; verify the manifest has the `webapp` block and a `doGet` entrypoint before
  deploying.
- **Timing on login** — the URL is present in `out.txt` within a couple of seconds; the helper
  waits indefinitely for `in.txt`, so there is no rush to complete step 4–5.
