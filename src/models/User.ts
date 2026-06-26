export interface IUser {
  _id: string;
  telegramId: number;
  firstName: string;
  lastName: string;
  username: string;
  isPremium: boolean;
  premiumUntil: Date | null;
  isBanned: boolean;
  downloadCount: number;
  totalBytesDownloaded: number;
  quota: { date: string; bytesUsed: number };
  settings: { defaultQuality: string; preferAudio: boolean };
  joinedAt: Date;
  lastActiveAt: Date;
  getDailyQuotaUsed(dayKey: string): number;
  addQuotaUsage(dayKey: string, bytes: number): Promise<void>;
  isPremiumActive(): boolean;
  save(): Promise<void>;
}

const USE_MOCK = process.env.MOCK_DB === 'true';

export const User = USE_MOCK
  ? (await import('./UserMock.js')).User
  : (await import('./UserMongoose.js')).User;
