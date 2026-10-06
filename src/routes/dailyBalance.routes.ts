import { Router } from 'express';
import {
  closeDailyBalanceHandler,
  createDailyBalanceHandler,
  deleteDailyBalanceHandler,
  getDailyBalancesHandler,
  getRecentDailyBalancesHandler,
} from '../controllers/dailyBalance.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  closeDailyBalanceSchema,
  createDailyBalanceSchema,
  dailyBalanceIdParamSchema,
  getDailyBalancesQuerySchema,
  getRecentDailyBalancesQuerySchema,
} from '../validations/dailyBalance.validation';

const router = Router();

// Open a new daily balance entry for the authenticated user.
router.post(
  '/',
  requireAuth,
  validate(createDailyBalanceSchema),
  createDailyBalanceHandler,
);

// Close a shift / update a balance entry (both `/close` and `/:id` are supported).
router.patch(
  '/:id/close',
  requireAuth,
  validate(dailyBalanceIdParamSchema, 'params'),
  validate(closeDailyBalanceSchema),
  closeDailyBalanceHandler,
);

router.patch(
  '/:id',
  requireAuth,
  validate(dailyBalanceIdParamSchema, 'params'),
  validate(closeDailyBalanceSchema),
  closeDailyBalanceHandler,
);

// Query a daily balance by date (?date=YYYY-MM-DD) or list the authenticated
// user's balances (with optional startDate/endDate/page/limit filters).
router.get(
  '/',
  requireAuth,
  validate(getDailyBalancesQuerySchema, 'query'),
  getDailyBalancesHandler,
);

// Fetch the authenticated user's most recent daily balances (ordered by date
// DESC, limited to an optional dynamic `limit` — default 14, capped at 100).
// Declared before any `/:id` route so the static segment `recent` is never
// captured as a numeric id.
router.get(
  '/recent',
  requireAuth,
  validate(getRecentDailyBalancesQuerySchema, 'query'),
  getRecentDailyBalancesHandler,
);

// Delete a daily balance by ID (ownership enforced).
router.delete(
  '/:id',
  requireAuth,
  validate(dailyBalanceIdParamSchema, 'params'),
  deleteDailyBalanceHandler,
);

export default router;
