import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { mainMenuKeyboard } from '../keyboards.js';

export async function premiumCommand(ctx: BotContext) {
  await ctx.reply(fa.premium, {
    parse_mode: 'Markdown',
    reply_markup: (await import('../keyboards.js')).premiumKeyboard(),
  });
}
