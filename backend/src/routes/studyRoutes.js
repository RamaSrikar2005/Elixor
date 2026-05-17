import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/studyController.js';

const router = Router();
router.use(protect);

// Subjects
router.get('/subjects',          ctrl.listSubjects);
router.post('/subjects',         ctrl.createSubject);
router.put('/subjects/:id',      ctrl.updateSubject);
router.delete('/subjects/:id',   ctrl.deleteSubject);

// Sessions
router.post('/sessions/start',   ctrl.startSession);
router.post('/sessions/:id/end', ctrl.endSession);
router.get('/sessions',          ctrl.getHistory);

// Stats
router.get('/stats',             ctrl.getStats);

export default router;
