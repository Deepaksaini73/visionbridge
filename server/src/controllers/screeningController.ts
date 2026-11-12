import { Response } from 'express';
import { z } from 'zod';
import { Screening, IScreening } from '../models/Screening.js';
import { Customer } from '../models/Customer.js';
import { EyeImage } from '../models/EyeImage.js';
import { SEED_CUSTOMERS } from './customerController.js';
import { IN_MEMORY_EYE_IMAGES } from './imageController.js';
import { isConnectedToDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../models/AuditLog.js';
import {
  ACUITY_LEVELS,
  SCREENING_PROTOCOL,
  CLINICAL_DISCLAIMER_EN,
  UNCALIBRATED_LIMITATION_NOTICE_EN,
  CONTRAST_PROTOTYPE_NOTICE_EN,
  COLOUR_PROTOTYPE_NOTICE_EN,
  TumblingEDirection,
} from '../config/screeningConfig.js';

// ==========================================
// Validation Schemas
// ==========================================

const startScreeningSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  interviewId: z.string().optional(),
  selectedTests: z.array(z.string()).optional(),
});

const trialSchema = z.object({
  eye: z.enum(['RIGHT', 'LEFT', 'BOTH']),
  level: z.number().min(1).max(7),
  optotypeLevel: z.string(),
  directionPresented: z.enum(['UP', 'DOWN', 'LEFT', 'RIGHT']),
  userResponse: z.enum(['UP', 'DOWN', 'LEFT', 'RIGHT']),
  isCorrect: z.boolean(),
  reactionTimeMs: z.number().optional(),
  trialIndex: z.number().optional(),
});

const calibrationSchema = z.object({
  deviceType: z.enum(['MOBILE', 'TABLET', 'DESKTOP']).default('DESKTOP'),
  viewportWidth: z.number().default(1920),
  viewportHeight: z.number().default(1080),
  devicePixelRatio: z.number().default(1),
  calibrationStatus: z.enum(['CALIBRATED_PHYSICAL', 'APPROXIMATE_ESTIMATE', 'UNCALIBRATED']).default('UNCALIBRATED'),
  pixelsPerMm: z.number().optional(),
  configuredDistanceMeters: z.number().default(3.0),
  confirmedDistanceMeters: z.number().default(3.0),
  ambientLighting: z.enum(['CONFIRMED_ADEQUATE', 'DIM', 'EXCESSIVE_GLARE']).default('CONFIRMED_ADEQUATE'),
});

