import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface CobaltOptions {
  url: string;
  videoQuality?: string;
  audioOnly?: boolean;
}

export interface CobaltResult {
  status: 'tunnel' | 'redirect' | 'picker' | 'error';
  url?: string;
  filename?: string;
  picker?: { type: string; url: string }[];
  error?: string;
}

export async function cobaltDownload(opts: CobaltOptions): Promise<CobaltResult> {
  const { url, videoQuality = '1080', audioOnly = false } = opts;

  const body: Record<string, any> = {
    url,
    downloadMode: audioOnly ? 'audio' : 'auto',
    videoQuality: videoQuality.replace('p', ''),
    audioFormat: 'mp3',
    audioBitrate: '128',
    filenameStyle: 'pretty',
  };

  logger.info('cobalt request', { url, quality: videoQuality, audioOnly });

  const res = await fetch(`${config.cobalt.apiUrl}/`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('cobalt HTTP error', { status: res.status, text });
    return { status: 'error', error: `HTTP ${res.status}` };
  }

  const data = await res.json() as any;

  if (data.status === 'error') {
    logger.error('cobalt error', data.error);
    return { status: 'error', error: data.error?.code || 'unknown_error' };
  }

  if (data.status === 'tunnel' || data.status === 'redirect') {
    return {
      status: data.status,
      url: data.url,
      filename: data.filename,
    };
  }

  if (data.status === 'picker') {
    return {
      status: 'picker',
      picker: data.picker,
    };
  }

  return { status: 'error', error: 'unexpected_response' };
}

export async function cobaltDownloadFile(opts: CobaltOptions, destPath: string): Promise<{ filePath: string; filename: string }> {
  const result = await cobaltDownload(opts);

  if (result.status === 'error') {
    throw new Error(`cobalt: ${result.error}`);
  }

  let downloadUrl = result.url;
  let filename = result.filename || 'download.mp4';

  if (result.status === 'picker' && result.picker && result.picker.length > 0) {
    const video = result.picker.find((p) => p.type === 'video') || result.picker[0];
    downloadUrl = video.url;
  }

  if (!downloadUrl) {
    throw new Error('cobalt: no download URL returned');
  }

  logger.info('cobalt download starting', { filename, url: downloadUrl.slice(0, 80) });

  const fileRes = await fetch(downloadUrl, { signal: AbortSignal.timeout(300000) });
  if (!fileRes.ok) {
    throw new Error(`cobalt download failed: HTTP ${fileRes.status}`);
  }

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const { writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const filePath = join(destPath, filename);
  await writeFile(filePath, buffer);

  logger.info('cobalt download complete', { filePath, size: buffer.length });
  return { filePath, filename };
}
