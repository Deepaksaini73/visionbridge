import React, { useState } from 'react';
import { ScreeningSessionRecord } from '../types/screening';
import { ScreeningStatusBadge } from './ScreeningStatusBadge';
import { CheckCircle, AlertTriangle, FileText, Printer, Shield, ArrowRight } from 'lucide-react';

interface ScreeningSessionSummaryProps {
  session: ScreeningSessionRecord;
  operatorNotes: string;
  onUpdateOperatorNotes: (notes: string) => void;
  onFinalize: (isIncomplete?: boolean, reason?: string) => void;
  onOpenPdfReport: () => void;
}

export const ScreeningSessionSummary: React.FC<ScreeningSessionSummaryProps> = ({
  session,
  operatorNotes,
  onUpdateOperatorNotes,
  onFinalize,
  onOpenPdfReport,
}) => {
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState('Customer had to leave early');

  const { visualAcuity, nearAcuity, contrastSensitivity, colourVision, amslerAssessment } = session;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
            Screening Session Complete
          </span>
          <h1 className="text-xl font-bold text-slate-800">
            Screening Record: <span className="font-mono text-teal-700">{session.screeningId}</span>
          </h1>
          <p className="text-xs text-slate-500">
            Review test metrics, add field observations, and finalize the preliminary record.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenPdfReport}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Clinical PDF</span>
          </button>
        </div>
      </div>

      {/* Red Flags / Warning Alerts */}
      {session.warningFlags && session.warningFlags.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">CLINICAL OBSERVATIONS / RED FLAGS FLAGGED:</span>
            <ul className="list-disc list-inside space-y-0.5">
              {session.warningFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Grid of Results across all 5 Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Module A: Distance Acuity */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">Distance Acuity (3m)</span>
            <ScreeningStatusBadge status={visualAcuity?.rightEye?.status || 'COMPLETED'} />
          </div>
          <div className="text-sm font-bold text-slate-900">
            OD: {visualAcuity?.rightEye?.snellenEquivalent || 'N/A'} • OS: {visualAcuity?.leftEye?.snellenEquivalent || 'N/A'}
          </div>
          <div className="text-xs text-slate-500">
            Right: {visualAcuity?.rightEye?.preliminaryScore || 'Pending'}
          </div>
          <div className="text-xs text-slate-500">
            Left: {visualAcuity?.leftEye?.preliminaryScore || 'Pending'}
          </div>
        </div>

        {/* Module B: Near Acuity */}
        {nearAcuity?.tested && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Near Acuity (40cm)</span>
              <ScreeningStatusBadge status={nearAcuity.status} />
            </div>
            <div className="text-sm font-bold text-slate-900">
              Binocular: {nearAcuity.binocularScore || 'N/A'}
            </div>
            <div className="text-xs text-slate-500">
              OD: {nearAcuity.rightEyeScore || 'N/A'} • OS: {nearAcuity.leftEyeScore || 'N/A'}
            </div>
          </div>
        )}

        {/* Module C: Contrast Sensitivity */}
        {contrastSensitivity?.tested && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Contrast Sensitivity</span>
              <ScreeningStatusBadge status={contrastSensitivity.contrastGrade} />
            </div>
            <div className="text-sm font-bold text-slate-900">
              {contrastSensitivity.logCSScore.toFixed(2)} LogCS (Weber: {contrastSensitivity.weberContrastPct}%)
            </div>
            <div className="text-xs text-slate-500">
              Grade: {contrastSensitivity.contrastGrade}
            </div>
          </div>
        )}

        {/* Module D: Colour Vision */}
        {colourVision?.tested && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Colour Vision</span>
              <ScreeningStatusBadge status={colourVision.classification} />
            </div>
            <div className="text-sm font-bold text-slate-900">
              {colourVision.platesCorrect} of {colourVision.platesTotal} Plates Identified
            </div>
            <div className="text-xs text-slate-500">
              {colourVision.classification.replace(/_/g, ' ')}
            </div>
          </div>
        )}

        {/* Module E: Amsler Grid */}
        {amslerAssessment?.performed && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Amsler Macular Grid</span>
              <ScreeningStatusBadge status={amslerAssessment.rightEye?.status || 'NO_DISTORTION'} />
            </div>
            <div className="text-sm font-bold text-slate-900">
              OD: {amslerAssessment.rightEye?.status?.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-slate-500">
              OS: {amslerAssessment.leftEye?.status?.replace(/_/g, ' ')}
            </div>
          </div>
        )}
      </div>

      {/* Operator Notes Field */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          Store Operator Field Notes & Observations
        </label>
        <textarea
          rows={3}
          value={operatorNotes}
          onChange={(e) => onUpdateOperatorNotes(e.target.value)}
          placeholder="Enter any behavioral observations, head tilting, squinting, customer fatigue, or reported eye discomfort..."
          className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500">
        <span className="font-bold text-slate-700">Non-Diagnostic Notice: </span>
        {session.disclaimer}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsIncompleteModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
        >
          Mark Incomplete / Customer Left
        </button>

        <button
          type="button"
          onClick={() => onFinalize(false)}
          className="px-8 py-3 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 shadow-md flex items-center space-x-2 transition-all active:scale-95"
        >
          <span>Finalize & Submit for Tele-Optometry Review</span>
          <CheckCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Incomplete Modal */}
      {isIncompleteModalOpen && (
        <div className="fixed inset-0 z-[105] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">Mark Screening Incomplete</h3>
            <p className="text-xs text-slate-600">
              Specify the reason why the screening could not be finished completely:
            </p>
            <input
              type="text"
              value={incompleteReason}
              onChange={(e) => setIncompleteReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsIncompleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsIncompleteModalOpen(false);
                  onFinalize(true, incompleteReason);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700"
              >
                Confirm Incomplete Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

