import { Router } from 'express';
import {
  changePasswordHandler,
  deleteAccountHandler,
} from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  changePasswordSchema,
  deleteAccountSchema,
} from '../validations/user.validation';

const router = Router();

router.patch(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  changePasswordHandler,
);

router.delete('/me', requireAuth, validate(deleteAccountSchema), deleteAccountHandler);

export default router;
