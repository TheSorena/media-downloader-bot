import type { Page } from 'playwright';
import { getBrowser } from './browser.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../types.js';

export async function scrapeInstagram(url: string): Promise<ScrapeResult> {
  let page: Page | null = null;

  try {
    const ctx = await getBrowser();
    page = await ctx.newPage();

    const videoUrls: string[] = [];

    page.on('response', async (response) => {
      const ct = response.headers()['content-type'] || '';
      const u = response.url();
      if ((ct.includes('video') || u.includes('.mp4')) && u.includes('cdninstagram')) {
        videoUrls.push(u);
      }
    });

    await page.route('**/analytics/**', (route) => route.abort());
    await page.route('**/tracking/**', (route) => route.abort());

    logger.info(`[Instagram] Loading: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);

    if (videoUrls.length > 0) {
      const best = videoUrls.sort((a, b) => b.length - a.length)[0];
      const ogTitle = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content') || '').catch(() => '');
      const ogDesc = await page.$eval('meta[property="og:description"]', el => el.getAttribute('content') || '').catch(() => '');

      return {
        success: true,
        data: {
          title: ogTitle,
          description: ogDesc,
          media: [{ url: best, type: 'video' }],
        },
      };
    }

    const pageData = await page.evaluate(() => {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const t = s.textContent || '';

        const videoMatch = t.match(/"video_url"\s*:\s*"(https:[^"]+)"/);
        if (videoMatch) {
          return { type: 'video' as const, url: videoMatch[1].replace(/\\u0026/g, '&'), title: ogTitle, desc: ogDesc };
        }

        const dashMatch = t.match(/"dash_manifest"\s*:\s*"(https:[^"]+)"/);
        if (dashMatch) {
          return { type: 'video' as const, url: dashMatch[1].replace(/\\u0026/g, '&'), title: ogTitle, desc: ogDesc };
        }

        const videoConfig = t.match(/"video_config"\s*:\s*\{[^}]*"playback_url"\s*:\s*"(https:[^"]+)"/);
        if (videoConfig) {
          return { type: 'video' as const, url: videoConfig[1].replace(/\\u0026/g, '&'), title: ogTitle, desc: ogDesc };
        }
      }

      const videoEl = document.querySelector('video');
      if (videoEl) {
        const sources = videoEl.querySelectorAll('source');
        for (const src of sources) {
          const vUrl = src.getAttribute('src');
          if (vUrl && vUrl.includes('http')) {
            return { type: 'video' as const, url: vUrl, title: ogTitle, desc: ogDesc };
          }
        }
        const vSrc = videoEl.getAttribute('src');
        if (vSrc && vSrc.includes('http')) {
          return { type: 'video' as const, url: vSrc, title: ogTitle, desc: ogDesc };
        }
      }

      return { type: 'image' as const, url: ogImage, title: ogTitle, desc: ogDesc };
    });

    if (pageData?.url && pageData.url.includes('http')) {
      const isVideo = pageData.type === 'video' || pageData.url.includes('.mp4') || videoUrls.length > 0;
      return {
        success: true,
        data: {
          title: pageData.title,
          description: pageData.desc,
          media: [{ url: pageData.url, type: isVideo ? 'video' : 'image' }],
        },
      };
    }

    return { success: false, error: 'No media found on this page' };
  } catch (err) {
    logger.error('[Instagram] Scrape failed', err);
    return { success: false, error: String(err) };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
