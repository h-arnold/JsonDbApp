import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PromptInput } from '@opencode/schema/prompt-input';

// V1's file-mention pattern, preserved behaviour-for-behaviour: a token must not
// be preceded by a word character or backtick, and it stops at whitespace,
// commas, backticks and periods. The inner alternation replaces V1's
// `(?:\.[^\s`,.]+)*` tail: the two are exhaustively equivalent (a period may
// appear only when followed by a non-boundary character), but this form avoids
// the `security/detect-unsafe-regex` false positive on the nested quantifier.
const FILE_REGEX = /(?<![\w`])@(\.?(?:[^\s`,.]|\.(?=[^\s`,.]))*)/g;

/**
 * File size cap in kibibytes. V1 applied no attachment size cap; this is a
 * deliberate V2 guard so that an oversized mention cannot make prompt admission
 * fail (core rejects attachments above 20 MiB by failing the whole prompt).
 */
const MAX_FILE_SIZE_KIB = 200;

/** Number of bytes in one kibibyte. */
const BYTES_PER_KIB = 1024;

/** Maximum size, in bytes, of a regular file that may be attached. */
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_KIB * BYTES_PER_KIB;

/** A file attachment produced by `@path` resolution. */
export interface ResolvedAttachment {
  readonly uri: string;
  /** The raw captured token, matching V1's display name (for example `sub/file.ts`). */
  readonly name: string;
}

/**
 * Extract `@path` mention tokens from prompt text, preserving order.
 * @param {string} text - The prompt text to scan.
 * @returns {string[]} The captured path tokens.
 */
export function extractMentionTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const match of text.matchAll(FILE_REGEX)) {
    tokens.push(match[1]);
  }
  return tokens;
}

/**
 * Determine whether an absolute path is a strict descendant of the given root.
 * `path.relative` is used rather than a string prefix so that a sibling such as
 * `/root-other` is rejected, a root with a trailing separator is handled, and
 * the root itself is rejected.
 * @param {string} root - The absolute root directory.
 * @param {string} candidate - The absolute path to test.
 * @returns {boolean} True when the candidate lies strictly inside the root.
 */
function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Collect the identifier forms used to detect an already-attached file.
 * @param {readonly PromptInput.FileAttachment[] | undefined} existing - The prompt's current attachments.
 * @returns {Set<string>} Raw URIs and decoded absolute paths of the existing attachments.
 */
function existingIdentifiers(
  existing: readonly PromptInput.FileAttachment[] | undefined
): Set<string> {
  const identifiers = new Set<string>();
  for (const attachment of existing ?? []) {
    identifiers.add(attachment.uri);
    if (!attachment.uri.startsWith('file:')) continue;
    try {
      identifiers.add(path.resolve(fileURLToPath(attachment.uri)));
    } catch {
      // A malformed file URI cannot mark a duplicate, so it is ignored here.
    }
  }
  return identifiers;
}

/**
 * Test whether a resolved path exists and is within the size cap.
 * Directories are allowed because V2 renders a directory listing; regular files
 * above the cap are rejected so prompt admission cannot fail on an oversized file.
 * @param {string} realPath - The symlink-resolved absolute path to inspect.
 * @returns {boolean} True when the path may be attached.
 */
function isAttachable(realPath: string): boolean {
  try {
    const stats = statSync(realPath);
    return !stats.isFile() || stats.size <= MAX_FILE_SIZE_BYTES;
  } catch {
    // Missing or unreadable paths are skipped; this matches V1's behaviour.
    return false;
  }
}

/**
 * Resolve an absolute path to its real location when it is confined to the
 * root, both lexically and after symlink resolution. The lexical check runs
 * first as a cheap gate; the real path is then required to be confined too, so
 * an in-root link cannot point outside the root.
 * @param {string} root - The session's absolute location directory.
 * @param {string} realRoot - The symlink-resolved location directory.
 * @param {string} absolute - The absolute candidate path.
 * @returns {string | null} The symlink-resolved path when confined, otherwise null.
 */
function resolveConfined(root: string, realRoot: string, absolute: string): string | null {
  if (!isInsideRoot(root, absolute)) return null;
  const real = realpathSync(absolute);
  if (!isInsideRoot(realRoot, real)) return null;
  return real;
}

/**
 * Resolve a single mention token into an attachment, or skip it.
 * @param {string} token - The captured path token.
 * @param {string} root - The session's absolute location directory.
 * @param {string} realRoot - The symlink-resolved location directory.
 * @param {Set<string>} identifiers - Known attachment identifiers, extended on success.
 * @returns {ResolvedAttachment | null} The attachment, or null when the token is skipped.
 */
function resolveToken(
  token: string,
  root: string,
  realRoot: string,
  identifiers: Set<string>
): ResolvedAttachment | null {
  // V1 skipped empty captures, and an empty token would otherwise resolve to the
  // root directory itself and attach the whole session root.
  if (token.length === 0) return null;
  // A home-relative token must be rejected outright: `path.resolve` would fold
  // `~/...` into a path inside the root and the confinement test would pass.
  if (token.startsWith('~')) return null;
  const absolute = path.resolve(root, token);
  const real = resolveConfined(root, realRoot, absolute);
  if (real === null) return null;
  if (!isAttachable(real)) return null;
  const uri = pathToFileURL(absolute).href;
  if (identifiers.has(absolute) || identifiers.has(uri)) return null;
  identifiers.add(absolute);
  identifiers.add(uri);
  return { uri, name: token };
}

/**
 * Resolve every `@path` token in a prompt into attachable file descriptors.
 * @param {string} text - The prompt text to scan.
 * @param {string} root - The session's absolute location directory.
 * @param {readonly PromptInput.FileAttachment[] | undefined} existing - Attachments already on the prompt.
 * @returns {ResolvedAttachment[]} New attachments to append, in first-seen order.
 */
export function collectAttachments(
  text: string,
  root: string,
  existing: readonly PromptInput.FileAttachment[] | undefined
): ResolvedAttachment[] {
  let realRoot: string;
  try {
    realRoot = realpathSync(root);
  } catch {
    // Without a resolvable root the confinement boundary cannot be established,
    // so nothing is attached.
    return [];
  }
  const identifiers = existingIdentifiers(existing);
  const attachments: ResolvedAttachment[] = [];
  for (const token of extractMentionTokens(text)) {
    try {
      const attachment = resolveToken(token, root, realRoot, identifiers);
      if (attachment) attachments.push(attachment);
    } catch {
      // Per-token skips (unreadable paths, malformed URIs) are expected outcomes,
      // not swallowed faults, and must never fail prompt admission.
    }
  }
  // V1 also mapped unmatched tokens to agent mentions. That is deliberately
  // omitted: V2 agent mentions do not switch agents, so it would be noise.
  return attachments;
}
