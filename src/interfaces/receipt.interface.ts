import { z } from 'zod';

import { ReceiptType } from '../enums/receiptType';
import {
  createReceiptsSchema,
  getReceiptsByDayQuerySchema,
  receiptIdParamSchema,
} from '../validations/receipt.validation';

export type CreateReceiptsInput = z.infer<typeof createReceiptsSchema>;
export type ReceiptIdParam = z.infer<typeof receiptIdParamSchema>;
export type GetReceiptsByDayQuery = z.infer<typeof getReceiptsByDayQuerySchema>;

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

/**
 * Pagination metadata attached to paginated collection responses.
 */
export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Response payload returned by `GET /receipts/day`.
 */
export interface GetReceiptsByDayResponse {
  date: string;
  receipts: ReceiptDTO[];
  pagination: PaginationMeta;
}
