import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  ArrowLeft,
  Printer,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Sliders,
  Sparkles,
  Info,
  Loader2,
  Check,
  FileCheck,
  Clock,
  Camera,
  Hospital
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { screeningApi } from '../../features/screening/services/screeningApi';
import { ScreeningStatusBadge } from '../../features/screening/components/ScreeningStatusBadge';
import { CLINICAL_DISCLAIMER_EN } from '@shared/config/screeningConfig';
import { EyeImageGallery } from '../../features/imaging/components/EyeImageGallery';

export const ScreeningReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [screening, setScreening] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review Form State
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);
  const [clinicalDecision, setClinicalDecision] = useState<'ROUTINE_MONITORING' | 'OPHTHALMIC_REFERRAL' | 'RETEST_RECOMMENDED' | 'INCONCLUSIVE'>('OPHTHALMIC_REFERRAL');
  const [urgency, setUrgency] = useState<'ROUTINE' | 'PROMPT_1_2_WEEKS' | 'URGENT_24_48_HOURS'>('PROMPT_1_2_WEEKS');
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([
    'Comprehensive in-person ophthalmic evaluation',
    'Objective & subjective refraction for spectacle correction',
  ]);

  const canReview = user?.role === 'OPTOMETRIST' || user?.role === 'ADMIN';

  useEffect(() => {
    async function fetchRecord() {
      if (!id) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await apiRequest<any>(`/screenings/${id}`);
        if (res.success && res.data) {
          setScreening(res.data);
          if (res.data.hasRedFlags) {
            setClinicalDecision('OPHTHALMIC_REFERRAL');
            setUrgency('URGENT_24_48_HOURS');
          }
        } else {
          setErrorMessage(res.error?.message || 'Screening record could not be found.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error communicating with server.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecord();
  }, [id]);

  const toggleRecommendation = (rec: string) => {
    if (selectedRecommendations.includes(rec)) {
      setSelectedRecommendations(selectedRecommendations.filter(r => r !== rec));
    } else {
      setSelectedRecommendations([...selectedRecommendations, rec]);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reviewNotes.trim()) return;

    setIsSubmittingReview(true);
    setReviewSuccessMessage(null);

    try {
      const res = await screeningApi.reviewScreening(id, {
        clinicalDecision,
        urgency,
        notes: reviewNotes,
        provisionalRecommendations: selectedRecommendations,
        licenseNumber: 'OPT-REG-IN-2026',
      });

      if (res.success && res.data) {
        setScreening(res.data);
        setReviewSuccessMessage('Clinical review successfully signed off and updated!');
      } else {
        alert(res.error?.message || 'Failed to submit review');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading Screening Record...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !screening) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4 animate-fade-in">
        <div className="p-5 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl text-xs flex items-center gap-3 justify-center shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <span>{errorMessage || 'Screening record not found.'}</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  const isUncalibrated = screening.calibrationDetails?.calibrationStatus !== 'CALIBRATED_PHYSICAL';
  const hasRedFlags = screening.hasRedFlags || (screening.warningFlags && screening.warningFlags.length > 0);
  const review = screening.professionalReview;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 animate-fade-in">
      {/* Top Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-navy-950 transition-colors"
              title="Return"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-display font-bold text-navy-950">
                  {screening.customerName || screening.customerId}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                  {screening.screeningId}
                </span>
                <span className="text-[11px] text-slate-400">
                  • {screening.storeName || screening.storeId}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Preliminary Vision Screening Record • Tele-Optometry Review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/screenings/${screening.screeningId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print / Download PDF</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Clinical Disclaimer Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Clinical Notice:</strong> {CLINICAL_DISCLAIMER_EN}
          </span>
        </div>

        {/* Urgent Warning Symptoms Notice if present */}
        {hasRedFlags && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1.5 animate-fade-in shadow-xs">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Concerning Screening Findings / Warning Flags Recorded</span>
            </div>
            <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5 pl-1">
              {(screening.warningFlags || []).map((flag: string, idx: number) => (
                <li key={idx} className="font-semibold">{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Screening Metadata & Status Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Test Validity</span>
            <div className="font-bold text-xs">
              <ScreeningStatusBadge status={screening.testValidity} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Review Status</span>
            <div className="font-bold text-xs">
              <ScreeningStatusBadge status={screening.professionalReviewStatus} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Distance Confirmed</span>
            <div className="font-bold text-xs text-navy-950">
              {screening.calibrationDetails?.confirmedDistanceMeters || 3.0} Meters
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Date Conducted</span>
            <div className="font-bold text-xs text-navy-950">
              {new Date(screening.completedAt || screening.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* MODULE A: Distance Visual Acuity */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-healthcare space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-600" />
              <h3 className="font-display font-bold text-xs text-navy-950 uppercase tracking-wide">
                Module A: Distance Visual Acuity (3m Tumbling-E)
              </h3>
            </div>
            {isUncalibrated && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
                Uncalibrated Display
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-slate-700">Right Eye (OD)</span>
                <span className="text-xs font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                  OD
                </span>
              </div>
              <div className="text-2xl font-bold text-teal-700">
                {screening.visualAcuity?.rightEye?.snellenEquivalent || screening.visualAcuity?.rightEyeEstimatedScore || 'Pending'}
              </div>
              <div className="text-xs text-slate-500">
                {screening.visualAcuity?.rightEye?.preliminaryScore || 'Not Tested'}
              </div>
              <div className="text-[11px] text-slate-400">
                Trials: {screening.visualAcuity?.rightEye?.correctTrials || 0} / {screening.visualAcuity?.rightEye?.totalTrials || 0} correct
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-slate-700">Left Eye (OS)</span>
                <span className="text-xs font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                  OS
                </span>
              </div>
              <div className="text-2xl font-bold text-teal-700">
                {screening.visualAcuity?.leftEye?.snellenEquivalent || screening.visualAcuity?.leftEyeEstimatedScore || 'Pending'}
              </div>
              <div className="text-xs text-slate-500">
                {screening.visualAcuity?.leftEye?.preliminaryScore || 'Not Tested'}
              </div>
              <div className="text-[11px] text-slate-400">
                Trials: {screening.visualAcuity?.leftEye?.correctTrials || 0} / {screening.visualAcuity?.leftEye?.totalTrials || 0} correct
              </div>
            </div>
          </div>
        </div>

        {/* MODULE B: Near Visual Acuity */}
        {screening.nearAcuity?.tested && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-healthcare space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <h3 className="font-display font-bold text-xs text-navy-950 uppercase tracking-wide">
                  Module B: Near Visual Acuity (40 cm Reading Distance)
                </h3>
              </div>
              <ScreeningStatusBadge status={screening.nearAcuity.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Right Eye (OD)</span>
                <div className="text-xl font-bold text-slate-800">{screening.nearAcuity.rightEyeScore || 'N/A'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Left Eye (OS)</span>
                <div className="text-xl font-bold text-slate-800">{screening.nearAcuity.leftEyeScore || 'N/A'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-teal-800">Binocular (OU)</span>
                <div className="text-xl font-bold text-teal-900">{screening.nearAcuity.binocularScore || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE C: Contrast Sensitivity */}
        {screening.contrastSensitivity?.tested && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-healthcare space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="font-display font-bold text-xs text-navy-950 uppercase tracking-wide">
                  Module C: Contrast Sensitivity (Diminishing Weber Steps)
                </h3>
              </div>
              <ScreeningStatusBadge status={screening.contrastSensitivity.contrastGrade} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">LogCS Score</span>
                <div className="text-xl font-bold text-slate-800">
                  {screening.contrastSensitivity.logCSScore?.toFixed(2)} LogCS
                </div>
                <div className="text-xs text-slate-500">Weber: {screening.contrastSensitivity.weberContrastPct}%</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Clinical Grade</span>
                <div className="text-xl font-bold text-slate-800">
                  {screening.contrastSensitivity.contrastGrade?.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-slate-500">Normal adult baseline: ≥ 1.65 LogCS</div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE D: Colour Vision Assessment */}
        {screening.colourVision?.tested && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-healthcare space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="font-display font-bold text-xs text-navy-950 uppercase tracking-wide">
                  Module D: Colour Vision Assessment (Pseudoisochromatic Simulation)
                </h3>
              </div>
              <ScreeningStatusBadge status={screening.colourVision.classification} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Plates Correct</span>
                <div className="text-xl font-bold text-slate-800">
                  {screening.colourVision.platesCorrect} / {screening.colourVision.platesTotal}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Classification</span>
                <div className="text-xl font-bold text-slate-800">
                  {screening.colourVision.classification?.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE E: Amsler Grid Assessment */}
        {screening.amslerAssessment?.performed && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-healthcare space-y-4">
            <h3 className="font-display font-bold text-xs text-navy-950 uppercase tracking-wide border-b border-slate-100 pb-3">
              Module E: Amsler Grid Assessment (Macular Function Check)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Right Eye (OD)</span>
                <div className="font-bold text-sm text-slate-800">
                  {screening.amslerAssessment.rightEye?.status?.replace(/_/g, ' ') || 'Normal'}
                </div>
                {screening.amslerAssessment.rightEye?.notes && (
                  <p className="text-xs text-slate-500 italic">{screening.amslerAssessment.rightEye.notes}</p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Left Eye (OS)</span>
                <div className="font-bold text-sm text-slate-800">
                  {screening.amslerAssessment.leftEye?.status?.replace(/_/g, ' ') || 'Normal'}
                </div>
                {screening.amslerAssessment.leftEye?.notes && (
                  <p className="text-xs text-slate-500 italic">{screening.amslerAssessment.leftEye.notes}</p>
                )}
              </div>
            </div>

            {screening.amslerAssessment.observations && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <strong>Observations:</strong> {screening.amslerAssessment.observations}
              </div>
            )}
          </div>
        )}

        {/* Operator Observations */}
        {screening.operatorObservations && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-healthcare space-y-2">
            <h3 className="font-display font-bold text-xs text-navy-950 uppercase tracking-wide border-b border-slate-100 pb-2">
              Operator Field Observations
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {screening.operatorObservations}
            </p>
          </div>
        )}

        {/* Clinical Eye Photographs (Milestone 4.1) */}
        <div className="space-y-4">
          <EyeImageGallery
            customerId={screening.customerId || screening.customerCode}
            customerCode={screening.customerCode || screening.customerId}
            customerName={screening.customerName || 'Patient'}
            canUpload={user?.role === 'STORE_OPERATOR' || user?.role === 'ADMIN'}
            canReview={canReview}
          />
        </div>

        {/* OPTOMETRIST CLINICAL REVIEW SECTION */}
        {review ? (
          <div className="bg-emerald-50/70 rounded-3xl p-6 sm:p-8 border-2 border-emerald-300 shadow-healthcare space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-display font-bold text-sm text-emerald-950 uppercase tracking-wide">
                  Optometrist Clinical Review Sign-Off
                </h3>
              </div>
              <span className="px-3 py-1 text-xs font-bold bg-emerald-200 text-emerald-900 rounded-full shadow-xs">
                Reviewed & Signed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">Clinician:</span>
                <div className="font-bold text-navy-950 mt-0.5">{review.reviewedBy?.name}</div>
                <div className="text-[11px] text-slate-500">{review.reviewedBy?.role} • #{review.reviewedBy?.licenseNumber}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Decision:</span>
                <div className="font-bold text-navy-950 mt-0.5">{review.clinicalDecision?.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Urgency:</span>
                <div className="font-bold text-navy-950 mt-0.5">{review.urgency}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Review Date:</span>
                <div className="font-bold text-navy-950 mt-0.5">{new Date(review.reviewedAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-200 text-xs text-slate-800 space-y-2">
              <div>
                <strong className="text-emerald-900">Clinical Evaluation Notes:</strong>
                <p className="mt-1 text-slate-700 whitespace-pre-wrap">{review.notes}</p>
              </div>

              {review.provisionalRecommendations && review.provisionalRecommendations.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <strong className="text-emerald-900">Recommended Next Steps:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-700">
                    {review.provisionalRecommendations.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : canReview ? (
          <form onSubmit={handleSubmitReview} className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-teal-500 shadow-healthcare space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-navy-950">Optometrist Clinical Review Sign-Off</h3>
                <p className="text-xs text-slate-500">Provide professional evaluation, referral determination, and instructions.</p>
              </div>
              <span className="px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
                Review Pending
              </span>
            </div>

            {reviewSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-semibold">
                {reviewSuccessMessage}
              </div>
            )}

            {/* Decision & Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Clinical Decision *
                </label>
                <select
                  value={clinicalDecision}
                  onChange={(e) => setClinicalDecision(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500 bg-white font-medium"
                >
                  <option value="OPHTHALMIC_REFERRAL">Ophthalmic Referral (In-person specialist consult)</option>
                  <option value="ROUTINE_MONITORING">Routine Monitoring (Periodic review in 6-12 months)</option>
                  <option value="RETEST_RECOMMENDED">Retest Recommended (Inconclusive / poor cooperation)</option>
                  <option value="INCONCLUSIVE">Inconclusive Preliminary Data</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Urgency Benchmark *
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500 bg-white font-medium"
                >
                  <option value="PROMPT_1_2_WEEKS">Prompt (Within 1 - 2 weeks)</option>
                  <option value="URGENT_24_48_HOURS">Urgent (Within 24 - 48 hours, Red Flags present)</option>
                  <option value="ROUTINE">Routine (Non-urgent appointment)</option>
                </select>
              </div>
            </div>

            {/* Recommendations checklist */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Provisional Clinical Recommendations
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  'Comprehensive in-person ophthalmic evaluation',
                  'Objective & subjective refraction for spectacle correction',
                  'Dilated fundus biomicroscopy',
                  'Optical coherence tomography (OCT) macular imaging',
                  'Intraocular pressure (IOP) tonometry',
                  'Standard automated visual field perimetry',
                ].map((rec) => (
                  <label
                    key={rec}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedRecommendations.includes(rec)
                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecommendations.includes(rec)}
                      onChange={() => toggleRecommendation(rec)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>{rec}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Optometrist Clinical Notes & Rationales *
              </label>
              <textarea
                rows={3}
                required
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter clinical assessment, e.g. Customer exhibits 6/36 in OS with wavy grid pattern on Amsler. Suspicion of macular changes. Advise prompt in-person slit-lamp and dilated fundoscopy..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Sign off button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingReview || !reviewNotes.trim()}
                className="px-8 py-3 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 shadow-xs flex items-center space-x-2 disabled:opacity-50 transition-colors"
              >
                {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Sign Off Clinical Review</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center justify-between">
            <span>Optometrist clinical review is pending. Only authorized eye-care professionals can sign off.</span>
            <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">STATUS: PENDING_REVIEW</span>
          </div>
        )}

        {/* Back Link */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return</span>
          </button>

          <Link
            to={`/customers/${screening.customerId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <span>View Full Customer Profile</span>
          </Link>
        </div>
      </main>
    </div>
  );
};
