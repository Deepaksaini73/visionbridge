import { Response } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { EyeImage, IEyeImage, EyeSide, ClinicalImageType, GazeDirection } from '../models/EyeImage.js';
import { Customer } from '../models/Customer.js';
import { SEED_CUSTOMERS } from './customerController.js';
import { isConnectedToDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../models/AuditLog.js';
import { saveBase64Image, deleteStoredFile, fileExists, readStoredImageFile } from '../utils/fileStorage.js';
import { loadPersistedRegistry, persistEyeImageRecord, removeEyeImageRecord } from '../utils/metadataPersistence.js';

// ==========================================
// Validation Schemas
// ==========================================

const uploadEyeImageSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  imageData: z.string().min(10, 'Valid base64 image data is required'),
  eyeSide: z.enum(['RIGHT', 'LEFT', 'BOTH', 'NOT_SPECIFIED']).default('NOT_SPECIFIED'),
  imageType: z.enum([
    'EXTERNAL_PHOTO',
    'GAZE_DIRECTION',
    'ANTERIOR_SEGMENT_SLIT_LAMP',
    'FUNDUS_RETINAL',
    'OTHER',
  ]).default('EXTERNAL_PHOTO'),
  gazeDirection: z.enum([
    'PRIMARY',
    'UP',
    'DOWN',
    'LEFT',
    'RIGHT',
    'UP_RIGHT',
    'UP_LEFT',
    'DOWN_RIGHT',
    'DOWN_LEFT',
  ]).optional(),
  description: z.string().optional(),
  clinicalContext: z.string().optional(),
  captureDate: z.string().optional(),
  hasConsent: z.boolean().refine(val => val === true, {
    message: 'Explicit patient consent is required before capturing and uploading ocular photographs.',
  }),
  consentText: z.string().default('Customer provided informed consent for ocular photographic capture and professional tele-optometry review.'),
  consentedBy: z.string().optional(),
});

const reviewEyeImageSchema = z.object({
  observations: z.string().min(2, 'Clinical observations are required for professional review'),
  recommendations: z.array(z.string()).default([]),
  status: z.enum(['NORMAL', 'SUSPECTED_PATHOLOGY', 'INCONCLUSIVE', 'POOR_IMAGE_QUALITY']).default('NORMAL'),
  licenseNumber: z.string().optional(),
});

// ==========================================
// Seed Sample Clinical Images for Demo Fallback
// ==========================================

// High-fidelity SVG data URL for a simulated Right Eye ocular photograph
const SAMPLE_RIGHT_EYE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect width="100%" height="100%" fill="%23f1f5f9"/>
  <defs>
    <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="%231e293b"/>
      <stop offset="40%" stop-color="%230284c7"/>
      <stop offset="70%" stop-color="%230369a1"/>
      <stop offset="100%" stop-color="%23075985"/>
    </radialGradient>
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="%23fbcfe8"/>
      <stop offset="100%" stop-color="%23f472b6"/>
    </linearGradient>
  </defs>
  <!-- Background Ocular Sclera -->
  <path d="M 50 200 Q 300 60 550 200 Q 300 340 50 200 Z" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="3"/>
  <!-- Conjunctival fine vascular capillaries -->
  <path d="M 60 200 Q 150 190 220 185" stroke="%23fca5a5" stroke-width="1.2" fill="none" opacity="0.6"/>
  <path d="M 540 200 Q 450 210 380 215" stroke="%23fca5a5" stroke-width="1.2" fill="none" opacity="0.6"/>
  <!-- Iris -->
  <circle cx="300" cy="200" r="75" fill="url(%23irisGrad)"/>
  <!-- Pupil -->
  <circle cx="300" cy="200" r="28" fill="%230f172a"/>
  <!-- Corneal light reflection glint -->
  <circle cx="288" cy="188" r="6" fill="%23ffffff" opacity="0.9"/>
  <!-- Eyelid contour -->
  <path d="M 40 200 Q 300 50 560 200" stroke="%23e2e8f0" stroke-width="4" fill="none"/>
  <!-- Label -->
  <text x="30" y="40" font-family="sans-serif" font-size="14" font-weight="bold" fill="%230f172a">Right Eye (OD) - External Photograph</text>
  <text x="30" y="60" font-family="sans-serif" font-size="11" fill="%2364748b">Clear cornea • Round reactive pupil • White sclera</text>
