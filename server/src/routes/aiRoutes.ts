import { Router } from 'express';
import {
  getAiServiceHealth,
  getAiCapabilities,
  validateImageWithAiService,
  getEyeAnalysisStatus,
  checkEyeQuality,
  segmentEyeAnatomy,
  analyzeEyePhotograph,
  getAdnexalStatus,
  analyzeAdnexalAlignment,
} from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public health and capabilities queries
router.get('/health', getAiServiceHealth);
router.get('/status', getAiServiceHealth);
router.get('/capabilities', getAiCapabilities);
router.get('/eye-analysis/status', getEyeAnalysisStatus);
router.get('/adnexal/status', getAdnexalStatus);

// Protected image validation proxy (requires authenticated session)
router.post('/validate-image', authenticateToken, validateImageWithAiService);

// Protected EyeCapture AI endpoints
router.post('/eye-analysis/quality-check', authenticateToken, checkEyeQuality);
router.post('/eye-analysis/segment', authenticateToken, segmentEyeAnatomy);
router.post('/eye-analysis/analyze', authenticateToken, analyzeEyePhotograph);

// Protected Milestone 5.2B Adnexal Telemetry endpoint
router.post('/adnexal/analyze', authenticateToken, analyzeAdnexalAlignment);

export default router;
