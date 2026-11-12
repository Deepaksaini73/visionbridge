import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  UserPlus, 
  User, 
  Calendar, 
  Phone, 
  Languages, 
  Store, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  FileText
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/services/api';
import { offlineDb } from '@/offline/db';
import { PageHeader } from '@/components/ui/PageHeader';

export const CustomerRegisterPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [ageMode, setAgeMode] = useState<'AGE' | 'DOB'>('AGE');
  const [age, setAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'>('FEMALE');
  const [phone, setPhone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'hi' | 'en'>('hi');
  const [notes, setNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto calculate age if date of birth changes
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateOfBirth(val);
    if (val) {
      const dob = new Date(val);
      const diffMs = Date.now() - dob.getTime();
      const calculatedAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      if (!isNaN(calculatedAge) && calculatedAge >= 0) {
        setAge(String(calculatedAge));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please provide customer full name.');
      return;
    }

    if (ageMode === 'AGE' && (!age || Number(age) < 0 || Number(age) > 125)) {
      setErrorMessage('Please provide a valid age between 0 and 125 years.');
      return;
    }

    if (ageMode === 'DOB' && !dateOfBirth) {
      setErrorMessage('Please provide customer date of birth.');
      return;
    }

    if (!consentGiven) {
      setErrorMessage('Informed customer consent is legally and ethically required before proceeding with vision screening.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        age: age ? Number(age) : undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        contactNumber: phone.trim() || undefined,
        preferredLanguage,
        consentStatus: true,
        notes: notes.trim() || undefined,
        storeId: user?.storeId || 'ST-AP-CHITTOOR-01',
      };

      const res = await apiRequest<{ customerId: string; customerCode?: string; clientUuid?: string; id: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsLoading(false);

      if (res.success && res.data) {
        const targetId = res.data.customerId || res.data.customerCode || res.data.id;
        try {
          await offlineDb.customers.add({
            clientUuid: res.data.clientUuid || `uuid_${Date.now()}`,
            customerCode: targetId,
            fullName: fullName.trim(),
            age: age ? Number(age) : 0,
            gender,
            phone: phone.trim() || undefined,
            preferredLanguage,
            consentGiven: true,
            notes: notes.trim() || undefined,
            syncStatus: 'SYNCED',
            createdAt: new Date().toISOString(),
          });
        } catch {
          // IndexedDB addition is non-blocking
        }

        navigate(`/customers/${targetId}`, {
          state: { newlyRegistered: true, customerName: fullName },
        });
      } else {
        setErrorMessage(res.error?.message || 'Failed to register customer record.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Network error occurred during customer registration.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      
      {/* Breadcrumb & Navigation */}
      <PageHeader
        title="Register Customer Intake"
        subtitle={`Capture demographic information and informed consent for preliminary screening${user?.storeName ? ` • ${user.storeName}` : ''}.`}
        breadcrumbs={[
          { label: 'Store Portal', href: '/store' },
          { label: 'Customers', href: '/customers' },
          { label: 'New Intake' },
        ]}
      />

      {/* Main Registration Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-healthcare p-6 sm:p-8 space-y-6">
        
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-start gap-3 animate-fade-in shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>Registration Incomplete:</strong> {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Identity & Name */}
          <div className="space-y-4">
            <h2 className="text-xs font-display font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600" />
              <span>1. Customer Personal Information</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kamala Devi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>

            {/* Age / Date of Birth Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {ageMode === 'AGE' ? 'Age in Years *' : 'Date of Birth *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setAgeMode(ageMode === 'AGE' ? 'DOB' : 'AGE')}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Switch to {ageMode === 'AGE' ? 'Exact DOB' : 'Estimated Age'}
                  </button>
                </div>

                {ageMode === 'AGE' ? (
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="number"
                      min="1"
                      max="125"
                      required
                      placeholder="e.g. 52"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={handleDobChange}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}
                {dateOfBirth && age && (
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Calculated age: <strong>{age} years</strong>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Spoken Interview Language *
                </label>
                <div className="relative">
                  <Languages className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as any)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium"
                  >
                    <option value="hi">Hindi (हिंदी) - Guided Voice</option>
                    <option value="en">English - Guided Voice</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Notes / Chief Complaint (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Customer mentions difficulty reading price tags and stitching fabric..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* 2. Mandatory Informed Consent */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-display font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>2. Informed Clinical Screening Consent</span>
            </h2>

            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 flex-shrink-0"
                />
                <div className="space-y-1">
                  <span className="font-semibold text-teal-950 block">
                    Affirmative Consent Acknowledgment:
                  </span>
                  <p className="text-[11px] text-teal-900 leading-relaxed">
                    The customer understands that VisionBridge is a preliminary vision screening and optometrist-connect platform. It does <strong>not</strong> generate spectacle prescriptions, calculate eye power, or diagnose cataracts, glaucoma, or retinal diseases. Detailed findings will be reviewed by a licensed eye-care professional.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/store"
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isLoading || !consentGiven}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold text-xs shadow-xs transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Profile...</span>
                </>
              ) : (
                <>
                  <span>Save Customer & Open Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
