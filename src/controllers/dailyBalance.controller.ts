import { type Request, type Response } from 'express';
import type {
  CloseDailyBalanceInput,
  CreateDailyBalanceInput,
  DailyBalanceIdParam,
  ListDailyBalancesQuery,
} from '../interfaces/dailyBalance.interface';
import {
  closeDailyBalance,
  createDailyBalance,
  deleteDailyBalance,
  getDailyBalance,
  listDailyBalances,
} from '../services/dailyBalance.service';
import { asyncHandler } from '../utils/asyncHandler';

export const createDailyBalanceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const balance = await createDailyBalance(
      req.user!.pk_user,
      req.body as CreateDailyBalanceInput,
    );

    res.status(201).json({ status: 'success', data: balance });
  },
);

export const closeDailyBalanceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as unknown as DailyBalanceIdParam;
    const balance = await closeDailyBalance(
      req.user!.pk_user,
      id,
      req.body as CloseDailyBalanceInput,
    );

    res.status(200).json({ status: 'success', data: balance });
  },
);

export const listDailyBalancesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const balances = await listDailyBalances(
      req.user!.pk_user,
      req.query as unknown as ListDailyBalancesQuery,
    );

    res.status(200).json({ status: 'success', data: balances });
  },
);

export const getDailyBalanceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as unknown as DailyBalanceIdParam;
    const balance = await getDailyBalance(req.user!.pk_user, id);

    res.status(200).json({ status: 'success', data: balance });
  },
);

export const deleteDailyBalanceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as unknown as DailyBalanceIdParam;
    await deleteDailyBalance(req.user!.pk_user, id);

    res.status(200).json({
      status: 'success',
      data: { message: 'Daily balance deleted successfully' },
    });
  },
);
