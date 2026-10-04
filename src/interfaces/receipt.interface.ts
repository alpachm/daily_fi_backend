import { z } from 'zod';

import { ReceiptType } from '../enums/receiptType';
import {
  createReceiptsSchema,
  receiptIdParamSchema,
  receiptsByDailyBalanceParamSchema,
} from '../validations/receipt.validation';

export type CreateReceiptsInput = z.infer<typeof createReceiptsSchema>;
export type ReceiptIdParam = z.infer<typeof receiptIdParamSchema>;
export type ReceiptsByDailyBalanceParam = z.infer<typeof receiptsByDailyBalanceParamSchema>;

/**
 * Serialized representation returned to API consumers. Maps the snake_case
 * database columns to camelCase. `fileUrl` carries a temporary presigned URL
 * generated on demand — the private R2 object key (`file_key`) is never exposed
 * to clients.
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
