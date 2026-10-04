import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import dotenv from 'dotenv';

// Load environment variables from `.env` into `process.env`.
dotenv.config();

const DEFAULT_FOLDER = 'receipts';

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
 * Uploads an in-memory Multer file to Cloudflare R2 and returns its object key
 * and public URL.
 */
export async function uploadToR2(
  file: Express.Multer.File,
  folder: string = DEFAULT_FOLDER,
): Promise<{ key: string; url: string }> {
  const extension = extname(file.originalname);
  const key = `${folder}/${Date.now()}-${randomUUID()}${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
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
