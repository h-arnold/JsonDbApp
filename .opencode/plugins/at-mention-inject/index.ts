import { Plugin } from '@opencode/plugin';
import { collectAttachments } from './resolve.ts';

export default Plugin.define({
  id: 'jsondbapp-at-mention-inject',
  async setup(ctx) {
    // The core reads `event.prompt` after the trigger, so mutating `files` in
    // place is what takes effect. The plugin is instantiated per location, so
    // `ctx.location.directory` is the directory of the session being prompted.
    await ctx.session.hook('prompt', (event) => {
      const attachments = collectAttachments(
        event.prompt.text,
        ctx.location.directory,
        event.prompt.files
      );
      if (attachments.length === 0) return;
      event.prompt.files ??= [];
      event.prompt.files.push(...attachments);
    });
  }
});
