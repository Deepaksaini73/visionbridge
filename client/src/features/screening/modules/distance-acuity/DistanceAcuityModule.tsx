import React, { useState, useEffect } from 'react';
import { EyeTested, DistanceEyeResult, DistanceAcuityTrial, TumblingEDirection, OptotypeType } from '../../types/screening';
import { EyeSelection } from '../../components/EyeSelection';
import { TestProgress } from '../../components/TestProgress';
import { TestResponse } from '../../components/TestResponse';
import { TestResultSummary } from '../../components/TestResultSummary';
import {
  ACUITY_LEVELS,
  generateRandomOrientations,
  getTumblingESvgPath,
  DIRECTION_ROTATION_DEGREES,
  SLOAN_LETTERS,
} from '@shared/config/screeningConfig';
import { calculateOptotypePixels, getLandoltCSvgPath } from '../../utils/svgOptotypes';

interface DistanceAcuityModuleProps {
  viewingDistanceMeters: number;
  pixelsPerMm?: number;
  onComplete: (results: {
    rightEye: DistanceEyeResult;
    leftEye: DistanceEyeResult;
    trials: DistanceAcuityTrial[];
  }) => void;
  onSkip?: () => void;
}

export const DistanceAcuityModule: React.FC<DistanceAcuityModuleProps> = ({
  viewingDistanceMeters,
  pixelsPerMm,
  onComplete,
  onSkip,
}) => {
  const [activeEye, setActiveEye] = useState<EyeTested>('RIGHT');
  const [optotypeType, setOptotypeType] = useState<OptotypeType>('TUMBLING_E');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0); // 0 corresponds to Level 1
  const [trialIndexInLevel, setTrialIndexInLevel] = useState(0); // 0 to 3
  const [levelOrientations, setLevelOrientations] = useState<TumblingEDirection[]>(() => generateRandomOrientations(4));
  const [allTrials, setAllTrials] = useState<DistanceAcuityTrial[]>([]);
  const [recentLevelResults, setRecentLevelResults] = useState<boolean[]>([]);
  const [odResult, setOdResult] = useState<DistanceEyeResult | null>(null);
  const [osResult, setOsResult] = useState<DistanceEyeResult | null>(null);
  const [showingSummary, setShowingSummary] = useState(false);

  const currentLevelConfig = ACUITY_LEVELS[currentLevelIndex] || ACUITY_LEVELS[0];
  const currentDirection = levelOrientations[trialIndexInLevel] || 'RIGHT';

  // Compute optotype height in pixels
  const optotypePixels = calculateOptotypePixels(
    currentLevelConfig.standardHeightMmAt3m,
    viewingDistanceMeters,
    pixelsPerMm
  );

  const handleResponse = (userResponse: TumblingEDirection) => {
    const isCorrect = userResponse === currentDirection;
    const newTrial: DistanceAcuityTrial = {
      eye: activeEye as 'RIGHT' | 'LEFT',
      level: currentLevelConfig.level,
      optotypeLevel: currentLevelConfig.snellenMeters,
      directionPresented: currentDirection,
      userResponse,
      isCorrect,
      trialIndex: allTrials.length + 1,
    };

    const updatedTrials = [...allTrials, newTrial];
    setAllTrials(updatedTrials);

    const updatedRecent = [...recentLevelResults, isCorrect];
    setRecentLevelResults(updatedRecent);

    // If level has remaining trials (total 4 per level)
    if (trialIndexInLevel < 3) {
      setTrialIndexInLevel(prev => prev + 1);
    } else {
      // Completed 4 trials for this level. Evaluate pass/fail (>= 3/4 correct = 75%)
      const correctInLevel = updatedRecent.filter(Boolean).length;
      const passed = correctInLevel >= 3;

      if (passed && currentLevelIndex < ACUITY_LEVELS.length - 1) {
        // Advance to next smaller level
        setCurrentLevelIndex(prev => prev + 1);
        setTrialIndexInLevel(0);
        setLevelOrientations(generateRandomOrientations(4));
        setRecentLevelResults([]);
      } else {
        // Test ended for this eye
        const eyeTrials = updatedTrials.filter(t => t.eye === activeEye);
        const highestPassedLevel = passed ? currentLevelConfig.level : Math.max(0, currentLevelConfig.level - 1);
        const highestConfig = (ACUITY_LEVELS as any[]).find((l: any) => l.level === highestPassedLevel);

        const resultData: DistanceEyeResult = {
          tested: true,
          preliminaryScore: highestPassedLevel > 0 ? `Level ${highestPassedLevel} (~${highestConfig?.snellenMeters} at ${viewingDistanceMeters}m)` : 'Below Level 1 (< 6/60)',
          rawLevel: highestPassedLevel,
          snellenEquivalent: highestConfig ? highestConfig.snellenMeters : '< 6/60',
          totalTrials: eyeTrials.length,
          correctTrials: eyeTrials.filter(t => t.isCorrect).length,
          status: 'COMPLETED',
          trials: eyeTrials,
        };

        if (activeEye === 'RIGHT') {
          setOdResult(resultData);
          // Switch to Left Eye
          setActiveEye('LEFT');
          setCurrentLevelIndex(0);
          setTrialIndexInLevel(0);
          setLevelOrientations(generateRandomOrientations(4));
          setRecentLevelResults([]);
        } else {
          setOsResult(resultData);
          setShowingSummary(true);
        }
      }
    }
  };

  const handleUnsure = () => {
    // Treat as incorrect response in the opposite direction
    const wrong = currentDirection === 'UP' ? 'DOWN' : 'UP';
    handleResponse(wrong);
  };

  const handleRepeatEye = () => {
    setAllTrials([]);
    setRecentLevelResults([]);
    setCurrentLevelIndex(0);
    setTrialIndexInLevel(0);
    setLevelOrientations(generateRandomOrientations(4));
    setOdResult(null);
    setOsResult(null);
    setActiveEye('RIGHT');
    setShowingSummary(false);
  };

  if (showingSummary && odResult && osResult) {
    const isAsymmetric = Math.abs(odResult.rawLevel - osResult.rawLevel) >= 2;

    return (
      <TestResultSummary
        title="Distance Visual Acuity Evaluation Summary"
        subtitle={`Completed at ${viewingDistanceMeters}m viewing distance`}
        status={isAsymmetric ? 'INCONCLUSIVE' : 'COMPLETED'}
        metrics={[
          {
            label: 'Right Eye (OD) Acuity',
            value: odResult.snellenEquivalent || 'N/A',
            subValue: `${odResult.correctTrials} of ${odResult.totalTrials} correct (${odResult.preliminaryScore})`,
          },
          {
            label: 'Left Eye (OS) Acuity',
            value: osResult.snellenEquivalent || 'N/A',
            subValue: `${osResult.correctTrials} of ${osResult.totalTrials} correct (${osResult.preliminaryScore})`,
          },
          {
            label: 'Interocular Disparity',
            value: isAsymmetric ? 'Significant Asymmetry' : 'Symmetric Vision',
            subValue: isAsymmetric ? 'Disparity >= 2 acuity levels between eyes' : 'Disparity < 2 acuity levels',
            isWarning: isAsymmetric,
          },
        ]}
        notes={`Conducted using ${optotypeType}. Total stimuli: ${allTrials.length}. Target physical calibration: ${pixelsPerMm ? 'Calibrated' : 'Uncalibrated'}.`}
        onRepeat={handleRepeatEye}
        onContinue={() => onComplete({ rightEye: odResult, leftEye: osResult, trials: allTrials })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Eye Occlusion Guidance */}
      <EyeSelection
        currentEye={activeEye}
        onSelectEye={(eye) => {
          if (eye !== 'BOTH') {
            setActiveEye(eye);
            setCurrentLevelIndex(0);
            setTrialIndexInLevel(0);
            setLevelOrientations(generateRandomOrientations(4));
            setRecentLevelResults([]);
          }
        }}
        allowBinocular={false}
      />

      {/* Progress within current level */}
      <TestProgress
        currentTrialIndex={trialIndexInLevel}
        totalTrialsInLevel={4}
        levelLabel={currentLevelConfig.label}
        snellenOrValue={`${currentLevelConfig.snellenMeters} (${currentLevelConfig.snellenFeet})`}
        recentResults={recentLevelResults}
        passingThresholdText="At least 3 of 4 correct required to advance to smaller optotypes"
      />

      {/* Stimulus Presentation Container */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[320px] shadow-sm relative select-none">
        <div className="absolute top-3 left-4 text-xs font-semibold text-slate-400">
          Viewing Distance: {viewingDistanceMeters}m • Screen Target Size: {optotypePixels}px
        </div>

        {/* Optotype Type Switcher in top right */}
        <div className="absolute top-3 right-4 flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setOptotypeType('TUMBLING_E')}
            className={`px-2 py-0.5 rounded ${optotypeType === 'TUMBLING_E' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'}`}
          >
            Tumbling-E
          </button>
          <button
            type="button"
            onClick={() => setOptotypeType('LANDOLT_C')}
            className={`px-2 py-0.5 rounded ${optotypeType === 'LANDOLT_C' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'}`}
          >
            Landolt-C
          </button>
        </div>

        {/* The Optotype Stimulus */}
        <div
          style={{ width: `${optotypePixels}px`, height: `${optotypePixels}px` }}
          className="flex items-center justify-center transition-all duration-150"
        >
          {optotypeType === 'TUMBLING_E' ? (
            <svg
              viewBox="0 0 100 100"
              width="100%"
              height="100%"
              style={{
                transform: `rotate(${DIRECTION_ROTATION_DEGREES[currentDirection]}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <path d={getTumblingESvgPath()} fill="#0f172a" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 100 100"
              width="100%"
              height="100%"
              style={{
                transform: `rotate(${DIRECTION_ROTATION_DEGREES[currentDirection]}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <path d={getLandoltCSvgPath()} fill="#0f172a" />
            </svg>
          )}
        </div>

        <div className="mt-6 text-xs text-slate-400">
          Ask customer: "Which direction are the limbs opening towards?"
        </div>
      </div>

      {/* Operator Response Controls */}
      <TestResponse
        mode="DIRECTIONAL"
        onSelectDirection={handleResponse}
        onUnsure={handleUnsure}
      />

      {/* Skip / Advance options */}
      {onSkip && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Skip Distance Acuity Module
          </button>
        </div>
      )}
    </div>
  );
};
