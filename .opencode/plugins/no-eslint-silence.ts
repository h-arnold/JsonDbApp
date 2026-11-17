import { Plugin } from '@opencode/plugin';

const SILENCE_PATTERNS = [
  /eslint-disable(?:-next-line|-line)?/i,
  /@ts-ignore/i,
  /@ts-nocheck/i,
  /@ts-expect-error/i,
  /noqa/i,
  /type:\s*ignore/i
];

const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.vue',
  '.svelte'
]);

/**
 * Narrow unknown tool arguments to an object record.
 * @param {unknown} value - The value to inspect.
 * @returns {value is Record<string, unknown>} Whether the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Return the matched suppression pattern, if any.
 * @param {string} text - Source text to inspect.
 * @returns {string | null} The pattern source or null.
 */
function hasSilencingRule(text: string): string | null {
  for (const pattern of SILENCE_PATTERNS) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

/**
 * Determine whether a tool path targets source code outside plugin configuration.
 * @param {unknown} filePath - The path to inspect.
 * @returns {filePath is string} Whether the path is a source file.
 */
function isSourceFile(filePath: unknown): filePath is string {
  if (typeof filePath !== 'string') return false;
  const normalisedPath = filePath.replaceAll('\\', '/');
  if (
    normalisedPath.startsWith('.opencode/plugins/') ||
    normalisedPath.includes('/.opencode/plugins/')
  )
    return false;
  const fileName = normalisedPath.split('/').pop() ?? '';
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return SOURCE_EXTENSIONS.has(extension);
}

/**
 * Reject suppression constructs in the affected section of an edit or write.
 * @param {'edit' | 'write'} operation - The tool operation.
 * @param {unknown} input - The operation arguments.
 */
function rejectIfSuppressed(operation: 'edit' | 'write', input: unknown): void {
  if (!isRecord(input) || !isSourceFile(input.path)) return;
  const content = operation === 'edit' ? input.newString : input.content;
  if (typeof content !== 'string') return;
  const match = hasSilencingRule(content);
  if (!match) return;
  throw new Error(
    `Blocked ${operation}: new text contains a lint silencing rule (${match}). ` +
      'Disabling eslint rules (configured in eslint.config.js) through this construct is blocked. ' +
      'Fix the underlying issue rather than suppressing the warning. ' +
      'If you are unable to address the underlying issue, stop work and hand back to the user to ask for permission, explaining why there is no other way around the rule.'
  );
}

/**
 * Inspect added source lines in a V2 patch for suppression constructs.
 * @param {unknown} input - The patch arguments.
 */
function rejectSuppressedPatch(input: unknown): void {
  if (!isRecord(input) || typeof input.patchText !== 'string') return;
  let currentPath: string | null = null;
  for (const line of input.patchText.split(/\r?\n/)) {
    const markerPath = patchMarkerPath(line);
    if (markerPath !== undefined) {
      currentPath = markerPath;
      continue;
    }
    const match = addedLineMatch(line, currentPath);
    if (!match) continue;
    throw new Error(
      `Blocked patch: added source text contains a lint silencing rule (${match}). ` +
        'Disabling eslint rules (configured in eslint.config.js) through this construct is blocked. ' +
        'Fix the underlying issue rather than suppressing the warning. ' +
        'If you are unable to address the underlying issue, stop work and hand back to the user to ask for permission, explaining why there is no other way around the rule.'
    );
  }
}

/**
 * Find a suppression rule in an added source line.
 * @param {string} line - The diff line.
 * @param {string | null} filePath - The current destination path.
 * @returns {string | null} The matching pattern, if present.
 */
function addedLineMatch(line: string, filePath: string | null): string | null {
  if (!line.startsWith('+') || !filePath || !isSourceFile(filePath)) return null;
  return hasSilencingRule(line.slice('+'.length));
}

/**
 * Extract the destination path from a V2 patch file marker.
 * @param {string} line - The line to inspect.
 * @returns {string | null | undefined} The destination path, null for a delete marker, or undefined when the line is not a file marker.
 */
function patchMarkerPath(line: string): string | null | undefined {
  const addPrefix = '*** Add File: ';
  const updatePrefix = '*** Update File: ';
  const movePrefix = '*** Move to:';
  if (line.startsWith(addPrefix)) return line.slice(addPrefix.length).trim();
  if (line.startsWith(updatePrefix)) return line.slice(updatePrefix.length).trim();
  if (line.startsWith(movePrefix)) return line.slice(movePrefix.length).trim();
  if (line.startsWith('*** Delete File: ')) return null;
  return undefined;
}

export default Plugin.define({
  id: 'jsondbapp-no-eslint-silence',
  async setup(ctx) {
    await ctx.tool.hook('execute.before', (event) => {
      if (event.tool === 'edit' || event.tool === 'write') {
        rejectIfSuppressed(event.tool, event.input);
      } else if (event.tool === 'patch') {
        rejectSuppressedPatch(event.input);
      }
    });
  }
});
