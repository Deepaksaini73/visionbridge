import { apiRequest, getAuthenticatedMediaUrl } from '../../../services/api';
import {
  ClinicalEyeImageRecord,
  ImageUploadPayload,
  EyeCaptureAiAnalysis,
  EyeQualityAssessment,
  AdnexalTelemetryData,
} from '../types/imaging';

export { getAuthenticatedMediaUrl };

export const imagingApi = {
  // Customer Profile Photo
  uploadProfilePhoto: async (customerId: string, imageData: string): Promise<{ customerId: string; profilePhotoUrl: string; uploadedAt: string }> => {
    const res = await apiRequest<{ customerId: string; profilePhotoUrl: string; uploadedAt: string }>(
      `/customers/${customerId}/photo`,
      {
        method: 'POST',
        body: JSON.stringify({ imageData }),
      }
    );
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || res.message || 'Failed to upload profile photo');
    }
    return res.data;
  },

  deleteProfilePhoto: async (customerId: string): Promise<boolean> => {
    const res = await apiRequest(`/customers/${customerId}/photo`, {
      method: 'DELETE',
    });
    return res.success;
  },

  // Clinical Eye Images
  getCustomerEyeImages: async (customerId: string): Promise<ClinicalEyeImageRecord[]> => {
    const res = await apiRequest<ClinicalEyeImageRecord[]>(`/images/customer/${customerId}`, {
      method: 'GET',
    });
    if (!res.success) {
      throw new Error(res.error?.message || res.message || 'Failed to fetch eye images');
    }
    return res.data || [];
  },

  getEyeImageById: async (imageId: string): Promise<ClinicalEyeImageRecord> => {
    const res = await apiRequest<ClinicalEyeImageRecord>(`/images/${imageId}`, {
      method: 'GET',
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || res.message || 'Eye image not found');
    }
    return res.data;
  },

  uploadEyeImage: async (payload: ImageUploadPayload): Promise<ClinicalEyeImageRecord> => {
    const res = await apiRequest<ClinicalEyeImageRecord>('/images/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || res.message || 'Failed to upload eye photograph');
    }
    return res.data;
  },

  reviewEyeImage: async (
    imageId: string,
    reviewData: {
      observations: string;
      recommendations?: string[];
      status: 'NORMAL' | 'SUSPECTED_PATHOLOGY' | 'INCONCLUSIVE' | 'POOR_IMAGE_QUALITY';
      licenseNumber?: string;
    }
  ): Promise<ClinicalEyeImageRecord> => {
    const res = await apiRequest<ClinicalEyeImageRecord>(`/images/${imageId}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || res.message || 'Failed to submit optometrist review');
    }
    return res.data;
  },

  deleteEyeImage: async (imageId: string): Promise<boolean> => {
    const res = await apiRequest(`/images/${imageId}`, {
      method: 'DELETE',
    });
    return res.success;
  },

  // EyeCapture AI (Milestone 5.1)
  checkEyeQuality: async (params: {
    imageId?: string;
    imageData?: string;
    filename?: string;
  }): Promise<EyeQualityAssessment> => {
    const res = await apiRequest<EyeQualityAssessment>('/ai/eye-analysis/quality-check', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || res.message || 'Quality assessment failed');
    }
    return res.data;
  },

  analyzeEyeWithAi: async (params: {
    imageId?: string;
    imageData?: string;
    filename?: string;
    forceSegmentation?: boolean;
  }): Promise<EyeCaptureAiAnalysis> => {
    const res = await apiRequest<EyeCaptureAiAnalysis>('/ai/eye-analysis/analyze', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || res.message || 'EyeCapture AI analysis failed');
    }
    return res.data;
  },

  getEyeAnalysisStatus: async (): Promise<any> => {
    const res = await apiRequest('/ai/eye-analysis/status', {
      method: 'GET',
    });
    return res.data;
  },

  // Milestone 5.2B: Adnexal & Alignment Telemetry
  analyzeAdnexalAlignment: async (params: {
    imageId?: string;
    imageData?: string;
    filename?: string;
  }): Promise<AdnexalTelemetryData> => {
    const res = await apiRequest<AdnexalTelemetryData>('/ai/adnexal/analyze', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || res.message || 'Adnexal telemetry analysis failed');
    }
    return res.data;
  },

  getAdnexalStatus: async (): Promise<any> => {
    const res = await apiRequest('/ai/adnexal/status', {
      method: 'GET',
    });
    return res.data;
  },
};
