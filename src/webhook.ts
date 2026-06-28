import type { Bot } from 'grammy';
import type { BotContext } from './bot/middlewares/user.js';
import { User } from './models/User.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import express from 'express';
import { scrape, closeBrowser } from './api/scraper/index.js';

export function setupWebhookServer(bot: Bot<BotContext>) {
  const app = express();
  app.use(express.json());

  const PORT = config.webhook.port;

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', bot: 'MediaDownloader', timestamp: new Date().toISOString() });
  });

  app.get('/api/scrape', async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ success: false, error: 'Missing "url" query parameter' });
      return;
    }
    logger.info(`[API] Scrape request: ${url}`);
    const result = await scrape(url);
    res.status(result.success ? 200 : 422).json(result);
  });

  app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: 'Missing "url" in request body' });
      return;
    }
    logger.info(`[API] Scrape request (POST): ${url}`);
    const result = await scrape(url);
    res.status(result.success ? 200 : 422).json(result);
  });

  app.post('/webhook', async (req, res) => {
    const payload = req.body;

    logger.info('Webhook received', { event: payload?.event, invoice_id: payload?.invoice_id });

    if (!payload || payload.event !== 'payment.completed') {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const { invoice_id, amount, final_amount } = payload;

    if (!invoice_id) {
      res.status(400).json({ error: 'Missing invoice_id' });
      return;
    }

    try {
      const user = await User.findOne({ 'payment.invoiceId': invoice_id });
      if (!user) {
        logger.warn('Webhook for unknown invoice', { invoice_id });
        res.status(200).json({ received: true });
        return;
      }

      if ((user as any).payment?.status === 'completed') {
        logger.info('Duplicate webhook, already processed', { invoice_id });
        res.status(200).json({ received: true });
        return;
      }

      const plan = (user as any).payment?.plan;
      let premiumDays = 30;
      if (plan === '3months') premiumDays = 90;
      if (plan === 'year') premiumDays = 365;

      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + premiumDays);

      await User.updateOne(
        { telegramId: user.telegramId },
        {
          $set: {
            isPremium: true,
            premiumUntil,
            'payment.status': 'completed',
            'payment.paidAt': new Date(),
            'payment.amount': final_amount || amount,
          },
        },
      );

      const planNames: Record<string, string> = {
        month: 'ماهانه',
        '3months': 'سه‌ماهه',
        year: 'سالانه',
      };

      const amountStr = ((final_amount || amount) / 10).toLocaleString('fa-IR');

      await bot.api.sendMessage(
        user.telegramId,
        `✅ **پرداخت موفق!**\n\n💎 اشتراک ${planNames[plan] || plan} فعال شد.\n💰 مبلغ پرداختی: ${amountStr} تومان\n\nاز این به بعد از مزایای پرمیوم بهره‌مند می‌شوی!`,
        { parse_mode: 'Markdown' },
      );

      logger.info('Payment processed', { invoice_id, userId: user.telegramId, plan });
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error('Webhook processing error', err);
      res.status(200).json({ received: true });
    }
  });

  app.listen(PORT, () => {
    logger.info(`Health + Webhook server listening on port ${PORT}`);
  });

  return app;
}
