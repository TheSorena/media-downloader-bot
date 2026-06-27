import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { formatBytes, formatNumber, getDayKey } from '../../utils/formatter.js';
import { config } from '../../config/index.js';

export async function statsCommand(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const dayKey = getDayKey();
  const usedToday = user.getDailyQuotaUsed(dayKey);
  const totalQuota = config.limits.freeDailyQuotaMB * 1024 * 1024;
  const remaining = Math.max(0, totalQuota - usedToday);

  const isPremium = user.isPremiumActive();
  const status = isPremium ? '💎 پرمیوم' : '🎁 رایگان';

  const msg = fa.stats(
    formatBytes(usedToday),
    isPremium ? '∞ نامحدود' : formatBytes(totalQuota),
    user.downloadCount,
    isPremium ? '∞ نامحدود' : formatBytes(remaining),
    status,
  );

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}
