import { Router } from 'express';
import { register, login, logout, refresh, getMe, sendOtp, verifyOtp } from '../controllers/authController.js';
import { protect }     from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRegister, validateLogin } from '../validations/authValidation.js';

const router = Router();

router.post('/register',    authLimiter, validateRegister, register);
router.post('/login',       authLimiter, validateLogin,    login);
router.post('/send-otp',    authLimiter, sendOtp);
router.post('/verify-otp',  authLimiter, verifyOtp);
router.post('/logout',      protect, logout);
router.post('/refresh',     refresh);
router.get('/me',           protect, getMe);

export default router;
