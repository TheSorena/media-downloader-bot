import type { Page } from 'playwright';
import { getBrowser } from './browser.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../types.js';

export async function scrapeTikTok(url: string): Promise<ScrapeResult> {
  let page: Page | null = null;

  try {
    const ctx = await getBrowser();
    page = await ctx.newPage();

    await page.route('**/*.{woff,woff2,ttf}', (route) => route.abort());

    logger.info(`[TikTok] Loading: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      const ogVideo = document.querySelector('meta[property="og:video"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');

      const videoUrl = ogVideo?.getAttribute('content') || '';

      if (videoUrl) {
        return {
          type: 'video' as const,
          url: videoUrl,
          thumbnail: ogImage?.getAttribute('content') || '',
          title: ogTitle?.getAttribute('content') || '',
          description: ogDesc?.getAttribute('content') || '',
        };
      }

      const videoEl = document.querySelector('video');
      if (videoEl) {
        const src = videoEl.querySelector('source')?.getAttribute('src') || videoEl.getAttribute('src') || '';
        if (src) {
          return {
            type: 'video' as const,
            url: src,
            thumbnail: ogImage?.getAttribute('content') || '',
            title: ogTitle?.getAttribute('content') || '',
            description: ogDesc?.getAttribute('content') || '',
          };
        }
      }

      return null;
    });

    if (!data || !data.url) {
      const html = await page.content();
      const playMatch = html.match(/"playAddr"\s*:\s*\[\s*\{\s*"src"\s*:\s*"([^"]+)"/);
      const downloadMatch = html.match(/"downloadAddr"\s*:\s*\[\s*\{\s*"src"\s*:\s*"([^"]+)"/);

      const videoSrc = downloadMatch?.[1] || playMatch?.[1];
      if (videoSrc) {
        const cleaned = videoSrc.replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
        return {
          success: true,
          data: {
            title: '',
            media: [{ url: cleaned, type: 'video' }],
          },
        };
      }

      return { success: false, error: 'No video found on this page' };
    }

    return {
      success: true,
      data: {
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail,
        media: [{ url: data.url, type: 'video' }],
      },
    };
  } catch (err) {
    logger.error('[TikTok] Scrape failed', err);
    return { success: false, error: String(err) };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
