import mongoose from 'mongoose';
import { config } from './config/index.js';
import { createBot } from './bot/bot.js';
import { setupWebhookServer } from './webhook.js';
import { logger } from './utils/logger.js';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function main() {
  logger.info('در حال راه‌اندازی ربات مدیا دانلودر...');

  if (!existsSync(config.downloadDir)) {
    await mkdir(config.downloadDir, { recursive: true });
    logger.info('پوشه دانلود ساخته شد', config.downloadDir);
  }

  logger.info('در حال اتصال به MongoDB...', { uri: config.db.uri });
  await mongoose.connect(config.db.uri);
  logger.info('اتصال به MongoDB برقرار شد.');

  const bot = createBot();

  const me = await bot.api.getMe();
  logger.info('ربات راه‌اندازی شد', { username: me.username, name: me.first_name });

  setupWebhookServer(bot);

  bot.start({
    onStart: () => logger.info('ربات با موفقیت شروع به کار کرد. ✅'),
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query'],
  });
}

main().catch((err) => {
  logger.error('خطای بحرانی در راه‌اندازی', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  const { closeBrowser } = await import('./api/scraper/index.js');
  await closeBrowser();
  logger.info('دریافت SIGINT - در حال خاموش کردن...');
  process.exit(0);
});
process.on('SIGTERM', async () => {
  const { closeBrowser } = await import('./api/scraper/index.js');
  await closeBrowser();
  logger.info('دریافت SIGTERM - در حال خاموش کردن...');
  process.exit(0);
});
