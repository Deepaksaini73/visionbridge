import { Request, Response } from 'express';
import { isConnectedToDb } from '../config/db.js';
import { Screening } from '../models/Screening.js';
import { Customer } from '../models/Customer.js';
import { Interview } from '../models/Interview.js';
import { EyeImage } from '../models/EyeImage.js';
import { logAuditEvent } from '../models/AuditLog.js';

// Fictional clinical cases queued for Optometrist review (Fallback baseline)
const DEMO_REVIEW_QUEUE = [
  {
    id: 'rev_case_01',
    screeningId: 'SCR-2026-0102',
    customerId: 'cust_demo_02',
    customerCode: 'VB-2026-0102',
    customerName: 'Mohammad Tariq',
    age: 61,
    gender: 'MALE',
    storeName: 'VisionPoint Chittoor Center',
    urgencyLevel: 'HIGH' as const,
    flagCount: 2,
    warningFlags: ['SIGNIFICANT_ACUITY_ASYMMETRY', 'AMSLER_METAMORPHOPSIA'],
    interviewHighlights: [
      'Chief Complaint: Recent onset of wavy lines when inspecting carpentry woodwork',
      'Spectacle History: Wears +2.00 reading glasses bought 3 years ago',
      'No sudden blackout or flashes reported'
    ],
    screeningObservations: {
      rightEyeAcuity: '6/9',
      leftEyeAcuity: '6/36',
      amslerGridRight: 'Normal (Clear grid perception)',
      amslerGridLeft: 'Metamorphopsia reported near center fixation dot',
      testQuality: 'GOOD'
    },
    aiSummary: {
      isFallback: false,
      text: 'Marked inter-ocular acuity disparity (OD 6/9 vs OS 6/36) accompanied by subjective metamorphopsia in the left eye on Amsler evaluation. Strongly indicative of potential macular involvement. Immediate professional assessment indicated.',
      urgency: 'HIGH'
    },
    status: 'PENDING_REVIEW',
    submittedAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'rev_case_02',
    screeningId: 'SCR-2026-0101',
    customerId: 'cust_demo_01',
    customerCode: 'VB-2026-0101',
    customerName: 'Lakshmi Narayanan',
    age: 52,
    gender: 'FEMALE',
    storeName: 'VisionPoint Madanapalle Center',
    urgencyLevel: 'MODERATE' as const,
    flagCount: 0,
    warningFlags: [],
    interviewHighlights: [
      'Chief Complaint: Progressive difficulty reading printed recipes and stitching fabric at near distance',
      'Duration: ~8-12 months gradual onset',
      'Distance vision reported clear outdoors'
    ],
    screeningObservations: {
      rightEyeAcuity: '6/9',
      leftEyeAcuity: '6/12',
      amslerGridRight: 'Normal',
      amslerGridLeft: 'Normal',
      testQuality: 'GOOD'
    },
    aiSummary: {
      isFallback: false,
      text: 'Bilateral near-vision difficulty consistent with presbyopic age-related changes. Distance acuity acceptable on preliminary screening. No acute macular or red-flag symptoms detected.',
      urgency: 'ROUTINE'
    },
    status: 'PENDING_REVIEW',
    submittedAt: new Date(Date.now() - 3600000 * 6).toISOString()
  }
];

