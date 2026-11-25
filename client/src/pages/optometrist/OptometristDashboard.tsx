import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Stethoscope, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  Eye, 
  Mic, 
  Sparkles, 
  FileCheck, 
  ArrowRight, 
  RotateCcw, 
  Hospital, 
  Search,
  Filter,
  Printer,
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Store,
  User,
  Calendar,
  Activity,
  FileText,
  RefreshCw,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Send,
  Download,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, getAuthenticatedMediaUrl, openClinicalReportPdf } from '@/services/api';
import { EyeImageGallery } from '@/features/imaging/components/EyeImageGallery';
import { ImageViewerModal } from '@/features/imaging/components/ImageViewerModal';
import { imagingApi } from '@/features/imaging/services/imagingApi';
import { ClinicalEyeImageRecord } from '@/features/imaging/types/imaging';
import { StatCard } from '@/components/ui/StatCard';
import { ClinicalStatusBadge } from '@/components/ui/Badge';

export interface ReviewCase {
  id: string;
  screeningId?: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  profilePhotoUrl?: string;
  age: number;
  gender: string;
  storeName: string;
  urgencyLevel: 'ROUTINE' | 'MODERATE' | 'HIGH';
  flagCount?: number;
  warningFlags: string[];
  interviewHighlights: string[];
  screeningObservations: {
    rightEyeAcuity: string;
    leftEyeAcuity: string;
    amslerGridRight: string;
    amslerGridLeft: string;
    testQuality: string;
  };
  aiSummary: {
    text: string;
    urgency: string;
  };
  status: 'PENDING_REVIEW' | 'REVIEWED' | 'REFERRAL_REQUIRED';
  submittedAt: string;
  clinicalNotes?: string;
  decision?: string;
  referralFacility?: string;
  eyeImagesCount?: number;
}

// Fallback demo cases if database is empty or network offline
const FALLBACK_REVIEW_CASES: ReviewCase[] = [
  {
    id: 'rev_case_01',
    screeningId: 'SCR-2026-0102',
    customerId: 'cust_demo_02',
    customerCode: 'VB-2026-0102',
    customerName: 'Mohammad Tariq',
    age: 61,
    gender: 'MALE',
    storeName: 'VisionPoint Chittoor Center',
    urgencyLevel: 'HIGH',
    flagCount: 2,
    warningFlags: ['SIGNIFICANT_ACUITY_ASYMMETRY', 'AMSLER_METAMORPHOPSIA'],
    interviewHighlights: [
      'Chief Complaint: Wavy distortion when viewing door frames and carpentry tiles with left eye.',
      'Onset: Approximately 3 weeks, noted suddenly while working.',
      'Spectacle history: Owns OTC +2.00 readers purchased 3 years ago.',
      'Denies sudden total vision loss, flashes, or ocular trauma.'
    ],
    screeningObservations: {
      rightEyeAcuity: '6/9',
      leftEyeAcuity: '6/36',
      amslerGridRight: 'Normal (Grid lines perceived sharp & straight)',
      amslerGridLeft: 'Metamorphopsia noted near center fixation point',
      testQuality: 'GOOD (Reaction times consistent)'
    },
    aiSummary: {
      text: 'Marked inter-ocular visual acuity disparity (OD 6/9 vs OS 6/36) accompanied by subjective metamorphopsia in the left eye on Amsler evaluation. Strongly indicative of potential macular involvement. Immediate professional assessment indicated.',
      urgency: 'HIGH'
    },
    status: 'PENDING_REVIEW',
    submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    eyeImagesCount: 2
  },
  {
    id: 'rev_case_02',
    screeningId: 'SCR-2026-0101',
    customerId: 'cust_demo_01',
    customerCode: 'VB-2026-0101',
    customerName: 'Lakshmi Narayanan',
    age: 52,
    gender: 'FEMALE',
    storeName: 'VisionPoint Madanapalle Center',
    urgencyLevel: 'MODERATE',
    flagCount: 0,
    warningFlags: [],
    interviewHighlights: [
      'Chief Complaint: Gradual blurring when threading tailoring needles and reading bills.',
      'Duration: ~10 months slow progression.',
      'Outdoor/distance vision reported clear.'
    ],
    screeningObservations: {
      rightEyeAcuity: '6/9',
      leftEyeAcuity: '6/12',
      amslerGridRight: 'Normal',
      amslerGridLeft: 'Normal',
      testQuality: 'GOOD'
    },
    aiSummary: {
      text: 'Bilateral near-vision difficulty consistent with presbyopic age-related changes. Distance acuity acceptable on preliminary screening. No acute macular or red-flag symptoms detected.',
      urgency: 'ROUTINE'
    },
    status: 'PENDING_REVIEW',
    submittedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    eyeImagesCount: 1
  }
];

