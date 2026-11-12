import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Eye, 
  Mic, 
  WifiOff, 
  ShieldCheck, 
  Stethoscope, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Activity, 
  ShieldAlert,
  Smartphone,
  ChevronRight,
  Languages,
  Check,
  Zap,
  Globe2,
  Lock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const LandingPage: React.FC = () => {
  const { loginAsDemo } = useAuth();
  const [activeInteractiveTab, setActiveInteractiveTab] = useState<'VOICE' | 'ACUITY' | 'TELE_REVIEW'>('ACUITY');

  return (
    <div className="space-y-24 sm:space-y-32 pb-24 overflow-hidden">
      
      {/* =========================================================================
          1. HERO SECTION (High-Impact Modern Healthcare SaaS + Floating Tele-Nodes)
         ========================================================================= */}
      <section className="relative pt-8 sm:pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden bg-gradient-to-b from-white via-slate-50/70 to-teal-50/30 border-b border-slate-200/80">
        
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-teal-200/30 blur-3xl" />
          <div className="absolute top-20 right-1/4 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Badge Tag */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200/90 text-teal-800 text-xs font-semibold shadow-2xs animate-fade-in">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                <span>Next-Gen Ophthalmic Tele-Screening Platform</span>
              </div>

              {/* Main Headline with Marker Highlight */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy-950 leading-[1.12] font-display">
                Speak. We listen. <br />
                <span className="marker-highlight text-gradient-brand">
                  An eye-care professional reviews.
                </span>
              </h1>

              {/* Paragraph */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
                VisionBridge bridges the global eye-care gap for rural optical stores and underserved communities through guided multilingual voice intake, calibrated smartphone visual acuity tests, and licensed tele-optometry evaluation.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/store"
                  onClick={() => loginAsDemo('STORE_OPERATOR')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-sm shadow-healthcare-md hover:shadow-glow-teal transition-all duration-200 group active:scale-95"
                >
                  <span>Launch Store Operator Portal</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/optometrist"
                  onClick={() => loginAsDemo('OPTOMETRIST')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white font-bold text-sm shadow-healthcare-md transition-all duration-200 border border-navy-800 active:scale-95"
                >
                  <Stethoscope className="w-4 h-4 text-teal-400" />
                  <span>Optometrist Reviewer Hub</span>
                </Link>
              </div>

              {/* Quality Pills / Trust Markers */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-600 font-semibold">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  No Equipment Required
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Offline-Ready (Dexie.js)
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Licensed Clinician Sign-Off
                </span>
              </div>

            </div>

            {/* Right Hero Graphic Mockup (Inspired by Eye Sight UI Kit & Whitespace diagram) */}
            <div className="lg:col-span-5 relative">
              
              {/* Main Preview Container Card */}
              <div className="relative mx-auto max-w-sm sm:max-w-md bg-white rounded-3xl p-5 shadow-glass-lg border border-slate-200/90 space-y-4">
                
                {/* Simulated App Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-navy-950 flex items-center justify-center text-teal-400 font-bold text-xs">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-navy-950 font-display">EYE-SIGHT SUITE</div>
                      <div className="text-[10px] text-teal-600 font-semibold">Active Session: VB-2026-0101</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Live Telemetry
                  </span>
                </div>

                {/* Patient Live Status Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/40 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-700 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      LN
                    </div>
                    <div>
                      <div className="font-bold text-navy-950 text-xs">Lakshmi Narayanan (52y, F)</div>
                      <div className="text-[10px] text-slate-500">Chittoor Optical Center • Hindi</div>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>

                {/* Calibrated Tumbling-E Optotype Test Box */}
                <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                  <div className="absolute top-2 left-3 text-[10px] text-teal-300 font-mono font-semibold">
                    MODULE A: RIGHT EYE (OD) • 6/9
                  </div>
                  <div className="absolute top-2 right-3 text-[10px] text-slate-400">
                    Distance: 3.0 m
                  </div>

                  {/* High-Contrast Tumbling-E SVG */}
                  <div className="py-6 transition-transform hover:scale-110 duration-200">
                    <svg viewBox="0 0 100 100" className="w-20 h-20 fill-white drop-shadow">
                      <rect x="10" y="10" width="20" height="80" />
                      <rect x="30" y="10" width="60" height="20" />
                      <rect x="30" y="40" width="45" height="20" />
                      <rect x="30" y="70" width="60" height="20" />
                    </svg>
                  </div>

                  <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Response Recorded: Right (240ms)</span>
                  </div>
                </div>

                {/* Clinical Reviewer Tele-Sign-Off Pill */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-navy-950">Dr. Ananya Sharma, M.Optom</div>
                      <div className="text-[10px] text-slate-500">Tele-Review: Presbyopia Suspected</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                    Signed
                  </span>
                </div>

              </div>

              {/* Floating Pill Badges */}
              <div className="hidden sm:flex absolute -top-4 -right-4 glass-card px-3.5 py-2 rounded-2xl shadow-healthcare-md border border-slate-200/80 items-center gap-2 animate-bounce-subtle">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-navy-950">98.4% Tele-Agreement</span>
              </div>

              <div className="hidden sm:flex absolute -bottom-4 -left-4 glass-card px-3.5 py-2 rounded-2xl shadow-healthcare-md border border-slate-200/80 items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-xs font-bold text-navy-950">AES-256 Encrypted</span>
              </div>

            </div>

          </div>
        </div>
      </section>


      {/* =========================================================================
          2. HOW VISIONBRIDGE WORKS (Structured 5-Step Clinical Workflow)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200/60 uppercase tracking-wider">
            <span>Streamlined 5-Step Tele-Health Flow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight font-display">
            How VisionBridge Works
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Connecting local rural optical shops directly with accredited optometrists through a resilient, auditable digital pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-5 relative">
          
          {/* Step 1 */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 hover:border-teal-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-healthcare-md space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 font-extrabold flex items-center justify-center text-sm border border-teal-200/80 shadow-2xs font-display">
              01
            </div>
            <h3 className="font-bold text-navy-950 text-base font-display">Patient Registration</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Store operator registers patient with minimal PII, preferred language (Hindi/English), and mandatory informed consent.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-teal-700 flex items-center gap-1">
              <span>Offline Synced</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 hover:border-teal-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-healthcare-md space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 font-extrabold flex items-center justify-center text-sm border border-teal-200/80 shadow-2xs font-display">
              02
            </div>
            <h3 className="font-bold text-navy-950 text-base font-display">Voice Interview</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Guided spoken questions explore distance/near blur, lifestyle habits, and adaptive branching with red-flag symptom detection.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-teal-700 flex items-center gap-1">
              <span>Web Speech API</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="glass-card p-6 rounded-2xl border border-teal-300 bg-gradient-to-b from-white to-teal-50/20 shadow-healthcare hover:shadow-healthcare-md transition-all duration-200 hover:-translate-y-1 space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white font-extrabold flex items-center justify-center text-sm shadow-2xs font-display">
              03
            </div>
            <h3 className="font-bold text-navy-950 text-base font-display">Visual Screening</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Calibrated Tumbling-E visual acuity, near acuity, Weber contrast steps, Ishihara plates, and Amsler grid checks.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-teal-700 flex items-center gap-1">
              <span>5 Modular Tests</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Step 4 */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 hover:border-teal-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-healthcare-md space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 font-extrabold flex items-center justify-center text-sm border border-teal-200/80 shadow-2xs font-display">
              04
            </div>
            <h3 className="font-bold text-navy-950 text-base font-display">AI Synthesis</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Google Gemini compiles a structured clinical synopsis separating patient complaints from objective test telemetry.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-teal-700 flex items-center gap-1">
              <span>Neutral Telemetry</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Step 5 */}
          <div className="glass-card p-6 rounded-2xl border border-blue-200 bg-gradient-to-b from-white to-blue-50/30 shadow-healthcare hover:shadow-healthcare-md transition-all duration-200 hover:-translate-y-1 space-y-3 relative group">
            <div className="w-10 h-10 rounded-xl bg-navy-950 text-teal-300 font-extrabold flex items-center justify-center text-sm shadow-2xs font-display">
              05
            </div>
            <h3 className="font-bold text-navy-950 text-base font-display">Optometrist Review</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Accredited optometrist verifies raw test responses, signs off clinical observations, and issues formal guidance or hospital referral.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
              <span>Human Verification</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          3. INTERACTIVE FEATURE SPOTLIGHT (Tabs for Acuity, Voice, and Tele-Review)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-glass-lg space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/80">
            <div>
              <div className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-1">
                Interactive Technology Demo
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-display">
                Experience the VisionBridge Engine
              </h2>
            </div>

            {/* Tab Controls */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 self-start">
              <button
                onClick={() => setActiveInteractiveTab('ACUITY')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeInteractiveTab === 'ACUITY'
                    ? 'bg-white text-navy-950 shadow-2xs'
                    : 'text-slate-600 hover:text-navy-950'
                }`}
              >
                Visual Acuity Test
              </button>
              <button
                onClick={() => setActiveInteractiveTab('VOICE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeInteractiveTab === 'VOICE'
                    ? 'bg-white text-navy-950 shadow-2xs'
                    : 'text-slate-600 hover:text-navy-950'
                }`}
              >
                Multilingual Voice AI
              </button>
              <button
                onClick={() => setActiveInteractiveTab('TELE_REVIEW')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeInteractiveTab === 'TELE_REVIEW'
                    ? 'bg-white text-navy-950 shadow-2xs'
                    : 'text-slate-600 hover:text-navy-950'
                }`}
              >
                Optometrist Tele-Review
              </button>
            </div>
          </div>

          {/* Tab Content 1: Tumbling E Acuity */}
          {activeInteractiveTab === 'ACUITY' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Calibrated Directional Testing</span>
                </div>
                <h3 className="text-2xl font-bold text-navy-950 font-display">
                  Tumbling-E Optotypes at 3-Meter Distance
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Eliminating literacy barriers, our Tumbling-E test requires customers to simply point in the direction the "fingers" of the E point (Up, Down, Left, Right). 
                  Calibrated to screen sizes using a standard credit card dimension baseline.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-navy-950">Snellen Range</div>
                    <div className="text-slate-500">6/60 down to 6/6 standard</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-navy-950">Randomized Trials</div>
                    <div className="text-slate-500">Anti-memorization bias control</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-slate-900 rounded-3xl p-8 text-center text-white space-y-6 shadow-xl">
                <div className="text-xs text-teal-300 font-mono">SIMULATION PREVIEW (6/9 LEVEL)</div>
                <div className="flex justify-center py-4">
                  <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-3 shadow-2xl">
                    <svg viewBox="0 0 100 100" className="w-16 h-16 fill-slate-950">
                      <rect x="10" y="10" width="20" height="80" />
                      <rect x="30" y="10" width="60" height="20" />
                      <rect x="30" y="40" width="45" height="20" />
                      <rect x="30" y="70" width="60" height="20" />
                    </svg>
                  </div>
                </div>
                <div className="flex justify-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold border border-slate-700">UP</span>
                  <span className="px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold">RIGHT (CORRECT)</span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold border border-slate-700">DOWN</span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold border border-slate-700">LEFT</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Multilingual Voice AI */}
          {activeInteractiveTab === 'VOICE' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                  <Languages className="w-3.5 h-3.5" />
                  <span>Hindi & English Conversational Engine</span>
                </div>
                <h3 className="text-2xl font-bold text-navy-950 font-display">
                  Natural Voice Questioning with Adaptive Branching
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Patients listen to spoken prompts in their mother tongue and respond naturally. The engine prunes irrelevant branches dynamically (e.g. skipping glasses queries for non-spectacle wearers) and flags sudden vision loss instantly.
                </p>
                <div className="flex items-center gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 flex-1">
                    <strong>Text-to-Speech:</strong> Clear enunciated playback
                  </div>
                  <div className="p-3 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 flex-1">
                    <strong>Speech-to-Text:</strong> Accurate dialect recognition
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-gradient-to-br from-navy-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                  <span>VOICE SESSION (HINDI MODE)</span>
                  <span className="text-teal-400 font-mono">Q3 of 7</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-2">
                  <div className="text-[11px] text-teal-300 font-semibold uppercase">Assistant Speaks:</div>
                  <div className="text-sm font-medium">"क्या आपको दूर की चीजें जैसे बोर्ड या चेहरे देखने में परेशानी होती है?"</div>
                </div>
                <div className="p-4 rounded-2xl bg-teal-500/20 border border-teal-500/30 space-y-1">
                  <div className="text-[11px] text-teal-300 font-semibold uppercase">Customer Responds:</div>
                  <div className="text-sm font-semibold">"हाँ, लगभग 6 महीने से चेहरे साफ़ नहीं दिखते।"</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 pt-2 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Answer parsed: Distance Difficulty = YES (Mild)</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Tele-Review */}
          {activeInteractiveTab === 'TELE_REVIEW' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Licensed Optometrist Verification</span>
                </div>
                <h3 className="text-2xl font-bold text-navy-950 font-display">
                  Remote Decision Support & Clinical Sign-Off
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Screening cases are securely transferred to accredited optometrists. Clinicians examine raw test telemetry, review patient ocular photographs, and sign off with their registration credentials.
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-navy-950">Non-Diagnostic Safety Rule</div>
                  <div className="text-slate-500 leading-relaxed">
                    VisionBridge outputs preliminary guidance and referrals only. Spectacle prescriptions are strictly deferred to comprehensive in-person evaluations.
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="font-bold text-navy-950 text-sm">Clinical Sign-Off Panel</div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                    High Urgency
                  </span>
                </div>
                <div className="text-xs space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-navy-950">OD Acuity:</span> 6/9 • <span className="font-bold text-navy-950">OS Acuity:</span> 6/36
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                    <span className="font-bold">Amsler Grid OS:</span> Metamorphopsia distortion near fixation
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
                  <strong>Decision:</strong> URGENT_OPHTHALMOLOGY_REFERRAL signed by Dr. Ananya Sharma (Reg #OPT-IN-2024-8841)
                </div>
              </div>
            </div>
          )}

        </div>
      </section>


      {/* =========================================================================
          4. PLATFORM CAPABILITIES GRID
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200/60 uppercase tracking-wider">
            <span>Built for Low-Resource Environments</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight font-display">
            Engineered For Impact
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Robust offline architecture, strict privacy guardrails, and rapid operator training.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="glass-card rounded-3xl p-8 border border-slate-200 hover:border-teal-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-healthcare-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200/80 shadow-2xs">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-navy-950 font-display">Voice-First Multilingual AI</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Designed for non-literate customers. Natural voice dialogues in Hindi or English make eye-care intake accessible without smartphone hesitation.
            </p>
            <ul className="text-xs text-slate-500 space-y-2 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Client-side Web Speech recognition</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Automatic red-flag emergency symptoms check</span>
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="glass-card rounded-3xl p-8 border border-slate-200 hover:border-teal-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-healthcare-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200/80 shadow-2xs">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-navy-950 font-display">Calibrated Visual Screening</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Accurate tumbling-E optotypes, reading card distance tests, Weber contrast steps, and Amsler grid macular distortion evaluations.
            </p>
            <ul className="text-xs text-slate-500 space-y-2 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Monocular Right/Left eye isolated protocols</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Physical card screen calibration tool</span>
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="glass-card rounded-3xl p-8 border border-slate-200 hover:border-teal-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-healthcare-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80 shadow-2xs">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-navy-950 font-display">Offline-First Resilience</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Operates seamlessly in intermittent 2G/3G connectivity. Full screening sessions and customer records persist in IndexedDB with transactional sync.
            </p>
            <ul className="text-xs text-slate-500 space-y-2 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Zero data loss during power/network outages</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>AES-256 encrypted local storage vault</span>
              </li>
            </ul>
          </div>

        </div>
      </section>


      {/* =========================================================================
          5. CLINICAL GUARDRAILS & SAFETY CALLOUT (Medical SaaS Glassmorphism)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-dark rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-slate-700/60">
          <div className="max-w-3xl space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <ShieldAlert className="w-4 h-4" />
              <span>Strict Healthcare Guardrails</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
              Ethical AI & Clinical Safety Boundaries
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              VisionBridge is explicitly built to support licensed human eye-care professionals, not replace them. We enforce non-negotiable medical guardrails:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0"></span>
                <span className="text-xs text-slate-200 leading-relaxed">
                  <strong className="text-white">No Auto-Prescriptions:</strong> Never calculates spectacle diopters or generates lens prescriptions automatically.
                </span>
              </div>
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0"></span>
                <span className="text-xs text-slate-200 leading-relaxed">
                  <strong className="text-white">No Medical Diagnosis:</strong> Never diagnoses cataracts, glaucoma, or diabetic retinopathy.
                </span>
              </div>
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 mt-1 shrink-0"></span>
                <span className="text-xs text-slate-200 leading-relaxed">
                  <strong className="text-white">Red-Flag Interception:</strong> Sudden vision loss, ocular pain, or flashes divert immediately to hospital emergency.
                </span>
              </div>
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 mt-1 shrink-0"></span>
                <span className="text-xs text-slate-200 leading-relaxed">
                  <strong className="text-white">Optometrist Oversight:</strong> Every patient record is reviewed and signed off by a credentialed optometrist.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          6. BOTTOM PORTAL CALL-TO-ACTION
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="glass-card rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-glass space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
            <span>Explore the Platform</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-display">
            Ready to Experience VisionBridge?
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Test the store operator field workflow or examine the remote optometrist review console using our preloaded demo dataset.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              to="/store"
              onClick={() => loginAsDemo('STORE_OPERATOR')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white text-xs font-bold shadow-healthcare hover:shadow-glow-teal transition-all active:scale-95"
            >
              <span>Open Store Operator Console</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/optometrist"
              onClick={() => loginAsDemo('OPTOMETRIST')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-navy-950 text-xs font-bold border border-slate-200 shadow-2xs transition-all active:scale-95"
            >
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <span>Open Optometrist Reviewer Console</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
