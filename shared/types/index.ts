/**
 * VisionBridge Shared TypeScript Domain Types & Interfaces
 * Shared between Server and Client for end-to-end type safety.
 */

// ==========================================
// 1. User & Authentication Types
// ==========================================

export type UserRole = 'STORE_OPERATOR' | 'OPTOMETRIST' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string;
  storeName?: string;
  phone?: string;
  licenseNumber?: string; // For optometrists
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: string;
}

// ==========================================
// 2. Store Types
// ==========================================

export interface StoreLocation {
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface StoreEntity {
  id: string;
  code: string; // e.g. "ST-AP-CHITTOOR-01"
  name: string;
  location: StoreLocation;
  contactNumber?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. Customer & Demographic Types
// ==========================================

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type CustomerLanguage = 'en' | 'hi';

export type CustomerWorkflowStatus = 
  | 'REGISTERED' 
  | 'INTERVIEW_IN_PROGRESS' 
  | 'INTERVIEW_COMPLETED' 
  | 'SCREENING_IN_PROGRESS' 
  | 'SCREENING_COMPLETED' 
  | 'PENDING_REVIEW' 
  | 'REVIEWED' 
  | 'REFERRAL_REQUIRED' 
  | 'RETEST_REQUESTED';

export type CustomerStatus = CustomerWorkflowStatus;

export interface CustomerDemographics {
  id: string;
  customerId: string; // e.g. "VB-2026-0101"
  customerCode: string; // alias
  clientUuid: string;
  name: string;
  fullName: string;
  profilePhotoUrl?: string;
  age: number;
  dateOfBirth?: string;
  gender: Gender;
  contactNumber?: string;
  phone?: string;
  preferredLanguage: CustomerLanguage;
  storeId: string;
  storeName?: string;
  consentStatus: boolean;
  consentGiven: boolean;
  consentTimestamp: string;
  workflowStatus: CustomerWorkflowStatus;
  status: CustomerStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  screeningSummary?: {
    rightEyeAcuity: string;
    leftEyeAcuity: string;
    amslerAbnormal: boolean;
    hasWarningFlags: boolean;
    aiSummarySnippet: string;
  };
}

// ==========================================
// 4. Voice-First Interview Types
// ==========================================

export type SymptomCategory = 
  | 'NEAR_VISION' 
  | 'DISTANCE_VISION' 
  | 'BLURRED_VISION' 
  | 'EYE_STRAIN' 
  | 'HEADACHE' 
  | 'RED_FLAG_URGENT' 
  | 'LIFESTYLE';

export interface InterviewQuestion {
  id: string;
  category: SymptomCategory;
  textEn: string;
  textHi: string;
  isRedFlagTrigger?: boolean;
  options: {
    value: string;
    labelEn: string;
    labelHi: string;
    triggersAdditionalQuestions?: string[];
    isUrgentFlag?: boolean;
  }[];
}

export type InterviewInputMethod = 'VOICE' | 'TEXT' | 'OPTION_CLICK';

export interface CustomerInterviewResponse {
  questionId: string;
  sectionId?: string;
  questionText: string;
  voiceTranscript?: string;
  selectedOption: string;
  selectedOptionLabel: string;
  category: SymptomCategory;
  inputMethod?: InterviewInputMethod;
  isRedFlag: boolean;
  answeredAt: string;
}

export interface InterviewWarningFlag {
  flagType: string;
  questionId: string;
  severity: 'URGENT' | 'WARNING';
  descriptionEn: string;
  descriptionHi: string;
}

export interface StructuredInterviewSummary {
  reportedDifficulties: string[];
  nearVisionConcerns: string[];
  distanceVisionConcerns: string[];
  spectacleHistory: string;
  duration: string;
  warningSymptoms: string[];
  skippedQuestions?: string[];
  aiSummarySnippet?: string;
  isAiGenerated?: boolean;
  generatedAt: string;
}

export interface VoiceInterviewSession {
  id: string;
  interviewId?: string;
  customerId: string;
  customerCode?: string;
  storeId?: string;
  conductedBy?: {
    id: string;
    name: string;
  };
  language: CustomerLanguage;
  status: 'IN_PROGRESS' | 'COMPLETED';
  completedSections?: string[];
  hasRedFlags: boolean;
  redFlagReason?: string;
  warningFlags?: InterviewWarningFlag[];
  summary?: StructuredInterviewSummary;
  responses: CustomerInterviewResponse[];
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
}

// ==========================================
// 5. Preliminary Vision Screening Types
// ==========================================

export type EyeTested = 'RIGHT' | 'LEFT' | 'BOTH';
export type TumblingEDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type CalibrationStatus = 'CALIBRATED_PHYSICAL' | 'APPROXIMATE_ESTIMATE' | 'UNCALIBRATED';
export type ScreeningStatus = 'IN_PROGRESS' | 'COMPLETED' | 'INCOMPLETE' | 'ABORTED';
export type TestValidity = 'VALID_CALIBRATED' | 'PRELIMINARY_UNCALIBRATED' | 'INVALID_CONDITIONS' | 'INCONCLUSIVE';
export type ProfessionalReviewStatus = 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'REVIEWED';

export type AmslerResultStatus = 
  | 'NO_DISTORTION' 
  | 'WAVY_LINES' 
  | 'MISSING_AREAS' 
  | 'BLURRED_AREAS' 
  | 'OTHER' 
  | 'UNABLE_TO_COMPLETE';

export interface TumblingETrial {
  eye: EyeTested;
  level: number; // 1 to 7
  optotypeLevel: string; // e.g. "6/60", "6/36", "6/24", "6/18", "6/12", "6/9", "6/6"
  directionPresented: TumblingEDirection;
  userResponse: TumblingEDirection;
  isCorrect: boolean;
  reactionTimeMs?: number;
  trialIndex?: number;
}

export interface EyeAcuityResult {
  tested: boolean;
  preliminaryScore: string; // e.g. "Level 5 (~6/12 equiv)"
  rawLevel: number; // smallest level passed (1-7)
  snellenEquivalent?: string; // e.g. "6/12"
  totalTrials: number;
  correctTrials: number;
  status: 'COMPLETED' | 'INCOMPLETE' | 'UNABLE_TO_TEST';
  trials: TumblingETrial[];
}

export interface VisualAcuityObservation {
  rightEye: EyeAcuityResult;
  leftEye: EyeAcuityResult;
  binocular?: EyeAcuityResult;
  rightEyeEstimatedScore: string; // compatibility alias
  leftEyeEstimatedScore: string;  // compatibility alias
  trials: TumblingETrial[];       // all trials combined
  testQuality: 'GOOD' | 'FAIR' | 'UNRELIABLE';
}

export interface AmslerGridEyeResult {
  tested: boolean;
  status: AmslerResultStatus;
  distortionTypes: string[];
  notes?: string;
}

export interface AmslerAssessment {
  performed: boolean;
  rightEye: AmslerGridEyeResult;
  leftEye: AmslerGridEyeResult;
  rightEyeNormal?: boolean;
  leftEyeNormal?: boolean;
  observations?: string;
  comments?: string;
}

export interface AmslerGridObservation {
  rightEyeNormal: boolean;
  rightEyeDistortions?: string[];
  leftEyeNormal: boolean;
  leftEyeDistortions?: string[];
  comments?: string;
}

export interface DeviceScreenCalibration {
  deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP';
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  calibrationStatus: CalibrationStatus;
  pixelsPerMm?: number;
  configuredDistanceMeters: number;
  confirmedDistanceMeters: number;
  ambientLighting: 'CONFIRMED_ADEQUATE' | 'DIM' | 'EXCESSIVE_GLARE';
  screenPixelsPerInch?: number;
  calibratedDistanceCm?: number;
}

export interface VisionScreeningData {
  id: string;
  screeningId: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  storeId: string;
  storeName?: string;
  conductedBy: {
    id: string;
    name: string;
  };
  interviewId?: string;
  protocolVersion: string;
  calibration: DeviceScreenCalibration;
  calibrationDetails?: DeviceScreenCalibration;
  visualAcuity: VisualAcuityObservation;
  amslerGrid?: AmslerGridObservation;
  amslerAssessment?: AmslerAssessment;
  operatorObservations?: string;
  warningFlags: string[];
  hasRedFlags: boolean;
  testValidity: TestValidity;
  status: ScreeningStatus;
  professionalReviewStatus: ProfessionalReviewStatus;
  disclaimer: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 6. AI-Assisted Profile & Clinician Review
// ==========================================

export interface AISummaryProfile {
  generatedAt: string;
  isFallback: boolean; // True if generated via deterministic template rather than Gemini API
  keyObservations: string[];
  lifestyleRiskFactors: string[];
  urgencyLevel: 'ROUTINE' | 'MODERATE' | 'URGENT';
  suggestedReviewFocus: string;
}

export interface ClinicianReviewData {
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  licenseNumber?: string;
  reviewTimestamp: string;
  clinicalNotes: string;
  decision: 'ROUTINE_OBSERVATION' | 'REFERRAL_RECOMMENDED' | 'RETEST_REQUESTED';
  referralFacility?: string;
  urgency: 'ROUTINE' | 'PRIORITY' | 'IMMEDIATE';
  retestInstructions?: string;
}

export interface CompleteVisionProfile {
  customer: CustomerDemographics;
  interview?: VoiceInterviewSession;
  screening?: VisionScreeningData;
  aiSummary?: AISummaryProfile;
  review?: ClinicianReviewData;
  disclaimer: string;
}

// ==========================================
// 7. Offline Synchronization Types
// ==========================================

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SyncQueueItem {
  id: string;
  clientUuid: string;
  entityType: 'CUSTOMER' | 'INTERVIEW' | 'SCREENING';
  payload: unknown;
  status: SyncStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  syncedAt?: string;
}

// ==========================================
// 8. Security & Audit Types
// ==========================================

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// ==========================================
// 9. Standard API Envelopes
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    isDemoData?: boolean;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ==========================================
// 10. Clinical Eye Imaging Types
// ==========================================

export type EyeSide = 'RIGHT' | 'LEFT' | 'BOTH' | 'NOT_SPECIFIED';
export type ClinicalImageType = 
  | 'EXTERNAL_PHOTO' 
  | 'GAZE_DIRECTION' 
  | 'ANTERIOR_SEGMENT_SLIT_LAMP' 
  | 'FUNDUS_RETINAL' 
  | 'OTHER';

export type GazeDirection = 
  | 'PRIMARY' 
  | 'UP' 
  | 'DOWN' 
  | 'LEFT' 
  | 'RIGHT' 
  | 'UP_RIGHT' 
  | 'UP_LEFT' 
  | 'DOWN_RIGHT' 
  | 'DOWN_LEFT';

export interface EyeImageReviewRecord {
  reviewId: string;
  reviewedBy: {
    id: string;
    name: string;
    role: string;
    licenseNumber?: string;
  };
  reviewedAt: string;
  observations: string;
  recommendations: string[];
  status: 'NORMAL' | 'SUSPECTED_PATHOLOGY' | 'INCONCLUSIVE' | 'POOR_IMAGE_QUALITY';
}

export interface ClinicalEyeImageRecord {
  id?: string;
  _id?: string;
  imageId: string;
  customerId: string;
  customerCode: string;
  storeId: string;
  uploadedBy: {
    id: string;
    name: string;
    role: string;
  };
  imageType: ClinicalImageType;
  eyeSide: EyeSide;
  gazeDirection?: GazeDirection;
  description?: string;
  clinicalContext?: string;
  captureDate: string;
  uploadedAt: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  reviewStatus: 'PENDING_REVIEW' | 'REVIEWED' | 'REFERRAL_REQUIRED';
  reviews: EyeImageReviewRecord[];
  isArchived?: boolean;
}

