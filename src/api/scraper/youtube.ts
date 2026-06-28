import type { Page } from 'playwright';
import { getBrowser } from './browser.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../types.js';

export async function scrapeYouTube(url: string): Promise<ScrapeResult> {
  let page: Page | null = null;

  try {
    const ctx = await getBrowser();
    page = await ctx.newPage();

    await page.route('**/*.{woff,woff2,ttf,woff3}', (route) => route.abort());
    await page.route('**/googleads/**', (route) => route.abort());
    await page.route('**/pagead/**', (route) => route.abort());

    logger.info(`[YouTube] Loading: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      const title = document.querySelector('meta[name="title"]')?.getAttribute('content')
        || document.querySelector('meta[property="og:title"]')?.getAttribute('content')
        || document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent
        || '';

      const description = document.querySelector('meta[name="description"]')?.getAttribute('content')
        || document.querySelector('meta[property="og:description"]')?.getAttribute('content')
        || '';

      const thumbnail = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      const durationStr = document.querySelector('meta[itemprop="duration"]')?.getAttribute('content') || '';
      let duration = 0;
      const durMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (durMatch) {
        duration = (parseInt(durMatch[1] || '0') * 3600) +
          (parseInt(durMatch[2] || '0') * 60) +
          parseInt(durMatch[3] || '0');
      }

      return { title, description, thumbnail, duration };
    });

    const ytInitialPlayerResponse = await page.evaluate(() => {
      try {
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          const text = script.textContent || '';
          const match = text.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
          if (match) {
            return JSON.parse(match[1]);
          }
        }
      } catch {}
      return null;
    });

    if (ytInitialPlayerResponse?.streamingData) {
      const sd = ytInitialPlayerResponse.streamingData;

      const formats = [
        ...(sd.formats || []),
        ...(sd.adaptiveFormats || []),
      ];

      const videoFormats = formats
        .filter((f: any) => f.mimeType?.startsWith('video/mp4') && f.url)
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

      if (videoFormats.length > 0) {
        const best = videoFormats[0];
        return {
          success: true,
          data: {
            title: data.title,
            description: data.description,
            thumbnail: data.thumbnail,
            duration: data.duration,
            media: [{
              url: best.url,
              type: 'video',
              quality: `${best.height}p`,
              format: 'mp4',
              width: best.width,
              height: best.height,
            }],
          },
        };
      }
    }

    logger.warn('[YouTube] Could not extract streaming URLs from page');
    return {
      success: false,
      error: 'Could not extract video streams. YouTube may require authentication or the video is restricted.',
    };
  } catch (err) {
    logger.error('[YouTube] Scrape failed', err);
    return { success: false, error: String(err) };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
