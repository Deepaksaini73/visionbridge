import { Response } from 'express';
import { z } from 'zod';
import { Interview, IInterview, IInterviewAnswer, IInterviewWarningFlag } from '../models/Interview.js';
import { Customer } from '../models/Customer.js';
import { SEED_CUSTOMERS } from './customerController.js';
import { isConnectedToDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../models/AuditLog.js';
import { generateAiSummary, generateDeterministicSummary } from '../services/aiSummaryService.js';
import { INTERVIEW_QUESTIONS, pruneInapplicableAnswers } from '../config/interviewQuestions.js';

// Validation Schemas
const startInterviewSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  language: z.enum(['en', 'hi']).default('hi'),
  clientUuid: z.string().optional(),
});

const answerSchema = z.object({
  questionId: z.string(),
  sectionId: z.string().optional(),
  questionText: z.string(),
  category: z.string(),
  answerValue: z.string(),
  answerLabel: z.string(),
  answerType: z.enum(['CHOICE', 'TEXT']).default('CHOICE'),
  language: z.enum(['en', 'hi']).default('hi'),
  inputMethod: z.enum(['VOICE', 'TEXT', 'OPTION_CLICK']).default('OPTION_CLICK'),
  voiceTranscript: z.string().optional(),
  isRedFlag: z.boolean().default(false),
  answeredAt: z.string().optional(),
});

const saveProgressSchema = z.object({
  answers: z.array(answerSchema),
  completedSections: z.array(z.string()).optional(),
  language: z.enum(['en', 'hi']).optional(),
});

const completeInterviewSchema = z.object({
  answers: z.array(answerSchema),
  completedSections: z.array(z.string()).optional(),
  durationSeconds: z.number().optional(),
  language: z.enum(['en', 'hi']).optional(),
});

// High-fidelity in-memory seed interview records for demo mode
export const IN_MEMORY_INTERVIEWS: Array<any> = [
  {
    id: 'int_demo_01',
    interviewId: 'INT-2026-0101',
    customerId: 'VB-2026-0101',
    customerCode: 'VB-2026-0101',
    clientUuid: '1001-fictional-uuid-01',
    storeId: 'ST-AP-CHITTOOR-01',
    conductedBy: { id: 'usr_operator_01', name: 'Ramesh Patel' },
    language: 'hi',
    status: 'COMPLETED',
    completedSections: ['sec_basic', 'sec_daily', 'sec_history', 'sec_warning', 'sec_lifestyle'],
    hasRedFlags: false,
    warningFlags: [],
    answers: [
      {
        questionId: 'q_dist',
        sectionId: 'sec_basic',
        questionText: 'Do you experience difficulty seeing objects or people at a distance?',
        category: 'DISTANCE_VISION',
        answerValue: 'NONE',
        answerLabel: 'नहीं, दूर का बिल्कुल साफ दिखता है',
        answerType: 'CHOICE',
        inputMethod: 'OPTION_CLICK',
        isRedFlag: false,
        answeredAt: new Date('2026-02-01T09:35:00Z'),
      },
      {
        questionId: 'q_near',
        sectionId: 'sec_basic',
        questionText: 'Do you experience difficulty reading nearby text or fine print?',
        category: 'NEAR_VISION',
        answerValue: 'MODERATE',
        answerLabel: 'मध्यम परेशानी (तेज़ रोशनी की जरूरत)',
        answerType: 'CHOICE',
        inputMethod: 'VOICE',
        voiceTranscript: 'पास का पढ़ने में परेशानी होती है सुई में धागा नहीं डलता',
        isRedFlag: false,
        answeredAt: new Date('2026-02-01T09:37:00Z'),
      },
      {
        questionId: 'q_duration',
        sectionId: 'sec_basic',
        questionText: 'How long have you noticed these vision difficulties?',
        category: 'BLURRED_VISION',
        answerValue: '6_TO_12_MONTHS',
        answerLabel: '6 महीने से 1 साल से',
        answerType: 'CHOICE',
        inputMethod: 'OPTION_CLICK',
        isRedFlag: false,
        answeredAt: new Date('2026-02-01T09:39:00Z'),
      },
    ],
    responses: [],
    summary: {
      reportedDifficulties: ['Near difficulty (मध्यम परेशानी)'],
      nearVisionConcerns: ['Near Vision: मध्यम परेशानी'],
      distanceVisionConcerns: [],
      spectacleHistory: 'Never prescribed or worn spectacles',
      duration: '6 महीने से 1 साल से',
      warningSymptoms: [],
      aiSummarySnippet: 'Customer reports moderate difficulty reading nearby text and threading needles for the past 6-12 months. Distance vision remains intact. No acute warning symptoms reported.',
      isAiGenerated: false,
      generatedAt: new Date('2026-02-01T09:42:00Z'),
    },
    startedAt: new Date('2026-02-01T09:34:00Z'),
    completedAt: new Date('2026-02-01T09:42:00Z'),
    durationSeconds: 480,
    createdAt: new Date('2026-02-01T09:34:00Z'),
    updatedAt: new Date('2026-02-01T09:42:00Z'),
  },
];

