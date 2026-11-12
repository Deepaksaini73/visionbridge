import { Router } from 'express';
import { getUsers, createUser, updateUserStatus } from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// User management endpoints strictly restricted to ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/status', updateUserStatus);

export default router;

