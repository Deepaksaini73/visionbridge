import { Router } from 'express';
import {
  getAiServiceHealth,
  getAiCapabilities,
  validateImageWithAiService,
} from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public health and capabilities queries
router.get('/health', getAiServiceHealth);
router.get('/status', getAiServiceHealth);
router.get('/capabilities', getAiCapabilities);

// Protected image validation proxy (requires authenticated session)
router.post('/validate-image', authenticateToken, validateImageWithAiService);

export default router;
