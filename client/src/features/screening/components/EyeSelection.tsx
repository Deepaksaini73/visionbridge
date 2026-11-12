import React from 'react';
import { EyeTested } from '../types/screening';
import { Eye, Shield, CheckCircle2 } from 'lucide-react';

interface EyeSelectionProps {
  currentEye: EyeTested;
  onSelectEye: (eye: EyeTested) => void;
  allowBinocular?: boolean;
}

export const EyeSelection: React.FC<EyeSelectionProps> = ({
  currentEye,
  onSelectEye,
  allowBinocular = true,
}) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Eye Under Evaluation
          </span>
          <div className="flex items-center space-x-2 mt-0.5">
            <h3 className="text-base font-bold text-slate-800">
              {currentEye === 'RIGHT' && 'Right Eye (OD - Oculus Dexter)'}
              {currentEye === 'LEFT' && 'Left Eye (OS - Oculus Sinister)'}
              {currentEye === 'BOTH' && 'Both Eyes (OU - Binocular Vision)'}
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-100 text-teal-800 rounded">
              {currentEye === 'RIGHT' ? 'Cover Left Eye' : currentEye === 'LEFT' ? 'Cover Right Eye' : 'Both Open'}
            </span>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => onSelectEye('RIGHT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1 ${
              currentEye === 'RIGHT'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Right Eye (OD)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectEye('LEFT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1 ${
              currentEye === 'LEFT'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Left Eye (OS)</span>
          </button>

          {allowBinocular && (
            <button
              type="button"
              onClick={() => onSelectEye('BOTH')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1 ${
                currentEye === 'BOTH'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Binocular (OU)</span>
            </button>
          )}
        </div>
      </div>

      {/* Occlusion banner */}
      <div className="mt-3 flex items-center space-x-2 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">
        <Shield className="w-4 h-4 text-teal-600 shrink-0" />
        <span>
          {currentEye === 'RIGHT' && 'Occlusion Guidance: Cover customer\'s left eye completely with an occluder or cupped palm. Do not apply pressure.'}
          {currentEye === 'LEFT' && 'Occlusion Guidance: Cover customer\'s right eye completely with an occluder or cupped palm. Do not apply pressure.'}
          {currentEye === 'BOTH' && 'Binocular Guidance: Both eyes remain unoccluded. Customer views screen naturally.'}
        </span>
      </div>
    </div>
  );
};

