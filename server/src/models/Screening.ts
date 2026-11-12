import mongoose, { Schema, Document } from 'mongoose';

export interface ITumblingETrial {
  eye: 'RIGHT' | 'LEFT' | 'BOTH';
  level: number;
  optotypeLevel: string;
  directionPresented: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  userResponse: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  isCorrect: boolean;
  reactionTimeMs?: number;
  trialIndex?: number;
}

export interface IEyeAcuityResult {
  tested: boolean;
  preliminaryScore: string;
  rawLevel: number;
  snellenEquivalent?: string;
  totalTrials: number;
  correctTrials: number;
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: ITumblingETrial[];
}

export interface IScreeningCalibration {
  deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP';
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  calibrationStatus: 'CALIBRATED_PHYSICAL' | 'APPROXIMATE_ESTIMATE' | 'UNCALIBRATED';
  pixelsPerMm?: number;
  configuredDistanceMeters: number;
  confirmedDistanceMeters: number;
  ambientLighting: 'CONFIRMED_ADEQUATE' | 'DIM' | 'EXCESSIVE_GLARE';
}

export interface IAmslerEyeResult {
  tested: boolean;
  status: 'NO_DISTORTION' | 'WAVY_LINES' | 'MISSING_AREAS' | 'BLURRED_AREAS' | 'OTHER' | 'UNABLE_TO_COMPLETE';
  distortionTypes: string[];
  sectorsAffected?: string[]; // 'CENTRAL' | 'SUPERIOR' | 'INFERIOR' | 'NASAL' | 'TEMPORAL'
  notes?: string;
}

export interface IAmslerAssessment {
  performed: boolean;
  rightEye: IAmslerEyeResult;
  leftEye: IAmslerEyeResult;
  observations?: string;
}

export interface INearAcuityTrial {
  eye: 'RIGHT' | 'LEFT' | 'BOTH';
  level: number;
  nPoint: string;
  isCorrect: boolean;
  userResponse?: string;
}

export interface INearAcuityResult {
  tested: boolean;
  rightEyeScore?: string;
  leftEyeScore?: string;
  binocularScore?: string;
  testedDistanceCm: number;
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: INearAcuityTrial[];
}

export interface IContrastTrial {
  step: number;
  weberContrastPct: number;
  directionPresented?: string;
  userResponse?: string;
  isCorrect: boolean;
}

export interface IContrastSensitivityResult {
  tested: boolean;
  logCSScore: number;
  weberContrastPct: number;
  contrastGrade: 'NORMAL' | 'MILD_REDUCTION' | 'MODERATE_REDUCTION' | 'SEVERE_REDUCTION';
  testedEye: 'RIGHT' | 'LEFT' | 'BINOCULAR';
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: IContrastTrial[];
}

export interface IColourVisionTrial {
  plateIndex: number;
  plateType: string;
  expectedDigit: string;
  userResponse: string;
  isCorrect: boolean;
}

export interface IColourVisionResult {
  tested: boolean;
  platesTotal: number;
  platesCorrect: number;
  classification: 'NORMAL_TRICHROMAT' | 'RED_GREEN_DEFICIENCY_SUSPECTED' | 'TOTAL_DEFICIENCY_SUSPECTED' | 'INCONCLUSIVE';
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: IColourVisionTrial[];
}

export interface IProfessionalReview {
  reviewedBy: {
    id: string;
    name: string;
    role: string;
    licenseNumber?: string;
  };
  reviewedAt: Date;
  clinicalDecision: 'ROUTINE_MONITORING' | 'OPHTHALMIC_REFERRAL' | 'RETEST_RECOMMENDED' | 'INCONCLUSIVE';
  urgency: 'ROUTINE' | 'PROMPT_1_2_WEEKS' | 'URGENT_24_48_HOURS';
  notes: string;
  provisionalRecommendations: string[];
}

