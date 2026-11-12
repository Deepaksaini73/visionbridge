import React from 'react';
import { Eye, ShieldAlert, Heart, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-300 border-t border-slate-800/80 mt-20">
      {/* Prominent Medical Limitation Disclaimer Bar */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border-b border-amber-500/25 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-100 font-semibold">Clinical Safety Notice:</strong> VisionBridge is an AI-assisted preliminary vision screening and optometrist-connect platform. It does <em>not</em> diagnose ocular diseases, prescribe spectacle diopters, or substitute for a formal clinical exam by an ophthalmologist or licensed optometrist. All screening metrics represent preliminary triage data.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-navy-950 shadow-glow-teal font-bold">
                <Eye className="w-5 h-5 text-navy-950" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight font-display">
                Vision<span className="text-teal-400">Bridge</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Speak. We listen. An eye-care professional reviews. Bringing accessible, multilingual preliminary eye screening to rural communities and local optical stores.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-teal-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All Systems Operational (AES-256 Protected)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              Application Portals
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  <span className="text-slate-600">›</span> Product Overview & Architecture
                </Link>
              </li>
              <li>
                <Link to="/store" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  <span className="text-slate-600">›</span> Store Operator Dashboard
                </Link>
              </li>
              <li>
                <Link to="/customers" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  <span className="text-slate-600">›</span> Patient Demographics Directory
                </Link>
              </li>
              <li>
                <Link to="/optometrist" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  <span className="text-slate-600">›</span> Optometrist Reviewer Hub
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  <span className="text-slate-600">›</span> System Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Screening Modules */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              Clinical Screening Suite
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Multilingual Voice Intake (Hindi/English)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Tumbling-E Distance Acuity (6/60 to 6/6)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Near Visual Acuity (N36 down to N5)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Weber Contrast Sensitivity Evaluation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Ishihara Colour Vision & Amsler Grid</span>
              </li>
            </ul>
          </div>

          {/* Security & Standards */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">
              Privacy & Governance
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Designed with strict red-flag interception rules. Emergency ocular symptoms immediately divert patients to hospital care with human-in-the-loop review.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-teal-300 bg-teal-950/80 px-3 py-1.5 rounded-xl border border-teal-700/50 shadow-2xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Licensed Optometrist Verification</span>
            </div>
          </div>

        </div>

        <div className="border-t border-slate-800/80 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 VisionBridge Healthcare Technologies. All rights reserved.</p>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>Built with care for universal community vision screening</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
