/**
 * Pure money/currency helpers used across the financial domain.
 *
 * All monetary columns in the database use `DECIMAL(12, 2)`. To avoid
 * JavaScript floating-point drift (e.g. `0.1 + 0.2 === 0.30000000000000004`),
 * every monetary operation is rounded to two decimal places.
 */

export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Sequelize returns PostgreSQL `DECIMAL` columns as strings. Normalize a
 * stored value to a `number` so it can be used in arithmetic/comparisons.
 */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export interface BalanceTotals {
  totalIncome: number;
  totalExpenses: number;
}

/**
 * Domain rule for a closed shift/day:
 *
 * - Profit/income case (`closing >= opening`): income is the difference,
 *   expenses are 0.
 * - Loss/expense case (`closing < opening`): expenses are the difference,
 *   income is 0.
 */
export function computeTotals(
  openingBalance: number,
  closingBalance: number,
): BalanceTotals {
  const opening = roundToCents(openingBalance);
  const closing = roundToCents(closingBalance);

  if (closing >= opening) {
    return {
      totalIncome: roundToCents(closing - opening),
      totalExpenses: 0,
    };
  }

  return {
    totalIncome: 0,
    totalExpenses: roundToCents(opening - closing),
  };
}
