import { getBrowser } from './browser.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../types.js';

export async function scrapePinterest(url: string): Promise<ScrapeResult> {
  let page = null;

  try {
    const ctx = await getBrowser();
    page = await ctx.newPage();

    logger.info(`[Pinterest] Loading: ${url}`);
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

      if (ogImage) {
        return {
          type: 'image' as const,
          url: ogImage.getAttribute('content') || '',
          thumbnail: ogImage.getAttribute('content') || '',
          title: ogTitle?.getAttribute('content') || '',
          description: ogDesc?.getAttribute('content') || '',
        };
      }

      return null;
    });

    if (!data?.url) {
      return { success: false, error: 'No media found on this pin' };
    }

    return {
      success: true,
      data: {
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail,
        media: [{ url: data.url, type: data.type }],
      },
    };
  } catch (err) {
    logger.error('[Pinterest] Scrape failed', err);
    return { success: false, error: String(err) };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
