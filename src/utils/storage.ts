import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import dotenv from 'dotenv';
import sharp from 'sharp';

import { ReceiptType } from '../enums/receiptType';

// Load environment variables from `.env` into `process.env`.
dotenv.config();

/**
 * Pads a numeric month/day to two digits (e.g. `4` -> `'04'`) so the R2 folder
 * hierarchy stays chronologically sorted.
 */
function padToTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Normalized, lower-case folder segment used in R2 object keys for each receipt
 * operation type.
 */
export type ReceiptFolderType = 'compra' | 'venta';

const RECEIPT_TYPE_FOLDER: Record<ReceiptType, ReceiptFolderType> = {
  [ReceiptType.PURCHASE]: 'compra',
  [ReceiptType.SALE]: 'venta',
};

/**
 * Builds the hierarchical folder prefix used as the R2 object key base for a
 * receipt upload, scoped per user, date, and operation type:
 * `user@example.com/2026/10/04/compra`. Month and day are zero-padded to keep
 * R2 folder listings chronologically sorted.
 */
export function buildReceiptFolder(
  userEmail: string,
  date: Date,
  type: ReceiptType,
): string {
  const year = date.getUTCFullYear();
  const month = padToTwoDigits(date.getUTCMonth() + 1);
  const day = padToTwoDigits(date.getUTCDate());
  const typeFolder = RECEIPT_TYPE_FOLDER[type];

  return `${userEmail}/${year}/${month}/${day}/${typeFolder}`;
}

const IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Reads a required environment variable and fails fast with a clear message if
 * it is missing or empty. This keeps Cloudflare R2 credentials out of the source
 * code while validating the configuration at startup (see `agent.md` — "Sin
 * Exposición de Secretos").
 */
function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name} environment variable. Add it to your \`.env\` file before starting the server.`,
    );
  }

  return value;
}

// ---------------------------------------------------------------------------
// Cloudflare R2 configuration (loaded from environment variables)
// ---------------------------------------------------------------------------

const getR2Endpoint = (): string => requireEnv('R2_ENDPOINT');
const getR2AccessKeyId = (): string => requireEnv('R2_ACCESS_KEY_ID');
const getR2SecretAccessKey = (): string => requireEnv('R2_SECRET_ACCESS_KEY');
const getBucketName = (): string => requireEnv('R2_BUCKET_NAME');
const getPublicUrl = (): string =>
  requireEnv('R2_PUBLIC_URL').replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// S3 client (Cloudflare R2 is S3-compatible)
// ---------------------------------------------------------------------------

const s3Client = new S3Client({
  region: 'auto',
  endpoint: getR2Endpoint(),
  credentials: {
    accessKeyId: getR2AccessKeyId(),
    secretAccessKey: getR2SecretAccessKey(),
  },
});

/**
 * Prepares an in-memory Multer file for upload:
 * - PDFs are uploaded byte-for-byte without re-encoding.
 * - JPEG/PNG/WebP images are resized to a maximum of 1200x1200 (never
 *   upscaling smaller images) and re-encoded as WebP at quality 75 to reduce
 *   storage and bandwidth usage.
 */
async function processFileForUpload(file: Express.Multer.File): Promise<{
  buffer: Buffer;
  mimetype: string;
  extension: string;
}> {
  if (file.mimetype === 'application/pdf') {
    return {
      buffer: file.buffer,
      mimetype: file.mimetype,
      extension: extname(file.originalname) || '.pdf',
    };
  }

  if (IMAGE_MIME_TYPES.has(file.mimetype)) {
    const buffer = await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    return {
      buffer,
      mimetype: 'image/webp',
      extension: '.webp',
    };
  }

  // Unknown MIME type: fall back to uploading the original buffer unchanged.
  return {
    buffer: file.buffer,
    mimetype: file.mimetype,
    extension: extname(file.originalname),
  };
}

/**
 * Uploads an in-memory Multer file to Cloudflare R2 under the provided folder
 * prefix and returns its generated object key and public URL.
 *
 * The final key follows `${folder}/${timestamp}_${randomHash}${extension}`,
 * e.g. `user@example.com/2026/10/04/compra/1728045600_a1b2c.webp`.
 */
export async function uploadToR2(
  file: Express.Multer.File,
  folder: string,
): Promise<{ key: string; url: string }> {
  const { buffer, mimetype, extension } = await processFileForUpload(file);
  const timestamp = Date.now();
  const randomHash = randomBytes(5).toString('hex');
  const key = `${folder}/${timestamp}_${randomHash}${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  return { key, url: `${getPublicUrl()}/${key}` };
}

/**
 * Deletes an object from Cloudflare R2 by its object key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );
}

/**
 * Downloads an object from Cloudflare R2 by its key and returns its binary
 * content together with the stored `Content-Type`.
 */
export async function getFromR2(
  key: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );

  const body = result.Body;

  if (!body) {
    throw new Error(`Object not found in R2: ${key}`);
  }

  const bytes = await body.transformToByteArray();

  return {
    buffer: Buffer.from(bytes),
    contentType: result.ContentType ?? 'application/octet-stream',
  };
}
