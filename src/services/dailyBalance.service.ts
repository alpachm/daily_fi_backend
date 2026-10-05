import { Op, type InferAttributes, type Order, type WhereOptions } from 'sequelize';
import type {
  CloseDailyBalanceInput,
  CreateDailyBalanceInput,
  DailyBalanceDTO,
  GetDailyBalancesQuery,
} from '../interfaces/dailyBalance.interface';
import { DailyBalance } from '../models';
import { AppError } from '../utils/AppError';
import { computeTotals, roundToCents, toNumber } from '../utils/money';

type DailyBalanceAttributes = InferAttributes<DailyBalance>;

function toDTO(balance: DailyBalance): DailyBalanceDTO {
  return {
    id: balance.pk_daily_balance,
    userId: balance.fk_user,
    date: balance.date,
    openingBalance: toNumber(balance.opening_balance),
    closingBalance: toNumber(balance.closing_balance),
    totalIncome: toNumber(balance.total_income),
    totalExpenses: toNumber(balance.total_expenses),
    notes: balance.notes,
    createdAt: balance.created_at,
    updatedAt: balance.updated_at,
  };
}

/**
 * Finds a daily balance by primary key and enforces ownership: 404 when the
 * record does not exist, 403 when it belongs to another user.
 */
async function findOwnedBalance(
  userId: number,
  id: number,
): Promise<DailyBalance> {
  const balance = await DailyBalance.findByPk(id);

  if (!balance) {
    throw new AppError('Daily balance not found', 404);
  }

  if (balance.fk_user !== userId) {
    throw new AppError('You are not authorized to access this daily balance', 403);
  }

  return balance;
}

export async function createDailyBalance(
  userId: number,
  input: CreateDailyBalanceInput,
): Promise<DailyBalanceDTO> {
  // A user cannot have two open shifts on the same date.
  const existing = await DailyBalance.findOne({
    where: { fk_user: userId, date: input.date },
  });

  if (existing) {
    throw new AppError(
      'A daily balance already exists for this date. Close the current shift first.',
      409,
    );
  }

  const balance = await DailyBalance.create({
    fk_user: userId,
    date: input.date,
    opening_balance: roundToCents(input.opening_balance),
    closing_balance: 0,
    total_income: 0,
    total_expenses: 0,
  });

  return toDTO(balance);
}

export async function closeDailyBalance(
  userId: number,
  id: number,
  input: CloseDailyBalanceInput,
): Promise<DailyBalanceDTO> {
  const balance = await findOwnedBalance(userId, id);

  const openingBalance = roundToCents(
    input.opening_balance ?? toNumber(balance.opening_balance),
  );
  const closingBalance = roundToCents(input.closing_balance);
  const { totalIncome, totalExpenses } = computeTotals(openingBalance, closingBalance);

  await balance.update({
    opening_balance: openingBalance,
    closing_balance: closingBalance,
    total_income: totalIncome,
    total_expenses: totalExpenses,
  });

  // Re-read from the database so `updated_at` (and any DECIMAL values) reflect
  // what was actually persisted rather than Sequelize's in-memory literal.
  await balance.reload();

  return toDTO(balance);
}

export async function listDailyBalances(
  userId: number,
  query: GetDailyBalancesQuery,
): Promise<DailyBalanceDTO[]> {
  const where: WhereOptions<DailyBalanceAttributes> = { fk_user: userId };

  if (query.startDate && query.endDate) {
    where.date = { [Op.between]: [query.startDate, query.endDate] };
  } else if (query.startDate) {
    where.date = { [Op.gte]: query.startDate };
  } else if (query.endDate) {
    where.date = { [Op.lte]: query.endDate };
  }

  const order: Order = [
    ['date', 'ASC'],
    ['pk_daily_balance', 'ASC'],
  ];

  // Always bound the query: fall back to a hard default page size of 100 when
  // no `limit` is supplied, so a list request can never execute unbounded.
  const limit = query.limit ?? 100;
  const offset = ((query.page ?? 1) - 1) * limit;

  const balances = await DailyBalance.findAll({
    where,
    order,
    limit,
    offset,
  });

  return balances.map(toDTO);
}

export async function getDailyBalance(
  userId: number,
  date: string,
): Promise<DailyBalanceDTO> {
  // Filter strictly by the authenticated user ID and the requested date so a
  // request can never resolve (or leak) another user's balance. A record that
  // does not belong to the caller simply does not match the filter and is
  // reported as 404, preserving the previous lookup's "not found" contract
  // without disclosing whether the date exists for a different user.
  const balance = await DailyBalance.findOne({
    where: { fk_user: userId, date },
  });

  if (!balance) {
    throw new AppError('Daily balance not found', 404);
  }

  return toDTO(balance);
}

export async function deleteDailyBalance(userId: number, id: number): Promise<void> {
  const balance = await findOwnedBalance(userId, id);
  await balance.destroy();
}
