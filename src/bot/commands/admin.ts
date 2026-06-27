import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { User } from '../../models/User.js';
import { Download } from '../../models/Download.js';
import { formatBytes, getDayKey } from '../../utils/formatter.js';
import { adminKeyboard } from '../keyboards.js';

export async function adminCommand(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const { config } = await import('../../config/index.js');
  if (!config.bot.adminIds.includes(user.telegramId)) {
    await ctx.reply('🚫 شما دسترسی ادمین ندارید.');
    return;
  }

  const totalUsers = await User.countDocuments();
  const totalDownloads = await Download.countDocuments();

  const todayKey = getDayKey();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayDownloads = await Download.countDocuments({
    createdAt: { $gte: todayStart },
  });

  const todayAgg = await Download.aggregate([
    { $match: { createdAt: { $gte: todayStart } } },
    { $group: { _id: null, total: { $sum: '$fileSize' } } },
  ]);
  const todayTraffic = todayAgg.length > 0 ? formatBytes(todayAgg[0].total) : '۰ بایت';

  await ctx.reply(
    fa.adminDashboard(totalUsers, totalDownloads, todayDownloads, todayTraffic),
    {
      parse_mode: 'Markdown',
      reply_markup: adminKeyboard(),
    },
  );
}
