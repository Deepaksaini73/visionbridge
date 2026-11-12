import React, { useState } from 'react';
import { EyeTested, NearAcuityResult, NearAcuityTrial } from '../../types/screening';
import { EyeSelection } from '../../components/EyeSelection';
import { TestResultSummary } from '../../components/TestResultSummary';
import { NEAR_ACUITY_LEVELS } from '@shared/config/screeningConfig';
import { Check, X, BookOpen, AlertCircle } from 'lucide-react';

interface NearAcuityModuleProps {
  onComplete: (result: NearAcuityResult) => void;
  onSkip?: () => void;
}

export const NearAcuityModule: React.FC<NearAcuityModuleProps> = ({ onComplete, onSkip }) => {
  const [activeEye, setActiveEye] = useState<EyeTested>('RIGHT');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0); // 0 corresponds to N36
  const [trials, setTrials] = useState<NearAcuityTrial[]>([]);
  const [odScore, setOdScore] = useState<string | null>(null);
  const [osScore, setOsScore] = useState<string | null>(null);
  const [ouScore, setOuScore] = useState<string | null>(null);
  const [showingSummary, setShowingSummary] = useState(false);

  const currentLevel = NEAR_ACUITY_LEVELS[currentLevelIndex] || NEAR_ACUITY_LEVELS[0];

  const handleLevelResult = (isLegible: boolean) => {
    const trial: NearAcuityTrial = {
      eye: activeEye,
      level: currentLevel.level,
      nPoint: currentLevel.nPoint,
      isCorrect: isLegible,
    };
    const updatedTrials = [...trials, trial];
    setTrials(updatedTrials);

    if (isLegible && currentLevelIndex < NEAR_ACUITY_LEVELS.length - 1) {
      // Advance to next finer near text
      setCurrentLevelIndex(prev => prev + 1);
    } else {
      // Reached limit for this eye
      const score = isLegible ? currentLevel.nPoint : (currentLevelIndex > 0 ? NEAR_ACUITY_LEVELS[currentLevelIndex - 1].nPoint : 'Unable to read N36');

      if (activeEye === 'RIGHT') {
        setOdScore(score);
        setActiveEye('LEFT');
        setCurrentLevelIndex(0);
      } else if (activeEye === 'LEFT') {
        setOsScore(score);
        setActiveEye('BOTH');
        setCurrentLevelIndex(0);
      } else {
        setOuScore(score);
        setShowingSummary(true);
      }
    }
  };

  const handleRepeat = () => {
    setTrials([]);
    setOdScore(null);
    setOsScore(null);
    setOuScore(null);
    setActiveEye('RIGHT');
    setCurrentLevelIndex(0);
    setShowingSummary(false);
  };

  if (showingSummary && odScore && osScore && ouScore) {
    const isPresbyopic = odScore === 'N18' || odScore === 'N24' || odScore === 'N36';

    return (
      <TestResultSummary
        title="Near Visual Acuity Screening Summary"
        subtitle="Evaluated at 40 cm reading distance"
        status="COMPLETED"
        metrics={[
          {
            label: 'Right Eye (OD) Near',
            value: odScore,
            subValue: 'Monocular Reading Acuity',
          },
          {
            label: 'Left Eye (OS) Near',
            value: osScore,
            subValue: 'Monocular Reading Acuity',
          },
          {
            label: 'Binocular (OU) Near',
            value: ouScore,
            subValue: 'Both Eyes Reading Acuity',
            isWarning: isPresbyopic,
          },
        ]}
        notes={`Distance confirmed: 40 cm. Reading threshold reached: ${ouScore}. Presbyopia or near refractive adjustment recommended if <= N12.`}
        onRepeat={handleRepeat}
        onContinue={() =>
          onComplete({
            tested: true,
            rightEyeScore: odScore,
            leftEyeScore: osScore,
            binocularScore: ouScore,
            testedDistanceCm: 40,
            status: 'COMPLETED',
            trials,
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
          setActiveEye(eye);
          setCurrentLevelIndex(0);
        }}
        allowBinocular={true}
      />

      {/* Near Reading Box */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 font-bold text-teal-700">
            <BookOpen className="w-4 h-4" />
            <span>Near Point: {currentLevel.nPoint} ({currentLevel.snellenEquivalent})</span>
          </div>
          <span>Reading Distance: Exactly 40 cm</span>
        </div>

        {/* Text paragraph sized according to standard point sizes */}
        <div className="max-w-xl text-center space-y-4 px-4">
          <p
            style={{
              fontSize: `${Math.max(12, Math.round(currentLevel.standardHeightMmAt40cm * 3.8 * 2.2))}px`,
              lineHeight: 1.4,
            }}
            className="text-slate-900 font-serif font-medium transition-all"
          >
            {currentLevel.sampleSentenceEn}
          </p>

          <p
            style={{
              fontSize: `${Math.max(12, Math.round(currentLevel.standardHeightMmAt40cm * 3.8 * 2.2))}px`,
              lineHeight: 1.4,
            }}
            className="text-slate-700 font-serif transition-all"
          >
            {currentLevel.sampleSentenceHi}
          </p>
        </div>

        <div className="mt-8 text-xs text-slate-400">
          Ask customer to read the text aloud clearly without leaning forward.
        </div>
      </div>

      {/* Operator Verification Buttons */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => handleLevelResult(true)}
          className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 shadow-sm flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <Check className="w-5 h-5" />
          <span>Customer Read Fluently (स्पष्ट पढ़ा)</span>
        </button>

        <button
          type="button"
          onClick={() => handleLevelResult(false)}
          className="w-full sm:w-auto px-8 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 shadow-sm flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
          <span>Blurred / Straining / Unable to Read (धुंधला / नहीं पढ़ पाए)</span>
        </button>
      </div>

      {onSkip && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Skip Near Acuity Module
          </button>
        </div>
      )}
    </div>
  );
};