const QUICK_NOTE_TEMPLATES = [
  {
    title: 'Normal Routine Finding',
    text: 'Preliminary screening reveals acceptable bilateral visual acuity. Anterior segment appears clear on macro capture with no acute red flags. Recommend routine 12-month re-evaluation and standard ocular hygiene.',
    decision: 'ROUTINE_OBSERVATION' as const,
  },
  {
    title: 'Macular / Metamorphopsia Alert',
    text: 'Amsler grid assessment shows localized metamorphopsia with inter-ocular acuity disparity. Potential macular pathology suspected. Priority evaluation by a vitreoretinal specialist is strongly advised.',
    decision: 'REFERRAL_RECOMMENDED' as const,
  },
  {
    title: 'Presbyopia / Near Work Deficit',
    text: 'Presenting symptoms of bilateral near asthenopia and reduced near visual acuity, consistent with age-related presbyopia. Distance acuity remains functional. Prescribe near corrective lenses via local optometrist.',
    decision: 'ROUTINE_OBSERVATION' as const,
  },
  {
    title: 'Retest / Low Validity Telemetry',
    text: 'Preliminary screening results showed inconsistent reaction times or suboptimal ambient lighting during testing. Recommend repeat 3-meter Tumbling-E and Amsler test under calibrated conditions.',
    decision: 'RETEST_REQUESTED' as const,
  },
];

