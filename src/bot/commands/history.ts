import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { formatBytes, getDayKey } from '../../utils/formatter.js';
import { Download } from '../../models/Download.js';

export async function historyCommand(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const downloads = await Download.find({ telegramId: user.telegramId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const formatted = downloads.map((dl: any) => ({
    title: dl.title || 'بدون عنوان',
    platform: dl.platform || 'نامشخص',
    createdAt: new Date(dl.createdAt).toLocaleDateString('fa-IR'),
    fileSize: dl.fileSize ? formatBytes(dl.fileSize) : 'نامشخص',
    quality: dl.quality || 'نامشخص',
  }));

  await ctx.reply(fa.history(formatted), { parse_mode: 'Markdown' });
}
