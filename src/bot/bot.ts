import { Bot } from 'grammy';
import type { BotContext } from './middlewares/user.js';
import { userMiddleware, banCheckMiddleware } from './middlewares/user.js';
import { forceJoinMiddleware } from './middlewares/forceJoin.js';
import { startCommand } from './commands/start.js';
import { helpCommand } from './commands/help.js';
import { statsCommand } from './commands/stats.js';
import { settingsCommand } from './commands/settings.js';
import { historyCommand } from './commands/history.js';
import { cancelCommand } from './commands/cancel.js';
import { adminCommand } from './commands/admin.js';
import { premiumCommand } from './commands/premium.js';
import { referralCommand } from './commands/referral.js';
import { setCookiesCommand, handleCookieUpload } from './commands/cookies.js';
import { handleUrl, handleQualitySelection, handleCancel, handleDownloadCancel } from './handlers/url.js';
import {
  handleSettingsQuality,
  handleSettingsAudioToggle,
  handleMenuBack,
  handleMenuStats,
  handleMenuSettings,
  handleMenuPremium,
  handleMenuHistory,
  handleMenuHelp,
} from './handlers/settings.js';
import {
  handleAdminStats,
  handleAdminUsers,
  handleAdminRecent,
  handleAdminBroadcast,
  handleAdminCancel,
  handleBroadcastMessage,
} from './handlers/admin.js';
import { fa } from '../locales/fa.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function createBot(): Bot<BotContext> {
  const clientOpts: any = {};
  if (config.bot.useLocalApi && config.bot.apiUrl) {
    clientOpts.apiRoot = config.bot.apiUrl;
    logger.info('استفاده از Local Bot API', config.bot.apiUrl);
  } else {
    logger.info('استفاده از API استاندارد تلگرام');
  }

  const bot = new Bot<BotContext>(config.bot.token, { client: clientOpts });

  bot.use(async (ctx, next) => {
    ctx.session = {} as any;
    return next();
  });

  bot.use(userMiddleware);
  bot.use(banCheckMiddleware);
  bot.use(forceJoinMiddleware);

  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('stats', statsCommand);
  bot.command('settings', settingsCommand);
  bot.command('history', historyCommand);
  bot.command('cancel', cancelCommand);
  bot.command('admin', adminCommand);
  bot.command('premium', premiumCommand);
  bot.command('referral', referralCommand);
  bot.command('setcookies', setCookiesCommand);

  bot.callbackQuery('menu:stats', handleMenuStats);
  bot.callbackQuery('menu:settings', handleMenuSettings);
  bot.callbackQuery('menu:premium', handleMenuPremium);
  bot.callbackQuery('menu:history', handleMenuHistory);
  bot.callbackQuery('menu:help', handleMenuHelp);
  bot.callbackQuery('menu:back', handleMenuBack);

  bot.callbackQuery(/^set:quality:(.+)$/, async (ctx) => {
    await handleSettingsQuality(ctx, ctx.match![1]);
  });
  bot.callbackQuery('set:audio:toggle', handleSettingsAudioToggle);

  bot.callbackQuery('admin:stats', handleAdminStats);
  bot.callbackQuery('admin:users', handleAdminUsers);
  bot.callbackQuery('admin:recent', handleAdminRecent);
  bot.callbackQuery('admin:broadcast', handleAdminBroadcast);
  bot.callbackQuery('admin:cancel', handleAdminCancel);

  bot.callbackQuery(/^dl:(.+)$/, async (ctx) => {
    const quality = ctx.match![1];
    await handleQualitySelection(ctx, quality);
  });

  bot.callbackQuery('cancel', handleCancel);
  bot.callbackQuery('download:cancel', handleDownloadCancel);

  bot.callbackQuery(/^pay:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const plan = ctx.match![1];

    const user = ctx.session.user;
    if (!user) return;

    const { createInvoice, PLAN_PRICES } = await import('../payment.js');
    const planInfo = PLAN_PRICES[plan];
    if (!planInfo) return;

    const invoice = await createInvoice({
      amount: planInfo.amount,
      description: `اشتراک پرمیوم ${planInfo.label}`,
      metadata: { userId: String(user.telegramId), plan },
    });

    if (!invoice) {
      await ctx.reply('❌ خطا در ایجاد فاکتور پرداخت. لطفاً دوباره تلاش کن.');
      return;
    }

    const { User } = await import('../models/User.js');
    await User.updateOne(
      { telegramId: user.telegramId },
      { $set: { 'payment.invoiceId': invoice.invoice_id, 'payment.plan': plan, 'payment.status': 'pending' } },
    );

    const amountToman = (planInfo.amount / 10).toLocaleString('fa-IR');
    await ctx.reply(
      `💰 **فاکتور پرداخت ایجاد شد**\n\n` +
      `📦 پلن: ${planInfo.label}\n` +
      `💵 مبلغ: ${amountToman} تومان\n\n` +
      `برای پرداخت روی لینک زیر کلیک کن:\n` +
      `${invoice.payment_url}`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.on('message:document', async (ctx) => {
    await handleCookieUpload(ctx);
  });

  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    const broadcastHandled = await handleBroadcastMessage(ctx, text);
    if (broadcastHandled) return;

    const user = ctx.session.user;
    if (user && !user.isPremiumActive()) {
      const { getDayKey } = await import('../utils/formatter.js');
      const dayKey = getDayKey();
      const used = user.getDailyQuotaUsed(dayKey);
      const limit = config.limits.freeDailyQuotaMB * 1024 * 1024;
      if (used >= limit) {
        const { formatBytes } = await import('../utils/formatter.js');
        await ctx.reply(fa.quotaExceeded(formatBytes(used), formatBytes(limit)));
        return;
      }
    }
    await handleUrl(ctx);
  });

  bot.catch((err) => {
    logger.error('خطای ربات', err.error);
  });

  return bot;
}
