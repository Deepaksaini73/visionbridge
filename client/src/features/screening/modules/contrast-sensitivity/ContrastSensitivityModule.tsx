import React, { useState } from 'react';
import { ContrastSensitivityResult, ContrastTrial, TumblingEDirection } from '../../types/screening';
import { TestResponse } from '../../components/TestResponse';
import { TestResultSummary } from '../../components/TestResultSummary';
import {
  CONTRAST_STEPS,
  generateRandomOrientations,
  getTumblingESvgPath,
  DIRECTION_ROTATION_DEGREES,
  CONTRAST_PROTOTYPE_NOTICE_EN,
} from '@shared/config/screeningConfig';
import { evaluateContrastGrade, getOptotypeColorForContrast } from '../../utils/contrastCalculations';
import { AlertCircle, Sliders } from 'lucide-react';

interface ContrastSensitivityModuleProps {
  onComplete: (result: ContrastSensitivityResult) => void;
  onSkip?: () => void;
}

export const ContrastSensitivityModule: React.FC<ContrastSensitivityModuleProps> = ({
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 corresponds to Step 1 (100% contrast)
  const [stepOrientations, setStepOrientations] = useState<TumblingEDirection[]>(() => generateRandomOrientations(2));
  const [trialInStep, setTrialInStep] = useState(0);
  const [stepTrials, setStepTrials] = useState<ContrastTrial[]>([]);
  const [showingSummary, setShowingSummary] = useState(false);
  const [finalResult, setFinalResult] = useState<ContrastSensitivityResult | null>(null);

  const currentStep = CONTRAST_STEPS[currentStepIndex] || CONTRAST_STEPS[0];
  const currentDirection = stepOrientations[trialInStep] || 'RIGHT';
  const optotypeColor = getOptotypeColorForContrast(currentStep.weberContrastPct);

  const handleResponse = (response: TumblingEDirection) => {
    const isCorrect = response === currentDirection;
    const newTrial: ContrastTrial = {
      step: currentStep.step,
      weberContrastPct: currentStep.weberContrastPct,
      directionPresented: currentDirection,
      userResponse: response,
      isCorrect,
    };
    const updatedTrials = [...stepTrials, newTrial];
    setStepTrials(updatedTrials);

    if (isCorrect) {
      if (trialInStep === 0) {
        // Need second confirmation at this step
        setTrialInStep(1);
      } else {
        // Passed both trials in this step
        if (currentStepIndex < CONTRAST_STEPS.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
          setTrialInStep(0);
          setStepOrientations(generateRandomOrientations(2));
        } else {
          // Reached the lowest contrast step successfully
          finalizeTest(currentStep.logCS, currentStep.weberContrastPct, updatedTrials);
        }
      }
    } else {
      // Failed at this contrast step. Score is previous passed step or 0.00
      const passedStep = currentStepIndex > 0 ? CONTRAST_STEPS[currentStepIndex - 1] : CONTRAST_STEPS[0];
      const finalLog = currentStepIndex > 0 ? passedStep.logCS : 0.00;
      const finalWeber = currentStepIndex > 0 ? passedStep.weberContrastPct : 100.0;
      finalizeTest(finalLog, finalWeber, updatedTrials);
    }
  };

  const handleUnsure = () => {
    const wrong = currentDirection === 'UP' ? 'DOWN' : 'UP';
    handleResponse(wrong);
  };

  const finalizeTest = (logCS: number, weberPct: number, trials: ContrastTrial[]) => {
    const evalResult = evaluateContrastGrade(logCS);
    const result: ContrastSensitivityResult = {
      tested: true,
      logCSScore: logCS,
      weberContrastPct: weberPct,
      contrastGrade: evalResult.grade,
      testedEye: 'BINOCULAR',
      status: 'COMPLETED',
      trials,
    };
    setFinalResult(result);
    setShowingSummary(true);
  };

  const handleRepeat = () => {
    setCurrentStepIndex(0);
    setTrialInStep(0);
    setStepOrientations(generateRandomOrientations(2));
    setStepTrials([]);
    setShowingSummary(false);
    setFinalResult(null);
  };

  if (showingSummary && finalResult) {
    const evalData = evaluateContrastGrade(finalResult.logCSScore);

    return (
      <TestResultSummary
        title="Contrast Sensitivity Screening Result"
        subtitle="Evaluated using diminishing Weber contrast steps"
        status={evalData.isAbnormal ? 'INCONCLUSIVE' : 'COMPLETED'}
        metrics={[
          {
            label: 'Contrast Threshold',
            value: `${finalResult.logCSScore.toFixed(2)} LogCS`,
            subValue: `Weber Contrast: ${finalResult.weberContrastPct}%`,
          },
          {
            label: 'Clinical Grade',
            value: evalData.labelEn,
            subValue: evalData.descriptionEn,
            isWarning: evalData.isAbnormal,
          },
          {
            label: 'Normal Adult Benchmark',
            value: '≥ 1.65 LogCS',
            subValue: 'Mars & Pelli-Robson standard',
          },
        ]}
        notes={`Conducted with constant-size stimulus under ambient lighting. Screen prototype notice: ${CONTRAST_PROTOTYPE_NOTICE_EN}`}
        onRepeat={handleRepeat}
        onContinue={() => onComplete(finalResult)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Prototype Status Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-blue-900">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">SCREENING PROTOTYPE:</span> {CONTRAST_PROTOTYPE_NOTICE_EN}
        </div>
      </div>

      {/* Progress & Step Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 text-xs font-bold bg-blue-600 text-white rounded-md">
            Step {currentStep.step} of {CONTRAST_STEPS.length}
          </span>
          <span className="text-sm font-semibold text-slate-800">
            Weber Contrast: <span className="text-blue-700">{currentStep.weberContrastPct}%</span>
          </span>
          <span className="text-xs text-slate-500">
            ({currentStep.logCS.toFixed(2)} LogCS)
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Trial {trialInStep + 1} of 2
        </div>
      </div>

      {/* Stimulus Presentation Container (White background to benchmark Weber contrast) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[300px] shadow-sm relative select-none">
        <div
          style={{ width: '90px', height: '90px' }}
          className="flex items-center justify-center transition-all duration-200"
        >
          <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{
              transform: `rotate(${DIRECTION_ROTATION_DEGREES[currentDirection]}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <path d={getTumblingESvgPath()} fill={optotypeColor} />
          </svg>
        </div>

        <div className="mt-8 text-xs text-slate-400">
          Indicate orientation of the low-contrast optotype (UP, DOWN, LEFT, RIGHT).
        </div>
      </div>

      {/* Directional Pad */}
      <TestResponse
        mode="DIRECTIONAL"
        onSelectDirection={handleResponse}
        onUnsure={handleUnsure}
      />

      {onSkip && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Skip Contrast Sensitivity Module
          </button>
        </div>
      )}
    </div>
  );
};
