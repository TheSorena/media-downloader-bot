import 'dotenv/config';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`متغیر محیطی ${key} تنظیم نشده است. فایل .env را بررسی کنید.`);
  }
  return value;
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isNaN(n) ? fallback : n;
}

function intArr(key: string, fallback: number[]): number[] {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
}

export const config = {
  bot: {
    token: required('BOT_TOKEN', '123456:ABC-DEF'),
    adminIds: intArr('ADMIN_IDS', []),
    apiUrl: process.env.BOT_API_URL ?? '',
    apiDataDir: process.env.BOT_API_DATA_DIR ?? '',
    useLocalApi: Boolean(process.env.BOT_API_URL),
  },
  db: {
    uri: required('MONGODB_URI', 'mongodb://localhost:27017/media_downloader'),
  },
  limits: {
    freeDailyQuotaMB: num('FREE_DAILY_QUOTA_MB', 5120),
    freeMaxFileMB: num('FREE_MAX_FILE_MB', 2048),
    premiumMaxFileMB: num('PREMIUM_MAX_FILE_MB', 2000),
  },
  payment: {
    bluepalApiKey: process.env.BLUEPAL_API_KEY ?? '',
    callbackUrl: process.env.BLUEPAL_CALLBACK_URL ?? '',
  },
  channel: {
    forceJoin: process.env.FORCE_JOIN_CHANNEL ?? '',
    forceJoinLink: process.env.FORCE_JOIN_LINK ?? '',
  },
  cobalt: {
    apiUrl: process.env.COBALT_API_URL ?? 'http://localhost:9000',
  },
  cookies: {
    path: process.env.COOKIE_FILE ?? '',
  },
  downloadDir: required('DOWNLOAD_DIR', './downloads'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: process.env.NODE_ENV !== 'production',
} as const;

export type Config = typeof config;
