import { Request, Response } from 'express';
import path from 'path';
import { z } from 'zod';
import { EyeImage } from '../models/EyeImage.js';
import { IN_MEMORY_EYE_IMAGES } from './imageController.js';
import { isConnectedToDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { fileExists, readStoredImageFile } from '../utils/fileStorage.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';
const REQUEST_TIMEOUT_MS = 6000;

// Structured capabilities fallback when Python service is offline
const CAPABILITIES_CATALOG_FALLBACK = [
  {
    id: "eye_image_quality",
    name: "Eye Image Quality Assessment",
    category: "Pre-Analysis QA",
    status: "IMPLEMENTED",
    description: "Assesses blurriness, illumination uniformity, and focus suitability for anterior segment photos with actionable recapture guidance.",
    planned_milestone: "Milestone 5.1 (Active)"
  },
  {
    id: "eye_detection_localization",
    name: "Eye Detection and Localization",
    category: "Anatomy Localization",
    status: "IMPLEMENTED",
    description: "Detects anterior eye region, limbic boundary, and pupil center via hybrid neural and deterministic CV pipelines.",
    planned_milestone: "Milestone 5.1 (Active)"
  },
  {
    id: "iris_segmentation",
    name: "Iris Segmentation",
    category: "Semantic Segmentation",
    status: "IMPLEMENTED",
    description: "Delineates the outer limbic boundary of the iris for spatial reference and corneal inspection.",
    planned_milestone: "Milestone 5.1 (Active)"
  },
  {
    id: "pupil_segmentation",
    name: "Pupil Segmentation",
    category: "Semantic Segmentation",
    status: "IMPLEMENTED",
    description: "Delineates pupillary margin, pupil center, and computes relative pupillary asymmetry indicators.",
    planned_milestone: "Milestone 5.1 (Active)"
  },
  {
    id: "geometric_eye_analysis",
    name: "Geometric Eye Analysis",
    category: "Quantitative Telemetry",
    status: "IMPLEMENTED",
    description: "Calculates pupil-to-iris diameter ratios, limbal boundary metrics, and coverage percentages.",
    planned_milestone: "Milestone 5.1 (Active)"
  },
  {
    id: "fundus_cup_to_disc",
    name: "Optic Nerve Cup-to-Disc Ratio (Fundus)",
    category: "Posterior Telemetry",
    status: "NOT_IMPLEMENTED",
    description: "Estimates optic cup to optic disc diameter ratio on dilated fundus photographs.",
    planned_milestone: "Milestone 5.3+"
  }
];

const validateImageBodySchema = z.object({
  imageData: z.string().min(1, 'Image data (base64) is required'),
  filename: z.string().optional().default('uploaded_image.jpg'),
});

const eyeAnalysisBodySchema = z.object({
  imageId: z.string().optional(),
  imageData: z.string().optional(),
  filename: z.string().optional(),
  forceSegmentation: z.boolean().optional().default(false),
}).refine(data => Boolean(data.imageId || data.imageData), {
  message: 'Either imageId or imageData must be provided.',
});

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<globalThis.Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...options, signal });
}

/**
 * Helper to retrieve image buffer from stored record or base64 input
 */
