import { type Request, type Response } from 'express';

import type {
  CreateReceiptsInput,
  GetReceiptsByDayQuery,
  ReceiptIdParam,
} from '../interfaces/receipt.interface';
import {
  deleteReceipt,
  getReceiptDownloadUrl,
  getReceiptsByDay,
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
    const { date } = req.query as unknown as GetReceiptsByDayQuery;
    const receipts = await getReceiptsByDay(req.user!.pk_user, date);

    res.status(200).json({
      status: 'success',
      message: 'Receipts retrieved successfully',
      data: { date, count: receipts.length, receipts },
    });
  },
);

export const downloadReceiptHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ReceiptIdParam;
    const url = await getReceiptDownloadUrl(req.user!.pk_user, id);

    res.redirect(url);
  },
);

export const deleteReceiptHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as ReceiptIdParam;
  await deleteReceipt(req.user!.pk_user, id);

  res.status(204).send();
});
