import { Router } from 'express';

import {
  deleteReceiptHandler,
  downloadReceiptHandler,
  getReceiptsByDayHandler,
  uploadReceiptsHandler,
} from '../controllers/receipt.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { uploadMultipleReceipts } from '../middlewares/upload';
import { validate } from '../middlewares/validate.middleware';
import {
  createReceiptsSchema,
  getReceiptsByDayQuerySchema,
  receiptIdParamSchema,
} from '../validations/receipt.validation';

const router = Router();

// Upload one or more receipt files against a daily balance.
router.post(
  '/bulk',
  requireAuth,
  uploadMultipleReceipts,
  validate(createReceiptsSchema),
  uploadReceiptsHandler,
);

// List receipts for a specific calendar day (?date=YYYY-MM-DD).
router.get(
  '/day',
  requireAuth,
  validate(getReceiptsByDayQuerySchema, 'query'),
  getReceiptsByDayHandler,
);

// Redirect to a temporary presigned URL that forces the receipt download.
router.get(
  '/:id/download',
  requireAuth,
  validate(receiptIdParamSchema, 'params'),
  downloadReceiptHandler,
);

// Delete a receipt (R2 object + database record).
router.delete(
  '/:id',
  requireAuth,
  validate(receiptIdParamSchema, 'params'),
  deleteReceiptHandler,
);

export default router;
