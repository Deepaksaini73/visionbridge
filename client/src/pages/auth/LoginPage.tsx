import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Store, 
  Stethoscope, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  KeyRound,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@shared/types';

export const LoginPage: React.FC = () => {
  const { login, loginAsDemo, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if redirected from password reset
  const successStateMsg = (location.state as any)?.successMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both your work email and password.');
      return;
    }

    const res = await login(email, password, rememberMe);
    if (res.success) {
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else {
        navigate('/store', { replace: true });
      }
    } else {
      setErrorMessage(res.message || 'Invalid email or password.');
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setErrorMessage(null);
    await loginAsDemo(role);

    if (role === 'STORE_OPERATOR') {
      navigate('/store');
    } else if (role === 'OPTOMETRIST') {
      navigate('/optometrist');
    } else if (role === 'ADMIN') {
      navigate('/admin');
    }
  };

  const handleFillDemoCredentials = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-healthcare-lg">
        
        {/* Header with Optical Prism Eye Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-teal-700 flex items-center justify-center text-white mx-auto shadow-md border border-navy-800">
            <Eye className="w-7 h-7 text-teal-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-navy-950">
            Sign in to VisionBridge
          </h1>
          <p className="text-xs text-slate-500">
            Speak. We listen. An eye-care professional reviews.
          </p>
        </div>

        {successStateMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-2xl flex items-center gap-2.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successStateMsg}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-start gap-2.5 animate-fade-in shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1-Click Fast Demo Login Switcher */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Fast One-Click Demo Personas</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('STORE_OPERATOR')}
              className="p-3 rounded-2xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100/90 text-left transition-all shadow-xs group"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-teal-950 mb-0.5">
                <Store className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
                <span>Store Operator</span>
              </div>
              <p className="text-[10px] text-teal-800 font-medium">
                Ramesh Patel (Chittoor)
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('OPTOMETRIST')}
              className="p-3 rounded-2xl border border-navy-200 bg-navy-50/70 hover:bg-navy-100/90 text-left transition-all shadow-xs group"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-navy-950 mb-0.5">
                <Stethoscope className="w-3.5 h-3.5 text-navy-700 group-hover:scale-110 transition-transform" />
                <span>Optometrist</span>
              </div>
              <p className="text-[10px] text-navy-800 font-medium">
                Dr. Ananya Sharma
              </p>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleFillDemoCredentials('operator2@visionbridge.org', 'OperatorPass123!')}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-600 text-left truncate transition-colors shadow-xs"
              title="Operator 2 (Madanapalle Store - tests store isolation)"
            >
              Fill Operator 2 (Isolation)
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-600 text-left truncate flex items-center justify-between transition-colors shadow-xs"
            >
              <span>Admin Console</span>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-slate-400 font-medium">or sign in with password</span>
          </div>
        </div>

        {/* Traditional Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="email"
                required
                placeholder="operator@visionbridge.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Password *
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
              />
              <span className="text-xs text-slate-600 select-none">Remember this device</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Registration Link */}
        <div className="pt-3 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-600">
            Need a store operator account?{' '}
            <Link to="/register" className="font-semibold text-teal-700 hover:text-teal-800 underline">
              Register here
            </Link>
          </p>

          <p className="text-[10px] text-slate-400 leading-tight">
            Optometrist and Administrator accounts are governed by clinical administration and cannot be self-registered.
          </p>
        </div>

      </div>
    </div>
  );
};
