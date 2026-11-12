import { Request, Response } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { Customer, ICustomer } from '../models/Customer.js';
import { isConnectedToDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../models/AuditLog.js';
import { saveBase64Image, deleteStoredFile, fileExists, readStoredImageFile } from '../utils/fileStorage.js';
import { loadPersistedRegistry, persistCustomerPatch, removeCustomerPhotoPatch } from '../utils/metadataPersistence.js';

// Validation Schemas
const createCustomerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  name: z.string().optional(),
  age: z.coerce.number().min(0).max(125).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  contactNumber: z.string().optional(),
  phone: z.string().optional(),
  preferredLanguage: z.enum(['en', 'hi']).default('hi'),
  consentStatus: z.boolean().refine(val => val === true, {
    message: 'Explicit customer consent is required before performing any preliminary screening',
  }),
  consentGiven: z.boolean().optional(),
  notes: z.string().optional(),
  storeId: z.string().optional(),
  clientUuid: z.string().optional(),
}).refine(data => data.age !== undefined || data.dateOfBirth !== undefined, {
  message: 'Either age or date of birth must be provided',
  path: ['age'],
});

const updateCustomerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  name: z.string().optional(),
  age: z.coerce.number().min(0).max(125).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  contactNumber: z.string().optional(),
  phone: z.string().optional(),
  preferredLanguage: z.enum(['en', 'hi']).optional(),
  notes: z.string().optional(),
  workflowStatus: z.enum([
    'REGISTERED',
    'INTERVIEW_IN_PROGRESS',
    'INTERVIEW_COMPLETED',
    'SCREENING_IN_PROGRESS',
    'SCREENING_COMPLETED',
    'PENDING_REVIEW',
    'REVIEWED',
    'REFERRAL_REQUIRED',
    'RETEST_REQUESTED',
  ]).optional(),
});