async function resolveImageBuffer(
  req: AuthenticatedRequest,
  params: { imageId?: string; imageData?: string; filename?: string }
): Promise<{ buffer: Buffer; filename: string; eyeSide?: string }> {
  if (params.imageId) {
    const id = params.imageId;
    let imageRecord: any = null;

    if (isConnectedToDb) {
      imageRecord = await EyeImage.findOne({
        $or: [{ imageId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
        isArchived: { $ne: true },
      });
    }

    if (!imageRecord) {
      imageRecord = IN_MEMORY_EYE_IMAGES.find(i => (i.imageId === id || i.id === id) && !i.isArchived);
    }

    if (!imageRecord) {
      throw { status: 404, code: 'NOT_FOUND', message: `Ocular image record '${id}' not found.` };
    }

    // Role-based store isolation
    if (req.user?.role === 'STORE_OPERATOR' && imageRecord.storeId && req.user.storeId && imageRecord.storeId !== req.user.storeId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: Image belongs to another store center.' };
    }

    // Patient consent verification
    if (imageRecord.consentRecorded && imageRecord.consentRecorded.hasConsent === false) {
      throw { status: 403, code: 'CONSENT_REQUIRED', message: 'Patient consent is not recorded for this ocular photograph.' };
    }

    // Read stored encrypted file or in-memory fallback
    if (imageRecord.imageStoragePath && fileExists(imageRecord.imageStoragePath)) {
      const { buffer } = readStoredImageFile(imageRecord.imageStoragePath, imageRecord.mimeType || 'image/jpeg');
      return {
        buffer,
        filename: path.basename(imageRecord.imageStoragePath),
        eyeSide: imageRecord.eyeSide,
      };
    }

    if (imageRecord.imageDataFallback) {
      if (imageRecord.imageDataFallback.startsWith('data:image/svg+xml')) {
        // SVG fallback converted to buffer
        const svg = decodeURIComponent(imageRecord.imageDataFallback.replace('data:image/svg+xml;utf8,', ''));
        return { buffer: Buffer.from(svg, 'utf-8'), filename: `${imageRecord.imageId || 'sample'}.svg`, eyeSide: imageRecord.eyeSide };
      }
      const cleanB64 = imageRecord.imageDataFallback.replace(/^data:image\/[a-z]+;base64,/, '');
      return { buffer: Buffer.from(cleanB64, 'base64'), filename: `${imageRecord.imageId || 'eye'}.jpg`, eyeSide: imageRecord.eyeSide };
    }

    throw { status: 404, code: 'FILE_NOT_FOUND', message: 'Image binary data could not be located in storage.' };
  }

  if (params.imageData) {
    const cleanBase64 = params.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    return {
      buffer,
      filename: params.filename || 'ocular_capture.jpg',
    };
  }

  throw { status: 400, code: 'BAD_REQUEST', message: 'No valid image payload provided.' };
}

/**
 * GET /api/ai/health
 * Checks Python microservice health status gracefully.
 */
export async function getAiServiceHealth(_req: Request, res: Response): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        connected: true,
        service: 'VisionBridge AI & Computer Vision Microservice',
        data,
      });
      return;
    }

    res.json({
      success: true,
      connected: false,
      status: 'UNAVAILABLE',
      httpStatus: response.status,
      message: 'Python AI service returned non-200 status code.',
    });
  } catch (err: any) {
    res.json({
      success: true,
      connected: false,
      status: 'OFFLINE',
      targetUrl: AI_SERVICE_URL,
      message: 'Python AI service is currently offline. Computer-vision models are not available.',
      error: err.name === 'TimeoutError' ? 'Connection timed out' : 'Service unreachable',
    });
  }
}

/**
 * GET /api/ai/capabilities
 * Retrieves structured catalog of computer-vision capabilities.
 */
export async function getAiCapabilities(_req: Request, res: Response): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/capabilities`);
    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        connected: true,
        data,
      });
      return;
    }

    res.json({
      success: true,
      connected: false,
      data: {
        service: 'VisionBridge AI & Computer Vision Service',
        total_capabilities: CAPABILITIES_CATALOG_FALLBACK.length,
        implemented_count: CAPABILITIES_CATALOG_FALLBACK.filter(c => c.status === 'IMPLEMENTED').length,
        capabilities: CAPABILITIES_CATALOG_FALLBACK,
        note: 'Computer-vision capabilities (retrieved from Node.js fallback catalog while Python service is offline).',
      },
    });
  } catch {
    res.json({
      success: true,
      connected: false,
      data: {
        service: 'VisionBridge AI & Computer Vision Service',
        total_capabilities: CAPABILITIES_CATALOG_FALLBACK.length,
        implemented_count: CAPABILITIES_CATALOG_FALLBACK.filter(c => c.status === 'IMPLEMENTED').length,
        capabilities: CAPABILITIES_CATALOG_FALLBACK,
        note: 'Computer-vision capabilities (retrieved from Node.js fallback catalog while Python service is offline).',
      },
    });
  }
}

/**
 * GET /api/ai/eye-analysis/status
 * Queries EyeCapture AI engine status (devices, model weights, fallback state).
 */
export async function getEyeAnalysisStatus(_req: Request, res: Response): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/eye-analysis/status`);
    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        connected: true,
        data,
      });
      return;
    }
    res.status(503).json({
      success: false,
      connected: false,
      message: 'EyeCapture AI status endpoint returned non-200 status.',
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      connected: false,
      message: 'Python EyeCapture AI microservice is offline.',
      error: err.message,
    });
  }
}

