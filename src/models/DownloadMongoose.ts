import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const DownloadSchema = new Schema(
  {
    userId: { type: Number, required: true, index: true },
    telegramId: { type: Number, required: true, index: true },

    url: { type: String, required: true },
    platform: { type: String, required: true, index: true },

    title: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    fileSize: { type: Number, default: 0 },
    format: { type: String, default: '' },
    quality: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'downloading', 'uploading', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    errorMessage: { type: String, default: '' },

    telegramMessageId: { type: Number, default: null },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type DownloadDoc = InferSchemaType<typeof DownloadSchema> & mongoose.Document;

export const Download: Model<DownloadDoc> = mongoose.model<DownloadDoc>('Download', DownloadSchema);