</svg>`;

// High-fidelity SVG data URL for a simulated Left Eye ocular photograph
const SAMPLE_LEFT_EYE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect width="100%" height="100%" fill="%23f1f5f9"/>
  <defs>
    <radialGradient id="irisGradL" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="%231e293b"/>
      <stop offset="40%" stop-color="%230d9488"/>
      <stop offset="70%" stop-color="%230f766e"/>
      <stop offset="100%" stop-color="%23115e59"/>
    </radialGradient>
  </defs>
  <!-- Background Ocular Sclera -->
  <path d="M 50 200 Q 300 60 550 200 Q 300 340 50 200 Z" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="3"/>
  <path d="M 70 195 Q 160 185 220 180" stroke="%23fca5a5" stroke-width="1.2" fill="none" opacity="0.7"/>
  <path d="M 530 205 Q 440 215 380 220" stroke="%23fca5a5" stroke-width="1.2" fill="none" opacity="0.7"/>
  <!-- Iris -->
  <circle cx="300" cy="200" r="75" fill="url(%23irisGradL)"/>
  <!-- Pupil -->
  <circle cx="300" cy="200" r="28" fill="%230f172a"/>
  <!-- Corneal reflection -->
  <circle cx="288" cy="188" r="6" fill="%23ffffff" opacity="0.9"/>
  <!-- Eyelid contour -->
  <path d="M 40 200 Q 300 50 560 200" stroke="%23e2e8f0" stroke-width="4" fill="none"/>
  <!-- Label -->
  <text x="30" y="40" font-family="sans-serif" font-size="14" font-weight="bold" fill="%230f172a">Left Eye (OS) - External Photograph</text>
  <text x="30" y="60" font-family="sans-serif" font-size="11" fill="%2364748b">Mild temporal conjunctival injection • Cornea intact</text>
</svg>`;

