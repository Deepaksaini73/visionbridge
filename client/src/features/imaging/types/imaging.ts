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

// Milestone 5.3: Ocular Surface & Hyperaemia Telemetry
export interface HyperaemiaMetrics {
  evaluated: boolean;
  sclera_area_px: number;
  vascular_density_pct: number;
  efron_grade: number; // 0 to 4
  severity_label: string;
  efron_grade_name: string;
  clinical_guidance: string;
}

export interface PterygiumMetrics {
  detected: boolean;
  encroachment_zone: string; // 'NASAL' | 'TEMPORAL' | 'NONE'
  limbic_invasion_mm: number;
  pupil_clearance_mm: number;
  severity_grade: string; // 'NONE' | 'GRADE_1_MILD' | 'GRADE_2_MODERATE' | 'GRADE_3_ADVANCED'
  clinical_advice: string;
}

export interface HyperaemiaTelemetryData {
  success: boolean;
  filename: string;
  eye_side: EyeSide;
  calibration: {
    iris_diameter_px: number;
    iris_radius_px: number;
    pupil_radius_px: number;
    scale_factor_mm_per_px: number;
    reference_iris_diameter_mm: number;
  };
  hyperaemia: HyperaemiaMetrics;
  pterygium: PterygiumMetrics;
  overlay_rgba_base64?: string;
  disclaimer: string;
}

// Milestone 5.4: Retinal Foundation AI (FLAIR)
export interface RetinalPromptRanking {
  prompt: string;
  probability_pct: number;
  logit: number;
}

export interface RetinalCategoryAssessment {
  top_stage?: string;
  top_finding?: string;
  confidence_pct: number;
  referable_dr?: boolean;
  referable_maculopathy?: boolean;
  glaucoma_suspected?: boolean;
  all_stages?: RetinalPromptRanking[];
  all_findings?: RetinalPromptRanking[];
}

export interface RetinalAnalysisData {
  success: boolean;
  is_fundus_image: boolean;
  filename: string;
  eye_side: EyeSide;
  error?: string;
  domain_metrics?: {
    red_to_blue_ratio: number;
    perimeter_dark_fraction: number;
    mean_luminance: number;
    is_fundus: boolean;
  };
  model_metadata?: {
    model_name: string;
    checkpoint: string;
    parameters: string;
    vision_encoder: string;
    text_encoder: string;
    embedding_dimension: number;
    latency_ms: number;
  };
  primary_assessment?: {
    top_condition: string;
    confidence_pct: number;
    master_ranking: RetinalPromptRanking[];
  };
  clinical_categories?: {
    diabetic_retinopathy: RetinalCategoryAssessment;
    macular_integrity: RetinalCategoryAssessment;
    glaucoma_screening: RetinalCategoryAssessment;
    vascular_occlusion: RetinalCategoryAssessment;
  };
  decision_support?: {
    triage_urgency: 'ROUTINE_OBSERVATION' | 'ELECTIVE_OPHTHALMOLOGY_CONSULT' | 'URGENT_RETINA_SPECIALIST';
    referral_indicated: boolean;
    clinical_advice: string;
  };
  overlay_rgba_base64?: string;
  disclaimer: string;
}

// Milestone 5.5: Lens & Corneal Clarity Engine
export interface LensOpacityMetrics {
  cataract_grade: number; // 0, 1, 2, 3
  grade_name: string;
  severity_label: 'NORMAL_CLEAR' | 'MILD_OPACITY' | 'MODERATE_CATARACT' | 'ADVANCED_CATARACT';
  mean_luminance: number;
  median_luminance: number;
  std_luminance: number;
  opacity_area_fraction_pct: number;
  shannon_entropy: number;
  evaluated_pupil_pixels: number;
  clinical_advice: string;
}

export interface CornealArcusMetrics {
  arcus_detected: boolean;
  severity_grade: 'NONE' | 'GRADE_1_PARTIAL_ARC' | 'GRADE_2_CONFLUENT_ARC' | 'GRADE_3_CIRCUMFERENTIAL_RING';
  extent_degrees: number;
  coverage_pct: number;
  limbal_band_luminance: number;
  span_description: string;
  clinical_advice: string;
}

export interface CornealLensClarityData {
  success: boolean;
  filename: string;
  eye_side: EyeSide;
  calibration: {
    iris_center_xy: [number, number];
    iris_diameter_px: number;
    iris_radius_px: number;
    pupil_radius_px: number;
    pupil_diameter_mm: number;
    scale_factor_mm_per_px: number;
    reference_iris_diameter_mm: number;
  };
  lens_opacity: LensOpacityMetrics;
  corneal_arcus: CornealArcusMetrics;
  triage: {
    urgency: 'NORMAL_CLEAR' | 'ROUTINE_OBSERVATION' | 'ELECTIVE_CONSULT' | 'URGENT_OPHTHALMOLOGY_CONSULT';
    summary: string;
    referral_indicated: boolean;
  };
  telemetry: {
    latency_ms: number;
    resolution: string;
  };
  overlay_rgba_base64?: string;
  disclaimer: string;
}


