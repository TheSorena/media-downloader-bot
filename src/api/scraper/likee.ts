import { getBrowser } from './browser.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../types.js';

export async function scrapeLikee(url: string): Promise<ScrapeResult> {
  let page = null;

  try {
    const ctx = await getBrowser();
    page = await ctx.newPage();

    logger.info(`[Likee] Loading: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const ogVideo = document.querySelector('meta[property="og:video"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');

      if (ogVideo) {
        return {
          type: 'video' as const,
          url: ogVideo.getAttribute('content') || '',
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

    if (!data?.url) {
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
    logger.error('[Likee] Scrape failed', err);
    return { success: false, error: String(err) };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