export interface IScreening extends Document {
  screeningId: string;
  customerId: string;
  customerCode?: string;
  storeId: string;
  conductedBy: {
    id: string;
    name: string;
  };
  interviewId?: string;
  protocolVersion: string;
  selectedTests: string[];
  completedTests: string[];
  skippedTests: string[];
  calibrationDetails: IScreeningCalibration;
  visualAcuity: {
    rightEye: IEyeAcuityResult;
    leftEye: IEyeAcuityResult;
    binocular?: IEyeAcuityResult;
    rightEyeEstimatedScore: string;
    leftEyeEstimatedScore: string;
    testQuality: 'GOOD' | 'FAIR' | 'UNRELIABLE';
    optotypeUsed?: 'TUMBLING_E' | 'LANDOLT_C' | 'SLOAN';
    trials: ITumblingETrial[];
  };
  nearAcuity?: INearAcuityResult;
  contrastSensitivity?: IContrastSensitivityResult;
  colourVision?: IColourVisionResult;
  amslerAssessment?: IAmslerAssessment;
  operatorObservations?: string;
  warningFlags: string[];
  hasRedFlags: boolean;
  testValidity: 'VALID_CALIBRATED' | 'PRELIMINARY_UNCALIBRATED' | 'INVALID_CONDITIONS' | 'INCONCLUSIVE';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'INCOMPLETE' | 'ABORTED';
  professionalReviewStatus: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'REVIEWED';
  professionalReview?: IProfessionalReview;
  disclaimer: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TumblingETrialSchema = new Schema({
  eye: { type: String, enum: ['RIGHT', 'LEFT', 'BOTH'], required: true },
  level: { type: Number, required: true },
  optotypeLevel: { type: String, required: true },
  directionPresented: { type: String, enum: ['UP', 'DOWN', 'LEFT', 'RIGHT'], required: true },
  userResponse: { type: String, enum: ['UP', 'DOWN', 'LEFT', 'RIGHT'], required: true },
  isCorrect: { type: Boolean, required: true },
  reactionTimeMs: { type: Number },
  trialIndex: { type: Number },
}, { _id: false });

const EyeAcuityResultSchema = new Schema({
  tested: { type: Boolean, default: false },
  preliminaryScore: { type: String, default: 'Not Tested' },
  rawLevel: { type: Number, default: 0 },
  snellenEquivalent: { type: String },
  totalTrials: { type: Number, default: 0 },
  correctTrials: { type: Number, default: 0 },
  status: { type: String, enum: ['COMPLETED', 'INCOMPLETE', 'UNABLE_TO_TEST'], default: 'INCOMPLETE' },
  trials: [TumblingETrialSchema],
}, { _id: false });

const AmslerEyeResultSchema = new Schema({
  tested: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['NO_DISTORTION', 'WAVY_LINES', 'MISSING_AREAS', 'BLURRED_AREAS', 'OTHER', 'UNABLE_TO_COMPLETE'],
    default: 'NO_DISTORTION'
  },
  distortionTypes: [String],
  sectorsAffected: [String],
  notes: { type: String },
}, { _id: false });

const NearAcuitySchema = new Schema({
  tested: { type: Boolean, default: false },
  rightEyeScore: { type: String },
  leftEyeScore: { type: String },
  binocularScore: { type: String },
  testedDistanceCm: { type: Number, default: 40 },
  status: { type: String, enum: ['COMPLETED', 'INCOMPLETE', 'UNABLE_TO_TEST'], default: 'INCOMPLETE' },
  trials: [Schema.Types.Mixed],
}, { _id: false });

const ContrastSensitivitySchema = new Schema({
  tested: { type: Boolean, default: false },
  logCSScore: { type: Number, default: 0 },
  weberContrastPct: { type: Number, default: 100 },
  contrastGrade: { 
    type: String, 
    enum: ['NORMAL', 'MILD_REDUCTION', 'MODERATE_REDUCTION', 'SEVERE_REDUCTION'], 
    default: 'NORMAL' 
  },
  testedEye: { type: String, enum: ['RIGHT', 'LEFT', 'BINOCULAR'], default: 'BINOCULAR' },
  status: { type: String, enum: ['COMPLETED', 'INCOMPLETE', 'UNABLE_TO_TEST'], default: 'INCOMPLETE' },
  trials: [Schema.Types.Mixed],
}, { _id: false });

const ColourVisionSchema = new Schema({
  tested: { type: Boolean, default: false },
  platesTotal: { type: Number, default: 4 },
  platesCorrect: { type: Number, default: 0 },
  classification: { 
    type: String, 
    enum: ['NORMAL_TRICHROMAT', 'RED_GREEN_DEFICIENCY_SUSPECTED', 'TOTAL_DEFICIENCY_SUSPECTED', 'INCONCLUSIVE'],
    default: 'NORMAL_TRICHROMAT' 
  },
  status: { type: String, enum: ['COMPLETED', 'INCOMPLETE', 'UNABLE_TO_TEST'], default: 'INCOMPLETE' },
  trials: [Schema.Types.Mixed],
}, { _id: false });

