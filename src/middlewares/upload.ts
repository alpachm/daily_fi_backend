import multer from 'multer';

import { AppError } from '../utils/AppError';

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const MAX_RECEIPT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Multer instance configured for receipt uploads:
 * - Stores files in memory so they can be streamed to Cloudflare R2.
 * - Rejects any MIME type outside the receipt allow-list.
 * - Enforces a 5 MB maximum file size.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_RECEIPT_FILE_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(
      new AppError(
        'Unsupported file type. Allowed formats: JPEG, PNG, WebP, PDF.',
        415,
      ),
    );
  },
});

/**
 * Middleware that accepts a single file under the `receipt` form field.
 */
export const uploadSingleReceipt = upload.single('receipt');
