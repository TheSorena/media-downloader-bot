import type { BotContext } from '../middlewares/user.js';
import { detectPlatform, isYouTubeUrl } from '../../utils/urlParser.js';
import { getVideoInfo, downloadVideo, deleteFile, cleanupTempFiles } from '../../downloader/engine.js';
import { getYouTubeInfo, downloadYouTube } from '../../downloader/youtube.js';
import { cobaltDownloadFile } from '../../downloader/cobalt.js';
import { checkQuota } from '../middlewares/quota.js';
import { qualityKeyboard, progressKeyboard } from '../keyboards.js';
import { InputFile } from 'grammy';
import { fa } from '../../locales/fa.js';
import { formatBytes, formatDuration, formatNumber, getDayKey } from '../../utils/formatter.js';
import { Download } from '../../models/Download.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export const activeDownloads = new Map<number, boolean>();

interface PendingDownload {
  url: string;
  platform: string;
  title: string;
  uploader: string;
  duration: number;
  qualities: string[];
  useCobalt: boolean;
}

const pendingSelections = new Map<number, PendingDownload>();

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
  const isYt = isYouTubeUrl(parsed.url);
  const nonYtCobalt = ['instagram', 'twitter', 'facebook', 'tiktok', 'reddit', 'twitch'].includes(parsed.platform);
  const isSoundCloud = parsed.platform === 'soundcloud';

  try {
    if (isSoundCloud) {
      pendingSelections.set(user.telegramId, {
        url: parsed.url,
        platform: parsed.platform,
        title: 'دانلود از SoundCloud',
        uploader: '',
        duration: 0,
        qualities: ['audio'],
        useCobalt: true,
      });

      await ctx.api.editMessageText(
        statusMsg.chat.id,
        statusMsg.message_id,
        '🎵 لینک **SoundCloud** شناسایی شد.\n\n⏳ در حال دانلود صدا...',
        { parse_mode: 'Markdown' },
      );
      pendingSelections.delete(user.telegramId);
      await executeDownload(ctx, user, {
        url: parsed.url,
        platform: 'soundcloud',
        title: 'دانلود از SoundCloud',
        uploader: '',
        duration: 0,
        qualities: ['audio'],
        useCobalt: true,
      }, 'audio');
      return;
    }

    if (isYt) {
      let ytInfo: any = null;
      let ytFailed = false;

      try {
        ytInfo = await getYouTubeInfo(parsed.url);
      } catch (e: any) {
        logger.warn('YouTube.js info failed, will try cobalt', e.message);
        ytFailed = true;
      }

      if (ytInfo) {
        const durationStr = ytInfo.duration > 0 ? formatDuration(ytInfo.duration) : 'نامشخص';
        const msg = fa.chooseQuality(
          ytInfo.title,
          ytInfo.uploader || '',
          durationStr,
          ytInfo.viewCount,
          ytInfo.likeCount,
          ytInfo.description,
        );

        pendingSelections.set(user.telegramId, {
          url: parsed.url,
          platform: 'youtube',
          title: ytInfo.title,
          uploader: ytInfo.uploader,
          duration: ytInfo.duration,
          qualities: ytInfo.availableQualities,
          useCobalt: false,
        });

        await ctx.api.editMessageText(
          statusMsg.chat.id,
          statusMsg.message_id,
          msg,
          { parse_mode: 'Markdown', reply_markup: qualityKeyboard(ytInfo.availableQualities) },
        );
        return;
      }

      if (ytFailed) {
        pendingSelections.set(user.telegramId, {
          url: parsed.url,
          platform: 'youtube',
          title: 'دانلود از یوتیوب',
          uploader: '',
          duration: 0,
          qualities: ['1080p', '720p', '480p'],
          useCobalt: true,
        });

        await ctx.api.editMessageText(
          statusMsg.chat.id,
          statusMsg.message_id,
          '🔗 لینک **یوتیوب** شناسایی شد.\n\n⚠️ دانلود مستقیم ممکن نیست. از cobalt استفاده می‌شه.\n\nکیفیت مورد نظر رو انتخاب کن:',
          { parse_mode: 'Markdown', reply_markup: qualityKeyboard(['1080p', '720p', '480p']) },
        );
        return;
      }
    }

    if (nonYtCobalt) {
      pendingSelections.set(user.telegramId, {
        url: parsed.url,
        platform: parsed.platform,
        title: 'دانلود از ' + parsed.platform,
        uploader: '',
        duration: 0,
        qualities: ['1080p', '720p', '480p'],
        useCobalt: true,
      });

      await ctx.api.editMessageText(
        statusMsg.chat.id,
        statusMsg.message_id,
        fa.cobaltDetected(parsed.platform),
        { parse_mode: 'Markdown', reply_markup: qualityKeyboard(['1080p', '720p', '480p']) },
      );
    } else {
      const info = await getVideoInfo(parsed.url);
      const durationStr = info.duration > 0 ? formatDuration(info.duration) : 'نامشخص';
      const isAudioPlatform = info.isAudio;

      if (isAudioPlatform) {
        const msg = fa.chooseQuality(
          info.title,
          info.uploader || '',
          durationStr,
          info.viewCount,
          info.likeCount,
          info.description,
        );

        await ctx.api.editMessageText(statusMsg.chat.id, statusMsg.message_id, msg, { parse_mode: 'Markdown' });
        pendingSelections.delete(user.telegramId);
        await executeDownload(ctx, user, {
          url: parsed.url,
          platform: parsed.platform,
          title: info.title,
          uploader: info.uploader,
          duration: info.duration,
          qualities: ['audio'],
          useCobalt: false,
        }, 'audio');
        return;
      }

      pendingSelections.set(user.telegramId, {
        url: parsed.url,
        platform: parsed.platform,
        title: info.title,
        uploader: info.uploader,
        duration: info.duration,
        qualities: info.availableQualities,
        useCobalt: false,
      });

      const msg = fa.chooseQuality(
        info.title,
        info.uploader || '',
        durationStr,
        info.viewCount,
        info.likeCount,
        info.description,
      );

      await ctx.api.editMessageText(
        statusMsg.chat.id,
        statusMsg.message_id,
        msg,
        { parse_mode: 'Markdown', reply_markup: qualityKeyboard(info.availableQualities) },
      );
    }
  } catch (err: any) {
    logger.error('خطا در دریافت اطلاعات ویدیو', err.message);
    await ctx.api.editMessageText(statusMsg.chat.id, statusMsg.message_id, fa.error(err.message));
  }
}

