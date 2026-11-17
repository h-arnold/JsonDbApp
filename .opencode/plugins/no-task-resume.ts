import { Plugin } from '@opencode/plugin';
import { Schema } from 'effect';

const STRIPPED_NOTICE = [
  '<notice>The sessionID you supplied was ignored and a brand new subagent session was created,',
  'so this result comes from a fresh context rather than a continuation of the earlier session.',
  'Restate any needed context in the next prompt instead of relying on resumption.</notice>'
].join(' ');

/**
 * Narrow unknown tool arguments to an object record.
 * @param {unknown} value - The value to inspect.
 * @returns {value is Record<string, unknown>} Whether the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default Plugin.define({
  id: 'jsondbapp-no-task-resume',
  async setup(ctx) {
    const strippedCalls = new Set<string>();

    await ctx.tool.transform((tools) => {
      tools.update('subagent', (tool) => {
        const input = tool.input as unknown as Schema.Struct<Schema.Struct.Fields>;
        const fields = { ...input.fields };
        delete fields.sessionID;
        tool.input = Schema.Struct(fields) as unknown as typeof tool.input;
        tool.description = `${tool.description}\n\nSubagent sessions are never resumed in this project: every invocation starts with a fresh context, so the sessionID parameter is unavailable and any previous context must be restated in the prompt.`;
      });
    });

    await ctx.tool.hook('execute.before', (event) => {
      if (event.tool !== 'subagent' || !isRecord(event.input)) return;
      const sessionID = event.input.sessionID;
      if (typeof sessionID !== 'string' || sessionID.length === 0) return;
      strippedCalls.add(event.id);
      delete event.input.sessionID;
    });

    await ctx.tool.hook('execute.after', (event) => {
      if (event.tool !== 'subagent') return;
      const wasStripped = strippedCalls.delete(event.id);
      if (event.status !== 'completed' || !wasStripped) return;
      const content = event.result.content;
      if (typeof content === 'string') {
        Object.assign(event.result, { content: `${content}\n\n${STRIPPED_NOTICE}` });
      } else if (Array.isArray(content)) {
        Object.assign(event.result, {
          content: [...content, { type: 'text' as const, text: STRIPPED_NOTICE }]
        });
      } else {
        Object.assign(event.result, { content: STRIPPED_NOTICE });
      }
    });
  }
});
