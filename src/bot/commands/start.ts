import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { mainMenuKeyboard } from '../keyboards.js';
import { User } from '../../models/User.js';
import { logger } from '../../utils/logger.js';

export async function startCommand(ctx: BotContext) {
  const name = ctx.from?.first_name ?? '';
  const text = ctx.message?.text ?? '';

  const refMatch = text.match(/start\s+(ref_\d+)/);
  if (refMatch) {
    const referrerTid = parseInt(refMatch[1].replace('ref_', ''), 10);
    if (referrerTid && referrerTid !== ctx.from?.id) {
      try {
        const referrer = await User.findOne({ telegramId: referrerTid });
        if (referrer) {
          await User.updateOne(
            { telegramId: referrerTid },
            {
              $inc: {
                'referral.referralCount': 1,
                'referral.bonusBytes': 500 * 1024 * 1024,
              },
            },
          );

          const user = ctx.session.user;
          if (user) {
            await User.updateOne(
              { telegramId: ctx.from!.id },
              { $set: { 'referral.referredBy': referrerTid } },
            );
          }

          try {
            await ctx.api.sendMessage(
              referrerTid,
              `🎉 **یک نفر با لینک دعوت تو عضو شد!**\n\n+۵۰۰ مگابایت سهمیه اضافی دریافت کردی!`,
              { parse_mode: 'Markdown' },
            );
          } catch { /* user might have blocked the bot */ }

          await ctx.reply(
            `🎉 با موفقیت عضو شدی!\n\n${(referrer as any).firstName} تو رو به ربات دعوت کرده.\n🎁 **۵۰۰ مگابایت سهمیه اضافی** به عنوان هدیه دریافت کردی!`,
            {
              parse_mode: 'Markdown',
              reply_markup: mainMenuKeyboard(),
            },
          );
          return;
        }
      } catch (err: any) {
        logger.error('Referral processing error', err.message);
      }
    }
  }

  await ctx.reply(fa.start(name), {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(),
  });
}
