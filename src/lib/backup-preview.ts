/** شكل رد معاينة النسخة الاحتياطية (يُستخدم في شاشة النسخ الاحتياطي) */
export interface BackupPreview {
  valid: boolean;
  error?: string;
  fileName?: string;
  meta?: { app: string; version: unknown; exportedAt: unknown };
  counts?: {
    products: number;
    invoices: number;
    invoiceItems: number;
    parties: number;
    payments: number;
    expenses: number;
    cashMoves: number;
  };
  storeName?: string;
  lastInvoice?: { date: string; number: unknown } | null;
  current?: { products: number; invoices: number; parties: number; storeName: string };
  warnings?: string[];
}
