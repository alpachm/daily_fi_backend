import { Router } from 'express';
import {
  closeDailyBalanceHandler,
  createDailyBalanceHandler,
  deleteDailyBalanceHandler,
  getDailyBalanceHandler,
  listDailyBalancesHandler,
} from '../controllers/dailyBalance.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  closeDailyBalanceSchema,
  createDailyBalanceSchema,
  dailyBalanceIdParamSchema,
  listDailyBalancesQuerySchema,
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

// List all daily balances for the authenticated user (optional filtering).
router.get(
  '/',
  requireAuth,
  validate(listDailyBalancesQuerySchema, 'query'),
  listDailyBalancesHandler,
);

// Get a single daily balance by ID (ownership enforced).
router.get(
  '/:id',
  requireAuth,
  validate(dailyBalanceIdParamSchema, 'params'),
  getDailyBalanceHandler,
);

// Delete a daily balance by ID (ownership enforced).
router.delete(
  '/:id',
  requireAuth,
  validate(dailyBalanceIdParamSchema, 'params'),
  deleteDailyBalanceHandler,
);

export default router;
