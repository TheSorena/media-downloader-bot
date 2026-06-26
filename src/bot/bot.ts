import { Bot } from 'grammy';
import type { BotContext } from './middlewares/user.js';
import { userMiddleware, banCheckMiddleware } from './middlewares/user.js';
import { checkQuota } from './middlewares/quota.js';
import { startCommand } from './commands/start.js';
import { helpCommand } from './commands/help.js';
import { statsCommand } from './commands/stats.js';
import { handleUrl, handleQualitySelection, handleCancel } from './handlers/url.js';
import { premiumKeyboard } from './keyboards.js';
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
    logger.debug('update دریافت شد', { type: ctx.update?.update_id, from: ctx.from?.id, text: (ctx as any).message?.text?.slice(0, 50) });
    return next();
  });

  bot.use(userMiddleware);
  bot.use(banCheckMiddleware);

  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('stats', statsCommand);

  bot.command('premium', async (ctx) => {
    await ctx.reply(fa.premium, {
      parse_mode: 'Markdown',
      reply_markup: premiumKeyboard(),
    });
  });

  bot.callbackQuery(/^dl:(.+)$/, async (ctx) => {
    const quality = ctx.match![1];
    await handleQualitySelection(ctx, quality);
  });

  bot.callbackQuery('cancel', handleCancel);

  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();
    await handleUrl(ctx);
  });

  bot.catch((err) => {
    logger.error('خطای ربات', err.error);
  });

  return bot;
}
