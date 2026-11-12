import mongoose, { Schema, Document } from 'mongoose';

export interface IStore extends Document {
  code: string;
  name: string;
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  contactNumber?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true, index: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    contactNumber: { type: String },
    email: { type: String, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Store = mongoose.model<IStore>('Store', StoreSchema);

