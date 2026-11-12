import { Router } from 'express';
import {
  uploadEyeImage,
  getCustomerEyeImages,
  getEyeImageById,
  streamEyeImageFile,
  reviewEyeImage,
  deleteEyeImage,
} from '../controllers/imageController.js';
import { authenticateToken, requireRole, authenticateMedia } from '../middleware/auth.js';

const router = Router();

// Private clinical media streaming for ocular eye photographs (strictly requires authenticated session via Bearer, Cookie, or Query Token)
router.get('/:id/file', authenticateMedia, streamEyeImageFile);

// All other image operations require authentication
router.use(authenticateToken);

router.post('/upload', requireRole('STORE_OPERATOR', 'ADMIN'), uploadEyeImage);
router.get('/customer/:customerId', getCustomerEyeImages);
router.get('/:id', getEyeImageById);
router.post('/:id/review', requireRole('OPTOMETRIST', 'ADMIN'), reviewEyeImage);
router.delete('/:id', requireRole('STORE_OPERATOR', 'ADMIN'), deleteEyeImage);

export default router;
