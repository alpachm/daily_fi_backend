import { type Order } from 'sequelize';
import sharp from 'sharp';

import { sequelize } from '../database';
import type { CreateReceiptsInput, ReceiptDTO } from '../interfaces/receipt.interface';
import { DailyBalance, Receipt } from '../models';
import { AppError } from '../utils/AppError';
import { buildReceiptFolder, deleteFromR2, getFromR2, uploadToR2 } from '../utils/storage';

const SUPPORTED_TARGET_FORMATS: ReadonlySet<string> = new Set(['jpg', 'png', 'webp']);

type TargetFormat = 'jpg' | 'png' | 'webp';

function toDTO(receipt: Receipt): ReceiptDTO {
  return {
    id: receipt.pk_receipts,
    userId: receipt.fk_user,
    dailyBalanceId: receipt.fk_daily_balance,
    fileUrl: receipt.file_url,
    type: receipt.type,
    date: receipt.date,
    description: receipt.description,
    category: receipt.category,
    createdAt: receipt.created_at,
    updatedAt: receipt.updated_at,
  };
}

/**
 * Finds a daily balance by primary key and enforces ownership: 404 when the
 * record does not exist, 403 when it belongs to another user.
 */
async function findOwnedBalance(userId: number, id: number): Promise<DailyBalance> {
  const balance = await DailyBalance.findByPk(id);

  if (!balance) {
    throw new AppError('Daily balance not found', 404);
  }

  if (balance.fk_user !== userId) {
    throw new AppError('You are not authorized to access this daily balance', 403);
  }

  return balance;
}

/**
 * Finds a receipt by primary key and enforces ownership through its `fk_user`
 * column (mirrors the `findOwnedBalance` pattern).
 */
async function findOwnedReceipt(userId: number, id: number): Promise<Receipt> {
  const receipt = await Receipt.findByPk(id);

  if (!receipt) {
    throw new AppError('Receipt not found', 404);
  }

  if (receipt.fk_user !== userId) {
    throw new AppError('You are not authorized to access this receipt', 403);
  }

  return receipt;
}

async function rollbackUploadedFiles(keys: string[]): Promise<void> {
  await Promise.allSettled(keys.map((key) => deleteFromR2(key)));
}

function contentTypeToExtension(contentType: string): string {
  switch (contentType) {
    case 'image/webp':
      return '.webp';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

async function convertImage(
  buffer: Buffer,
  format: TargetFormat,
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  if (format === 'jpg') {
    return {
      buffer: await sharp(buffer).jpeg({ quality: 90 }).toBuffer(),
      contentType: 'image/jpeg',
      extension: 'jpg',
    };
  }

  if (format === 'png') {
    return {
      buffer: await sharp(buffer).png().toBuffer(),
      contentType: 'image/png',
      extension: 'png',
    };
  }

  // Images are stored as WebP after upload, so `webp` is returned unchanged.
  return {
    buffer,
    contentType: 'image/webp',
    extension: 'webp',
  };
}

/**
 * Uploads a batch of receipt files to Cloudflare R2 and persists their records
 * inside a single database transaction. Each object key is scoped by the
 * authenticated user's email, the daily balance date, and the operation type,
 * e.g. `user@example.com/2026/10/04/compra/1728045600_a1b2c.webp`. If the
 * database write fails, every object uploaded in this batch is removed from R2
 * before the error re-throws.
 */
export async function uploadReceipts(
  userId: number,
  userEmail: string,
  files: Express.Multer.File[],
  data: CreateReceiptsInput,
): Promise<ReceiptDTO[]> {
  const balance = await findOwnedBalance(userId, data.fk_daily_balance);
  const folder = buildReceiptFolder(userEmail, new Date(balance.date), data.type);

  const uploaded: { key: string; url: string }[] = [];

  // Upload everything first; on a partial upload failure, clean up the objects
  // that were already persisted so no orphan files remain in R2.
  try {
    for (const file of files) {
      const result = await uploadToR2(file, folder);
      uploaded.push(result);
    }
  } catch (err) {
    await rollbackUploadedFiles(uploaded.map((entry) => entry.key));
    throw err;
  }

  const description = data.description?.trim() ? data.description.trim() : null;
  const category = data.category?.trim() ? data.category.trim() : null;

  try {
    const receipts = await sequelize.transaction(async (transaction) => {
      const created = await Receipt.bulkCreate(
        uploaded.map(({ key, url }) => ({
          fk_user: userId,
          fk_daily_balance: data.fk_daily_balance,
          file_key: key,
          file_url: url,
          type: data.type,
          date: balance.date,
          description,
          category,
        })),
        { transaction },
      );

      return created;
    });

    return receipts.map(toDTO);
  } catch (err) {
    // Roll back the R2 objects when the database transaction fails.
    await rollbackUploadedFiles(uploaded.map((entry) => entry.key));
    throw err;
  }
}

/**
 * Returns every receipt attached to the given daily balance (ownership verified
 * through that balance).
 */
export async function getReceiptsByDailyBalance(
  userId: number,
  dailyBalanceId: number,
): Promise<ReceiptDTO[]> {
  await findOwnedBalance(userId, dailyBalanceId);

  const order: Order = [
    ['created_at', 'ASC'],
    ['pk_receipts', 'ASC'],
  ];

  const receipts = await Receipt.findAll({
    where: { fk_daily_balance: dailyBalanceId, fk_user: userId },
    order,
  });

  return receipts.map(toDTO);
}

export interface ReceiptFilePayload {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

/**
 * Fetches a receipt file from R2 and, when `targetFormat` is `jpg` or `png`,
 * converts the stored WebP image on the fly with `sharp`. PDFs are always
 * returned byte-for-byte.
 */
export async function getReceiptFileStreamOrBuffer(
  userId: number,
  receiptId: number,
  targetFormat?: string,
): Promise<ReceiptFilePayload> {
  const receipt = await findOwnedReceipt(userId, receiptId);
  const { buffer, contentType } = await getFromR2(receipt.file_key);

  const format = targetFormat?.toLowerCase();

  if (
    format &&
    SUPPORTED_TARGET_FORMATS.has(format) &&
    contentType.startsWith('image/')
  ) {
    const converted = await convertImage(buffer, format as TargetFormat);

    return {
      buffer: converted.buffer,
      contentType: converted.contentType,
      filename: `receipt-${receipt.pk_receipts}.${converted.extension}`,
    };
  }

  return {
    buffer,
    contentType,
    filename: `receipt-${receipt.pk_receipts}${contentTypeToExtension(contentType)}`,
  };
}

/**
 * Resolves the public URL for a receipt so the controller can redirect the
 * client straight to the R2 CDN (no buffering of the file in server memory).
 */
export async function getReceiptFileUrl(
  userId: number,
  receiptId: number,
): Promise<string> {
  const receipt = await findOwnedReceipt(userId, receiptId);
  return receipt.file_url;
}

/**
 * Deletes the R2 object first and then the PostgreSQL row (ownership verified).
 */
export async function deleteReceipt(
  userId: number,
  receiptId: number,
): Promise<void> {
  const receipt = await findOwnedReceipt(userId, receiptId);

  await deleteFromR2(receipt.file_key);
  await receipt.destroy();
}
