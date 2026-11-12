import { Request, Response } from 'express';
import { isConnectedToDb } from '../config/db.js';

// Fictional clinical cases queued for Optometrist review
const DEMO_REVIEW_QUEUE = [
  {
    id: 'rev_case_01',
    customerId: 'cust_demo_02',
    customerCode: 'VB-2026-0102',
    customerName: 'Mohammad Tariq',
    age: 61,
    gender: 'MALE',
    storeName: 'VisionPoint Chittoor Center',
    urgencyLevel: 'HIGH',
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
      urgency: 'URGENT'
    },
    status: 'PENDING_REVIEW',
    submittedAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'rev_case_02',
    customerId: 'cust_demo_01',
    customerCode: 'VB-2026-0101',
    customerName: 'Lakshmi Narayanan',
    age: 52,
    gender: 'FEMALE',
    storeName: 'VisionPoint Madanapalle',
    urgencyLevel: 'MODERATE',
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

export const getReviewQueue = (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: DEMO_REVIEW_QUEUE,
    meta: { isDemoData: true, pendingCount: DEMO_REVIEW_QUEUE.filter(c => c.status === 'PENDING_REVIEW').length }
  });
};

export const submitReviewDecision = (req: Request, res: Response) => {
  const { caseId } = req.params;
  const { decision, clinicalNotes, referralFacility, urgency } = req.body;

  if (!decision || !clinicalNotes) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_SUBMISSION', message: 'Decision and clinical notes are required.' }
    });
  }

  const foundCase = DEMO_REVIEW_QUEUE.find(c => c.id === caseId || c.customerId === caseId);
  if (foundCase) {
    foundCase.status = decision === 'REFERRAL_RECOMMENDED' ? 'REFERRAL_REQUIRED' : 'REVIEWED';
  }

  return res.status(200).json({
    success: true,
    data: {
      caseId,
      decision,
      clinicalNotes,
      referralFacility,
      urgency: urgency || 'ROUTINE',
      reviewedAt: new Date().toISOString(),
      verifiedBy: 'Dr. Ananya Sharma, M.Optom (Optometrist Reviewer)'
    },
    message: 'Clinical review submitted successfully'
  });
};

