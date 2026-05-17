import { Router } from 'express';
import { chatJSON, chatStreamHandler, getHistory, clearHistory } from '../controllers/aiController.js';
import { protect }   from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.use(protect);

router.post('/chat',         aiLimiter, chatJSON);
router.post('/chat/stream',  aiLimiter, chatStreamHandler);
router.get('/history',       getHistory);
router.delete('/history',    clearHistory);

export default router;
