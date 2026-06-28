import type { Page } from 'playwright';
import { getBrowser } from './browser.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../types.js';

export async function scrapeTwitter(url: string): Promise<ScrapeResult> {
  let page: Page | null = null;

  try {
    const ctx = await getBrowser();
    page = await ctx.newPage();

    await page.route('**/*.{woff,woff2,ttf}', (route) => route.abort());

    logger.info(`[Twitter] Loading: ${url}`);
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

      const imageUrl = ogImage?.getAttribute('content') || '';
      if (imageUrl && !imageUrl.includes('favicon')) {
        return {
          type: 'image' as const,
          url: imageUrl,
          thumbnail: imageUrl,
          title: ogTitle?.getAttribute('content') || '',
          description: ogDesc?.getAttribute('content') || '',
        };
      }

      return null;
    });

    if (!data || !data.url) {
      const html = await page.content();

      const videoMatch = html.match(/"video_info":\{"bitrate":\d+,"content_type":"video\/mp4","url":"([^"]+)"/);
      if (videoMatch) {
        const cleaned = videoMatch[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
        return {
          success: true,
          data: {
            title: '',
            media: [{ url: cleaned, type: 'video' }],
          },
        };
      }

      return { success: false, error: 'No media found on this page' };
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
    logger.error('[Twitter] Scrape failed', err);
    return { success: false, error: String(err) };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
