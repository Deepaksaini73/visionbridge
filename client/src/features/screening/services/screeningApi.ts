/**
 * VisionBridge Screening API Service
 */

import { apiRequest } from '../../../services/api';
import { ScreeningSessionRecord, ScreeningModuleId } from '../types/screening';

export interface StartScreeningParams {
  customerId: string;
  interviewId?: string;
  selectedTests?: ScreeningModuleId[];
}

export interface CompleteScreeningParams {
  calibrationDetails: any;
  selectedTests?: ScreeningModuleId[];
  completedTests?: ScreeningModuleId[];
  skippedTests?: ScreeningModuleId[];
  trials: any[];
  nearAcuity?: any;
  contrastSensitivity?: any;
  colourVision?: any;
  amslerAssessment?: any;
  operatorObservations?: string;
  testQuality?: 'GOOD' | 'FAIR' | 'UNRELIABLE';
  isIncomplete?: boolean;
  incompleteReason?: string;
}

export interface ReviewScreeningParams {
  clinicalDecision: 'ROUTINE_MONITORING' | 'OPHTHALMIC_REFERRAL' | 'RETEST_RECOMMENDED' | 'INCONCLUSIVE';
  urgency: 'ROUTINE' | 'PROMPT_1_2_WEEKS' | 'URGENT_24_48_HOURS';
  notes: string;
  provisionalRecommendations: string[];
  licenseNumber?: string;
}

export const screeningApi = {
  startScreening: async (params: StartScreeningParams) => {
    return apiRequest<ScreeningSessionRecord>('/screenings/start', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getScreeningById: async (id: string) => {
    return apiRequest<ScreeningSessionRecord>(`/screenings/${id}`, {
      method: 'GET',
    });
  },

  getScreeningsByCustomer: async (customerId: string) => {
    return apiRequest<{ latest: ScreeningSessionRecord | null; history: ScreeningSessionRecord[]; total: number }>(
      `/screenings/customer/${customerId}`,
      { method: 'GET' }
    );
  },

  saveProgress: async (id: string, progressData: any) => {
    return apiRequest<ScreeningSessionRecord>(`/screenings/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progressData),
    });
  },

  completeScreening: async (id: string, completionData: CompleteScreeningParams) => {
    return apiRequest<ScreeningSessionRecord>(`/screenings/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(completionData),
    });
  },

  reviewScreening: async (id: string, reviewData: ReviewScreeningParams) => {
    return apiRequest<ScreeningSessionRecord>(`/screenings/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  },

  getPdfUrl: (screeningId: string) => {
    return `/api/screenings/${screeningId}/pdf`;
  },
};

