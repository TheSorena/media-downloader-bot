import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { settingsKeyboard } from '../keyboards.js';

export async function settingsCommand(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const settings = user.settings || { defaultQuality: '720p', preferAudio: false };

  await ctx.reply(fa.settings(settings.defaultQuality, settings.preferAudio), {
    parse_mode: 'Markdown',
    reply_markup: settingsKeyboard(settings),
  });
}
