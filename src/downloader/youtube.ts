import { Innertube, UniversalCache, Utils } from 'youtubei.js';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let innertube: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertube) {
    innertube = await Innertube.create({
      lang: 'en',
      location: 'US',
      cache: new UniversalCache(false),
      generate_session_locally: true,
      retrieve_player: true,
    });
    logger.info('YouTube.js InnerTube initialized');
  }
  return innertube;
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
  
  for await (const chunk of Utils.streamToIterable(stream)) {
    fileStream.write(chunk);
    downloaded += chunk.length;
    
    if (onProgress) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speedMBps = (downloaded / (1024 * 1024)) / elapsed;
      onProgress(Math.min(99, (downloaded / (10 * 1024 * 1024)) * 100), speedMBps, 0);
    }
  }
  
  fileStream.end();
  
  await new Promise<void>((resolve) => {
    fileStream.on('finish', resolve);
  });
  
  const stats = await stat(filePath);
  
  logger.info('YouTube.js download complete', { filePath, size: stats.size });
  
  return {
    filePath,
    fileSize: stats.size,
    title,
    duration,
    format,
  };
}
