import express from 'express';
import { scrape, closeBrowser } from './scraper/index.js';
import { logger } from '../utils/logger.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/scrape', async (req, res) => {
  const url = req.query.url as string;

  if (!url) {
    res.status(400).json({ success: false, error: 'Missing "url" query parameter' });
    return;
  }

  logger.info(`[API] Scrape request: ${url}`);
  const result = await scrape(url);

  if (result.success) {
    res.json(result);
  } else {
    res.status(422).json(result);
  }
});

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ success: false, error: 'Missing "url" in request body' });
    return;
  }

  logger.info(`[API] Scrape request (POST): ${url}`);
  const result = await scrape(url);

  if (result.success) {
    res.json(result);
  } else {
    res.status(422).json(result);
  }
});

export function startApiServer(port: number = 3001): void {
  app.listen(port, '0.0.0.0', () => {
    logger.info(`[API] Scraping server started on port ${port}`);
  });

  process.on('SIGINT', async () => {
    await closeBrowser();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await closeBrowser();
    process.exit(0);
  });
}