// High-fidelity in-memory seed records with strict store isolation
export const SEED_CUSTOMERS: Array<any> = [
  {
    id: 'cust_01',
    customerId: 'VB-2026-0101',
    customerCode: 'VB-2026-0101',
    clientUuid: '1001-fictional-uuid-01',
    name: 'Lakshmi Narayanan',
    fullName: 'Lakshmi Narayanan',
    age: 52,
    gender: 'FEMALE',
    contactNumber: '+91 98450 11223',
    phone: '+91 98450 11223',
    preferredLanguage: 'hi',
    storeId: 'ST-AP-CHITTOOR-01',
    storeName: 'VisionPoint Chittoor Center',
    consentStatus: true,
    consentGiven: true,
    consentTimestamp: '2026-02-01T09:30:00Z',
    workflowStatus: 'REVIEWED',
    status: 'REVIEWED',
    notes: 'Reports difficulty threading needles and reading ration cards for past 6 months.',
    createdBy: 'usr_operator_01',
    createdAt: '2026-02-01T09:30:00Z',
    updatedAt: '2026-02-01T11:45:00Z',
    screeningSummary: {
      rightEyeAcuity: '6/9',
      leftEyeAcuity: '6/12',
      amslerAbnormal: false,
      hasWarningFlags: false,
      aiSummarySnippet: 'Suspected age-related presbyopia. Distance vision relatively preserved.'
    }
  },
  {
    id: 'cust_02',
    customerId: 'VB-2026-0102',
    customerCode: 'VB-2026-0102',
    clientUuid: '1002-fictional-uuid-02',
    name: 'Govindappa Reddy',
    fullName: 'Govindappa Reddy',
    age: 64,
    gender: 'MALE',
    contactNumber: '+91 94401 22334',
    phone: '+91 94401 22334',
    preferredLanguage: 'hi',
    storeId: 'ST-AP-CHITTOOR-01',
    storeName: 'VisionPoint Chittoor Center',
    consentStatus: true,
    consentGiven: true,
    consentTimestamp: '2026-02-02T10:15:00Z',
    workflowStatus: 'PENDING_REVIEW',
    status: 'PENDING_REVIEW',
    notes: 'Wavy lines noticed on farm fencing. Central blind spot when viewing calendar.',
    createdBy: 'usr_operator_01',
    createdAt: '2026-02-02T10:15:00Z',
    updatedAt: '2026-02-02T10:45:00Z',
    screeningSummary: {
      rightEyeAcuity: '6/18',
      leftEyeAcuity: '6/24',
      amslerAbnormal: true,
      hasWarningFlags: true,
      aiSummarySnippet: 'WARNING: Marked central metamorphopsia reported on Amsler check. Requires prompt macular evaluation.'
    }
  },
  {
    id: 'cust_03',
    customerId: 'VB-2026-0103',
    customerCode: 'VB-2026-0103',
    clientUuid: '1003-fictional-uuid-03',
    name: 'Sunita Bai',
    fullName: 'Sunita Bai',
    age: 38,
    gender: 'FEMALE',
    contactNumber: '+91 97000 88990',
    phone: '+91 97000 88990',
    preferredLanguage: 'en',
    storeId: 'ST-AP-CHITTOOR-01',
    storeName: 'VisionPoint Chittoor Center',
    consentStatus: true,
    consentGiven: true,
    consentTimestamp: '2026-02-03T11:00:00Z',
    workflowStatus: 'REGISTERED',
    status: 'REGISTERED',
    notes: 'Frontal eye strain after working on tailoring machine.',
    createdBy: 'usr_operator_01',
    createdAt: '2026-02-03T11:00:00Z',
    updatedAt: '2026-02-03T11:00:00Z',
    screeningSummary: {
      rightEyeAcuity: 'Not Tested',
      leftEyeAcuity: 'Not Tested',
      amslerAbnormal: false,
      hasWarningFlags: false,
      aiSummarySnippet: 'Intake registration complete. Awaiting preliminary voice-guided interview.'
    }
  },
  {
    id: 'cust_04',
    customerId: 'VB-2026-0201',
    customerCode: 'VB-2026-0201',
    clientUuid: '2001-fictional-uuid-04',
    name: 'Anand Verma',
    fullName: 'Anand Verma',
    age: 47,
    gender: 'MALE',
    contactNumber: '+91 99887 76655',
    phone: '+91 99887 76655',
    preferredLanguage: 'hi',
    storeId: 'ST-AP-MADANAPALLE-02',
    storeName: 'VisionPoint Madanapalle Center',
    consentStatus: true,
    consentGiven: true,
    consentTimestamp: '2026-02-04T14:30:00Z',
    workflowStatus: 'SCREENING_IN_PROGRESS',
    status: 'SCREENING_IN_PROGRESS',
    notes: 'Store 2 Customer. Tested store isolation.',
    createdBy: 'usr_operator_02',
    createdAt: '2026-02-04T14:30:00Z',
    updatedAt: '2026-02-04T14:45:00Z',
    screeningSummary: {
      rightEyeAcuity: '6/12',
      leftEyeAcuity: 'In Progress',
      amslerAbnormal: false,
      hasWarningFlags: false,
      aiSummarySnippet: 'Interview completed. Currently undergoing visual acuity assessment.'
    }
  }
];

// Synchronize persisted patches from storage metadata on initialization
try {
  const persistedReg = loadPersistedRegistry();
  if (persistedReg.customers) {
    for (const [cid, patch] of Object.entries(persistedReg.customers)) {
      const idx = SEED_CUSTOMERS.findIndex(
        (c) => c.customerId === cid || c.customerCode === cid || c.id === cid
      );
      if (idx !== -1) {
        Object.assign(SEED_CUSTOMERS[idx], patch);
      }
    }
  }
} catch (err) {
  console.warn('[CustomerController] Could not apply persisted customer metadata:', err);
}

