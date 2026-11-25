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
  getHyperaemiaStatus,
  analyzeHyperaemiaAndPterygium,
  getRetinalStatus,
  analyzeRetinalPhotograph,
  getClarityStatus,
  analyzeCornealLensClarity,
} from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public health and capabilities queries
router.get('/health', getAiServiceHealth);
router.get('/status', getAiServiceHealth);
router.get('/capabilities', getAiCapabilities);
router.get('/eye-analysis/status', getEyeAnalysisStatus);
router.get('/adnexal/status', getAdnexalStatus);
router.get('/hyperaemia/status', getHyperaemiaStatus);
router.get('/retinal/status', getRetinalStatus);
router.get('/clarity/status', getClarityStatus);

// Protected image validation proxy (requires authenticated session)
router.post('/validate-image', authenticateToken, validateImageWithAiService);

// Protected EyeCapture AI endpoints
router.post('/eye-analysis/quality-check', authenticateToken, checkEyeQuality);
router.post('/eye-analysis/segment', authenticateToken, segmentEyeAnatomy);
router.post('/eye-analysis/analyze', authenticateToken, analyzeEyePhotograph);

// Protected Milestone 5.2B Adnexal Telemetry endpoint
router.post('/adnexal/analyze', authenticateToken, analyzeAdnexalAlignment);

// Protected Milestone 5.3 Hyperaemia & Pterygium Telemetry endpoint
router.post('/hyperaemia/analyze', authenticateToken, analyzeHyperaemiaAndPterygium);

// Protected Milestone 5.4 Retinal Foundation AI endpoint
router.post('/retinal/analyze', authenticateToken, analyzeRetinalPhotograph);

// Protected Milestone 5.5 Lens & Corneal Clarity Engine endpoint
router.post('/clarity/analyze', authenticateToken, analyzeCornealLensClarity);

export default router;