export const IN_MEMORY_EYE_IMAGES: Array<any> = [
  {
    id: 'img_seed_01',
    imageId: 'IMG-2026-0101-OD',
    customerId: 'VB-2026-0101',
    customerCode: 'VB-2026-0101',
    storeId: 'ST-AP-CHITTOOR-01',
    uploadedBy: { id: 'usr_operator_01', name: 'Ramesh Patel', role: 'STORE_OPERATOR' },
    imageStoragePath: '',
    imageDataFallback: SAMPLE_RIGHT_EYE_SVG,
    imageType: 'EXTERNAL_PHOTO',
    eyeSide: 'RIGHT',
    gazeDirection: 'PRIMARY',
    description: 'External ocular photograph of right eye showing clear cornea and quiet anterior segment.',
    clinicalContext: 'Routine intake photograph prior to preliminary visual screening.',
    captureDate: new Date('2026-02-01T09:40:00Z'),
    uploadedAt: new Date('2026-02-01T09:42:00Z'),
    consentRecorded: {
      hasConsent: true,
      consentText: 'Customer provided informed consent for ocular photographic capture and professional tele-optometry review.',
      consentedBy: 'Lakshmi Narayanan',
      timestamp: new Date('2026-02-01T09:30:00Z'),
    },
    mimeType: 'image/svg+xml',
    fileSizeBytes: 4200,
    reviewStatus: 'REVIEWED',
    reviews: [
      {
        reviewId: 'rev_img_01',
        reviewedBy: {
          id: 'usr_optometrist_01',
          name: 'Dr. Ananya Sharma',
          role: 'OPTOMETRIST',
          licenseNumber: 'OPT-IN-2024-8841',
        },
        reviewedAt: new Date('2026-02-01T11:45:00Z'),
        observations: 'Cornea clear and avascular. Anterior chamber deep and quiet. Pupil round, regular, and centrally positioned. No external lids or adnexa lesions observed.',
        recommendations: ['Routine follow-up in 12 months', 'Reading spectacle refraction'],
        status: 'NORMAL',
      },
    ],
    isArchived: false,
    createdAt: new Date('2026-02-01T09:42:00Z'),
    updatedAt: new Date('2026-02-01T11:45:00Z'),
  },
  {
    id: 'img_seed_02',
    imageId: 'IMG-2026-0101-OS',
    customerId: 'VB-2026-0101',
    customerCode: 'VB-2026-0101',
    storeId: 'ST-AP-CHITTOOR-01',
    uploadedBy: { id: 'usr_operator_01', name: 'Ramesh Patel', role: 'STORE_OPERATOR' },
    imageStoragePath: '',
    imageDataFallback: SAMPLE_LEFT_EYE_SVG,
    imageType: 'EXTERNAL_PHOTO',
    eyeSide: 'LEFT',
    gazeDirection: 'PRIMARY',
    description: 'External ocular photograph of left eye showing mild temporal conjunctival hyperaemia.',
    clinicalContext: 'Customer reported occasional evening eye dryness.',
    captureDate: new Date('2026-02-01T09:41:00Z'),
    uploadedAt: new Date('2026-02-01T09:42:00Z'),
    consentRecorded: {
      hasConsent: true,
      consentText: 'Customer provided informed consent for ocular photographic capture and professional tele-optometry review.',
      consentedBy: 'Lakshmi Narayanan',
      timestamp: new Date('2026-02-01T09:30:00Z'),
    },
    mimeType: 'image/svg+xml',
    fileSizeBytes: 4300,
    reviewStatus: 'REVIEWED',
    reviews: [
      {
        reviewId: 'rev_img_02',
        reviewedBy: {
          id: 'usr_optometrist_01',
          name: 'Dr. Ananya Sharma',
          role: 'OPTOMETRIST',
          licenseNumber: 'OPT-IN-2024-8841',
        },
        reviewedAt: new Date('2026-02-01T11:45:00Z'),
        observations: 'Mild sectoral conjunctival injection temporally. Cornea clear. No signs of acute inflammation.',
        recommendations: ['Lubricating artificial tears PRN', 'Digital screen ergonomics'],
        status: 'NORMAL',
      },
    ],
    isArchived: false,
    createdAt: new Date('2026-02-01T09:42:00Z'),
    updatedAt: new Date('2026-02-01T11:45:00Z'),
  },
  {
    id: 'img_seed_03',
    imageId: 'IMG-2026-0102-OS',
    customerId: 'VB-2026-0102',
    customerCode: 'VB-2026-0102',
    storeId: 'ST-AP-CHITTOOR-01',
    uploadedBy: { id: 'usr_operator_01', name: 'Ramesh Patel', role: 'STORE_OPERATOR' },
    imageStoragePath: '',
    imageDataFallback: SAMPLE_LEFT_EYE_SVG,
    imageType: 'EXTERNAL_PHOTO',
    eyeSide: 'LEFT',
    gazeDirection: 'PRIMARY',
    description: 'Left eye external photograph of Mohammad Tariq (acuity 6/36 with Amsler distortion).',
    clinicalContext: 'Accompanies urgent referral for suspected macular metamorphopsia.',
    captureDate: new Date('2026-02-02T11:05:00Z'),
    uploadedAt: new Date('2026-02-02T11:08:00Z'),
    consentRecorded: {
      hasConsent: true,
      consentText: 'Customer provided informed consent for ocular photographic capture and professional tele-optometry review.',
      consentedBy: 'Mohammad Tariq',
      timestamp: new Date('2026-02-02T11:00:00Z'),
    },
    mimeType: 'image/svg+xml',
    fileSizeBytes: 4300,
    reviewStatus: 'PENDING_REVIEW',
    reviews: [],
    isArchived: false,
    createdAt: new Date('2026-02-02T11:08:00Z'),
    updatedAt: new Date('2026-02-02T11:08:00Z'),
  },
];

// Synchronize persisted clinical images from storage metadata on initialization
try {
  const persistedReg = loadPersistedRegistry();
  if (Array.isArray(persistedReg.eyeImages) && persistedReg.eyeImages.length > 0) {
    for (const savedImg of persistedReg.eyeImages) {
      const idx = IN_MEMORY_EYE_IMAGES.findIndex(
        (i) => i.imageId === savedImg.imageId || i.id === savedImg.id
      );
      if (idx !== -1) {
        IN_MEMORY_EYE_IMAGES[idx] = savedImg;
      } else {
        IN_MEMORY_EYE_IMAGES.unshift(savedImg);
      }
    }
  }
} catch (err) {
  console.warn('[ImageController] Could not apply persisted eye image metadata:', err);
}

