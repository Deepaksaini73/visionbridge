import React from 'react';
import { Check, X } from 'lucide-react';

interface TestProgressProps {
  currentTrialIndex: number;
  totalTrialsInLevel: number;
  levelLabel: string;
  snellenOrValue: string;
  recentResults?: boolean[];
  passingThresholdText?: string;
}

export const TestProgress: React.FC<TestProgressProps> = ({
  currentTrialIndex,
  totalTrialsInLevel,
  levelLabel,
  snellenOrValue,
  recentResults = [],
  passingThresholdText = 'Requires 3 of 4 correct to advance',
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 text-xs font-bold bg-teal-600 text-white rounded-md">
            {levelLabel}
          </span>
          <span className="text-sm font-semibold text-slate-800">
            Target: <span className="text-teal-700">{snellenOrValue}</span>
          </span>
          <span className="text-xs text-slate-500">
            (Trial {currentTrialIndex + 1} of {totalTrialsInLevel})
          </span>
        </div>

        {/* Passing threshold indicator */}
        <div className="text-xs text-slate-500 italic">
          {passingThresholdText}
        </div>
      </div>

      {/* Trial result dots */}
      <div className="mt-3 flex items-center space-x-2">
        {Array.from({ length: totalTrialsInLevel }).map((_, idx) => {
          const res = recentResults[idx];
          const isCurrent = idx === currentTrialIndex;

          return (
            <div
              key={idx}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                res === true
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : res === false
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                  : isCurrent
                  ? 'bg-teal-50 text-teal-700 border-teal-500 ring-2 ring-teal-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
            >
              {res === true ? (
                <Check className="w-3.5 h-3.5" />
              ) : res === false ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                idx + 1
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

