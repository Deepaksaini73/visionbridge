import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Store, 
  UserPlus, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  RefreshCw, 
  Mail, 
  Phone, 
  Activity, 
  Lock, 
  MapPin,
  Building2,
  ChevronRight,
  Shield,
  Search,
  ExternalLink,
  Check,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/services/api';
import { UserProfile, StoreEntity, UserRole } from '@shared/types';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';

export const DEFAULT_STORES: StoreEntity[] = [
  {
    id: 'store_01',
    code: 'ST-AP-CHITTOOR-01',
    name: 'VisionPoint Chittoor Center',
    location: {
      address: 'Shop 14, Main Bazaar, Near Old Bus Stand',
      city: 'Chittoor',
      state: 'Andhra Pradesh',
      pincode: '517001',
    },
    contactNumber: '+91 98765 43210',
    email: 'chittoor@visionpoint.org',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'store_02',
    code: 'ST-AP-MADANAPALLE-02',
    name: 'VisionPoint Madanapalle Center',
    location: {
      address: '22 Market Road, Opp. Municipal Hospital',
      city: 'Madanapalle',
      state: 'Andhra Pradesh',
      pincode: '517325',
    },
    contactNumber: '+91 98765 99887',
    email: 'madanapalle@visionpoint.org',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'store_03',
    code: 'ST-AP-TIRUPATI-03',
    name: 'VisionPoint Tirupati Hub',
    location: {
      address: '407 Alipiri Road',
      city: 'Tirupati',
      state: 'Andhra Pradesh',
      pincode: '517501',
    },
    contactNumber: '+91 98440 22334',
    email: 'tirupati@visionpoint.org',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'USERS' | 'STORES'>('USERS');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [storesList, setStoresList] = useState<StoreEntity[]>(DEFAULT_STORES);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'OPTOMETRIST' as UserRole,
    storeId: 'ST-AP-CHITTOOR-01',
    storeName: 'VisionPoint Chittoor Center',
    licenseNumber: '',
    phone: '',
  });

  // New Store Modal
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [newStoreForm, setNewStoreForm] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: 'Andhra Pradesh',
    pincode: '',
    contactNumber: '',
    email: '',
  });

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Lock body scroll when any admin modal is open
  useEffect(() => {
    if (showUserModal || showStoreModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showUserModal, showStoreModal]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, storesRes] = await Promise.all([
        apiRequest<UserProfile[]>('/users'),
        apiRequest<StoreEntity[]>('/stores'),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsersList(usersRes.data);
      }
      if (storesRes.success && storesRes.data) {
        setStoresList(storesRes.data);
      }
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    const newStatus = !targetUser.isActive;
    try {
      const res = await apiRequest(`/users/${targetUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (res.success) {
        setActionSuccessMsg(`User ${targetUser.name} is now ${newStatus ? 'ACTIVATED' : 'DEACTIVATED'}.`);
        fetchData();
        setTimeout(() => setActionSuccessMsg(null), 3000);
      } else {
        alert(res.error?.message || 'Failed to update user status.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(newUserForm),
      });

      if (res.success) {
        setShowUserModal(false);
        setActionSuccessMsg(`New user account provisioned successfully for ${newUserForm.name}.`);
        setNewUserForm({
          name: '',
          email: '',
          password: '',
          role: 'OPTOMETRIST',
          storeId: '',
          storeName: '',
          licenseNumber: '',
          phone: '',
        });
        fetchData();
        setTimeout(() => setActionSuccessMsg(null), 3000);
      } else {
        alert(res.error?.message || 'Failed to create user account.');
      }
    } catch (err: any) {
      alert(err.message || 'Error provisioning account.');
    }
  };

  const handleCreateStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/stores', {
        method: 'POST',
        body: JSON.stringify({
          code: newStoreForm.code,
          name: newStoreForm.name,
          location: {
            address: newStoreForm.address,
            city: newStoreForm.city,
            state: newStoreForm.state,
            pincode: newStoreForm.pincode,
          },
          contactNumber: newStoreForm.contactNumber,
          email: newStoreForm.email,
        }),
      });

      if (res.success) {
        setShowStoreModal(false);
        setActionSuccessMsg(`Optical store center registered successfully (${newStoreForm.code}).`);
        setNewStoreForm({
          code: '',
          name: '',
          address: '',
          city: '',
          state: 'Andhra Pradesh',
          pincode: '',
          contactNumber: '',
          email: '',
        });
        fetchData();
        setTimeout(() => setActionSuccessMsg(null), 3000);
      } else {
        alert(res.error?.message || 'Failed to register store center.');
      }
    } catch (err: any) {
      alert(err.message || 'Error registering store.');
    }
  };

  const filteredUsers = usersList.filter(u => 
    !searchQuery.trim() ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStores = storesList.filter(s =>
    !searchQuery.trim() ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* 1. ADMIN HEADER (Unified Glassmorphic Design) */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-glass flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative overflow-hidden">
        
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-28 w-48 h-48 bg-blue-200/15 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Platform Administration & Governance</span>
            </span>
            <span className="text-xs font-mono text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Multi-Tenant Store Isolation: Enforced
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-display">
            VisionBridge Platform Console
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Logged in as Administrator: <strong className="text-slate-800 font-semibold">{user?.name || 'Dr. Vikram Malhotra'}</strong> ({user?.email || 'admin@visionbridge.org'})
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
            title="Refresh system data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowStoreModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
          >
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>+ Add Optical Center</span>
          </button>

          <button
            onClick={() => setShowUserModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white text-xs font-bold shadow-healthcare hover:shadow-glow-teal transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Provision User</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-2xl flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Authorized Accounts"
          value={usersList.length}
          subtitle={`${usersList.filter(u => u.role === 'OPTOMETRIST').length} Optometrists • ${usersList.filter(u => u.role === 'STORE_OPERATOR').length} Operators`}
          icon={<Users className="w-5 h-5" />}
          color="navy"
        />

        <StatCard
          title="Partner Optical Centers"
          value={storesList.length}
          subtitle="Chittoor, Madanapalle & Tirupati"
          icon={<Store className="w-5 h-5" />}
          color="teal"
          badge={{ text: 'Operational', color: 'teal' }}
        />

        <StatCard
          title="Store Data Isolation"
          value="Enforced"
          subtitle="Cross-store customer data strictly isolated"
          icon={<ShieldCheck className="w-5 h-5" />}
          color="emerald"
          badge={{ text: 'Active', color: 'emerald' }}
        />

        <StatCard
          title="Audit Logging"
          value="100% Monitored"
          subtitle="Auth tokens, consent & clinical actions"
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* 3. TABS: USERS vs STORES */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-healthcare overflow-hidden">
        
        {/* Tab Headers & Search */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-semibold w-full sm:w-fit overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('USERS')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'USERS'
                  ? 'bg-white text-navy-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>System Users & Roles ({usersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('STORES')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'STORES'
                  ? 'bg-white text-navy-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-4 h-4 text-teal-600" />
              <span>Optical Store Centers ({storesList.length})</span>
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'USERS' ? 'users by name/email/role...' : 'stores by name/code/city...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
        </div>

        {/* Tab 1: Users Table & Cards */}
        {activeTab === 'USERS' && (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Name & Email</th>
                    <th className="px-6 py-3.5">Assigned Role</th>
                    <th className="px-6 py-3.5">Store / Clinical Affiliation</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-navy-900 to-teal-800 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-navy-950 text-sm">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.role === 'ADMIN' && (
                          <span className="px-2.5 py-1 rounded-full bg-navy-950 text-white font-bold text-[10px] shadow-2xs">
                            Administrator
                          </span>
                        )}
                        {u.role === 'OPTOMETRIST' && (
                          <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200 font-bold text-[10px] shadow-2xs">
                            Optometrist Reviewer
                          </span>
                        )}
                        {u.role === 'STORE_OPERATOR' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[10px] shadow-2xs">
                            Store Operator
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {u.storeName ? (
                          <span>{u.storeName} <span className="font-mono text-slate-400 text-[11px]">({u.storeId})</span></span>
                        ) : u.licenseNumber ? (
                          <span className="font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-bold">Lic: {u.licenseNumber}</span>
                        ) : (
                          <span className="text-slate-400 italic">System-wide Governance</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.isActive !== false ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-700 font-bold text-[11px] bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all shadow-2xs active:scale-95 ${
                              u.isActive !== false
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-navy-900 text-white font-bold flex items-center justify-center text-xs">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-navy-950 text-sm">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </div>
                    </div>
                    {u.role === 'ADMIN' && (
                      <span className="px-2 py-0.5 rounded-md bg-navy-950 text-white text-[10px] font-bold">Admin</span>
                    )}
                    {u.role === 'OPTOMETRIST' && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold">Optometrist</span>
                    )}
                    {u.role === 'STORE_OPERATOR' && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">Operator</span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Affiliation:</span>
                    {u.storeName || u.licenseNumber || 'System-wide Access'}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[11px] font-bold flex items-center gap-1 ${u.isActive !== false ? 'text-emerald-700' : 'text-rose-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {u.isActive !== false ? 'Active Account' : 'Deactivated'}
                    </span>
                    {u.id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u)}
                        className="text-xs font-semibold px-3 py-1 rounded-xl border border-slate-200 text-slate-700 bg-white shadow-2xs"
                      >
                        {u.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Stores Table & Cards */}
        {activeTab === 'STORES' && (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Store Code & Name</th>
                    <th className="px-6 py-3.5">Location & District</th>
                    <th className="px-6 py-3.5">Contact</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStores.map((st) => (
                    <tr key={st.id || st.code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-navy-950 text-sm">{st.name}</div>
                        <div className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded w-fit mt-0.5 border border-teal-200">
                          {st.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div>{st.location.address}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {st.location.city}, {st.location.state} - {st.location.pincode}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="font-medium">{st.contactNumber || 'Not listed'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{st.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Operational
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredStores.map((st) => (
                <div key={st.id || st.code} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-navy-950 text-sm">{st.name}</div>
                      <div className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 w-fit mt-0.5">{st.code}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      Operational
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div>{st.location.address}, {st.location.city}</div>
                    <div className="text-[11px] text-slate-400">
                      Phone: {st.contactNumber || 'N/A'} • {st.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: Create User (Safe z-[100] Layer) */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-navy-950/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-slide-up">
            <div className="p-5 sm:p-6 border-b border-slate-200/90 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-display font-extrabold text-navy-950 text-lg">Provision New User Account</h3>
                <p className="text-xs text-slate-500">Create optometrist reviewer, store operator, or admin account</p>
              </div>
              <button 
                onClick={() => setShowUserModal(false)} 
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-navy-950 flex items-center justify-center text-sm font-bold transition-colors"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Nair"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="priya@visionbridge.org"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 8 characters"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  System Role *
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-semibold text-slate-800 bg-white"
                >
                  <option value="OPTOMETRIST">Optometrist (Clinical Reviewer)</option>
                  <option value="STORE_OPERATOR">Store Operator (Field Screener)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {newUserForm.role === 'OPTOMETRIST' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optometrist Clinical License Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OPT-IN-2024-9921"
                    value={newUserForm.licenseNumber}
                    onChange={(e) => setNewUserForm({ ...newUserForm, licenseNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              )}

              {/* Center Location Selection */}
              {(newUserForm.role === 'STORE_OPERATOR' || newUserForm.role === 'OPTOMETRIST') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {newUserForm.role === 'STORE_OPERATOR'
                      ? 'Assign to Optical Store Center *'
                      : 'Assigned Optical Center / Practice Hub (Optional)'}
                  </label>
                  <select
                    value={newUserForm.storeId}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const st = storesList.find(s => s.code === selectedVal);
                      setNewUserForm({
                        ...newUserForm,
                        storeId: selectedVal,
                        storeName: st ? st.name : (selectedVal === 'ALL' ? 'Tele-Review Network (All Centers)' : ''),
                      });
                    }}
                    required={newUserForm.role === 'STORE_OPERATOR'}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium text-slate-800 bg-white"
                  >
                    <option value="">
                      {newUserForm.role === 'STORE_OPERATOR' 
                        ? '-- Choose Optical Center --' 
                        : '-- Tele-Review Network (All Centers / Remote) --'}
                    </option>
                    {storesList.map(s => (
                      <option key={s.code || s.id} value={s.code}>
                        {s.name} ({s.code}) - {s.location?.city || 'AP'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {newUserForm.role === 'STORE_OPERATOR'
                      ? 'Operator will be strictly isolated to this store.'
                      : 'Select a primary optical hub or leave as network-wide tele-reviewer.'}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-healthcare hover:shadow-glow-teal transition-all active:scale-95"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Store (Safe z-[100] Layer) */}
      {showStoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-navy-950/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-slide-up">
            <div className="p-5 sm:p-6 border-b border-slate-200/90 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-display font-extrabold text-navy-950 text-lg">Register Optical Center</h3>
                <p className="text-xs text-slate-500">Add local partner store or rural outreach center</p>
              </div>
              <button 
                onClick={() => setShowStoreModal(false)} 
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-navy-950 flex items-center justify-center text-sm font-bold transition-colors"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStoreSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ST-AP-KADAPA-04"
                    value={newStoreForm.code}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-teal-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Center Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VisionPoint Kadapa"
                    value={newStoreForm.name}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 104 Gandhi Road, Near Clock Tower"
                  value={newStoreForm.address}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Kadapa"
                    value={newStoreForm.city}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, city: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoreForm.state}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, state: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="516001"
                    value={newStoreForm.pincode}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, pincode: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={newStoreForm.contactNumber}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, contactNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Center Email
                  </label>
                  <input
                    type="email"
                    placeholder="kadapa@visionpoint.org"
                    value={newStoreForm.email}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-healthcare hover:shadow-glow-teal transition-all active:scale-95"
                >
                  Register Store Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