export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = createCustomerSchema.safeParse(req.body);
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

  const data = parseResult.data;
  const resolvedName = data.fullName || data.name || 'Unnamed Customer';

  let resolvedAge = data.age;
  if (resolvedAge === undefined && data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const diffMs = Date.now() - dob.getTime();
    resolvedAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
  }

  // Security: Store Operators can only register customers for their assigned store
  let assignedStoreId = req.user?.storeId || 'ST-AP-CHITTOOR-01';
  if (req.user?.role === 'ADMIN' && data.storeId) {
    assignedStoreId = data.storeId;
  }

  const generatedId = `VB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const uuid = data.clientUuid || `uuid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    let createdRecord: any = null;

    if (isConnectedToDb) {
      createdRecord = await Customer.create({
        customerId: generatedId,
        customerCode: generatedId,
        clientUuid: uuid,
        name: resolvedName,
        fullName: resolvedName,
        age: resolvedAge,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        contactNumber: data.contactNumber || data.phone,
        phone: data.contactNumber || data.phone,
        preferredLanguage: data.preferredLanguage,
        storeId: assignedStoreId,
        consentStatus: true,
        consentTimestamp: new Date(),
        workflowStatus: 'REGISTERED',
        notes: data.notes,
        createdBy: req.user?.id,
      });
    } else {
      createdRecord = {
        id: `cust_${Date.now()}`,
        customerId: generatedId,
        customerCode: generatedId,
        clientUuid: uuid,
        name: resolvedName,
        fullName: resolvedName,
        age: resolvedAge,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        contactNumber: data.contactNumber || data.phone,
        phone: data.contactNumber || data.phone,
        preferredLanguage: data.preferredLanguage,
        storeId: assignedStoreId,
        storeName: req.user?.storeName || 'VisionPoint Partner Store',
        consentStatus: true,
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
        workflowStatus: 'REGISTERED',
        status: 'REGISTERED',
        notes: data.notes,
        createdBy: req.user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        screeningSummary: {
          rightEyeAcuity: 'Not Tested',
          leftEyeAcuity: 'Not Tested',
          amslerAbnormal: false,
          hasWarningFlags: false,
          aiSummarySnippet: 'Registration complete. Ready for voice-guided intake interview.'
        }
      };
      SEED_CUSTOMERS.unshift(createdRecord);
    }

    logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'CUSTOMER_CREATED',
      resourceType: 'CUSTOMER',
      resourceId: generatedId,
      details: { storeId: assignedStoreId, fullName: resolvedName },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Customer ${resolvedName} registered successfully (${generatedId})`,
      data: createdRecord,
    });
  } catch (err: any) {
    // Check if error is E11000 duplicate key error on customerCode_1 or similar legacy index
    if (err && (err.code === 11000 || String(err.message).includes('E11000')) && String(err.message).includes('customerCode')) {
      console.warn('[CustomerController] Encountered E11000 duplicate key error on customerCode_1. Auto-healing MongoDB collection...');
      try {
        const mongoose = (await import('mongoose')).default;
        const db = mongoose.connection.db;
        if (db) {
          const customerCol = db.collection('customers');
          // Drop the problematic non-sparse index
          await customerCol.dropIndex('customerCode_1').catch(() => {});
          // Backfill any documents with null customerCode
          await customerCol.updateMany(
            { $or: [{ customerCode: null }, { customerCode: { $exists: false } }] },
            [{ $set: { customerCode: '$customerId' } }]
          ).catch(() => {});
        }

        // Retry creation with explicit customerId and customerCode
        const retryRecord = await Customer.create({
          customerId: generatedId,
          customerCode: generatedId,
          clientUuid: uuid,
          name: resolvedName,
          fullName: resolvedName,
          age: resolvedAge,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          contactNumber: data.contactNumber || data.phone,
          phone: data.contactNumber || data.phone,
          preferredLanguage: data.preferredLanguage,
          storeId: assignedStoreId,
          consentStatus: true,
          consentTimestamp: new Date(),
          workflowStatus: 'REGISTERED',
          notes: data.notes,
          createdBy: req.user?.id,
        });

        return res.status(201).json({
          success: true,
          message: `Customer ${resolvedName} registered successfully (${generatedId})`,
          data: retryRecord,
        });
      } catch (retryErr: any) {
        console.error('[CustomerController] Auto-healing retry encountered error:', retryErr);
      }
    }

    if (err && (err.code === 11000 || String(err.message).includes('E11000'))) {
      const duplicateField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'identifier';
      return res.status(409).json({
        success: false,
        error: { 
          code: 'DUPLICATE_RECORD', 
          message: `A customer with this ${duplicateField} is already registered. Please check the customer list.` 
        },
      });
    }

    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      search, 
      status, 
      workflowStatus, 
      storeId, 
      fromDate, 
      toDate, 
      page = '1', 
      limit = '10' 
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 10));
    const targetStatus = (status || workflowStatus) as string | undefined;

    // Security: Enforce store-level isolation
    let enforcedStoreId: string | undefined = undefined;
    if (req.user?.role === 'STORE_OPERATOR') {
      enforcedStoreId = req.user.storeId;
    } else if (storeId) {
      enforcedStoreId = String(storeId);
    }

    if (isConnectedToDb) {
      const query: any = {};

      if (enforcedStoreId) {
        query.storeId = enforcedStoreId;
      }

      if (targetStatus && targetStatus !== 'ALL') {
        query.workflowStatus = targetStatus;
      }

      if (search) {
        const s = String(search).trim();
        query.$or = [
          { fullName: { $regex: s, $options: 'i' } },
          { customerId: { $regex: s, $options: 'i' } },
          { customerCode: { $regex: s, $options: 'i' } },
          { contactNumber: { $regex: s, $options: 'i' } },
        ];
      }

      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(String(fromDate));
        if (toDate) query.createdAt.$lte = new Date(String(toDate));
      }

      const total = await Customer.countDocuments(query);
      const customers = await Customer.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        data: customers,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          storeFilter: enforcedStoreId,
        },
      });
    }

    // In-memory filtered query
    let filtered = [...SEED_CUSTOMERS];

    if (enforcedStoreId) {
      filtered = filtered.filter(c => c.storeId === enforcedStoreId);
    }

    if (targetStatus && targetStatus !== 'ALL') {
      filtered = filtered.filter(c => c.workflowStatus === targetStatus || c.status === targetStatus);
    }

    if (search) {
      const s = String(search).toLowerCase().trim();
      filtered = filtered.filter(c => 
        (c.fullName && c.fullName.toLowerCase().includes(s)) ||
        (c.customerId && c.customerId.toLowerCase().includes(s)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(s)) ||
        (c.contactNumber && c.contactNumber.includes(s))
      );
    }

    if (fromDate) {
      filtered = filtered.filter(c => new Date(c.createdAt) >= new Date(String(fromDate)));
    }
    if (toDate) {
      filtered = filtered.filter(c => new Date(c.createdAt) <= new Date(String(toDate)));
    }

    const total = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        storeFilter: enforcedStoreId,
        isDemoData: true,
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

export const getCustomerById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let customer: any = null;

    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { customerId: id },
          { customerCode: id },
          { clientUuid: id }
        ],
      });
    }

    if (!customer) {
      customer = SEED_CUSTOMERS.find(c => c.id === id || c.customerId === id || c.customerCode === id || c.clientUuid === id);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer with ID '${id}' was not found.` },
      });
    }

    // Security check: Store operator can only access their store's customer
    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId !== req.user.storeId) {
      logAuditEvent({
        userId: req.user?.id,
        userRole: req.user?.role,
        action: 'UNAUTHORIZED_CROSS_STORE_ACCESS_ATTEMPT',
        resourceType: 'CUSTOMER',
        resourceId: customer.customerId,
        details: { customerStoreId: customer.storeId, operatorStoreId: req.user.storeId },
        ipAddress: req.ip,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'CROSS_STORE_ACCESS_DENIED',
          message: 'Access denied. You do not have permission to view records from another optical store.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const parseResult = updateCustomerSchema.safeParse(req.body);

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

  const updates = parseResult.data;

  try {
    let customer: any = null;

    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { customerId: id },
          { customerCode: id },
          { clientUuid: id }
        ],
      });
    } else {
      customer = SEED_CUSTOMERS.find(c => c.id === id || c.customerId === id || c.customerCode === id || c.clientUuid === id);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer with ID '${id}' was not found.` },
      });
    }

    // Security check: Store operator cross-store check
    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CROSS_STORE_ACCESS_DENIED',
          message: 'You cannot modify customer records belonging to another store.',
        },
      });
    }

    // Security check: Store operators CANNOT set clinical decisions / review status
    if (req.user?.role === 'STORE_OPERATOR' && updates.workflowStatus) {
      const forbiddenStatuses = ['REVIEWED', 'REFERRAL_REQUIRED', 'RETEST_REQUESTED'];
      if (forbiddenStatuses.includes(updates.workflowStatus)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'CLINICAL_PRIVILEGE_RESTRICTION',
            message: 'Only authorized optometrists or eye-care professionals can update clinical review decisions.',
          },
        });
      }
    }

    if (isConnectedToDb) {
      if (updates.fullName || updates.name) {
        customer.fullName = updates.fullName || updates.name;
        customer.name = updates.fullName || updates.name;
      }
      if (updates.age !== undefined) customer.age = updates.age;
      if (updates.dateOfBirth) customer.dateOfBirth = new Date(updates.dateOfBirth);
      if (updates.gender) customer.gender = updates.gender;
      if (updates.contactNumber || updates.phone) {
        customer.contactNumber = updates.contactNumber || updates.phone;
        customer.phone = updates.contactNumber || updates.phone;
      }
      if (updates.preferredLanguage) customer.preferredLanguage = updates.preferredLanguage;
      if (updates.notes !== undefined) customer.notes = updates.notes;
      if (updates.workflowStatus) customer.workflowStatus = updates.workflowStatus;

      await customer.save();
    } else {
      if (updates.fullName || updates.name) {
        customer.fullName = updates.fullName || updates.name;
        customer.name = updates.fullName || updates.name;
      }
      if (updates.age !== undefined) customer.age = updates.age;
      if (updates.gender) customer.gender = updates.gender;
      if (updates.contactNumber || updates.phone) {
        customer.contactNumber = updates.contactNumber || updates.phone;
        customer.phone = updates.contactNumber || updates.phone;
      }
      if (updates.preferredLanguage) customer.preferredLanguage = updates.preferredLanguage;
      if (updates.notes !== undefined) customer.notes = updates.notes;
      if (updates.workflowStatus) {
        customer.workflowStatus = updates.workflowStatus;
        customer.status = updates.workflowStatus;
      }
      customer.updatedAt = new Date().toISOString();
    }

    logAuditEvent({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'CUSTOMER_UPDATED',
      resourceType: 'CUSTOMER',
      resourceId: customer.customerId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Customer details updated successfully',
      data: customer,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

export const getCustomerStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let customer: any = null;

    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { customerId: id },
          { customerCode: id }
        ],
      });
    } else {
      customer = SEED_CUSTOMERS.find(c => c.id === id || c.customerId === id || c.customerCode === id);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer with ID '${id}' was not found.` },
      });
    }

    // Security check: Store isolation
    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to records from another store.' },
      });
    }

    const currentWorkflow = customer.workflowStatus || customer.status || 'REGISTERED';

    const stages = [
      {
        id: 'registration',
        label: 'Customer Registration & Consent',
        status: 'COMPLETED',
        completedAt: customer.createdAt,
      },
      {
        id: 'interview',
        label: 'Multilingual Voice-Guided Interview',
        status: ['INTERVIEW_COMPLETED', 'SCREENING_IN_PROGRESS', 'SCREENING_COMPLETED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
          ? 'COMPLETED'
          : currentWorkflow === 'INTERVIEW_IN_PROGRESS'
          ? 'IN_PROGRESS'
          : 'NOT_STARTED',
      },
      {
        id: 'screening',
        label: 'Preliminary Vision Screening (Tumbling-E & Amsler)',
        status: ['SCREENING_COMPLETED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
          ? 'COMPLETED'
          : currentWorkflow === 'SCREENING_IN_PROGRESS'
          ? 'IN_PROGRESS'
          : 'NOT_STARTED',
      },
      {
        id: 'profile',
        label: 'AI-Assisted Objective Summary Profile',
        status: ['PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
          ? 'COMPLETED'
          : 'PENDING',
      },
      {
        id: 'review',
        label: 'Professional Optometrist Review & Guidance',
        status: ['REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
          ? 'COMPLETED'
          : currentWorkflow === 'PENDING_REVIEW'
          ? 'IN_PROGRESS'
          : 'NOT_STARTED',
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        customerId: customer.customerId,
        customerName: customer.fullName || customer.name,
        currentWorkflow,
        storeId: customer.storeId,
        stages,
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

/**
 * Upload or Replace Customer Profile Photo (Max 5MB, JPG/PNG/WebP)
 */
export const uploadProfilePhoto = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { imageData } = req.body;

  if (!imageData || typeof imageData !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Image data in base64 format is required.' },
    });
  }

  try {
    let customer: any = null;
    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [
          { customerId: id },
          { customerCode: id },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { clientUuid: id },
        ],
      });
    }
    if (!customer) {
      customer = SEED_CUSTOMERS.find(c => c.id === id || c.customerId === id || c.customerCode === id || c.clientUuid === id);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer with ID '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId && req.user.storeId && customer.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot upload photos for customers from another store.' },
      });
    }

    // Remove existing file if present
    if (customer.profilePhoto?.storagePath) {
      deleteStoredFile(customer.profilePhoto.storagePath);
    }

    const cid = customer.customerId || customer.customerCode || customer.id || id;
    // Save image to private storage (max 5MB)
    const saved = saveBase64Image('profiles', imageData, `profile-${cid}`, 5 * 1024 * 1024);
    const photoUrl = `/api/customers/${cid}/photo`;

    const profilePhotoData = {
      storagePath: saved.storagePath,
      url: photoUrl,
      mimeType: saved.mimeType,
      fileSizeBytes: saved.sizeBytes,
      uploadedAt: new Date(),
    };

    customer.profilePhoto = profilePhotoData;
    customer.profilePhotoUrl = photoUrl;

    if (isConnectedToDb) {
      try {
        await customer.save();
      } catch (err) {
        // Fallback for non-Mongoose object
      }
    }

    // Also update in SEED_CUSTOMERS in-memory array to stay in sync!
    const seedIdx = SEED_CUSTOMERS.findIndex(c => c.id === id || c.customerId === id || c.customerCode === id || c.customerId === cid || c.customerCode === cid);
    if (seedIdx !== -1) {
      SEED_CUSTOMERS[seedIdx].profilePhoto = profilePhotoData;
      SEED_CUSTOMERS[seedIdx].profilePhotoUrl = photoUrl;
    } else {
      SEED_CUSTOMERS.push(customer);
    }

    // Persist to storage metadata.json so photo remains accessible after backend restart
    persistCustomerPatch(cid, {
      profilePhoto: profilePhotoData,
      profilePhotoUrl: photoUrl,
    });

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'CUSTOMER_PHOTO_UPLOADED',
      resourceType: 'CUSTOMER',
      resourceId: customer.customerId,
      details: { sizeBytes: saved.sizeBytes, mimeType: saved.mimeType, isEncrypted: true },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully and encrypted at rest',
      data: {
        customerId: customer.customerId,
        profilePhotoUrl: photoUrl,
        uploadedAt: profilePhotoData.uploadedAt,
        isEncrypted: true,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: msg },
    });
  }
};