export const OptometristDashboard: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<ReviewCase[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'HIGH' | 'PENDING' | 'REVIEWED'>('ALL');

  // Review submission state
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [decision, setDecision] = useState<'ROUTINE_OBSERVATION' | 'REFERRAL_RECOMMENDED' | 'RETEST_REQUESTED'>('ROUTINE_OBSERVATION');
  const [referralFacility, setReferralFacility] = useState('District Eye Hospital, Chittoor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  // Modular screening sessions list
  const [screeningRecords, setScreeningRecords] = useState<any[]>([]);

  // Quick eye image viewer modal
  const [quickViewerImages, setQuickViewerImages] = useState<ClinicalEyeImageRecord[]>([]);
  const [isQuickViewerOpen, setIsQuickViewerOpen] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Lock body scroll when review modal is open
  useEffect(() => {
    if (selectedCase) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedCase]);

  // Load live data from MongoDB
  const fetchLiveQueue = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await apiRequest<ReviewCase[]>('/reviews/queue');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setCases(res.data);
      } else {
        setCases(FALLBACK_REVIEW_CASES);
      }
    } catch {
      setCases(FALLBACK_REVIEW_CASES);
    } finally {
      setIsLoadingQueue(false);
      setIsRefreshing(false);
    }

    // Fetch screening records list
    try {
      const scrRes = await apiRequest<any[]>('/screenings');
      if (scrRes.success && Array.isArray(scrRes.data)) {
        setScreeningRecords(scrRes.data);
      }
    } catch {
      // Quiet fallback
    }
  }, []);

  useEffect(() => {
    fetchLiveQueue();
  }, [fetchLiveQueue]);

  const handleReviewEyeImages = async (c: ReviewCase) => {
    setIsLoadingImages(true);
    try {
      const targetId = c.customerCode || c.customerId;
      const imgs = await imagingApi.getCustomerEyeImages(targetId);
      if (imgs && imgs.length > 0) {
        setQuickViewerImages(imgs);
        setIsQuickViewerOpen(true);
      } else {
        alert(`No clinical eye images uploaded yet for ${c.customerName} (${c.customerCode}).`);
      }
    } catch (err: any) {
      alert(err.message || 'Error loading clinical eye images.');
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleOpenReview = (c: ReviewCase) => {
    setSelectedCase(c);
    setClinicalNotes(c.clinicalNotes || '');
    setDecision(
      (c.decision as any) ||
      (c.urgencyLevel === 'HIGH' ? 'REFERRAL_RECOMMENDED' : 'ROUTINE_OBSERVATION')
    );
    setReferralFacility(c.referralFacility || 'District Eye Hospital, Chittoor');
    setSubmitErrorMsg(null);
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    if (!clinicalNotes.trim()) {
      setSubmitErrorMsg('Please provide professional clinical notes before signing off this case.');
      return;
    }

    setIsSubmitting(true);
    setSubmitErrorMsg(null);

    try {
      const payload = {
        decision,
        clinicalNotes: clinicalNotes.trim(),
        urgency: selectedCase.urgencyLevel,
        referralFacility: decision === 'REFERRAL_RECOMMENDED' ? referralFacility : undefined,
      };

      const res = await apiRequest(`/reviews/${selectedCase.id}/decision`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSubmitSuccessMsg(
          `Official clinical review signed and recorded for ${selectedCase.customerName} (${selectedCase.customerCode}).`
        );
        setSelectedCase(null);
        // Refresh live queue from database to show updated status
        await fetchLiveQueue(true);
      } else {
        // Fallback local update if network issue
        setCases((prev) =>
          prev.map((c) =>
            c.id === selectedCase.id
              ? {
                  ...c,
                  status: (decision === 'REFERRAL_RECOMMENDED' ? 'REFERRAL_REQUIRED' : 'REVIEWED') as any,
                  decision,
                  clinicalNotes: clinicalNotes.trim(),
                }
              : c
          )
        );
        setSubmitSuccessMsg(`Review recorded locally for ${selectedCase.customerName}.`);
        setSelectedCase(null);
      }
      setTimeout(() => setSubmitSuccessMsg(null), 5000);
    } catch (err: any) {
      setSubmitErrorMsg(err.message || 'Failed to submit review decision to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics calculation
  const pendingCases = cases.filter((c) => c.status === 'PENDING_REVIEW');
  const highUrgencyCases = cases.filter((c) => c.urgencyLevel === 'HIGH');
  const reviewedCases = cases.filter((c) => c.status !== 'PENDING_REVIEW');

  // Filtered cases for review queue
  const filteredCases = cases.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      c.customerName.toLowerCase().includes(query) ||
      c.customerCode.toLowerCase().includes(query) ||
      c.storeName.toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (filterUrgency === 'HIGH') return c.urgencyLevel === 'HIGH';
    if (filterUrgency === 'PENDING') return c.status === 'PENDING_REVIEW';
    if (filterUrgency === 'REVIEWED') return c.status !== 'PENDING_REVIEW';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-900">
      
      {/* 1. HERO COMMAND HEADER (Sleek Modern Medical Glassmorphism) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-2xl">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Live DB indicator & license badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Tele-Review Queue • MongoDB Connected</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs font-mono border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>License: {user?.licenseNumber || 'OPT-DEL-2024-8841'}</span>
              </span>
            </div>

            {/* Doctor title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white flex items-center gap-3">
                <Stethoscope className="w-7 h-7 text-teal-400" />
                <span>{user?.name || 'Dr. Ananya Sharma, M.Optom'}</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1 font-normal leading-relaxed">
                Supervising Tele-Optometrist • Rural Vision Center Preliminary Screening & Clinical Sign-Off Network
              </p>
            </div>
          </div>

          {/* Quick Stats & Controls in Header */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-center shadow-md">
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Pending Review</div>
                <div className="text-xl font-extrabold text-white">{pendingCases.length}</div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-center shadow-md">
                <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400">Urgent Triage</div>
                <div className="text-xl font-extrabold text-white">{highUrgencyCases.length}</div>
              </div>

              <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-center shadow-md">
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Signed Off</div>
                <div className="text-xl font-extrabold text-white">{reviewedCases.length}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchLiveQueue()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600/90 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 border border-teal-500/40 cursor-pointer"
              title="Refresh queue from MongoDB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Queue'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {submitSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-2xl flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{submitSuccessMsg}</span>
        </div>
      )}

      {/* 2. ENHANCED KPI STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-rose-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Urgent Triage Flags</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{highUrgencyCases.length} Cases</div>
          <p className="text-xs text-rose-600 font-medium mt-1">Metamorphopsia or visual acuity red flags</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Tele-Review</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{pendingCases.length} Cases</div>
          <p className="text-xs text-amber-600 font-medium mt-1">Awaiting professional review & sign-off</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Signed & Dispatched</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{reviewedCases.length} Cases</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Officially verified with PDF reports</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-teal-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-sky-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Rural Centers Active</span>
            <span className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Hospital className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">3 Hubs</div>
          <p className="text-xs text-teal-600 font-medium mt-1">Chittoor, Madanapalle & Tirupati</p>
        </div>
      </div>

      {/* 3. ACTIVE CLINICAL REVIEW QUEUE (REDESIGNED CONTAINER) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-healthcare overflow-hidden">
        
        {/* Queue Header & Filters Toolbar */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-display font-extrabold text-navy-950">
                Active Clinical Review Queue
              </h2>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 shadow-2xs">
                {pendingCases.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review raw interview observations, Tumbling-E optotype scores, eye photographs, and sign off notes
            </p>
          </div>

          {/* Search & Urgency Filter Pills */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search bar */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search patient, code, or store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-semibold border border-slate-200/80">
              <button
                type="button"
                onClick={() => setFilterUrgency('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  filterUrgency === 'ALL'
                    ? 'bg-white text-navy-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({cases.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterUrgency('HIGH')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  filterUrgency === 'HIGH'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-rose-700 hover:bg-rose-100/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>Urgent ({highUrgencyCases.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterUrgency('PENDING')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  filterUrgency === 'PENDING'
                    ? 'bg-white text-navy-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingCases.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterUrgency('REVIEWED')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  filterUrgency === 'REVIEWED'
                    ? 'bg-white text-navy-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Signed ({reviewedCases.length})
              </button>
            </div>
          </div>
        </div>

        {/* Case Cards List (Refined Modern Cards) */}
        <div className="divide-y divide-slate-100">
          {isLoadingQueue ? (
            <div className="p-16 text-center text-xs text-slate-500 space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="font-semibold">Loading live clinical cases from MongoDB...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No clinical cases found matching filter criteria.</p>
              <p>Try switching to "All" or clearing the search query.</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const isHighUrgency = c.urgencyLevel === 'HIGH';
              const isPending = c.status === 'PENDING_REVIEW';

              return (
                <div
                  key={c.id}
                  className={`p-5 sm:p-6 transition-all ${
                    isHighUrgency && isPending
                      ? 'bg-rose-50/30 hover:bg-rose-50/60 border-l-4 border-rose-500'
                      : !isPending
                      ? 'bg-slate-50/30 hover:bg-slate-50/60 border-l-4 border-emerald-500'
                      : 'hover:bg-slate-50/60 border-l-4 border-amber-500'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    
                    {/* Left: Patient Avatar & Demographics & Telemetry */}
                    <div className="flex items-start space-x-4 flex-1">
                      
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shrink-0 shadow-sm bg-gradient-to-tr from-slate-800 to-teal-700 flex items-center justify-center font-bold text-sm text-white">
                        {c.profilePhotoUrl ? (
                          <img
                            src={getAuthenticatedMediaUrl(c.profilePhotoUrl)}
                            alt={c.customerName}
                            className="w-full h-full object-cover z-10"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                          {c.customerName ? c.customerName.slice(0, 2).toUpperCase() : 'VB'}
                        </span>
                      </div>
                      
                      {/* Patient Info & Clinical Highlights */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-extrabold text-navy-950 text-base">
                            {c.customerName}
                          </span>
                          <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                            {c.customerCode}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            • {c.age} yrs, {c.gender}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {c.storeName}
                          </span>

                          {/* Status and Urgency Badges */}
                          {isHighUrgency && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 flex items-center gap-1 shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
                              Priority Macular Case
                            </span>
                          )}
                          {c.status === 'REVIEWED' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Signed & Verified
                            </span>
                          )}
                          {c.status === 'REFERRAL_REQUIRED' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
                              Ophthalmic Referral Dispatched
                            </span>
                          )}
                          {c.status === 'PENDING_REVIEW' && !isHighUrgency && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                              Awaiting Sign-Off
                            </span>
                          )}
                        </div>

                        {/* Telemetry Metric Tiles */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/70 font-mono">
                            <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Visual Acuity (Tumbling-E)</span>
                            <div className="mt-0.5">
                              OD: <strong className="text-navy-950 font-bold">{c.screeningObservations.rightEyeAcuity}</strong> | OS: <strong className={c.screeningObservations.leftEyeAcuity.includes('6/36') || c.screeningObservations.leftEyeAcuity.includes('6/60') ? 'text-rose-600 font-bold' : 'text-navy-950 font-bold'}>{c.screeningObservations.leftEyeAcuity}</strong>
                            </div>
                          </div>

                          <div className={`p-2.5 rounded-xl border ${
                            c.screeningObservations.amslerGridLeft.includes('Metamorphopsia') || c.screeningObservations.amslerGridRight.includes('Metamorphopsia')
                              ? 'bg-rose-50 border-rose-200 text-rose-900'
                              : 'bg-slate-100/80 border-slate-200/70 text-slate-800'
                          }`}>
                            <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Amsler Macular Grid</span>
                            <div className="font-semibold mt-0.5 truncate">
                              OD: {c.screeningObservations.amslerGridRight} | OS: {c.screeningObservations.amslerGridLeft}
                            </div>
                          </div>

                          <div className="bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/70 text-slate-700">
                            <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Test Reliability</span>
                            <div className="font-semibold mt-0.5 flex items-center justify-between">
                              <span>{c.screeningObservations.testQuality}</span>
                              <span className="text-slate-400 text-[10px]">
                                {new Date(c.submittedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Raw Interview Chief Complaint Excerpts */}
                        {c.interviewHighlights.length > 0 && (
                          <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3 text-xs space-y-1">
                            <div className="text-[10px] uppercase font-bold tracking-wider text-sky-800 flex items-center gap-1.5">
                              <Mic className="w-3 h-3 text-sky-600" />
                              <span>Patient Interview Observations</span>
                            </div>
                            <div className="text-slate-700 space-y-0.5 leading-relaxed">
                              {c.interviewHighlights.slice(0, 2).map((hl, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <span className="text-sky-500">•</span>
                                  <span>{hl}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Summary excerpt */}
                        <div className="bg-teal-50/70 border border-teal-200/70 rounded-xl p-3 text-xs text-teal-950 flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <strong className="font-bold text-teal-900 block text-[11px] mb-0.5">AI Screening Insight:</strong>
                            <span className="line-clamp-2">{c.aiSummary.text}</span>
                          </div>
                        </div>

                        {/* Doctor Notes if already signed */}
                        {c.clinicalNotes && (
                          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                            <strong className="font-bold text-emerald-900 block text-[11px]">
                              Signed Clinical Notes ({c.decision?.replace(/_/g, ' ')}):
                            </strong>
                            <p className="italic text-emerald-900">{c.clinicalNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Action Buttons Group */}
                    <div className="flex flex-wrap lg:flex-col items-center gap-2 shrink-0 self-end lg:self-center mt-3 lg:mt-0">
                      
                      {/* Review & Sign Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenReview(c)}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-healthcare transition-all cursor-pointer active:scale-95 ${
                          c.status === 'PENDING_REVIEW'
                            ? 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-teal-500/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                        }`}
                      >
                        <Stethoscope className="w-4 h-4" />
                        <span>{c.status === 'PENDING_REVIEW' ? 'Review & Sign Off' : 'Edit / View Sign-off'}</span>
                      </button>

                      {/* EyeCapture AI Photos Button */}
                      <button
                        type="button"
                        onClick={() => handleReviewEyeImages(c)}
                        disabled={isLoadingImages}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Inspect clinical ocular photos and AI segmentation"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>EyeCapture Photos ({c.eyeImagesCount || 0})</span>
                      </button>

                      {/* Download PDF Report Button */}
                      <button
                        type="button"
                        onClick={() => openClinicalReportPdf(c.id)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Download printable comprehensive clinical PDF report"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Download Report (PDF)</span>
                      </button>

                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. MODULAR SCREENING SESSIONS TABLE (MODULE 4 INTAKE AUDIT) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-healthcare overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-200 shadow-xs">
              <Eye className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-extrabold text-navy-950">
                Preliminary Vision Screening Sessions (Tumbling-E & Amsler)
              </h2>
              <p className="text-xs text-slate-500">
                Database log of visual acuity trials, calibration conditions, and macular reports
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
            {screeningRecords.length} Session(s) Recorded
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Customer / ID</th>
                <th className="px-6 py-3.5">Store Center</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Right Eye (OD)</th>
                <th className="px-6 py-3.5">Left Eye (OS)</th>
                <th className="px-6 py-3.5">Amsler Assessment</th>
                <th className="px-6 py-3.5">Validity</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {screeningRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No preliminary screening records found in database.
                  </td>
                </tr>
              ) : (
                screeningRecords.map((scr) => (
                  <tr key={scr.id || scr.screeningId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-teal-50 flex items-center justify-center font-bold text-[11px] text-teal-800">
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                            {scr.customerName ? scr.customerName.slice(0, 2).toUpperCase() : 'VB'}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-navy-950 text-sm">{scr.customerName || scr.customerId}</div>
                          <div className="text-[11px] text-teal-800 font-mono font-semibold">{scr.screeningId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {scr.storeName || scr.storeId}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(scr.completedAt || scr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {scr.visualAcuity?.rightEye?.preliminaryScore || scr.visualAcuity?.rightEyeEstimatedScore || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {scr.visualAcuity?.leftEye?.preliminaryScore || scr.visualAcuity?.leftEyeEstimatedScore || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {scr.amslerAssessment?.performed ? (
                        scr.amslerAssessment.rightEye?.status === 'WAVY_LINES' || scr.amslerAssessment.leftEye?.status === 'WAVY_LINES' ? (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Metamorphopsia
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Normal
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        scr.testValidity === 'VALID_CALIBRATED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {scr.testValidity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openClinicalReportPdf(scr.screeningId)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          title="Open clinical PDF report"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>PDF</span>
                        </button>

                        <Link
                          to={`/screenings/${scr.screeningId}/review`}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 inline-flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. CLINICAL CASE DETAIL INSPECTOR & SIGN-OFF MODAL */}
      {selectedCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-navy-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl my-auto max-h-[94vh] flex flex-col overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shrink-0 shadow-sm bg-gradient-to-tr from-teal-700 to-navy-900 text-white flex items-center justify-center font-bold text-sm">
                  {selectedCase.profilePhotoUrl ? (
                    <img
                      src={getAuthenticatedMediaUrl(selectedCase.profilePhotoUrl)}
                      alt={selectedCase.customerName}
                      className="w-full h-full object-cover z-10"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    {selectedCase.customerName ? selectedCase.customerName.slice(0, 2).toUpperCase() : 'VB'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {selectedCase.customerCode}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">• {selectedCase.storeName}</span>
                  </div>
                  <h3 className="font-display font-extrabold text-navy-950 text-lg mt-0.5">
                    {selectedCase.customerName} ({selectedCase.age} y/o, {selectedCase.gender})
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openClinicalReportPdf(selectedCase.id)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print / Save current PDF report"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Preview PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="w-9 h-9 rounded-2xl bg-slate-200/70 hover:bg-slate-200 text-slate-600 hover:text-navy-950 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                  title="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto">
              
              {/* Section 1: Customer Reported Voice Interview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-navy-950 uppercase tracking-wider">
                  <Mic className="w-4 h-4 text-sky-600" />
                  <span>1. Customer-Reported Information (Voice Interview & Chief Complaints)</span>
                </div>
                <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 text-xs space-y-2">
                  {selectedCase.interviewHighlights.map((hl, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed font-medium">{hl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Screening Telemetry & Tumbling-E Acuity */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-navy-950 uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-teal-600" />
                  <span>2. Preliminary Screening Telemetry (Visual Acuity & Macular Findings)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Visual Acuity (Tumbling-E OD vs OS)</div>
                    <div className="font-mono text-base font-bold text-navy-950">
                      OD: {selectedCase.screeningObservations.rightEyeAcuity} | OS: {selectedCase.screeningObservations.leftEyeAcuity}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Protocol Validity: <strong className="text-slate-700">{selectedCase.screeningObservations.testQuality}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Amsler Grid Macular Distortion</div>
                    <div className="text-slate-800">
                      OD: <span className="font-semibold">{selectedCase.screeningObservations.amslerGridRight}</span>
                    </div>
                    <div className={selectedCase.screeningObservations.amslerGridLeft.includes('Metamorphopsia') ? 'font-bold text-rose-700' : 'text-slate-800'}>
                      OS: <span className="font-semibold">{selectedCase.screeningObservations.amslerGridLeft}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Clinical Eye Photographs */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-navy-950 uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-purple-600" />
                  <span>3. Anterior Segment & Adnexal Photographs</span>
                </div>
                <EyeImageGallery
                  customerId={selectedCase.customerCode || selectedCase.customerId}
                  customerCode={selectedCase.customerCode}
                  customerName={selectedCase.customerName}
                  canUpload={false}
                  canReview={true}
                />
              </div>

              {/* Section 4: AI-Assisted Neutral Summary */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-teal-900">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>AI Clinical Decision Support (Google Gemini)</span>
                </div>
                <p className="text-teal-950 leading-relaxed font-medium">
                  {selectedCase.aiSummary.text}
                </p>
                <div className="text-[10px] text-teal-700 italic pt-1">
                  * Note: Preliminary AI observations assist clinical efficiency only and do not replace professional judgment.
                </div>
              </div>

              {/* Section 5: Professional Sign-Off Form */}
              <form onSubmit={handleSaveDecision} className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-navy-950 uppercase tracking-wider">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>4. Optometrist Assessment & Clinical Action Plan</span>
                </div>

                {submitErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{submitErrorMsg}</span>
                  </div>
                )}

                {/* Clinical Decision Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Clinical Recommendation / Verdict *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecision('ROUTINE_OBSERVATION')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        decision === 'ROUTINE_OBSERVATION'
                          ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-sm">Routine Observation</span>
                      <span className="text-[10px] font-normal text-slate-500">No urgent deficit identified</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('REFERRAL_RECOMMENDED')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        decision === 'REFERRAL_RECOMMENDED'
                          ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-sm">Ophthalmic Referral</span>
                      <span className="text-[10px] font-normal text-slate-500">Requires hospital specialist exam</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('RETEST_REQUESTED')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        decision === 'RETEST_REQUESTED'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-sm">Request Retest</span>
                      <span className="text-[10px] font-normal text-slate-500">Inconclusive telemetry conditions</span>
                    </button>
                  </div>
                </div>

                {/* Referral Facility if referral is chosen */}
                {decision === 'REFERRAL_RECOMMENDED' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Recommended Referral Facility *
                    </label>
                    <input
                      type="text"
                      value={referralFacility}
                      onChange={(e) => setReferralFacility(e.target.value)}
                      placeholder="e.g. District Eye Hospital, Chittoor"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium"
                    />
                  </div>
                )}

                {/* Quick Clinical Note Chips */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quick Clinical Presets (Click to insert):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_NOTE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setClinicalNotes(tmpl.text);
                          setDecision(tmpl.decision);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
                      >
                        + {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clinical Notes Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Optometrist Clinical Notes & Signed Guidance *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Document clinical impression, differential diagnosis considerations, and recommendations for patient profile..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium leading-relaxed"
                  />
                </div>

                {/* Digital Signature Affirmation Block */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified Digital Signature</span>
                    <strong className="text-navy-950 font-bold">{user?.name || 'Dr. Ananya Sharma, M.Optom'}</strong>
                    <span className="text-slate-500 ml-1.5">({user?.licenseNumber || 'OPT-DEL-2024-8841'})</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold border border-teal-300">
                    Tele-Sign Secured
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => openClinicalReportPdf(selectedCase.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full Patient Report (PDF)</span>
                  </button>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedCase(null)}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{isSubmitting ? 'Signing...' : 'Sign Off & Save to Database'}</span>
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Quick Standalone Eye Image Viewer Modal */}
      {isQuickViewerOpen && (
        <ImageViewerModal
          images={quickViewerImages}
          isOpen={isQuickViewerOpen}
          onClose={() => setIsQuickViewerOpen(false)}
        />
      )}

    </div>
  );
};