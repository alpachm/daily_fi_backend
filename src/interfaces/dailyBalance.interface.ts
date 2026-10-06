import { z } from 'zod';
import {
  closeDailyBalanceSchema,
  createDailyBalanceSchema,
  dailyBalanceIdParamSchema,
  getDailyBalancesQuerySchema,
  getRecentDailyBalancesQuerySchema,
} from '../validations/dailyBalance.validation';

export type CreateDailyBalanceInput = z.infer<typeof createDailyBalanceSchema>;
export type CloseDailyBalanceInput = z.infer<typeof closeDailyBalanceSchema>;
export type DailyBalanceIdParam = z.infer<typeof dailyBalanceIdParamSchema>;
export type GetDailyBalancesQuery = z.infer<typeof getDailyBalancesQuerySchema>;
export type GetRecentDailyBalancesQuery = z.infer<
  typeof getRecentDailyBalancesQuerySchema
>;

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