const ProfessionalReviewSchema = new Schema({
  reviewedBy: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    licenseNumber: { type: String },
  },
  reviewedAt: { type: Date, default: Date.now },
  clinicalDecision: { 
    type: String, 
    enum: ['ROUTINE_MONITORING', 'OPHTHALMIC_REFERRAL', 'RETEST_RECOMMENDED', 'INCONCLUSIVE'],
    required: true 
  },
  urgency: { 
    type: String, 
    enum: ['ROUTINE', 'PROMPT_1_2_WEEKS', 'URGENT_24_48_HOURS'],
    default: 'ROUTINE' 
  },
  notes: { type: String, required: true },
  provisionalRecommendations: [String],
}, { _id: false });

const ScreeningSchema = new Schema<IScreening>(
  {
    screeningId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerCode: { type: String },
    storeId: { type: String, required: true, index: true },
    conductedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    interviewId: { type: String },
    protocolVersion: { type: String, default: 'VB-ACUITY-2026.1' },
    selectedTests: { 
      type: [String], 
      default: ['DISTANCE_ACUITY', 'NEAR_ACUITY', 'CONTRAST_SENSITIVITY', 'COLOUR_VISION', 'AMSLER_GRID'] 
    },
    completedTests: { type: [String], default: [] },
    skippedTests: { type: [String], default: [] },
    calibrationDetails: {
      deviceType: { type: String, enum: ['MOBILE', 'TABLET', 'DESKTOP'], default: 'DESKTOP' },
      viewportWidth: { type: Number, default: 1920 },
      viewportHeight: { type: Number, default: 1080 },
      devicePixelRatio: { type: Number, default: 1 },
      calibrationStatus: { 
        type: String, 
        enum: ['CALIBRATED_PHYSICAL', 'APPROXIMATE_ESTIMATE', 'UNCALIBRATED'], 
        default: 'UNCALIBRATED' 
      },
      pixelsPerMm: { type: Number },
      configuredDistanceMeters: { type: Number, default: 3.0 },
      confirmedDistanceMeters: { type: Number, default: 3.0 },
      ambientLighting: { 
        type: String, 
        enum: ['CONFIRMED_ADEQUATE', 'DIM', 'EXCESSIVE_GLARE'], 
        default: 'CONFIRMED_ADEQUATE' 
      },
    },
    visualAcuity: {
      rightEye: { type: EyeAcuityResultSchema, default: () => ({}) },
      leftEye: { type: EyeAcuityResultSchema, default: () => ({}) },
      binocular: { type: EyeAcuityResultSchema },
      rightEyeEstimatedScore: { type: String, default: 'Pending' },
      leftEyeEstimatedScore: { type: String, default: 'Pending' },
      testQuality: { type: String, enum: ['GOOD', 'FAIR', 'UNRELIABLE'], default: 'GOOD' },
      optotypeUsed: { type: String, enum: ['TUMBLING_E', 'LANDOLT_C', 'SLOAN'], default: 'TUMBLING_E' },
      trials: [TumblingETrialSchema],
    },
    nearAcuity: { type: NearAcuitySchema },
    contrastSensitivity: { type: ContrastSensitivitySchema },
    colourVision: { type: ColourVisionSchema },
    amslerAssessment: {
      performed: { type: Boolean, default: false },
      rightEye: { type: AmslerEyeResultSchema, default: () => ({}) },
      leftEye: { type: AmslerEyeResultSchema, default: () => ({}) },
      observations: { type: String },
    },
    operatorObservations: { type: String },
    warningFlags: [String],
    hasRedFlags: { type: Boolean, default: false },
    testValidity: { 
      type: String, 
      enum: ['VALID_CALIBRATED', 'PRELIMINARY_UNCALIBRATED', 'INVALID_CONDITIONS', 'INCONCLUSIVE'],
      default: 'PRELIMINARY_UNCALIBRATED'
    },
    status: { 
      type: String, 
      enum: ['IN_PROGRESS', 'COMPLETED', 'INCOMPLETE', 'ABORTED'],
      default: 'IN_PROGRESS'
    },
    professionalReviewStatus: { 
      type: String, 
      enum: ['PENDING_REVIEW', 'UNDER_REVIEW', 'REVIEWED'],
      default: 'PENDING_REVIEW'
    },
    professionalReview: { type: ProfessionalReviewSchema },
    disclaimer: { 
      type: String, 
      default: 'This is a preliminary vision-screening tool. It does not diagnose eye conditions, determine exact spectacle power, or replace a comprehensive eye examination by a qualified eye-care professional.' 
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const Screening = mongoose.model<IScreening>('Screening', ScreeningSchema);
