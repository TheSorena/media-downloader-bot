import { logger } from '../utils/logger.js';

const CATPLUS_BASE = 'https://catplus.ir/api';

interface SimpleResult {
  success: boolean;
  title?: string;
  description?: string;
  thumbnail?: string;
  mediaUrl?: string;
  downloadUrl?: string;
  mediaType: 'video' | 'audio' | 'image';
  duration?: number;
  error?: string;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function scrapeInstagram(url: string): Promise<SimpleResult> {
  try {
    const data = await fetchJson(`${CATPLUS_BASE}/insta?url=${encodeURIComponent(url)}`);
    if (data?.video?.[0]?.video) {
      return {
        success: true,
        title: data.title || '',
        thumbnail: data.video[0].thumbnail,
        mediaUrl: data.video[0].video,
        mediaType: 'video',
      };
    }
    return { success: false, mediaType: 'video', error: 'No video found' };
  } catch (err: any) {
    logger.error('[simple] Instagram failed', err.message);
    return { success: false, mediaType: 'video', error: err.message };
  }
}

export async function scrapeSoundCloud(url: string): Promise<SimpleResult> {
  try {
    const data = await fetchJson(`${CATPLUS_BASE}/soundcloud?url=${encodeURIComponent(url)}`);
    if (data?.download) {
      return {
        success: true,
        title: data.title || '',
        thumbnail: data.thumbnail || '',
        downloadUrl: data.download,
        duration: data.duration,
        mediaType: 'audio',
      };
    }
    return { success: false, mediaType: 'audio', error: 'No audio found' };
  } catch (err: any) {
    logger.error('[simple] SoundCloud failed', err.message);
    return { success: false, mediaType: 'audio', error: err.message };
  }
}
