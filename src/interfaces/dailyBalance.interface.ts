import { z } from 'zod';
import {
  closeDailyBalanceSchema,
  createDailyBalanceSchema,
  dailyBalanceIdParamSchema,
  getDailyBalancesQuerySchema,
  getMonthlyBalancesQuerySchema,
  getRecentDailyBalancesQuerySchema,
  getYearlyBalancesQuerySchema,
} from '../validations/dailyBalance.validation';

export type CreateDailyBalanceInput = z.infer<typeof createDailyBalanceSchema>;
export type CloseDailyBalanceInput = z.infer<typeof closeDailyBalanceSchema>;
export type DailyBalanceIdParam = z.infer<typeof dailyBalanceIdParamSchema>;
export type GetDailyBalancesQuery = z.infer<typeof getDailyBalancesQuerySchema>;
export type GetMonthlyBalancesQuery = z.infer<typeof getMonthlyBalancesQuerySchema>;
export type GetRecentDailyBalancesQuery = z.infer<
  typeof getRecentDailyBalancesQuerySchema
>;
export type GetYearlyBalancesQuery = z.infer<typeof getYearlyBalancesQuerySchema>;

/**
 * Serialized representation returned to API consumers. Maps the snake_case
 * database columns to camelCase and normalizes `DECIMAL` strings to numbers.
 */
export interface DailyBalanceDTO {
  id: number;
  userId: number;
  date: string;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Serialized monthly summary returned by `GET /daily-balances/monthly`.
 *
 * Aggregates many `daily_balances` rows for a single (year, month) pair. Since
 * a summary has no primary key of its own, `id` is a deterministic synthetic
 * identifier shaped as `MMYYYY` (e.g. October 2026 -> 102026).
 *
 * - `openingBalance`: `opening_balance` of the chronologically first record in
 *   the month.
 * - `closingBalance`: `closing_balance` of the chronologically latest record in
 *   the month that has a non-null `closing_balance`.
 */
export interface MonthlyBalanceSummaryDTO {
  id: number;
  userId: number;
  year: number;
  month: number;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

/**
 * Serialized yearly summary returned by `GET /daily-balances/yearly`.
 *
 * Aggregates many `daily_balances` rows for a single year. Since a summary has
 * no primary key of its own, `id` is the aggregated year itself (e.g. 2026),
 * which is unique per user and keeps the response stable.
 *
 * - `openingBalance`: `opening_balance` of the chronologically first record in
 *   the year.
 * - `closingBalance`: `closing_balance` of the chronologically latest record in
 *   the year that has a non-null `closing_balance`.
 */
export interface YearlyBalanceSummaryDTO {
  id: number;
  userId: number;
  year: number;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}