/**
 * POST /api/ai/validate-image
 * Proxies image validation to Python service
 */
export async function validateImageWithAiService(req: Request, res: Response): Promise<void> {
  const parsed = validateImageBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message || 'Invalid request body',
      },
    });
    return;
  }

  const { imageData, filename } = parsed.data;

  try {
    const cleanBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const blob = new Blob([buffer as any]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/images/validate`, {
      method: 'POST',
      body: formData,
    }, 6000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python AI service is unreachable. Unable to validate image decodability.',
        details: err.message,
      },
    });
  }
}

/**
 * POST /api/ai/eye-analysis/quality-check
 * Evaluates ocular photograph quality via EyeCapture AI.
 * Accepts either { imageId } or { imageData } in body.
 */
export async function checkEyeQuality(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = eyeAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'Invalid payload.' },
    });
    return;
  }

  try {
    const { buffer, filename } = await resolveImageBuffer(req, parsed.data);
    const blob = new Blob([buffer as any]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/eye-analysis/quality-check`, {
      method: 'POST',
      body: formData,
    }, 6000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python AI service is unreachable. Unable to evaluate eye capture quality.',
        details: err.message,
      },
    });
  }
}

/**
 * POST /api/ai/eye-analysis/segment
 * Segments anterior eye photograph into Sclera, Iris, Pupil.
 */
export async function segmentEyeAnatomy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = eyeAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'Invalid payload.' },
    });
    return;
  }

  try {
    const { buffer, filename } = await resolveImageBuffer(req, parsed.data);
    const blob = new Blob([buffer as any]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/eye-analysis/segment`, {
      method: 'POST',
      body: formData,
    }, 6000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python AI service is unreachable. Unable to perform ocular segmentation.',
        details: err.message,
      },
    });
  }
}

/**
 * POST /api/ai/eye-analysis/analyze
 * Comprehensive quality evaluation followed by anatomical segmentation.
 */
export async function analyzeEyePhotograph(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = eyeAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'Invalid payload.' },
    });
    return;
  }

  try {
    const { buffer, filename } = await resolveImageBuffer(req, parsed.data);
    const blob = new Blob([buffer as any]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const url = `${AI_SERVICE_URL}/api/v1/eye-analysis/analyze?force_segmentation=${Boolean(parsed.data.forceSegmentation)}`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: formData,
    }, 8000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python AI service is unreachable. Unable to perform comprehensive eye analysis.',
        details: err.message,
      },
    });
  }
}

/**
 * GET /api/ai/adnexal/status
 * Queries Adnexal Telemetry engine status.
 */
export async function getAdnexalStatus(req: Request, res: Response): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/adnexal/status`, { method: 'GET' }, 3000);
    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python Adnexal Telemetry microservice is offline.',
        details: err.message,
      },
    });
  }
}

/**
 * POST /api/ai/adnexal/analyze
 * Evaluates ocular adnexa, eyelid margin reflex distances (MRD1/MRD2),
 * palpebral fissure height (Ptosis screening), and corneal light reflex (Strabismus).
 */
export async function analyzeAdnexalAlignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = eyeAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'Invalid payload.' },
    });
    return;
  }

  try {
    const { buffer, filename, eyeSide } = await resolveImageBuffer(req, parsed.data);
    const blob = new Blob([buffer as any]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const targetEyeSide = eyeSide || (req.body as any).eyeSide;
    const url = targetEyeSide
      ? `${AI_SERVICE_URL}/api/v1/adnexal/analyze?eye_side=${encodeURIComponent(targetEyeSide)}`
      : `${AI_SERVICE_URL}/api/v1/adnexal/analyze`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: formData,
    }, 8000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python AI service is unreachable. Unable to perform adnexal telemetry analysis.',
        details: err.message,
      },
    });
  }
}

