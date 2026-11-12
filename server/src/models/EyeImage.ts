import mongoose, { Schema, Document } from 'mongoose';

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

export interface IEyeImageReview {
  reviewId: string;
  reviewedBy: {
    id: string;
    name: string;
    role: string;
    licenseNumber?: string;
  };
  reviewedAt: Date;
  observations: string;
  recommendations: string[];
  status: 'NORMAL' | 'SUSPECTED_PATHOLOGY' | 'INCONCLUSIVE' | 'POOR_IMAGE_QUALITY';
}

export interface IEyeImage extends Document {
  imageId: string;
  customerId: string;
  customerCode: string;
  storeId: string;
  uploadedBy: {
    id: string;
    name: string;
    role: string;
  };
  imageStoragePath: string;
  thumbnailStoragePath?: string;
  imageType: ClinicalImageType;
  eyeSide: EyeSide;
  gazeDirection?: GazeDirection;
  description?: string;
  clinicalContext?: string;
  captureDate: Date;
  uploadedAt: Date;
  consentRecorded: {
    hasConsent: boolean;
    consentText: string;
    consentedBy: string;
    timestamp: Date;
  };
  mimeType: string;
  fileSizeBytes: number;
  dimensions?: { width: number; height: number };
  reviewStatus: 'PENDING_REVIEW' | 'REVIEWED' | 'REFERRAL_REQUIRED';
  reviews: IEyeImageReview[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EyeImageReviewSchema = new Schema<IEyeImageReview>(
  {
    reviewId: { type: String, required: true },
    reviewedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      licenseNumber: { type: String },
    },
    reviewedAt: { type: Date, default: Date.now },
    observations: { type: String, required: true },
    recommendations: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['NORMAL', 'SUSPECTED_PATHOLOGY', 'INCONCLUSIVE', 'POOR_IMAGE_QUALITY'],
      default: 'NORMAL',
    },
  },
  { _id: false }
);

const EyeImageSchema = new Schema<IEyeImage>(
  {
    imageId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerCode: { type: String, required: true, index: true },
    storeId: { type: String, required: true, index: true },
    uploadedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    imageStoragePath: { type: String, required: true },
    thumbnailStoragePath: { type: String },
    imageType: {
      type: String,
      enum: [
        'EXTERNAL_PHOTO',
        'GAZE_DIRECTION',
        'ANTERIOR_SEGMENT_SLIT_LAMP',
        'FUNDUS_RETINAL',
        'OTHER',
      ],
      default: 'EXTERNAL_PHOTO',
      required: true,
    },
    eyeSide: {
      type: String,
      enum: ['RIGHT', 'LEFT', 'BOTH', 'NOT_SPECIFIED'],
      default: 'NOT_SPECIFIED',
      required: true,
    },
    gazeDirection: {
      type: String,
      enum: [
        'PRIMARY',
        'UP',
        'DOWN',
        'LEFT',
        'RIGHT',
        'UP_RIGHT',
        'UP_LEFT',
        'DOWN_RIGHT',
        'DOWN_LEFT',
      ],
      default: 'PRIMARY',
    },
    description: { type: String },
    clinicalContext: { type: String },
    captureDate: { type: Date, default: Date.now },
    uploadedAt: { type: Date, default: Date.now },
    consentRecorded: {
      hasConsent: { type: Boolean, required: true, default: false },
      consentText: { type: String, required: true },
      consentedBy: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    dimensions: {
      width: { type: Number },
      height: { type: Number },
    },
    reviewStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    reviews: { type: [EyeImageReviewSchema], default: [] },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

EyeImageSchema.index({ customerId: 1, isArchived: 1, uploadedAt: -1 });
EyeImageSchema.index({ storeId: 1, reviewStatus: 1 });

export const EyeImage = mongoose.model<IEyeImage>('EyeImage', EyeImageSchema);

