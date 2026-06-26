import type { Context, Middleware } from 'grammy';
import { User } from '../../models/User.js';
import { getDayKey } from '../../utils/formatter.js';
import { logger } from '../../utils/logger.js';

interface SessionData {
  user?: any;
}

export interface BotContext extends Context {
  session: SessionData;
}

export const userMiddleware: Middleware<BotContext> = async (ctx, next) => {
  if (!ctx.from) {
    return next();
  }

  const tid = ctx.from.id;
  const dayKey = getDayKey();

  try {
    let user = await User.findOne({ telegramId: tid });
    if (!user) {
      user = new User({
        telegramId: tid,
        firstName: ctx.from.first_name ?? '',
        lastName: ctx.from.last_name ?? '',
        username: ctx.from.username ?? '',
      });
      await user.save();
      logger.info('کاربر جدید ثبت شد', { tid, name: user.firstName });
    } else {
      const updates: Record<string, any> = { lastActiveAt: new Date() };
      if (user.firstName !== (ctx.from.first_name ?? '')) updates.firstName = ctx.from.first_name ?? '';
      if (user.username !== (ctx.from.username ?? '')) updates.username = ctx.from.username ?? '';
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ telegramId: tid }, { $set: updates });
      }
      if (!user.quota || user.quota.date !== dayKey) {
        user.quota = { date: dayKey, bytesUsed: 0 };
        await user.save();
      }
    }

    ctx.session.user = user;
  } catch (err) {
    logger.error('خطا در middleware کاربر', err);
  }

  return next();
};

export const banCheckMiddleware: Middleware<BotContext> = async (ctx, next) => {
  const user = ctx.session.user;
  if (user?.isBanned) {
    return ctx.reply('🚫 شما از استفاده از این ربات مسدود شده‌اید.');
  }
  return next();
};
