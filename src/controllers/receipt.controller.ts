import { type Request, type Response } from 'express';

import type {
  CreateReceiptsInput,
  GetReceiptsByDayQuery,
  GetReceiptsByDayResponse,
  PaginationMeta,
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
    const query = req.query as unknown as GetReceiptsByDayQuery;
    const { receipts, totalItems } = await getReceiptsByDay(req.user!.pk_user, query);

    const totalPages = Math.ceil(totalItems / query.limit);
    const pagination: PaginationMeta = {
      totalItems,
      totalPages,
      currentPage: query.page,
      itemsPerPage: query.limit,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    };

    const data: GetReceiptsByDayResponse = {
      date: query.date,
      ...(query.type ? { type: query.type } : {}),
      receipts,
      pagination,
    };

    res.status(200).json({
      status: 'success',
      message: 'Receipts retrieved successfully',
      data,
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
