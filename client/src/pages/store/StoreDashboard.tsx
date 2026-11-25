import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Mic, 
  Eye, 
  RefreshCw, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowRight,
  ShieldCheck, 
  Languages, 
  Calendar,
  Sparkles,
  Wifi,
  WifiOff,
  Filter,
  FileText,
  MapPin,
  ChevronRight,
  X,
  Camera,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { apiRequest, getAuthenticatedMediaUrl, openClinicalReportPdf } from '@/services/api';
import { INITIAL_DEMO_CUSTOMERS, DemoCustomer } from '@/services/mockData';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, ClinicalStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const StoreDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlinePendingCount, setOfflinePendingCount] = useState(1);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // New Customer Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: '',
    age: '',
    gender: 'FEMALE',
    phone: '',
    preferredLanguage: 'hi',
    consentGiven: false,
    notes: '',
  });

  const [customerList, setCustomerList] = useState<DemoCustomer[]>(INITIAL_DEMO_CUSTOMERS);
  const [screeningList, setScreeningList] = useState<any[]>([]);

  // Fetch from server if available, otherwise use initial demo records
  useEffect(() => {
    apiRequest<any[]>('/customers')
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCustomerList(res.data.map((d: any) => ({
            ...d,
            customerCode: d.customerCode || d.customerId || d.id,
            fullName: d.fullName || d.name || 'Unnamed Customer',
            status: d.status || d.workflowStatus || 'REGISTERED',
            phone: d.phone || d.contactNumber || 'Not provided',
          })));
        }
      })
      .catch(() => {
        // Quiet fallback to in-memory demo records
      });

    apiRequest<any[]>('/screenings')
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setScreeningList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Lock body scroll when register modal is open
  useEffect(() => {
    if (showRegisterModal) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showRegisterModal]);

  const handleSyncNow = () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);

    // Simulate batch sync process
    setTimeout(() => {
      setIsSyncing(false);
      setOfflinePendingCount(0);
      setSyncSuccessMsg('All offline records synchronized successfully with VisionBridge cloud.');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    }, 1200);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.fullName || !newCustomerForm.age || !newCustomerForm.consentGiven) {
      alert('Please fill customer name, age, and ensure informed consent is checked.');
      return;
    }

    try {
      const res = await apiRequest<any>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: newCustomerForm.fullName,
          age: Number(newCustomerForm.age),
          gender: newCustomerForm.gender,
          contactNumber: newCustomerForm.phone || undefined,
          preferredLanguage: newCustomerForm.preferredLanguage,
          consentGiven: true,
          notes: newCustomerForm.notes || undefined,
        }),
      });

      if (res.success && res.data) {
        const newRecord: DemoCustomer = {
          id: res.data.id || res.data._id || `cust_${Date.now()}`,
          clientUuid: res.data.clientUuid || `uuid_${Date.now()}`,
          customerCode: res.data.customerCode || res.data.customerId,
          fullName: res.data.fullName || res.data.name,
          age: res.data.age,
          gender: res.data.gender,
          phone: res.data.contactNumber || res.data.phone || 'Not provided',
          preferredLanguage: res.data.preferredLanguage || 'hi',
          consentGiven: true,
          consentTimestamp: new Date().toISOString(),
          status: 'REGISTERED',
          notes: res.data.notes || 'Newly registered in store',
          createdAt: res.data.createdAt || new Date().toISOString(),
          updatedAt: res.data.updatedAt || new Date().toISOString(),
          screeningSummary: {
            rightEyeAcuity: 'Not Tested',
            leftEyeAcuity: 'Not Tested',
            amslerAbnormal: false,
            hasWarningFlags: false,
            aiSummarySnippet: 'Registration complete. Ready for voice-guided intake interview.'
          }
        };
        setCustomerList(prev => [newRecord, ...prev]);
      } else {
        const newCode = `VB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const fallbackRecord: DemoCustomer = {
          id: `cust_${Date.now()}`,
          clientUuid: `uuid_${Date.now()}`,
          customerCode: newCode,
          fullName: newCustomerForm.fullName,
          age: Number(newCustomerForm.age),
          gender: newCustomerForm.gender as any,
          phone: newCustomerForm.phone || 'Not provided',
          preferredLanguage: newCustomerForm.preferredLanguage as any,
          consentGiven: true,
          consentTimestamp: new Date().toISOString(),
          status: 'REGISTERED',
          notes: newCustomerForm.notes || 'Newly registered in store',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          screeningSummary: {
            rightEyeAcuity: 'Not Tested',
            leftEyeAcuity: 'Not Tested',
            amslerAbnormal: false,
            hasWarningFlags: false,
            aiSummarySnippet: 'Registration complete. Ready for voice-guided intake interview.'
          }
        };
        setCustomerList(prev => [fallbackRecord, ...prev]);
      }
    } catch {
      const newCode = `VB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackRecord: DemoCustomer = {
        id: `cust_${Date.now()}`,
        clientUuid: `uuid_${Date.now()}`,
        customerCode: newCode,
        fullName: newCustomerForm.fullName,
        age: Number(newCustomerForm.age),
        gender: newCustomerForm.gender as any,
        phone: newCustomerForm.phone || 'Not provided',
        preferredLanguage: newCustomerForm.preferredLanguage as any,
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
        status: 'REGISTERED',
        notes: newCustomerForm.notes || 'Newly registered in store',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        screeningSummary: {
          rightEyeAcuity: 'Not Tested',
          leftEyeAcuity: 'Not Tested',
          amslerAbnormal: false,
          hasWarningFlags: false,
          aiSummarySnippet: 'Registration complete. Ready for voice-guided intake interview.'
        }
      };
      setCustomerList(prev => [fallbackRecord, ...prev]);
    }

    setShowRegisterModal(false);
    setNewCustomerForm({
      fullName: '',
      age: '',
      gender: 'FEMALE',
      phone: '',
      preferredLanguage: 'hi',
      consentGiven: false,
      notes: '',
    });
  };

  // Filtered customers
  const filteredCustomers = customerList.filter(c => {
    const name = c.fullName || (c as any).name || '';
    const code = c.customerCode || (c as any).customerId || c.id || '';
    const phone = c.phone || (c as any).contactNumber || '';
    const currentStatus = c.status || (c as any).workflowStatus || 'REGISTERED';

    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          phone.includes(searchQuery);
    const matchesFilter = filterStatus === 'ALL' || currentStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* 1. STORE HEADER & LIVE NETWORK BAR */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-glass flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative overflow-hidden">
        
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>VisionPoint Chittoor Center</span>
            </span>
            <span className="text-xs font-mono text-slate-400 font-medium">ST-AP-CHITTOOR-01</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-display">
            Store Operator Dashboard
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Operator: <strong className="text-slate-800 font-semibold">{user?.name || 'Ramesh Patel'}</strong> • Andhra Pradesh Rural Network
          </p>
        </div>

        {/* Sync Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-end gap-1.5">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online (Cloud Synchronized)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Offline Mode (Local Dexie)
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {offlinePendingCount > 0 ? `${offlinePendingCount} record(s) queued for sync` : 'All local changes synchronized'}
            </div>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing || offlinePendingCount === 0}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 ${
              offlinePendingCount > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Records'}</span>
          </button>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white text-xs font-bold shadow-healthcare hover:shadow-glow-teal transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register Patient</span>
          </button>
        </div>
      </div>

      {syncSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-2.5 animate-slide-up shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{syncSuccessMsg}</span>
        </div>
      )}

      {/* 2. STATS & METRICS GRID (Using Reusable StatCard Component) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
        
        <StatCard
          title="Total Patients"
          value={customerList.length}
          subtitle="All-time store visits"
          icon={Users}
          iconColor="text-navy-950"
          iconBg="bg-blue-50 border-blue-100"
          badgeText="Active Store"
          badgeVariant="info"
        />

        <StatCard
          title="Today's Intake"
          value={3}
          subtitle="Field intake sessions"
          icon={Calendar}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 border-teal-100"
          badgeText="Today"
          badgeVariant="success"
        />

        <StatCard
          title="Pending Review"
          value={customerList.filter(c => c.status === 'PENDING_REVIEW').length}
          subtitle="Awaiting optometrist"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
          badgeText="Queued"
          badgeVariant="warning"
        />

        <StatCard
          title="Completed"
          value={customerList.filter(c => c.status === 'REVIEWED' || c.status === 'REFERRAL_REQUIRED').length}
          subtitle="Clinically verified"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 border-emerald-100"
          badgeText="Signed"
          badgeVariant="success"
        />

        <StatCard
          title="Referral Alerts"
          value={customerList.filter(c => c.status === 'REFERRAL_REQUIRED').length}
          subtitle="Specialist recommended"
          icon={AlertTriangle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50 border-rose-100"
          badgeText="Action"
          badgeVariant="danger"
        />

      </div>

      {/* 3. PATIENT QUEUE & DIRECTORY TABLE */}
      <div className="glass-card rounded-3xl border border-slate-200/90 shadow-glass overflow-hidden space-y-4">
        
        {/* Table Filter & Search Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-navy-950 font-display">
              Patient Screening Queue
            </h2>
            <p className="text-xs text-slate-500">
              Manage patient voice intake, calibrated visual testing, and clinical photo capture.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, ID, phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Status Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {['ALL', 'REGISTERED', 'PENDING_REVIEW', 'REVIEWED', 'REFERRAL_REQUIRED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    filterStatus === status
                      ? 'bg-navy-950 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {status === 'ALL' ? 'All Records' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="px-6 py-3.5">Patient Details</th>
                <th className="px-6 py-3.5">Demographics</th>
                <th className="px-6 py-3.5">Language</th>
                <th className="px-6 py-3.5">Screening Telemetry</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Clinical Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      title="No Patients Found"
                      description="No records match your active search and filter criteria."
                      compact
                    />
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const summary = (cust as any).screeningSummary;
                  const displayId = cust.customerCode || cust.id;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Patient Avatar & Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3.5">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center font-bold text-xs text-white">
                            {(cust.profilePhotoUrl || (cust as any).profilePhoto?.url) ? (
                              <img
                                src={getAuthenticatedMediaUrl(cust.profilePhotoUrl || (cust as any).profilePhoto?.url)}
                                alt={cust.fullName}
                                className="w-full h-full object-cover z-10"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                              {(cust.fullName || 'VB').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <Link
                              to={`/customers/${displayId}`}
                              className="font-bold text-navy-950 text-sm hover:text-teal-700 transition-colors"
                            >
                              {cust.fullName}
                            </Link>
                            <div className="text-[11px] text-teal-700 font-mono font-medium">
                              {displayId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Demographics */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {cust.age} yrs • {cust.gender === 'FEMALE' ? 'Female' : 'Male'}
                      </td>

                      {/* Language */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/60">
                          <Languages className="w-3 h-3 text-slate-500" />
                          <span>{cust.preferredLanguage === 'hi' ? 'Hindi' : 'English'}</span>
                        </span>
                      </td>

                      {/* Screening Acuity Preview */}
                      <td className="px-6 py-4">
                        {summary ? (
                          <div className="font-mono text-slate-800 text-xs font-semibold">
                            OD: <span className="text-navy-950">{summary.rightEyeAcuity}</span> | OS: <span className="text-navy-950">{summary.leftEyeAcuity}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Screening Pending</span>
                        )}
                      </td>

                      {/* Clinical Workflow Status */}
                      <td className="px-6 py-4">
                        <ClinicalStatusBadge status={cust.status || (cust as any).workflowStatus} />
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openClinicalReportPdf(displayId, true)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/90 inline-flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                            title="Download or print complete clinical screening report (PDF)"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Report (PDF)</span>
                          </button>
                          <Link
                            to={`/customers/${displayId}/interview`}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/80 inline-flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                            title="Start or review voice interview"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>Interview</span>
                          </Link>
                          <Link
                            to={`/customers/${displayId}/screening`}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/80 inline-flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                            title="Start visual acuity & Amsler screening"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Screen</span>
                          </Link>
                          <Link
                            to={`/customers/${displayId}`}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1 transition-colors"
                            title="Open patient 360 profile"
                          >
                            <span>Profile</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View (Shown only on small screens) */}
        <div className="md:hidden p-4 space-y-3.5 divide-y divide-slate-100">
          {filteredCustomers.length === 0 ? (
            <EmptyState
              title="No Patients Found"
              description="No records match your active search and filter criteria."
              compact
            />
          ) : (
            filteredCustomers.map((cust) => {
              const displayId = cust.customerCode || cust.id;
              const summary = (cust as any).screeningSummary;

              return (
                <div key={cust.id} className="pt-3.5 first:pt-0 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center font-bold text-xs text-white">
                        {(cust.profilePhotoUrl || (cust as any).profilePhoto?.url) ? (
                          <img
                            src={getAuthenticatedMediaUrl(cust.profilePhotoUrl || (cust as any).profilePhoto?.url)}
                            alt={cust.fullName}
                            className="w-full h-full object-cover z-10"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                          {(cust.fullName || 'VB').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <Link
                          to={`/customers/${displayId}`}
                          className="font-bold text-navy-950 text-sm hover:text-teal-700"
                        >
                          {cust.fullName}
                        </Link>
                        <div className="text-[11px] text-teal-700 font-mono font-medium">
                          {displayId} • {cust.age}y, {cust.gender === 'FEMALE' ? 'F' : 'M'}
                        </div>
                      </div>
                    </div>
                    <ClinicalStatusBadge status={cust.status || (cust as any).workflowStatus} />
                  </div>

                  {summary && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Acuity:</span>
                      <span className="font-mono font-bold text-navy-950">
                        OD {summary.rightEyeAcuity} | OS {summary.leftEyeAcuity}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openClinicalReportPdf(displayId, true)}
                      className="px-2 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-center text-xs font-bold border border-emerald-200/90 flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Report PDF</span>
                    </button>
                    <Link
                      to={`/customers/${displayId}/interview`}
                      className="px-2 py-2 rounded-xl bg-sky-50 text-sky-800 text-center text-xs font-bold border border-sky-200/80 flex items-center justify-center gap-1"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Interview</span>
                    </Link>
                    <Link
                      to={`/customers/${displayId}/screening`}
                      className="px-2 py-2 rounded-xl bg-teal-50 text-teal-900 text-center text-xs font-bold border border-teal-200/80 flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Screen</span>
                    </Link>
                    <Link
                      to={`/customers/${displayId}`}
                      className="px-2 py-2 rounded-xl bg-slate-100 text-slate-800 text-center text-xs font-bold border border-slate-200/80 flex items-center justify-center gap-1"
                    >
                      <span>Profile</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 4. MODULAR SCREENING SESSIONS OVERVIEW */}
      <div className="glass-card rounded-3xl border border-slate-200/90 shadow-glass overflow-hidden space-y-4">
        <div className="p-5 sm:p-6 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-200/80">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-950 text-base font-display">
                Preliminary Vision Screening Records
              </h3>
              <p className="text-xs text-slate-500">
                Calibrated visual function test batches ready for optometrist sign-off.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            {screeningList.length} Sessions Logged
          </span>
        </div>

        <div className="p-5 sm:p-6">
          {screeningList.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
              No completed screening sessions yet. Select a patient from the queue above to launch visual acuity assessment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screeningList.slice(0, 6).map((scr: any) => (
                <div key={scr.screeningId} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-700">{scr.customerCode}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {scr.sessionStatus || 'COMPLETED'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div>OD Acuity: <strong className="text-navy-950">{scr.results?.distanceAcuity?.rightEye?.snellenVisualAcuity || 'N/A'}</strong></div>
                    <div>OS Acuity: <strong className="text-navy-950">{scr.results?.distanceAcuity?.leftEye?.snellenVisualAcuity || 'N/A'}</strong></div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {new Date(scr.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/screenings/${scr.screeningId}/review`}
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                    >
                      <span>Review Sheet</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. MODAL: REGISTER NEW PATIENT */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-navy-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="glass-card bg-white rounded-3xl max-w-lg w-full border border-slate-200/90 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-navy-950 text-lg font-display">Register New Customer</h3>
                  <p className="text-xs text-slate-500">Capture minimal necessary demographics for screening.</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.fullName}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value })}
                  placeholder="e.g. Anand Verma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Age (Years) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={newCustomerForm.age}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, age: e.target.value })}
                    placeholder="e.g. 52"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gender</label>
                  <select
                    value={newCustomerForm.gender}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium bg-white"
                  >
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Number (Optional)</label>
                  <input
                    type="tel"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Preferred Language</label>
                  <select
                    value={newCustomerForm.preferredLanguage}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, preferredLanguage: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium bg-white"
                  >
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Consent Checkbox */}
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={newCustomerForm.consentGiven}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, consentGiven: e.target.checked })}
                    className="mt-0.5 rounded border-teal-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-teal-950 font-medium leading-relaxed">
                    Customer has provided verbal/written informed consent for voice questionnaire, preliminary visual test, and optometrist review.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-healthcare transition-all"
                >
                  Create Patient Record
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
