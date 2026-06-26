import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const UserSchema = new Schema(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: { type: String, default: '' },

    isPremium: { type: Boolean, default: false, index: true },
    premiumUntil: { type: Date, default: null },

    isBanned: { type: Boolean, default: false, index: true },

    downloadCount: { type: Number, default: 0 },
    totalBytesDownloaded: { type: Number, default: 0 },

    quota: {
      date: { type: String, default: '' },
      bytesUsed: { type: Number, default: 0 },
    },

    settings: {
      defaultQuality: { type: String, default: '720p' },
      preferAudio: { type: Boolean, default: false },
    },

    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & mongoose.Document;

UserSchema.methods.getDailyQuotaUsed = function (dayKey: string): number {
  if (!this.quota || this.quota.date !== dayKey) return 0;
  return this.quota.bytesUsed;
};

UserSchema.methods.addQuotaUsage = function (dayKey: string, bytes: number) {
  if (!this.quota || this.quota.date !== dayKey) {
    this.quota = { date: dayKey, bytesUsed: 0 };
  }
  this.quota.bytesUsed += bytes;
  this.downloadCount += 1;
  this.totalBytesDownloaded += bytes;
  this.lastActiveAt = new Date();
  return this.save();
};

UserSchema.methods.isPremiumActive = function (): boolean {
  return this.isPremium && (!this.premiumUntil || this.premiumUntil > new Date());
};

export const User: Model<UserDoc> = mongoose.model<UserDoc>('User', UserSchema);
