const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const minLevel: Level = process.env.LOG_LEVEL as Level ?? 'info';

function ts(): string {
  return new Date().toISOString();
}

function log(level: Level, msg: string, extra?: unknown) {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const prefix = `[${ts()}] [${level.toUpperCase()}]`;
  if (extra !== undefined) {
    console[level === 'debug' ? 'log' : level](prefix, msg, extra);
  } else {
    console[level === 'debug' ? 'log' : level](prefix, msg);
  }
}

export const logger = {
  debug: (msg: string, extra?: unknown) => log('debug', msg, extra),
  info: (msg: string, extra?: unknown) => log('info', msg, extra),
  warn: (msg: string, extra?: unknown) => log('warn', msg, extra),
  error: (msg: string, extra?: unknown) => log('error', msg, extra),
};
