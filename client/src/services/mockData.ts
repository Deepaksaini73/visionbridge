export interface DemoCustomer {
  id: string;
  clientUuid: string;
  customerCode: string;
  fullName: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  phone?: string;
  preferredLanguage: 'hi' | 'en';
  consentGiven: boolean;
  consentTimestamp: string;
  status: 'REGISTERED' | 'PENDING_REVIEW' | 'REVIEWED' | 'REFERRAL_REQUIRED' | 'RETEST_REQUESTED';
  notes?: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
  screeningSummary?: {
    rightEyeAcuity: string;
    leftEyeAcuity: string;
    amslerAbnormal: boolean;
    hasWarningFlags: boolean;
    aiSummarySnippet: string;
  };
}

// High-fidelity fictional demo records clearly labeled for development
export const INITIAL_DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    id: 'cust_demo_01',
    clientUuid: '1001-fictional-uuid-01',
    customerCode: 'VB-2026-0101',
    fullName: 'Lakshmi Narayanan',
    age: 52,
    gender: 'FEMALE',
    phone: '+91 98450 11223',
    preferredLanguage: 'hi',
    consentGiven: true,
    consentTimestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'PENDING_REVIEW',
    notes: 'Reports difficulty threading needles and reading newspaper in low light',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    screeningSummary: {
      rightEyeAcuity: '6/12',
      leftEyeAcuity: '6/18',
      amslerAbnormal: false,
      hasWarningFlags: false,
      aiSummarySnippet: 'Presbyopia-indicative symptoms reported with bilateral mild distance blur. No acute red flags.'
    }
  },
  {
    id: 'cust_demo_02',
    clientUuid: '1002-fictional-uuid-02',
    customerCode: 'VB-2026-0102',
    fullName: 'Mohammad Tariq',
    age: 61,
    gender: 'MALE',
    phone: '+91 97412 88990',
    preferredLanguage: 'en',
    consentGiven: true,
    consentTimestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'REFERRAL_REQUIRED',
    notes: 'Reported central wavy lines when looking at tile grid in workshop',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    screeningSummary: {
      rightEyeAcuity: '6/9',
      leftEyeAcuity: '6/36',
      amslerAbnormal: true,
      hasWarningFlags: true,
      aiSummarySnippet: 'Significant visual asymmetry (OD 6/9 vs OS 6/36) with positive left eye metamorphopsia on Amsler grid.'
    }
  },
  {
    id: 'cust_demo_03',
    clientUuid: '1003-fictional-uuid-03',
    customerCode: 'VB-2026-0103',
    fullName: 'Pooja Verma',
    age: 24,
    gender: 'FEMALE',
    phone: '+91 91234 55667',
    preferredLanguage: 'hi',
    consentGiven: true,
    consentTimestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    status: 'REVIEWED',
    notes: 'College student experiencing evening eye fatigue following screen work',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    screeningSummary: {
      rightEyeAcuity: '6/6',
      leftEyeAcuity: '6/6',
      amslerAbnormal: false,
      hasWarningFlags: false,
      aiSummarySnippet: 'Normal bilateral acuity (6/6). Symptoms consistent with asthenopia/digital eye strain.'
    }
  },
  {
    id: 'cust_demo_04',
    clientUuid: '1004-fictional-uuid-04',
    customerCode: 'VB-2026-0104',
    fullName: 'Harish Chandra',
    age: 44,
    gender: 'MALE',
    phone: '+91 93456 77889',
    preferredLanguage: 'hi',
    consentGiven: true,
    consentTimestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'REGISTERED',
    notes: 'Waiting for voice-guided interview',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];
