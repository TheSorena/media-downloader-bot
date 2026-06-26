import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { formatBytes, formatNumber, getDayKey } from '../../utils/formatter.js';

export async function statsCommand(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const dayKey = getDayKey();
  const usedToday = user.getDailyQuotaUsed(dayKey);
  const totalQuota = 5 * 1024 * 1024 * 1024;
  const remaining = Math.max(0, totalQuota - usedToday);

  const status = user.isPremiumActive() ? '💎 پرمیوم' : '🎁 رایگان';

  const msg =
    `📊 **آمار شما**\n\n` +
    `📊 وضعیت: ${status}\n\n` +
    `📥 کل دانلودها: ${formatNumber(user.downloadCount)}\n` +
    `💾 کل حجم دانلودشده: ${formatBytes(user.totalBytesDownloaded)}\n\n` +
    `📅 **سهمیه امروز:**\n` +
    `استفاده‌شده: ${formatBytes(usedToday)}\n` +
    `باقی‌مانده: ${formatBytes(remaining)}\n` +
    `حداکثر: ${formatBytes(totalQuota)}`;

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}
