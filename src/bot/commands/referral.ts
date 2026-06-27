import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { config } from '../../config/index.js';
import crypto from 'node:crypto';

export async function referralCommand(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const botUsername = (await ctx.api.getMe()).username;
  const code = `ref_${user.telegramId}`;
  const link = `https://t.me/${botUsername}?start=${code}`;

  const referralCount = (user as any).referralCount || 0;
  const bonusMB = referralCount * 500;

  await ctx.reply(
    `🎁 **سیستم دعوت**\n\n` +
    `لینک دعوت اختصاصی تو:\n` +
    `${link}\n\n` +
    `👥 تعداد دعوت‌شده‌ها: ${referralCount}\n` +
    `💾 سهمیه دریافتی: ${bonusMB} مگابایت\n\n` +
    `به ازای هر نفر که با لینک تو عضو بشه، ۵۰۰ مگابایت سهمیه اضافی می‌گیری!`,
    { parse_mode: 'Markdown' },
  );
}
