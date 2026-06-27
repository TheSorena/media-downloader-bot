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
  referral: { code: string; referredBy: number; referralCount: number; bonusBytes: number };
  payment: { invoiceId: string; plan: string; status: string; paidAt: Date | null; amount: number };
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
  referral: { code: string; referredBy: number; referralCount: number; bonusBytes: number } = { code: '', referredBy: 0, referralCount: 0, bonusBytes: 0 };
  payment: { invoiceId: string; plan: string; status: string; paidAt: Date | null; amount: number } = { invoiceId: '', plan: '', status: '', paidAt: null, amount: 0 };
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

  static async findOne(query: any): Promise<IUser | null> {
    if (query.telegramId) return users.get(query.telegramId) ?? null;
    if (query['payment.invoiceId']) {
      for (const u of users.values()) {
        if (u.payment.invoiceId === query['payment.invoiceId']) return u;
      }
    }
    return null;
  }

  static async updateOne(query: any, update: any): Promise<void> {
    const tid = query.telegramId;
    const user = users.get(tid);
    if (user && update.$set) Object.assign(user, update.$set);
  }

  static async countDocuments(): Promise<number> {
    return users.size;
  }

  static find(query?: any): any {
    return {
      sort: () => ({
        limit: () => ({
          lean: () => Promise.resolve([]),
        }),
        lean: () => Promise.resolve([]),
      }),
      lean: () => Promise.resolve([]),
    };
  }

  static async aggregate(): Promise<any[]> {
    return [];
  }
}

export const User = UserModel;
