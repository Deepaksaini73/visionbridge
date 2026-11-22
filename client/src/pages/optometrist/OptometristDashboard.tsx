import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, getAuthenticatedMediaUrl } from '@/services/api';
import { EyeImageGallery } from '@/features/imaging/components/EyeImageGallery';
import { ImageViewerModal } from '@/features/imaging/components/ImageViewerModal';
import { imagingApi } from '@/features/imaging/services/imagingApi';
import { ClinicalEyeImageRecord } from '@/features/imaging/types/imaging';
import { StatCard } from '@/components/ui/StatCard';
import { ClinicalStatusBadge } from '@/components/ui/Badge';

interface ReviewCase {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  profilePhotoUrl?: string;
  age: number;
  gender: string;
  storeName: string;
  urgencyLevel: 'ROUTINE' | 'MODERATE' | 'HIGH';
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
}

const INITIAL_REVIEW_CASES: ReviewCase[] = [
  {
    id: 'case_01',
    customerId: 'cust_demo_02',
    customerCode: 'VB-2026-0102',
    customerName: 'Mohammad Tariq',
    age: 61,
    gender: 'MALE',
    storeName: 'VisionPoint Chittoor Center',
    urgencyLevel: 'HIGH',
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
    submittedAt: '3 hours ago'
  },
  {
    id: 'case_02',
    customerId: 'cust_demo_01',
    customerCode: 'VB-2026-0101',
    customerName: 'Lakshmi Narayanan',
    age: 52,
    gender: 'FEMALE',
    storeName: 'VisionPoint Madanapalle Center',
    urgencyLevel: 'MODERATE',
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
    submittedAt: '6 hours ago'
  },
  {
    id: 'case_03',
    customerId: 'cust_demo_03',
    customerCode: 'VB-2026-0103',
    customerName: 'Pooja Verma',
    age: 24,
    gender: 'FEMALE',
    storeName: 'VisionPoint Tirupati Hub',
    urgencyLevel: 'ROUTINE',
    warningFlags: [],
    interviewHighlights: [
      'Chief Complaint: End-of-day eye fatigue and slight dryness during exam preparation.',
      'Screen usage: >7 hours daily on smartphone/laptop.',
      'No visual distortion or unilateral weakness.'
    ],
    screeningObservations: {
      rightEyeAcuity: '6/6',
      leftEyeAcuity: '6/6',
      amslerGridRight: 'Normal',
      amslerGridLeft: 'Normal',
      testQuality: 'GOOD'
    },
    aiSummary: {
      text: 'Normal bilateral acuity (6/6). Reported symptoms indicate asthenopia / digital visual fatigue without organic deficit.',
      urgency: 'ROUTINE'
    },
    status: 'REVIEWED',
    submittedAt: 'Yesterday',
    decision: 'ROUTINE_OBSERVATION',
    clinicalNotes: 'Screening within normal limits. Recommended standard 20-20-20 screen hygiene and artificial tears if symptoms persist.'
  }
];

