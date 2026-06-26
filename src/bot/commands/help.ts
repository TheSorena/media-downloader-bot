import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';

export async function helpCommand(ctx: BotContext) {
  await ctx.reply(fa.help, { parse_mode: 'Markdown' });
}
