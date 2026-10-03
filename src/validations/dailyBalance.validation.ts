import { z } from 'zod';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
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

export const listDailyBalancesQuerySchema = z
  .object({
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
