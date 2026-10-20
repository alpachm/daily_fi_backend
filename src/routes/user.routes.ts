import { Router } from 'express';
import {
  changePasswordHandler,
  deleteAccountHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validations/user.validation';

const router = Router();

router.patch(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  changePasswordHandler,
);

router.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordHandler);
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler);

router.delete('/me', requireAuth, validate(deleteAccountSchema), deleteAccountHandler);

export default router;
