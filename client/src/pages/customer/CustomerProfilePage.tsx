import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  Phone, 
  Languages, 
  Store, 
  ShieldCheck, 
  ArrowLeft, 
  Mic, 
  Eye, 
  Sparkles, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  RefreshCw, 
  FileText,
  ShieldAlert,
  ChevronRight,
  ArrowRight,
  Camera,
  Printer
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/services/api';
import { CustomerDemographics } from '@shared/types';
import { ProfilePhotoUploader } from '@/features/imaging/components/ProfilePhotoUploader';
import { EyeImageGallery } from '@/features/imaging/components/EyeImageGallery';
import { ClinicalStatusBadge } from '@/components/ui/Badge';

export const CustomerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();

  const [customer, setCustomer] = useState<CustomerDemographics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Newly registered toast banner
  const newlyRegistered = (location.state as any)?.newlyRegistered;

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [interviewRecord, setInterviewRecord] = useState<any | null>(null);
  const [screeningHistory, setScreeningHistory] = useState<any[]>([]);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    age: '',
    phone: '',
    preferredLanguage: 'hi' as 'hi' | 'en',
    notes: '',
  });

  const fetchCustomerDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiRequest<CustomerDemographics>(`/customers/${id}`);
      setIsLoading(false);

      if (res.success && res.data) {
        setCustomer(res.data);
        setEditFormData({
          fullName: res.data.fullName || res.data.name,
          age: String(res.data.age),
          phone: res.data.contactNumber || res.data.phone || '',
          preferredLanguage: res.data.preferredLanguage || 'hi',
          notes: res.data.notes || '',
        });

        // Fetch associated interview session
        try {
          const targetCustId = res.data.customerId || id;
          const intRes = await apiRequest(`/interviews/customer/${targetCustId}`);
          if (intRes.success && intRes.data?.latest) {
            setInterviewRecord(intRes.data.latest);
          }
        } catch {
          // Non-blocking
        }

        // Fetch associated screening sessions
        try {
          const targetCustId = res.data.customerId || id;
          const scrRes = await apiRequest<any>(`/screenings/customer/${targetCustId}`);
          if (scrRes.success && scrRes.data?.history) {
            setScreeningHistory(scrRes.data.history);
          }
        } catch {
          // Non-blocking
        }
      } else {
        setErrorMessage(res.error?.message || 'Customer profile not found or access is restricted.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Error communicating with server.');
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  useEffect(() => {
    if (showEditModal) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showEditModal]);

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      const res = await apiRequest(`/customers/${customer.customerId || customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editFormData.fullName,
          age: Number(editFormData.age),
          contactNumber: editFormData.phone,
          preferredLanguage: editFormData.preferredLanguage,
          notes: editFormData.notes,
        }),
      });

      if (res.success) {
        setShowEditModal(false);
        fetchCustomerDetails();
      } else {
        alert(res.error?.message || 'Failed to update customer details.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating details.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading customer clinical profile...</p>
      </div>
    );
  }

  if (errorMessage || !customer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-healthcare space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-display font-bold text-navy-950">Profile Access Blocked</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {errorMessage || 'Unable to load customer profile.'}
          </p>
          <div className="pt-2">
            <Link
              to="/customers"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Customer Directory</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentWorkflow = customer.workflowStatus || customer.status;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      
      {/* Top Breadcrumb & ID Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-950 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customers</span>
        </Link>
        <div className="text-xs font-mono text-teal-800 font-semibold bg-teal-50 px-3 py-1 rounded-full border border-teal-200 shadow-xs">
          Patient Code: {customer.customerId || customer.customerCode}
        </div>
      </div>

      {newlyRegistered && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <strong>Registration Confirmed:</strong> New customer profile created successfully. You can now begin the voice-guided symptom interview or proceed to visual screening.
          </div>
        </div>
      )}

      {/* Customer Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-healthcare flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <ProfilePhotoUploader
            customerId={customer.customerId || customer.customerCode || (customer as any).id || id || ''}
            customerName={customer.fullName || customer.name}
            photoUrl={customer.profilePhotoUrl || (customer as any).profilePhoto?.url || undefined}
            canEdit={true}
            size="lg"
            onPhotoUpdated={(newUrl) => {
              setCustomer((prev) => (prev ? { ...prev, profilePhotoUrl: newUrl || undefined } : null));
            }}
          />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-navy-950">
                {customer.fullName || customer.name}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-slate-100 text-slate-700">
                {customer.gender === 'FEMALE' ? 'Female' : 'Male'}, {customer.age} yrs
              </span>
              <ClinicalStatusBadge status={currentWorkflow as any} />
            </div>

            <p className="text-xs text-slate-500">
              Registered at <strong>{customer.storeName || customer.storeId}</strong> on{' '}
              {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>

          <Link
            to={`/customers/${customer.customerId || customer.customerCode || id}/interview`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>
              {interviewRecord?.status === 'COMPLETED'
                ? 'Review Voice Interview'
                : interviewRecord?.status === 'IN_PROGRESS'
                ? 'Resume Voice Interview'
                : 'Start Voice Interview'}
            </span>
          </Link>

          <Link
            to={`/customers/${customer.customerId || customer.customerCode || id}/screening`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              {screeningHistory.length > 0 && screeningHistory[0].status === 'IN_PROGRESS'
                ? 'Resume Screening'
                : screeningHistory.length > 0
                ? 'New Screening'
                : 'Start Screening'}
            </span>
          </Link>
        </div>
      </div>

      {/* 2. PROGRESS / WORKFLOW STEPPER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-healthcare space-y-4">
        <h2 className="text-xs font-display font-bold text-navy-950 uppercase tracking-wider">
          Screening & Tele-Optometry Workflow Progress
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          
          {/* Step 1 */}
          <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Stage 01</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-semibold text-xs text-emerald-950">Registration & Consent</div>
            <div className="text-[10px] text-emerald-700">Completed</div>
          </div>

          {/* Step 2 */}
          <div className={`p-3.5 rounded-2xl border space-y-1 ${
            ['INTERVIEW_COMPLETED', 'SCREENING_IN_PROGRESS', 'SCREENING_COMPLETED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
              ? 'border-emerald-200 bg-emerald-50/60'
              : currentWorkflow === 'INTERVIEW_IN_PROGRESS'
              ? 'border-sky-300 bg-sky-50'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">Stage 02</span>
              {['INTERVIEW_COMPLETED', 'SCREENING_IN_PROGRESS', 'SCREENING_COMPLETED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow) ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Mic className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="font-semibold text-xs text-navy-950">Voice Interview</div>
            <div className="text-[10px] text-slate-500">
              {['INTERVIEW_COMPLETED', 'SCREENING_IN_PROGRESS', 'SCREENING_COMPLETED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
                ? 'Completed'
                : 'Ready to Start'}
            </div>
          </div>

          {/* Step 3 */}
          <div className={`p-3.5 rounded-2xl border space-y-1 ${
            ['SCREENING_COMPLETED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
              ? 'border-emerald-200 bg-emerald-50/60'
              : currentWorkflow === 'SCREENING_IN_PROGRESS'
              ? 'border-sky-300 bg-sky-50'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">Stage 03</span>
              {['SCREENING_COMPLETED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow) ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="font-semibold text-xs text-navy-950">Visual Screening</div>
            <div className="text-[10px] text-slate-500">
              {['SCREENING_COMPLETED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
                ? 'Observations Logged'
                : 'Pending Test'}
            </div>
          </div>

          {/* Step 4 */}
          <div className={`p-3.5 rounded-2xl border space-y-1 ${
            ['PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
              ? 'border-emerald-200 bg-emerald-50/60'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">Stage 04</span>
              {['PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow) ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Camera className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="font-semibold text-xs text-navy-950">Eye Photography</div>
            <div className="text-[10px] text-slate-500">
              {['PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
                ? 'Encrypted & Stored'
                : 'Available for Upload'}
            </div>
          </div>

          {/* Step 5 */}
          <div className={`p-3.5 rounded-2xl border space-y-1 ${
            ['REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow)
              ? 'border-emerald-200 bg-emerald-50/60'
              : currentWorkflow === 'PENDING_REVIEW'
              ? 'border-amber-300 bg-amber-50/60'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">Stage 05</span>
              {['REVIEWED', 'REFERRAL_REQUIRED'].includes(currentWorkflow) ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <FileCheck className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="font-semibold text-xs text-navy-950">Optometrist Review</div>
            <div className="text-[10px] text-slate-500">
              {currentWorkflow === 'REVIEWED'
                ? 'Signed & Dispatched'
                : currentWorkflow === 'REFERRAL_REQUIRED'
                ? 'Referral Issued'
                : currentWorkflow === 'PENDING_REVIEW'
                ? 'Queued for Review'
                : 'Awaiting Screening'}
            </div>
          </div>

        </div>
      </div>

      {/* 3. DEMOGRAPHICS & CLINICAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Demographics Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-healthcare space-y-4">
          <h2 className="text-xs font-display font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-teal-600" />
            <span>Demographic Data</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Customer ID</span>
              <span className="font-mono font-bold text-teal-800 text-sm bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                {customer.customerId || customer.customerCode}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Full Name</span>
              <span className="font-semibold text-navy-950 text-sm">{customer.fullName || customer.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Age</span>
                <span className="font-medium text-slate-800">{customer.age} years</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Gender</span>
                <span className="font-medium text-slate-800">{customer.gender}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Contact Number</span>
              <span className="font-medium text-slate-800">
                {customer.contactNumber || customer.phone || 'Not provided'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Preferred Spoken Language</span>
              <span className="font-medium text-slate-800">
                {customer.preferredLanguage === 'hi' ? 'Hindi (हिंदी)' : 'English'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Optical Store Center</span>
              <span className="font-medium text-slate-800">
                {customer.storeName || customer.storeId}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Consent Status</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Affirmative Informed Consent Recorded
              </span>
            </div>

            {customer.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[11px]">Operator Intake Notes</span>
                <p className="text-slate-700 italic mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Clinical Cards */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Voice Interview Record Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-healthcare space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-navy-950 text-sm">Voice-First Intake Interview</h3>
                  <span className="text-[11px] text-slate-400">
                    {interviewRecord?.language === 'hi' ? 'Conducted in Hindi (हिंदी)' : 'Conducted in English'}
                  </span>
                </div>
              </div>

              {interviewRecord?.status === 'COMPLETED' ? (
                <span className="px-3 py-1 rounded-full text-xs bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Completed
                </span>
              ) : interviewRecord?.status === 'IN_PROGRESS' ? (
                <span className="px-3 py-1 rounded-full text-xs bg-sky-50 text-sky-800 font-semibold border border-sky-200">
                  In Progress
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-600 font-medium">
                  Ready to Start
                </span>
              )}
            </div>

            {interviewRecord?.status === 'COMPLETED' ? (
              <div className="space-y-3 pt-2">
                {interviewRecord.hasRedFlags && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] uppercase tracking-wider text-rose-700">Urgent Symptoms Reported:</strong>
                      <span>{interviewRecord.redFlagReason || 'Customer reported acute warning symptoms requiring prompt medical assessment.'}</span>
                    </div>
                  </div>
                )}

                {interviewRecord.summary?.aiSummarySnippet && (
                  <div className="p-4 bg-teal-50/60 border border-teal-100 rounded-2xl text-xs text-navy-950 leading-relaxed space-y-1">
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                      {interviewRecord.summary.isAiGenerated ? 'AI Clinical Summary (Google Gemini)' : 'Structured Intake Summary'}
                    </span>
                    <p>{interviewRecord.summary.aiSummarySnippet}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-medium">Distance Vision</span>
                    <span className="font-semibold text-slate-800">
                      {interviewRecord.summary?.distanceVisionConcerns?.length > 0
                        ? interviewRecord.summary.distanceVisionConcerns[0]
                        : 'No distance difficulty'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-medium">Near Vision</span>
                    <span className="font-semibold text-slate-800">
                      {interviewRecord.summary?.nearVisionConcerns?.length > 0
                        ? interviewRecord.summary.nearVisionConcerns[0]
                        : 'No near difficulty'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-medium">Glasses History</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {interviewRecord.summary?.spectacleHistory || 'Not specified'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-medium">Duration</span>
                    <span className="font-semibold text-slate-800">
                      {interviewRecord.summary?.duration || 'Not specified'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Recorded {interviewRecord.answers?.length || 0} questions
                  </span>
                  <Link
                    to={`/customers/${customer.customerId || customer.customerCode || id}/interview`}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline inline-flex items-center gap-1"
                  >
                    <span>View / Edit Interview</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Conduct a voice-first Hindi or English intake interview. Includes adaptive questions for reading, distance blur, and urgent red-flag symptom interception.
                </p>
                <Link
                  to={`/customers/${customer.customerId || customer.customerCode || id}/interview`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{interviewRecord?.status === 'IN_PROGRESS' ? 'Resume Voice Interview' : 'Start Voice Interview'}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Preliminary Vision Screening (Module 4) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-healthcare space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-navy-950 text-sm">Visual Acuity & Amsler Observations</h3>
                  <span className="text-[10px] text-teal-700 font-semibold uppercase tracking-wider">Tumbling-E Protocol (Module 4)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {screeningHistory.length > 0 ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-xs">
                    {screeningHistory[0].testValidity || 'PRELIMINARY'}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                    Pending Test
                  </span>
                )}
              </div>
            </div>

            {screeningHistory.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  const latest = screeningHistory[0];
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">OD (Right Eye)</span>
                          <span className="font-bold text-teal-700 text-sm">
                            {latest.visualAcuity?.rightEye?.preliminaryScore || latest.visualAcuity?.rightEyeEstimatedScore || 'Pending'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">OS (Left Eye)</span>
                          <span className="font-bold text-teal-700 text-sm">
                            {latest.visualAcuity?.leftEye?.preliminaryScore || latest.visualAcuity?.leftEyeEstimatedScore || 'Pending'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Amsler Grid</span>
                          <span className="font-semibold text-slate-800">
                            {latest.amslerAssessment?.performed
                              ? (latest.amslerAssessment.rightEye?.status === 'WAVY_LINES' || latest.amslerAssessment.leftEye?.status === 'WAVY_LINES'
                                ? '⚠️ Distortion Reported'
                                : 'Normal (Straight Lines)')
                              : 'Not Performed'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] text-slate-400">
                          Screening {latest.screeningId} • {new Date(latest.completedAt || latest.createdAt).toLocaleDateString()}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/screenings/${latest.screeningId}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 inline-flex items-center gap-1 shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-400" />
                            <span>Print PDF</span>
                          </a>

                          <Link
                            to={`/screenings/${latest.screeningId}/review`}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-900 border border-teal-200 bg-teal-50 px-3 py-1.5 rounded-xl inline-flex items-center gap-1 shadow-xs"
                          >
                            <span>View Full Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Perform visual acuity testing using randomized Tumbling-E optotypes with separate-eye occlusion, plus optional Amsler grid evaluation.
                </p>
                <Link
                  to={`/customers/${customer.customerId || customer.customerCode || id}/screening`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Start Visual Screening</span>
                </Link>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 4. CLINICAL EYE PHOTOGRAPHS & OBSERVATIONS (MILESTONE 4.1) */}
      <div className="space-y-4">
        <EyeImageGallery
          customerId={customer.customerId || customer.customerCode || (customer as any).id || id || ''}
          customerCode={customer.customerCode || customer.customerId || ''}
          customerName={customer.fullName || customer.name}
          canUpload={true}
          canReview={user?.role === 'OPTOMETRIST' || user?.role === 'ADMIN'}
        />
      </div>

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-healthcare-lg overflow-hidden my-8">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-navy-950 text-base">Edit Customer Demographic Record</h3>
                <p className="text-xs text-slate-500">ID: {customer.customerId || customer.customerCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Age (Years) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="125"
                    required
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={editFormData.preferredLanguage}
                    onChange={(e) => setEditFormData({ ...editFormData, preferredLanguage: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium"
                  >
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intake Notes
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Save Profile Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
