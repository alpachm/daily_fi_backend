import { z } from 'zod';

import { ReceiptType } from '../enums/receiptType';
import { isValidCalendarDate } from './dailyBalance.validation';

/**
 * Shared positive-integer coercion used for numeric path/body identifiers.
 */
const positiveIntSchema = (label: string) =>
  z.coerce
    .number()
    .int(`${label} must be an integer`)
    .positive(`${label} must be a positive integer`);

const RECEIPT_DATE_REQUIRED_MESSAGE = 'A valid date (YYYY-MM-DD) is required';

/**
 * Calendar date the uploaded receipts belong to (`YYYY-MM-DD`). Unlike the
 * create-balance request, a receipt can never fall back to a default day: it
 * must always resolve to a concrete date, so missing, malformed or impossible
 * values all fail with the same clear message.
 */
export const receiptDateSchema = z
  .string({ error: RECEIPT_DATE_REQUIRED_MESSAGE })
  .trim()
  .refine(isValidCalendarDate, RECEIPT_DATE_REQUIRED_MESSAGE);

/**
 * Validates the multipart form fields required to upload one or more receipts.
 *
 * - `date` identifies the daily balance the receipts belong to; the service
 *   resolves (or auto-creates) that balance by (userId, date).
 * - `type` defaults to `PURCHASE` when omitted (a receipt is a proof of purchase
 *   by default); send `SALE` to record a sale receipt.
 */
export const createReceiptsSchema = z.object({
  date: receiptDateSchema,
  description: z
    .string()
    .trim()
    .max(255, 'Description must be at most 255 characters')
    .optional(),
  category: z
    .string()
    .trim()
    .max(255, 'Category must be at most 255 characters')
    .optional(),
  type: z.nativeEnum(ReceiptType).default(ReceiptType.PURCHASE),
});

export const GET_RECEIPTS_BY_DAY_DEFAULT_PAGE = 1;
export const GET_RECEIPTS_BY_DAY_DEFAULT_LIMIT = 20;
export const GET_RECEIPTS_BY_DAY_MAX_LIMIT = 100;

/**
 * Query parameters for the GET /receipts/day endpoint.
 *
 * - `date` (required): calendar day (`YYYY-MM-DD`) whose receipts are returned.
 *   Receipts are matched directly against the `receipts.date` column, so no
 *   daily-balance record is required to list them.
 * - `page` (optional): 1-based page number. Falls back to 1 when absent.
 * - `limit` (optional): number of receipts per page. Falls back to 20 when
 *   absent and is capped at 100 to keep the query bounded.
 */
export const getReceiptsByDayQuerySchema = z.object({
  date: receiptDateSchema,
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(GET_RECEIPTS_BY_DAY_DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(GET_RECEIPTS_BY_DAY_MAX_LIMIT, 'Limit must be at most 100')
    .default(GET_RECEIPTS_BY_DAY_DEFAULT_LIMIT),
});

export const receiptIdParamSchema = z.object({
  id: positiveIntSchema('Receipt ID'),
});