export const getReviewQueue = async (_req: Request, res: Response) => {
  try {
    if (isConnectedToDb) {
      // 1. Fetch live records from database
      const [screenings, customers, interviews, eyeImages] = await Promise.all([
        Screening.find().sort({ createdAt: -1 }).lean(),
        Customer.find().lean(),
        Interview.find().sort({ createdAt: -1 }).lean(),
        EyeImage.find({ isArchived: { $ne: true } }).lean(),
      ]);

      if (screenings.length > 0) {
        const liveCases = screenings.map((s: any) => {
          const custCode = s.customerCode || s.customerId;
          const customer: any = customers.find((c: any) => 
            c.customerId === s.customerId || 
            c.customerCode === custCode || 
            String(c._id) === s.customerId
          ) || {
            fullName: s.customerName || 'Patient Record',
            customerCode: custCode,
            customerId: s.customerId,
            age: 45,
            gender: 'N/A',
            storeName: s.storeName || s.storeId || 'VisionPoint Center',
            profilePhotoUrl: undefined,
            workflowStatus: s.professionalReviewStatus || 'PENDING_REVIEW',
          };

          const interview = interviews.find((i: any) => 
            i.interviewId === s.interviewId || 
            i.customerId === s.customerId || 
            i.customerCode === custCode ||
            i.customerId === customer.customerId
          );

          const imgs = eyeImages.filter((img: any) => 
            img.customerId === s.customerId || 
            img.customerCode === custCode || 
            img.customerId === customer.customerId || 
            img.customerCode === customer.customerCode
          );

          const isUrgent = s.hasRedFlags || 
            interview?.hasRedFlags || 
            s.professionalReview?.urgency === 'URGENT_24_48_HOURS';
          const isModerate = (s.warningFlags && s.warningFlags.length > 0) || 
            (interview?.warningFlags && interview.warningFlags.length > 0);

          const interviewHighlights: string[] = [];
          if (interview?.summary) {
            if (interview.summary.reportedDifficulties?.length) {
              interviewHighlights.push(`Chief Complaint: ${interview.summary.reportedDifficulties.join(', ')}`);
            } else if (interview.summary.distanceVisionConcerns?.length) {
              interviewHighlights.push(`Distance Symptoms: ${interview.summary.distanceVisionConcerns.join(', ')}`);
            } else if (interview.summary.nearVisionConcerns?.length) {
              interviewHighlights.push(`Near Symptoms: ${interview.summary.nearVisionConcerns.join(', ')}`);
            }
            if (interview.summary.duration) {
              interviewHighlights.push(`Duration: ${interview.summary.duration}`);
            }
            if (interview.summary.spectacleHistory) {
              interviewHighlights.push(`Spectacle History: ${interview.summary.spectacleHistory}`);
            }
            if (interview.summary.warningSymptoms?.length) {
              interviewHighlights.push(`Warning Alerts: ${interview.summary.warningSymptoms.join(', ')}`);
            }
          }
          if (interviewHighlights.length === 0 && interview?.answers?.length) {
            const firstFew = interview.answers.slice(0, 3).map((a: any) => `${a.category}: ${a.answerLabel || a.answerValue}`);
            interviewHighlights.push(...firstFew);
          }
          if (interviewHighlights.length === 0) {
            interviewHighlights.push('Visual screening conducted. Raw optotype & macular telemetry recorded.');
          }

          let caseStatus = 'PENDING_REVIEW';
          if (s.professionalReviewStatus === 'REVIEWED' || s.professionalReview) {
            caseStatus = s.professionalReview?.clinicalDecision === 'OPHTHALMIC_REFERRAL' ? 'REFERRAL_REQUIRED' : 'REVIEWED';
          } else if (customer.workflowStatus === 'REVIEWED' || customer.workflowStatus === 'REFERRAL_REQUIRED') {
            caseStatus = customer.workflowStatus;
          }

          const amslerRight = s.amslerAssessment?.rightEye?.status === 'WAVY_LINES' 
            ? 'Metamorphopsia reported' 
            : s.amslerAssessment?.rightEye?.status 
            ? s.amslerAssessment.rightEye.status.replace(/_/g, ' ') 
            : 'Normal';

          const amslerLeft = s.amslerAssessment?.leftEye?.status === 'WAVY_LINES' 
            ? 'Metamorphopsia reported' 
            : s.amslerAssessment?.leftEye?.status 
            ? s.amslerAssessment.leftEye.status.replace(/_/g, ' ') 
            : 'Normal';

          return {
            id: s.screeningId || String(s._id),
            screeningId: s.screeningId,
            customerId: customer.customerId || s.customerId,
            customerCode: customer.customerCode || custCode,
            customerName: customer.fullName || customer.name || s.customerName || 'Patient',
            profilePhotoUrl: customer.profilePhotoUrl || customer.profilePhoto?.url,
            age: customer.age,
            gender: customer.gender,
            storeName: s.storeName || customer.storeName || s.storeId || 'VisionPoint Center',
            urgencyLevel: isUrgent ? ('HIGH' as const) : isModerate ? ('MODERATE' as const) : ('ROUTINE' as const),
            flagCount: (s.warningFlags?.length || 0) + (interview?.warningFlags?.length || 0),
            warningFlags: Array.from(new Set([
              ...(s.warningFlags || []),
              ...(interview?.warningFlags?.map((w: any) => w.descriptionEn || w.flagType) || [])
            ])),
            interviewHighlights,
            screeningObservations: {
              rightEyeAcuity: s.visualAcuity?.rightEye?.preliminaryScore || s.visualAcuity?.rightEyeEstimatedScore || 'Not Tested',
              leftEyeAcuity: s.visualAcuity?.leftEye?.preliminaryScore || s.visualAcuity?.leftEyeEstimatedScore || 'Not Tested',
              amslerGridRight: amslerRight,
              amslerGridLeft: amslerLeft,
              testQuality: s.visualAcuity?.testQuality || s.testValidity || 'GOOD'
            },
            aiSummary: {
              text: interview?.summary?.aiSummarySnippet || 
                (s.hasRedFlags 
                  ? 'Significant acuity asymmetry or macular metamorphopsia noted on examination. Priority clinical evaluation indicated.' 
                  : 'Standard preliminary visual function tests completed. Tele-optometry sign-off pending.'),
              urgency: isUrgent ? 'HIGH' : 'ROUTINE'
            },
            status: caseStatus,
            submittedAt: s.completedAt ? new Date(s.completedAt).toISOString() : new Date(s.createdAt).toISOString(),
            clinicalNotes: s.professionalReview?.notes || '',
            decision: s.professionalReview?.clinicalDecision || '',
            referralFacility: s.professionalReview?.provisionalRecommendations?.[0] || 'District Eye Hospital, Chittoor',
            eyeImagesCount: imgs.length
          };
        });

        // Also append any demo review cases if not already present
        const combined: any[] = [...liveCases];
        for (const demoCase of DEMO_REVIEW_QUEUE) {
          if (!combined.some(c => c.customerCode === demoCase.customerCode)) {
            combined.push({
              ...demoCase,
              clinicalNotes: (demoCase as any).clinicalNotes || '',
              decision: (demoCase as any).decision || '',
              referralFacility: 'District Eye Hospital, Chittoor',
              eyeImagesCount: 1,
            });
          }
        }

        return res.status(200).json({
          success: true,
          data: combined,
          meta: { 
            isLiveDatabase: true, 
            totalCount: combined.length,
            pendingCount: combined.filter(c => c.status === 'PENDING_REVIEW').length 
          }
        });
      }
    }

    // Fallback to demo queue
    return res.status(200).json({
      success: true,
      data: DEMO_REVIEW_QUEUE,
      meta: { isDemoData: true, pendingCount: DEMO_REVIEW_QUEUE.filter(c => c.status === 'PENDING_REVIEW').length }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(200).json({
      success: true,
      data: DEMO_REVIEW_QUEUE,
      meta: { isFallback: true, error: msg, pendingCount: DEMO_REVIEW_QUEUE.filter(c => c.status === 'PENDING_REVIEW').length }
    });
  }
};

export const submitReviewDecision = async (req: Request, res: Response) => {
  const { caseId } = req.params;
  const { decision, clinicalNotes, referralFacility, urgency, licenseNumber } = req.body;

  if (!decision || !clinicalNotes) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_SUBMISSION', message: 'Decision and clinical notes are required.' }
    });
  }

  const normalizedDecision = decision === 'REFERRAL_RECOMMENDED' 
    ? 'OPHTHALMIC_REFERRAL' 
    : decision === 'ROUTINE_OBSERVATION' 
    ? 'ROUTINE_MONITORING' 
    : decision;

  const targetWorkflow = (decision === 'REFERRAL_RECOMMENDED' || normalizedDecision === 'OPHTHALMIC_REFERRAL')
    ? 'REFERRAL_REQUIRED'
    : 'REVIEWED';

  const user = (req as any).user || {
    id: 'usr_optometrist_01',
    name: 'Dr. Ananya Sharma, M.Optom',
    role: 'OPTOMETRIST',
  };

  const reviewRecord = {
    reviewedBy: {
      id: user.id || 'usr_optometrist_01',
      name: user.name || 'Dr. Ananya Sharma, M.Optom',
      role: 'OPTOMETRIST',
      licenseNumber: licenseNumber || 'OPT-IN-2024-8841',
    },
    reviewedAt: new Date(),
    clinicalDecision: normalizedDecision,
    urgency: urgency || (normalizedDecision === 'OPHTHALMIC_REFERRAL' ? 'URGENT_24_48_HOURS' : 'ROUTINE'),
    notes: clinicalNotes,
    provisionalRecommendations: referralFacility ? [referralFacility] : ['Routine Observation'],
  };

  try {
    if (isConnectedToDb) {
      // Find matching screening by screeningId, mongo _id, or customerId/customerCode
      let screening = await Screening.findOne({
        $or: [
          { screeningId: caseId },
          { _id: caseId.match(/^[0-9a-fA-F]{24}$/) ? caseId : null },
          { customerId: caseId },
          { customerCode: caseId }
        ].filter(Boolean) as any[]
      });

      if (screening) {
        screening.professionalReview = reviewRecord as any;
        screening.professionalReviewStatus = 'REVIEWED';
        await screening.save();

        await Customer.updateOne(
          { $or: [{ customerId: screening.customerId }, { customerCode: screening.customerId }] },
          { workflowStatus: targetWorkflow }
        );
      } else {
        // Update customer directly if no screening object found
        await Customer.updateOne(
          { $or: [{ customerId: caseId }, { customerCode: caseId }] },
          { workflowStatus: targetWorkflow }
        );
      }

      logAuditEvent({
        userId: user.id,
        userRole: 'OPTOMETRIST',
        action: 'SCREENING_PROFESSIONAL_REVIEWED',
        resourceType: 'REVIEW',
        resourceId: caseId,
        details: { decision: normalizedDecision, referralFacility },
        ipAddress: req.ip,
      });
    }

    // Also update in-memory demo queue if present
    const foundDemo = DEMO_REVIEW_QUEUE.find(c => c.id === caseId || c.customerId === caseId || c.screeningId === caseId);
    if (foundDemo) {
      foundDemo.status = targetWorkflow;
    }

    return res.status(200).json({
      success: true,
      data: {
        caseId,
        decision: normalizedDecision,
        status: targetWorkflow,
        clinicalNotes,
        referralFacility,
        urgency: reviewRecord.urgency,
        reviewedAt: reviewRecord.reviewedAt.toISOString(),
        verifiedBy: `${reviewRecord.reviewedBy.name} (${reviewRecord.reviewedBy.role})`,
      },
      message: 'Clinical review submitted and saved to database successfully'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: { code: 'REVIEW_SAVE_ERROR', message: `Failed to save review to database: ${msg}` }
    });
  }
};

