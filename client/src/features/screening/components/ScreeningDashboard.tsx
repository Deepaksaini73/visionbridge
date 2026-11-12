import React, { useState } from 'react';
import { ScreeningModuleId, ScreeningModuleMeta, DeviceCalibrationState } from '../types/screening';
import { SCREENING_MODULES } from '@shared/config/screeningConfig';
import { CheckSquare, Square, Play, Sliders, Clock, Sparkles, AlertCircle } from 'lucide-react';

interface ScreeningDashboardProps {
  customerName: string;
  customerCode: string;
  calibration: DeviceCalibrationState;
  selectedModules: ScreeningModuleId[];
  onToggleModule: (id: ScreeningModuleId) => void;
  onOpenCalibration: () => void;
  onStartSession: () => void;
}

export const ScreeningDashboard: React.FC<ScreeningDashboardProps> = ({
  customerName,
  customerCode,
  calibration,
  selectedModules,
  onToggleModule,
  onOpenCalibration,
  onStartSession,
}) => {
  const totalDuration = selectedModules.reduce((acc, id) => {
    const meta = (SCREENING_MODULES as ScreeningModuleMeta[]).find((m: ScreeningModuleMeta) => m.id === id);
    return acc + (meta?.estimatedDurationMins || 2);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner with Customer Demographics and Calibration Pill */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
            Preliminary Screening Suite Setup
          </span>
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">
            {customerName} <span className="text-sm font-normal text-slate-500 font-mono">({customerCode})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Choose which visual function screening tests to conduct for this customer.
          </p>
        </div>

        {/* Calibration button & status */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onOpenCalibration}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center space-x-2 transition-all shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-teal-600" />
            <span>Display Calibration ({calibration.calibrationStatus === 'CALIBRATED_PHYSICAL' ? 'Calibrated' : 'Uncalibrated'})</span>
          </button>
        </div>
      </div>

      {/* Module Selection Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Select Visual Function Modules ({selectedModules.length} Selected • Est. {totalDuration} Mins)
          </h2>
          <div className="text-xs text-slate-500">
            Click module to include or exclude
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(SCREENING_MODULES as ScreeningModuleMeta[]).map((module: ScreeningModuleMeta) => {
            const isSelected = selectedModules.includes(module.id);

            return (
              <div
                key={module.id}
                onClick={() => onToggleModule(module.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-teal-50/40 border-teal-500 shadow-sm'
                    : 'bg-white border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-teal-600 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{module.nameEn}</h3>
                      <p className="text-xs text-teal-700 font-medium">{module.nameHi}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                    module.priority === 'VERY_HIGH'
                      ? 'bg-emerald-100 text-emerald-800'
                      : module.priority === 'HIGH'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {module.priority.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2.5 ml-7">
                  {module.descriptionEn}
                </p>

                <div className="mt-3 ml-7 flex items-center space-x-3 text-[11px] text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>~{module.estimatedDurationMins} mins</span>
                  </span>
                  <span>•</span>
                  <span>{module.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Session Action */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          Selected: <strong className="text-slate-800">{selectedModules.length} module(s)</strong>.
          You can pause, resume, or skip individual tests at any time during the session.
        </div>

        <button
          type="button"
          disabled={selectedModules.length === 0}
          onClick={onStartSession}
          className="w-full sm:w-auto px-8 py-3 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 shadow-md flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Launch Screening Session ({selectedModules.length} Tests)</span>
        </button>
      </div>
    </div>
  );
};
