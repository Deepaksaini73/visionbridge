import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Brain, 
  Sparkles, 
  Eye, 
  Calendar, 
  User, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Loader2,
  Stethoscope,
  Info
} from 'lucide-react';
import { ClinicalEyeImageRecord, EyeSide, ClinicalImageType } from '../types/imaging';
import { imagingApi, getAuthenticatedMediaUrl } from '../services/imagingApi';
import { useAuth } from '../../../context/AuthContext';

interface ImageViewerModalProps {
  images: ClinicalEyeImageRecord[];
  initialImageId?: string;
  isOpen: boolean;
  onClose: () => void;
  onImageUpdated?: (updatedImage: ClinicalEyeImageRecord) => void;
}

const COMMON_RECOMMENDATIONS = [
  'In-Person Slit Lamp Examination',
  'Dilated Fundus Biomicroscopy',
  'Urgent Ophthalmology Referral',
  'Corneal Fluorescein Staining',
  'Optical Coherence Tomography (OCT)',
  'Visual Field Humphrey Testing',
  'Intraocular Pressure (Tonometry) Check',
  'Routine 12-Month Tele-Screening Follow-up',
];

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  images,
  initialImageId,
  isOpen,
  onClose,
  onImageUpdated,
}) => {
  const { user, role } = useAuth();
  const isClinician = role === 'OPTOMETRIST' || role === 'ADMIN';

  // Navigation state
  const [currentIndex, setCurrentIndex] = useState(0);

  // Transform controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // AI Modal info state
  const [showAiModal, setShowAiModal] = useState(false);

  // Optometrist Review Form state
  const [reviewStatus, setReviewStatus] = useState<
    'NORMAL' | 'SUSPECTED_PATHOLOGY' | 'INCONCLUSIVE' | 'POOR_IMAGE_QUALITY'
  >('NORMAL');
  const [observations, setObservations] = useState('');
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Find initial index
  useEffect(() => {
    if (initialImageId && images.length > 0) {
      const idx = images.findIndex((img) => img.imageId === initialImageId || img.id === initialImageId || img._id === initialImageId);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [initialImageId, images]);

  // Reset transforms on image change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setReviewError(null);
    setReviewSuccess(false);
    setObservations('');
    setSelectedRecommendations([]);
  }, [currentIndex]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const currentImage = images[currentIndex];

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentImage) return null;

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleFitScreen = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  // Format helpers
  const getEyeBadge = (side: EyeSide) => {
    switch (side) {
      case 'RIGHT':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">Right Eye (OD)</span>;
      case 'LEFT':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">Left Eye (OS)</span>;
      case 'BOTH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">Both Eyes (OU)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">Unspecified</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REVIEWED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Reviewed
          </span>
        );
      case 'REFERRAL_REQUIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Referral Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 mr-1" /> Pending Review
          </span>
        );
    }
  };

  const toggleRecommendation = (item: string) => {
    setSelectedRecommendations((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    );
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setReviewSuccess(false);

    if (!observations.trim()) {
      setReviewError('Please provide clinical observations before signing off.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const updated = await imagingApi.reviewEyeImage(currentImage.imageId, {
        status: reviewStatus,
        observations: observations.trim(),
        recommendations: selectedRecommendations,
        licenseNumber: (user as any)?.licenseNumber || 'OPT-REG-2026',
      });

      setReviewSuccess(true);
      if (onImageUpdated) onImageUpdated(updated);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getAuthenticatedMediaUrl(currentImage.fileUrl);
    link.download = `${currentImage.customerCode}_${currentImage.eyeSide}_${currentImage.imageId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-6 z-20">
        
        {/* Left: Title & Index */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold text-base">
              Clinical Eye Image Viewer
            </h3>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {currentImage.customerCode}
            </span>
            <span>·</span>
            <span>Image {currentIndex + 1} of {images.length}</span>
          </div>
        </div>

        {/* Center: Image Manipulation Controls */}
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-800/90 rounded-xl p-1 border border-slate-700/80 shadow-lg">
          <button
            onClick={handleZoomOut}
            title="Zoom Out (-25%)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 px-2 min-w-[48px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In (+25%)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            onClick={handleRotate}
            title="Rotate 90° Clockwise"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitScreen}
            title="Reset Zoom & Rotation"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions & Close */}
        <div className="flex items-center space-x-3">
          
          {/* AI Analysis Button (Informative) */}
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/50 hover:to-blue-600/50 border border-purple-500/40 text-purple-200 text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Analysis — Coming Soon</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            title="Download original file"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Image Canvas (Left) + Clinical Metadata/Review Panel (Right) */}
      <div className="w-full h-full pt-16 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left: Image Canvas */}
        <div className="relative flex-1 bg-black flex items-center justify-center p-4 overflow-hidden select-none">
          
          {/* Left Arrow */}
          {images.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-6 z-10 w-12 h-12 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700 shadow-xl transition backdrop-blur-sm"
              title="Previous Image (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Image Container */}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
            <img
              src={getAuthenticatedMediaUrl(currentImage.fileUrl)}
              alt={`Eye Image ${currentImage.imageId}`}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
                maxHeight: '85vh',
                maxWidth: '85vw',
              }}
              className="object-contain rounded-lg shadow-2xl border border-slate-800 pointer-events-auto"
            />
          </div>

          {/* Right Arrow */}
          {images.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-6 z-10 w-12 h-12 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700 shadow-xl transition backdrop-blur-sm"
              title="Next Image (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Bottom Thumbnails Strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800 backdrop-blur-md max-w-[80vw] overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={img.imageId || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                    idx === currentIndex
                      ? 'border-blue-500 ring-2 ring-blue-500/40'
                      : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getAuthenticatedMediaUrl(img.fileUrl)}
                    alt="thumbnail"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Metadata & Clinical Review Panel */}
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-auto lg:h-full overflow-y-auto">
          
          <div className="p-5 space-y-6">
            
            {/* Header Status & Anatomical Badges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getEyeBadge(currentImage.eyeSide)}
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {currentImage.imageType.replace(/_/g, ' ')}
                  </span>
                </div>
                {getStatusBadge(currentImage.reviewStatus)}
              </div>

              {currentImage.gazeDirection && (
                <div className="text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500">Gaze: </span>
                  <span className="text-slate-200 font-medium">
                    {currentImage.gazeDirection.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Clinical Metadata List */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Captured Date:
                </span>
                <span className="text-slate-200 font-medium">
                  {new Date(currentImage.captureDate).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Uploaded By:
                </span>
                <span className="text-slate-200">
                  {currentImage.uploadedBy?.name || 'Store Operator'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> File Size:
                </span>
                <span className="text-slate-200 font-mono">
                  {(currentImage.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-emerald-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Informed Consent:
                </span>
                <span className="text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">
                  Obtained & On File
                </span>
              </div>
            </div>

            {/* Clinical Context / Observations */}
            {(currentImage.clinicalContext || currentImage.description) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Clinical Context & Field Notes
                </h4>
                {currentImage.clinicalContext && (
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-200">
                    <span className="font-semibold text-blue-400">Reason for Capture: </span>
                    {currentImage.clinicalContext}
                  </div>
                )}
                {currentImage.description && (
                  <p className="text-xs text-slate-300 leading-relaxed pl-1">
                    {currentImage.description}
                  </p>
                )}
              </div>
            )}

            {/* Past Optometrist Reviews */}
            {currentImage.reviews && currentImage.reviews.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                  Optometrist Review Records ({currentImage.reviews.length})
                </h4>
                
                {currentImage.reviews.map((rev, i) => (
                  <div
                    key={rev.reviewId || i}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        {rev.reviewedBy.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(rev.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400">
                        Determination:
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          rev.status === 'NORMAL'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : rev.status === 'SUSPECTED_PATHOLOGY'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {rev.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed italic bg-slate-900/60 p-2 rounded">
                      "{rev.observations}"
                    </p>

                    {rev.recommendations && rev.recommendations.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Recommendations:
                        </span>
                        <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                          {rev.recommendations.map((rec, rIdx) => (
                            <li key={rIdx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Optometrist Review Submission Form (Only for Clinicians / Specialists) */}
            {isClinician && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" />
                  Sign Off / Record Professional Review
                </h4>

                {reviewSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Optometrist review saved successfully!</span>
                  </div>
                )}

                {reviewError && (
                  <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{reviewError}</span>
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Clinical Determination
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="NORMAL">NORMAL — No Gross Pathology Detected</option>
                      <option value="SUSPECTED_PATHOLOGY">SUSPECTED PATHOLOGY — Referral Indicated</option>
                      <option value="INCONCLUSIVE">INCONCLUSIVE — Further Diagnostic Testing Needed</option>
                      <option value="POOR_IMAGE_QUALITY">POOR IMAGE QUALITY — Retake Advised</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Clinical Observations & Notes <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      rows={3}
                      placeholder="Enter slit lamp / anatomical findings, vessel evaluation, or reason for referral..."
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Recommendations Checkboxes */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                      Clinical Recommendations
                    </label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                      {COMMON_RECOMMENDATIONS.map((item) => (
                        <label
                          key={item}
                          className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecommendations.includes(item)}
                            onChange={() => toggleRecommendation(item)}
                            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview || !observations.trim()}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Optometrist Review...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Sign Off Review</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* AI Analysis — Coming Soon Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowAiModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Automated AI Image Analysis
                </h3>
                <span className="text-xs font-semibold text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/60">
                  Architectural Roadmap · Planned Milestone
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                VisionBridge is designed with safety, rigor, and clinical accountability. No automated diagnostic AI model is active in the current deployment.
              </p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-200">Current Standard of Care:</span>
                <p className="text-slate-400">
                  All clinical photographs are evaluated manually by licensed optometrists and tele-ophthalmologists. Zero fabricated AI confidence scores or mock predictions are generated.
                </p>
              </div>

              <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-900/50 space-y-2">
                <span className="font-semibold text-purple-300">Upcoming Multi-Modal AI Pipeline:</span>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  <li><strong className="text-slate-200">Anterior Segment Quality Filter:</strong> Blur & illumination detection on mobile lenses.</li>
                  <li><strong className="text-slate-200">Fundus Triage Microservice:</strong> Cup-to-disc ratio & diabetic retinopathy screening.</li>
                  <li><strong className="text-slate-200">Edge-Preserving Privacy:</strong> Local anonymization conforming to HIPAA / GDPR health data boundaries.</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
