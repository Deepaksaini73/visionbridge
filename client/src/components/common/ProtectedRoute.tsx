import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Store, Stethoscope, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@shared/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-healthcare space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-navy-950">
              Access Restricted
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your active role is <strong className="text-navy-950">{role.replace('_', ' ')}</strong>. This section is restricted to: <strong className="text-teal-700">{allowedRoles.map(r => r.replace('_', ' ')).join(', ')}</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {role === 'STORE_OPERATOR' && (
              <Link
                to="/store"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-teal-700"
              >
                <Store className="w-4 h-4" />
                <span>Return to Store Portal</span>
              </Link>
            )}
            {role === 'OPTOMETRIST' && (
              <Link
                to="/optometrist"
                className="inline-flex items-center gap-2 px-4 py-2 bg-navy-950 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-navy-900"
              >
                <Stethoscope className="w-4 h-4 text-teal-400" />
                <span>Return to Reviewer Portal</span>
              </Link>
            )}
            {role === 'ADMIN' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-slate-800"
              >
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Return to Admin Console</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

