import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Printer,
  Eye,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { useScreeningSession } from '../../features/screening/hooks/useScreeningSession';
import { ScreeningDashboard } from '../../features/screening/components/ScreeningDashboard';
import { DeviceCalibration } from '../../features/screening/components/DeviceCalibration';
import { TestInstructions } from '../../features/screening/components/TestInstructions';
import { ScreeningSessionSummary } from '../../features/screening/components/ScreeningSessionSummary';
import { DistanceAcuityModule } from '../../features/screening/modules/distance-acuity/DistanceAcuityModule';
import { NearAcuityModule } from '../../features/screening/modules/near-acuity/NearAcuityModule';
import { ContrastSensitivityModule } from '../../features/screening/modules/contrast-sensitivity/ContrastSensitivityModule';
import { ColourVisionModule } from '../../features/screening/modules/colour-vision/ColourVisionModule';
import { AmslerGridModule } from '../../features/screening/modules/amsler-grid/AmslerGridModule';
import { SCREENING_MODULES } from '@shared/config/screeningConfig';

export const ScreeningPage: React.FC = () => {
  const { id: customerParamId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<any | null>(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);
  const [successSubmitted, setSuccessSubmitted] = useState<any | null>(null);

  const {
    stage,
    setStage,
    selectedModules,
    toggleModule,
    currentModuleIndex,
    currentModuleId,
    session,
    calibration,
    setCalibration,
    operatorNotes,
    setOperatorNotes,
    error,
    startSession,
    handleModuleComplete,
    skipCurrentModule,
    finalizeSession,
  } = useScreeningSession(customerParamId || '', customer?.customerCode);

  // Fetch Customer Demographics
  useEffect(() => {
    let isMounted = true;
    async function loadCustomer() {
      if (!customerParamId) return;
      try {
        const res = await apiRequest(`/customers/${customerParamId}`);
        if (isMounted) {
          if (res.success && res.data) {
            setCustomer(res.data);
          } else {
            // Demo fallback
            setCustomer({
              customerId: customerParamId,
              customerCode: customerParamId,
              fullName: 'Sample Customer',
              age: 45,
              gender: 'Female',
              storeId: user?.storeId || 'ST-DEMO',
            });
          }
        }
      } catch {
        if (isMounted) {
          setCustomer({
            customerId: customerParamId,
            customerCode: customerParamId,
            fullName: 'Customer (Offline)',
            age: 40,
            gender: 'Male',
            storeId: user?.storeId || 'ST-DEMO',
          });
        }
      } finally {
        if (isMounted) setIsCustomerLoading(false);
      }
    }

    loadCustomer();
    return () => { isMounted = false; };
  }, [customerParamId, user]);

  const handleOpenPdf = () => {
    if (session?.screeningId) {
      window.open(`/api/screenings/${session.screeningId}/pdf`, '_blank');
    }
  };

  const handleFinalize = async (isIncomplete = false, reason?: string) => {
    try {
      const res = await finalizeSession(isIncomplete, reason);
      if (res && res.data) {
        setSuccessSubmitted(res.data);
      }
    } catch (err) {
      console.error('Finalize error:', err);
    }
  };

  if (isCustomerLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Loading customer screening profile...</p>
      </div>
    );
  }

  // Success Confirmation Screen
  if (successSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50/70 py-12 px-4 animate-fade-in">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-healthcare-lg border border-slate-200 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-navy-950">
              Screening Evaluation Recorded
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Screening Record <strong className="font-mono text-teal-700">{successSubmitted.screeningId}</strong> has been saved and queued for optometrist review.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-navy-950">{customer?.fullName} ({customer?.customerId})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Test Validity:</span>
              <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{successSubmitted.testValidity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Review Status:</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{successSubmitted.professionalReviewStatus}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.open(`/api/screenings/${successSubmitted.screeningId}/pdf`, '_blank')}
              className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Clinical Report</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/customers/${customer?.customerId}`)}
              className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 shadow-xs transition-colors"
            >
              Back to Customer Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 animate-fade-in">
      {/* Top Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/customers/${customerParamId}`)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Return to customer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-display font-bold text-navy-950">
                  {customer?.fullName || 'Customer Screening'}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-mono bg-teal-50 text-teal-800 rounded border border-teal-200">
                  {customer?.customerId || customer?.customerCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {customer?.age} yrs • {customer?.gender} • Center: {customer?.storeId}
              </p>
            </div>
          </div>

          {/* Stepper info */}
          <div className="flex items-center space-x-3">
            {stage === 'TESTING' && currentModuleId && (
              <span className="text-xs font-semibold px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl shadow-xs">
                Module {currentModuleIndex + 1} of {selectedModules.length}: {(SCREENING_MODULES as any[]).find((m: any) => m.id === currentModuleId)?.nameEn}
              </span>
            )}
            {stage !== 'DASHBOARD' && stage !== 'SUMMARY' && (
              <button
                type="button"
                onClick={() => setStage('DASHBOARD')}
                className="text-xs font-semibold text-slate-500 hover:text-navy-950 underline transition-colors"
              >
                Module Selection
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 pt-6">
        {error && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-center space-x-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Dashboard Stage: Module Selection */}
        {stage === 'DASHBOARD' && (
          <ScreeningDashboard
            customerName={customer?.fullName || 'Customer'}
            customerCode={customer?.customerId || customer?.customerCode || 'N/A'}
            calibration={calibration}
            selectedModules={selectedModules}
            onToggleModule={toggleModule}
            onOpenCalibration={() => setStage('CALIBRATION')}
            onStartSession={startSession}
          />
        )}

        {/* 2. Calibration Stage */}
        {stage === 'CALIBRATION' && (
          <DeviceCalibration
            calibration={calibration}
            onUpdateCalibration={setCalibration}
            onContinue={() => setStage(session ? 'INSTRUCTIONS' : 'DASHBOARD')}
          />
        )}

        {/* 3. Pre-Test Instructions Stage */}
        {stage === 'INSTRUCTIONS' && currentModuleId && (
          <TestInstructions
            moduleId={currentModuleId}
            onStart={() => setStage('TESTING')}
          />
        )}

        {/* 4. Active Testing Module Stage */}
        {stage === 'TESTING' && currentModuleId === 'DISTANCE_ACUITY' && (
          <DistanceAcuityModule
            viewingDistanceMeters={calibration.confirmedDistanceMeters || 3.0}
            pixelsPerMm={calibration.pixelsPerMm}
            onComplete={handleModuleComplete}
            onSkip={skipCurrentModule}
          />
        )}

        {stage === 'TESTING' && currentModuleId === 'NEAR_ACUITY' && (
          <NearAcuityModule
            onComplete={handleModuleComplete}
            onSkip={skipCurrentModule}
          />
        )}

        {stage === 'TESTING' && currentModuleId === 'CONTRAST_SENSITIVITY' && (
          <ContrastSensitivityModule
            onComplete={handleModuleComplete}
            onSkip={skipCurrentModule}
          />
        )}

        {stage === 'TESTING' && currentModuleId === 'COLOUR_VISION' && (
          <ColourVisionModule
            onComplete={handleModuleComplete}
            onSkip={skipCurrentModule}
          />
        )}

        {stage === 'TESTING' && currentModuleId === 'AMSLER_GRID' && (
          <AmslerGridModule
            onComplete={handleModuleComplete}
            onSkip={skipCurrentModule}
          />
        )}

        {/* 5. Summary & Review Stage */}
        {stage === 'SUMMARY' && session && (
          <ScreeningSessionSummary
            session={session}
            operatorNotes={operatorNotes}
            onUpdateOperatorNotes={setOperatorNotes}
            onFinalize={(isIncomplete?: boolean, reason?: string) => handleFinalize(isIncomplete, reason)}
            onOpenPdfReport={handleOpenPdf}
          />
        )}
      </main>
    </div>
  );
};
