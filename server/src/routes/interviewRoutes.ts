import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  startInterview,
  getInterviewById,
  getInterviewByCustomer,
  saveProgress,
  completeInterview,
} from '../controllers/interviewController.js';

const router = Router();

// All interview endpoints require authenticated session
router.post('/start', authenticateToken, startInterview);
router.get('/:id', authenticateToken, getInterviewById);
router.get('/customer/:customerId', authenticateToken, getInterviewByCustomer);
router.put('/:id/progress', authenticateToken, saveProgress);
router.post('/:id/complete', authenticateToken, completeInterview);

export default router;
