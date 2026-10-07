import { type Order } from 'sequelize';
import { extname } from 'node:path';

import { sequelize } from '../database';
import type { CreateReceiptsInput, ReceiptDTO } from '../interfaces/receipt.interface';
import { DailyBalance, Receipt } from '../models';
import { AppError } from '../utils/AppError';
import {
  buildReceiptFolder,
  createPresignedDownloadUrl,
  deleteFromR2,
  PRESIGNED_URL_EXPIRES_IN_SECONDS,
  uploadToR2,
} from '../utils/storage';

async function toDTO(receipt: Receipt): Promise<ReceiptDTO> {
  const fileUrl = await createPresignedDownloadUrl(receipt.file_key, {
    expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
  });

  return {
    id: receipt.pk_receipts,
    userId: receipt.fk_user,
    dailyBalanceId: receipt.fk_daily_balance,
    fileUrl,
    type: receipt.type,
    date: receipt.date,
    description: receipt.description,
    category: receipt.category,
    createdAt: receipt.created_at,
    updatedAt: receipt.updated_at,
  };
}

/**
 * Resolves the daily balance for the authenticated user and the provided date.
 * Ownership is enforced implicitly: a balance belonging to another user simply
 * does not match the (fk_user, date) filter and is reported as not found. When
 * no balance exists for the date, the upload is rejected before any file is
 * processed or persisted.
 */
async function findDailyBalanceByDate(
  userId: number,
  date: string,
): Promise<DailyBalance> {
  const balance = await DailyBalance.findOne({
    where: { fk_user: userId, date },
  });

  if (!balance) {
    throw new AppError(
      'No daily balance record found for the provided date. Please create a daily balance entry before uploading receipts.',
      404,
      [
        {
          field: 'date',
          message: 'Daily balance record does not exist for this date',
        },
      ],
    );
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

function buildReceiptFilename(receipt: Receipt): string {
  const extension = extname(receipt.file_key);
  return `receipt-${receipt.pk_receipts}${extension}`;
}

/**
 * Uploads a batch of receipt files to Cloudflare R2 and persists their relative
 * object keys inside a single database transaction. Each key is scoped by the
 * authenticated user's email, the receipt date, and the operation type, e.g.
 * `user@example.com/2026/10/04/compra/1728045600_a1b2c.webp`.
 *
 * The target daily balance is resolved by (userId, date) up front: when no
 * balance exists for the date, the upload is rejected before any file is
 * processed or persisted to R2. If the database write fails, every object
 * uploaded in this batch is removed from R2 before the error re-throws.
 */
export async function uploadReceipts(
  userId: number,
  userEmail: string,
  files: Express.Multer.File[],
  data: CreateReceiptsInput,
): Promise<void> {
  const balance = await findDailyBalanceByDate(userId, data.date);
  const folder = buildReceiptFolder(userEmail, new Date(balance.date), data.type);

  const uploadedKeys: string[] = [];

  // Upload everything first; on a partial upload failure, clean up the objects
  // that were already persisted so no orphan files remain in R2.
  try {
    for (const file of files) {
      const key = await uploadToR2(file, folder);
      uploadedKeys.push(key);
    }
  } catch (err) {
    await rollbackUploadedFiles(uploadedKeys);
    throw err;
  }

  const description = data.description?.trim() ? data.description.trim() : null;
  const category = data.category?.trim() ? data.category.trim() : null;

  try {
    await sequelize.transaction(async (transaction) => {
      await Receipt.bulkCreate(
        uploadedKeys.map((key) => ({
          fk_user: userId,
          fk_daily_balance: balance.pk_daily_balance,
          file_key: key,
          type: data.type,
          date: balance.date,
          description,
          category,
        })),
        { transaction },
      );
    });
  } catch (err) {
    // Roll back the R2 objects when the database transaction fails.
    await rollbackUploadedFiles(uploadedKeys);
    throw err;
  }
}

/**
 * Returns every receipt for the given calendar day (ownership enforced through
 * the `fk_user` column). Receipts are matched directly against the `date`
 * column, so no daily-balance record is required; when no receipts exist for
 * that day an empty array is returned.
 */
export async function getReceiptsByDay(
  userId: number,
  date: string,
): Promise<ReceiptDTO[]> {
  const order: Order = [
    ['created_at', 'ASC'],
    ['pk_receipts', 'ASC'],
  ];

  const receipts = await Receipt.findAll({
    where: { date, fk_user: userId },
    order,
  });

  return Promise.all(receipts.map(toDTO));
}

/**
 * Generates a temporary presigned download URL for a receipt. The
 * `ResponseContentDisposition` header instructs R2 to force an attachment
 * download (instead of rendering the file inline in the browser).
 */
export async function getReceiptDownloadUrl(
  userId: number,
  receiptId: number,
): Promise<string> {
  const receipt = await findOwnedReceipt(userId, receiptId);

  return createPresignedDownloadUrl(receipt.file_key, {
    expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
    responseContentDisposition: `attachment; filename="${buildReceiptFilename(receipt)}"`,
  });
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
