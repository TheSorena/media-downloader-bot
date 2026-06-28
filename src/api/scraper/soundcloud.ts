import { getBrowser } from './browser.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../types.js';

export async function scrapeSoundCloud(url: string): Promise<ScrapeResult> {
  let page = null;

  try {
    const ctx = await getBrowser();
    page = await ctx.newPage();

    logger.info(`[SoundCloud] Loading: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const ogAudio = document.querySelector('meta[property="og:audio"]');
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');

      const audioUrl = ogAudio?.getAttribute('content') || '';
      if (audioUrl) {
        return {
          url: audioUrl,
          title: ogTitle?.getAttribute('content') || '',
          thumbnail: ogImage?.getAttribute('content') || '',
          description: ogDesc?.getAttribute('content') || '',
        };
      }

      return null;
    });

    if (!data?.url) {
      return { success: false, error: 'No audio found' };
    }

    return {
      success: true,
      data: {
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail,
        media: [{
          url: data.url,
          type: 'audio',
          format: 'mp3',
        }],
      },
    };
  } catch (err) {
    logger.error('[SoundCloud] Scrape failed', err);
    return { success: false, error: String(err) };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
