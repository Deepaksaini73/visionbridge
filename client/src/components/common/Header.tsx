import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Stethoscope, 
  Store, 
  Menu, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  ChevronDown, 
  Users, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Shield, 
  Building2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { NetworkStatusBadge } from './NetworkStatusBadge';

export const Header: React.FC = () => {
  const { user, role, isAuthenticated, logout, loginAsDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 glass-header border-b border-slate-200/80 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Identity (Inspired by Eye-Sight UI Kit) */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-navy-950 via-navy-800 to-teal-700 flex items-center justify-center text-white shadow-healthcare transition-all duration-200 group-hover:scale-105 group-hover:shadow-glow-teal">
              {/* Modern Eye Motif with Iris Rays */}
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" className="stroke-teal-300" />
                <circle cx="12" cy="12" r="3" className="fill-teal-400 stroke-white" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-navy-950 block leading-tight font-display">
                Vision<span className="text-teal-600">Bridge</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase hidden sm:block">
                Ophthalmic Tele-Screening
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl border border-slate-200/60 backdrop-blur-xs">
            <Link
              to="/"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                location.pathname === '/'
                  ? 'bg-white text-navy-950 shadow-2xs'
                  : 'text-slate-600 hover:text-navy-950 hover:bg-white/60'
              }`}
            >
              Overview
            </Link>

            {/* Store Portal & Customer Directory (Operators & Admins) */}
            {(role === 'STORE_OPERATOR' || role === 'ADMIN') && (
              <>
                <Link
                  to="/store"
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                    location.pathname === '/store'
                      ? 'bg-white text-teal-900 shadow-2xs font-bold border border-teal-200/50'
                      : 'text-slate-600 hover:text-navy-950 hover:bg-white/60'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-teal-600" />
                  <span>Store Portal</span>
                </Link>

                <Link
                  to="/customers"
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                    isActive('/customers')
                      ? 'bg-white text-teal-900 shadow-2xs font-bold border border-teal-200/50'
                      : 'text-slate-600 hover:text-navy-950 hover:bg-white/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span>Customers</span>
                </Link>
              </>
            )}

            {/* Reviewer Portal (Optometrists & Admins) */}
            {(role === 'OPTOMETRIST' || role === 'ADMIN') && (
              <Link
                to="/optometrist"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                  location.pathname === '/optometrist'
                    ? 'bg-white text-teal-950 shadow-2xs font-bold border border-teal-200/60'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-white/60'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Reviewer Hub</span>
              </Link>
            )}

            {/* Admin Console (Admins only) */}
            {role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                  location.pathname === '/admin'
                    ? 'bg-white text-navy-950 shadow-2xs font-bold border border-teal-200/60'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-white/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Admin Console</span>
              </Link>
            )}
          </nav>

          {/* Right Utilities & Quick Persona Switcher */}
          <div className="hidden md:flex items-center gap-3">
            <NetworkStatusBadge />

            {/* Demo Persona Quick-Switch Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300"
                title="Switch active demonstration persona"
              >
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                <span className="text-slate-500 font-normal">Role:</span>
                <strong className="text-navy-950">
                  {role === 'STORE_OPERATOR' ? 'Store Operator' : role === 'OPTOMETRIST' ? 'Optometrist' : role === 'ADMIN' ? 'Admin' : 'Guest'}
                </strong>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 glass-card rounded-2xl shadow-healthcare-lg border border-slate-200 p-2 z-50 text-xs animate-slide-up"
                  onMouseLeave={() => setRoleMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100">
                    Switch Demonstration Persona
                  </div>

                  <button
                    onClick={async () => {
                      await loginAsDemo('STORE_OPERATOR');
                      setRoleMenuOpen(false);
                      navigate('/store');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      role === 'STORE_OPERATOR'
                        ? 'bg-teal-50 text-teal-950 font-bold border border-teal-200/80'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-teal-600" />
                        <span>Store Operator</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Ramesh Patel (Chittoor Center)</div>
                    </div>
                    {role === 'STORE_OPERATOR' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                  </button>

                  <button
                    onClick={async () => {
                      await loginAsDemo('OPTOMETRIST');
                      setRoleMenuOpen(false);
                      navigate('/optometrist');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors mt-1 ${
                      role === 'OPTOMETRIST'
                        ? 'bg-blue-50 text-blue-950 font-bold border border-blue-200/80'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        <span>Optometrist Reviewer</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Dr. Ananya Sharma, M.Optom</div>
                    </div>
                    {role === 'OPTOMETRIST' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>

                  <button
                    onClick={async () => {
                      await loginAsDemo('ADMIN');
                      setRoleMenuOpen(false);
                      navigate('/admin');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors mt-1 ${
                      role === 'ADMIN'
                        ? 'bg-navy-950 text-white font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                        <span>System Administrator</span>
                      </div>
                      <div className={`text-[10px] ${role === 'ADMIN' ? 'text-slate-300' : 'text-slate-500'}`}>Dr. Vikram Malhotra</div>
                    </div>
                    {role === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Authenticated User Menu or Sign In */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-2xs transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-navy-950 to-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user.name.charAt(0)}
                  </div>
                  <span className="max-w-[100px] truncate font-medium text-navy-950 hidden lg:inline">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 glass-card rounded-2xl shadow-healthcare-lg border border-slate-200 p-2 z-50 text-xs animate-slide-up"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="font-bold text-navy-950">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      <div className="text-[10px] text-teal-700 font-semibold mt-0.5 uppercase tracking-wide">
                        {role?.replace('_', ' ')}
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 mt-1 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Primary Action Button */}
            <Link
              to="/customers/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white text-xs font-bold shadow-healthcare hover:shadow-glow-teal transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Patient</span>
            </Link>
          </div>

          {/* Mobile menu toggle button */}
          <div className="flex md:hidden items-center gap-2">
            <NetworkStatusBadge />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-700 hover:text-navy-950 hover:bg-slate-100 border border-slate-200 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation (Slide-down glass panel) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 glass-header px-4 pt-3 pb-6 space-y-3 animate-slide-up">
          {/* Quick Persona Switcher in Mobile Drawer */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Persona: <strong className="text-navy-950">{role ? role.replace('_', ' ') : 'Guest'}</strong>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={async () => {
                  await loginAsDemo('STORE_OPERATOR');
                  setMobileMenuOpen(false);
                  navigate('/store');
                }}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${
                  role === 'STORE_OPERATOR' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                Operator
              </button>
              <button
                onClick={async () => {
                  await loginAsDemo('OPTOMETRIST');
                  setMobileMenuOpen(false);
                  navigate('/optometrist');
                }}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${
                  role === 'OPTOMETRIST' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                Optometrist
              </button>
              <button
                onClick={async () => {
                  await loginAsDemo('ADMIN');
                  setMobileMenuOpen(false);
                  navigate('/admin');
                }}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${
                  role === 'ADMIN' ? 'bg-navy-950 text-white border-navy-950' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Overview & Platform Guide
            </Link>
            <Link
              to="/store"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200/60"
            >
              Store Operator Dashboard
            </Link>
            <Link
              to="/customers"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Patient Directory
            </Link>
            <Link
              to="/customers/new"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-100/50 hover:bg-teal-100 transition-colors"
            >
              + Register New Patient
            </Link>
            <Link
              to="/optometrist"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200/60"
            >
              Optometrist Tele-Review Hub
            </Link>
            {role === 'ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-navy-950"
              >
                Admin Console
              </Link>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-rose-600 flex items-center gap-1.5 p-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({user?.name.split(' ')[0]})</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-teal-700 flex items-center gap-1.5 p-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
