import { config } from './config/index.js';
import { createBot } from './bot/bot.js';
import { logger } from './utils/logger.js';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function main() {
  logger.info('=== تست ربات مدیا دانلودر (Mock DB) ===');

  const dlDir = resolve(config.downloadDir);
  if (!existsSync(dlDir)) {
    await mkdir(dlDir, { recursive: true });
    logger.info('پوشه دانلود ساخته شد', dlDir);
  }

  logger.info('استفاده از دیتابیس در-حافظه‌ای (Mock)');
  logger.info('API: استاندارد تلگرام (حداکثر 50MB)');

  const bot = createBot();

  const me = await bot.api.getMe();
  logger.info('ربات متصل شد', { username: me.username, name: me.first_name });

  bot.start({
    onStart: () => {
      logger.info('========================================');
      logger.info('ربات فعال است! پیام بفرستید.');
      logger.info('========================================');
    },
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query'],
  });
}

main().catch((err) => {
  logger.error('خطای بحرانی', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('در حال خاموش کردن...');
  process.exit(0);
});
