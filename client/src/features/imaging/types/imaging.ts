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

export interface ImageUploadPayload {
  customerId: string;
  imageData: string; // base64
  eyeSide: EyeSide;
  imageType: ClinicalImageType;
  gazeDirection?: GazeDirection;
  description?: string;
  clinicalContext?: string;
  captureDate?: string;
  hasConsent: boolean;
  consentText: string;
  consentedBy: string;
}

// ==========================================
// Milestone 5.1: EyeCapture AI Interfaces
// ==========================================

export interface QualityMetrics {
  laplacian_variance: number;
  mean_luminance: number;
  contrast_rms: number;
  underexposed_pct: number;
  overexposed_pct: number;
  resolution: [number, number];
}

export interface EyeQualityAssessment {
  status: 'USABLE_FOR_ANALYSIS' | 'RETAKE_RECOMMENDED' | 'INCONCLUSIVE';
  overall_score: number;
  is_usable: boolean;
  filename: string;
  sharpness_score: number;
  exposure_score: number;
  contrast_score: number;
  metrics: QualityMetrics;
  recapture_guidance: string[];
  assessment_method: string;
  disclaimer: string;
}

export interface LandmarkTelemetry {
  detected: boolean;
  center: [number, number];
  estimated_diameter_px: number;
}

export interface AnatomicalTelemetry {
  iris: LandmarkTelemetry;
  pupil: LandmarkTelemetry;
  pupil_to_iris_ratio: number;
  pupillary_symmetry_flag: string;
}

export interface CoverageMetrics {
  background_pct: number;
  sclera_pct: number;
  iris_pct: number;
  pupil_pct: number;
}

export interface OcularSegmentationData {
  success: boolean;
  filename: string;
  inference_method: string;
  original_dimensions: [number, number];
  coverage: CoverageMetrics;
  telemetry: AnatomicalTelemetry;
  overlay_rgba_base64: string;
  blended_preview_base64: string;
  class_palette: Record<string, string>;
  disclaimer: string;
}

export interface EyeCaptureAiAnalysis {
  success: boolean;
  filename: string;
  quality: EyeQualityAssessment;
  segmentation?: OcularSegmentationData | null;
  halted_due_to_poor_quality: boolean;
  message: string;
}

// ==========================================
// Milestone 5.2B: Adnexal & Alignment Telemetry
// ==========================================

export interface EyeAdnexalMetrics {
  pfh_px: number;
  mrd1_px: number;
  mrd2_px: number;
  iris_diameter_px: number;
  estimated_pfh_mm: number;
  estimated_mrd1_mm: number;
  estimated_mrd2_mm: number;
  iris_center_px: [number, number];
  upper_margin_y_px?: number;
  lower_margin_y_px?: number;
  captured?: boolean;
}

export interface AdnexalTelemetryData {
  success: boolean;
  detected: boolean;
  mode?: 'BILATERAL_FACE_LANDMARKER' | 'UNILATERAL_MACRO_CLOSEUP';
  filename: string;
  original_dimensions: [number, number];
  evaluated_eye?: 'RIGHT' | 'LEFT' | 'BILATERAL' | 'UNILATERAL';
  left_eye?: EyeAdnexalMetrics | null;
  right_eye?: EyeAdnexalMetrics | null;
  unilateral_eye?: EyeAdnexalMetrics;
  interpupillary_distance_px: number;
  estimated_ipd_mm: number;
  pfh_asymmetry_pct?: number | null;
  mrd1_asymmetry_pct?: number | null;
  asymmetry_evaluable?: boolean;
  potential_ptosis: boolean;
  potential_ptosis_eye: 'LEFT' | 'RIGHT' | 'BILATERAL' | 'UNILATERAL' | 'NONE';
  strabismus_screening: {
    strabismus_suspected: boolean;
    estimated_deviation_prism_diopters: number;
    canthus_alignment_delta: number;
    gaze_alignment_description: string;
  };
  overlay_rgba_base64?: string;
  blended_preview_base64?: string;
  clinical_summary: string;
  clinical_recommendations: string[];
  disclaimer: string;
}

