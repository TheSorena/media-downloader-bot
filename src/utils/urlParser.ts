export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'soundcloud' | 'other';

export interface ParsedUrl {
  platform: Platform;
  url: string;
  isPlaylist: boolean;
}

const PATTERNS: { platform: Platform; regex: RegExp }[] = [
  { platform: 'youtube', regex: /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i },
  { platform: 'instagram', regex: /instagram\.com/i },
  { platform: 'tiktok', regex: /tiktok\.com|vm\.tiktok/i },
  { platform: 'twitter', regex: /twitter\.com|x\.com|t\.co/i },
  { platform: 'facebook', regex: /facebook\.com|fb\.watch/i },
  { platform: 'soundcloud', regex: /soundcloud\.com/i },
];

export function detectPlatform(rawUrl: string): ParsedUrl | null {
  const url = rawUrl.trim();
  if (!url) return null;

  for (const { platform, regex } of PATTERNS) {
    if (regex.test(url)) {
      const isPlaylist = platform === 'youtube' && /[?&]list=/.test(url);
      return { platform, url, isPlaylist };
    }
  }

  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}
