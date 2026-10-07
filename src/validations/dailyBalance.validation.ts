import { z } from 'zod';

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCalendarDate(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * A calendar date in `YYYY-MM-DD` format (matches the `DATEONLY` column type).
 */
export const dateOnlySchema = z
  .string()
  .trim()
  .regex(DATE_ONLY_REGEX, 'Date must use the YYYY-MM-DD format')
  .refine(isValidCalendarDate, 'Invalid calendar date');

export const openingBalanceSchema = z
  .number()
  .min(0, 'Opening balance must be greater than or equal to 0');

export const closingBalanceSchema = z
  .number()
  .min(0, 'Closing balance must be greater than or equal to 0');

export const createDailyBalanceSchema = z.object({
  date: dateOnlySchema,
  opening_balance: openingBalanceSchema,
});

export const closeDailyBalanceSchema = z.object({
  closing_balance: closingBalanceSchema,
  opening_balance: openingBalanceSchema.optional(),
});

export const dailyBalanceIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int('ID must be an integer')
    .positive('ID must be a positive integer'),
});

/**
 * Query parameters for the GET /daily-balances collection endpoint.
 *
 * - date (optional): when present, returns the single balance for that day
 *   instead of a paginated list. Must be a valid YYYY-MM-DD calendar date.
 * - startDate / endDate (optional): inclusive range used when listing.
 * - page / limit (optional): pagination controls for the list response.
 */
export const getDailyBalancesQuerySchema = z
  .object({
    date: dateOnlySchema.optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must be at most 100')
      .optional(),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: 'startDate must be on or before endDate', path: ['startDate'] },
  );

export const RECENT_DAILY_BALANCES_DEFAULT_LIMIT = 14;
export const RECENT_DAILY_BALANCES_MAX_LIMIT = 100;

/**
 * Query parameters for the GET /daily-balances/recent endpoint.
 *
 * - limit (optional): maximum number of records to return. Falls back to 14
 *   when absent or invalid (non-numeric, non-integer or <= 0) and is capped at
 *   100 to prevent database overload. Invalid values never surface as a 400/500:
 *   they are coerced back to the default limit instead.
 */
export const getRecentDailyBalancesQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .catch(RECENT_DAILY_BALANCES_DEFAULT_LIMIT)
    .transform((limit) => Math.min(limit, RECENT_DAILY_BALANCES_MAX_LIMIT)),
});

export const MONTHLY_BALANCES_DEFAULT_PAGE = 1;
export const MONTHLY_BALANCES_DEFAULT_LIMIT = 12;

/**
 * Query parameters for the GET /daily-balances/monthly endpoint.
 *
 * - startDate / endDate (optional): inclusive range (YYYY-MM-DD).
 * - page (optional): 1-based page number. Falls back to 1 when absent.
 * - limit (optional): monthly summaries per page. Falls back to 12 when absent
 *   and is capped at 100 to keep the query bounded.
 */
export const getMonthlyBalancesQuerySchema = z
  .object({
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    page: z.coerce
      .number()
      .int()
      .min(1, 'Page must be at least 1')
      .default(MONTHLY_BALANCES_DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must be at most 100')
      .default(MONTHLY_BALANCES_DEFAULT_LIMIT),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: 'startDate must be on or before endDate', path: ['startDate'] },
  );

export const YEARLY_BALANCES_DEFAULT_PAGE = 1;
export const YEARLY_BALANCES_DEFAULT_LIMIT = 10;

/**
 * Query parameters for the GET /daily-balances/yearly endpoint.
 *
 * - page (optional): 1-based page number. Falls back to 1 when absent.
 * - limit (optional): yearly summaries per page. Falls back to 10 when absent
 *   and is capped at 100 to keep the query bounded.
 */
export const getYearlyBalancesQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .default(YEARLY_BALANCES_DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(YEARLY_BALANCES_DEFAULT_LIMIT),
});
