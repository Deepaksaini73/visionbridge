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
  Info,
  Layers,
  Sliders,
  RefreshCw,
  Lightbulb,
  Crosshair,
  Ruler,
  Compass,
} from 'lucide-react';
import { 
  ClinicalEyeImageRecord, 
  EyeSide, 
  EyeCaptureAiAnalysis, 
  AdnexalTelemetryData 
} from '../types/imaging';
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
  'Schedule comprehensive slit-lamp biomicroscopy',
  'Measure intraocular pressure (Tonometry)',
  'Perform dilated fundus examination',
  'Corneal topography and pachymetry',
  'Visual field testing (Humphrey / Octopus)',
  'Prescribe lubricating artificial tears for surface dryness',
  'Routine annual vision screening',
  'Urgent ophthalmologist referral indicated',
];

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  images,
  initialImageId,
  isOpen,
  onClose,
  onImageUpdated,
}) => {
  const { user } = useAuth();
  const isClinician = user?.role === 'OPTOMETRIST' || user?.role === 'ADMIN';

  // Navigation & Zoom states
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Review Form states
  const [reviewStatus, setReviewStatus] = useState<'NORMAL' | 'SUSPECTED_PATHOLOGY' | 'INCONCLUSIVE' | 'POOR_IMAGE_QUALITY'>('NORMAL');
  const [observations, setObservations] = useState<string>('');
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // EyeCapture AI states (Milestone 5.1: Anterior Quality & Segmentation)
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, EyeCaptureAiAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.65);

  // Adnexal & Alignment Telemetry states (Milestone 5.2B: Ptosis & Strabismus)
  const [adnexalAnalyses, setAdnexalAnalyses] = useState<Record<string, AdnexalTelemetryData>>({});
  const [isAnalyzingAdnexa, setIsAnalyzingAdnexa] = useState<boolean>(false);

  // Enlarged AI Studio Drawer states
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [activeAiTab, setActiveAiTab] = useState<'ANTERIOR' | 'ADNEXAL'>('ANTERIOR');

  // Initialize index
  useEffect(() => {
    if (initialImageId && images.length > 0) {
      const idx = images.findIndex((img) => img.imageId === initialImageId || img.id === initialImageId);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [initialImageId, images]);

  // Reset transforms on image change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setReviewSuccess(false);
    setReviewError(null);
    setAiError(null);
    setSelectedRecommendations([]);
    setObservations('');
  }, [currentIndex]);

  const currentImage = images[currentIndex];
  const currentAnalysis = currentImage ? aiAnalyses[currentImage.imageId] : undefined;
  const currentAdnexal = currentImage ? adnexalAnalyses[currentImage.imageId] : undefined;

  // Run EyeCapture AI (Milestone 5.1 Anterior Quality & Segmentation)
  const handleRunAiAnalysis = async (forceSegmentation = false) => {
    if (!currentImage) return;
    setIsAnalyzing(true);
    setAiError(null);

    try {
      const result = await imagingApi.analyzeEyeWithAi({
        imageId: currentImage.imageId,
        forceSegmentation,
      });

      setAiAnalyses((prev) => ({
        ...prev,
        [currentImage.imageId]: result,
      }));
      setShowOverlay(true);
    } catch (err: any) {
      setAiError(err.message || 'EyeCapture AI analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Adnexal & Alignment Telemetry (Milestone 5.2B Eyelid Margins, Ptosis & Strabismus)
  const handleRunAdnexalAnalysis = async () => {
    if (!currentImage) return;
    setIsAnalyzingAdnexa(true);
    setAiError(null);

    try {
      const result = await imagingApi.analyzeAdnexalAlignment({
        imageId: currentImage.imageId,
      });

      setAdnexalAnalyses((prev) => ({
        ...prev,
        [currentImage.imageId]: result,
      }));
      setShowOverlay(true);
    } catch (err: any) {
      setAiError(err.message || 'Adnexal telemetry analysis failed.');
    } finally {
      setIsAnalyzingAdnexa(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    },
    [isOpen, currentIndex, images.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !currentImage) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleFitScreen = () => {
    setZoom(1);
    setRotation(0);
  };

  const toggleRecommendation = (item: string) => {
    setSelectedRecommendations((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    );
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observations.trim()) {
      setReviewError('Please enter clinical observation notes before submitting review.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(false);

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

  const getEyeBadge = (side: EyeSide) => {
    switch (side) {
      case 'RIGHT':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-900 text-blue-200 border border-blue-700">Right Eye (OD)</span>;
      case 'LEFT':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-900 text-emerald-200 border border-emerald-700">Left Eye (OS)</span>;
      case 'BOTH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-900 text-purple-200 border border-purple-700">Bilateral (OU)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">{side}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REVIEWED':
        return <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800"><CheckCircle className="w-3.5 h-3.5" /> Reviewed</span>;
      case 'SUSPECTED_PATHOLOGY':
        return <span className="flex items-center gap-1 text-rose-400 font-semibold text-xs bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-800"><AlertTriangle className="w-3.5 h-3.5" /> Suspected Pathology</span>;
      case 'INCONCLUSIVE':
        return <span className="flex items-center gap-1 text-amber-400 font-semibold text-xs bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800"><Clock className="w-3.5 h-3.5" /> Inconclusive</span>;
      default:
        return <span className="flex items-center gap-1 text-blue-400 font-semibold text-xs bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-800"><Clock className="w-3.5 h-3.5" /> Pending Review</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-6 z-20">
        
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

          {/* Overlay Quick Toggle */}
          {((activeAiTab === 'ANTERIOR' && currentAnalysis?.segmentation?.overlay_rgba_base64) ||
            (activeAiTab === 'ADNEXAL' && currentAdnexal?.overlay_rgba_base64)) && (
            <>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button
                onClick={() => setShowOverlay(!showOverlay)}
                title={showOverlay ? "Hide AI Overlay" : "Show AI Overlay"}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  showOverlay
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showOverlay ? 'Overlay ON' : 'Overlay OFF'}</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Quick Action Buttons & Close */}
        <div className="flex items-center space-x-2.5">
          
          {/* EyeCapture Anterior AI Top Button */}
          <button
            onClick={() => {
              setActiveAiTab('ANTERIOR');
              setShowAiModal(true);
              if (!currentAnalysis && !isAnalyzing) {
                handleRunAiAnalysis(false);
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition ${
              currentAnalysis?.quality?.status === 'USABLE_FOR_ANALYSIS'
                ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/40 text-emerald-200'
                : currentAnalysis?.quality?.status === 'RETAKE_RECOMMENDED'
                ? 'bg-rose-950/70 hover:bg-rose-900 border-rose-500/40 text-rose-200'
                : 'bg-gradient-to-r from-purple-600/40 to-indigo-600/40 hover:from-purple-600/60 hover:to-indigo-600/60 border-purple-500/40 text-purple-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>
              {isAnalyzing
                ? 'Analyzing...'
                : currentAnalysis
                ? `Anterior AI (${currentAnalysis.quality.overall_score}%)`
                : 'Anterior AI'}
            </span>
          </button>

          {/* Adnexal & Alignment Telemetry Top Button */}
          <button
            onClick={() => {
              setActiveAiTab('ADNEXAL');
              setShowAiModal(true);
              if (!currentAdnexal && !isAnalyzingAdnexa) {
                handleRunAdnexalAnalysis();
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition ${
              currentAdnexal
                ? 'bg-cyan-950/70 hover:bg-cyan-900 border-cyan-500/40 text-cyan-200'
                : 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 hover:from-cyan-600/60 hover:to-blue-600/60 border-cyan-500/40 text-cyan-200'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isAnalyzingAdnexa
                ? 'Measuring...'
                : currentAdnexal
                ? `Adnexal Biometry (${currentAdnexal.mode === 'BILATERAL_FACE_LANDMARKER' ? 'Bilateral' : 'Macro'})`
                : 'Adnexal Telemetry'}
            </span>
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

      {/* Main Content Area: Image Canvas (Left) + Clinical Details Panel (Right) */}
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

          {/* Main Image Container with Superimposed Pixel-Aligned Overlays */}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
            <div
              className="relative inline-block transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                maxHeight: '85vh',
                maxWidth: '85vw',
              }}
            >
              {/* Plaintext decrypted eye photograph */}
              <img
                src={getAuthenticatedMediaUrl(currentImage.fileUrl)}
                alt={`Eye Image ${currentImage.imageId}`}
                className="object-contain rounded-lg shadow-2xl border border-slate-800 max-h-[85vh] max-w-[85vw] block"
              />

              {/* Anatomy Segmentation Overlay (Milestone 5.1) */}
              {showOverlay && activeAiTab === 'ANTERIOR' && currentAnalysis?.segmentation?.overlay_rgba_base64 && (
                <img
                  src={currentAnalysis.segmentation.overlay_rgba_base64}
                  alt="EyeCapture AI Anatomical Segmentation Overlay"
                  style={{ opacity: overlayOpacity }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-lg transition-opacity duration-200"
                />
              )}

              {/* Pixel-Aligned RGBA Caliper Overlay (Milestone 5.2B) */}
              {showOverlay && activeAiTab === 'ADNEXAL' && currentAdnexal?.overlay_rgba_base64 && (
                <img
                  src={currentAdnexal.overlay_rgba_base64}
                  alt="EyeCapture AI Adnexal Alignment Overlay"
                  style={{ opacity: overlayOpacity }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-lg transition-opacity duration-200"
                />
              )}
            </div>
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

        {/* Right: DETAILS IMAGE PANEL (Metadata, AI Modules & Optometrist Review) */}
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-auto lg:h-full overflow-y-auto">
          
          <div className="p-5 space-y-5">
            
            {/* Header Status & Anatomical Badges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getEyeBadge(currentImage.eyeSide)}
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
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

            {/* Error Banner if any */}
            {aiError && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{aiError}</span>
              </div>
            )}

            {/* MODULE 1: EyeCapture AI Inline Insights Panel (Anterior Quality & Segmentation) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/40 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  EyeCapture AI (Anterior Quality & Anatomy)
                </span>
                {currentAnalysis && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    currentAnalysis.quality.status === 'USABLE_FOR_ANALYSIS'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : currentAnalysis.quality.status === 'RETAKE_RECOMMENDED'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {currentAnalysis.quality.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {isAnalyzing ? (
                <div className="p-3 bg-purple-950/40 rounded-lg border border-purple-800/60 flex items-center space-x-2 text-purple-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                  <span>Evaluating image quality & segmenting ocular anatomy...</span>
                </div>
              ) : currentAnalysis ? (
                <div className="space-y-3 text-xs">
                  {/* Score Meter */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Capture Suitability Score:</span>
                      <span className="font-bold text-white font-mono">{currentAnalysis.quality.overall_score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          currentAnalysis.quality.overall_score >= 68
                            ? 'bg-emerald-500'
                            : currentAnalysis.quality.overall_score >= 48
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${currentAnalysis.quality.overall_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric Pills */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center">
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">Sharpness</span>
                      <span className="text-slate-200 font-bold">{currentAnalysis.quality.sharpness_score}%</span>
                    </div>
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">Exposure</span>
                      <span className="text-slate-200 font-bold">{currentAnalysis.quality.exposure_score}%</span>
                    </div>
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">Contrast</span>
                      <span className="text-slate-200 font-bold">{currentAnalysis.quality.contrast_score}%</span>
                    </div>
                  </div>

                  {/* Recapture Tips if degraded */}
                  {currentAnalysis.quality.recapture_guidance && currentAnalysis.quality.recapture_guidance.length > 0 && (
                    <div className="p-2.5 bg-rose-950/40 rounded-lg border border-rose-900/60 space-y-1">
                      <span className="text-[10px] font-bold text-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" /> Quality Warnings:
                      </span>
                      <ul className="list-disc list-inside text-[10px] text-rose-200/90 space-y-0.5">
                        {currentAnalysis.quality.recapture_guidance.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Anatomy Segmentation Controls & Telemetry */}
                  {currentAnalysis.segmentation && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={showOverlay && activeAiTab === 'ANTERIOR'}
                            onChange={(e) => {
                              setActiveAiTab('ANTERIOR');
                              setShowOverlay(e.target.checked);
                            }}
                            className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <span>Show Anatomy Overlay</span>
                        </label>
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                          <span>Alpha:</span>
                          <input
                            type="range"
                            min="0.2"
                            max="1.0"
                            step="0.05"
                            value={overlayOpacity}
                            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                            className="w-14 accent-cyan-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <span className="w-6 font-mono">{Math.round(overlayOpacity * 100)}%</span>
                        </div>
                      </div>

                      {/* Class Legend */}
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                        <div className="p-1 rounded bg-[#00dcff]/10 text-[#00dcff] border border-[#00dcff]/30 font-semibold">
                          Sclera ({currentAnalysis.segmentation.coverage.sclera_pct}%)
                        </div>
                        <div className="p-1 rounded bg-[#10d778]/10 text-[#10d778] border border-[#10d778]/30 font-semibold">
                          Iris ({currentAnalysis.segmentation.coverage.iris_pct}%)
                        </div>
                        <div className="p-1 rounded bg-[#ff2d55]/10 text-[#ff2d55] border border-[#ff2d55]/30 font-semibold">
                          Pupil ({currentAnalysis.segmentation.coverage.pupil_pct}%)
                        </div>
                      </div>

                      {/* Telemetry Indicator */}
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Pupil/Iris Ratio:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {currentAnalysis.segmentation.telemetry.pupil_to_iris_ratio} ({currentAnalysis.segmentation.telemetry.pupillary_symmetry_flag})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Re-analyze or Details button */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={() => handleRunAiAnalysis(false)}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-check Anterior Image
                    </button>
                    <button
                      onClick={() => {
                        setActiveAiTab('ANTERIOR');
                        setShowAiModal(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white font-medium underline transition"
                    >
                      Enlarge AI Studio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    Analyze sharpness, exposure, glare, and anterior anatomy with EyeCapture AI.
                  </p>
                  <button
                    onClick={() => handleRunAiAnalysis(false)}
                    className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run EyeCapture AI Analysis</span>
                  </button>
                </div>
              )}
            </div>

            {/* MODULE 2: Adnexal & Alignment Telemetry Inline Panel (Milestone 5.2B Ptosis & Strabismus) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-900/40 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Ruler className="w-4 h-4 text-cyan-400" />
                  Adnexal & Alignment Telemetry
                </span>
                {currentAdnexal && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                    {currentAdnexal.mode === 'BILATERAL_FACE_LANDMARKER' ? 'BILATERAL MESH' : 'MACRO CALIPERS'}
                  </span>
                )}
              </div>

              {isAnalyzingAdnexa ? (
                <div className="p-3 bg-cyan-950/40 rounded-lg border border-cyan-800/60 flex items-center space-x-2 text-cyan-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span>Measuring eyelid margins (MRD1/MRD2), PFH & alignment...</span>
                </div>
              ) : currentAdnexal ? (
                <div className="space-y-3 text-xs">
                  {/* Caliper Summary Cards */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {currentAdnexal.right_eye ? (
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-blue-300 font-bold block text-[10px] flex items-center gap-1">
                          <Crosshair className="w-3 h-3 text-blue-400" /> Right Eye (OD)
                        </span>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">MRD1:</span>
                          <span className="font-mono text-white font-bold">{currentAdnexal.right_eye.estimated_mrd1_mm} mm</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">MRD2:</span>
                          <span className="font-mono text-white font-bold">{currentAdnexal.right_eye.estimated_mrd2_mm} mm</span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 border-t border-slate-800">
                          <span className="text-slate-300 font-semibold">PFH:</span>
                          <span className="font-mono text-cyan-300 font-bold">{currentAdnexal.right_eye.estimated_pfh_mm} mm</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Right Eye (OD)</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">Not in crop</span>
                      </div>
                    )}

                    {currentAdnexal.left_eye ? (
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-emerald-300 font-bold block text-[10px] flex items-center gap-1">
                          <Crosshair className="w-3 h-3 text-emerald-400" /> Left Eye (OS)
                        </span>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">MRD1:</span>
                          <span className="font-mono text-white font-bold">{currentAdnexal.left_eye.estimated_mrd1_mm} mm</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">MRD2:</span>
                          <span className="font-mono text-white font-bold">{currentAdnexal.left_eye.estimated_mrd2_mm} mm</span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 border-t border-slate-800">
                          <span className="text-slate-300 font-semibold">PFH:</span>
                          <span className="font-mono text-cyan-300 font-bold">{currentAdnexal.left_eye.estimated_pfh_mm} mm</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Left Eye (OS)</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">Not in crop</span>
                      </div>
                    )}
                  </div>

                  {/* Telemetry Status Row */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Ptosis:</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        currentAdnexal.potential_ptosis
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {currentAdnexal.potential_ptosis ? `Alert (${currentAdnexal.potential_ptosis_eye})` : 'Normal Limits'}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Alignment:</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        currentAdnexal.strabismus_screening.strabismus_suspected
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {currentAdnexal.strabismus_screening.strabismus_suspected ? 'Suspicion' : 'Orthophoric'}
                      </span>
                    </div>
                  </div>

                  {/* Overlay Toggle */}
                  {currentAdnexal.overlay_rgba_base64 && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={showOverlay && activeAiTab === 'ADNEXAL'}
                          onChange={(e) => {
                            setActiveAiTab('ADNEXAL');
                            setShowOverlay(e.target.checked);
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <span>Show Caliper Overlay</span>
                      </label>
                      <span className="text-[10px] text-cyan-400 font-mono">11.7mm Iris Ref</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={handleRunAdnexalAnalysis}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-measure Adnexa
                    </button>
                    <button
                      onClick={() => {
                        setActiveAiTab('ADNEXAL');
                        setShowAiModal(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white font-medium underline transition"
                    >
                      Enlarge Biometry Studio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    Quantify palpebral fissure height (PFH), margin reflex distances (MRD1/MRD2), and optical axis alignment.
                  </p>
                  <button
                    onClick={handleRunAdnexalAnalysis}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Run Adnexal Telemetry Analysis</span>
                  </button>
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

      {/* Enlarged EyeCapture AI Studio Modal Drawer */}
      {showAiModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    VisionBridge EyeCapture AI Studio
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Target Image: {currentImage.imageId} ({currentImage.eyeSide})
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB SELECTOR: Anterior AI vs Adnexal Telemetry */}
            <div className="flex items-center space-x-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveAiTab('ANTERIOR');
                  if (!currentAnalysis && !isAnalyzing) {
                    handleRunAiAnalysis(false);
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
                  activeAiTab === 'ANTERIOR'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Anterior Anatomy (Sclera/Iris/Pupil)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAiTab('ADNEXAL');
                  if (!currentAdnexal && !isAnalyzingAdnexa) {
                    handleRunAdnexalAnalysis();
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
                  activeAiTab === 'ADNEXAL'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Adnexal & Alignment (Ptosis/Strabismus)</span>
              </button>
            </div>

            {/* TAB 1: ANTERIOR QUALITY & SEGMENTATION */}
            {activeAiTab === 'ANTERIOR' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                    Ocular Image Quality & Semantic Segmentation
                  </span>
                  <button
                    onClick={() => handleRunAiAnalysis(false)}
                    disabled={isAnalyzing}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>{currentAnalysis ? 'Re-Run Quality & Segmentation' : 'Run Anterior Analysis'}</span>
                  </button>
                </div>

                {isAnalyzing ? (
                  <div className="p-8 text-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">Processing anterior eye photograph...</p>
                    <p className="text-xs text-slate-400">Measuring focus gradient, illumination balance, and segmenting corneal regions.</p>
                  </div>
                ) : currentAnalysis ? (
                  <div className="space-y-4">
                    {/* Quality Summary */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-xs">Pre-Analysis Image Quality</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          currentAnalysis.quality.status === 'USABLE_FOR_ANALYSIS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : currentAnalysis.quality.status === 'RETAKE_RECOMMENDED'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {currentAnalysis.quality.status.replace(/_/g, ' ')} ({currentAnalysis.quality.overall_score}/100)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Laplacian Sharpness</span>
                          <span className="text-white font-bold">{currentAnalysis.quality.sharpness_score}%</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Illumination Uniformity</span>
                          <span className="text-white font-bold">{currentAnalysis.quality.exposure_score}%</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">RMS Contrast</span>
                          <span className="text-white font-bold">{currentAnalysis.quality.contrast_score}%</span>
                        </div>
                      </div>

                      {currentAnalysis.quality.recapture_guidance.length > 0 && (
                        <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/40 text-xs text-amber-200/90 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-amber-300">
                            <Lightbulb className="w-3.5 h-3.5" /> Recapture Optimization Tips:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 pl-1">
                            {currentAnalysis.quality.recapture_guidance.map((g, idx) => (
                              <li key={idx}>{g}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Anatomy Segmentation Telemetry */}
                    {currentAnalysis.segmentation ? (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 text-xs">Anterior Semantic Segmentation Telemetry</span>
                          <span className="text-[10px] font-mono text-slate-400">{currentAnalysis.segmentation.inference_method}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2.5 rounded-lg bg-[#00dcff]/10 text-[#00dcff] border border-[#00dcff]/30">
                            <span className="block text-[10px] text-slate-300 font-medium">Sclera Coverage</span>
                            <span className="text-base font-bold font-mono">{currentAnalysis.segmentation.coverage.sclera_pct}%</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#10d778]/10 text-[#10d778] border border-[#10d778]/30">
                            <span className="block text-[10px] text-slate-300 font-medium">Iris Coverage</span>
                            <span className="text-base font-bold font-mono">{currentAnalysis.segmentation.coverage.iris_pct}%</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#ff2d55]/10 text-[#ff2d55] border border-[#ff2d55]/30">
                            <span className="block text-[10px] text-slate-300 font-medium">Pupil Coverage</span>
                            <span className="text-base font-bold font-mono">{currentAnalysis.segmentation.coverage.pupil_pct}%</span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Pupil-to-Iris Diameter Ratio:</span>
                            <span className="font-mono text-white font-bold">{currentAnalysis.segmentation.telemetry.pupil_to_iris_ratio}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Pupillary Ambient Symmetry Flag:</span>
                            <span className="font-mono text-emerald-400 font-bold">{currentAnalysis.segmentation.telemetry.pupillary_symmetry_flag}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
                        <p className="text-xs text-slate-400">Segmentation bypassed due to poor image quality assessment.</p>
                        <button
                          onClick={() => handleRunAiAnalysis(true)}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold text-xs"
                        >
                          Force Segmentation Anyway
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-400">No anterior analysis performed yet for this photograph.</p>
                    <button
                      onClick={() => handleRunAiAnalysis(false)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                    >
                      Run EyeCapture AI Analysis
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ADNEXAL & ALIGNMENT TELEMETRY (MILESTONE 5.2B) */}
            {activeAiTab === 'ADNEXAL' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Ocular Adnexa, Ptosis Calipers & Strabismus Alignment
                  </span>
                  <button
                    onClick={handleRunAdnexalAnalysis}
                    disabled={isAnalyzingAdnexa}
                    className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAdnexa ? 'animate-spin' : ''}`} />
                    <span>{currentAdnexal ? 'Re-Measure Adnexa' : 'Run Adnexal Telemetry'}</span>
                  </button>
                </div>

                {isAnalyzingAdnexa ? (
                  <div className="p-8 text-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">Extracting ocular landmarks & eyelid margins...</p>
                    <p className="text-xs text-slate-400">Evaluating Palpebral Fissure Height, MRD1/MRD2, and Hirschberg optical reflex.</p>
                  </div>
                ) : currentAdnexal && currentAdnexal.detected ? (
                  <div className="space-y-4">
                    
                    {/* Operational Mode Header */}
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-slate-200 text-xs">Adnexal Biometry Status</span>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                        {currentAdnexal.mode || 'UNILATERAL_MACRO_CLOSEUP'}
                      </span>
                    </div>

                    {/* Calipers Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Right Eye (OD) */}
                      {currentAdnexal.right_eye ? (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="font-bold text-blue-300 flex items-center gap-1.5 text-xs">
                              <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                              Right Eye (OD) Calipers
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Iris Ø: {currentAdnexal.right_eye.iris_diameter_px}px
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">MRD1 (Upper margin):</span>
                              <span className="font-mono text-white font-bold">{currentAdnexal.right_eye.estimated_mrd1_mm} mm <span className="text-slate-500 font-normal">({currentAdnexal.right_eye.mrd1_px}px)</span></span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">MRD2 (Lower margin):</span>
                              <span className="font-mono text-white font-bold">{currentAdnexal.right_eye.estimated_mrd2_mm} mm <span className="text-slate-500 font-normal">({currentAdnexal.right_eye.mrd2_px}px)</span></span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-800/60">
                              <span className="text-slate-300 font-semibold">Palpebral Fissure (PFH):</span>
                              <span className="font-mono text-cyan-300 font-bold">{currentAdnexal.right_eye.estimated_pfh_mm} mm</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex flex-col justify-center items-center text-center p-4">
                          <span className="text-xs font-semibold text-slate-400 mb-1">Right Eye (OD) Not in Frame</span>
                          <span className="text-[11px] text-slate-500">Contralateral eye not captured in this single-eye macro view.</span>
                        </div>
                      )}

                      {/* Left Eye (OS) */}
                      {currentAdnexal.left_eye ? (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                              Left Eye (OS) Calipers
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Iris Ø: {currentAdnexal.left_eye.iris_diameter_px}px
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">MRD1 (Upper margin):</span>
                              <span className="font-mono text-white font-bold">{currentAdnexal.left_eye.estimated_mrd1_mm} mm <span className="text-slate-500 font-normal">({currentAdnexal.left_eye.mrd1_px}px)</span></span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">MRD2 (Lower margin):</span>
                              <span className="font-mono text-white font-bold">{currentAdnexal.left_eye.estimated_mrd2_mm} mm <span className="text-slate-500 font-normal">({currentAdnexal.left_eye.mrd2_px}px)</span></span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-800/60">
                              <span className="text-slate-300 font-semibold">Palpebral Fissure (PFH):</span>
                              <span className="font-mono text-cyan-300 font-bold">{currentAdnexal.left_eye.estimated_pfh_mm} mm</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex flex-col justify-center items-center text-center p-4">
                          <span className="text-xs font-semibold text-slate-400 mb-1">Left Eye (OS) Not in Frame</span>
                          <span className="text-[11px] text-slate-500">Contralateral eye not captured in this single-eye macro view.</span>
                        </div>
                      )}

                    </div>

                    {/* Ptosis Asymmetry & Strabismus Indicators */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <span className="font-bold text-slate-200 block text-xs">
                        Adnexal Screening Telemetry (Ptosis & Strabismus)
                      </span>

                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                          <span className="text-slate-400 block text-[10px]">PFH Asymmetry</span>
                          <span className="font-mono text-white font-bold text-sm">
                            {currentAdnexal.pfh_asymmetry_pct !== null && currentAdnexal.pfh_asymmetry_pct !== undefined
                              ? `${currentAdnexal.pfh_asymmetry_pct}%`
                              : 'N/A (Single Eye)'}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            currentAdnexal.pfh_asymmetry_pct === null || currentAdnexal.pfh_asymmetry_pct === undefined
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : currentAdnexal.potential_ptosis
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {currentAdnexal.pfh_asymmetry_pct === null || currentAdnexal.pfh_asymmetry_pct === undefined
                              ? 'Dual-Eye Portrait Required'
                              : currentAdnexal.potential_ptosis
                              ? `Ptosis: ${currentAdnexal.potential_ptosis_eye}`
                              : 'Symmetric (<15%)'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                          <span className="text-slate-400 block text-[10px]">Interpupillary Distance</span>
                          <span className="font-mono text-white font-bold text-sm">
                            {currentAdnexal.estimated_ipd_mm > 0 ? `${currentAdnexal.estimated_ipd_mm} mm` : 'N/A (Macro)'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Ref: 11.7mm Iris Ø
                          </span>
                        </div>
                      </div>

                      {/* Strabismus Hirschberg Indicator */}
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 font-semibold text-[11px]">Hirschberg Corneal Light Reflex:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            currentAdnexal.strabismus_screening.strabismus_suspected
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {currentAdnexal.strabismus_screening.strabismus_suspected ? 'Misalignment Suspicion' : 'Orthophoric Symmetrical'}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          {currentAdnexal.strabismus_screening.gaze_alignment_description}
                        </p>
                      </div>

                      {/* Image Type Guidance Hint */}
                      <div className="p-2.5 bg-blue-950/40 rounded-lg border border-blue-900/60 text-[11px] text-blue-200/90 leading-relaxed">
                        <span className="font-semibold text-blue-300 block mb-0.5">💡 Clinical Image Hint:</span>
                        For <strong>bilateral ptosis asymmetry</strong> and <strong>Hirschberg strabismus screening</strong>, upload a full frontal face portrait (both eyes visible). For <strong>eyelid margin biometry</strong> (MRD1/MRD2/PFH), close-up single-eye photos are automatically calibrated against the 11.7mm anatomical corneal diameter standard.
                      </div>

                      {/* Clinical Recommendations */}
                      {currentAdnexal.clinical_recommendations && currentAdnexal.clinical_recommendations.length > 0 && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                          <span className="font-bold text-slate-200 text-[11px] block">
                            Optometrist Assessment Guidance:
                          </span>
                          <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                            {currentAdnexal.clinical_recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-400">No adnexal biometry telemetry performed yet for this photograph.</p>
                    <button
                      onClick={handleRunAdnexalAnalysis}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                    >
                      Run Adnexal Telemetry Analysis
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="italic">
                VisionBridge EyeCapture AI provides non-diagnostic clinical decision support only.
              </span>
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
