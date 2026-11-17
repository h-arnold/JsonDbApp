import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin } from '@opencode/plugin';
import type { PromptInput } from '@opencode/schema/prompt-input';
import atMentionInject from './index.ts';

/** Temporary roots created by each test, removed once the suite finishes. */
const createdRoots: string[] = [];

/** The root directory for the current test. */
let root = '';

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'at-mention-inject-index-'));
  createdRoots.push(root);
});

afterAll(() => {
  for (const directory of createdRoots) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** A prompt hook event as the plugin observes it. */
interface PromptEvent {
  prompt: { text: string; files?: PromptInput.FileAttachment[] };
  metadata?: Record<string, unknown>;
  delivery?: unknown;
}

/**
 * Register the plugin's prompt hook against a fake context and return the
 * callback it captures.
 * @param {string} directory - The location directory the plugin should use.
 * @returns {Promise<(event: PromptEvent) => Promise<void> | void>} The captured prompt hook.
 */
async function capturePromptHook(
  directory: string
): Promise<(event: PromptEvent) => Promise<void> | void> {
  let captured: ((event: PromptEvent) => Promise<void> | void) | undefined;
  const context = {
    location: { directory },
    session: {
      hook: async (
        _name: string,
        callback: (event: PromptEvent) => Promise<void> | void
      ): Promise<{ dispose: () => Promise<void> }> => {
        captured = callback;
        return { dispose: async () => {} };
      }
    }
  };
  await atMentionInject.setup(context as unknown as Plugin.Context);
  if (!captured) throw new Error('the plugin did not register a prompt hook');
  return captured;
}

describe('at-mention-inject setup', () => {
  it('appends attachments to an existing prompt files array in place', async () => {
    const absolute = path.join(root, 'notes.md');
    writeFileSync(absolute, 'fixture');
    const hook = await capturePromptHook(root);

    const existing: PromptInput.FileAttachment[] = [{ uri: 'https://example.com/already' }];
    const metadata = { keep: true };
    const delivery = { kind: 'immediate' };
    const event: PromptEvent = {
      prompt: { text: '@notes.md', files: existing },
      metadata,
      delivery
    };

    await hook(event);

    // The same array must be mutated, not replaced.
    expect(event.prompt.files).toBe(existing);
    expect(existing).toEqual([
      { uri: 'https://example.com/already' },
      { uri: pathToFileURL(absolute).href, name: 'notes.md' }
    ]);
    expect(event.prompt.text).toBe('@notes.md');
    expect(event.metadata).toBe(metadata);
    expect(event.delivery).toBe(delivery);
  });

  it('creates the files array when the prompt has none', async () => {
    const absolute = path.join(root, 'notes.md');
    writeFileSync(absolute, 'fixture');
    const hook = await capturePromptHook(root);

    const event: PromptEvent = { prompt: { text: '@notes.md' } };
    await hook(event);

    expect(event.prompt.files).toEqual([{ uri: pathToFileURL(absolute).href, name: 'notes.md' }]);
  });

  it('leaves the prompt untouched when nothing is mentioned', async () => {
    const hook = await capturePromptHook(root);

    const event: PromptEvent = { prompt: { text: 'no mentions here' } };
    await hook(event);

    expect(event.prompt.files).toBeUndefined();
  });
});
