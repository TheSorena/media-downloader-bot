import type { Platform } from '../types.js';

export function detectPlatform(url: string): Platform | null {
  const lower = url.toLowerCase();

  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\//.test(lower)) return 'youtube';
  if (/instagram\.com\/(p|reel|tv|stories)\//.test(lower)) return 'instagram';
  if (/tiktok\.com\/|vm\.tiktok\.com\//.test(lower)) return 'tiktok';
  if (/twitter\.com\/|x\.com\//.test(lower)) return 'twitter';
  if (/soundcloud\.com\//.test(lower)) return 'soundcloud';
  if (/pinterest\.(com|ru)\/|pin\.it\//.test(lower)) return 'pinterest';
  if (/likee\.video\/|likee\.com\//.test(lower)) return 'likee';

  return null;
}

export function normalizeUrl(url: string): string {
  url = url.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
}
