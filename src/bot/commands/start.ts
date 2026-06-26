import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { mainMenuKeyboard } from '../keyboards.js';

export async function startCommand(ctx: BotContext) {
  const name = ctx.from?.first_name ?? '';
  await ctx.reply(`${name} عزیز ${fa.start}`, {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(),
  });
}