export const OptometristDashboard: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<ReviewCase[]>(INITIAL_REVIEW_CASES);
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'HIGH' | 'PENDING' | 'REVIEWED'>('ALL');

  // Review submission state
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [decision, setDecision] = useState<'ROUTINE_OBSERVATION' | 'REFERRAL_RECOMMENDED' | 'RETEST_REQUESTED'>('ROUTINE_OBSERVATION');
  const [referralFacility, setReferralFacility] = useState('District Eye Hospital, Chittoor');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [screeningRecords, setScreeningRecords] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const loadData = () => {
    setIsRefreshing(true);
    apiRequest<any[]>('/screenings')
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setScreeningRecords(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsRefreshing(false));

    apiRequest<any[]>('/customers')
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCases(prev => prev.map(c => {
            const match = res.data?.find((d: any) => 
              d.customerCode === c.customerCode || 
              d.customerId === c.customerCode || 
              d.id === c.customerId ||
              d.customerId === c.customerId
            );
            if (match && (match.profilePhotoUrl || match.profilePhoto?.url)) {
              return { 
                ...c, 
                profilePhotoUrl: match.profilePhotoUrl || match.profilePhoto?.url 
              };
            }
            return c;
          }));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCases = cases.filter(c => c.status === 'PENDING_REVIEW');
  const highUrgencyCases = cases.filter(c => c.urgencyLevel === 'HIGH' && c.status === 'PENDING_REVIEW');
  const reviewedCases = cases.filter(c => c.status !== 'PENDING_REVIEW');

  // Filtered cases
  const filteredCases = cases.filter(c => {
    const matchesQuery = !searchQuery.trim() || 
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.storeName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesQuery) return false;

    if (filterUrgency === 'HIGH') return c.urgencyLevel === 'HIGH';
    if (filterUrgency === 'PENDING') return c.status === 'PENDING_REVIEW';
    if (filterUrgency === 'REVIEWED') return c.status !== 'PENDING_REVIEW';
    return true;
  });

  const handleOpenReview = (c: ReviewCase) => {
    setSelectedCase(c);
    setClinicalNotes(c.clinicalNotes || '');
    setDecision((c.decision as any) || (c.urgencyLevel === 'HIGH' ? 'REFERRAL_RECOMMENDED' : 'ROUTINE_OBSERVATION'));
  };

  const handleSaveDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !clinicalNotes.trim()) {
      alert('Please write clinical notes before signing off the review.');
      return;
    }

    const updated = cases.map(c => {
      if (c.id === selectedCase.id) {
        return {
          ...c,
          status: (decision === 'REFERRAL_RECOMMENDED' ? 'REFERRAL_REQUIRED' : 'REVIEWED') as any,
          decision,
          clinicalNotes,
        };
      }
      return c;
    });

    setCases(updated);
    setSubmitSuccessMsg(`Review completed and officially signed for ${selectedCase.customerName}.`);
    setSelectedCase(null);
    setTimeout(() => setSubmitSuccessMsg(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* 1. REVIEWER PROFILE HEADER (Cohesive Glassmorphic Design) */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-glass flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative overflow-hidden">
        
        {/* Decorative ambient corner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-blue-200/15 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 shadow-2xs">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>Tele-Optometry Review Hub</span>
            </span>
            <span className="text-xs font-mono text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              License: {user?.licenseNumber || 'OPT-IN-2024-8841'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-display">
            {user?.name || 'Dr. Ananya Sharma, M.Optom'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Senior Clinical Optometrist • Tele-Screening Review Network • Rural Partner Centers
          </p>
        </div>

        {/* Action Controls & Live Stats Counters */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="bg-white/80 border border-slate-200 px-3.5 py-2 rounded-2xl text-center shadow-2xs">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pending Review</div>
              <div className="text-lg font-bold text-amber-600">{pendingCases.length}</div>
            </div>

            <div className="bg-white/80 border border-slate-200 px-3.5 py-2 rounded-2xl text-center shadow-2xs">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Signed Today</div>
              <div className="text-lg font-bold text-teal-600">4</div>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
            title="Refresh clinical queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setFilterUrgency(filterUrgency === 'HIGH' ? 'ALL' : 'HIGH')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 ${
              filterUrgency === 'HIGH'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{filterUrgency === 'HIGH' ? 'Showing Urgent (Reset)' : 'Urgent Flags Only'}</span>
          </button>
        </div>
      </div>

      {submitSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-2xl flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{submitSuccessMsg}</span>
        </div>
      )}

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Urgent Triage Flags"
          value={`${highUrgencyCases.length} Case${highUrgencyCases.length === 1 ? '' : 's'}`}
          subtitle="Asymmetric acuity / Metamorphopsia"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="rose"
          badge={{ text: 'Priority', color: 'rose' }}
        />

        <StatCard
          title="Pending Tele-Review"
          value={`${pendingCases.length} Cases`}
          subtitle="Awaiting clinical sign-off"
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          badge={{ text: 'Action Required', color: 'amber' }}
        />

        <StatCard
          title="Signed / Archived"
          value={`${reviewedCases.length} Cases`}
          subtitle="Signed with recommendations"
          icon={<UserCheck className="w-5 h-5" />}
          color="emerald"
        />

        <StatCard
          title="Connected Rural Stores"
          value="3 Centers"
          subtitle="Chittoor, Madanapalle & Tirupati"
          icon={<Hospital className="w-5 h-5" />}
          color="teal"
          badge={{ text: 'Online Hub', color: 'teal' }}
        />
      </div>

      {/* 3. CASE REVIEW QUEUE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-healthcare overflow-hidden">
        {/* Header and Filter Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-display font-extrabold text-navy-950">
                Active Clinical Review Queue
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200">
                {pendingCases.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review raw interview observations, Tumbling-E optotype scores, eye photographs, and sign off notes
            </p>
          </div>

          {/* Filter and Search controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient, code, or store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterUrgency('ALL')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  filterUrgency === 'ALL'
                    ? 'bg-white text-navy-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({cases.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterUrgency('HIGH')}
                className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
                  filterUrgency === 'HIGH'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                Urgent
              </button>
              <button
                type="button"
                onClick={() => setFilterUrgency('PENDING')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  filterUrgency === 'PENDING'
                    ? 'bg-white text-navy-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setFilterUrgency('REVIEWED')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  filterUrgency === 'REVIEWED'
                    ? 'bg-white text-navy-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Signed
              </button>
            </div>
          </div>
        </div>

        {/* Case Cards List (Responsive for desktop & mobile) */}
        <div className="divide-y divide-slate-100">
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No clinical review cases match the selected filter or search query.</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const isUrgent = c.urgencyLevel === 'HIGH' && c.status === 'PENDING_REVIEW';

              return (
                <div
                  key={c.id}
                  className={`p-5 sm:p-6 transition-all ${
                    isUrgent
                      ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-rose-500'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    {/* Left: Avatar & Demographics & Telemetry */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-gradient-to-tr from-teal-800 to-navy-900 flex items-center justify-center font-bold text-sm text-white">
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
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-extrabold text-navy-950 text-base">
                            {c.customerName}
                          </span>
                          <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            {c.customerCode}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            • {c.age} yrs, {c.gender}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {c.storeName}
                          </span>

                          {/* Status badges */}
                          {isUrgent && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200 flex items-center gap-1 shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
                              Priority Macular Case
                            </span>
                          )}
                          {c.status === 'REVIEWED' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Signed Off
                            </span>
                          )}
                          {c.status === 'REFERRAL_REQUIRED' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                              Referral Dispatched
                            </span>
                          )}
                        </div>

                        {/* Telemetry pill row */}
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2.5">
                          <div className="bg-slate-100 px-2.5 py-1 rounded-xl font-mono border border-slate-200/60">
                            OD: <strong className="text-navy-950 font-bold">{c.screeningObservations.rightEyeAcuity}</strong> | OS: <strong className={c.screeningObservations.leftEyeAcuity === '6/36' ? 'text-rose-700 font-bold' : 'text-navy-950 font-bold'}>{c.screeningObservations.leftEyeAcuity}</strong>
                          </div>
                          <div className={`px-2.5 py-1 rounded-xl border ${c.screeningObservations.amslerGridLeft.includes('Metamorphopsia') ? 'bg-rose-100/80 text-rose-800 font-bold border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200/60'}`}>
                            Amsler OS: {c.screeningObservations.amslerGridLeft}
                          </div>
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Received {c.submittedAt}
                          </span>
                        </div>

                        {/* AI Summary excerpt */}
                        <div className="bg-teal-50/70 border border-teal-200/70 rounded-2xl p-3 text-xs text-teal-950 flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{c.aiSummary.text}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => handleReviewEyeImages(c)}
                        disabled={isLoadingImages}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 transition-all shadow-2xs active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                        <span>EyeCapture AI Photos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenReview(c)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-healthcare transition-all active:scale-95 ${
                          c.status === 'PENDING_REVIEW'
                            ? 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white hover:shadow-glow-teal'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{c.status === 'PENDING_REVIEW' ? 'Review & Sign' : 'View Signed File'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. PRELIMINARY VISION SCREENING INTAKE REVIEWS (MODULE 4) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-healthcare overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-200">
              <Eye className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-extrabold text-navy-950">
                Preliminary Vision Screening Sessions (Tumbling-E & Amsler)
              </h2>
              <p className="text-xs text-slate-500">
                Read-only review of visual acuity trials, calibration conditions, and macular Amsler reports
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
            {screeningRecords.length} Session(s) Recorded
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100">
              {screeningRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No preliminary screening records found in network.
                  </td>
                </tr>
              ) : (
                screeningRecords.map((scr) => (
                  <tr key={scr.id || scr.screeningId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-teal-50 flex items-center justify-center font-bold text-[11px] text-teal-800">
                          <img
                            src={`/api/customers/${scr.customerCode || scr.customerId}/photo`}
                            alt={scr.customerName || 'Customer'}
                            className="w-full h-full object-cover z-10"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
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
                        <a
                          href={`/api/screenings/${scr.screeningId}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                          <span>PDF</span>
                        </a>

                        <Link
                          to={`/screenings/${scr.screeningId}/review`}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 inline-flex items-center gap-1 transition-all shadow-2xs"
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

        {/* Mobile Stacked Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {screeningRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No preliminary screening records found in network.
            </div>
          ) : (
            screeningRecords.map((scr) => (
              <div key={scr.id || scr.screeningId} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-teal-50 flex items-center justify-center font-bold text-xs text-teal-800">
                      <span>{(scr.customerName || 'VB').slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-bold text-navy-950 text-sm">{scr.customerName || scr.customerId}</div>
                      <div className="text-[10px] text-teal-800 font-mono font-bold">{scr.screeningId}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    scr.testValidity === 'VALID_CALIBRATED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {scr.testValidity}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Acuity OD:</span>
                    <strong className="text-navy-950 font-bold">{scr.visualAcuity?.rightEye?.preliminaryScore || 'Pending'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Acuity OS:</span>
                    <strong className="text-navy-950 font-bold">{scr.visualAcuity?.leftEye?.preliminaryScore || 'Pending'}</strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/50">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Amsler Assessment:</span>
                    <span className="font-medium text-slate-700">{scr.amslerAssessment?.performed ? 'Recorded in Session' : 'Not Performed'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <a
                    href={`/api/screenings/${scr.screeningId}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 inline-flex items-center gap-1 shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    <span>PDF</span>
                  </a>
                  <Link
                    to={`/screenings/${scr.screeningId}/review`}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center gap-1 shadow-2xs"
                  >
                    <span>Review Case</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. CASE DETAIL INSPECTOR & CLINICAL SIGN-OFF MODAL (Safe z-[100] Layer) */}
      {selectedCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl my-8 overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200/90 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center font-bold text-sm">
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
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-navy-950 flex items-center justify-center text-sm font-bold transition-colors"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Section 1: Customer Reported */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-navy-950 uppercase tracking-wider">
                  <Mic className="w-4 h-4 text-teal-600" />
                  <span>1. Customer-Reported Information (Voice Interview)</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                  {selectedCase.interviewHighlights.map((hl, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{hl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Application Generated Observations */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-navy-950 uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-teal-600" />
                  <span>2. Application-Generated Observations (Screening Telemetry)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <div className="font-semibold text-slate-500">Visual Acuity (Tumbling-E)</div>
                    <div className="font-mono text-base font-bold text-navy-950">
                      OD: {selectedCase.screeningObservations.rightEyeAcuity} | OS: {selectedCase.screeningObservations.leftEyeAcuity}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Quality: {selectedCase.screeningObservations.testQuality}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <div className="font-semibold text-slate-500">Amsler Grid Metamorphopsia</div>
                    <div className="text-slate-800">
                      OD: {selectedCase.screeningObservations.amslerGridRight}
                    </div>
                    <div className={selectedCase.screeningObservations.amslerGridLeft.includes('Metamorphopsia') ? 'font-bold text-rose-700' : 'text-slate-800'}>
                      OS: {selectedCase.screeningObservations.amslerGridLeft}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Eye Photographs (Milestone 4.1) */}
              <div className="space-y-2">
                <EyeImageGallery
                  customerId={selectedCase.customerCode || selectedCase.customerId}
                  customerCode={selectedCase.customerCode}
                  customerName={selectedCase.customerName}
                  canUpload={false}
                  canReview={true}
                />
              </div>

              {/* Section 3: AI-Assisted Neutral Summary */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-teal-900">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>AI-Assisted Objective Summary (Google Gemini)</span>
                </div>
                <p className="text-teal-950 leading-relaxed">
                  {selectedCase.aiSummary.text}
                </p>
                <div className="text-[10px] text-teal-700 italic pt-1">
                  * Note: AI summary is provided for clinical efficiency only. Does not constitute autonomous diagnosis.
                </div>
              </div>

              {/* Section 4: Professional Assessment & Decision */}
              <form onSubmit={handleSaveDecision} className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-navy-950 uppercase tracking-wider">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>3. Optometrist Assessment & Action Plan</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Professional Recommendation / Clinical Decision *
                  </label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-semibold text-slate-800 bg-white"
                  >
                    <option value="ROUTINE_OBSERVATION">Routine Observation (No Urgent Deficit Detected)</option>
                    <option value="REFERRAL_RECOMMENDED">Referral Recommended (Requires In-Person Ophthalmologist Exam)</option>
                    <option value="RETEST_REQUESTED">Request Retest (Unreliable telemetry or inconsistent responses)</option>
                  </select>
                </div>

                {decision === 'REFERRAL_RECOMMENDED' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recommended Referral Facility *
                    </label>
                    <input
                      type="text"
                      value={referralFacility}
                      onChange={(e) => setReferralFacility(e.target.value)}
                      placeholder="e.g. District Eye Hospital, Chittoor"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optometrist Clinical Notes & Guidance *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter observations, suspected differential, and advice to be printed on customer profile..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3">
                  <div className="text-[11px] text-slate-500">
                    Signing as: <strong className="text-navy-950 font-semibold">{user?.name || 'Dr. Ananya Sharma, M.Optom'}</strong>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedCase(null)}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-healthcare hover:shadow-glow-teal flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Sign Off & Submit Review</span>
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