// ==========================================
// Controllers
// ==========================================

/**
 * Upload a Clinical Eye Image with Metadata & Consent (Max 15MB)
 */
export const uploadEyeImage = async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = uploadEyeImageSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const {
    customerId,
    imageData,
    eyeSide,
    imageType,
    gazeDirection,
    description,
    clinicalContext,
    captureDate,
    hasConsent,
    consentText,
    consentedBy,
  } = parseResult.data;

  try {
    let customer: any = null;
    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [
          { customerId },
          { customerCode: customerId },
          { _id: customerId.match(/^[0-9a-fA-F]{24}$/) ? customerId : null },
          { clientUuid: customerId },
        ],
      });
    }
    if (!customer) {
      customer = SEED_CUSTOMERS.find(c => c.id === customerId || c.customerId === customerId || c.customerCode === customerId || c.clientUuid === customerId);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer with ID '${customerId}' was not found.` },
      });
    }

    // Role check: Store operator can only upload for customers registered at their store
    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId && req.user.storeId && customer.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot upload clinical images for customers registered at another store.' },
      });
    }

    const resolvedCustId = customer.customerId || customer.customerCode || customerId;
    // Save image to private local storage (max 15MB)
    const saved = saveBase64Image('eye-images', imageData, `eye-${resolvedCustId}`, 15 * 1024 * 1024);

    const timestamp = Date.now().toString().slice(-4);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const generatedImageId = `IMG-${dateStr}-${timestamp}-${eyeSide.slice(0, 2)}`;

    const newImageRecord: Partial<IEyeImage> = {
      imageId: generatedImageId,
      customerId: resolvedCustId,
      customerCode: customer.customerCode || customer.customerId || resolvedCustId,
      storeId: customer.storeId || req.user?.storeId || 'ST-AP-CHITTOOR-01',
      uploadedBy: {
        id: req.user?.id || 'usr_unknown',
        name: req.user?.name || 'Operator',
        role: req.user?.role || 'STORE_OPERATOR',
      },
      imageStoragePath: saved.storagePath,
      imageType: imageType as ClinicalImageType,
      eyeSide: eyeSide as EyeSide,
      gazeDirection: gazeDirection as GazeDirection,
      description: description || '',
      clinicalContext: clinicalContext || '',
      captureDate: captureDate ? new Date(captureDate) : new Date(),
      uploadedAt: new Date(),
      consentRecorded: {
        hasConsent: true,
        consentText,
        consentedBy: consentedBy || customer.fullName || customer.name,
        timestamp: new Date(),
      },
      mimeType: saved.mimeType,
      fileSizeBytes: saved.sizeBytes,
      reviewStatus: 'PENDING_REVIEW',
      reviews: [],
      isArchived: false,
    };

    let createdRecord: any = null;
    if (isConnectedToDb) {
      try {
        createdRecord = await EyeImage.create(newImageRecord);
      } catch (err) {}
    }
    if (!createdRecord) {
      createdRecord = {
        ...newImageRecord,
        id: `img_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    // Synchronize into in-memory collection
    IN_MEMORY_EYE_IMAGES.unshift(createdRecord);

    // Persist to storage metadata.json so clinical image remains accessible after backend restart
    persistEyeImageRecord(createdRecord);

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'EYE_IMAGE_UPLOADED',
      resourceType: 'IMAGE',
      resourceId: generatedImageId,
      details: {
        customerId: customer.customerId,
        storeId: customer.storeId,
        eyeSide,
        imageType,
        sizeBytes: saved.sizeBytes,
        isEncrypted: true,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Clinical eye photograph uploaded successfully and encrypted at rest',
      data: {
        ...createdRecord.toObject ? createdRecord.toObject() : createdRecord,
        fileUrl: `/api/images/${generatedImageId}/file`,
        isEncrypted: true,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_FAILED', message: msg },
    });
  }
};

