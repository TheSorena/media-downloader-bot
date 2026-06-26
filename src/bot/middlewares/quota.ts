import type { Middleware } from 'grammy';
import type { BotContext } from './user.js';
import { config } from '../../config/index.js';
import { formatBytes, getDayKey } from '../../utils/formatter.js';
import { fa } from '../../locales/fa.js';

export const quotaMiddleware: Middleware<BotContext> = async (ctx, next) => {
  const user = ctx.session.user;
  if (!user) return next();

  if (user.isPremiumActive()) return next();

  const dayKey = getDayKey();
  const used = user.getDailyQuotaUsed(dayKey);
  const limit = config.limits.freeDailyQuotaMB * 1024 * 1024;
  if (used >= limit) {
    await ctx.reply(fa.quotaExceeded(formatBytes(used), formatBytes(limit)));
    return;
  }
  return next();
};

export function checkQuota(user: any, fileSize: number): { ok: boolean; message?: string } {
  if (user.isPremiumActive()) return { ok: true };

  const maxFile = config.limits.freeMaxFileMB * 1024 * 1024;
  if (fileSize > maxFile) {
    return {
      ok: false,
      message: fa.fileTooLarge(formatBytes(fileSize), formatBytes(maxFile)),
    };
  }

  const dayKey = getDayKey();
  const used = user.getDailyQuotaUsed(dayKey);
  const limit = config.limits.freeDailyQuotaMB * 1024 * 1024;
  if (used + fileSize > limit) {
    return {
      ok: false,
      message: fa.quotaExceeded(formatBytes(used), formatBytes(limit)),
    };
  }

  return { ok: true };
}
