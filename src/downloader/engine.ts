import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

function findFfmpeg(): string | undefined {
  try {
    const path = execSync('where ffmpeg', { encoding: 'utf-8' }).trim().split('\n')[0].trim();
    return existsSync(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

let ffmpegLocation: string | undefined;

export interface DownloadOptions {
  url: string;
  quality: string;
  audioOnly: boolean;
  outputDir: string;
  onProgress?: (percent: number, speedMBps: number, etaSeconds: number) => void;
}

export interface DownloadResult {
  filePath: string;
  fileSize: number;
  title: string;
  duration: number;
  format: string;
}

export interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  description: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  uploadDate: string;
  platform: string;
  isAudio: boolean;
  availableQualities: string[];
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  await ensureDir(config.downloadDir);
  if (!ffmpegLocation) ffmpegLocation = findFfmpeg();

  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      url,
    ];

    const proc = spawn('yt-dlp', args, { timeout: 30000 });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('error', (err) => {
      logger.error('yt-dlp اجرا نشد. آیا نصب است؟', err.message);
      reject(new Error('ابزار دانلود یافت نشد. با ادمین تماس بگیرید.'));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        logger.error('خطا در دریافت اطلاعات ویدیو', stderr);
        reject(new Error('امکان دریافت اطلاعات این لینک وجود ندارد.'));
        return;
      }

      try {
        const data = JSON.parse(stdout.trim().split('\n')[0]);
        const qualities = extractQualities(data.formats ?? []);
        const isAudioOnly = !data.formats?.some((f: any) => f.vbr || f.height);
        resolve({
          title: data.title ?? data.track ?? 'بدون عنوان',
          duration: data.duration ?? 0,
          thumbnail: data.thumbnail ?? '',
          uploader: data.uploader ?? data.artist ?? data.channel ?? data.creator ?? '',
          description: (data.description ?? '').slice(0, 500),
          viewCount: data.view_count ?? 0,
          likeCount: data.like_count ?? 0,
          commentCount: data.comment_count ?? 0,
          uploadDate: data.upload_date ?? '',
          platform: data.extractor_key ?? data.extractor ?? '',
          isAudio: isAudioOnly,
          availableQualities: qualities,
        });
      } catch (e) {
        reject(new Error('پارس خروجی ناموفق بود.'));
      }
    });
  });
}

function extractQualities(formats: any[]): string[] {
  const heights = new Set<number>();
  for (const f of formats) {
    if (f.vbr || f.height) {
      const h = f.height;
      if (h && h >= 144) heights.add(h);
    }
  }
  const sorted = [...heights].sort((a, b) => b - a);
  const labels: string[] = [];
  for (const h of sorted) {
    if (h >= 2160) labels.push('2160p');
    else if (h >= 1440) labels.push('1440p');
    else if (h >= 1080) labels.push('1080p');
    else if (h >= 720) labels.push('720p');
    else if (h >= 480) labels.push('480p');
    else if (h >= 360) labels.push('360p');
  }
  return labels.length > 0 ? labels : ['720p'];
}

function buildFormatSelector(quality: string, audioOnly: boolean): string {
  if (audioOnly) {
    return 'bestaudio/best';
  }
  const heightMap: Record<string, number> = {
    '360p': 360, '480p': 480, '720p': 720, '1080p': 1080, '1440p': 1440, '2160p': 2160,
  };
  const targetHeight = heightMap[quality] ?? 720;
  return `bestvideo[height<=${targetHeight}]+bestaudio/best[height<=${targetHeight}]/best`;
}

