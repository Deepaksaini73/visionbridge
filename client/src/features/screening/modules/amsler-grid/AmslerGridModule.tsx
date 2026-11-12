import React, { useState } from 'react';
import { EyeTested, AmslerAssessmentResult, AmslerEyeResult, AmslerResultStatus } from '../../types/screening';
import { EyeSelection } from '../../components/EyeSelection';
import { TestResultSummary } from '../../components/TestResultSummary';
import { Grid, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface AmslerGridModuleProps {
  onComplete: (result: AmslerAssessmentResult) => void;
  onSkip?: () => void;
}

export const AmslerGridModule: React.FC<AmslerGridModuleProps> = ({ onComplete, onSkip }) => {
  const [activeEye, setActiveEye] = useState<EyeTested>('RIGHT');
  const [odResult, setOdResult] = useState<AmslerEyeResult | null>(null);
  const [osResult, setOsResult] = useState<AmslerEyeResult | null>(null);

  const [currentStatus, setCurrentStatus] = useState<AmslerResultStatus>('NO_DISTORTION');
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [showingSummary, setShowingSummary] = useState(false);

  const toggleDistortion = (type: string) => {
    if (selectedDistortions.includes(type)) {
      setSelectedDistortions(selectedDistortions.filter(t => t !== type));
    } else {
      setSelectedDistortions([...selectedDistortions, type]);
      if (currentStatus === 'NO_DISTORTION') {
        setCurrentStatus('WAVY_LINES');
      }
    }
  };

  const toggleSector = (sector: string) => {
    if (selectedSectors.includes(sector)) {
      setSelectedSectors(selectedSectors.filter(s => s !== sector));
    } else {
      setSelectedSectors([...selectedSectors, sector]);
    }
  };

  const handleSaveEyeResult = () => {
    const eyeRes: AmslerEyeResult = {
      tested: true,
      status: selectedDistortions.length === 0 ? 'NO_DISTORTION' : currentStatus,
      distortionTypes: selectedDistortions,
      sectorsAffected: selectedSectors,
      notes: operatorNotes,
    };

    if (activeEye === 'RIGHT') {
      setOdResult(eyeRes);
      setActiveEye('LEFT');
      setCurrentStatus('NO_DISTORTION');
      setSelectedDistortions([]);
      setSelectedSectors([]);
      setOperatorNotes('');
    } else {
      setOsResult(eyeRes);
      setShowingSummary(true);
    }
  };

  const handleRepeat = () => {
    setOdResult(null);
    setOsResult(null);
    setActiveEye('RIGHT');
    setCurrentStatus('NO_DISTORTION');
    setSelectedDistortions([]);
    setSelectedSectors([]);
    setOperatorNotes('');
    setShowingSummary(false);
  };

  if (showingSummary && odResult && osResult) {
    const isAbnormal = odResult.status !== 'NO_DISTORTION' || osResult.status !== 'NO_DISTORTION';

    return (
      <TestResultSummary
        title="Amsler Grid Assessment Summary"
        subtitle="Monocular 20x20 macular screening completed"
        status={isAbnormal ? 'WAVY_LINES' : 'NO_DISTORTION'}
        metrics={[
          {
            label: 'Right Eye (OD) Grid',
            value: odResult.status.replace(/_/g, ' '),
            subValue: odResult.distortionTypes.join(', ') || 'Normal grid appearance',
            isWarning: odResult.status !== 'NO_DISTORTION',
          },
          {
            label: 'Left Eye (OS) Grid',
            value: osResult.status.replace(/_/g, ' '),
            subValue: osResult.distortionTypes.join(', ') || 'Normal grid appearance',
            isWarning: osResult.status !== 'NO_DISTORTION',
          },
          {
            label: 'Macular Risk Flag',
            value: isAbnormal ? 'Metamorphopsia / Defect' : 'No Distortion',
            subValue: isAbnormal ? 'Prompt ophthalmic examination recommended' : 'Screening within normal limits',
            isWarning: isAbnormal,
          },
        ]}
        notes={`Observations: ${odResult.notes || ''} ${osResult.notes || ''}`}
        onRepeat={handleRepeat}
        onContinue={() =>
          onComplete({
            performed: true,
            rightEye: odResult,
            leftEye: osResult,
            observations: `OD: ${odResult.status}, OS: ${osResult.status}. ${odResult.notes || ''} ${osResult.notes || ''}`.trim(),
          })
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Eye Occlusion */}
      <EyeSelection
        currentEye={activeEye}
        onSelectEye={(eye) => {
          if (eye !== 'BOTH') setActiveEye(eye);
        }}
        allowBinocular={false}
      />

      {/* Grid Stimulus + Sector Interactive Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Amsler 20x20 Grid Display */}
        <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center select-none shadow-md">
          <div className="text-xs text-slate-400 mb-2 font-mono">
            Focus eyes steadily on center white dot
          </div>

          <div className="relative w-[260px] h-[260px] bg-black border-2 border-white">
            {/* 20x20 Grid Lines */}
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              {Array.from({ length: 21 }).map((_, i) => (
                <React.Fragment key={i}>
                  {/* Vertical line */}
                  <line x1={i * 10} y1="0" x2={i * 10} y2="200" stroke="#ffffff" strokeWidth="0.8" />
                  {/* Horizontal line */}
                  <line x1="0" y1={i * 10} x2="200" y2={i * 10} stroke="#ffffff" strokeWidth="0.8" />
                </React.Fragment>
              ))}
              {/* Central White Fixation Dot */}
              <circle cx="100" cy="100" r="3.5" fill="#ffffff" />
            </svg>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 text-center">
            Viewing distance: 35-40 cm (with reading glasses if normally worn)
          </div>
        </div>

        {/* Observation Questionnaire & Sector Recording */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Customer Observations ({activeEye} Eye)</h3>
            <p className="text-xs text-slate-500">Ask the customer while they fixate on the central white dot:</p>
          </div>

          {/* Quick Status Buttons */}
          <div className="space-y-2">
            {[
              { id: 'METAMORPHOPSIA', label: 'Wavy, bent, or distorted lines (टेढ़ी रेखाएं)', isRed: true },
              { id: 'SCOTOMA', label: 'Missing, dark, or blank areas (गायब या काला धब्बा)', isRed: true },
              { id: 'BLURRED', label: 'Blurred patches / gray shadows (धुंधला क्षेत्र)', isRed: true },
            ].map((item) => (
              <label
                key={item.id}
                className={`flex items-center space-x-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  selectedDistortions.includes(item.id)
                    ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDistortions.includes(item.id)}
                  onChange={() => toggleDistortion(item.id)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          {/* Sectors affected */}
          {selectedDistortions.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                Which quadrants / sectors are affected?
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {['CENTRAL', 'SUPERIOR', 'INFERIOR', 'NASAL', 'TEMPORAL'].map((sector) => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => toggleSector(sector)}
                    className={`py-1.5 px-2 rounded border font-medium text-center transition-all ${
                      selectedSectors.includes(sector)
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emergency guidance alert */}
          {selectedDistortions.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-900 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>CLINICAL ALERT:</strong> Sudden metamorphopsia or central scotoma is a red-flag sign of macular pathology. Urgent optometrist review recommended.
              </div>
            </div>
          )}

          {/* Operator field notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Operator Field Notes ({activeEye})
            </label>
            <textarea
              rows={2}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. Customer noted gentle curvature in upper temporal lines..."
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSaveEyeResult}
              className="px-6 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 shadow flex items-center space-x-1.5"
            >
              <span>{activeEye === 'RIGHT' ? 'Save OD & Test Left Eye (OS)' : 'Complete Amsler Grid'}</span>
              <CheckCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {onSkip && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Skip Amsler Grid Module
          </button>
        </div>
      )}
    </div>
  );
};

