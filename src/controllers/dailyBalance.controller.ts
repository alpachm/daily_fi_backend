import { type Request, type Response } from 'express';
import type {
  CloseDailyBalanceInput,
  CreateDailyBalanceInput,
  DailyBalanceIdParam,
  GetDailyBalancesQuery,
  GetMonthlyBalancesQuery,
  GetRecentDailyBalancesQuery,
} from '../interfaces/dailyBalance.interface';
import {
  closeDailyBalance,
  createDailyBalance,
  deleteDailyBalance,
  getDailyBalance,
  getMonthlyBalanceSummaries,
  getRecentDailyBalances,
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

export const getDailyBalancesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as GetDailyBalancesQuery;

    // date discriminates between a single-record lookup and a list: when the
    // client provides ?date=YYYY-MM-DD we return the one balance for that day,
    // otherwise we return the paginated/filtered collection.
    if (query.date) {
      const balance = await getDailyBalance(req.user!.pk_user, query.date);
      res.status(200).json({ status: 'success', data: balance });
      return;
    }

    const balances = await listDailyBalances(req.user!.pk_user, query);
    res.status(200).json({ status: 'success', data: balances });
  },
);

export const getRecentDailyBalancesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as GetRecentDailyBalancesQuery;
    const balances = await getRecentDailyBalances(req.user!.pk_user, query.limit);
    res.status(200).json({ status: 'success', data: balances });
  },
);

export const getMonthlyBalancesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as GetMonthlyBalancesQuery;
    const summaries = await getMonthlyBalanceSummaries(req.user!.pk_user, query);
    res.status(200).json({ status: 'success', data: summaries });
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
