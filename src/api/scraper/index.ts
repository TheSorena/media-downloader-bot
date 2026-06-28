import { detectPlatform, normalizeUrl } from './utils.js';
import { getCached, setCache } from './cache.js';
import { scrapeInstagram } from './instagram.js';
import { scrapeTikTok } from './tiktok.js';
import { scrapeTwitter } from './twitter.js';
import { scrapeYouTube } from './youtube.js';
import { scrapeSoundCloud } from './soundcloud.js';
import { scrapePinterest } from './pinterest.js';
import { scrapeLikee } from './likee.js';
import type { ScrapeResult, Platform } from '../types.js';

const scrapers: Record<Platform, (url: string) => Promise<ScrapeResult>> = {
  youtube: scrapeYouTube,
  instagram: scrapeInstagram,
  tiktok: scrapeTikTok,
  twitter: scrapeTwitter,
  soundcloud: scrapeSoundCloud,
  pinterest: scrapePinterest,
  likee: scrapeLikee,
};

export async function scrape(url: string): Promise<ScrapeResult> {
  const normalized = normalizeUrl(url);
  const platform = detectPlatform(normalized);

  if (!platform) {
    return { success: false, error: 'Unsupported platform or invalid URL' };
  }

  const cached = getCached(normalized);
  if (cached) return cached;

  const scraper = scrapers[platform];
  const result = await scraper(normalized);

  if (result.success) {
    setCache(normalized, result);
  }

  return result;
}

export { closeBrowser } from './browser.js';
