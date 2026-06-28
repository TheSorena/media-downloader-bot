import type { BotContext } from '../middlewares/user.js';
import { detectPlatform, isYouTubeUrl } from '../../utils/urlParser.js';
import { checkQuota } from '../middlewares/quota.js';
import { progressKeyboard } from '../keyboards.js';
import { InputFile } from 'grammy';
import { fa } from '../../locales/fa.js';
import { formatBytes, formatDuration, getDayKey } from '../../utils/formatter.js';
import { Download } from '../../models/Download.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { scrape } from '../../api/scraper/index.js';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { writeFile, stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

export const activeDownloads = new Map<number, boolean>();

const SCRAPE_API_URL = `http://localhost:${config.webhook.port}/api/scrape`;

async function downloadFile(url: string, destPath: string): Promise<number> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
      'Referer': 'https://www.google.com/',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

  const nodeStream = Readable.fromWeb(res.body as any);
  await pipeline(nodeStream, createWriteStream(destPath));

  const { size } = await stat(destPath);
  return size;
}

export async function handleUrl(ctx: BotContext) {
  const text = ctx.message?.text;
  if (!text) return;

  const parsed = detectPlatform(text);
  if (!parsed) {
    await ctx.reply(fa.unsupportedUrl);
    return;
  }

  const user = ctx.session.user;
  if (!user) return;

  if (activeDownloads.has(user.telegramId)) {
    await ctx.reply(fa.alreadyDownloading);
    return;
  }

  if (parsed.isPlaylist) {
    if (!user.isPremiumActive()) {
      await ctx.reply(fa.playlistNotSupported);
      return;
    }
  }

  const statusMsg = await ctx.reply(fa.waitingForInfo);

  try {
    const result = await scrape(parsed.url);

    if (!result.success || !result.data || result.data.media.length === 0) {
      await ctx.api.editMessageText(
        statusMsg.chat.id,
        statusMsg.message_id,
        fa.error(result.error || 'امکان دریافت اطلاعات ویدیو وجود ندارد.'),
      );
      return;
    }

    const media = result.data.media[0];
    const title = result.data.title || 'دانلود فایل';
    const isAudio = media.type === 'audio';
    const format = media.format || (isAudio ? 'mp3' : 'mp4');

    await ctx.api.editMessageText(
      statusMsg.chat.id,
      statusMsg.message_id,
      '⬇️ در حال دانلود...',
    );

    activeDownloads.set(user.telegramId, true);

    const downloadDoc = new Download({
      userId: user.telegramId,
      telegramId: user.telegramId,
      url: parsed.url,
      platform: parsed.platform,
      title,
      duration: result.data.duration || 0,
      quality: isAudio ? 'audio' : 'video',
      status: 'downloading',
      startedAt: new Date(),
    });
    await downloadDoc.save();

    const fileId = randomUUID().slice(0, 8);
    const filePath = join(config.downloadDir, `${fileId}.${format}`);

    const fileSize = await downloadFile(media.url, filePath);

    const quotaCheck = checkQuota(user, fileSize);
    if (!quotaCheck.ok) {
      await unlink(filePath).catch(() => {});
      await ctx.api.editMessageText(statusMsg.chat.id, statusMsg.message_id, quotaCheck.message!);
      await downloadDoc.deleteOne();
      activeDownloads.delete(user.telegramId);
      return;
    }

    await ctx.api.editMessageText(statusMsg.chat.id, statusMsg.message_id, fa.uploadStarted);

    downloadDoc.status = 'uploading';
    await downloadDoc.save();

    const caption = fa.success(title, formatBytes(fileSize), '', parsed.platform, isAudio ? 'audio' : 'video');

    let sentMsg;
    if (isAudio) {
      sentMsg = await ctx.replyWithAudio(new InputFile(filePath), {
        caption,
        parse_mode: 'Markdown',
        title,
      });
    } else {
      sentMsg = await ctx.replyWithVideo(new InputFile(filePath), {
        caption,
        parse_mode: 'Markdown',
      });
    }

    if (sentMsg) {
      await Download.updateOne({ _id: downloadDoc._id }, { $set: { telegramMessageId: sentMsg.message_id } });
    }

    await ctx.api.deleteMessage(statusMsg.chat.id, statusMsg.message_id).catch(() => {});

    await unlink(filePath).catch(() => {});
    await user.addQuotaUsage(getDayKey(), fileSize);

    downloadDoc.status = 'completed';
    downloadDoc.fileSize = fileSize;
    downloadDoc.format = format;
    downloadDoc.completedAt = new Date();
    await downloadDoc.save();

    logger.info('دانلود و آپلود کامل شد', { tid: user.telegramId, title, size: fileSize });
  } catch (err: any) {
    logger.error('خطا در فرآیند دانلود', err.message);
    await ctx.api.editMessageText(
      statusMsg.chat.id,
      statusMsg.message_id,
      fa.error(err.message),
    ).catch(() => {});
  } finally {
    activeDownloads.delete(user.telegramId);
  }
}

export async function handleQualitySelection(_ctx: BotContext, _quality: string) {
  // Quality selection no longer needed - auto-downloads best quality
}

export async function handleCancel(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.reply(fa.cancelled);
}

export async function handleDownloadCancel(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const user = ctx.session.user;
  if (!user) return;

  if (!activeDownloads.has(user.telegramId)) {
    await ctx.reply(fa.noActiveDownload);
    return;
  }

  activeDownloads.delete(user.telegramId);
  await ctx.reply(fa.cancelActive);
}
