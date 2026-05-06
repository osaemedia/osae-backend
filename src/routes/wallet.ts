import { Router } from 'express';
import {
  getBalance,
  setPin,
  transfer,
  getTransactions,
  deposit,
  withdraw,
} from '../controllers/walletController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/balance', authenticate, getBalance);
router.post('/set-pin', authenticate, setPin);
router.post('/transfer', authenticate, transfer);
router.get('/transactions', authenticate, getTransactions);
router.post('/deposit', authenticate, deposit);
router.post('/withdraw', authenticate, withdraw);

export default router;