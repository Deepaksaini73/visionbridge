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

