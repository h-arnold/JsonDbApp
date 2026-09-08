#!/usr/bin/env node
/**
 * Deploy-Gas skill helper: drives `clasp login --no-localhost` inside a
 * pseudo-terminal so the agent can perform a remote, headless OAuth login.
 *
 * clasp's serverless login flow prints an authorisation URL and then prompts
 * (via inquirer) for the redirect URL the user pastes back after authorising
 * in a browser. That prompt requires a real TTY, so we spawn clasp under the
 * system `script` utility (a PTY allocator) and bridge it to the agent using
 * two plain files:
 *
 *   - OUT_FILE: the wrapper appends clasp's live output here. The agent polls
 *     this file to extract the authorisation URL.
 *   - IN_FILE:  the agent writes the user's pasted redirect URL here. The
 *     wrapper reads it and forwards it to the live clasp prompt.
 *
 * Usage: node login-pty.mjs <OUT_FILE> <IN_FILE>
 *
 * @module login-pty
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

const OUT_FILE = process.argv[2];
const IN_FILE = process.argv[3];

if (!OUT_FILE || !IN_FILE) {
  console.error('Usage: node login-pty.mjs <OUT_FILE> <IN_FILE>');
  process.exit(1);
}

// Dispose any leftovers from a previous run.
for (const f of [OUT_FILE, IN_FILE]) {
  if (existsSync(f)) {
    try {
      writeFileSync(f, '');
    } catch {
      /* best-effort reset */
    }
  }
}

// Launch `clasp login --no-localhost` inside a PTY provided by util-linux
// `script`. -q quietens the session header, -f flushes after each write,
// -E never disables local echo of our injected input, -c runs the command.
const child = spawn(
  'script',
  ['-q', '-f', '-E', 'never', '-c', 'node_modules/.bin/clasp login --no-localhost'],
  { stdio: ['pipe', 'pipe', 'inherit'] },
  { detached: false }
);

let responseWritten = false;
let flowComplete = false;

function drainStream() {
  let chunk;
  while ((chunk = child.stdout.read()) !== null) {
    appendFileSync(OUT_FILE, chunk.toString());
  }
}

child.stdout.on('readable', drainStream);
child.stdout.on('error', drainStream);

// Wait for the user's pasted URL to appear in IN_FILE, then write it to the
// live clasp prompt. Polling keeps the wrapper independent of stream events.
const pollMs = 400;
async function pollForResponse() {
  if (responseWritten || flowComplete) return;
  if (existsSync(IN_FILE)) {
    const content = readFileSync(IN_FILE, 'utf8');
    if (content.length > 0) {
      responseWritten = true;
      try {
        writeFileSync(IN_FILE, '');
      } catch {
        /* best-effort */
      }
      child.stdin.write(content.endsWith('\n') ? content : content + '\n');
      child.stdin.end();
      return;
    }
  }
  setTimeout(pollForResponse, pollMs);
}

function waitForExit() {
  return new Promise((resolve) => {
    const drainTimer = setInterval(drainStream, 300);
    child.on('close', () => {
      clearInterval(drainTimer);
      resolve();
    });
    child.on('error', () => {
      clearInterval(drainTimer);
      resolve();
    });
  });
}

async function main() {
  drainStream();
  void pollForResponse();
  await waitForExit();
  flowComplete = true;
  appendFileSync(OUT_FILE, '\n[[LOGIN_PTY_COMPLETE]]\n');
  process.exit(0);
}

main().catch((err) => {
  appendFileSync(OUT_FILE, `\n[[LOGIN_PTY_ERROR]] ${err && err.stack ? err.stack : String(err)}\n`);
  process.exit(1);
});
