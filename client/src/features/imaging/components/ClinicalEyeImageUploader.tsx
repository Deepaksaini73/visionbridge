import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  X, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Info, 
  ShieldCheck, 
  Camera, 
  FileText 
} from 'lucide-react';
import { EyeSide, ClinicalImageType, GazeDirection, ClinicalEyeImageRecord } from '../types/imaging';
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

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setErrorMessage(null);
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
      setPreviewDataUrl(e.target?.result as string);
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
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Upload Clinical Eye Photograph
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-400/30 text-blue-300 font-mono">
                  {customerCode}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Patient: <span className="text-slate-200 font-medium">{customerName}</span> · Secure tele-optometry record
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
                    ? 'border-blue-500 bg-blue-50/70' 
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Click to browse or drag & drop photo</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports high-resolution JPEG, PNG, or WebP up to 15 MB
                  </p>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Use smartphone camera macro mode or auxiliary lens attachment</span>
                </div>
              </div>
            ) : (
              <div className="relative border border-slate-200 rounded-2xl p-3 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-300 shadow-inner flex items-center justify-center">
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
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Image Validated
                      </span>
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
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Classification */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Clinical Image Type <span className="text-red-500">*</span>
              </label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value as ClinicalImageType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXTERNAL_PHOTO">External Eye Photo (Macro / Lids & Sclera)</option>
                <option value="GAZE_DIRECTION">Gaze Direction / Motility (Strabismus check)</option>
                <option value="ANTERIOR_SEGMENT_SLIT_LAMP">Anterior Segment (Cornea, Iris, Lens)</option>
                <option value="FUNDUS_RETINAL">Fundus / Retinal (Optical Adapter / Fundus Cam)</option>
                <option value="OTHER">Other / Supplementary Clinical Picture</option>
              </select>

              {/* Conditional Gaze Direction */}
              {imageType === 'GAZE_DIRECTION' && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Gaze Direction
                  </label>
                  <select
                    value={gazeDirection}
                    onChange={(e) => setGazeDirection(e.target.value as GazeDirection)}
                    className="w-full px-3 py-1.5 text-xs border border-blue-300 rounded-lg bg-blue-50/50 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRIMARY">Primary Position (Straight ahead)</option>
                    <option value="UP">Elevation (Looking Up)</option>
                    <option value="DOWN">Depression (Looking Down)</option>
                    <option value="LEFT">Dextroversion / Levoversion (Left)</option>
                    <option value="RIGHT">Dextroversion / Levoversion (Right)</option>
                    <option value="UP_RIGHT">Up & Right</option>
                    <option value="UP_LEFT">Up & Left</option>
                    <option value="DOWN_RIGHT">Down & Right</option>
                    <option value="DOWN_LEFT">Down & Left</option>
                  </select>
                </div>
              )}

              {/* Capture Date */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Capture Date
                </label>
                <input
                  type="date"
                  value={captureDate}
                  onChange={(e) => setCaptureDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

          </div>

          {/* Clinical Context / Observations */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Clinical Context & Reason for Photograph (Optional)
              </label>
              <input
                type="text"
                value={clinicalContext}
                onChange={(e) => setClinicalContext(e.target.value)}
                placeholder="e.g., Redness OD for 3 days, screening triage, corneal scratch check"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Visual Observations / Operator Notes (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Note any visible irregularities, equipment used (e.g. 20D lens attachment, phone LED, slit lamp adapter), or patient symptoms..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Non-Diagnostic Disclaimer Banner */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-amber-800">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Tele-Triage Notice:</span> Images captured through non-standard consumer hardware or smartphone adapters are supplementary triage records for optometrist tele-consultation. They do not substitute for a comprehensive in-person slit lamp or dilated fundus examination.
            </div>
          </div>

          {/* Mandatory Informed Consent Section */}
          <div className="p-4 bg-slate-50 border-2 border-dashed border-blue-200 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2 text-blue-900 font-semibold text-sm">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>Mandatory Patient Informed Consent</span>
            </div>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I certify that the customer (or legal guardian) has been verbally informed of the optical screening purpose and has explicitly provided informed consent for photographic capture, secure storage, and tele-optometric review within the VisionBridge network.
              </span>
            </label>

            <div className="pt-2 flex items-center space-x-3 text-xs">
              <span className="text-slate-600 font-medium shrink-0">Consented By:</span>
              <input
                type="text"
                value={consentedBy}
                onChange={(e) => setConsentedBy(e.target.value)}
                placeholder="Customer or guardian full name"
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !previewDataUrl || !hasConsent}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 flex items-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading Clinical Record...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Save to Clinical Record</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

