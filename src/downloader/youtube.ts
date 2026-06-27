import { Innertube, UniversalCache, Utils } from 'youtubei.js';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { stat, readFile } from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let innertube: Innertube | null = null;

export function resetInnertube() {
  innertube = null;
  logger.info('YouTube.js InnerTube reset');
}

async function getInnertube(): Promise<Innertube> {
  if (!innertube) {
    const opts: any = {
      lang: 'en',
      location: 'US',
      cache: new UniversalCache(false),
      generate_session_locally: true,
      retrieve_player: true,
    };

    const cookiePath = process.env.COOKIE_FILE || config.cookies.path;
    if (cookiePath && existsSync(cookiePath)) {
      try {
        const cookieContent = await readFile(cookiePath, 'utf-8');
        const cookies = parseCookies(cookieContent);
        if (cookies.length > 0) {
          opts.cookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');
          logger.info('YouTube cookies loaded', { count: cookies.length });
        }
      } catch (e: any) {
        logger.warn('Failed to load cookies', e.message);
      }
    }

    innertube = await Innertube.create(opts);
    logger.info('YouTube.js InnerTube initialized');
  }
  return innertube;
}

function parseCookies(content: string): Array<{ name: string; value: string }> {
  const cookies: Array<{ name: string; value: string }> = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('\t');
    if (parts.length >= 7) {
      cookies.push({ name: parts[5], value: parts[6] });
    }
  }
  return cookies;
}

function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw new Error('Could not extract video ID from URL');
}

export interface YouTubeInfo {
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  description: string;
  viewCount: number;
  likeCount: number;
  availableQualities: string[];
}

export async function getYouTubeInfo(url: string): Promise<YouTubeInfo> {
  const yt = await getInnertube();
  const videoId = extractVideoId(url);

  const info = await yt.getInfo(videoId);

  const title = info.basic_info?.title || 'بدون عنوان';
  const duration = info.basic_info?.duration || 0;
  const thumbnail = info.basic_info?.thumbnail?.[0]?.url || '';
  const uploader = info.basic_info?.author || '';
  const description = (info.basic_info?.short_description || '').slice(0, 500);
  const viewCount = info.basic_info?.view_count || 0;
  const likeCount = info.basic_info?.like_count || 0;

  const qualities: string[] = [];
  const formats = info.streaming_data?.formats || [];
  const adaptiveFormats = info.streaming_data?.adaptive_formats || [];

  for (const f of [...formats, ...adaptiveFormats]) {
    if (f.height && f.height >= 144) {
      const label = f.height >= 2160 ? '2160p' :
                    f.height >= 1440 ? '1440p' :
                    f.height >= 1080 ? '1080p' :
                    f.height >= 720 ? '720p' :
                    f.height >= 480 ? '480p' : '360p';
      if (!qualities.includes(label)) qualities.push(label);
    }
  }

  qualities.sort((a, b) => parseInt(b) - parseInt(a));
  if (qualities.length === 0) qualities.push('720p');

  return {
    title,
    duration,
    thumbnail,
    uploader,
    description,
    viewCount,
    likeCount,
    availableQualities: qualities,
  };
}

export interface YouTubeDownloadResult {
  filePath: string;
  fileSize: number;
  title: string;
  duration: number;
  format: string;
}

export async function downloadYouTube(opts: {
  url: string;
  quality: string;
  audioOnly: boolean;
  outputDir: string;
  onProgress?: (percent: number, speedMBps: number, etaSeconds: number) => void;
}): Promise<YouTubeDownloadResult> {
  const { url, quality, audioOnly, outputDir, onProgress } = opts;

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const yt = await getInnertube();
  const videoId = extractVideoId(url);
  const info = await yt.getInfo(videoId);

  const title = info.basic_info?.title || 'download';
  const duration = info.basic_info?.duration || 0;
  const fileId = randomUUID().slice(0, 8);
  const format = audioOnly ? 'mp3' : 'mp4';
  const filePath = join(outputDir, `${fileId}.${format}`);

  logger.info('YouTube.js downloading', { title, quality, audioOnly });

  const stream = await yt.download(videoId, {
    type: audioOnly ? 'audio' : 'video+audio',
    quality: 'best',
    format: 'mp4',
  });

  const fileStream = createWriteStream(filePath);
  let downloaded = 0;
  const startTime = Date.now();
  let lastProgress = 0;

  for await (const chunk of Utils.streamToIterable(stream)) {
    fileStream.write(chunk);
    downloaded += chunk.length;

    if (onProgress) {
      const now = Date.now();
      if (now - lastProgress < 3000) continue;
      lastProgress = now;

      const elapsed = (now - startTime) / 1000;
      const speedMBps = (downloaded / (1024 * 1024)) / elapsed;
      const estimatedTotal = info.basic_info?.duration ? downloaded * 1.5 : downloaded * 2;
      const percent = Math.min(99, (downloaded / estimatedTotal) * 100);
      const eta = elapsed > 0 ? (estimatedTotal - downloaded) / (downloaded / elapsed) : 0;
      onProgress(percent, speedMBps, Math.max(0, eta));
    }
  }

  fileStream.end();

  await new Promise<void>((resolve) => {
    fileStream.on('finish', resolve);
  });

  const fileStats = await stat(filePath);

  logger.info('YouTube.js download complete', { filePath, size: fileStats.size });

  return {
    filePath,
    fileSize: fileStats.size,
    title,
    duration,
    format,
  };
}
