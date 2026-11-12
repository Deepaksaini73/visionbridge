import { apiRequest, getAuthenticatedMediaUrl } from '../../../services/api';
import { ClinicalEyeImageRecord, ImageUploadPayload, EyeImageReviewRecord } from '../types/imaging';

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
};
