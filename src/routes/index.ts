import { Router } from 'express';
import authRoutes from './auth.routes';
import dailyBalanceRoutes from './dailyBalance.routes';
import receiptRoutes from './receipt.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/daily-balances', dailyBalanceRoutes);
router.use('/receipts', receiptRoutes);

export default router;
