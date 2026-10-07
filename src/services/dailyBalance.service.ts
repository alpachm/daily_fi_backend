import {
  col,
  fn,
  literal,
  Op,
  type InferAttributes,
  type Order,
  type WhereOptions,
} from 'sequelize';
import type {
  CloseDailyBalanceInput,
  CreateDailyBalanceInput,
  DailyBalanceDTO,
  GetDailyBalancesQuery,
  GetMonthlyBalancesQuery,
  GetYearlyBalancesQuery,
  MonthlyBalanceSummaryDTO,
  YearlyBalanceSummaryDTO,
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
    ['date', 'DESC'],
    ['pk_daily_balance', 'DESC'],
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

/**
 * Returns the authenticated user's most recent daily balances.
 *
 * Unlike `listDailyBalances`, this query is NOT date-range based: it orders the
 * user's records by `date` descending (with `pk_daily_balance` as a deterministic
 * tie-breaker) and applies a dynamic `LIMIT` (already validated/capped by the
 * controller's query schema, defaulting to 14 and never exceeding 100), so it
 * always returns the latest records regardless of how far back they go. The
 * result is returned newest-first (`data[0]` is the most recent date), matching
 * the ordering of the list endpoint.
 */
export async function getRecentDailyBalances(
  userId: number,
  limit: number,
): Promise<DailyBalanceDTO[]> {
  const order: Order = [
    ['date', 'DESC'],
    ['pk_daily_balance', 'DESC'],
  ];

  const balances = await DailyBalance.findAll({
    where: { fk_user: userId },
    order,
    limit,
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

type MonthlyAggregateRow = {
  year: string | number;
  month: string | number;
  openingBalance: string | number | null;
  closingBalance: string | number | null;
  totalIncome: string | number | null;
  totalExpenses: string | number | null;
};

/**
 * Derives a deterministic synthetic id for a (year, month) summary.
 *
 * A monthly summary aggregates several `daily_balances` rows, so it has no
 * single primary key of its own. To keep the response stable and unique per
 * month we build a composite id in `MMYYYY` shape (e.g. October 2026 -> 102026).
 */
function buildMonthlySummaryId(year: number, month: number): number {
  return month * 10000 + year;
}

/**
 * Aggregates the authenticated user's daily balances into monthly summaries.
 *
 * Records are filtered strictly by the owner (`fk_user = userId`) plus any
 * optional inclusive `startDate`/`endDate` range, then grouped by year and
 * month. Each group exposes `totalIncome` (`SUM(total_income)`),
 * `totalExpenses` (`SUM(total_expenses)`) and `netProfit` (the rounded
 * difference), plus `openingBalance` (the first record's `opening_balance`) and
 * `closingBalance` (the latest record's non-null `closing_balance`). Results
 * are ordered newest-first (`ORDER BY year DESC, month DESC`) and paginated
 * with `page`/`limit`.
 */
export async function getMonthlyBalanceSummaries(
  userId: number,
  query: GetMonthlyBalancesQuery,
): Promise<MonthlyBalanceSummaryDTO[]> {
  const where: WhereOptions<DailyBalanceAttributes> = { fk_user: userId };

  if (query.startDate && query.endDate) {
    where.date = { [Op.between]: [query.startDate, query.endDate] };
  } else if (query.startDate) {
    where.date = { [Op.gte]: query.startDate };
  } else if (query.endDate) {
    where.date = { [Op.lte]: query.endDate };
  }

  const yearExpr = fn('EXTRACT', literal('YEAR FROM "date"'));
  const monthExpr = fn('EXTRACT', literal('MONTH FROM "date"'));

  // First chronologically ordered record within the group.
  const openingBalanceExpr = literal(
    '(array_agg("opening_balance" ORDER BY "date" ASC))[1]',
  );
  // Latest chronologically ordered record within the group that still has a
  // non-null `closing_balance`.
  const closingBalanceExpr = literal(
    '(array_agg("closing_balance" ORDER BY "date" DESC) FILTER (WHERE "closing_balance" IS NOT NULL))[1]',
  );

  const limit = query.limit;
  const offset = (query.page - 1) * limit;

  const rows = (await DailyBalance.findAll({
    attributes: [
      [yearExpr, 'year'],
      [monthExpr, 'month'],
      [openingBalanceExpr, 'openingBalance'],
      [closingBalanceExpr, 'closingBalance'],
      [fn('SUM', col('total_income')), 'totalIncome'],
      [fn('SUM', col('total_expenses')), 'totalExpenses'],
    ],
    where,
    group: [yearExpr, monthExpr],
    order: [
      [yearExpr, 'DESC'],
      [monthExpr, 'DESC'],
    ],
    limit,
    offset,
    raw: true,
  })) as unknown as MonthlyAggregateRow[];

  return rows.map((row) => {
    const year = Math.round(toNumber(row.year));
    const month = Math.round(toNumber(row.month));
    const openingBalance = roundToCents(toNumber(row.openingBalance));
    const closingBalance = roundToCents(toNumber(row.closingBalance));
    const totalIncome = roundToCents(toNumber(row.totalIncome));
    const totalExpenses = roundToCents(toNumber(row.totalExpenses));

    return {
      id: buildMonthlySummaryId(year, month),
      userId,
      year,
      month,
      openingBalance,
      closingBalance,
      totalIncome,
      totalExpenses,
      netProfit: roundToCents(totalIncome - totalExpenses),
    };
  });
}

type YearlyAggregateRow = {
  year: string | number;
  openingBalance: string | number | null;
  closingBalance: string | number | null;
  totalIncome: string | number | null;
  totalExpenses: string | number | null;
};

/**
 * Aggregates the authenticated user's daily balances into yearly summaries.
 *
 * Records are filtered strictly by the owner (`fk_user = userId`), grouped by
 * year, and each group exposes `totalIncome` (`SUM(total_income)`),
 * `totalExpenses` (`SUM(total_expenses)`) and `netProfit` (the rounded
 * difference), plus `openingBalance` (the first record's `opening_balance`) and
 * `closingBalance` (the latest record's non-null `closing_balance`). Results
 * are ordered newest-first (`ORDER BY year DESC`) and paginated with
 * `page`/`limit`.
 */
export async function getYearlyBalanceSummaries(
  userId: number,
  query: GetYearlyBalancesQuery,
): Promise<YearlyBalanceSummaryDTO[]> {
  const where: WhereOptions<DailyBalanceAttributes> = { fk_user: userId };

  const yearExpr = fn('EXTRACT', literal('YEAR FROM "date"'));

  // First chronologically ordered record within the group.
  const openingBalanceExpr = literal(
    '(array_agg("opening_balance" ORDER BY "date" ASC))[1]',
  );
  // Latest chronologically ordered record within the group that still has a
  // non-null `closing_balance`.
  const closingBalanceExpr = literal(
    '(array_agg("closing_balance" ORDER BY "date" DESC) FILTER (WHERE "closing_balance" IS NOT NULL))[1]',
  );

  const limit = query.limit;
  const offset = (query.page - 1) * limit;

  const rows = (await DailyBalance.findAll({
    attributes: [
      [yearExpr, 'year'],
      [openingBalanceExpr, 'openingBalance'],
      [closingBalanceExpr, 'closingBalance'],
      [fn('SUM', col('total_income')), 'totalIncome'],
      [fn('SUM', col('total_expenses')), 'totalExpenses'],
    ],
    where,
    group: [yearExpr],
    order: [[yearExpr, 'DESC']],
    limit,
    offset,
    raw: true,
  })) as unknown as YearlyAggregateRow[];

  return rows.map((row) => {
    const year = Math.round(toNumber(row.year));
    const openingBalance = roundToCents(toNumber(row.openingBalance));
    const closingBalance = roundToCents(toNumber(row.closingBalance));
    const totalIncome = roundToCents(toNumber(row.totalIncome));
    const totalExpenses = roundToCents(toNumber(row.totalExpenses));

    return {
      id: year,
      userId,
      year,
      openingBalance,
      closingBalance,
      totalIncome,
      totalExpenses,
      netProfit: roundToCents(totalIncome - totalExpenses),
    };
  });
}
