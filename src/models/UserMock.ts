import { randomUUID } from 'node:crypto';

interface IUser {
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

const users = new Map<number, IUser>();

class UserModel {
  _id: string = randomUUID();
  telegramId!: number;
  firstName: string = '';
  lastName: string = '';
  username: string = '';
  isPremium: boolean = false;
  premiumUntil: Date | null = null;
  isBanned: boolean = false;
  downloadCount: number = 0;
  totalBytesDownloaded: number = 0;
  quota: { date: string; bytesUsed: number } = { date: '', bytesUsed: 0 };
  settings: { defaultQuality: string; preferAudio: boolean } = { defaultQuality: '720p', preferAudio: false };
  joinedAt: Date = new Date();
  lastActiveAt: Date = new Date();

  constructor(data: Partial<IUser>) {
    Object.assign(this, data);
    if (data.telegramId) users.set(data.telegramId, this as unknown as IUser);
  }

  getDailyQuotaUsed(dayKey: string): number {
    if (this.quota.date !== dayKey) return 0;
    return this.quota.bytesUsed;
  }

  async addQuotaUsage(dayKey: string, bytes: number): Promise<void> {
    if (this.quota.date !== dayKey) {
      this.quota = { date: dayKey, bytesUsed: 0 };
    }
    this.quota.bytesUsed += bytes;
    this.downloadCount += 1;
    this.totalBytesDownloaded += bytes;
    this.lastActiveAt = new Date();
  }

  isPremiumActive(): boolean {
    return this.isPremium && (!this.premiumUntil || this.premiumUntil > new Date());
  }

  async save(): Promise<void> {}

  static async findOne(query: { telegramId: number }): Promise<IUser | null> {
    return users.get(query.telegramId) ?? null;
  }

  static async updateOne(query: { telegramId: number }, update: { $set: Partial<IUser> }): Promise<void> {
    const user = users.get(query.telegramId);
    if (user) Object.assign(user, update.$set);
  }
}

export const User = UserModel;
