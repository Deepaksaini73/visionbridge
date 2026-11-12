import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'STORE_OPERATOR' | 'OPTOMETRIST' | 'ADMIN';
  storeId?: string;
  storeName?: string;
  licenseNumber?: string;
  phone?: string;
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['STORE_OPERATOR', 'OPTOMETRIST', 'ADMIN'],
      default: 'STORE_OPERATOR',
      required: true,
      index: true,
    },
    storeId: { type: String, index: true },
    storeName: { type: String },
    licenseNumber: { type: String },
    phone: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Method to remove sensitive fields when converting to JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export const User = mongoose.model<IUser>('User', UserSchema);
