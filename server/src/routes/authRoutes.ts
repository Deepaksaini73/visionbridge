import { Router } from 'express';
import { 
  login, 
  register, 
  forgotPassword, 
  resetPassword, 
  getMe, 
  logout, 
  getDemoAccounts 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public auth endpoints with brute-force rate limiting
router.post('/login', authRateLimiter, login);
router.post('/register', authRateLimiter, register);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);
router.get('/demo-accounts', getDemoAccounts);

// Protected session endpoints
router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);

export default router;