/**
 * GET /api/ai/hyperaemia/status
 * Queries Hyperaemia & Pterygium engine status.
 */
export async function getHyperaemiaStatus(req: Request, res: Response): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/hyperaemia/status`, { method: 'GET' }, 3000);
    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python Hyperaemia & Pterygium microservice is offline.',
        details: err.message,
      },
    });
  }
}

/**
 * POST /api/ai/hyperaemia/analyze
 * Evaluates conjunctival microvascular density %, maps to the Efron 0-4 scale,
 * and screens for pterygium limbic corneal encroachment.
 */
export async function analyzeHyperaemiaAndPterygium(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = eyeAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'Invalid payload.' },
    });
    return;
  }

  try {
    const { buffer, filename, eyeSide } = await resolveImageBuffer(req, parsed.data);
    const blob = new Blob([buffer as any]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const targetEyeSide = eyeSide || (req.body as any).eyeSide;
    const url = targetEyeSide
      ? `${AI_SERVICE_URL}/api/v1/hyperaemia/analyze?eye_side=${encodeURIComponent(targetEyeSide)}`
      : `${AI_SERVICE_URL}/api/v1/hyperaemia/analyze`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: formData,
    }, 8000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python AI service is unreachable. Unable to perform hyperaemia and pterygium analysis.',
        details: err.message,
      },
    });
  }
}

/**
 * GET /api/ai/retinal/status
 * Queries Retinal Foundation AI (FLAIR) engine status.
 */
export async function getRetinalStatus(req: Request, res: Response): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/retinal/status`, { method: 'GET' }, 3000);
    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python Retinal Foundation AI microservice is offline.',
        details: err.message,
      },
    });
  }
}

/**
 * POST /api/ai/retinal/analyze
 * Evaluates Color Retinal Fundus Photographs via zero-shot FLAIR foundation model:
 * Diabetic Retinopathy, Macular Edema/Holes, Glaucoma cup enlargement, and Vascular Occlusion.
 */
export async function analyzeRetinalPhotograph(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = eyeAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'Invalid payload.' },
    });
    return;
  }

  try {
    const { buffer, filename, eyeSide } = await resolveImageBuffer(req, parsed.data);
    const blob = new Blob([buffer as any]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const targetEyeSide = eyeSide || (req.body as any).eyeSide;
    const force = Boolean((req.body as any).force);
    let url = `${AI_SERVICE_URL}/api/v1/retinal/analyze`;
    const params = new URLSearchParams();
    if (targetEyeSide) params.set('eye_side', targetEyeSide);
    if (force) params.set('force', 'true');
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: formData,
    }, 15000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python AI service is unreachable. Unable to perform retinal foundation analysis.',
        details: err.message,
      },
    });
  }
}

/**
 * GET /api/ai/clarity/status
 * Proxies Lens & Corneal Clarity Engine status from Python microservice.
 */
export async function getClarityStatus(req: Request, res: Response): Promise<void> {
  try {
    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/v1/clarity/status`, {
      method: 'GET',
    }, 5000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python Lens & Corneal Clarity microservice is offline.',
        details: err.message,
      },
    });
  }
}

/**
 * POST /api/ai/clarity/analyze
 * Evaluates crystalline lens opacity (cataract staging) and corneal arcus (arcus senilis).
 */
export async function analyzeCornealLensClarity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = eyeAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'Invalid payload.' },
    });
    return;
  }

  try {
    const { buffer, filename, eyeSide } = await resolveImageBuffer(req, parsed.data);
    const blob = new Blob([buffer as any]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const targetEyeSide = eyeSide || (req.body as any).eyeSide;
    let url = `${AI_SERVICE_URL}/api/v1/clarity/analyze`;
    if (targetEyeSide) {
      url += `?eye_side=${encodeURIComponent(targetEyeSide)}`;
    }

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: formData,
    }, 8000);

    const data = await response.json();
    res.status(response.status).json({
      success: response.ok,
      connected: true,
      data,
    });
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(503).json({
      success: false,
      connected: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'Python AI service is unreachable. Unable to perform lens & corneal clarity analysis.',
        details: err.message,
      },
    });
  }
}




