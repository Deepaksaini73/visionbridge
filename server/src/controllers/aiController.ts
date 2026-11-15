import { Request, Response } from 'express';
import { z } from 'zod';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';
const REQUEST_TIMEOUT_MS = 4000;

// Planned capabilities fallback when Python service is offline
const PLANNED_CAPABILITIES_FALLBACK = [
  {
    id: "eye_image_quality",
    name: "Eye Image Quality Assessment",
    category: "Pre-Analysis QA",
    status: "NOT_IMPLEMENTED",
    description: "Assesses blurriness, illumination uniformity, and focus suitability for anterior segment & fundus photos.",
    planned_milestone: "Milestone 5.1+"
  },
  {
    id: "eye_detection_localization",
    name: "Eye Detection and Localization",
    category: "Anatomy Localization",
    status: "NOT_IMPLEMENTED",
    description: "Detects left and right eye bounding regions and key ocular landmarks (canthus, palpebral fissure).",
    planned_milestone: "Milestone 5.1+"
  },
  {
    id: "iris_segmentation",
    name: "Iris Segmentation",
    category: "Semantic Segmentation",
    status: "NOT_IMPLEMENTED",
    description: "Identifies the outer limbic boundary of the iris for spatial reference and corneal inspection.",
    planned_milestone: "Milestone 5.2+"
  },
  {
    id: "pupil_segmentation",
    name: "Pupil Segmentation",
    category: "Semantic Segmentation",
    status: "NOT_IMPLEMENTED",
    description: "Delineates pupillary margin, pupil center, and computes relative pupillary asymmetry indicators.",
    planned_milestone: "Milestone 5.2+"
  },
  {
    id: "geometric_eye_analysis",
    name: "Geometric Eye Analysis",
    category: "Quantitative Telemetry",
    status: "NOT_IMPLEMENTED",
    description: "Calculates pupil-to-iris diameter ratios, limbal distance metrics, and horizontal visible iris diameter (HVID).",
    planned_milestone: "Milestone 5.3+"
  }
];

const validateImageBodySchema = z.object({
  imageData: z.string().min(1, 'Image data (base64) is required'),
  filename: z.string().optional().default('uploaded_image.jpg'),
});

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<globalThis.Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...options, signal });
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
    // Graceful offline detection - does not throw 500 error
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
 * Retrieves structured catalog of planned computer-vision capabilities.
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
        total_capabilities: PLANNED_CAPABILITIES_FALLBACK.length,
        implemented_count: 0,
        capabilities: PLANNED_CAPABILITIES_FALLBACK,
        note: 'Planned computer-vision capabilities (retrieved from Node.js fallback catalog while Python service is offline).',
      },
    });
  } catch {
    res.json({
      success: true,
      connected: false,
      data: {
        service: 'VisionBridge AI & Computer Vision Service',
        total_capabilities: PLANNED_CAPABILITIES_FALLBACK.length,
        implemented_count: 0,
        capabilities: PLANNED_CAPABILITIES_FALLBACK,
        note: 'Planned computer-vision capabilities (retrieved from Node.js fallback catalog while Python service is offline).',
      },
    });
  }
}

/**
 * POST /api/ai/validate-image
 * Proxies base64 or multipart image to Python service /api/v1/images/validate
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
    // Strip optional data:image/xxx;base64, header
    const cleanBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Build standard multipart FormData to transmit to Python FastAPI
    const blob = new Blob([buffer]);
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
