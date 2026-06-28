export interface MediaItem {
  url: string;
  quality?: string;
  type: 'video' | 'audio' | 'image';
  format?: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: number;
    author?: string;
    media: MediaItem[];
  };
  error?: string;
}

export interface CacheEntry {
  result: ScrapeResult;
  timestamp: number;
}

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'soundcloud' | 'pinterest' | 'likee';
