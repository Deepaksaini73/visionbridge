/**
 * VisionBridge Preliminary Vision Screening Feature Types
 */

export type ScreeningModuleId = 
  | 'DISTANCE_ACUITY' 
  | 'NEAR_ACUITY' 
  | 'CONTRAST_SENSITIVITY' 
  | 'COLOUR_VISION' 
  | 'AMSLER_GRID';

export interface ScreeningModuleMeta {
  id: ScreeningModuleId;
  nameEn: string;
  nameHi: string;
  category: string;
  priority: 'VERY_HIGH' | 'HIGH' | 'MEDIUM';
  estimatedDurationMins: number;
  descriptionEn: string;
  descriptionHi: string;
  defaultSelected: boolean;
}

export type TumblingEDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type LandoltCDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type EyeTested = 'RIGHT' | 'LEFT' | 'BOTH';
export type CalibrationStatus = 'CALIBRATED_PHYSICAL' | 'APPROXIMATE_ESTIMATE' | 'UNCALIBRATED';
export type OptotypeType = 'TUMBLING_E' | 'LANDOLT_C' | 'SLOAN';

export type AmslerResultStatus = 
  | 'NO_DISTORTION' 
  | 'WAVY_LINES' 
  | 'MISSING_AREAS' 
  | 'BLURRED_AREAS' 
  | 'OTHER' 
  | 'UNABLE_TO_COMPLETE';

export type AmslerSector = 'CENTRAL' | 'SUPERIOR' | 'INFERIOR' | 'NASAL' | 'TEMPORAL';

export interface DeviceCalibrationState {
  deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP';
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  calibrationStatus: CalibrationStatus;
  pixelsPerMm?: number;
  configuredDistanceMeters: number;
  confirmedDistanceMeters: number;
  ambientLighting: 'CONFIRMED_ADEQUATE' | 'DIM' | 'EXCESSIVE_GLARE';
}

export interface DistanceAcuityTrial {
  eye: 'RIGHT' | 'LEFT' | 'BOTH';
  level: number;
  optotypeLevel: string;
  directionPresented: TumblingEDirection;
  userResponse: TumblingEDirection;
  isCorrect: boolean;
  reactionTimeMs?: number;
  trialIndex?: number;
}

export interface DistanceEyeResult {
  tested: boolean;
  preliminaryScore: string;
  rawLevel: number;
  snellenEquivalent?: string;
  totalTrials: number;
  correctTrials: number;
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: DistanceAcuityTrial[];
}

export interface NearAcuityTrial {
  eye: 'RIGHT' | 'LEFT' | 'BOTH';
  level: number;
  nPoint: string;
  isCorrect: boolean;
  userResponse?: string;
}

export interface NearAcuityResult {
  tested: boolean;
  rightEyeScore?: string;
  leftEyeScore?: string;
  binocularScore?: string;
  testedDistanceCm: number;
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: NearAcuityTrial[];
}

export interface ContrastTrial {
  step: number;
  weberContrastPct: number;
  directionPresented?: TumblingEDirection;
  userResponse?: TumblingEDirection;
  isCorrect: boolean;
}

export interface ContrastSensitivityResult {
  tested: boolean;
  logCSScore: number;
  weberContrastPct: number;
  contrastGrade: 'NORMAL' | 'MILD_REDUCTION' | 'MODERATE_REDUCTION' | 'SEVERE_REDUCTION';
  testedEye: 'RIGHT' | 'LEFT' | 'BINOCULAR';
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: ContrastTrial[];
}

export interface ColourVisionTrial {
  plateIndex: number;
  plateType: string;
  expectedDigit: string;
  userResponse: string;
  isCorrect: boolean;
}

export interface ColourVisionResult {
  tested: boolean;
  platesTotal: number;
  platesCorrect: number;
  classification: 'NORMAL_TRICHROMAT' | 'RED_GREEN_DEFICIENCY_SUSPECTED' | 'TOTAL_DEFICIENCY_SUSPECTED' | 'INCONCLUSIVE';
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: ColourVisionTrial[];
}

export interface AmslerEyeResult {
  tested: boolean;
  status: AmslerResultStatus;
  distortionTypes: string[];
  sectorsAffected?: string[];
  notes?: string;
}

export interface AmslerAssessmentResult {
  performed: boolean;
  rightEye: AmslerEyeResult;
  leftEye: AmslerEyeResult;
  observations?: string;
}

export interface ProfessionalReviewData {
  reviewedBy: {
    id: string;
    name: string;
    role: string;
    licenseNumber?: string;
  };
  reviewedAt: string;
  clinicalDecision: 'ROUTINE_MONITORING' | 'OPHTHALMIC_REFERRAL' | 'RETEST_RECOMMENDED' | 'INCONCLUSIVE';
  urgency: 'ROUTINE' | 'PROMPT_1_2_WEEKS' | 'URGENT_24_48_HOURS';
  notes: string;
  provisionalRecommendations: string[];
}

export interface ScreeningSessionRecord {
  _id?: string;
  id?: string;
  screeningId: string;
  customerId: string;
  customerCode?: string;
  storeId: string;
  storeName?: string;
  conductedBy: {
    id: string;
    name: string;
  };
  interviewId?: string;
  protocolVersion: string;
  selectedTests: ScreeningModuleId[];
  completedTests: ScreeningModuleId[];
  skippedTests: ScreeningModuleId[];
  calibrationDetails: DeviceCalibrationState;
  visualAcuity: {
    rightEye: DistanceEyeResult;
    leftEye: DistanceEyeResult;
    binocular?: DistanceEyeResult;
    rightEyeEstimatedScore: string;
    leftEyeEstimatedScore: string;
    testQuality: 'GOOD' | 'FAIR' | 'UNRELIABLE';
    optotypeUsed?: OptotypeType;
    trials: DistanceAcuityTrial[];
  };
  nearAcuity?: NearAcuityResult;
  contrastSensitivity?: ContrastSensitivityResult;
  colourVision?: ColourVisionResult;
  amslerAssessment?: AmslerAssessmentResult;
  operatorObservations?: string;
  warningFlags: string[];
  hasRedFlags: boolean;
  testValidity: 'VALID_CALIBRATED' | 'PRELIMINARY_UNCALIBRATED' | 'INVALID_CONDITIONS' | 'INCONCLUSIVE';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'INCOMPLETE' | 'ABORTED';
  professionalReviewStatus: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'REVIEWED';
  professionalReview?: ProfessionalReviewData;
  disclaimer: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