export async function handleQualitySelection(ctx: BotContext, quality: string) {
  const query = ctx.callbackQuery;
  if (!query?.from) return;

  await ctx.answerCallbackQuery();

  const user = ctx.session.user;
  if (!user) return;

  const pending = pendingSelections.get(user.telegramId);
  if (!pending) {
    await ctx.reply('⏱ زمان انتخاب کیفیت تمام شد. لطفاً دوباره لینک رو بفرست.');
    return;
  }

  pendingSelections.delete(user.telegramId);

  if (user.settings?.preferAudio && quality !== 'audio') {
    await executeDownload(ctx, user, pending, 'audio');
  } else {
    await executeDownload(ctx, user, pending, quality);
  }
}

async function executeDownload(ctx: BotContext, user: any, pending: PendingDownload, quality: string) {
  const audioOnly = quality === 'audio';
  const actualQuality = audioOnly ? 'audio' : quality;

  activeDownloads.set(user.telegramId, true);

  const downloadDoc = new Download({
    userId: user.telegramId,
    telegramId: user.telegramId,
    url: pending.url,
    platform: pending.platform,
    title: pending.title,
    duration: pending.duration,
    quality: actualQuality,
    status: 'downloading',
    startedAt: new Date(),
  });
  await downloadDoc.save();

  const progressMsg = await ctx.reply(fa.downloadStarted, {
    reply_markup: progressKeyboard(),
  });

  let lastUpdate = 0;

  try {
    let result!: { filePath: string; fileSize: number; title: string; duration: number; format: string };

    if (pending.useCobalt) {
      await ctx.api.editMessageText(progressMsg.chat.id, progressMsg.message_id, '⬇️ دانلود از ' + pending.platform + '...');

      try {
        const cobaltRes = await cobaltDownloadFile(
          { url: pending.url, videoQuality: actualQuality, audioOnly },
          config.downloadDir,
        );
        const { stat } = await import('node:fs/promises');
        const stats = await stat(cobaltRes.filePath);
        const cleanName = cobaltRes.filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        result = {
          filePath: cobaltRes.filePath,
          fileSize: stats.size,
          title: cleanName || 'دانلود از ' + pending.platform,
          duration: 0,
          format: audioOnly ? 'mp3' : 'mp4',
        };
      } catch (cobaltErr: any) {
        logger.warn('cobalt failed, trying fallback', cobaltErr.message);

        if (isYouTubeUrl(pending.url)) {
          let ytSuccess = false;

          // Try YouTube.js first
          try {
            await ctx.api.editMessageText(progressMsg.chat.id, progressMsg.message_id, '⬇️ دانلود از یوتیوب (روش دوم)...');
            result = await downloadYouTube({
              url: pending.url,
              quality: actualQuality,
              audioOnly,
              outputDir: config.downloadDir,
              onProgress: async (percent, speedMBps, eta) => {
                const now = Date.now();
                if (now - lastUpdate < 3000) return;
                lastUpdate = now;
                try {
                  const downloaded = (result?.fileSize || 0) * (percent / 100);
                  await ctx.api.editMessageText(
                    progressMsg.chat.id,
                    progressMsg.message_id,
                    fa.downloadProgress(percent, `${speedMBps.toFixed(1)} MB/s`, formatDuration(eta), downloaded > 0 ? formatBytes(downloaded) : undefined),
                    { reply_markup: progressKeyboard() },
                  );
                } catch { /* ignore edit errors */ }
              },
            });
            ytSuccess = true;
          } catch (ytErr: any) {
            logger.warn('YouTube.js also failed, trying yt-dlp', ytErr.message);
          }

          // Try yt-dlp as last resort
          if (!ytSuccess) {
            await ctx.api.editMessageText(progressMsg.chat.id, progressMsg.message_id, '⬇️ دانلود از یوتیوب (yt-dlp)...');
            result = await downloadVideo({
              url: pending.url,
              quality: actualQuality,
              audioOnly,
              outputDir: config.downloadDir,
              onProgress: async (percent, speedMBps, eta) => {
                const now = Date.now();
                if (now - lastUpdate < 3000) return;
                lastUpdate = now;
                try {
                  await ctx.api.editMessageText(
                    progressMsg.chat.id,
                    progressMsg.message_id,
                    fa.downloadProgress(percent, `${speedMBps.toFixed(1)} MB/s`, formatDuration(eta)),
                    { reply_markup: progressKeyboard() },
                  );
                } catch { /* ignore edit errors */ }
              },
            });
          }
        } else {
          throw cobaltErr;
        }
      }
    } else if (isYouTubeUrl(pending.url)) {
      await ctx.api.editMessageText(progressMsg.chat.id, progressMsg.message_id, '⬇️ دانلود از یوتیوب...');

      try {
        result = await downloadYouTube({
          url: pending.url,
          quality: actualQuality,
          audioOnly,
          outputDir: config.downloadDir,
          onProgress: async (percent, speedMBps, eta) => {
            const now = Date.now();
            if (now - lastUpdate < 3000) return;
            lastUpdate = now;
            try {
              const downloaded = (result?.fileSize || 0) * (percent / 100);
              await ctx.api.editMessageText(
                progressMsg.chat.id,
                progressMsg.message_id,
                fa.downloadProgress(percent, `${speedMBps.toFixed(1)} MB/s`, formatDuration(eta), downloaded > 0 ? formatBytes(downloaded) : undefined),
                { reply_markup: progressKeyboard() },
              );
            } catch { /* ignore edit errors */ }
          },
        });
      } catch (ytErr: any) {
        logger.warn('YouTube.js failed, trying cobalt fallback', ytErr.message);
        await ctx.api.editMessageText(progressMsg.chat.id, progressMsg.message_id, '⬇️ دانلود از یوتیوب (cobalt)...');

        try {
          const cobaltRes = await cobaltDownloadFile(
            { url: pending.url, videoQuality: actualQuality, audioOnly },
            config.downloadDir,
          );
          const { stat } = await import('node:fs/promises');
          const stats = await stat(cobaltRes.filePath);
          const cleanName = cobaltRes.filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
          result = {
            filePath: cobaltRes.filePath,
            fileSize: stats.size,
            title: cleanName || 'دانلود از یوتیوب',
            duration: 0,
            format: audioOnly ? 'mp3' : 'mp4',
          };
        } catch {
          // cobalt also failed, try yt-dlp
          logger.warn('cobalt also failed, trying yt-dlp');
          await ctx.api.editMessageText(progressMsg.chat.id, progressMsg.message_id, '⬇️ دانلود از یوتیوب (yt-dlp)...');
          result = await downloadVideo({
            url: pending.url,
            quality: actualQuality,
            audioOnly,
            outputDir: config.downloadDir,
            onProgress: async (percent, speedMBps, eta) => {
              const now = Date.now();
              if (now - lastUpdate < 3000) return;
              lastUpdate = now;
              try {
                await ctx.api.editMessageText(
                  progressMsg.chat.id,
                  progressMsg.message_id,
                  fa.downloadProgress(percent, `${speedMBps.toFixed(1)} MB/s`, formatDuration(eta)),
                  { reply_markup: progressKeyboard() },
                );
              } catch { /* ignore edit errors */ }
            },
          });
        }
      }
    } else {
      result = await downloadVideo({
        url: pending.url,
        quality: actualQuality,
        audioOnly,
        outputDir: config.downloadDir,
        onProgress: async (percent, speedMBps, eta) => {
          const now = Date.now();
          if (now - lastUpdate < 3000) return;
          lastUpdate = now;
          try {
            await ctx.api.editMessageText(
              progressMsg.chat.id,
              progressMsg.message_id,
              fa.downloadProgress(percent, `${speedMBps.toFixed(1)} MB/s`, formatDuration(eta)),
              { reply_markup: progressKeyboard() },
            );
          } catch { /* ignore edit errors */ }
        },
      });
    }

    const quotaCheck = checkQuota(user, result.fileSize);
    if (!quotaCheck.ok) {
      await deleteFile(result.filePath);
      await cleanupTempFiles(config.downloadDir, '');
      await ctx.api.editMessageText(progressMsg.chat.id, progressMsg.message_id, quotaCheck.message!);
      return;
    }

    await ctx.api.editMessageText(progressMsg.chat.id, progressMsg.message_id, fa.uploadStarted);

    downloadDoc.status = 'uploading';
    await downloadDoc.save();

    const isVideo = !audioOnly;
    const caption = fa.success(result.title, formatBytes(result.fileSize), pending.uploader, pending.platform, actualQuality);

    let sentMsg;
    if (isVideo) {
      sentMsg = await ctx.replyWithVideo(new InputFile(result.filePath), {
        caption,
        parse_mode: 'Markdown',
      });
    } else {
      sentMsg = await ctx.replyWithAudio(new InputFile(result.filePath), {
        caption,
        parse_mode: 'Markdown',
        title: result.title,
      });
    }

    if (sentMsg) {
      await Download.updateOne(
        { _id: downloadDoc._id },
        { $set: { telegramMessageId: sentMsg.message_id } },
      );
    }

    await ctx.api.deleteMessage(progressMsg.chat.id, progressMsg.message_id).catch(() => {});

    await deleteFile(result.filePath);

    await user.addQuotaUsage(getDayKey(), result.fileSize);

    downloadDoc.status = 'completed';
    downloadDoc.fileSize = result.fileSize;
    downloadDoc.format = result.format;
    downloadDoc.completedAt = new Date();
    await downloadDoc.save();

    logger.info('دانلود و آپلود کامل شد', {
      tid: user.telegramId,
      title: result.title,
      size: result.fileSize,
    });
  } catch (err: any) {
    logger.error('خطا در فرآیند دانلود', err.message);

    let errorMsg = err.message;
    if (err.message?.includes('youtube.login') || err.message?.includes('Sign in to confirm')) {
      errorMsg = 'یوتیوب دانلود مستقیم رو بلاک کرده. لطفاً کیفیت صدا (MP3) رو امتحان کنید.';
    } else if (err.message?.includes('Private video')) {
      errorMsg = 'این ویدیو خصوصیه و قابل دانلود نیست.';
    } else if (err.message?.includes('Video unavailable')) {
      errorMsg = 'این ویدیو در دسترس نیست.';
    }

    await ctx.api.editMessageText(
      progressMsg.chat.id,
      progressMsg.message_id,
      fa.error(errorMsg),
    ).catch(() => {});

    downloadDoc.status = 'failed';
    downloadDoc.errorMessage = err.message;
    await downloadDoc.save();
  } finally {
    activeDownloads.delete(user.telegramId);
  }
}

export async function handleCancel(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const user = ctx.session.user;
  if (user) {
    pendingSelections.delete(user.telegramId);
  }
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
