import { Router } from 'express';
import { syncBatchRecords } from '../controllers/syncController.js';

const router = Router();

router.post('/batch', syncBatchRecords);

export default router;

