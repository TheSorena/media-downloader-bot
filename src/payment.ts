import { config } from './config/index.js';
import { logger } from './utils/logger.js';

interface CreateInvoiceOpts {
  amount: number;
  description: string;
  metadata?: Record<string, string>;
}

interface InvoiceResponse {
  invoice_id: string;
  payment_url: string;
}

export async function createInvoice(opts: CreateInvoiceOpts): Promise<InvoiceResponse | null> {
  if (!config.payment.bluepalApiKey) {
    logger.warn('BluePal API key not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.bluepal.ir/api/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.payment.bluepalApiKey}`,
      },
      body: JSON.stringify({
        amount: opts.amount,
        description: opts.description,
        callback_url: config.payment.callbackUrl || undefined,
        metadata: opts.metadata || {},
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('BluePal invoice creation failed', error);
      return null;
    }

    const data: any = await response.json();
    return {
      invoice_id: data.invoice_id,
      payment_url: data.payment_url,
    };
  } catch (err: any) {
    logger.error('BluePal API error', err.message);
    return null;
  }
}

export const PLAN_PRICES: Record<string, { amount: number; label: string; days: number }> = {
  month: { amount: 500000, label: 'ماهانه', days: 30 },
  '3months': { amount: 1200000, label: 'سه‌ماهه', days: 90 },
  year: { amount: 4000000, label: 'سالانه', days: 365 },
};