/**
 * Helper to inspect answers and evaluate red flag warning triggers based on configuration.
 */
function evaluateWarningFlags(answers: any[]): IInterviewWarningFlag[] {
  const flags: IInterviewWarningFlag[] = [];

  for (const ans of answers) {
    const qConfig = INTERVIEW_QUESTIONS.find(q => q.id === ans.questionId);
    if (!qConfig) continue;

    // Check if the selected option is marked as an urgent warning
    const selectedOpt = qConfig.options?.find(opt => opt.value === ans.answerValue);
    if (selectedOpt?.isUrgentFlag || ans.isRedFlag) {
      flags.push({
        flagType: qConfig.category,
        questionId: ans.questionId,
        severity: 'URGENT',
        descriptionEn: selectedOpt?.warningDescriptionEn || `Urgent symptom reported: ${ans.answerLabel}`,
        descriptionHi: selectedOpt?.warningDescriptionHi || `चेतावनी लक्षण: ${ans.answerLabel}`,
      });
    }
  }

  return flags;
}

export const startInterview = async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = startInterviewSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { customerId, language, clientUuid } = parseResult.data;

  try {
    // 1. Locate Customer Record
    let customer: any = null;
    if (isConnectedToDb) {
      customer = await Customer.findOne({
        $or: [{ customerId }, { customerCode: customerId }, { clientUuid: customerId }],
      });
    }

    if (!customer) {
      customer = SEED_CUSTOMERS.find(c => c.customerId === customerId || c.customerCode === customerId || c.id === customerId);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: `Customer with ID '${customerId}' not found.` },
      });
    }

    // 2. Enforce Store Isolation for Store Operators
    if (req.user?.role === 'STORE_OPERATOR' && customer.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'CROSS_STORE_ACCESS_DENIED', message: 'You cannot conduct interviews for another store’s customer.' },
      });
    }

    // 3. Check for existing in-progress interview to resume
    let existingInterview: any = null;
    if (isConnectedToDb) {
      existingInterview = await Interview.findOne({
        customerId: customer.customerId,
        status: 'IN_PROGRESS',
      }).sort({ createdAt: -1 });
    } else {
      existingInterview = IN_MEMORY_INTERVIEWS.find(
        i => i.customerId === customer.customerId && i.status === 'IN_PROGRESS'
      );
    }

    if (existingInterview) {
      return res.status(200).json({
        success: true,
        message: 'Resuming existing in-progress interview',
        data: existingInterview,
        meta: { isResumed: true },
      });
    }

    // 4. Create new interview session
    const generatedIntId = `INT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSessionData = {
      interviewId: generatedIntId,
      customerId: customer.customerId,
      customerCode: customer.customerCode || customer.customerId,
      clientUuid: clientUuid || customer.clientUuid || `uuid_${Date.now()}`,
      storeId: customer.storeId,
      conductedBy: {
        id: req.user?.id || 'usr_operator_01',
        name: req.user?.name || 'Store Operator',
      },
      language,
      status: 'IN_PROGRESS',
      completedSections: [],
      hasRedFlags: false,
      warningFlags: [],
      answers: [],
      responses: [],
      startedAt: new Date(),
    };

    let createdInterview: any = null;
    if (isConnectedToDb) {
      createdInterview = await Interview.create(newSessionData);
      
      // Update customer workflow status
      await Customer.updateOne(
        { customerId: customer.customerId },
        { workflowStatus: 'INTERVIEW_IN_PROGRESS' }
      );
    } else {
      createdInterview = {
        ...newSessionData,
        id: `int_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      IN_MEMORY_INTERVIEWS.unshift(createdInterview);

      // Update in-memory customer
      customer.workflowStatus = 'INTERVIEW_IN_PROGRESS';
    }

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'INTERVIEW_STARTED',
      resourceType: 'INTERVIEW',
      resourceId: generatedIntId,
      details: { customerId: customer.customerId, language },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Interview started for ${customer.fullName || customer.name}`,
      data: createdInterview,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const getInterviewById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let interview: any = null;

    if (isConnectedToDb) {
      interview = await Interview.findOne({
        $or: [{ interviewId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    }

    if (!interview) {
      interview = IN_MEMORY_INTERVIEWS.find(i => i.interviewId === id || i.id === id);
    }

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Interview with ID '${id}' was not found.` },
      });
    }

    // Security check: Store isolation
    if (req.user?.role === 'STORE_OPERATOR' && interview.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'CROSS_STORE_ACCESS_DENIED', message: 'Access denied to interview records from another store.' },
      });
    }

    return res.status(200).json({ success: true, data: interview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const getInterviewByCustomer = async (req: AuthenticatedRequest, res: Response) => {
  const { customerId } = req.params;

  try {
    let interviews: any[] = [];

    if (isConnectedToDb) {
      interviews = await Interview.find({
        $or: [{ customerId }, { customerCode: customerId }],
      }).sort({ createdAt: -1 });
    }

    if (interviews.length === 0) {
      interviews = IN_MEMORY_INTERVIEWS.filter(i => i.customerId === customerId || i.customerCode === customerId);
    }

    // Security check: Store operator can only view their own store's customer interviews
    if (interviews.length > 0 && req.user?.role === 'STORE_OPERATOR') {
      if (interviews[0].storeId !== req.user.storeId) {
        return res.status(403).json({
          success: false,
          error: { code: 'CROSS_STORE_ACCESS_DENIED', message: 'Access denied to interview from another store.' },
        });
      }
    }

    const latest = interviews[0] || null;

    return res.status(200).json({
      success: true,
      data: {
        latest,
        history: interviews,
        total: interviews.length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const saveProgress = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const parseResult = saveProgressSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { answers, completedSections, language } = parseResult.data;

  try {
    let interview: any = null;

    if (isConnectedToDb) {
      interview = await Interview.findOne({
        $or: [{ interviewId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    } else {
      interview = IN_MEMORY_INTERVIEWS.find(i => i.interviewId === id || i.id === id);
    }

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Interview with ID '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && interview.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot modify interviews from another store.' },
      });
    }

    // Adaptive branching: Prune answers to questions whose dependencies are no longer satisfied
    const rawAnswerMap: Record<string, string> = {};
    for (const a of answers) {
      rawAnswerMap[a.questionId] = a.answerValue;
    }
    const prunedMap = pruneInapplicableAnswers(rawAnswerMap);
    const activeSubmittedAnswers = answers.filter(a => prunedMap[a.questionId] !== undefined);

    const warningFlags = evaluateWarningFlags(activeSubmittedAnswers);
    const hasRedFlags = warningFlags.length > 0;

    const formattedAnswers: IInterviewAnswer[] = activeSubmittedAnswers.map(a => ({
      questionId: a.questionId,
      sectionId: a.sectionId,
      questionText: a.questionText,
      category: a.category,
      answerValue: a.answerValue,
      answerLabel: a.answerLabel,
      answerType: a.answerType,
      language: a.language || interview.language,
      inputMethod: a.inputMethod,
      voiceTranscript: a.voiceTranscript,
      isRedFlag: a.isRedFlag || warningFlags.some(f => f.questionId === a.questionId),
      answeredAt: a.answeredAt ? new Date(a.answeredAt) : new Date(),
    }));

    if (isConnectedToDb) {
      interview.answers = formattedAnswers;
      interview.responses = formattedAnswers;
      if (completedSections) interview.completedSections = completedSections;
      if (language) interview.language = language;
      interview.hasRedFlags = hasRedFlags;
      interview.warningFlags = warningFlags;
      await interview.save();
    } else {
      interview.answers = formattedAnswers;
      interview.responses = formattedAnswers;
      if (completedSections) interview.completedSections = completedSections;
      if (language) interview.language = language;
      interview.hasRedFlags = hasRedFlags;
      interview.warningFlags = warningFlags;
      interview.updatedAt = new Date().toISOString();
    }

    return res.status(200).json({
      success: true,
      message: 'Interview progress saved successfully',
      data: interview,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};

export const completeInterview = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const parseResult = completeInterviewSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
    });
  }

  const { answers, completedSections, durationSeconds, language } = parseResult.data;

  try {
    let interview: any = null;

    if (isConnectedToDb) {
      interview = await Interview.findOne({
        $or: [{ interviewId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
    } else {
      interview = IN_MEMORY_INTERVIEWS.find(i => i.interviewId === id || i.id === id);
    }

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Interview with ID '${id}' not found.` },
      });
    }

    if (req.user?.role === 'STORE_OPERATOR' && interview.storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot complete interviews from another store.' },
      });
    }

    // Adaptive branching: Prune answers to questions whose dependencies are no longer satisfied
    const rawAnswerMap: Record<string, string> = {};
    for (const a of answers) {
      rawAnswerMap[a.questionId] = a.answerValue;
    }
    const prunedMap = pruneInapplicableAnswers(rawAnswerMap);
    const activeSubmittedAnswers = answers.filter(a => prunedMap[a.questionId] !== undefined);

    // Evaluate red flag warning conditions
    const warningFlags = evaluateWarningFlags(activeSubmittedAnswers);
    const hasRedFlags = warningFlags.length > 0;
    const redFlagReason = hasRedFlags ? warningFlags.map(f => f.descriptionEn).join('; ') : undefined;

    const formattedAnswers: IInterviewAnswer[] = activeSubmittedAnswers.map(a => ({
      questionId: a.questionId,
      sectionId: a.sectionId,
      questionText: a.questionText,
      category: a.category,
      answerValue: a.answerValue,
      answerLabel: a.answerLabel,
      answerType: a.answerType,
      language: a.language || interview.language,
      inputMethod: a.inputMethod,
      voiceTranscript: a.voiceTranscript,
      isRedFlag: a.isRedFlag || warningFlags.some(f => f.questionId === a.questionId),
      answeredAt: a.answeredAt ? new Date(a.answeredAt) : new Date(),
    }));

    // Find customer name for summary
    let customerName = 'Customer';
    if (isConnectedToDb) {
      const c = await Customer.findOne({ customerId: interview.customerId });
      if (c) customerName = c.fullName || c.name;
    } else {
      const c = SEED_CUSTOMERS.find(s => s.customerId === interview.customerId);
      if (c) customerName = c.fullName || c.name;
    }

    // Generate AI/Deterministic structured summary
    const summary = await generateAiSummary(formattedAnswers, warningFlags, customerName);

    const completedAt = new Date();

    if (isConnectedToDb) {
      interview.answers = formattedAnswers;
      interview.responses = formattedAnswers;
      interview.completedSections = completedSections || ['sec_basic', 'sec_daily', 'sec_history', 'sec_warning', 'sec_lifestyle'];
      if (language) interview.language = language;
      interview.status = 'COMPLETED';
      interview.completedAt = completedAt;
      interview.durationSeconds = durationSeconds || Math.round((completedAt.getTime() - new Date(interview.startedAt).getTime()) / 1000);
      interview.hasRedFlags = hasRedFlags;
      interview.redFlagReason = redFlagReason;
      interview.warningFlags = warningFlags;
      interview.summary = summary;
      await interview.save();

      // Advance customer workflow status
      await Customer.updateOne(
        { customerId: interview.customerId },
        {
          workflowStatus: 'INTERVIEW_COMPLETED',
          'screeningSummary.hasWarningFlags': hasRedFlags,
          'screeningSummary.aiSummarySnippet': summary.aiSummarySnippet,
        }
      );
    } else {
      interview.answers = formattedAnswers;
      interview.responses = formattedAnswers;
      interview.completedSections = completedSections || ['sec_basic', 'sec_daily', 'sec_history', 'sec_warning', 'sec_lifestyle'];
      if (language) interview.language = language;
      interview.status = 'COMPLETED';
      interview.completedAt = completedAt.toISOString();
      interview.durationSeconds = durationSeconds || 320;
      interview.hasRedFlags = hasRedFlags;
      interview.redFlagReason = redFlagReason;
      interview.warningFlags = warningFlags;
      interview.summary = summary;
      interview.updatedAt = completedAt.toISOString();

      // Update in-memory customer
      const c = SEED_CUSTOMERS.find(s => s.customerId === interview.customerId);
      if (c) {
        c.workflowStatus = 'INTERVIEW_COMPLETED';
        if (c.screeningSummary) {
          c.screeningSummary.hasWarningFlags = hasRedFlags;
          c.screeningSummary.aiSummarySnippet = summary.aiSummarySnippet;
        }
      }
    }

    logAuditEvent({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'INTERVIEW_COMPLETED',
      resourceType: 'INTERVIEW',
      resourceId: interview.interviewId,
      details: {
        customerId: interview.customerId,
        hasRedFlags,
        warningCount: warningFlags.length,
      },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Interview completed successfully and structured summary generated.',
      data: interview,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: msg } });
  }
};
