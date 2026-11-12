import React from 'react';
import { ScreeningStatusBadge } from './ScreeningStatusBadge';
import { RotateCcw, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MetricItem {
  label: string;
  value: string;
  subValue?: string;
  isWarning?: boolean;
}

interface TestResultSummaryProps {
  title: string;
  subtitle: string;
  status: string;
  metrics: MetricItem[];
  notes?: string;
  onRepeat: () => void;
  onContinue: () => void;
  continueLabel?: string;
}

export const TestResultSummary: React.FC<TestResultSummaryProps> = ({
  title,
  subtitle,
  status,
  metrics,
  notes,
  onRepeat,
  onContinue,
  continueLabel = 'Proceed to Next Test',
}) => {
  const hasWarnings = metrics.some(m => m.isWarning);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <ScreeningStatusBadge status={status} size="md" />
      </div>

      <div className="p-6 space-y-6">
        {hasWarnings && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start space-x-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Clinical Observation:</span> Reduced performance or asymmetry detected. This observation has been tagged for optometrist review.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all ${
                m.isWarning
                  ? 'bg-amber-50/50 border-amber-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-xs font-semibold text-slate-500">{m.label}</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{m.value}</div>
              {m.subValue && (
                <div className="text-xs text-slate-500 mt-0.5">{m.subValue}</div>
              )}
            </div>
          ))}
        </div>

        {notes && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Observations: </span>
            {notes}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onRepeat}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repeat This Module (पुनः जांच करें)</span>
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-2.5 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 shadow flex items-center space-x-2 transition-all"
          >
            <span>{continueLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

