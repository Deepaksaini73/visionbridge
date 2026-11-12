import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { User, IUser } from '../models/User.js';
import { Store } from '../models/Store.js';
import { isConnectedToDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../models/AuditLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'visionbridge_super_secure_jwt_secret_change_in_production';

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  demoRole: z.enum(['STORE_OPERATOR', 'OPTOMETRIST', 'ADMIN']).optional(),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
  role: z.enum(['STORE_OPERATOR', 'OPTOMETRIST', 'ADMIN']).optional().default('STORE_OPERATOR'),
  storeId: z.string().optional(),
  storeName: z.string().optional(),
  phone: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Fictional verified demo accounts
export interface InMemoryUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'STORE_OPERATOR' | 'OPTOMETRIST' | 'ADMIN';
  storeId?: string;
  storeName?: string;
  licenseNumber?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export const IN_MEMORY_USERS: InMemoryUserRecord[] = [
  {
    id: 'usr_admin_01',
    name: 'Dr. Vikram Malhotra',
    email: 'admin@visionbridge.org',
    passwordHash: bcrypt.hashSync('VisionBridgeAdmin2026!', 10),
    role: 'ADMIN' as const,
    isActive: true,
    phone: '+91 90000 00000',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_operator_01',
    name: 'Ramesh Patel',
    email: 'operator@visionbridge.org',
    passwordHash: bcrypt.hashSync('OperatorPass123!', 10),
    role: 'STORE_OPERATOR' as const,
    storeId: 'ST-AP-CHITTOOR-01',
    storeName: 'VisionPoint Chittoor Center',
    isActive: true,
    phone: '+91 98765 43210',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_operator_02',
    name: 'Kavita Sundaram',
    email: 'operator2@visionbridge.org',
    passwordHash: bcrypt.hashSync('OperatorPass123!', 10),
    role: 'STORE_OPERATOR' as const,
    storeId: 'ST-AP-MADANAPALLE-02',
    storeName: 'VisionPoint Madanapalle Center',
    isActive: true,
    phone: '+91 98765 99887',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_optometrist_01',
    name: 'Dr. Ananya Sharma, M.Optom',
    email: 'dr.ananya@visionbridge.org',
    passwordHash: bcrypt.hashSync('OptometristPass123!', 10),
    role: 'OPTOMETRIST' as const,
    licenseNumber: 'OPT-IN-2024-8841',
    isActive: true,
    phone: '+91 94455 66778',
    createdAt: new Date().toISOString(),
  },
];

// In-memory reset tokens for standalone dev testing
const inMemoryResetTokens = new Map<string, { email: string; expires: number }>();

export const login = async (req: Request, res: Response) => {
  // 1. Handle Quick Demo One-Click Login bypass if requested
  const demoRole = req.body?.demoRole;
  if (demoRole && ['STORE_OPERATOR', 'OPTOMETRIST', 'ADMIN'].includes(demoRole)) {
    const demoUser = IN_MEMORY_USERS.find(u => u.role === demoRole) || IN_MEMORY_USERS[1];
    const token = jwt.sign(
      {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        storeId: demoUser.storeId,
        storeName: demoUser.storeName,
        name: demoUser.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAuditEvent({
      userId: demoUser.id,
      userEmail: demoUser.email,
      userRole: demoUser.role,
      action: 'DEMO_LOGIN',
      resourceType: 'AUTH',
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Signed in as demonstration ${demoUser.role.replace('_', ' ')}`,
      data: {
        user: {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
          storeId: demoUser.storeId,
          storeName: demoUser.storeName,
          licenseNumber: (demoUser as any).licenseNumber,
          isActive: true,
        },
        token,
        isDemoAccount: true,
      },
    });
  }

  const parseResult = loginSchema.safeParse(req.body);
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

  const { email, password, rememberMe } = parseResult.data;

  try {
    let foundUser: any = null;

    if (isConnectedToDb) {
      foundUser = await User.findOne({ email: email.toLowerCase() });
    }

    if (!foundUser) {
      // Check in-memory seed records
      foundUser = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'No account found with this email address.' },
      });
    }

    if (foundUser.isActive === false) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated. Please contact an administrator.' },
      });
    }

    const passwordMatch = await bcrypt.compare(password, foundUser.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect password.' },
      });
    }

    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      {
        id: foundUser.id || foundUser._id,
        email: foundUser.email,
        role: foundUser.role,
        storeId: foundUser.storeId,
        storeName: foundUser.storeName,
        name: foundUser.name,
      },
      JWT_SECRET,
      { expiresIn }
    );

    logAuditEvent({
      userId: String(foundUser.id || foundUser._id),
      userEmail: foundUser.email,
      userRole: foundUser.role,
      action: 'USER_LOGIN',
      resourceType: 'AUTH',
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Sign in successful',
      data: {
        user: {
          id: foundUser.id || foundUser._id,
          name: foundUser.name,
          email: foundUser.email,
          role: foundUser.role,
          storeId: foundUser.storeId,
          storeName: foundUser.storeName,
          licenseNumber: foundUser.licenseNumber,
          isActive: foundUser.isActive,
        },
        token,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

export const register = async (req: Request, res: Response) => {
  const parseResult = registerSchema.safeParse(req.body);
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

  const { name, email, password, role, storeId, storeName, phone } = parseResult.data;

  // Strict security boundary: Public registration cannot create ADMIN or OPTOMETRIST accounts!
  if (role && role !== 'STORE_OPERATOR') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PRIVILEGE_RESTRICTION',
        message: 'Public registration is restricted to Store Operators. Optometrist and Administrator accounts must be provisioned through authorized administrative governance.',
      },
    });
  }

  try {
    const emailLower = email.toLowerCase();

    // Check existing in DB or in-memory
    if (isConnectedToDb) {
      const existing = await User.findOne({ email: emailLower });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.' },
        });
      }
    } else {
      const existingMem = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === emailLower);
      if (existingMem) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.' },
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedStoreId = storeId || 'ST-AP-CHITTOOR-01';
    const assignedStoreName = storeName || 'VisionPoint Partner Store';
    let newUserId = `usr_${Date.now()}`;

    if (isConnectedToDb) {
      const created = await User.create({
        name,
        email: emailLower,
        passwordHash,
        role: 'STORE_OPERATOR',
        storeId: assignedStoreId,
        storeName: assignedStoreName,
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
        role: 'STORE_OPERATOR',
        storeId: assignedStoreId,
        storeName: assignedStoreName,
        isActive: true,
        phone,
        createdAt: new Date().toISOString(),
      });
    }

    const token = jwt.sign(
      {
        id: newUserId,
        email: emailLower,
        role: 'STORE_OPERATOR',
        storeId: assignedStoreId,
        storeName: assignedStoreName,
        name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAuditEvent({
      userId: newUserId,
      userEmail: emailLower,
      userRole: 'STORE_OPERATOR',
      action: 'USER_REGISTER',
      resourceType: 'AUTH',
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        user: {
          id: newUserId,
          name,
          email: emailLower,
          role: 'STORE_OPERATOR',
          storeId: assignedStoreId,
          storeName: assignedStoreName,
          phone,
          isActive: true,
        },
        token,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const parseResult = forgotPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { email } = parseResult.data;
  const emailLower = email.toLowerCase();

  try {
    // Generate secure random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = Date.now() + 3600000; // 1 hour

    let userFound = false;

    if (isConnectedToDb) {
      const user = await User.findOne({ email: emailLower });
      if (user) {
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(expiresAt);
        await user.save();
        userFound = true;
      }
    } else {
      const memUser = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === emailLower);
      if (memUser) {
        inMemoryResetTokens.set(hashedToken, { email: emailLower, expires: expiresAt });
        userFound = true;
      }
    }

    logAuditEvent({
      userEmail: emailLower,
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'AUTH',
      ipAddress: req.ip,
      details: { userFound },
    });

    // In development mode, provide the dev reset token so verification is direct and testable
    const devResetLink = `/reset-password?token=${resetToken}`;

    return res.status(200).json({
      success: true,
      message: 'If an account exists with that email, password reset instructions have been generated.',
      data: {
        devMode: process.env.NODE_ENV !== 'production',
        devResetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
        devResetLink: process.env.NODE_ENV !== 'production' ? devResetLink : undefined,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const parseResult = resetPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { token, password } = parseResult.data;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    let passwordUpdated = false;

    if (isConnectedToDb) {
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (user) {
        user.passwordHash = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        passwordUpdated = true;
      }
    } else {
      const tokenRecord = inMemoryResetTokens.get(hashedToken);
      if (tokenRecord && tokenRecord.expires > Date.now()) {
        const memUser = IN_MEMORY_USERS.find(u => u.email === tokenRecord.email);
        if (memUser) {
          memUser.passwordHash = await bcrypt.hash(password, 10);
          inMemoryResetTokens.delete(hashedToken);
          passwordUpdated = true;
        }
      }
    }

    if (!passwordUpdated) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESET_TOKEN', message: 'Password reset token is invalid or has expired.' },
      });
    }

    logAuditEvent({
      action: 'PASSWORD_RESET_COMPLETED',
      resourceType: 'AUTH',
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new password.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    });
  }

  try {
    let userProfile = null;

    if (isConnectedToDb) {
      const dbUser = await User.findById(req.user.id).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
      if (dbUser) {
        userProfile = {
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          storeId: dbUser.storeId,
          storeName: dbUser.storeName,
          licenseNumber: dbUser.licenseNumber,
          phone: dbUser.phone,
          isActive: dbUser.isActive,
          createdAt: dbUser.createdAt.toISOString(),
        };
      }
    }

    if (!userProfile) {
      const memUser = IN_MEMORY_USERS.find(u => u.id === req.user?.id || u.email === req.user?.email);
      if (memUser) {
        userProfile = {
          id: memUser.id,
          name: memUser.name,
          email: memUser.email,
          role: memUser.role,
          storeId: memUser.storeId,
          storeName: memUser.storeName,
          licenseNumber: (memUser as any).licenseNumber,
          phone: memUser.phone,
          isActive: memUser.isActive,
          createdAt: memUser.createdAt,
        };
      }
    }

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile could not be found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

export const logout = (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'USER_LOGOUT',
      resourceType: 'AUTH',
      ipAddress: req.ip,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Signed out successfully',
  });
};

export const getDemoAccounts = (_req: Request, res: Response) => {
  const publicDemoList = IN_MEMORY_USERS.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    storeId: u.storeId,
    storeName: u.storeName,
    licenseNumber: (u as any).licenseNumber,
  }));

  return res.status(200).json({
    success: true,
    data: publicDemoList,
  });
};