/**
 * Stream Customer Profile Photo Securely
 * Authenticated & authorized with AES-256-GCM decryption
 */
export const getProfilePhoto = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let customer: any = null;
    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [
          { customerId: id },
          { customerCode: id },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { clientUuid: id },
        ],
      });
    }
    if (!customer) {
      customer = SEED_CUSTOMERS.find(c => c.id === id || c.customerId === id || c.customerCode === id || c.clientUuid === id);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer record was not found' },
      });
    }

    // Authorization: Store Operator can only view customers from their assigned store
    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId && req.user.storeId && customer.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: Customer belongs to another store center.' },
      });
    }

    if (!customer.profilePhoto?.storagePath || !fileExists(customer.profilePhoto.storagePath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'PHOTO_NOT_FOUND', message: 'No profile photo on file for this customer.' },
      });
    }

    // Read and decrypt the AES-256-GCM encrypted file from storage
    const { buffer, mimeType, isEncrypted } = readStoredImageFile(
      customer.profilePhoto.storagePath,
      customer.profilePhoto.mimeType || 'image/jpeg'
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Storage-Encrypted', isEncrypted ? 'AES-256-GCM' : 'NONE');
    return res.status(200).send(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: `Server error streaming photo: ${msg}` },
    });
  }
};

/**
 * Remove Customer Profile Photo
 */
