import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectAttachments, extractMentionTokens } from './resolve.ts';

/** Number of bytes in one kibibyte, used to build size-boundary fixtures. */
const BYTES_PER_KIB = 1024;

/** The plugin's attachment size cap, in kibibytes. */
const CAP_KIB = 200;

/** The plugin's attachment size cap, in bytes. */
const CAP_BYTES = CAP_KIB * BYTES_PER_KIB;

/** Fixture size, in kibibytes, that comfortably exceeds the 200 KiB cap. */
const OVERSIZE_KIB = 250;

/** Temporary roots created by each test, removed once the suite finishes. */
const createdRoots: string[] = [];

/** The root directory for the current test. */
let root = '';

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'at-mention-inject-'));
  createdRoots.push(root);
});

afterAll(() => {
  for (const directory of createdRoots) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/**
 * Write a fixture file beneath the current root.
 * @param {string} relativePath - The path, relative to the current root.
 * @param {string} contents - The file contents to write.
 * @returns {string} The absolute path of the written file.
 */
function writeFixture(relativePath: string, contents = 'fixture'): string {
  const absolute = path.join(root, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, contents);
  return absolute;
}

describe('extractMentionTokens', () => {
  it('extracts a plain file token', () => {
    expect(extractMentionTokens('please read @NOTES.md now')).toEqual(['NOTES.md']);
  });

  it('extracts a nested path token', () => {
    expect(extractMentionTokens('@docs/api.ts')).toEqual(['docs/api.ts']);
  });

  it('extracts a dot-slash relative token', () => {
    expect(extractMentionTokens('@./rel/file.txt')).toEqual(['./rel/file.txt']);
  });

  it('ignores a token preceded by a word character', () => {
    expect(extractMentionTokens('foo@bar.com')).toEqual([]);
  });

  it('ignores a token preceded by a backtick', () => {
    expect(extractMentionTokens('`@x.ts`')).toEqual([]);
  });

  it('does not include a trailing period in the token', () => {
    expect(extractMentionTokens('see @path.')).toEqual(['path']);
  });
});

describe('collectAttachments', () => {
  it('attaches a relative file inside the root', () => {
    const absolute = writeFixture('notes.md');
    expect(collectAttachments('@notes.md', root, undefined)).toEqual([
      { uri: pathToFileURL(absolute).href, name: 'notes.md' }
    ]);
  });

  it('attaches a nested file inside the root', () => {
    const absolute = writeFixture('sub/file.ts');
    expect(collectAttachments('@sub/file.ts', root, undefined)).toEqual([
      { uri: pathToFileURL(absolute).href, name: 'sub/file.ts' }
    ]);
  });

  it('attaches a directory inside the root', () => {
    const directory = path.join(root, 'docs');
    mkdirSync(directory);
    expect(collectAttachments('@docs', root, undefined)).toEqual([
      { uri: pathToFileURL(directory).href, name: 'docs' }
    ]);
  });

  it('rejects a parent-relative token that escapes the root', () => {
    const confined = path.join(root, 'confined');
    mkdirSync(confined);
    writeFixture('outside.md');
    expect(collectAttachments('@../outside.md', confined, undefined)).toEqual([]);
  });

  it('accepts an absolute path inside the root', () => {
    const absolute = writeFixture('absolute.md');
    expect(collectAttachments(`@${absolute}`, root, undefined)).toEqual([
      { uri: pathToFileURL(absolute).href, name: absolute }
    ]);
  });

  it('rejects an absolute path outside the root', () => {
    const confined = path.join(root, 'confined');
    mkdirSync(confined);
    const outside = writeFixture('outside.md');
    expect(collectAttachments(`@${outside}`, confined, undefined)).toEqual([]);
  });

  it('rejects a sibling directory whose name shares the root prefix', () => {
    // A naive `candidate.startsWith(root)` would wrongly accept both tokens.
    const siblingRoot = `${root}-other`;
    createdRoots.push(siblingRoot);
    const siblingFile = path.join(siblingRoot, 'file.md');
    mkdirSync(siblingRoot, { recursive: true });
    writeFileSync(siblingFile, 'fixture');
    expect(collectAttachments(`@${siblingFile}`, root, undefined)).toEqual([]);
    expect(
      collectAttachments(`@../${path.basename(siblingRoot)}/file.md`, root, undefined)
    ).toEqual([]);
  });

  it('rejects a home-relative token even when a literal ~ path exists', () => {
    // The literal `~/x.md` below would resolve inside the root, so only the
    // explicit token guard can reject it.
    writeFixture(path.join('~', 'x.md'));
    expect(collectAttachments('@~/x.md', root, undefined)).toEqual([]);
  });

  it('ignores a bare @ that produces an empty token', () => {
    expect(collectAttachments('@', root, undefined)).toEqual([]);
    expect(collectAttachments('meet me @ 3pm', root, undefined)).toEqual([]);
  });

  it('rejects a token that resolves to the root itself', () => {
    writeFixture('notes.md');
    expect(collectAttachments('@.', root, undefined)).toEqual([]);
  });

  it('handles a root with a trailing separator', () => {
    const absolute = writeFixture('notes.md');
    expect(collectAttachments('@notes.md', `${root}${path.sep}`, undefined)).toEqual([
      { uri: pathToFileURL(absolute).href, name: 'notes.md' }
    ]);
  });

  it('returns no attachments when the root cannot be resolved', () => {
    writeFixture('notes.md');
    const missingRoot = path.join(root, 'does-not-exist');
    expect(collectAttachments('@notes.md', missingRoot, undefined)).toEqual([]);
  });

  it('skips a token that does not resolve to an existing path', () => {
    expect(collectAttachments('@missing.md', root, undefined)).toEqual([]);
  });

  it('does not attach an extensionless token with no matching file', () => {
    // V1's verbatim pattern still captures `README`, but no such path exists, so
    // resolution skips it and nothing is attached.
    expect(collectAttachments('@README', root, undefined)).toEqual([]);
  });

  it('skips a regular file larger than the size cap', () => {
    writeFixture('big.md', 'a'.repeat(OVERSIZE_KIB * BYTES_PER_KIB));
    expect(collectAttachments('@big.md', root, undefined)).toEqual([]);
  });

  it('attaches a file of exactly the size cap', () => {
    const absolute = writeFixture('exact.md', 'a'.repeat(CAP_BYTES));
    expect(collectAttachments('@exact.md', root, undefined)).toEqual([
      { uri: pathToFileURL(absolute).href, name: 'exact.md' }
    ]);
  });

  it('skips a file one byte over the size cap', () => {
    writeFixture('over.md', 'a'.repeat(CAP_BYTES + 1));
    expect(collectAttachments('@over.md', root, undefined)).toEqual([]);
  });

  it('rejects an in-root symlink whose target lies outside the root', () => {
    const outsideRoot = mkdtempSync(path.join(os.tmpdir(), 'at-mention-outside-'));
    createdRoots.push(outsideRoot);
    const outsideFile = path.join(outsideRoot, 'secret.md');
    writeFileSync(outsideFile, 'secret');
    // A symlinked outside directory, addressed through the link.
    symlinkSync(outsideRoot, path.join(root, 'link'));
    // A symlink pointing directly at an outside file.
    symlinkSync(outsideFile, path.join(root, 'escape.md'));
    expect(collectAttachments('@link/secret.md', root, undefined)).toEqual([]);
    expect(collectAttachments('@escape.md', root, undefined)).toEqual([]);
  });

  it('attaches an in-root symlink whose target stays inside the root', () => {
    const target = writeFixture('target.md');
    symlinkSync('target.md', path.join(root, 'relative-link.md'));
    symlinkSync(target, path.join(root, 'absolute-link.md'));
    expect(collectAttachments('@relative-link.md', root, undefined)).toEqual([
      {
        uri: pathToFileURL(path.join(root, 'relative-link.md')).href,
        name: 'relative-link.md'
      }
    ]);
    expect(collectAttachments('@absolute-link.md', root, undefined)).toEqual([
      {
        uri: pathToFileURL(path.join(root, 'absolute-link.md')).href,
        name: 'absolute-link.md'
      }
    ]);
  });

  it('does not duplicate a file already attached with a file URI', () => {
    const absolute = writeFixture('notes.md');
    const existing = [{ uri: pathToFileURL(absolute).href }];
    expect(collectAttachments('@notes.md', root, existing)).toEqual([]);
  });

  it('does not duplicate a directory attached with a trailing-slash URI', () => {
    const directory = path.join(root, 'docs');
    mkdirSync(directory);
    const existing = [{ uri: pathToFileURL(`${directory}${path.sep}`).href }];
    expect(collectAttachments('@docs', root, existing)).toEqual([]);
  });

  it('does not let a non-file existing URI suppress a real attachment', () => {
    const absolute = writeFixture('notes.md');
    const existing = [{ uri: 'https://example.com/notes.md' }];
    expect(collectAttachments('@notes.md', root, existing)).toEqual([
      { uri: pathToFileURL(absolute).href, name: 'notes.md' }
    ]);
  });

  it('attaches a repeated token only once', () => {
    writeFixture('notes.md');
    expect(collectAttachments('@notes.md and @notes.md again', root, undefined)).toHaveLength(1);
  });

  it('attaches multiple valid files in order', () => {
    const first = writeFixture('first.md');
    const second = writeFixture('sub/second.ts');
    expect(collectAttachments('@first.md then @sub/second.ts', root, undefined)).toEqual([
      { uri: pathToFileURL(first).href, name: 'first.md' },
      { uri: pathToFileURL(second).href, name: 'sub/second.ts' }
    ]);
  });
});
