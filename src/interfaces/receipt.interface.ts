import { z } from 'zod';

import { ReceiptType } from '../enums/receiptType';
import {
  createReceiptsSchema,
  downloadReceiptQuerySchema,
  receiptIdParamSchema,
  receiptsByDailyBalanceParamSchema,
} from '../validations/receipt.validation';

export type CreateReceiptsInput = z.infer<typeof createReceiptsSchema>;
export type ReceiptIdParam = z.infer<typeof receiptIdParamSchema>;
export type ReceiptsByDailyBalanceParam = z.infer<typeof receiptsByDailyBalanceParamSchema>;
export type DownloadReceiptQuery = z.infer<typeof downloadReceiptQuerySchema>;

/**
 * Serialized representation returned to API consumers. Maps the snake_case
 * database columns to camelCase. The R2 object key (`file_key`) is never
 * exposed to clients — only the public URL is returned.
 */
export interface ReceiptDTO {
  id: number;
  userId: number;
  dailyBalanceId: number;
  fileUrl: string;
  type: ReceiptType;
  date: string;
  description: string | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}