/**
 * Get All Clinical Eye Images for a Customer
 */
export const getCustomerEyeImages = async (req: AuthenticatedRequest, res: Response) => {
  const { customerId } = req.params;

  try {
    let images: any[] = [];
    if (isConnectedToDb) {
      try {
        images = await EyeImage.find({
          $or: [
            { customerId },
            { customerCode: customerId },
            { _id: customerId.match(/^[0-9a-fA-F]{24}$/) ? customerId : null },
          ],
          isArchived: { $ne: true },
        }).sort({ uploadedAt: -1 });
      } catch (err) {}
    }

    const inMem = IN_MEMORY_EYE_IMAGES.filter(
      img => (img.customerId === customerId || img.customerCode === customerId) && !img.isArchived
    );

    // Merge in-memory and DB without duplicate imageId
    const seen = new Set();
    const allImages: any[] = [];
    for (const img of [...images, ...inMem]) {
      const key = img.imageId || img.id || (img._id ? img._id.toString() : '');
      if (key && !seen.has(key)) {
        seen.add(key);
        allImages.push(img);
      }
    }
    images = allImages;

    // Security check: Store operator can only access images from their store
    if (req.user?.role === 'STORE_OPERATOR') {
      let targetCust: any = null;
      if (isConnectedToDb) {
        targetCust = await Customer.findOne({
          $or: [
            { customerId },
            { customerCode: customerId },
            { _id: customerId.match(/^[0-9a-fA-F]{24}$/) ? customerId : null },
          ],
        });
      }
      if (!targetCust) {
        targetCust = SEED_CUSTOMERS.find(
          c => c.customerId === customerId || c.customerCode === customerId || c.id === customerId
        );
      }
      if (targetCust && targetCust.storeId && req.user.storeId && targetCust.storeId !== req.user.storeId) {
        return res.status(403).json({
          success: false,
          error: { code: 'CROSS_STORE_ACCESS_DENIED', message: 'Access denied to clinical images belonging to another store.' },
        });
      }

      if (images.length > 0 && req.user.storeId && images[0].storeId && images[0].storeId !== req.user.storeId) {
        return res.status(403).json({
          success: false,
          error: { code: 'CROSS_STORE_ACCESS_DENIED', message: 'Access denied to clinical images belonging to another store.' },
        });
      }
    }

    const formatted = images.map(img => {
      const plain = img.toObject ? img.toObject() : { ...img };
      return {
        ...plain,
        fileUrl: `/api/images/${plain.imageId}/file`,
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
      meta: {
        total: formatted.length,
        pendingReviewCount: formatted.filter(i => i.reviewStatus === 'PENDING_REVIEW').length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

/**
 * Get Eye Image Metadata by ID
 */
export const getEyeImageById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let image: any = null;
    if (isConnectedToDb) {
      image = await EyeImage.findOne({
        $or: [{ imageId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
        isArchived: { $ne: true },
      });
    }

    if (!image) {
      image = IN_MEMORY_EYE_IMAGES.find(i => (i.imageId === id || i.id === id) && !i.isArchived);
    }

    if (!image) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Clinical image record '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && image.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'CROSS_STORE_ACCESS_DENIED', message: 'Access denied to image records from another store.' },
      });
    }

    const plain = image.toObject ? image.toObject() : { ...image };

    return res.status(200).json({
      success: true,
      data: {
        ...plain,
        fileUrl: `/api/images/${plain.imageId}/file`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

/**
 * Stream High-Resolution Original Eye Image File
 * Protected by authorization & store isolation
 */
export const streamEyeImageFile = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let image: any = null;
    if (isConnectedToDb) {
      image = await EyeImage.findOne({
        $or: [{ imageId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
        isArchived: { $ne: true },
      });
    }

    if (!image) {
      image = IN_MEMORY_EYE_IMAGES.find(i => (i.imageId === id || i.id === id) && !i.isArchived);
    }

    if (!image) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Clinical image record not found.' },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && image.storeId && req.user.storeId && image.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: Image belongs to another store center.' },
      });
    }

    // If disk file exists, read, decrypt AES-256-GCM ciphertext, and stream plaintext bytes
    if (image.imageStoragePath && fileExists(image.imageStoragePath)) {
      const { buffer, mimeType, isEncrypted } = readStoredImageFile(
        image.imageStoragePath,
        image.mimeType || 'image/jpeg'
      );
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Storage-Encrypted', isEncrypted ? 'AES-256-GCM' : 'NONE');
      return res.status(200).send(buffer);
    }

    // In-memory fallback: if imageDataFallback is present (e.g. SVG or base64)
    if (image.imageDataFallback) {
      if (image.imageDataFallback.startsWith('data:image/svg+xml;utf8,')) {
        const svgContent = decodeURIComponent(image.imageDataFallback.replace('data:image/svg+xml;utf8,', ''));
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        return res.status(200).send(svgContent);
      }

      const matches = image.imageDataFallback.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mime = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        return res.status(200).send(buffer);
      }
    }

    return res.status(404).json({
      success: false,
      error: { code: 'FILE_NOT_FOUND', message: 'Original image binary not found on storage disk.' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: `Error reading image: ${msg}` },
    });
  }
};

/**
 * Optometrist Clinical Image Review & Observations Sign-Off
 */
export const reviewEyeImage = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Authorization check: Must be optometrist or admin
  const allowedRoles = ['ADMIN', 'OPTOMETRIST', 'SPECIALIST_DOCTOR'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: { code: 'UNAUTHORIZED_REVIEWER', message: 'Only qualified eye-care professionals or administrators can record clinical image observations.' },
    });
  }

  const parseResult = reviewEyeImageSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { observations, recommendations, status, licenseNumber } = parseResult.data;

  try {
    let image: any = null;
    if (isConnectedToDb) {
      image = await EyeImage.findOne({
        $or: [{ imageId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
        isArchived: { $ne: true },
      });
    } else {
      image = IN_MEMORY_EYE_IMAGES.find(i => (i.imageId === id || i.id === id) && !i.isArchived);
    }

    if (!image) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Image with ID '${id}' not found.` },
      });
    }

    const newReview = {
      reviewId: `rev_${Date.now()}`,
      reviewedBy: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
        licenseNumber: licenseNumber || 'OPT-REG-IN-2026',
      },
      reviewedAt: new Date(),
      observations,
      recommendations,
      status,
    };

    image.reviews.push(newReview);
    image.reviewStatus = status === 'SUSPECTED_PATHOLOGY' ? 'REFERRAL_REQUIRED' : 'REVIEWED';

    if (isConnectedToDb) {
      await image.save();
    } else {
      image.updatedAt = new Date().toISOString();
    }

    // Persist updated review to metadata registry
    persistEyeImageRecord(image);

    logAuditEvent({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'EYE_IMAGE_REVIEWED',
      resourceType: 'IMAGE',
      resourceId: image.imageId,
      details: {
        customerId: image.customerId,
        status,
        reviewerId: req.user.id,
      },
      ipAddress: req.ip,
    });

    const plain = image.toObject ? image.toObject() : { ...image };

    return res.status(200).json({
      success: true,
      message: 'Optometrist clinical image observation recorded successfully',
      data: {
        ...plain,
        fileUrl: `/api/images/${plain.imageId}/file`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

/**
 * Delete a Clinical Eye Image (Authorized Store Operator or Admin)
 */
export const deleteEyeImage = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let image: any = null;
    if (isConnectedToDb) {
      image = await EyeImage.findOne({
        $or: [{ imageId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    } else {
      image = IN_MEMORY_EYE_IMAGES.find(i => i.imageId === id || i.id === id);
    }

    if (!image) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Image with ID '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && image.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot delete images from another store.' },
      });
    }

    // Remove disk file if present
    if (image.imageStoragePath) {
      deleteStoredFile(image.imageStoragePath);
    }

    image.isArchived = true;

    if (isConnectedToDb) {
      await image.save();
    } else {
      image.updatedAt = new Date().toISOString();
    }

    // Update persisted metadata registry
    removeEyeImageRecord(image.imageId);

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'EYE_IMAGE_DELETED',
      resourceType: 'IMAGE',
      resourceId: image.imageId,
      details: { customerId: image.customerId },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Clinical eye image removed successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

