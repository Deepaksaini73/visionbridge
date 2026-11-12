import { Request, Response } from 'express';
import { z } from 'zod';
import { Store, IStore } from '../models/Store.js';
import { isConnectedToDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../models/AuditLog.js';

const createStoreSchema = z.object({
  code: z.string().min(3, 'Store code must be at least 3 characters').toUpperCase(),
  name: z.string().min(3, 'Store name must be at least 3 characters'),
  location: z.object({
    address: z.string().min(3, 'Address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().min(4, 'Pincode is required'),
  }),
  contactNumber: z.string().optional(),
  email: z.string().email().optional(),
});

export interface SeedStoreRecord {
  id: string;
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
  createdAt: string;
}

export const SEED_STORES: SeedStoreRecord[] = [
  {
    id: 'store_01',
    code: 'ST-AP-CHITTOOR-01',
    name: 'VisionPoint Chittoor Center',
    location: {
      address: 'Shop 14, Main Bazaar, Near Old Bus Stand',
      city: 'Chittoor',
      state: 'Andhra Pradesh',
      pincode: '517001',
    },
    contactNumber: '+91 98765 43210',
    email: 'chittoor@visionpoint.org',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'store_02',
    code: 'ST-AP-MADANAPALLE-02',
    name: 'VisionPoint Madanapalle Center',
    location: {
      address: '22 Market Road, Opp. Municipal Hospital',
      city: 'Madanapalle',
      state: 'Andhra Pradesh',
      pincode: '517325',
    },
    contactNumber: '+91 98765 99887',
    email: 'madanapalle@visionpoint.org',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'store_03',
    code: 'ST-AP-TIRUPATI-03',
    name: 'VisionPoint Tirupati Hub',
    location: {
      address: '407 Alipiri Road',
      city: 'Tirupati',
      state: 'Andhra Pradesh',
      pincode: '517501',
    },
    contactNumber: '+91 98440 22334',
    email: 'tirupati@visionpoint.org',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export const getStores = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (isConnectedToDb) {
      const stores = await Store.find({ isActive: true }).sort({ createdAt: -1 });
      if (stores.length > 0) {
        return res.status(200).json({ success: true, data: stores });
      }
    }

    return res.status(200).json({
      success: true,
      data: SEED_STORES,
      meta: { isDemoData: true },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const createStore = async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = createStoreSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
        details: parseResult.error.flatten(),
      },
    });
  }

  const { code, name, location, contactNumber, email } = parseResult.data;

  try {
    if (isConnectedToDb) {
      const existing = await Store.findOne({ code });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: 'STORE_CODE_EXISTS', message: 'A store with this code already exists.' },
        });
      }

      const created = await Store.create({
        code,
        name,
        location,
        contactNumber,
        email,
        isActive: true,
      });

      logAuditEvent({
        userId: req.user?.id,
        userRole: req.user?.role,
        action: 'STORE_CREATED',
        resourceType: 'STORE',
        resourceId: code,
        ipAddress: req.ip,
      });

      return res.status(201).json({ success: true, data: created });
    }

    const newStore = {
      id: `store_${Date.now()}`,
      code,
      name,
      location,
      contactNumber,
      email,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    SEED_STORES.unshift(newStore);

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'STORE_CREATED',
      resourceType: 'STORE',
      resourceId: code,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: newStore, meta: { isDemoData: true } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};
