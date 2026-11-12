import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Upload, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Maximize2, 
  Trash2, 
  Loader2, 
  Camera,
  Image as ImageIcon,
  ShieldCheck
} from 'lucide-react';
import { ClinicalEyeImageRecord, EyeSide } from '../types/imaging';
import { imagingApi, getAuthenticatedMediaUrl } from '../services/imagingApi';
import { ClinicalEyeImageUploader } from './ClinicalEyeImageUploader';
import { ImageViewerModal } from './ImageViewerModal';

interface EyeImageGalleryProps {
  customerId: string;
  customerCode: string;
  customerName: string;
  canUpload?: boolean;
  canReview?: boolean;
  onImagesChange?: (count: number) => void;
}

export const EyeImageGallery: React.FC<EyeImageGalleryProps> = ({
  customerId,
  customerCode,
  customerName,
  canUpload = true,
  canReview = false,
  onImagesChange,
}) => {
  const [images, setImages] = useState<ClinicalEyeImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [viewerSelectedId, setViewerSelectedId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fetchImages = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await imagingApi.getCustomerEyeImages(customerId);
      setImages(data || []);
      if (onImagesChange) {
        onImagesChange(data?.length || 0);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load eye photographs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchImages();
    }
  }, [customerId]);

  const handleUploadSuccess = (newImage: ClinicalEyeImageRecord) => {
    setImages((prev) => [newImage, ...prev]);
    if (onImagesChange) {
      onImagesChange(images.length + 1);
    }
  };

  const handleImageUpdated = (updatedImage: ClinicalEyeImageRecord) => {
    setImages((prev) =>
      prev.map((img) =>
        img.imageId === updatedImage.imageId || img._id === updatedImage._id || img.id === updatedImage.id
          ? updatedImage
          : img
      )
    );
  };

  const handleDeleteImage = async (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this clinical eye image? This action cannot be undone.')) {
      return;
    }

    try {
      await imagingApi.deleteEyeImage(imageId);
      setImages((prev) => prev.filter((img) => img.imageId !== imageId));
      if (onImagesChange) {
        onImagesChange(Math.max(0, images.length - 1));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete image.');
    }
  };

  const openViewer = (imageId: string) => {
    setViewerSelectedId(imageId);
    setIsViewerOpen(true);
  };

  const getEyeBadge = (side: EyeSide) => {
    switch (side) {
      case 'RIGHT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">OD (Right Eye)</span>;
      case 'LEFT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">OS (Left Eye)</span>;
      case 'BOTH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">OU (Both Eyes)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">Unspecified</span>;
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'REVIEWED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Reviewed
          </span>
        );
      case 'REFERRAL_REQUIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 mr-1" /> Referral
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Eye Images & Clinical Photos
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                {images.length}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Anterior segment, motility, and tele-optometric triage records
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {images.length > 0 && (
            <button
              onClick={() => openViewer(images[0].imageId)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Open Viewer</span>
            </button>
          )}

          {canUpload && (
            <button
              onClick={() => setIsUploaderOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Eye Photos</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading clinical photographs...</span>
          </div>
        ) : errorMessage ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={fetchImages}
              className="font-semibold underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        ) : images.length === 0 ? (
          
          /* Empty State */
          <div className="py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <div className="max-w-sm">
              <h4 className="text-sm font-semibold text-slate-800">
                No Clinical Eye Photographs Uploaded
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Capture macro anterior-segment, gaze positions, or external eye photos using your mobile camera or optical attachment for tele-optometry review.
              </p>
            </div>
            {canUpload && (
              <button
                onClick={() => setIsUploaderOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First Eye Photo</span>
              </button>
            )}
          </div>

        ) : (
          
          /* Image Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.imageId}
                onClick={() => openViewer(image.imageId)}
                className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-400 transition cursor-pointer flex flex-col"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={getAuthenticatedMediaUrl(image.fileUrl)}
                    alt={`${image.eyeSide} eye`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <div>{getEyeBadge(image.eyeSide)}</div>
                    <div>{getStatusPill(image.reviewStatus)}</div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-800 text-xs font-bold shadow flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" /> View Photo
                    </span>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                        {image.imageType.replace(/_/g, ' ')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(image.captureDate).toLocaleDateString()}
                      </span>
                    </div>

                    {image.clinicalContext && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-1 font-medium">
                        {image.clinicalContext}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <ShieldCheck className="w-3 h-3" /> Consent Verified
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteImage(e, image.imageId)}
                      title="Delete photograph"
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Uploader Modal */}
      {isUploaderOpen && (
        <ClinicalEyeImageUploader
          customerId={customerId}
          customerCode={customerCode}
          customerName={customerName}
          isOpen={isUploaderOpen}
          onClose={() => setIsUploaderOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* Image Viewer Modal */}
      {isViewerOpen && (
        <ImageViewerModal
          images={images}
          initialImageId={viewerSelectedId || undefined}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          onImageUpdated={handleImageUpdated}
        />
      )}

    </div>
  );
};

