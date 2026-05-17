import { Router } from 'express';
import { getTransactions, createTransaction, getAnalytics, deleteTransaction } from '../controllers/financeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateTransaction } from '../validations/financeValidation.js';

const router = Router();
router.use(protect);

router.get('/',            getTransactions);
router.post('/',           validateTransaction, createTransaction);
router.get('/analytics',   getAnalytics);
router.delete('/:id',      deleteTransaction);

export default router;
