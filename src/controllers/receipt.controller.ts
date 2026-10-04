import { type Request, type Response } from 'express';

import type {
  CreateReceiptsInput,
  DownloadReceiptQuery,
  ReceiptIdParam,
  ReceiptsByDailyBalanceParam,
} from '../interfaces/receipt.interface';
import {
  deleteReceipt,
  getReceiptFileStreamOrBuffer,
  getReceiptFileUrl,
  getReceiptsByDailyBalance,
  uploadReceipts,
} from '../services/receipt.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const uploadReceiptsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new AppError('No files were provided for upload.', 400);
    }

    await uploadReceipts(
      req.user!.pk_user,
      req.user!.email,
      files,
      req.body as CreateReceiptsInput,
    );

    const uploadedCount = files.length;

    res.status(201).json({
      status: 'success',
      message: `${uploadedCount} receipts uploaded successfully`,
      data: { count: uploadedCount },
    });
  },
);

export const getReceiptsByDayHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { dailyBalanceId } = req.params as unknown as ReceiptsByDailyBalanceParam;
    const receipts = await getReceiptsByDailyBalance(req.user!.pk_user, dailyBalanceId);

    res.status(200).json({ status: 'success', data: receipts });
  },
);

export const viewReceiptHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as ReceiptIdParam;
  const url = await getReceiptFileUrl(req.user!.pk_user, id);

  res.redirect(url);
});

export const downloadReceiptHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ReceiptIdParam;
    const { format } = req.query as unknown as DownloadReceiptQuery;
    const file = await getReceiptFileStreamOrBuffer(req.user!.pk_user, id, format);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  },
);

export const deleteReceiptHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as ReceiptIdParam;
  await deleteReceipt(req.user!.pk_user, id);

  res.status(204).send();
});
