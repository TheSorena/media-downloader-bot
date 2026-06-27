import type { BotContext } from '../middlewares/user.js';
import { fa } from '../../locales/fa.js';
import { config } from '../../config/index.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { logger } from '../../utils/logger.js';

export async function setCookiesCommand(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const { config: cfg } = await import('../../config/index.js');
  if (!cfg.bot.adminIds.includes(user.telegramId)) {
    await ctx.reply('🚫 فقط ادمین می‌تونه کوکی تنظیم کنه.');
    return;
  }

  await ctx.reply(
    '🍪 **تنظیم کوکی یوتیوب**\n\n' +
    'فایل `cookies.txt` رو از مرورگرت export کن و اینجا بفرست.\n\n' +
    '📋 **نحوه export:**\n' +
    '1. اکستنشن **"Get cookies.txt LOCALLY"** رو نصب کن\n' +
    '2. وارد یوتیوب شو\n' +
    '3. اکستنشن رو باز کن → **Export**\n' +
    '4. فایل رو اینجا بفرست\n\n' +
    '⚠️ فقط ادمین می‌تونه کوکی تنظیم کنه.',
    { parse_mode: 'Markdown' },
  );
}

export async function handleCookieUpload(ctx: BotContext) {
  const user = ctx.session.user;
  if (!user) return;

  const { config: cfg } = await import('../../config/index.js');
  if (!cfg.bot.adminIds.includes(user.telegramId)) return;

  const document = ctx.message?.document;
  if (!document) return;

  const fileName = document.file_name || '';
  if (!fileName.endsWith('.txt') && !fileName.endsWith('.cookies')) {
    await ctx.reply('❌ فایل باید با پسوند `.txt` یا `.cookies` باشه.');
    return;
  }

  try {
    const file = await ctx.api.getFile(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${cfg.bot.token}/${file.file_path}`;

    const response = await fetch(fileUrl);
    if (!response.ok) {
      await ctx.reply('❌ خطا در دانلود فایل.');
      return;
    }

    const content = await response.text();

    if (!content.includes('youtube.com') && !content.includes('google.com')) {
      await ctx.reply('❌ این فایل کوکی یوتیوب نیست. لطفاً فایل cookies.txt رو از مرورگر export کن.');
      return;
    }

    const cookiesDir = join(process.cwd(), 'cookies');
    if (!existsSync(cookiesDir)) {
      await mkdir(cookiesDir, { recursive: true });
    }

    const cookiesPath = join(cookiesDir, 'cookies.txt');
    await writeFile(cookiesPath, content, 'utf-8');

    process.env.COOKIE_FILE = cookiesPath;

    const { resetInnertube } = await import('../../downloader/youtube.js');
    resetInnertube();

    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    await ctx.reply(
      `✅ **کوکی با موفقیت ذخیره شد!**\n\n` +
      `📁 مسیر: \`${cookiesPath}\`\n` +
      `📊 تعداد خطوط: ${lines.length}\n\n` +
      `از این به بعد یوتیوب با کوکی دانلود می‌شه.`,
      { parse_mode: 'Markdown' },
    );

    logger.info('Cookies file saved', { path: cookiesPath, lines: lines.length });
  } catch (err: any) {
    logger.error('Cookie upload error', err.message);
    await ctx.reply(`❌ خطا: ${err.message}`);
  }
}
