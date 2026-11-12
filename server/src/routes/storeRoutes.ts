import { Router } from 'express';
import { getStores, createStore } from '../controllers/storeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Store list is accessible for public registration and authenticated dashboards
router.get('/', getStores);

// Store creation is strictly restricted to authenticated administrators
router.post('/', authenticateToken, requireRole('ADMIN'), createStore);

export default router;
