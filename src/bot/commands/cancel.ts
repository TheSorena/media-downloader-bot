import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';

export async function cancelCommand(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const { activeDownloads } = await import('../handlers/url.js');

  if (!activeDownloads.has(user.telegramId)) {
    await ctx.reply(fa.noActiveDownload);
    return;
  }

  activeDownloads.delete(user.telegramId);
  await ctx.reply(fa.cancelActive);
}
