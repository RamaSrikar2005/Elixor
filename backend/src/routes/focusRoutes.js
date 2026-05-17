import { Router } from 'express';
import { startSession, endSession, getStats } from '../controllers/focusController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);

router.post('/start',    startSession);
router.post('/:id/end',  endSession);
router.get('/stats',     getStats);

export default router;
