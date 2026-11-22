import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  X, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Camera, 
  Sparkles,
  RefreshCw,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { EyeSide, ClinicalImageType, GazeDirection, ClinicalEyeImageRecord, EyeQualityAssessment } from '../types/imaging';
import { imagingApi } from '../services/imagingApi';

interface ClinicalEyeImageUploaderProps {
  customerId: string;
  customerName: string;
  customerCode: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newImage: ClinicalEyeImageRecord) => void;
}

export const ClinicalEyeImageUploader: React.FC<ClinicalEyeImageUploaderProps> = ({
  customerId,
  customerName,
  customerCode,
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [eyeSide, setEyeSide] = useState<EyeSide>('RIGHT');
  const [imageType, setImageType] = useState<ClinicalImageType>('EXTERNAL_PHOTO');
  const [gazeDirection, setGazeDirection] = useState<GazeDirection>('PRIMARY');
  const [description, setDescription] = useState('');
  const [clinicalContext, setClinicalContext] = useState('');
  const [captureDate, setCaptureDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Consent State (Mandatory)
  const [hasConsent, setHasConsent] = useState(false);
  const [consentedBy, setConsentedBy] = useState(customerName);

  // EyeCapture AI Real-Time Pre-Upload Quality State
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiQualityResult, setAiQualityResult] = useState<EyeQualityAssessment | null>(null);
  const [aiCheckError, setAiCheckError] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Run real-time AI quality check
  const runAiQualityCheck = async (base64Data: string, filename: string) => {
    setIsAiChecking(true);
    setAiCheckError(null);
    setAiQualityResult(null);

    try {
      const res = await imagingApi.checkEyeQuality({
        imageData: base64Data,
        filename,
      });
      setAiQualityResult(res);
    } catch (err: any) {
      console.warn('Real-time AI check warning:', err);
      setAiCheckError(err.message || 'EyeCapture AI service unavailable');
    } finally {
      setIsAiChecking(false);
    }
  };

  const handleFile = (file: File) => {
    setErrorMessage(null);
    setAiQualityResult(null);
    setAiCheckError(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Unsupported file format. Please upload a JPEG, PNG, or WebP eye image.');
      return;
    }

    // Limit 15MB
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 15 MB.`);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewDataUrl(dataUrl);
      // Automatically trigger real-time EyeCapture AI quality assessment
      runAiQualityCheck(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Lock body scroll when uploader modal is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewDataUrl(null);
    setAiQualityResult(null);
    setAiCheckError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFile || !previewDataUrl) {
      setErrorMessage('Please select or capture an eye photograph.');
      return;
    }

    if (!hasConsent) {
      setErrorMessage('Patient / guardian informed consent is mandatory prior to uploading clinical eye photographs.');
      return;
    }

    if (!consentedBy.trim()) {
      setErrorMessage('Please specify the person providing informed consent.');
      return;
    }

    setIsSubmitting(true);
    try {
      const consentText = `Informed consent obtained from ${consentedBy} on ${new Date().toLocaleDateString()} for tele-optometric photographic review and triage.`;
      
      const payload = {
        customerId,
        imageData: previewDataUrl,
        eyeSide,
        imageType,
        gazeDirection: imageType === 'GAZE_DIRECTION' ? gazeDirection : undefined,
        description: description.trim() || undefined,
        clinicalContext: clinicalContext.trim() || undefined,
        captureDate,
        hasConsent: true,
        consentText,
        consentedBy: consentedBy.trim(),
      };

      const result = await imagingApi.uploadEyeImage(payload);
      onUploadSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload clinical eye image. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Upload Clinical Eye Photograph
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-400/30 text-blue-300 font-mono">
                  {customerCode}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Patient: <span className="text-slate-200 font-medium">{customerName}</span> · Powered by EyeCapture AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Image Upload / Dropzone */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select or Capture Eye Image <span className="text-red-500">*</span>
            </label>

            {!previewDataUrl ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                  dragActive 
                    ? 'border-purple-500 bg-purple-50/70' 
                    : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Click to browse or drag & drop photo</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports high-resolution JPEG, PNG, or WebP up to 15 MB
                  </p>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-700 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Real-time EyeCapture AI Quality Analysis will inspect capture automatically</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* Thumbnail Preview Bar */}
                <div className="relative border border-slate-200 rounded-2xl p-3 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-300 shadow-inner flex items-center justify-center">
                      <img
                        src={previewDataUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 truncate max-w-xs">
                        {selectedFile?.name || 'Captured Eye Image'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · ${selectedFile.type}` : 'Ready for upload'}
                      </p>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-800">
                          {eyeSide} Eye
                        </span>
                        {isAiChecking && (
                          <span className="inline-flex items-center text-xs font-medium text-purple-600">
                            <Loader2 className="w-3 h-3 animate-spin mr-1" /> AI Evaluating...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pr-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-sm transition"
                    >
                      Change File
                    </button>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* EyeCapture AI Real-Time Feedback Card */}
                {isAiChecking && (
                  <div className="p-3.5 bg-purple-50/90 border border-purple-200 rounded-xl flex items-center space-x-3 text-purple-900 animate-pulse">
                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold">EyeCapture AI Analyzing Capture: </span>
                      <span>Evaluating focus, illumination, glare, and anterior suitability...</span>
                    </div>
                  </div>
                )}

                {aiQualityResult && (
                  <div className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                    aiQualityResult.status === 'USABLE_FOR_ANALYSIS'
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      : aiQualityResult.status === 'RETAKE_RECOMMENDED'
                      ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                      : 'bg-amber-50/90 border-amber-300 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-sm">
                        <Sparkles className={`w-4 h-4 ${
                          aiQualityResult.status === 'USABLE_FOR_ANALYSIS' ? 'text-emerald-600' : 'text-rose-600'
                        }`} />
                        EyeCapture AI Quality Assessment
                      </span>
                      <span className={`px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1 ${
                        aiQualityResult.status === 'USABLE_FOR_ANALYSIS'
                          ? 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                          : aiQualityResult.status === 'RETAKE_RECOMMENDED'
                          ? 'bg-rose-200 text-rose-900 border border-rose-400'
                          : 'bg-amber-200 text-amber-900 border border-amber-400'
                      }`}>
                        {aiQualityResult.status === 'USABLE_FOR_ANALYSIS' && <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />}
                        {aiQualityResult.status === 'RETAKE_RECOMMENDED' && <AlertCircle className="w-3.5 h-3.5 text-rose-700" />}
                        {aiQualityResult.status.replace(/_/g, ' ')} ({aiQualityResult.overall_score}/100)
                      </span>
                    </div>

                    {/* Metric Breakdown */}
                    <div className="grid grid-cols-3 gap-2 py-1 text-[11px]">
                      <div className="p-2 bg-white/80 rounded-lg border border-black/5">
                        <span className="text-slate-500 block">Sharpness / Focus:</span>
                        <span className="font-bold text-slate-800">{aiQualityResult.sharpness_score}%</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Var: {aiQualityResult.metrics.laplacian_variance}</span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-lg border border-black/5">
                        <span className="text-slate-500 block">Illumination:</span>
                        <span className="font-bold text-slate-800">{aiQualityResult.exposure_score}%</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Mean: {aiQualityResult.metrics.mean_luminance}</span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-lg border border-black/5">
                        <span className="text-slate-500 block">Contrast RMS:</span>
                        <span className="font-bold text-slate-800">{aiQualityResult.contrast_score}%</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Std: {aiQualityResult.metrics.contrast_rms}</span>
                      </div>
                    </div>

                    {/* Guidance / Warnings if degraded or random image */}
                    {aiQualityResult.recapture_guidance && aiQualityResult.recapture_guidance.length > 0 && (
                      <div className="p-3 bg-white/95 rounded-xl border border-rose-200 space-y-1.5 shadow-xs">
                        <span className="font-bold text-rose-800 flex items-center gap-1.5 text-xs">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Actionable Capture Advice:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-900">
                          {aiQualityResult.recapture_guidance.map((g, i) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                        {aiQualityResult.status === 'RETAKE_RECOMMENDED' && (
                          <div className="pt-2 flex items-center justify-between border-t border-rose-100 text-[11px]">
                            <span className="text-rose-700 italic">
                              Notice: Capture quality is suboptimal. Recommend retaking before optometrist review.
                            </span>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
                            >
                              Retake Photo
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {aiQualityResult.status === 'USABLE_FOR_ANALYSIS' && (
                      <div className="p-2 bg-emerald-100/60 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>High-fidelity anterior ocular capture verified. Suitable for optometrist review.</span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Eye Side & Image Type Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Eye Side */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Eye Side (Anatomical) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'RIGHT', label: 'Right Eye (OD)', desc: 'Oculus Dexter' },
                  { value: 'LEFT', label: 'Left Eye (OS)', desc: 'Oculus Sinister' },
                  { value: 'BOTH', label: 'Both Eyes (OU)', desc: 'Oculi Uterque' },
                  { value: 'NOT_SPECIFIED', label: 'Unspecified', desc: 'Overview / Extra' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setEyeSide(item.value as EyeSide)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      eyeSide === item.value
                        ? 'border-blue-600 bg-blue-50/80 ring-1 ring-blue-600 text-blue-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span className="font-semibold text-xs">{item.label}</span>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Clinical Image Modality
              </label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value as ClinicalImageType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                <option value="EXTERNAL_PHOTO">External Anterior Eye Photo (Macro)</option>
                <option value="GAZE_DIRECTION">Gaze Direction / Extraocular Motility</option>
                <option value="ANTERIOR_SEGMENT_SLIT_LAMP">Anterior Segment (Slit Lamp / Attachment)</option>
                <option value="FUNDUS_RETINAL">Posterior Pole / Fundus Photograph</option>
                <option value="OTHER">Other Tele-Ophthalmic Capture</option>
              </select>

              {/* Gaze Direction Selector (if GAZE_DIRECTION selected) */}
              {imageType === 'GAZE_DIRECTION' && (
                <div className="mt-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Gaze Direction
                  </label>
                  <select
                    value={gazeDirection}
                    onChange={(e) => setGazeDirection(e.target.value as GazeDirection)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    <option value="PRIMARY">Primary Position (Straight Ahead)</option>
                    <option value="UP">Upward Gaze (Elevation)</option>
                    <option value="DOWN">Downward Gaze (Depression)</option>
                    <option value="LEFT">Levogaze (Leftward)</option>
                    <option value="RIGHT">Dextrogaze (Rightward)</option>
                    <option value="UP_RIGHT">Up & Right (Dextroelevation)</option>
                    <option value="UP_LEFT">Up & Left (Levoelevation)</option>
                    <option value="DOWN_RIGHT">Down & Right (Dextrodepression)</option>
                    <option value="DOWN_LEFT">Down & Left (Levodepression)</option>
                  </select>
                </div>
              )}

              {/* Capture Date */}
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Capture Date
                </label>
                <input
                  type="date"
                  value={captureDate}
                  onChange={(e) => setCaptureDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

          </div>

          {/* Clinical Context & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Clinical Context / Intake Note
              </label>
              <input
                type="text"
                value={clinicalContext}
                onChange={(e) => setClinicalContext(e.target.value)}
                placeholder="e.g. Foreign body sensation reported, redness observed on temporal conjunctiva..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Additional Observations (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Any special illumination conditions, patient cooperation notes, or macro lens details..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none"
              />
            </div>
          </div>

          {/* Mandatory Patient Informed Consent Section */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
            <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Mandatory Patient Informed Consent</span>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              In compliance with clinical tele-ophthalmology guidelines, clinical photographs of the eye and periocular region may only be stored and reviewed with explicit consent.
            </p>

            <label className="flex items-start space-x-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-medium">
                I confirm that <strong className="text-blue-900">{customerName}</strong> (or legal guardian) has provided informed consent for ocular photographic capture, secure tele-optometry review, and encrypted storage. <span className="text-red-500">*</span>
              </span>
            </label>

            {hasConsent && (
              <div className="pt-2 flex items-center space-x-2 text-xs">
                <span className="text-slate-500 font-medium">Consented By:</span>
                <input
                  type="text"
                  value={consentedBy}
                  onChange={(e) => setConsentedBy(e.target.value)}
                  placeholder="Patient or Guardian Full Name"
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile || !hasConsent}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encrypting & Storing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    {aiQualityResult?.status === 'RETAKE_RECOMMENDED'
                      ? 'Upload Anyway (Flagged Suboptimal)'
                      : 'Upload Clinical Photo'}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