const amslerEyeSchema = z.object({
  tested: z.boolean().default(false),
  status: z.enum(['NO_DISTORTION', 'WAVY_LINES', 'MISSING_AREAS', 'BLURRED_AREAS', 'OTHER', 'UNABLE_TO_COMPLETE']).default('NO_DISTORTION'),
  distortionTypes: z.array(z.string()).default([]),
  sectorsAffected: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const nearAcuitySchema = z.object({
  tested: z.boolean().default(false),
  rightEyeScore: z.string().optional(),
  leftEyeScore: z.string().optional(),
  binocularScore: z.string().optional(),
  testedDistanceCm: z.number().default(40),
  status: z.enum(['COMPLETED', 'INCOMPLETE', 'UNABLE_TO_TEST']).default('INCOMPLETE'),
  trials: z.array(z.any()).default([]),
});

const contrastSensitivitySchema = z.object({
  tested: z.boolean().default(false),
  logCSScore: z.number().default(0),
  weberContrastPct: z.number().default(100),
  contrastGrade: z.enum(['NORMAL', 'MILD_REDUCTION', 'MODERATE_REDUCTION', 'SEVERE_REDUCTION']).default('NORMAL'),
  testedEye: z.enum(['RIGHT', 'LEFT', 'BINOCULAR']).default('BINOCULAR'),
  status: z.enum(['COMPLETED', 'INCOMPLETE', 'UNABLE_TO_TEST']).default('INCOMPLETE'),
  trials: z.array(z.any()).default([]),
});

const colourVisionSchema = z.object({
  tested: z.boolean().default(false),
  platesTotal: z.number().default(4),
  platesCorrect: z.number().default(0),
  classification: z.enum(['NORMAL_TRICHROMAT', 'RED_GREEN_DEFICIENCY_SUSPECTED', 'TOTAL_DEFICIENCY_SUSPECTED', 'INCONCLUSIVE']).default('NORMAL_TRICHROMAT'),
  status: z.enum(['COMPLETED', 'INCOMPLETE', 'UNABLE_TO_TEST']).default('INCOMPLETE'),
  trials: z.array(z.any()).default([]),
});

const professionalReviewSchema = z.object({
  clinicalDecision: z.enum(['ROUTINE_MONITORING', 'OPHTHALMIC_REFERRAL', 'RETEST_RECOMMENDED', 'INCONCLUSIVE']),
  urgency: z.enum(['ROUTINE', 'PROMPT_1_2_WEEKS', 'URGENT_24_48_HOURS']).default('ROUTINE'),
  notes: z.string().min(1, 'Clinical notes are required for professional review'),
  provisionalRecommendations: z.array(z.string()).default([]),
  licenseNumber: z.string().optional(),
});

const saveProgressSchema = z.object({
  calibrationDetails: calibrationSchema.optional(),
  selectedTests: z.array(z.string()).optional(),
  completedTests: z.array(z.string()).optional(),
  skippedTests: z.array(z.string()).optional(),
  trials: z.array(trialSchema).optional(),
  currentStage: z.string().optional(),
  nearAcuity: nearAcuitySchema.optional(),
  contrastSensitivity: contrastSensitivitySchema.optional(),
  colourVision: colourVisionSchema.optional(),
  amslerAssessment: z.object({
    performed: z.boolean().default(false),
    rightEye: amslerEyeSchema.optional(),
    leftEye: amslerEyeSchema.optional(),
    observations: z.string().optional(),
  }).optional(),
  operatorObservations: z.string().optional(),
});

const completeScreeningSchema = z.object({
  calibrationDetails: calibrationSchema,
  selectedTests: z.array(z.string()).optional(),
  completedTests: z.array(z.string()).optional(),
  skippedTests: z.array(z.string()).optional(),
  trials: z.array(trialSchema).default([]),
  nearAcuity: nearAcuitySchema.optional(),
  contrastSensitivity: contrastSensitivitySchema.optional(),
  colourVision: colourVisionSchema.optional(),
  amslerAssessment: z.object({
    performed: z.boolean().default(false),
    rightEye: amslerEyeSchema.default({ tested: false, status: 'NO_DISTORTION', distortionTypes: [] }),
    leftEye: amslerEyeSchema.default({ tested: false, status: 'NO_DISTORTION', distortionTypes: [] }),
    observations: z.string().optional(),
  }).optional(),
  operatorObservations: z.string().optional(),
  testQuality: z.enum(['GOOD', 'FAIR', 'UNRELIABLE']).default('GOOD'),
  isIncomplete: z.boolean().optional(),
  incompleteReason: z.string().optional(),
});

// ==========================================
// In-Memory Seed Screenings for Demo & Fallback
// ==========================================

export const IN_MEMORY_SCREENINGS: Array<any> = [
  {
    id: 'scr_demo_01',
    screeningId: 'SCR-2026-0101',
    customerId: 'VB-2026-0101',
    customerCode: 'VB-2026-0101',
    customerName: 'Lakshmi Narayanan',
    storeId: 'ST-AP-CHITTOOR-01',
    storeName: 'VisionPoint Chittoor Center',
    conductedBy: { id: 'usr_operator_01', name: 'Ramesh Patel' },
    protocolVersion: 'VB-ACUITY-2026.1',
    selectedTests: ['DISTANCE_ACUITY', 'NEAR_ACUITY', 'CONTRAST_SENSITIVITY', 'COLOUR_VISION', 'AMSLER_GRID'],
    completedTests: ['DISTANCE_ACUITY', 'NEAR_ACUITY', 'CONTRAST_SENSITIVITY', 'COLOUR_VISION', 'AMSLER_GRID'],
    skippedTests: [],
    calibrationDetails: {
      deviceType: 'TABLET',
      viewportWidth: 1024,
      viewportHeight: 768,
      devicePixelRatio: 2,
      calibrationStatus: 'UNCALIBRATED',
      configuredDistanceMeters: 3.0,
      confirmedDistanceMeters: 3.0,
      ambientLighting: 'CONFIRMED_ADEQUATE',
    },
    visualAcuity: {
      rightEye: {
        tested: true,
        preliminaryScore: 'Level 6 (~6/9 equivalent at 3m)',
        rawLevel: 6,
        snellenEquivalent: '6/9',
        totalTrials: 12,
        correctTrials: 11,
        status: 'COMPLETED',
        trials: [
          { eye: 'RIGHT', level: 1, optotypeLevel: '6/60', directionPresented: 'UP', userResponse: 'UP', isCorrect: true, reactionTimeMs: 1200 },
          { eye: 'RIGHT', level: 4, optotypeLevel: '6/18', directionPresented: 'LEFT', userResponse: 'LEFT', isCorrect: true, reactionTimeMs: 1400 },
          { eye: 'RIGHT', level: 5, optotypeLevel: '6/12', directionPresented: 'DOWN', userResponse: 'DOWN', isCorrect: true, reactionTimeMs: 1550 },
          { eye: 'RIGHT', level: 6, optotypeLevel: '6/9', directionPresented: 'RIGHT', userResponse: 'RIGHT', isCorrect: true, reactionTimeMs: 1800 },
        ],
      },
      leftEye: {
        tested: true,
        preliminaryScore: 'Level 5 (~6/12 equivalent at 3m)',
        rawLevel: 5,
        snellenEquivalent: '6/12',
        totalTrials: 12,
        correctTrials: 9,
        status: 'COMPLETED',
        trials: [
          { eye: 'LEFT', level: 1, optotypeLevel: '6/60', directionPresented: 'RIGHT', userResponse: 'RIGHT', isCorrect: true, reactionTimeMs: 1100 },
          { eye: 'LEFT', level: 4, optotypeLevel: '6/18', directionPresented: 'UP', userResponse: 'UP', isCorrect: true, reactionTimeMs: 1600 },
          { eye: 'LEFT', level: 5, optotypeLevel: '6/12', directionPresented: 'LEFT', userResponse: 'LEFT', isCorrect: true, reactionTimeMs: 2100 },
          { eye: 'LEFT', level: 6, optotypeLevel: '6/9', directionPresented: 'DOWN', userResponse: 'UP', isCorrect: false, reactionTimeMs: 2500 },
        ],
      },
      rightEyeEstimatedScore: '6/9',
      leftEyeEstimatedScore: '6/12',
      testQuality: 'GOOD',
      trials: [],
    },
    nearAcuity: {
      tested: true,
      rightEyeScore: 'N6',
      leftEyeScore: 'N8',
      binocularScore: 'N6',
      testedDistanceCm: 40,
      status: 'COMPLETED',
      trials: [],
    },
    contrastSensitivity: {
      tested: true,
      logCSScore: 1.80,
      weberContrastPct: 1.56,
      contrastGrade: 'NORMAL',
      testedEye: 'BINOCULAR',
      status: 'COMPLETED',
      trials: [],
    },
    colourVision: {
      tested: true,
      platesTotal: 4,
      platesCorrect: 4,
      classification: 'NORMAL_TRICHROMAT',
      status: 'COMPLETED',
      trials: [],
    },
    amslerAssessment: {
      performed: true,
      rightEye: { tested: true, status: 'NO_DISTORTION', distortionTypes: [], notes: 'Grid lines seen straight' },
      leftEye: { tested: true, status: 'NO_DISTORTION', distortionTypes: [], notes: 'Grid lines seen straight' },
      observations: 'No subjective metamorphopsia or scotoma reported.',
    },
    operatorObservations: 'Customer completed Tumbling-E cooperative and responsive. Distance maintained at 3m.',
    warningFlags: [],
    hasRedFlags: false,
    testValidity: 'PRELIMINARY_UNCALIBRATED',
    status: 'COMPLETED',
    professionalReviewStatus: 'PENDING_REVIEW',
    disclaimer: CLINICAL_DISCLAIMER_EN,
    startedAt: new Date('2026-02-01T10:15:00Z'),
    completedAt: new Date('2026-02-01T10:24:00Z'),
    createdAt: new Date('2026-02-01T10:15:00Z'),
    updatedAt: new Date('2026-02-01T10:24:00Z'),
  },
  {
    id: 'scr_demo_02',
    screeningId: 'SCR-2026-0102',
    customerId: 'VB-2026-0102',
    customerCode: 'VB-2026-0102',
    customerName: 'Mohammad Tariq',
    storeId: 'ST-AP-CHITTOOR-01',
    storeName: 'VisionPoint Chittoor Center',
    conductedBy: { id: 'usr_operator_01', name: 'Ramesh Patel' },
    protocolVersion: 'VB-ACUITY-2026.1',
    selectedTests: ['DISTANCE_ACUITY', 'AMSLER_GRID'],
    completedTests: ['DISTANCE_ACUITY', 'AMSLER_GRID'],
    skippedTests: ['NEAR_ACUITY', 'CONTRAST_SENSITIVITY', 'COLOUR_VISION'],
    calibrationDetails: {
      deviceType: 'DESKTOP',
      viewportWidth: 1920,
      viewportHeight: 1080,
      devicePixelRatio: 1,
      calibrationStatus: 'UNCALIBRATED',
      configuredDistanceMeters: 3.0,
      confirmedDistanceMeters: 3.0,
      ambientLighting: 'CONFIRMED_ADEQUATE',
    },
    visualAcuity: {
      rightEye: {
        tested: true,
        preliminaryScore: 'Level 6 (~6/9 equivalent at 3m)',
        rawLevel: 6,
        snellenEquivalent: '6/9',
        totalTrials: 12,
        correctTrials: 11,
        status: 'COMPLETED',
        trials: [],
      },
      leftEye: {
        tested: true,
        preliminaryScore: 'Level 2 (~6/36 equivalent at 3m)',
        rawLevel: 2,
        snellenEquivalent: '6/36',
        totalTrials: 8,
        correctTrials: 4,
        status: 'COMPLETED',
        trials: [],
      },
      rightEyeEstimatedScore: '6/9',
      leftEyeEstimatedScore: '6/36',
      testQuality: 'GOOD',
      trials: [],
    },
    amslerAssessment: {
      performed: true,
      rightEye: { tested: true, status: 'NO_DISTORTION', distortionTypes: [] },
      leftEye: { tested: true, status: 'WAVY_LINES', distortionTypes: ['METAMORPHOPSIA', 'BLURRED_CENTER'], notes: 'Lines appear bent near the center' },
      observations: 'Left eye exhibits localized wavy grid pattern.',
    },
    operatorObservations: 'Customer noticed significant blur and wavy lines in left eye.',
    warningFlags: ['SIGNIFICANT_INTEROCULAR_ASYMMETRY', 'AMSLER_METAMORPHOPSIA_REPORTED'],
    hasRedFlags: true,
    testValidity: 'PRELIMINARY_UNCALIBRATED',
    status: 'COMPLETED',
    professionalReviewStatus: 'PENDING_REVIEW',
    disclaimer: CLINICAL_DISCLAIMER_EN,
    startedAt: new Date('2026-02-02T11:00:00Z'),
    completedAt: new Date('2026-02-02T11:12:00Z'),
    createdAt: new Date('2026-02-02T11:00:00Z'),
    updatedAt: new Date('2026-02-02T11:12:00Z'),
  },
];

// ==========================================
// Helper: Evaluate Eye Acuity from Trials
// ==========================================

function evaluateEyeAcuity(trials: any[], eye: 'RIGHT' | 'LEFT' | 'BOTH'): any {
  const eyeTrials = trials.filter(t => t.eye === eye);
  if (eyeTrials.length === 0) {
    return {
      tested: false,
      preliminaryScore: 'Not Tested',
      rawLevel: 0,
      totalTrials: 0,
      correctTrials: 0,
      status: 'INCOMPLETE',
      trials: [],
    };
  }

  const levelMap: Record<number, { total: number; correct: number }> = {};
  for (const t of eyeTrials) {
    if (!levelMap[t.level]) {
      levelMap[t.level] = { total: 0, correct: 0 };
    }
    levelMap[t.level].total++;
    if (t.isCorrect) levelMap[t.level].correct++;
  }

  let highestPassedLevel = 0;
  for (let lvl = 1; lvl <= 7; lvl++) {
    const stats = levelMap[lvl];
    if (stats && stats.total > 0) {
      const ratio = stats.correct / stats.total;
      if (ratio >= SCREENING_PROTOCOL.passingThresholdRatio) {
        highestPassedLevel = lvl;
      }
    }
  }

  const levelConfig = ACUITY_LEVELS.find(l => l.level === highestPassedLevel);
  const snellenM = levelConfig ? levelConfig.snellenMeters : 'Below 6/60';
  const preliminaryScore = highestPassedLevel > 0 
    ? `Level ${highestPassedLevel} (~${snellenM} equivalent at 3m)`
    : 'Unable to recognize Level 1';

  const totalTrials = eyeTrials.length;
  const correctTrials = eyeTrials.filter(t => t.isCorrect).length;

  return {
    tested: true,
    preliminaryScore,
    rawLevel: highestPassedLevel,
    snellenEquivalent: snellenM,
    totalTrials,
    correctTrials,
    status: totalTrials >= SCREENING_PROTOCOL.minTrialsPerLevel ? 'COMPLETED' : 'INCOMPLETE',
    trials: eyeTrials,
  };
}

// ==========================================
// Controllers
// ==========================================

export const startScreening = async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = startScreeningSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { customerId, interviewId, selectedTests } = parseResult.data;

  try {
    let customer: any = null;
    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [{ customerId }, { _id: customerId.match(/^[0-9a-fA-F]{24}$/) ? customerId : null }],
      });
    }

    if (!customer) {
      customer = SEED_CUSTOMERS.find(c => c.customerId === customerId || c.customerCode === customerId || c.id === customerId);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer with ID '${customerId}' not found.` },
      });
    }

    // Role check: Store operator can only screen customers from their store
    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are only authorized to initiate screening for customers registered at your center.' },
      });
    }

    const timestamp = Date.now().toString().slice(-4);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const generatedScrId = `SCR-${dateStr}-${timestamp}`;

    const defaultTests = ['DISTANCE_ACUITY', 'NEAR_ACUITY', 'CONTRAST_SENSITIVITY', 'COLOUR_VISION', 'AMSLER_GRID'];
    const assignedTests = selectedTests && selectedTests.length > 0 ? selectedTests : defaultTests;

    const newSessionData: Partial<IScreening> = {
      screeningId: generatedScrId,
      customerId: customer.customerId,
      customerCode: customer.customerCode || customer.customerId,
      storeId: customer.storeId,
      conductedBy: {
        id: req.user?.id || 'usr_unknown',
        name: req.user?.name || 'Operator',
      },
      interviewId,
      protocolVersion: 'VB-ACUITY-2026.1',
      selectedTests: assignedTests,
      completedTests: [],
      skippedTests: [],
      calibrationDetails: {
        deviceType: 'DESKTOP',
        viewportWidth: 1920,
        viewportHeight: 1080,
        devicePixelRatio: 1,
        calibrationStatus: 'UNCALIBRATED',
        configuredDistanceMeters: 3.0,
        confirmedDistanceMeters: 3.0,
        ambientLighting: 'CONFIRMED_ADEQUATE',
      },
      visualAcuity: {
        rightEye: { tested: false, preliminaryScore: 'Pending', rawLevel: 0, totalTrials: 0, correctTrials: 0, status: 'INCOMPLETE', trials: [] },
        leftEye: { tested: false, preliminaryScore: 'Pending', rawLevel: 0, totalTrials: 0, correctTrials: 0, status: 'INCOMPLETE', trials: [] },
        rightEyeEstimatedScore: 'Pending',
        leftEyeEstimatedScore: 'Pending',
        testQuality: 'GOOD',
        trials: [],
      },
      warningFlags: [],
      hasRedFlags: false,
      testValidity: 'PRELIMINARY_UNCALIBRATED',
      status: 'IN_PROGRESS',
      professionalReviewStatus: 'PENDING_REVIEW',
      disclaimer: CLINICAL_DISCLAIMER_EN,
      startedAt: new Date(),
    };

    let createdScreening: any = null;
    if (isConnectedToDb) {
      createdScreening = await Screening.create(newSessionData);
      await Customer.updateOne(
        { customerId: customer.customerId },
        { workflowStatus: 'SCREENING_IN_PROGRESS' }
      );
    } else {
      createdScreening = {
        ...newSessionData,
        id: `scr_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      IN_MEMORY_SCREENINGS.unshift(createdScreening);
      customer.workflowStatus = 'SCREENING_IN_PROGRESS';
    }

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'SCREENING_STARTED',
      resourceType: 'SCREENING',
      resourceId: generatedScrId,
      details: { customerId: customer.customerId, storeId: customer.storeId, selectedTests: assignedTests },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Vision screening initialized for ${customer.fullName || customer.name}`,
      data: createdScreening,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const getScreeningById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let screening: any = null;

    if (isConnectedToDb) {
      screening = await Screening.findOne({
        $or: [{ screeningId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    }

    if (!screening) {
      screening = IN_MEMORY_SCREENINGS.find(s => s.screeningId === id || s.id === id);
    }

    if (!screening) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Screening record with ID '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && screening.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'CROSS_STORE_ACCESS_DENIED', message: 'Access denied to screening records from another store.' },
      });
    }

    return res.status(200).json({ success: true, data: screening });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const getScreeningsByCustomer = async (req: AuthenticatedRequest, res: Response) => {
  const { customerId } = req.params;

  try {
    let screenings: any[] = [];

    if (isConnectedToDb) {
      screenings = await Screening.find({
        $or: [{ customerId }, { customerCode: customerId }],
      }).sort({ createdAt: -1 });
    }

    if (screenings.length === 0) {
      screenings = IN_MEMORY_SCREENINGS.filter(s => s.customerId === customerId || s.customerCode === customerId);
    }

    if (screenings.length > 0 && req.user?.role === 'STORE_OPERATOR') {
      if (screenings[0].storeId !== req.user.storeId) {
        return res.status(403).json({
          success: false,
          error: { code: 'CROSS_STORE_ACCESS_DENIED', message: 'Access denied to screening records from another store.' },
        });
      }
    }

    const latest = screenings[0] || null;

    return res.status(200).json({
      success: true,
      data: {
        latest,
        history: screenings,
        total: screenings.length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const saveScreeningProgress = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const parseResult = saveProgressSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const {
    calibrationDetails,
    selectedTests,
    completedTests,
    skippedTests,
    trials,
    nearAcuity,
    contrastSensitivity,
    colourVision,
    amslerAssessment,
    operatorObservations,
  } = parseResult.data;

  try {
    let screening: any = null;
    if (isConnectedToDb) {
      screening = await Screening.findOne({
        $or: [{ screeningId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    } else {
      screening = IN_MEMORY_SCREENINGS.find(s => s.screeningId === id || s.id === id);
    }

    if (!screening) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Screening record with ID '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && screening.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot modify screening records from another store.' },
      });
    }

    if (calibrationDetails) screening.calibrationDetails = calibrationDetails;
    if (selectedTests) screening.selectedTests = selectedTests;
    if (completedTests) screening.completedTests = completedTests;
    if (skippedTests) screening.skippedTests = skippedTests;

    if (trials && trials.length > 0) {
      screening.visualAcuity.trials = trials;
      screening.visualAcuity.rightEye = evaluateEyeAcuity(trials, 'RIGHT');
      screening.visualAcuity.leftEye = evaluateEyeAcuity(trials, 'LEFT');
      screening.visualAcuity.rightEyeEstimatedScore = screening.visualAcuity.rightEye.snellenEquivalent || 'Pending';
      screening.visualAcuity.leftEyeEstimatedScore = screening.visualAcuity.leftEye.snellenEquivalent || 'Pending';
    }

    if (nearAcuity) screening.nearAcuity = nearAcuity;
    if (contrastSensitivity) screening.contrastSensitivity = contrastSensitivity;
    if (colourVision) screening.colourVision = colourVision;
    if (amslerAssessment) screening.amslerAssessment = amslerAssessment;
    if (operatorObservations !== undefined) screening.operatorObservations = operatorObservations;

    if (isConnectedToDb) {
      await screening.save();
    } else {
      screening.updatedAt = new Date().toISOString();
    }

    return res.status(200).json({
      success: true,
      message: 'Screening progress saved securely',
      data: screening,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const completeScreening = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const parseResult = completeScreeningSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const {
    calibrationDetails,
    selectedTests,
    completedTests,
    skippedTests,
    trials,
    nearAcuity,
    contrastSensitivity,
    colourVision,
    amslerAssessment,
    operatorObservations,
    testQuality,
    isIncomplete,
    incompleteReason,
  } = parseResult.data;

  try {
    let screening: any = null;
    if (isConnectedToDb) {
      screening = await Screening.findOne({
        $or: [{ screeningId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    } else {
      screening = IN_MEMORY_SCREENINGS.find(s => s.screeningId === id || s.id === id);
    }

    if (!screening) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Screening record with ID '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && screening.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot complete screening records from another store.' },
      });
    }

    // 1. Evaluate Visual Acuity per eye
    const rightEyeResult = evaluateEyeAcuity(trials, 'RIGHT');
    const leftEyeResult = evaluateEyeAcuity(trials, 'LEFT');

    // 2. Evaluate Red Flags & Warning Conditions
    const warningFlags: string[] = [];

    // Significant Interocular Asymmetry (difference of >= 2 acuity levels)
    if (rightEyeResult.tested && leftEyeResult.tested && rightEyeResult.rawLevel > 0 && leftEyeResult.rawLevel > 0) {
      const levelDiff = Math.abs(rightEyeResult.rawLevel - leftEyeResult.rawLevel);
      if (levelDiff >= 2) {
        warningFlags.push('SIGNIFICANT_INTEROCULAR_ASYMMETRY (>= 2 level difference between OD and OS)');
      }
    }

    // Amsler Metamorphopsia / Distortion
    let amslerAbnormal = false;
    if (amslerAssessment?.performed) {
      if (amslerAssessment.rightEye?.status === 'WAVY_LINES' || amslerAssessment.rightEye?.status === 'MISSING_AREAS') {
        warningFlags.push('AMSLER_METAMORPHOPSIA_RIGHT_EYE (Subjective grid distortion reported OD)');
        amslerAbnormal = true;
      }
      if (amslerAssessment.leftEye?.status === 'WAVY_LINES' || amslerAssessment.leftEye?.status === 'MISSING_AREAS') {
        warningFlags.push('AMSLER_METAMORPHOPSIA_LEFT_EYE (Subjective grid distortion reported OS)');
        amslerAbnormal = true;
      }
    }

    // Contrast Sensitivity warning
    if (contrastSensitivity?.tested && (contrastSensitivity.contrastGrade === 'MODERATE_REDUCTION' || contrastSensitivity.contrastGrade === 'SEVERE_REDUCTION')) {
      warningFlags.push('REDUCED_CONTRAST_SENSITIVITY (Significant low-contrast attenuation detected)');
    }

    // Colour Vision warning
    if (colourVision?.tested && (colourVision.classification === 'RED_GREEN_DEFICIENCY_SUSPECTED' || colourVision.classification === 'TOTAL_DEFICIENCY_SUSPECTED')) {
      warningFlags.push('COLOUR_VISION_DEFICIENCY_SUSPECTED (Atypical pseudoisochromatic responses)');
    }

    // Near Acuity warning
    if (nearAcuity?.tested && (nearAcuity.rightEyeScore === 'N36' || nearAcuity.leftEyeScore === 'N36' || nearAcuity.binocularScore === 'N36')) {
      warningFlags.push('NEAR_VISION_DEFICIT (Unable to resolve standard reading print at 40cm)');
    }

    // Check lighting conditions & display calibration
    let testValidity: 'VALID_CALIBRATED' | 'PRELIMINARY_UNCALIBRATED' | 'INVALID_CONDITIONS' | 'INCONCLUSIVE' = 'PRELIMINARY_UNCALIBRATED';
    if (calibrationDetails.ambientLighting === 'DIM' || calibrationDetails.ambientLighting === 'EXCESSIVE_GLARE') {
      testValidity = 'INVALID_CONDITIONS';
      warningFlags.push('SUBOPTIMAL_LIGHTING_CONDITIONS');
    } else if (calibrationDetails.calibrationStatus === 'CALIBRATED_PHYSICAL') {
      testValidity = 'VALID_CALIBRATED';
    } else {
      testValidity = 'PRELIMINARY_UNCALIBRATED';
    }

    if (isIncomplete) {
      testValidity = 'INCONCLUSIVE';
    }

    const hasRedFlags = warningFlags.length > 0;
    const hasWarningFlags = warningFlags.length > 0;
    const completedAt = new Date();

    screening.calibrationDetails = calibrationDetails;
    if (selectedTests) screening.selectedTests = selectedTests;
    if (completedTests) screening.completedTests = completedTests;
    if (skippedTests) screening.skippedTests = skippedTests;

    screening.visualAcuity = {
      rightEye: rightEyeResult,
      leftEye: leftEyeResult,
      rightEyeEstimatedScore: rightEyeResult.snellenEquivalent || 'Pending',
      leftEyeEstimatedScore: leftEyeResult.snellenEquivalent || 'Pending',
      testQuality,
      trials,
    };

    if (nearAcuity) screening.nearAcuity = nearAcuity;
    if (contrastSensitivity) screening.contrastSensitivity = contrastSensitivity;
    if (colourVision) screening.colourVision = colourVision;
    if (amslerAssessment) screening.amslerAssessment = amslerAssessment;

    screening.operatorObservations = operatorObservations 
      ? (incompleteReason ? `${operatorObservations} [Incomplete reason: ${incompleteReason}]` : operatorObservations)
      : incompleteReason || '';
    screening.warningFlags = warningFlags;
    screening.hasRedFlags = hasRedFlags;
    screening.testValidity = testValidity;
    screening.status = isIncomplete ? 'INCOMPLETE' : 'COMPLETED';
    screening.professionalReviewStatus = 'PENDING_REVIEW';
    screening.completedAt = completedAt;
    screening.disclaimer = CLINICAL_DISCLAIMER_EN;

    if (isConnectedToDb) {
      await screening.save();

      // Update customer workflow and summary
      await Customer.updateOne(
        { customerId: screening.customerId },
        { 
          workflowStatus: 'SCREENING_COMPLETED',
          screeningSummary: {
            rightEyeAcuity: rightEyeResult.snellenEquivalent || 'Not Tested',
            leftEyeAcuity: leftEyeResult.snellenEquivalent || 'Not Tested',
            amslerAbnormal,
            hasWarningFlags,
            aiSummarySnippet: `Preliminary screening completed (${testValidity}). OD: ${rightEyeResult.snellenEquivalent || 'N/A'}, OS: ${leftEyeResult.snellenEquivalent || 'N/A'}. Contrast: ${contrastSensitivity?.contrastGrade || 'N/A'}, Colour: ${colourVision?.classification || 'N/A'}.`,
          }
        }
      );
    } else {
      screening.updatedAt = completedAt.toISOString();

      const targetCustomer = SEED_CUSTOMERS.find(c => c.customerId === screening.customerId);
      if (targetCustomer) {
        targetCustomer.workflowStatus = 'SCREENING_COMPLETED';
        targetCustomer.screeningSummary = {
          rightEyeAcuity: rightEyeResult.snellenEquivalent || 'Not Tested',
          leftEyeAcuity: leftEyeResult.snellenEquivalent || 'Not Tested',
          amslerAbnormal,
          hasWarningFlags,
          aiSummarySnippet: `Preliminary screening completed (${testValidity}). OD: ${rightEyeResult.snellenEquivalent || 'N/A'}, OS: ${leftEyeResult.snellenEquivalent || 'N/A'}.`,
        };
      }
    }

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'SCREENING_COMPLETED',
      resourceType: 'SCREENING',
      resourceId: screening.screeningId,
      details: {
        testValidity,
        hasRedFlags,
        rightEyeScore: rightEyeResult.snellenEquivalent,
        leftEyeScore: leftEyeResult.snellenEquivalent,
      },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Vision screening evaluation completed successfully',
      data: screening,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

/**
 * Optometrist / Ophthalmologist Clinical Review Sign-Off
 */
export const reviewScreening = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Authorization check: Must be optometrist, specialist doctor, or admin
  const allowedRoles = ['ADMIN', 'SPECIALIST_DOCTOR', 'OPTOMETRIST'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: { code: 'UNAUTHORIZED_REVIEWER', message: 'Only qualified eye-care professionals or administrators can sign off clinical reviews.' },
    });
  }

  const parseResult = professionalReviewSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { clinicalDecision, urgency, notes, provisionalRecommendations, licenseNumber } = parseResult.data;

  try {
    let screening: any = null;
    if (isConnectedToDb) {
      screening = await Screening.findOne({
        $or: [{ screeningId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    } else {
      screening = IN_MEMORY_SCREENINGS.find(s => s.screeningId === id || s.id === id);
    }

    if (!screening) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Screening record with ID '${id}' not found.` },
      });
    }

    const reviewData = {
      reviewedBy: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
        licenseNumber: licenseNumber || 'OPT-REG-IN-2026',
      },
      reviewedAt: new Date(),
      clinicalDecision,
      urgency,
      notes,
      provisionalRecommendations,
    };

    screening.professionalReview = reviewData;
    screening.professionalReviewStatus = 'REVIEWED';

    if (isConnectedToDb) {
      await screening.save();
      await Customer.updateOne(
        { customerId: screening.customerId },
        { workflowStatus: 'REVIEWED' }
      );
    } else {
      screening.updatedAt = new Date().toISOString();
      const targetCustomer = SEED_CUSTOMERS.find(c => c.customerId === screening.customerId);
      if (targetCustomer) {
        targetCustomer.workflowStatus = 'REVIEWED';
      }
    }

    logAuditEvent({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'SCREENING_PROFESSIONAL_REVIEWED',
      resourceType: 'SCREENING',
      resourceId: screening.screeningId,
      details: { clinicalDecision, urgency, reviewerId: req.user.id },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Optometrist clinical review successfully signed off',
      data: screening,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const listScreenings = async (req: AuthenticatedRequest, res: Response) => {
  const { storeId, status, reviewStatus, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 20;

  try {
    let records: any[] = [];
    let total = 0;

    const query: Record<string, any> = {};

    if (req.user?.role === 'STORE_OPERATOR') {
      query.storeId = req.user.storeId;
    } else if (storeId) {
      query.storeId = storeId;
    }

    if (status) query.status = status;
    if (reviewStatus) query.professionalReviewStatus = reviewStatus;

    if (isConnectedToDb) {
      total = await Screening.countDocuments(query);
      records = await Screening.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
    } else {
      let filtered = [...IN_MEMORY_SCREENINGS];
      if (query.storeId) {
        filtered = filtered.filter(s => s.storeId === query.storeId);
      }
      if (query.status) {
        filtered = filtered.filter(s => s.status === query.status);
      }
      if (query.professionalReviewStatus) {
        filtered = filtered.filter(s => s.professionalReviewStatus === query.professionalReviewStatus);
      }
      total = filtered.length;
      records = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    }

    return res.status(200).json({
      success: true,
      data: records,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

/**
 * Generates an executive, print-optimized HTML clinical report covering all 5 modules
 */
export const getScreeningPdfReport = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let screening: any = null;
    if (isConnectedToDb) {
      screening = await Screening.findOne({
        $or: [{ screeningId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    }

    if (!screening) {
      screening = IN_MEMORY_SCREENINGS.find(s => s.screeningId === id || s.id === id);
    }

    if (!screening) {
      return res.status(404).send('<h1>Screening Record Not Found</h1>');
    }

    if (req.user?.role === 'STORE_OPERATOR' && screening.storeId !== req.user.storeId) {
      return res.status(403).send('<h1>Access Denied: Cross-store report access prohibited.</h1>');
    }

    let customer: any = null;
    if (isConnectedToDb) {
      customer = await Customer.findOne({ customerId: screening.customerId });
    }
    if (!customer) {
      customer = SEED_CUSTOMERS.find(c => c.customerId === screening.customerId) || {
        fullName: screening.customerName || 'Customer',
        customerId: screening.customerId,
        age: 'N/A',
        gender: 'N/A',
      };
    }

    const review = screening.professionalReview;

    // Query associated clinical eye photographs
    let eyeImages: any[] = [];
    const custId = screening.customerId || customer.customerId || customer.customerCode;
    if (isConnectedToDb) {
      try {
        eyeImages = await EyeImage.find({
          $or: [{ customerId: custId }, { customerCode: custId }],
          isArchived: { $ne: true },
        }).lean();
      } catch {
        // Non-blocking
      }
    }
    if (!eyeImages.length) {
      eyeImages = IN_MEMORY_EYE_IMAGES.filter(
        (img) => img.customerId === custId || img.customerCode === custId
      );
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VisionBridge Comprehensive Screening Report - ${screening.screeningId}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.45; font-size: 11px; margin: 0; padding: 15px; }
    .header { border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 20px; font-weight: bold; color: #0f172a; }
    .brand span { color: #0d9488; }
    .report-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
    .card-title { font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; display: flex; justify-content: space-between; }
    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .label { color: #64748b; font-weight: 500; }
    .val { font-weight: 600; color: #0f172a; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
    .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-teal { background: #ccfbf1; color: #115e59; border: 1px solid #99f6e4; }
    .badge-rose { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10.5px; }
    th { background: #f1f5f9; text-align: left; padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 5px 6px; border: 1px solid #e2e8f0; }
    .disclaimer-box { background: #f8fafc; border-left: 3px solid #0d9488; padding: 8px; border-radius: 4px; margin-top: 14px; font-size: 9.5px; color: #334155; }
    .warning-box { background: #fff1f2; border-left: 3px solid #e11d48; padding: 8px; border-radius: 4px; margin-bottom: 10px; color: #881337; font-weight: 500; font-size: 10.5px; }
    .review-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px; margin-top: 10px; }
    .no-print { margin-bottom: 12px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="padding: 6px 14px; background: #0d9488; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="brand">Vision<span>Bridge</span></div>
      <div style="font-size: 10px; color: #64748b;">Preliminary Vision Screening & Tele-Optometry Network</div>
    </div>
    <div style="text-align: right;">
      <div class="report-title">Comprehensive Screening Report</div>
      <div style="font-family: monospace; font-size: 11px; font-weight: bold;">${screening.screeningId}</div>
      <div style="font-size: 10px; color: #64748b;">Conducted: ${new Date(screening.completedAt || screening.createdAt).toLocaleDateString()}</div>
    </div>
  </div>

  ${screening.hasRedFlags ? `
  <div class="warning-box">
    <strong>⚠️ CAUTION - RED FLAGS / CLINICAL ALERTS OBSERVED:</strong><br/>
    ${(screening.warningFlags || []).join(' • ')}<br/>
    <em>In-person comprehensive evaluation by an eye care professional strongly recommended.</em>
  </div>` : ''}

  <div class="meta-grid">
    <div class="card">
      <div class="card-title">Customer Information</div>
      <div class="row"><span class="label">Name:</span><span class="val">${customer.fullName || customer.name}</span></div>
      <div class="row"><span class="label">Customer Code:</span><span class="val">${customer.customerId || customer.customerCode}</span></div>
      <div class="row"><span class="label">Age / Gender:</span><span class="val">${customer.age} yrs / ${customer.gender}</span></div>
      <div class="row"><span class="label">Center:</span><span class="val">${screening.storeName || screening.storeId}</span></div>
    </div>

    <div class="card">
      <div class="card-title">Calibration & Test Validity</div>
      <div class="row"><span class="label">Protocol Version:</span><span class="val">${screening.protocolVersion}</span></div>
      <div class="row"><span class="label">Validity Status:</span><span class="val">
        <span class="badge ${screening.testValidity === 'VALID_CALIBRATED' ? 'badge-teal' : 'badge-amber'}">${screening.testValidity}</span>
      </span></div>
      <div class="row"><span class="label">Display Calibration:</span><span class="val">${screening.calibrationDetails?.calibrationStatus || 'UNCALIBRATED'}</span></div>
      <div class="row"><span class="label">Distance Confirmed:</span><span class="val">${screening.calibrationDetails?.confirmedDistanceMeters || 3.0}m (Distance) / 40cm (Near)</span></div>
    </div>
  </div>

  <!-- MODULE A: Distance Visual Acuity -->
  <div class="card">
    <div class="card-title">
      <span>Module A: Distance Visual Acuity (3 Meters)</span>
      <span class="badge badge-teal">Acuity</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Eye Tested</th>
          <th>Preliminary Level</th>
          <th>Snellen Equivalent</th>
          <th>Trials (Correct / Total)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Right Eye (OD)</strong></td>
          <td>${screening.visualAcuity?.rightEye?.preliminaryScore || 'Not Tested'}</td>
          <td><strong>${screening.visualAcuity?.rightEye?.snellenEquivalent || 'Pending'}</strong></td>
          <td>${screening.visualAcuity?.rightEye?.correctTrials || 0} / ${screening.visualAcuity?.rightEye?.totalTrials || 0}</td>
          <td>${screening.visualAcuity?.rightEye?.status || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Left Eye (OS)</strong></td>
          <td>${screening.visualAcuity?.leftEye?.preliminaryScore || 'Not Tested'}</td>
          <td><strong>${screening.visualAcuity?.leftEye?.snellenEquivalent || 'Pending'}</strong></td>
          <td>${screening.visualAcuity?.leftEye?.correctTrials || 0} / ${screening.visualAcuity?.leftEye?.totalTrials || 0}</td>
          <td>${screening.visualAcuity?.leftEye?.status || 'N/A'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- MODULE B: Near Visual Acuity -->
  ${screening.nearAcuity?.tested ? `
  <div class="card">
    <div class="card-title">
      <span>Module B: Near Visual Acuity (40 cm Reading Distance)</span>
      <span class="badge badge-teal">Reading</span>
    </div>
    <div class="row"><span class="label">Right Eye (OD):</span><span class="val">${screening.nearAcuity.rightEyeScore || 'Not Evaluated'}</span></div>
    <div class="row"><span class="label">Left Eye (OS):</span><span class="val">${screening.nearAcuity.leftEyeScore || 'Not Evaluated'}</span></div>
    <div class="row"><span class="label">Binocular (OU):</span><span class="val">${screening.nearAcuity.binocularScore || 'Not Evaluated'}</span></div>
  </div>` : ''}

  <!-- MODULE C: Contrast Sensitivity -->
  ${screening.contrastSensitivity?.tested ? `
  <div class="card">
    <div class="card-title">
      <span>Module C: Contrast Sensitivity (Weber Contrast Steps)</span>
      <span class="badge badge-blue">Functional</span>
    </div>
    <div class="row"><span class="label">LogCS Score:</span><span class="val">${screening.contrastSensitivity.logCSScore} LogCS (Weber: ${screening.contrastSensitivity.weberContrastPct}%)</span></div>
    <div class="row"><span class="label">Grading:</span><span class="val"><strong>${screening.contrastSensitivity.contrastGrade}</strong></span></div>
    <div style="font-size: 9.5px; color: #64748b; margin-top: 3px;">* ${CONTRAST_PROTOTYPE_NOTICE_EN}</div>
  </div>` : ''}

  <!-- MODULE D: Colour Vision Assessment -->
  ${screening.colourVision?.tested ? `
  <div class="card">
    <div class="card-title">
      <span>Module D: Colour Vision Assessment (Pseudoisochromatic Simulation)</span>
      <span class="badge badge-blue">Plates</span>
    </div>
    <div class="row"><span class="label">Plates Correct:</span><span class="val">${screening.colourVision.platesCorrect} / ${screening.colourVision.platesTotal}</span></div>
    <div class="row"><span class="label">Classification:</span><span class="val"><strong>${screening.colourVision.classification}</strong></span></div>
    <div style="font-size: 9.5px; color: #64748b; margin-top: 3px;">* ${COLOUR_PROTOTYPE_NOTICE_EN}</div>
  </div>` : ''}

  <!-- MODULE E: Amsler Grid Assessment -->
  ${screening.amslerAssessment?.performed ? `
  <div class="card">
    <div class="card-title">
      <span>Module E: Amsler Grid Assessment (Macular Function Check)</span>
      <span class="badge badge-amber">Macula</span>
    </div>
    <div class="row"><span class="label">Right Eye (OD):</span><span class="val">${screening.amslerAssessment.rightEye?.status || 'Not Evaluated'} ${screening.amslerAssessment.rightEye?.distortionTypes?.length ? `(${screening.amslerAssessment.rightEye.distortionTypes.join(', ')})` : ''}</span></div>
    <div class="row"><span class="label">Left Eye (OS):</span><span class="val">${screening.amslerAssessment.leftEye?.status || 'Not Evaluated'} ${screening.amslerAssessment.leftEye?.distortionTypes?.length ? `(${screening.amslerAssessment.leftEye.distortionTypes.join(', ')})` : ''}</span></div>
    ${screening.amslerAssessment.observations ? `<div style="margin-top: 3px; font-size: 10px; color: #475569;"><strong>Notes:</strong> ${screening.amslerAssessment.observations}</div>` : ''}
  </div>` : ''}

  <!-- Operator Observations -->
  ${screening.operatorObservations ? `
  <div class="card">
    <div class="card-title">Store Operator Field Notes</div>
    <div style="font-size: 10.5px; color: #334155;">${screening.operatorObservations}</div>
  </div>` : ''}

  <!-- Optometrist Clinical Review -->
  ${review ? `
  <div class="review-box">
    <div style="font-weight: bold; font-size: 11px; color: #166534; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #bbf7d0; padding-bottom: 3px;">
      ✅ Optometrist Clinical Review Sign-Off
    </div>
    <div class="row"><span class="label">Reviewer:</span><span class="val">${review.reviewedBy.name} (${review.reviewedBy.role} • Reg #${review.reviewedBy.licenseNumber || 'N/A'})</span></div>
    <div class="row"><span class="label">Reviewed Date:</span><span class="val">${new Date(review.reviewedAt).toLocaleDateString()}</span></div>
    <div class="row"><span class="label">Clinical Decision:</span><span class="val"><strong>${review.clinicalDecision}</strong></span></div>
    <div class="row"><span class="label">Urgency:</span><span class="val"><span class="badge badge-amber">${review.urgency}</span></span></div>
    <div style="margin-top: 6px; font-size: 10.5px; color: #1e293b;"><strong>Review Notes:</strong> ${review.notes}</div>
    ${review.provisionalRecommendations?.length ? `
    <div style="margin-top: 4px; font-size: 10px; color: #334155;">
      <strong>Recommendations:</strong> ${review.provisionalRecommendations.join(' • ')}
    </div>` : ''}
  </div>` : `
  <div class="card" style="border: 1px dashed #cbd5e1; background: #fafafa;">
    <div class="card-title">Optometrist Clinical Sign-Off (Pending)</div>
    <div style="display: flex; justify-content: space-between; margin-top: 25px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
      <div>Reviewer Name & Registration: ___________________________</div>
      <div>Signature & Date: ___________________________</div>
    </div>
  </div>`}

  <!-- APPENDIX: CLINICAL EYE PHOTOGRAPHS -->
  ${eyeImages.length > 0 ? `
  <div class="card" style="margin-top: 14px;">
    <div class="card-title">
      <span>Appendix: Clinical Eye Photographs & Tele-Triage Observations (${eyeImages.length})</span>
      <span class="badge badge-blue">Imaging</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-top: 8px;">
      ${eyeImages.map(img => `
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: white;">
          <div style="font-weight: bold; font-size: 10.5px; color: #0f172a; margin-bottom: 2px;">
            ${img.eyeSide === 'RIGHT' ? 'Right Eye (OD)' : img.eyeSide === 'LEFT' ? 'Left Eye (OS)' : img.eyeSide} - ${img.imageType.replace(/_/g, ' ')}
          </div>
          <div style="font-size: 9.5px; color: #64748b; margin-bottom: 4px;">
            Captured: ${new Date(img.captureDate).toLocaleDateString()} • Consent: Obtained
          </div>
          ${img.clinicalContext ? `<div style="font-size: 9.5px; color: #334155; margin-bottom: 3px;"><strong>Context:</strong> ${img.clinicalContext}</div>` : ''}
          ${img.description ? `<div style="font-size: 9.5px; color: #475569; margin-bottom: 3px;"><strong>Notes:</strong> ${img.description}</div>` : ''}
          ${img.reviews?.length ? `
            <div style="font-size: 9.5px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 3px 5px; color: #166534; margin-top: 3px;">
              <strong>Optometrist Sign-off:</strong> ${img.reviews[0].status} — "${img.reviews[0].observations}"
            </div>
          ` : `
            <div style="font-size: 9px; color: #d97706; background: #fffbeb; padding: 2px 4px; border-radius: 4px; border: 1px solid #fef3c7;">
              Tele-Optometry Review Pending
            </div>
          `}
        </div>
      `).join('')}
    </div>
    <div style="font-size: 9px; color: #64748b; margin-top: 6px;">
      * Original high-resolution photographs are securely stored on private encrypted server disk and reviewable through the authenticated VisionBridge tele-optometry viewer.
    </div>
  </div>` : ''}

  <div class="disclaimer-box">
    <strong>MANDATORY PRELIMINARY SCREENING DISCLAIMER:</strong><br/>
    ${CLINICAL_DISCLAIMER_EN}<br/>
    ${UNCALIBRATED_LIMITATION_NOTICE_EN}<br/><br/>
    <em>Operator: ${screening.conductedBy?.name} (ID: ${screening.conductedBy?.id}) • Tele-Optometry Review Status: ${screening.professionalReviewStatus}</em>
  </div>
</body>
</html>
    `;

    return res.status(200).send(html);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).send(`<h1>Error Generating Report: ${msg}</h1>`);
  }
};
