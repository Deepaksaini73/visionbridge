import { Router } from 'express';
import { getReviewQueue, submitReviewDecision } from '../controllers/reviewController.js';

const router = Router();

router.get('/queue', getReviewQueue);
router.post('/:caseId/decision', submitReviewDecision);

export default router;

