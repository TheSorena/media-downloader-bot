import { randomUUID } from 'node:crypto';

class DownloadModel {
  _id: string = randomUUID();
  userId!: string | number;
  telegramId!: number;
  url!: string;
  platform!: string;
  title: string = '';
  duration: number = 0;
  fileSize: number = 0;
  format: string = '';
  quality: string = '';
  status: string = 'pending';
  errorMessage: string = '';
  telegramMessageId: number | null = null;
  startedAt: Date | null = null;
  completedAt: Date | null = null;

  constructor(data: Record<string, any>) {
    Object.assign(this, data);
  }

  async save(): Promise<void> {}
}

export const Download = DownloadModel as any;
