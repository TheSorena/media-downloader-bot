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
  createdAt: Date = new Date();

  constructor(data: Record<string, any>) {
    Object.assign(this, data);
  }

  async save(): Promise<void> {}

  static find(query?: any): any {
    const items: any[] = [];
    return {
      sort: () => ({
        limit: () => ({
          lean: () => Promise.resolve(items),
        }),
        lean: () => Promise.resolve(items),
      }),
      lean: () => Promise.resolve(items),
    };
  }

  static async countDocuments(): Promise<number> {
    return 0;
  }

  static async aggregate(): Promise<any[]> {
    return [];
  }

  static async updateOne(query: any, update: any): Promise<void> {}
}

export const Download = DownloadModel as any;