export async function downloadVideo(opts: DownloadOptions): Promise<DownloadResult> {
  const { url, quality, audioOnly, outputDir, onProgress } = opts;
  await ensureDir(outputDir);
  if (!ffmpegLocation) ffmpegLocation = findFfmpeg();

  const fileId = randomUUID().slice(0, 8);
  const ext = audioOnly ? 'mp3' : 'mp4';
  const outputTemplate = join(outputDir, `${fileId}.%(ext)s`);

  const formatSelector = buildFormatSelector(quality, audioOnly);

  const args: string[] = [
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--newline',
    '--progress',
    '--progress-template', '%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.speed)s|%(progress.eta)s',
    '-f', formatSelector,
    '-o', outputTemplate,
  ];

  if (ffmpegLocation) {
    args.push('--ffmpeg-location', ffmpegLocation);
  }

  if (audioOnly) {
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    args.push('--merge-output-format', 'mp4');
    args.push('--embed-subs', '--sub-langs', 'en,fa', '--embed-thumbnail');
  }

  args.push(url);

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { timeout: 600000 });
    let stderr = '';
    let resolvedPath = '';

    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.stdout.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length === 4 && parts[0] && parts[1]) {
          const downloaded = Number(parts[0]) || 0;
          const total = Number(parts[1]) || 0;
          const speed = Number(parts[2]) || 0;
          const eta = Number(parts[3]) || 0;
          if (total > 0 && onProgress) {
            const percent = Math.min(99, (downloaded / total) * 100);
            onProgress(percent, speed / (1024 * 1024), eta);
          }
        }
        if (line.includes('[Merger]') || line.includes('[ExtractAudio]') || line.includes('[Download]') || line.includes('[EmbedThumbnail]')) {
          const mediaMatch = line.match(/\] (?:Merging formats into |Extracting audio to |Destination: )?["']?([^\s"'\]]+\.(?:mp4|mp3|m4a|webm|mkv|ogg|opus|wav))["']?/i);
          if (mediaMatch) resolvedPath = mediaMatch[1].replace(/"/g, '');
        }
      }
    });

    proc.on('error', (err) => {
      logger.error('خطا در اجرای yt-dlp', err.message);
      reject(new Error('خطا در اجرای ابزار دانلود.'));
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        logger.error('yt-dlp با خطا تمام شد', stderr);
        reject(new Error(extractError(stderr)));
        return;
      }

      try {
        if (!resolvedPath) {
          const possibleExts = [ext, 'm4a', 'mkv', 'webm', 'ogg', 'opus'];
          for (const e of possibleExts) {
            const p = join(outputDir, `${fileId}.${e}`);
            if (existsSync(p)) { resolvedPath = p; break; }
          }
          if (!resolvedPath) {
            const { readdir } = await import('node:fs/promises');
            const files = await readdir(outputDir);
            const match = files.find((f) => f.startsWith(fileId) && /\.(mp4|mp3|m4a|webm|mkv|ogg|opus|wav)$/i.test(f));
            if (match) resolvedPath = join(outputDir, match);
          }
        }
        if (!resolvedPath || !existsSync(resolvedPath)) {
          reject(new Error('فایل دانلودشده یافت نشد.'));
          return;
        }

        const stats = await stat(resolvedPath);
        let title = 'دانلود';
        let duration = 0;
        try {
          const info = await getVideoInfo(url);
          title = info.title;
          duration = info.duration;
        } catch { /* info optional after download */ }

        logger.info('دانلود کامل شد', { path: resolvedPath, size: stats.size });
        resolve({
          filePath: resolvedPath,
          fileSize: stats.size,
          title,
          duration,
          format: audioOnly ? 'mp3' : 'mp4',
        });
      } catch (e: any) {
        reject(new Error('پس از دانلود خطایی رخ داد: ' + e.message));
      }
    });
  });
}

function extractError(stderr: string): string {
  if (/Private video|Sign in|login/i.test(stderr)) return 'این ویدیو خصوصی است یا نیاز به ورود دارد.';
  if (/Video unavailable|removed/i.test(stderr)) return 'این ویدیو حذف شده یا در دسترس نیست.';
  if (/HTTP Error 429|Too Many Requests/i.test(stderr)) return 'درخواست‌های زیادی ارسال شده. بعداً تلاش کنید.';
  if (/Unsupported URL/i.test(stderr)) return 'این نوع محتوا پشتیبانی نمی‌شه (مثلاً عکس TikTok). فقط ویدیو پشتیبانی می‌شه.';
  if (/No video could be found/i.test(stderr)) return 'ویدیویی در این لینک پیدا نشد.';
  if (/ffmpeg not found/i.test(stderr)) return 'ابزار ffmpeg یافت نشد. با ادمین تماس بگیرید.';
  return 'خطا در دانلود. لطفاً دوباره تلاش کنید.';
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (filePath && existsSync(filePath)) {
      await unlink(filePath);
      logger.info('فایل حذف شد', filePath);
    }
  } catch (e: any) {
    logger.warn('حذف فایل ناموفق', { path: filePath, err: e.message });
  }
}

export async function cleanupTempFiles(dir: string, fileIdPrefix: string): Promise<void> {
  try {
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(dir);
    const tempExts = ['.webm', '.vtt', '.webp', '.m4a', '.part', '.jpg', '.png'];
    for (const file of files) {
      if (file.startsWith(fileIdPrefix) && tempExts.some((ext) => file.endsWith(ext))) {
        await unlink(join(dir, file));
        logger.info('فایل موقت حذف شد', file);
      }
    }
  } catch (e: any) {
    logger.warn('پاکسازی فایل‌های موقت ناموفق', { err: e.message });
  }
}
