import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, User, Loader2, Check, AlertCircle } from 'lucide-react';
import { imagingApi, getAuthenticatedMediaUrl } from '../services/imagingApi';

interface ProfilePhotoUploaderProps {
  customerId: string;
  customerName: string;
  photoUrl?: string;
  canEdit?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onPhotoUpdated?: (newUrl: string | null) => void;
}

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  customerId,
  customerName,
  photoUrl,
  canEdit = true,
  size = 'lg',
  onPhotoUpdated,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(photoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if photoUrl prop updates
  React.useEffect(() => {
    setCurrentUrl(photoUrl || null);
  }, [photoUrl]);

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-24 h-24 text-xl',
    xl: 'w-32 h-32 text-3xl',
  };

  const getInitials = (name: string) => {
    if (!name) return 'VB';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    if (showConfirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showConfirmModal]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File size is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed profile picture size is 5 MB.`);
      return;
    }

    // Read preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewDataUrl(dataUrl);
      setShowConfirmModal(true);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected if cancelled
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!previewDataUrl) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const data = await imagingApi.uploadProfilePhoto(customerId, previewDataUrl);
      const freshUrl = `${data.profilePhotoUrl}?t=${Date.now()}`;
      setCurrentUrl(freshUrl);
      setShowConfirmModal(false);
      setPreviewDataUrl(null);
      if (onPhotoUpdated) onPhotoUpdated(data.profilePhotoUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading profile photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove the profile photo?')) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      await imagingApi.deleteProfilePhoto(customerId);
      setCurrentUrl(null);
      if (onPhotoUpdated) onPhotoUpdated(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error removing photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-block select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Circular Avatar Container */}
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-slate-200 shadow-sm relative group bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center font-bold`}
      >
        {currentUrl ? (
          <img
            src={getAuthenticatedMediaUrl(currentUrl)}
            alt={customerName}
            key={currentUrl}
            className="w-full h-full object-cover z-10"
            onError={() => setCurrentUrl(null)}
          />
        ) : null}
        
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          {getInitials(customerName)}
        </span>

        {/* Edit Hover Overlay if enabled */}
        {canEdit && !isUploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload or Change Photo"
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
          >
            <Camera className="w-5 h-5 drop-shadow" />
          </button>
        )}

        {/* Loading Spinner */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </div>

      {/* Quick Action Badges */}
      {canEdit && currentUrl && size !== 'sm' && (
        <button
          type="button"
          onClick={handleRemovePhoto}
          title="Remove Photo"
          className="absolute -bottom-1 -right-1 p-1 bg-white border border-slate-200 text-rose-600 rounded-full hover:bg-rose-50 shadow-sm transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="absolute top-full left-0 mt-1 z-30 w-64 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] p-2 rounded-lg shadow-md flex items-start space-x-1.5 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Preview Confirmation Modal */}
      {showConfirmModal && previewDataUrl && (
        <div className="fixed inset-0 z-[105] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 text-center animate-fade-in">
            <h3 className="text-base font-bold text-slate-800">Confirm Profile Photo</h3>
            <p className="text-xs text-slate-500">
              Crop preview for <strong>{customerName}</strong>
            </p>

            <div className="w-36 h-36 mx-auto rounded-full overflow-hidden border-4 border-teal-500 shadow-md">
              <img
                src={previewDataUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex justify-center space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPreviewDataUrl(null);
                }}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Profile Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
