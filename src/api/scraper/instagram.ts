import type { Page } from 'playwright';
import { getBrowser } from './browser.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../types.js';

export async function scrapeInstagram(url: string): Promise<ScrapeResult> {
  let page: Page | null = null;

  try {
    const ctx = await getBrowser();
    page = await ctx.newPage();

    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}', (route) => route.abort());
    await page.route('**/analytics/**', (route) => route.abort());
    await page.route('**/tracking/**', (route) => route.abort());

    logger.info(`[Instagram] Loading: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const mediaData = await page.evaluate(() => {
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

      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'VideoObject' && data.contentUrl) {
            return {
              type: 'video' as const,
              url: data.contentUrl,
              thumbnail: data.thumbnailUrl || '',
              title: data.name || '',
              description: data.description || '',
              duration: data.duration ? parseInt(data.duration.replace('PT', '').replace('S', '')) : undefined,
            };
          }
        } catch {}
      }

      const videoEl = document.querySelector('video');
      if (videoEl) {
        const src = videoEl.querySelector('source')?.getAttribute('src') || videoEl.getAttribute('src') || '';
        if (src) {
          return {
            type: 'video' as const,
            url: src,
            thumbnail: '',
            title: '',
            description: '',
          };
        }
      }

      return null;
    });

    if (!mediaData || !mediaData.url) {
      const html = await page.content();
      const videoMatch = html.match(/"video_url"\s*:\s*"(https:[^"]+)"/);
      const displayUrl = html.match(/"display_url"\s*:\s*"(https:[^"]+)"/);

      if (videoMatch) {
        return {
          success: true,
          data: {
            title: '',
            media: [{
              url: videoMatch[1].replace(/\\u0026/g, '&'),
              type: 'video',
            }],
          },
        };
      }

      if (displayUrl) {
        return {
          success: true,
          data: {
            title: '',
            media: [{
              url: displayUrl[1].replace(/\\u0026/g, '&'),
              type: 'image',
            }],
          },
        };
      }

      return { success: false, error: 'No media found on this page' };
    }

    const cleanedUrl = mediaData.url.replace(/\\u0026/g, '&');

    return {
      success: true,
      data: {
        title: mediaData.title,
        description: mediaData.description,
        thumbnail: mediaData.thumbnail,
        duration: mediaData.duration,
        media: [{
          url: cleanedUrl,
          type: mediaData.type,
        }],
      },
    };
  } catch (err) {
    logger.error('[Instagram] Scrape failed', err);
    return { success: false, error: String(err) };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
