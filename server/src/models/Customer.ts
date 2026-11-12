import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerProfilePhoto {
  storagePath: string;
  url: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: Date;
}

export interface ICustomer extends Document {
  customerId: string;
  customerCode: string;
  clientUuid: string;
  name: string;
  fullName: string;
  profilePhoto?: ICustomerProfilePhoto;
  profilePhotoUrl?: string;
  age: number;
  dateOfBirth?: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  contactNumber?: string;
  phone?: string;
  preferredLanguage: 'en' | 'hi';
  storeId: string;
  consentStatus: boolean;
  consentTimestamp: Date;
  workflowStatus: 
    | 'REGISTERED' 
    | 'INTERVIEW_IN_PROGRESS' 
    | 'INTERVIEW_COMPLETED' 
    | 'SCREENING_IN_PROGRESS' 
    | 'SCREENING_COMPLETED' 
    | 'PENDING_REVIEW' 
    | 'REVIEWED' 
    | 'REFERRAL_REQUIRED' 
    | 'RETEST_REQUESTED';
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    customerCode: { 
      type: String, 
      required: true, 
      index: true, 
      sparse: true,
      default: function (this: any) {
        return this.customerId;
      }
    },
    clientUuid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    profilePhoto: {
      storagePath: { type: String },
      url: { type: String },
      mimeType: { type: String },
      fileSizeBytes: { type: Number },
      uploadedAt: { type: Date },
    },
    profilePhotoUrl: { type: String },
    age: { type: Number, required: true, min: 0, max: 125 },
    dateOfBirth: { type: Date },
    gender: { 
      type: String, 
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], 
      required: true 
    },
    contactNumber: { type: String, trim: true },
    phone: { type: String, trim: true },
    preferredLanguage: { type: String, enum: ['en', 'hi'], default: 'hi', required: true },
    storeId: { type: String, required: true, index: true },
    consentStatus: { type: Boolean, required: true, default: false },
    consentTimestamp: { type: Date, default: Date.now },
    workflowStatus: {
      type: String,
      enum: [
        'REGISTERED',
        'INTERVIEW_IN_PROGRESS',
        'INTERVIEW_COMPLETED',
        'SCREENING_IN_PROGRESS',
        'SCREENING_COMPLETED',
        'PENDING_REVIEW',
        'REVIEWED',
        'REFERRAL_REQUIRED',
        'RETEST_REQUESTED',
      ],
      default: 'REGISTERED',
      index: true,
    },
    notes: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

// Guarantee customerId and customerCode mirror each other and are never null/undefined
CustomerSchema.pre('validate', function (next) {
  if (!this.customerCode && this.customerId) {
    this.customerCode = this.customerId;
  }
  if (!this.customerId && this.customerCode) {
    this.customerId = this.customerCode;
  }
  if (!this.name && this.fullName) {
    this.name = this.fullName;
  }
  if (!this.fullName && this.name) {
    this.fullName = this.name;
  }
  next();
});

// Compound index for efficient store-level customer queries
CustomerSchema.index({ storeId: 1, workflowStatus: 1, createdAt: -1 });

CustomerSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    if (!ret.customerCode && ret.customerId) {
      ret.customerCode = ret.customerId;
    }
    if (!ret.customerId && ret.customerCode) {
      ret.customerId = ret.customerCode;
    }
    return ret;
  },
});

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
