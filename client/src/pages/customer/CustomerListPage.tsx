import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Search, 
  Calendar, 
  Languages, 
  ArrowUpRight, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X,
  Store,
  ShieldAlert,
  Phone,
  Eye,
  Camera
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, getAuthenticatedMediaUrl } from '@/services/api';
import { CustomerDemographics } from '@shared/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { ClinicalStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const CustomerListPage: React.FC = () => {
  const { user } = useAuth();
  
  const [customers, setCustomers] = useState<CustomerDemographics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Edit Modal State
  const [editingCustomer, setEditingCustomer] = useState<CustomerDemographics | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    age: '',
    phone: '',
    preferredLanguage: 'hi' as 'hi' | 'en',
    notes: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const queryParams = new URLSearchParams({
      page: String(currentPage),
      limit: '10',
    });

    if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());
    if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
    if (fromDate) queryParams.set('fromDate', fromDate);
    if (toDate) queryParams.set('toDate', toDate);

    try {
      const res = await apiRequest<CustomerDemographics[]>(`/customers?${queryParams.toString()}`);
      setIsLoading(false);

      if (res.success && res.data) {
        setCustomers(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalCount(res.meta.total || res.data.length);
        }
      } else {
        setErrorMessage(res.error?.message || 'Failed to load customer list.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Error communicating with server.');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, statusFilter, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
  };

  const handleOpenEdit = (cust: CustomerDemographics) => {
    setEditingCustomer(cust);
    setEditFormData({
      fullName: cust.fullName || cust.name,
      age: String(cust.age),
      phone: cust.contactNumber || cust.phone || '',
      preferredLanguage: cust.preferredLanguage || 'hi',
      notes: cust.notes || '',
    });
    setUpdateMessage(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const res = await apiRequest(`/customers/${editingCustomer.customerId || editingCustomer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editFormData.fullName,
          age: Number(editFormData.age),
          contactNumber: editFormData.phone,
          preferredLanguage: editFormData.preferredLanguage,
          notes: editFormData.notes,
        }),
      });

      setIsUpdating(false);

      if (res.success) {
        setUpdateMessage('Customer record updated successfully.');
        setTimeout(() => {
          setEditingCustomer(null);
          fetchCustomers();
        }, 1000);
      } else {
        setUpdateMessage(`Error: ${res.error?.message || 'Failed to update record'}`);
      }
    } catch (err: any) {
      setIsUpdating(false);
      setUpdateMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      
      {/* Page Header */}
      <PageHeader
        title="Customer Case Management"
        subtitle={`Search, filter, view screening statuses, and review patient intake profiles${user?.storeName ? ` • Scoped to ${user.storeName}` : ''}.`}
        breadcrumbs={[
          { label: 'Store Portal', href: '/store' },
          { label: 'Customer Directory' }
        ]}
        actions={
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Customer</span>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-healthcare space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Search text */}
          <div className="md:col-span-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Workflow Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium text-slate-700 bg-white"
            >
              <option value="ALL">All Screening & Review Statuses</option>
              <option value="REGISTERED">Registered (Intake Complete)</option>
              <option value="INTERVIEW_COMPLETED">Voice Interview Completed</option>
              <option value="SCREENING_COMPLETED">Vision Screening Completed</option>
              <option value="PENDING_REVIEW">Pending Optometrist Review</option>
              <option value="REVIEWED">Reviewed by Clinician</option>
              <option value="REFERRAL_REQUIRED">Referral Recommended</option>
              <option value="RETEST_REQUESTED">Retest Requested</option>
            </select>
          </div>

          {/* Date range from */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white"
            />
          </div>

          {/* Date range to */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              Filter
            </button>
          </div>

        </form>

        {/* Clear filter shortcut */}
        {(searchQuery || statusFilter !== 'ALL' || fromDate || toDate) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
            <span>
              Filtered results: <strong className="text-navy-950 font-bold">{totalCount}</strong> matching customers
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setFromDate('');
                setToDate('');
                setCurrentPage(1);
              }}
              className="text-teal-700 font-semibold hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset all filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Customer List Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-healthcare overflow-hidden">
        
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading customer records from store database...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-8 text-center text-xs text-rose-700 bg-rose-50/50">
            {errorMessage}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-slate-400" />}
            title="No customers found"
            description="No customer records match your filter criteria or this store does not have registered customers yet."
            action={{
              label: 'Register First Customer',
              onClick: () => window.location.href = '/customers/new',
            }}
          />
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Customer ID & Name</th>
                    <th className="px-6 py-3.5">Age / Gender</th>
                    <th className="px-6 py-3.5">Language</th>
                    <th className="px-6 py-3.5">Registered On</th>
                    <th className="px-6 py-3.5">Workflow / Review Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => {
                    const status = c.workflowStatus || c.status;
                    const displayId = c.customerId || c.customerCode || c.id;

                    return (
                      <tr key={c.id || displayId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3.5">
                            <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 shrink-0 shadow-xs bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center font-bold text-xs text-white">
                              {(c.profilePhotoUrl || (c as any).profilePhoto?.url) ? (
                                <img
                                  src={getAuthenticatedMediaUrl(c.profilePhotoUrl || (c as any).profilePhoto?.url)}
                                  alt={c.fullName || c.name}
                                  className="w-full h-full object-cover z-10"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                {(c.fullName || c.name || 'VB').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-display font-bold text-navy-950 text-sm">
                                {c.fullName || c.name}
                              </div>
                              <div className="text-[11px] text-teal-700 font-mono font-semibold">
                                {displayId}
                              </div>
                              {c.contactNumber && (
                                <div className="text-[10px] text-slate-400">{c.contactNumber}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {c.age} yrs • {c.gender === 'FEMALE' ? 'Female' : 'Male'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            <Languages className="w-3 h-3 text-slate-400" />
                            {c.preferredLanguage === 'hi' ? 'Hindi (हिंदी)' : 'English'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <ClinicalStatusBadge status={status as any} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit customer details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              to={`/customers/${displayId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors shadow-xs"
                            >
                              <span>Profile</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {customers.map((c) => {
                const status = c.workflowStatus || c.status;
                const displayId = c.customerId || c.customerCode || c.id;

                return (
                  <div key={c.id || displayId} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 bg-teal-50 flex items-center justify-center font-bold text-xs text-teal-800">
                          <span>{(c.fullName || c.name || 'VB').slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-display font-bold text-navy-950 text-sm">
                            {c.fullName || c.name}
                          </div>
                          <div className="text-[11px] text-teal-700 font-mono font-medium">
                            {displayId}
                          </div>
                        </div>
                      </div>
                      <ClinicalStatusBadge status={status as any} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px]">Demographics: </span>
                        <span>{c.age} yrs, {c.gender === 'FEMALE' ? 'Female' : 'Male'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Language: </span>
                        <span>{c.preferredLanguage === 'hi' ? 'Hindi' : 'English'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <Link
                        to={`/customers/${displayId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold shadow-xs"
                      >
                        <span>Open Profile</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (Total {totalCount} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-healthcare-lg overflow-hidden my-8">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-navy-950 text-base">Edit Customer Record</h3>
                <p className="text-xs text-slate-500">ID: {editingCustomer.customerId || editingCustomer.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {updateMessage && (
              <div className="p-3.5 bg-teal-50 border-b border-teal-200 text-teal-800 text-xs font-medium">
                {updateMessage}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Full Name *
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
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
