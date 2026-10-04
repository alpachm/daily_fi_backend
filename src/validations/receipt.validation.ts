import { z } from 'zod';

import { ReceiptType } from '../enums/receiptType';

/**
 * Shared positive-integer coercion used for numeric path/body identifiers.
 */
const positiveIntSchema = (label: string) =>
  z.coerce
    .number()
    .int(`${label} must be an integer`)
    .positive(`${label} must be a positive integer`);

/**
 * Validates the multipart form fields required to upload one or more receipts.
 *
 * - `fk_daily_balance` arrives as a form text field, hence the number coercion.
 * - `type` defaults to `PURCHASE` when omitted (a receipt is a proof of purchase
 *   by default); send `SALE` to record a sale receipt.
 */
export const createReceiptsSchema = z.object({
  fk_daily_balance: positiveIntSchema('Daily balance ID'),
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

export const receiptsByDailyBalanceParamSchema = z.object({
  dailyBalanceId: positiveIntSchema('Daily balance ID'),
});

export const receiptIdParamSchema = z.object({
  id: positiveIntSchema('Receipt ID'),
});
