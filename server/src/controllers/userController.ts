import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { IN_MEMORY_USERS } from './authController.js';
import { isConnectedToDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../models/AuditLog.js';

const createUserByAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['STORE_OPERATOR', 'OPTOMETRIST', 'ADMIN']),
  storeId: z.string().optional(),
  storeName: z.string().optional(),
  licenseNumber: z.string().optional(),
  phone: z.string().optional(),
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  const { role, storeId } = req.query;

  try {
    if (isConnectedToDb) {
      const query: any = {};
      if (role) query.role = role;
      if (storeId) query.storeId = storeId;

      const users = await User.find(query).select('-passwordHash -resetPasswordToken -resetPasswordExpires').sort({ createdAt: -1 });
      if (users.length > 0) {
        return res.status(200).json({ success: true, data: users });
      }
    }

    let results = [...IN_MEMORY_USERS].map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      storeId: u.storeId,
      storeName: u.storeName,
      licenseNumber: (u as any).licenseNumber,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    if (role) {
      results = results.filter(u => u.role === role);
    }
    if (storeId) {
      results = results.filter(u => u.storeId === storeId);
    }

    return res.status(200).json({
      success: true,
      data: results,
      meta: { isDemoData: true, total: results.length },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = createUserByAdminSchema.safeParse(req.body);
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

  const { name, email, password, role, storeId, storeName, licenseNumber, phone } = parseResult.data;
  const emailLower = email.toLowerCase();

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    let newUserId = `usr_${Date.now()}`;

    if (isConnectedToDb) {
      const existing = await User.findOne({ email: emailLower });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'User with this email already exists.' },
        });
      }

      const created = await User.create({
        name,
        email: emailLower,
        passwordHash,
        role,
        storeId,
        storeName,
        licenseNumber,
        phone,
        isActive: true,
      });

      newUserId = created._id.toString();
    } else {
      IN_MEMORY_USERS.push({
        id: newUserId,
        name,
        email: emailLower,
        passwordHash,
        role,
        storeId,
        storeName,
        licenseNumber,
        phone,
        isActive: true,
        createdAt: new Date().toISOString(),
      } as any);
    }

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'ADMIN_PROVISIONED_USER',
      resourceType: 'USER',
      resourceId: newUserId,
      details: { role, targetEmail: emailLower },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `User ${name} provisioned successfully with role ${role}`,
      data: {
        id: newUserId,
        name,
        email: emailLower,
        role,
        storeId,
        storeName,
        licenseNumber,
        phone,
        isActive: true,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const parseResult = updateUserStatusSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { isActive } = parseResult.data;

  // Prevent admin from deactivating themselves
  if (req.user?.id === id && isActive === false) {
    return res.status(400).json({
      success: false,
      error: { code: 'SELF_DEACTIVATION_BLOCKED', message: 'You cannot deactivate your own administrative account.' },
    });
  }

  try {
    let updated = false;

    if (isConnectedToDb) {
      const user = await User.findById(id);
      if (user) {
        user.isActive = isActive;
        await user.save();
        updated = true;
      }
    }

    if (!updated) {
      const memUser = IN_MEMORY_USERS.find(u => u.id === id);
      if (memUser) {
        memUser.isActive = isActive;
        updated = true;
      }
    }

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `User with ID '${id}' was not found.` },
      });
    }

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      resourceType: 'USER',
      resourceId: id,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `User status updated to ${isActive ? 'ACTIVE' : 'DEACTIVATED'}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

