import { Router } from 'express';
import { dashboard } from '../controllers/analyticsController.js';
import { protect }   from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/dashboard', dashboard);

export default router;
