import { Router } from 'express';
import { 
  getCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  getCustomerStatus,
  uploadProfilePhoto,
  getProfilePhoto,
  deleteProfilePhoto,
  getCustomerReport,
} from '../controllers/customerController.js';
import { authenticateToken, requireRole, authenticateMedia } from '../middleware/auth.js';

const router = Router();

// Private clinical media streaming for customer photos (strictly requires authenticated session via Bearer, Cookie, or Query Token)
router.get('/:id/photo', authenticateMedia, getProfilePhoto);

// All other customer operations require a verified authenticated session
router.use(authenticateToken);

router.get('/', getCustomers);
router.post('/', requireRole('STORE_OPERATOR', 'ADMIN'), createCustomer);
router.get('/:id', getCustomerById);
router.get('/:id/report', getCustomerReport);
router.patch('/:id', updateCustomer);
router.get('/:id/status', getCustomerStatus);

// Profile Photo upload and delete endpoints
router.post('/:id/photo', requireRole('STORE_OPERATOR', 'ADMIN'), uploadProfilePhoto);
router.delete('/:id/photo', requireRole('STORE_OPERATOR', 'ADMIN'), deleteProfilePhoto);

export default router;