export const deleteProfilePhoto = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let customer: any = null;
    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [
          { customerId: id },
          { customerCode: id },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { clientUuid: id },
        ],
      });
    }
    if (!customer) {
      customer = SEED_CUSTOMERS.find(c => c.id === id || c.customerId === id || c.customerCode === id || c.clientUuid === id);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer with ID '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId && req.user.storeId && customer.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot delete photos for customers from another store.' },
      });
    }

    if (customer.profilePhoto?.storagePath) {
      deleteStoredFile(customer.profilePhoto.storagePath);
    }

    const cid = customer.customerId || customer.customerCode || customer.id || id;
    customer.profilePhoto = undefined;
    customer.profilePhotoUrl = undefined;

    if (isConnectedToDb) {
      try {
        await customer.save();
      } catch (err) {}
    }

    const seedIdx = SEED_CUSTOMERS.findIndex(c => c.id === id || c.customerId === id || c.customerCode === id || c.clientUuid === id);
    if (seedIdx !== -1) {
      SEED_CUSTOMERS[seedIdx].profilePhoto = undefined;
      SEED_CUSTOMERS[seedIdx].profilePhotoUrl = undefined;
    }

    // Update persisted metadata registry
    removeCustomerPhotoPatch(cid);

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'CUSTOMER_PHOTO_DELETED',
      resourceType: 'CUSTOMER',
      resourceId: customer.customerId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile photo removed successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: msg },
    });
  }
};

