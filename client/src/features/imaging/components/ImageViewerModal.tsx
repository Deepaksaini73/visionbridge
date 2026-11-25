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
  Flame,
  CircleDot,
  Activity,
  Aperture,
  Sun,
  FileCheck,
} from 'lucide-react';
import { 
  ClinicalEyeImageRecord, 
  EyeSide, 
  EyeCaptureAiAnalysis, 
  AdnexalTelemetryData,
  HyperaemiaTelemetryData,
  RetinalAnalysisData,
  CornealLensClarityData,
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

  // Ocular Surface & Hyperaemia Telemetry states (Milestone 5.3: Efron Redness & Pterygium)
  const [hyperaemiaAnalyses, setHyperaemiaAnalyses] = useState<Record<string, HyperaemiaTelemetryData>>({});
  const [isAnalyzingHyperaemia, setIsAnalyzingHyperaemia] = useState<boolean>(false);

  // Retinal Foundation AI states (Milestone 5.4: FLAIR Zero-Shot Model)
  const [retinalAnalyses, setRetinalAnalyses] = useState<Record<string, RetinalAnalysisData>>({});
  const [isAnalyzingRetinal, setIsAnalyzingRetinal] = useState<boolean>(false);

  // Lens & Corneal Clarity Engine states (Milestone 5.5: Cataract & Arcus Senilis)
  const [clarityAnalyses, setClarityAnalyses] = useState<Record<string, CornealLensClarityData>>({});
  const [isAnalyzingClarity, setIsAnalyzingClarity] = useState<boolean>(false);

  // Enlarged AI Studio Drawer states
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [activeAiTab, setActiveAiTab] = useState<'ANTERIOR' | 'ADNEXAL' | 'HYPERAEMIA' | 'RETINAL' | 'CLARITY'>('ANTERIOR');

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
  const currentHyperaemia = currentImage ? hyperaemiaAnalyses[currentImage.imageId] : undefined;
  const currentRetinal = currentImage ? retinalAnalyses[currentImage.imageId] : undefined;
  const currentClarity = currentImage ? clarityAnalyses[currentImage.imageId] : undefined;

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

  // Run Ocular Surface & Hyperaemia Telemetry (Milestone 5.3 Efron Redness & Pterygium)
  const handleRunHyperaemiaAnalysis = async () => {
    if (!currentImage) return;
    setIsAnalyzingHyperaemia(true);
    setAiError(null);

    try {
      const result = await imagingApi.analyzeHyperaemia({
        imageId: currentImage.imageId,
      });

      setHyperaemiaAnalyses((prev) => ({
        ...prev,
        [currentImage.imageId]: result,
      }));
      setActiveAiTab('HYPERAEMIA');
      setShowOverlay(true);
    } catch (err: any) {
      setAiError(err.message || 'Hyperaemia & pterygium analysis failed.');
    } finally {
      setIsAnalyzingHyperaemia(false);
    }
  };

  // Run Retinal Foundation AI (Milestone 5.4 FLAIR Zero-Shot Model)
  const handleRunRetinalAnalysis = async (force = false) => {
    if (!currentImage) return;
    setIsAnalyzingRetinal(true);
    setAiError(null);

    try {
      const result = await imagingApi.analyzeRetinal({
        imageId: currentImage.imageId,
        force,
      });

      setRetinalAnalyses((prev) => ({
        ...prev,
        [currentImage.imageId]: result,
      }));
      setActiveAiTab('RETINAL');
      setShowOverlay(true);
    } catch (err: any) {
      setAiError(err.message || 'Retinal foundation analysis failed.');
    } finally {
      setIsAnalyzingRetinal(false);
    }
  };

  // Run Lens & Corneal Clarity Telemetry (Milestone 5.5 Cataract & Arcus Senilis)
  const handleRunClarityAnalysis = async () => {
    if (!currentImage) return;
    setIsAnalyzingClarity(true);
    setAiError(null);

    try {
      const result = await imagingApi.analyzeClarity({
        imageId: currentImage.imageId,
      });

      setClarityAnalyses((prev) => ({
        ...prev,
        [currentImage.imageId]: result,
      }));
      setActiveAiTab('CLARITY');
      setShowOverlay(true);
    } catch (err: any) {
      setAiError(err.message || 'Lens & corneal clarity analysis failed.');
    } finally {
      setIsAnalyzingClarity(false);
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
      <div className="absolute top-0 left-0 right-0 h-16 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 z-20 gap-3">
        
        {/* Left: Title & Index */}
        <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-blue-400 shrink-0" />
            <h3 className="text-white font-semibold text-sm sm:text-base hidden sm:block">
              Clinical Eye Image Viewer
            </h3>
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs text-slate-300">
            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {currentImage.customerCode}
            </span>
            <span>·</span>
            <span className="text-[11px] sm:text-xs text-slate-400">{currentIndex + 1}/{images.length}</span>
          </div>
        </div>

        {/* Center: Image Manipulation Controls */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-slate-800/90 rounded-xl p-1 border border-slate-700/80 shadow-lg shrink-0">
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
            (activeAiTab === 'ADNEXAL' && currentAdnexal?.overlay_rgba_base64) ||
            (activeAiTab === 'HYPERAEMIA' && currentHyperaemia?.overlay_rgba_base64) ||
            (activeAiTab === 'RETINAL' && currentRetinal?.overlay_rgba_base64) ||
            (activeAiTab === 'CLARITY' && currentClarity?.overlay_rgba_base64)) && (
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
        <div className="flex items-center space-x-2 min-w-0 shrink">
          {/* Scrollable / Flexible AI Engine Pills Ribbon */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
            {/* EyeCapture Anterior AI Top Button */}
            <button
              onClick={() => {
                setActiveAiTab('ANTERIOR');
                setShowAiModal(true);
                if (!currentAnalysis && !isAnalyzing) {
                  handleRunAiAnalysis(false);
                }
              }}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition shrink-0 ${
                currentAnalysis?.quality?.status === 'USABLE_FOR_ANALYSIS'
                  ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/40 text-emerald-200'
                  : currentAnalysis?.quality?.status === 'RETAKE_RECOMMENDED'
                  ? 'bg-rose-950/70 hover:bg-rose-900 border-rose-500/40 text-rose-200'
                  : 'bg-gradient-to-r from-purple-600/40 to-indigo-600/40 hover:from-purple-600/60 hover:to-indigo-600/60 border-purple-500/40 text-purple-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>
                {isAnalyzing
                  ? 'Analyzing...'
                  : currentAnalysis
                  ? <>Anterior <span className="hidden xl:inline">({currentAnalysis.quality.overall_score}%)</span></>
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
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition shrink-0 ${
                currentAdnexal
                  ? 'bg-cyan-950/70 hover:bg-cyan-900 border-cyan-500/40 text-cyan-200'
                  : 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 hover:from-cyan-600/60 hover:to-blue-600/60 border-cyan-500/40 text-cyan-200'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                {isAnalyzingAdnexa
                  ? 'Measuring...'
                  : currentAdnexal
                  ? <>Adnexa <span className="hidden xl:inline">({currentAdnexal.mode === 'BILATERAL_FACE_LANDMARKER' ? 'Bilateral' : 'Macro'})</span></>
                  : 'Adnexal'}
              </span>
            </button>

            {/* Ocular Surface & Hyperaemia Top Button (Milestone 5.3) */}
            <button
              onClick={() => {
                setActiveAiTab('HYPERAEMIA');
                setShowAiModal(true);
                if (!currentHyperaemia && !isAnalyzingHyperaemia) {
                  handleRunHyperaemiaAnalysis();
                }
              }}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition shrink-0 ${
                currentHyperaemia
                  ? 'bg-rose-950/70 hover:bg-rose-900 border-rose-500/40 text-rose-200'
                  : 'bg-gradient-to-r from-rose-600/40 to-amber-600/40 hover:from-rose-600/60 hover:to-amber-600/60 border-rose-500/40 text-rose-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                {isAnalyzingHyperaemia
                  ? 'Grading...'
                  : currentHyperaemia
                  ? <>Surface <span className="hidden xl:inline">(Gr {currentHyperaemia.hyperaemia.efron_grade})</span></>
                  : 'Surface'}
              </span>
            </button>

            {/* Retinal Foundation AI Top Button (Milestone 5.4 FLAIR) */}
            <button
              onClick={() => {
                setActiveAiTab('RETINAL');
                setShowAiModal(true);
                if (!currentRetinal && !isAnalyzingRetinal) {
                  handleRunRetinalAnalysis();
                }
              }}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition shrink-0 ${
                currentRetinal
                  ? currentRetinal.decision_support?.triage_urgency === 'URGENT_RETINA_SPECIALIST'
                    ? 'bg-red-950/70 hover:bg-red-900 border-red-500/40 text-red-200'
                    : currentRetinal.decision_support?.triage_urgency === 'ELECTIVE_OPHTHALMOLOGY_CONSULT'
                    ? 'bg-amber-950/70 hover:bg-amber-900 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/40 text-emerald-200'
                  : 'bg-gradient-to-r from-teal-600/40 to-emerald-600/40 hover:from-teal-600/60 hover:to-emerald-600/60 border-teal-500/40 text-teal-200'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>
                {isAnalyzingRetinal
                  ? 'Evaluating...'
                  : currentRetinal?.primary_assessment
                  ? <>Retina <span className="hidden xl:inline">({currentRetinal.primary_assessment.top_condition})</span></>
                  : 'Retinal AI'}
              </span>
            </button>

            {/* Lens & Corneal Clarity Top Button (Milestone 5.5 Cataract & Arcus) */}
            <button
              onClick={() => {
                setActiveAiTab('CLARITY');
                setShowAiModal(true);
                if (!currentClarity && !isAnalyzingClarity) {
                  handleRunClarityAnalysis();
                }
              }}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition shrink-0 ${
                currentClarity
                  ? currentClarity.lens_opacity.cataract_grade >= 2
                    ? 'bg-amber-950/70 hover:bg-amber-900 border-amber-500/40 text-amber-200'
                    : 'bg-indigo-950/70 hover:bg-indigo-900 border-indigo-500/40 text-indigo-200'
                  : 'bg-gradient-to-r from-indigo-600/40 to-blue-600/40 hover:from-indigo-600/60 hover:to-blue-600/60 border-indigo-500/40 text-indigo-200'
              }`}
            >
              <Aperture className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                {isAnalyzingClarity
                  ? 'Assessing...'
                  : currentClarity
                  ? <>Clarity <span className="hidden xl:inline">(Gr {currentClarity.lens_opacity.cataract_grade})</span></>
                  : 'Lens Clarity'}
              </span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-800 shrink-0" />

          {/* Action Tools */}
          <div className="flex items-center space-x-1 shrink-0">
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

              {/* Pixel-Aligned RGBA Hyperaemia & Pterygium Overlay (Milestone 5.3) */}
              {showOverlay && activeAiTab === 'HYPERAEMIA' && currentHyperaemia?.overlay_rgba_base64 && (
                <img
                  src={currentHyperaemia.overlay_rgba_base64}
                  alt="EyeCapture AI Hyperaemia & Pterygium Overlay"
                  style={{ opacity: overlayOpacity }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-lg transition-opacity duration-200"
                />
              )}

              {/* Pixel-Aligned RGBA Retinal Foundation Overlay (Milestone 5.4 FLAIR) */}
              {showOverlay && activeAiTab === 'RETINAL' && currentRetinal?.overlay_rgba_base64 && (
                <img
                  src={currentRetinal.overlay_rgba_base64}
                  alt="VisionBridge Retinal AI Foundation Overlay"
                  style={{ opacity: overlayOpacity }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-lg transition-opacity duration-200"
                />
              )}

              {/* Pixel-Aligned RGBA Lens & Corneal Clarity Overlay (Milestone 5.5) */}
              {showOverlay && activeAiTab === 'CLARITY' && currentClarity?.overlay_rgba_base64 && (
                <img
                  src={currentClarity.overlay_rgba_base64}
                  alt="VisionBridge Lens & Corneal Clarity Overlay"
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
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-auto lg:h-full overflow-y-auto custom-scrollbar-dark">
          
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

            {/* MODULE 3: Ocular Surface & Hyperaemia Telemetry (Milestone 5.3 Efron Redness & Pterygium) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-rose-900/40 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Ocular Surface & Redness Telemetry
                </span>
                {currentHyperaemia && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-semibold">
                    EFRON {currentHyperaemia.hyperaemia.efron_grade}/4
                  </span>
                )}
              </div>

              {isAnalyzingHyperaemia ? (
                <div className="p-3 bg-rose-950/40 rounded-lg border border-rose-800/60 flex items-center space-x-2 text-rose-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400 shrink-0" />
                  <span>Segmenting sclera, quantifying vascular redness & pterygium...</span>
                </div>
              ) : currentHyperaemia ? (
                <div className="space-y-3 text-xs">
                  {/* Hyperaemia Grade Card */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Bulbar Redness:</span>
                      <span className="font-bold text-rose-300">
                        {currentHyperaemia.hyperaemia.efron_grade_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Vascular Density:</span>
                      <span className="font-mono text-white font-bold">{currentHyperaemia.hyperaemia.vascular_density_pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, currentHyperaemia.hyperaemia.efron_grade * 25)}%` }}
                      />
                    </div>
                  </div>

                  {/* Pterygium Status Card */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Pterygium Screening:</span>
                      <span className={`font-bold ${currentHyperaemia.pterygium.detected ? 'text-amber-300' : 'text-emerald-400'}`}>
                        {currentHyperaemia.pterygium.detected ? `Detected (${currentHyperaemia.pterygium.encroachment_zone})` : 'Clear Limbic Margin'}
                      </span>
                    </div>

                    {currentHyperaemia.pterygium.detected && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Limbal Invasion:</span>
                          <span className="text-amber-300 font-bold">{currentHyperaemia.pterygium.limbic_invasion_mm} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pupil Margin:</span>
                          <span className="text-white font-bold">{currentHyperaemia.pterygium.pupil_clearance_mm} mm</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Guidance Note */}
                  <p className="text-[10px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                    {currentHyperaemia.hyperaemia.clinical_guidance}
                  </p>

                  {/* Overlay Toggle */}
                  {currentHyperaemia.overlay_rgba_base64 && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={showOverlay && activeAiTab === 'HYPERAEMIA'}
                          onChange={(e) => {
                            setActiveAiTab('HYPERAEMIA');
                            setShowOverlay(e.target.checked);
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
                        />
                        <span>Show Redness & Vessels Overlay</span>
                      </label>
                      <span className="text-[10px] text-rose-400 font-mono">Efron 0-4</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={handleRunHyperaemiaAnalysis}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-check Redness
                    </button>
                    <button
                      onClick={() => {
                        setActiveAiTab('HYPERAEMIA');
                        setShowAiModal(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white font-medium underline transition"
                    >
                      Enlarge Surface Studio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    Quantify conjunctival vascular redness on the Efron scale (0-4) and screen for pterygium limbal encroachment.
                  </p>
                  <button
                    onClick={handleRunHyperaemiaAnalysis}
                    className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Run Ocular Surface & Redness Analysis</span>
                  </button>
                </div>
              )}
            </div>

            {/* MODULE 4: Retinal Foundation AI Panel (Milestone 5.4 FLAIR Zero-Shot Model) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-teal-900/40 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <CircleDot className="w-4 h-4 text-teal-400" />
                  Retinal AI (FLAIR Foundation Model)
                </span>
                {isAnalyzingRetinal ? (
                  <span className="flex items-center gap-1 text-[11px] text-teal-400 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Evaluating...
                  </span>
                ) : currentRetinal ? (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      currentRetinal.decision_support?.triage_urgency === 'URGENT_RETINA_SPECIALIST'
                        ? 'bg-red-950/80 text-red-300 border-red-800'
                        : currentRetinal.decision_support?.triage_urgency === 'ELECTIVE_OPHTHALMOLOGY_CONSULT'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {currentRetinal.decision_support?.triage_urgency.replace(/_/g, ' ') || 'ANALYZED'}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Zero-Shot CFP
                  </span>
                )}
              </div>

              {currentRetinal ? (
                <div className="space-y-3 pt-1">
                  {/* Domain Warning if applicable */}
                  {currentRetinal.domain_metrics && !currentRetinal.domain_metrics.is_fundus && (
                    <div className="p-2.5 bg-amber-950/40 rounded-lg border border-amber-800/60 text-[11px] text-amber-200 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Domain Gating Notice</span>
                      </div>
                      <p className="text-[10px] leading-tight text-amber-200/90">
                        Image characteristics deviate from standard circular CFP (R/B: {currentRetinal.domain_metrics.red_to_blue_ratio}). Results may be out-of-distribution.
                      </p>
                    </div>
                  )}

                  {/* Primary Finding Card */}
                  {currentRetinal.primary_assessment && (
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Top Ophthalmic Finding:</span>
                        <span className="font-bold text-white">
                          {currentRetinal.primary_assessment.confidence_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm font-bold text-teal-300 capitalize">
                        {currentRetinal.primary_assessment.top_condition}
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round(currentRetinal.primary_assessment.confidence_pct))}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <span>Model: ResNet-50 + Bio_ClinicalBERT</span>
                        <span>Latency: {currentRetinal.model_metadata?.latency_ms || 0} ms</span>
                      </div>
                    </div>
                  )}

                  {/* Category Breakdown Highlights */}
                  {currentRetinal.clinical_categories && (
                    <div className="space-y-1.5 text-[11px]">
                      {currentRetinal.clinical_categories.diabetic_retinopathy && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/70">
                          <span className="text-slate-300">Diabetic Retinopathy</span>
                          <span className="font-mono text-white text-[10px] font-bold">
                            {currentRetinal.clinical_categories.diabetic_retinopathy.top_stage} ({currentRetinal.clinical_categories.diabetic_retinopathy.confidence_pct.toFixed(0)}%)
                          </span>
                        </div>
                      )}
                      {currentRetinal.clinical_categories.macular_integrity && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/70">
                          <span className="text-slate-300">Macular Integrity</span>
                          <span className="font-mono text-white text-[10px] font-bold">
                            {currentRetinal.clinical_categories.macular_integrity.top_finding} ({currentRetinal.clinical_categories.macular_integrity.confidence_pct.toFixed(0)}%)
                          </span>
                        </div>
                      )}
                      {currentRetinal.clinical_categories.glaucoma_screening && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/70">
                          <span className="text-slate-300">Glaucomatous Disc</span>
                          <span className="font-mono text-white text-[10px] font-bold">
                            {currentRetinal.clinical_categories.glaucoma_screening.top_finding} ({currentRetinal.clinical_categories.glaucoma_screening.confidence_pct.toFixed(0)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Referral Directive */}
                  {currentRetinal.decision_support?.clinical_advice && (
                    <p className="text-[10px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                      {currentRetinal.decision_support.clinical_advice}
                    </p>
                  )}

                  {/* Overlay Toggle */}
                  {currentRetinal.overlay_rgba_base64 && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={showOverlay && activeAiTab === 'RETINAL'}
                          onChange={(e) => {
                            setActiveAiTab('RETINAL');
                            setShowOverlay(e.target.checked);
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-0"
                        />
                        <span>Show Retinal Foundation Overlay</span>
                      </label>
                      <span className="text-[10px] text-teal-400 font-mono">CFP Mask</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={() => handleRunRetinalAnalysis(true)}
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-evaluate Fundus
                    </button>
                    <button
                      onClick={() => {
                        setActiveAiTab('RETINAL');
                        setShowAiModal(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white font-medium underline transition"
                    >
                      Enlarge Retinal Studio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    Zero-shot Color Fundus Photography (CFP) evaluation across Diabetic Retinopathy, Macular Pathologies, and Glaucoma using FLAIR foundation model.
                  </p>
                  {currentImage.imageType !== 'FUNDUS_RETINAL' && (
                    <div className="text-[10px] text-amber-400/90 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                      Current label: <span className="font-semibold">{currentImage.imageType}</span>. FLAIR expects Color Fundus Photography.
                    </div>
                  )}
                  <button
                    onClick={() => handleRunRetinalAnalysis(false)}
                    className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow"
                  >
                    <CircleDot className="w-3.5 h-3.5" />
                    <span>Run Retinal Foundation Analysis</span>
                  </button>
                </div>
              )}
            </div>

            {/* MODULE 5: Lens & Corneal Clarity Engine (Milestone 5.5 Cataract & Arcus) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-900/40 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Aperture className="w-4 h-4 text-indigo-400" />
                  Lens & Corneal Clarity (Cataract/Arcus)
                </span>
                {currentClarity && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    currentClarity.lens_opacity.cataract_grade >= 2
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                  }`}>
                    CATARACT GR {currentClarity.lens_opacity.cataract_grade}
                  </span>
                )}
              </div>

              {isAnalyzingClarity ? (
                <div className="p-3 bg-indigo-950/40 rounded-lg border border-indigo-800/60 flex items-center space-x-2 text-indigo-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                  <span>Measuring crystalline lens opacity & limbal arcus ring...</span>
                </div>
              ) : currentClarity ? (
                <div className="space-y-3 text-xs">
                  {/* Lens Opacity Status */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Lens Opacity:</span>
                      <span className={`font-bold ${currentClarity.lens_opacity.cataract_grade >= 2 ? 'text-amber-300' : 'text-indigo-300'}`}>
                        {currentClarity.lens_opacity.grade_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Opacity Fraction:</span>
                      <span className="font-mono text-white font-bold">{currentClarity.lens_opacity.opacity_area_fraction_pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          currentClarity.lens_opacity.cataract_grade >= 2 ? 'bg-amber-400' : 'bg-indigo-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(8, currentClarity.lens_opacity.cataract_grade * 33))}%` }}
                      />
                    </div>
                  </div>

                  {/* Arcus Senilis Status */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Corneal Arcus:</span>
                      <span className={`font-bold ${currentClarity.corneal_arcus.arcus_detected ? 'text-sky-300' : 'text-emerald-400'}`}>
                        {currentClarity.corneal_arcus.arcus_detected ? `Detected (${currentClarity.corneal_arcus.extent_degrees}°)` : 'Clear Limbal Margin'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {currentClarity.corneal_arcus.span_description}
                    </p>
                  </div>

                  {/* Advice Note */}
                  <p className="text-[10px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                    {currentClarity.lens_opacity.clinical_advice}
                  </p>

                  {/* Overlay Toggle */}
                  {currentClarity.overlay_rgba_base64 && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={showOverlay && activeAiTab === 'CLARITY'}
                          onChange={(e) => {
                            setActiveAiTab('CLARITY');
                            setShowOverlay(e.target.checked);
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
                        />
                        <span>Show Lens Caliper Overlay</span>
                      </label>
                      <span className="text-[10px] text-indigo-400 font-mono">Ø {currentClarity.calibration.pupil_diameter_mm}mm</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={handleRunClarityAnalysis}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-check Clarity
                    </button>
                    <button
                      onClick={() => {
                        setActiveAiTab('CLARITY');
                        setShowAiModal(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white font-medium underline transition"
                    >
                      Enlarge Clarity Studio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    Quantify crystalline lens pupillary opacity (cataract staging proxy) and screen for peripheral corneal arcus ring.
                  </p>
                  <button
                    onClick={handleRunClarityAnalysis}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow"
                  >
                    <Aperture className="w-3.5 h-3.5" />
                    <span>Run Lens & Corneal Clarity Analysis</span>
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
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl max-w-3xl w-full p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar-dark">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    VisionBridge Multi-Modal EyeCapture AI Studio
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Target Image: {currentImage.imageId} ({currentImage.eyeSide}) · Modality: {currentImage.imageType.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* UNIFIED EXECUTIVE MULTI-MODAL SCREENING DOSSIER */}
            <div className="p-3.5 mb-5 rounded-xl bg-slate-950/80 border border-slate-800/90 shadow-inner space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  Clinical AI Tele-Screening Executive Summary
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  5 Modular Engines Active
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center text-[11px]">
                {/* 1. Anterior Quality */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">Image QA</span>
                  <span className={`font-bold block ${currentAnalysis ? (currentAnalysis.quality.status === 'USABLE_FOR_ANALYSIS' ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
                    {currentAnalysis ? `${currentAnalysis.quality.overall_score}%` : 'Pending'}
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    {currentAnalysis ? currentAnalysis.quality.status.replace(/_/g, ' ') : 'Not run'}
                  </span>
                </div>

                {/* 2. Adnexal Biometry */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">Ptosis / PFH</span>
                  <span className={`font-bold block ${currentAdnexal ? (currentAdnexal.potential_ptosis ? 'text-amber-300' : 'text-cyan-300') : 'text-slate-500'}`}>
                    {currentAdnexal ? (currentAdnexal.right_eye ? `${currentAdnexal.right_eye.estimated_pfh_mm}mm` : 'Bilateral') : 'Pending'}
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    {currentAdnexal ? (currentAdnexal.potential_ptosis ? 'Asymmetry' : 'Symmetric') : 'Not run'}
                  </span>
                </div>

                {/* 3. Surface Hyperaemia */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">Redness</span>
                  <span className={`font-bold block ${currentHyperaemia ? (currentHyperaemia.hyperaemia.efron_grade >= 2 ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-500'}`}>
                    {currentHyperaemia ? `Efron Gr ${currentHyperaemia.hyperaemia.efron_grade}` : 'Pending'}
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    {currentHyperaemia ? `${currentHyperaemia.hyperaemia.vascular_density_pct}% coverage` : 'Not run'}
                  </span>
                </div>

                {/* 4. Lens Clarity */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">Lens Opacity</span>
                  <span className={`font-bold block ${currentClarity ? (currentClarity.lens_opacity.cataract_grade >= 2 ? 'text-amber-400' : 'text-indigo-300') : 'text-slate-500'}`}>
                    {currentClarity ? `Gr ${currentClarity.lens_opacity.cataract_grade} Cataract` : 'Pending'}
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    {currentClarity ? (currentClarity.corneal_arcus.arcus_detected ? 'Arcus noted' : 'Clear cornea') : 'Not run'}
                  </span>
                </div>

                {/* 5. Retinal Fundus */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">Retina (FLAIR)</span>
                  <span className={`font-bold block ${currentRetinal ? (currentRetinal.decision_support?.triage_urgency === 'URGENT_RETINA_SPECIALIST' ? 'text-red-400' : currentRetinal.decision_support?.triage_urgency === 'ELECTIVE_OPHTHALMOLOGY_CONSULT' ? 'text-amber-300' : 'text-teal-300') : 'text-slate-500'}`}>
                    {currentRetinal ? (currentRetinal.decision_support?.referral_indicated ? 'Referral' : 'Routine') : 'Pending'}
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    {currentRetinal?.primary_assessment ? currentRetinal.primary_assessment.top_condition : 'CFP model'}
                  </span>
                </div>
              </div>
            </div>

            {/* TAB SELECTOR: Anterior AI vs Adnexal vs Hyperaemia vs Lens Clarity vs Retinal */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveAiTab('ANTERIOR');
                  if (!currentAnalysis && !isAnalyzing) {
                    handleRunAiAnalysis(false);
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeAiTab === 'ANTERIOR'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Anterior QA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAiTab('ADNEXAL');
                  if (!currentAdnexal && !isAnalyzingAdnexa) {
                    handleRunAdnexalAnalysis();
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeAiTab === 'ADNEXAL'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Ruler className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Ptosis / PFH</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAiTab('HYPERAEMIA');
                  if (!currentHyperaemia && !isAnalyzingHyperaemia) {
                    handleRunHyperaemiaAnalysis();
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeAiTab === 'HYPERAEMIA'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Redness (Efron)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAiTab('CLARITY');
                  if (!currentClarity && !isAnalyzingClarity) {
                    handleRunClarityAnalysis();
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeAiTab === 'CLARITY'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Aperture className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Lens Clarity</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAiTab('RETINAL');
                  if (!currentRetinal && !isAnalyzingRetinal) {
                    handleRunRetinalAnalysis();
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 col-span-2 sm:col-span-1 ${
                  activeAiTab === 'RETINAL'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CircleDot className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Retinal (FLAIR)</span>
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

            {/* TAB 3: OCULAR SURFACE & REDNESS TELEMETRY (MILESTONE 5.3) */}
            {activeAiTab === 'HYPERAEMIA' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                    Ocular Surface & Redness Telemetry (Efron Scale & Pterygium)
                  </span>
                  <button
                    onClick={handleRunHyperaemiaAnalysis}
                    disabled={isAnalyzingHyperaemia}
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingHyperaemia ? 'animate-spin' : ''}`} />
                    <span>{currentHyperaemia ? 'Re-Evaluate Redness' : 'Run Surface Analysis'}</span>
                  </button>
                </div>

                {isAnalyzingHyperaemia ? (
                  <div className="p-12 flex flex-col items-center justify-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
                    <p className="text-sm font-medium text-rose-200">Segmenting scleral microvasculature & calculating Efron redness...</p>
                    <span className="text-xs text-slate-500 font-mono">Differential vascular response filter R - (G+B)/2</span>
                  </div>
                ) : currentHyperaemia ? (
                  <div className="space-y-4">
                    {/* Efron Scale Overview Banner */}
                    <div className="p-4 bg-slate-950 rounded-xl border border-rose-900/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Bulbar Hyperaemia Severity</span>
                          <span className="text-base font-bold text-rose-300">
                            {currentHyperaemia.hyperaemia.efron_grade_name} (Grade {currentHyperaemia.hyperaemia.efron_grade} / 4)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">Vascular Density</span>
                          <span className="text-base font-mono font-bold text-white">
                            {currentHyperaemia.hyperaemia.vascular_density_pct}%
                          </span>
                        </div>
                      </div>

                      {/* Efron 0 to 4 Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>0: Normal</span>
                          <span>1: Trace</span>
                          <span>2: Mild</span>
                          <span>3: Moderate</span>
                          <span>4: Severe</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              currentHyperaemia.hyperaemia.efron_grade >= 3
                                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                : currentHyperaemia.hyperaemia.efron_grade >= 2
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.max(5, Math.min(100, currentHyperaemia.hyperaemia.efron_grade * 25))}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
                        <span>Evaluated Scleral Area: <strong className="text-white font-mono">{currentHyperaemia.hyperaemia.sclera_area_px} px</strong></span>
                        <span>Corneal Limbal Caliper Ref: <strong className="text-white font-mono">{currentHyperaemia.calibration.reference_iris_diameter_mm} mm</strong></span>
                      </div>
                    </div>

                    {/* Pterygium Biometry Panel */}
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-amber-400" />
                          Pterygium & Corneal Limbic Encroachment
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                            currentHyperaemia.pterygium.detected
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {currentHyperaemia.pterygium.detected ? 'Encroachment Detected' : 'No Encroachment'}
                        </span>
                      </div>

                      {currentHyperaemia.pterygium.detected ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Limbic Invasion</span>
                              <span className="text-amber-300 font-bold text-sm">{currentHyperaemia.pterygium.limbic_invasion_mm} mm</span>
                            </div>
                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Pupil Clearance</span>
                              <span className="text-emerald-400 font-bold text-sm">{currentHyperaemia.pterygium.pupil_clearance_mm} mm</span>
                            </div>
                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[10px] block">Origin Sector</span>
                              <span className="text-cyan-300 font-bold text-sm">{currentHyperaemia.pterygium.encroachment_zone}</span>
                            </div>
                          </div>

                          <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/40 text-xs text-amber-200/90 space-y-1">
                            <span className="font-bold flex items-center gap-1.5 text-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5" /> Pterygium Staging: {currentHyperaemia.pterygium.severity_grade.replace(/_/g, ' ')}
                            </span>
                            <p>{currentHyperaemia.pterygium.clinical_advice}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 text-center text-xs text-slate-400">
                          <p>{currentHyperaemia.pterygium.clinical_advice}</p>
                        </div>
                      )}
                    </div>

                    {/* Optometrist Clinical Guidance */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                      <span className="font-bold text-slate-300 text-[11px] block">Optometrist Clinical Guidance:</span>
                      <p className="text-slate-300 leading-relaxed text-[11px]">{currentHyperaemia.hyperaemia.clinical_guidance}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-400">No ocular surface or hyperaemia analysis performed yet for this photograph.</p>
                    <button
                      onClick={handleRunHyperaemiaAnalysis}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                    >
                      Run Ocular Surface & Redness Analysis
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: RETINAL FOUNDATION AI (MILESTONE 5.4 FLAIR) */}
            {activeAiTab === 'RETINAL' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                    VisionBridge Retinal AI (FLAIR Foundation Model)
                  </span>
                  <button
                    onClick={() => handleRunRetinalAnalysis(true)}
                    disabled={isAnalyzingRetinal}
                    className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/40 text-teal-200 font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingRetinal ? 'animate-spin' : ''}`} />
                    <span>{currentRetinal ? 'Re-Evaluate Fundus' : 'Run Retinal Analysis'}</span>
                  </button>
                </div>

                {isAnalyzingRetinal ? (
                  <div className="p-12 flex flex-col items-center justify-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                    <p className="text-sm font-medium text-teal-200">Executing FLAIR Vision-Language Foundation Model...</p>
                    <span className="text-xs text-slate-500 font-mono">133.26M parameters · ResNet-50 + Bio_ClinicalBERT · Zero-Shot Cross-Attention</span>
                  </div>
                ) : currentRetinal ? (
                  <div className="space-y-4">
                    {/* Domain Gating Telemetry Banner */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">Domain Gating:</span>
                        <span className={`font-bold ${currentRetinal.domain_metrics?.is_fundus ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {currentRetinal.domain_metrics?.is_fundus ? 'VALID CFP FUNDUS' : 'OUT-OF-DISTRIBUTION WARNING'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                        <span>R/B Ratio: <strong className="text-white">{currentRetinal.domain_metrics?.red_to_blue_ratio || 'N/A'}</strong></span>
                        <span>Perimeter Darkness: <strong className="text-white">{Math.round((currentRetinal.domain_metrics?.perimeter_dark_fraction || 0) * 100)}%</strong></span>
                        <span>Latency: <strong className="text-white">{currentRetinal.model_metadata?.latency_ms || 0} ms</strong></span>
                      </div>
                    </div>

                    {/* Triage Decision Support Banner */}
                    {currentRetinal.decision_support && (
                      <div className={`p-4 rounded-xl border space-y-2 ${
                        currentRetinal.decision_support.triage_urgency === 'URGENT_RETINA_SPECIALIST'
                          ? 'bg-red-950/40 border-red-800/60 text-red-200'
                          : currentRetinal.decision_support.triage_urgency === 'ELECTIVE_OPHTHALMOLOGY_CONSULT'
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                          : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Triage Urgency: {currentRetinal.decision_support.triage_urgency.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-900 border border-slate-700">
                            {currentRetinal.decision_support.referral_indicated ? 'REFERRAL INDICATED' : 'ROUTINE OBSERVATION'}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-200">
                          {currentRetinal.decision_support.clinical_advice}
                        </p>
                      </div>
                    )}

                    {/* Multi-Category Zero-Shot Predictions */}
                    {currentRetinal.clinical_categories && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* 1. Diabetic Retinopathy */}
                        {currentRetinal.clinical_categories.diabetic_retinopathy && (
                          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-300">Diabetic Retinopathy (DR)</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300 font-bold">
                                {currentRetinal.clinical_categories.diabetic_retinopathy.top_stage}
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {currentRetinal.clinical_categories.diabetic_retinopathy.all_stages?.map((stage, idx) => (
                                <div key={idx} className="space-y-0.5">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-400 capitalize truncate max-w-[70%]">{stage.prompt}</span>
                                    <span className="font-mono text-slate-300">{stage.probability_pct.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                    <div
                                      className="bg-teal-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, stage.probability_pct)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. Macular Integrity */}
                        {currentRetinal.clinical_categories.macular_integrity && (
                          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-300">Macular Integrity & Edema</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300 font-bold">
                                {currentRetinal.clinical_categories.macular_integrity.top_finding}
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {currentRetinal.clinical_categories.macular_integrity.all_findings?.map((finding, idx) => (
                                <div key={idx} className="space-y-0.5">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-400 capitalize truncate max-w-[70%]">{finding.prompt}</span>
                                    <span className="font-mono text-slate-300">{finding.probability_pct.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                    <div
                                      className="bg-teal-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, finding.probability_pct)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. Glaucomatous Disc */}
                        {currentRetinal.clinical_categories.glaucoma_screening && (
                          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-300">Glaucomatous Neuropathy</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300 font-bold">
                                {currentRetinal.clinical_categories.glaucoma_screening.top_finding}
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {currentRetinal.clinical_categories.glaucoma_screening.all_findings?.map((finding, idx) => (
                                <div key={idx} className="space-y-0.5">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-400 capitalize truncate max-w-[70%]">{finding.prompt}</span>
                                    <span className="font-mono text-slate-300">{finding.probability_pct.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                    <div
                                      className="bg-teal-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, finding.probability_pct)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Retinal Vascular Occlusions */}
                        {currentRetinal.clinical_categories.vascular_occlusion && (
                          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-300">Vascular Occlusions</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300 font-bold">
                                {currentRetinal.clinical_categories.vascular_occlusion.top_finding}
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {currentRetinal.clinical_categories.vascular_occlusion.all_findings?.map((finding, idx) => (
                                <div key={idx} className="space-y-0.5">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-400 capitalize truncate max-w-[70%]">{finding.prompt}</span>
                                    <span className="font-mono text-slate-300">{finding.probability_pct.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                    <div
                                      className="bg-teal-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, finding.probability_pct)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-400">No retinal foundation analysis performed yet for this photograph.</p>
                    <button
                      onClick={() => handleRunRetinalAnalysis(false)}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
                    >
                      Run Retinal Foundation Analysis
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: LENS & CORNEAL CLARITY ENGINE (MILESTONE 5.5) */}
            {activeAiTab === 'CLARITY' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Lens & Corneal Clarity Studio (Cataract Opacity & Arcus Senilis)
                  </span>
                  <button
                    onClick={handleRunClarityAnalysis}
                    disabled={isAnalyzingClarity}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingClarity ? 'animate-spin' : ''}`} />
                    <span>{currentClarity ? 'Re-Evaluate Clarity' : 'Run Clarity Analysis'}</span>
                  </button>
                </div>

                {isAnalyzingClarity ? (
                  <div className="p-12 flex flex-col items-center justify-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <p className="text-sm font-medium text-indigo-200">Segmenting pupillary aperture & isolating crystalline lens scattering...</p>
                    <span className="text-xs text-slate-500 font-mono">Shannon Entropy Texture Analysis & Limbal Polar Ring Sampling</span>
                  </div>
                ) : currentClarity ? (
                  <div className="space-y-4">
                    {/* Cataract Staging Card */}
                    <div className="p-4 bg-slate-950 rounded-xl border border-indigo-900/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Crystalline Lens Opacification (WHO/LOCS III Proxy)</span>
                          <span className="text-base font-bold text-indigo-300">
                            {currentClarity.lens_opacity.grade_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">Pupil Opacity Fraction</span>
                          <span className="text-base font-mono font-bold text-white">
                            {currentClarity.lens_opacity.opacity_area_fraction_pct}%
                          </span>
                        </div>
                      </div>

                      {/* Opacity Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Gr 0: Clear (&lt;12%)</span>
                          <span>Gr 1: Early Haze (12-28%)</span>
                          <span>Gr 2: Moderate (28-55%)</span>
                          <span>Gr 3: Dense Mature (&gt;55%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              currentClarity.lens_opacity.cataract_grade >= 3
                                ? 'bg-gradient-to-r from-amber-500 to-red-500'
                                : currentClarity.lens_opacity.cataract_grade >= 2
                                ? 'bg-amber-400'
                                : currentClarity.lens_opacity.cataract_grade >= 1
                                ? 'bg-indigo-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.max(5, Math.min(100, currentClarity.lens_opacity.cataract_grade * 33 + 5))}%` }}
                          />
                        </div>
                      </div>

                      {/* Pupillary Transmission Metrics Grid */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono pt-1">
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Mean Lum</span>
                          <span className="text-white font-bold">{currentClarity.lens_opacity.mean_luminance}</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Entropy (H)</span>
                          <span className="text-indigo-300 font-bold">{currentClarity.lens_opacity.shannon_entropy}</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Pupil Ø (mm)</span>
                          <span className="text-white font-bold">{currentClarity.calibration.pupil_diameter_mm} mm</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Ref Iris Ø</span>
                          <span className="text-slate-300 font-bold">11.7 mm</span>
                        </div>
                      </div>
                    </div>

                    {/* Corneal Arcus Senilis Panel */}
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
                          <Sun className="w-4 h-4 text-sky-400" />
                          Corneal Arcus (Arcus Senilis Lipid Ring)
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                            currentClarity.corneal_arcus.arcus_detected
                              ? 'bg-sky-950 text-sky-300 border-sky-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {currentClarity.corneal_arcus.arcus_detected ? 'Arcus Detected' : 'No Arcus'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">Angular Span:</span>
                          <span className="text-white font-bold">{currentClarity.corneal_arcus.extent_degrees}°</span>
                        </div>
                        <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">Circumference Coverage:</span>
                          <span className="text-sky-300 font-bold">{currentClarity.corneal_arcus.coverage_pct}%</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                        <span className="font-semibold text-slate-200 block">{currentClarity.corneal_arcus.span_description}</span>
                        <p className="text-slate-400 leading-relaxed text-[11px]">{currentClarity.corneal_arcus.clinical_advice}</p>
                      </div>
                    </div>

                    {/* Optometrist Clinical Guidance */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                      <span className="font-bold text-slate-300 text-[11px] block">Optometrist Clinical Action Guidance:</span>
                      <p className="text-slate-300 leading-relaxed text-[11px]">{currentClarity.lens_opacity.clinical_advice}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-400">No lens opacity or corneal clarity analysis performed yet for this photograph.</p>
                    <button
                      onClick={handleRunClarityAnalysis}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20"
                    >
                      Run Lens & Corneal Clarity Analysis
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
