import { Router } from 'express';
import { getHabits, createHabit, updateHabit, trackHabit } from '../controllers/habitController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateCreateHabit, validateTrackHabit } from '../validations/habitValidation.js';

const router = Router();
router.use(protect);

router.get('/',             getHabits);
router.post('/',            validateCreateHabit, createHabit);
router.put('/:id',          updateHabit);
router.post('/:id/track',   validateTrackHabit,  trackHabit);

export default router;
