import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  startScreening,
  getScreeningById,
  getScreeningsByCustomer,
  saveScreeningProgress,
  completeScreening,
  reviewScreening,
  listScreenings,
  getScreeningPdfReport,
} from '../controllers/screeningController.js';

const router = Router();

// All screening endpoints require authentication
router.use(authenticateToken);

// Screening operations
router.post('/start', startScreening);
router.get('/', listScreenings);
router.get('/customer/:customerId', getScreeningsByCustomer);
router.get('/:id', getScreeningById);
router.put('/:id/progress', saveScreeningProgress);
router.post('/:id/complete', completeScreening);
router.post('/:id/review', reviewScreening);
router.get('/:id/pdf', getScreeningPdfReport);

export default router;
