import React, { useState } from 'react';
import { ColourVisionResult, ColourVisionTrial } from '../../types/screening';
import { TestResponse } from '../../components/TestResponse';
import { TestResultSummary } from '../../components/TestResultSummary';
import {
  COLOUR_PLATES,
  COLOUR_PROTOTYPE_NOTICE_EN,
} from '@shared/config/screeningConfig';
import { generateProceduralPlate } from '../../utils/colourPlates';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ColourVisionModuleProps {
  onComplete: (result: ColourVisionResult) => void;
  onSkip?: () => void;
}

export const ColourVisionModule: React.FC<ColourVisionModuleProps> = ({ onComplete, onSkip }) => {
  const [currentPlateIndex, setCurrentPlateIndex] = useState(0); // 0 to 3
  const [trials, setTrials] = useState<ColourVisionTrial[]>([]);
  const [showingSummary, setShowingSummary] = useState(false);
  const [finalResult, setFinalResult] = useState<ColourVisionResult | null>(null);

  const currentPlateConfig = COLOUR_PLATES[currentPlateIndex] || COLOUR_PLATES[0];
  const dots = generateProceduralPlate(currentPlateConfig.plateIndex, 280);

  const handleDigitResponse = (userDigit: string) => {
    const isCorrect = userDigit === currentPlateConfig.expectedDigit;
    const newTrial: ColourVisionTrial = {
      plateIndex: currentPlateConfig.plateIndex,
      plateType: currentPlateConfig.plateType,
      expectedDigit: currentPlateConfig.expectedDigit,
      userResponse: userDigit,
      isCorrect,
    };

    const updatedTrials = [...trials, newTrial];
    setTrials(updatedTrials);

    if (currentPlateIndex < COLOUR_PLATES.length - 1) {
      setCurrentPlateIndex(prev => prev + 1);
    } else {
      finalizeColourVision(updatedTrials);
    }
  };

  const handleNothingVisible = () => {
    handleDigitResponse('NONE');
  };

  const finalizeColourVision = (recordedTrials: ColourVisionTrial[]) => {
    const total = recordedTrials.length;
    const correctCount = recordedTrials.filter(t => t.isCorrect).length;

    let classification: 'NORMAL_TRICHROMAT' | 'RED_GREEN_DEFICIENCY_SUSPECTED' | 'TOTAL_DEFICIENCY_SUSPECTED' | 'INCONCLUSIVE' = 'NORMAL_TRICHROMAT';

    // Demo plate (plateIndex 1) must be correct; if demo fails, test is inconclusive
    const demoTrial = recordedTrials.find(t => t.plateIndex === 1);
    const redGreenTrial = recordedTrials.find(t => t.plateIndex === 2);

    if (demoTrial && !demoTrial.isCorrect) {
      classification = 'INCONCLUSIVE';
    } else if (redGreenTrial && !redGreenTrial.isCorrect) {
      classification = 'RED_GREEN_DEFICIENCY_SUSPECTED';
    } else if (correctCount <= 1) {
      classification = 'TOTAL_DEFICIENCY_SUSPECTED';
    } else {
      classification = 'NORMAL_TRICHROMAT';
    }

    const result: ColourVisionResult = {
      tested: true,
      platesTotal: total,
      platesCorrect: correctCount,
      classification,
      status: 'COMPLETED',
      trials: recordedTrials,
    };

    setFinalResult(result);
    setShowingSummary(true);
  };

  const handleRepeat = () => {
    setCurrentPlateIndex(0);
    setTrials([]);
    setShowingSummary(false);
    setFinalResult(null);
  };

  if (showingSummary && finalResult) {
    const isDeficient = finalResult.classification !== 'NORMAL_TRICHROMAT';

    return (
      <TestResultSummary
        title="Colour Vision Assessment Summary"
        subtitle="Evaluated using procedural pseudoisochromatic simulation plates"
        status={finalResult.classification}
        metrics={[
          {
            label: 'Plates Identified',
            value: `${finalResult.platesCorrect} / ${finalResult.platesTotal}`,
            subValue: 'Demonstration and Discrimination Plates',
          },
          {
            label: 'Screening Classification',
            value: finalResult.classification.replace(/_/g, ' '),
            subValue: isDeficient ? 'Atypical red-green response flagged' : 'Normal Trichromacy indicated',
            isWarning: isDeficient,
          },
        ]}
        notes={`Conducted using 4 procedural plates. Screen gamut notice: ${COLOUR_PROTOTYPE_NOTICE_EN}`}
        onRepeat={handleRepeat}
        onContinue={() => onComplete(finalResult)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Prototype Caveat Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">SCREENING PROTOTYPE:</span> {COLOUR_PROTOTYPE_NOTICE_EN}
        </div>
      </div>

      {/* Plate Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs font-bold text-teal-700">
            Plate {currentPlateIndex + 1} of {COLOUR_PLATES.length}
          </span>
          <h3 className="text-sm font-bold text-slate-800">{currentPlateConfig.titleEn}</h3>
          <p className="text-xs text-slate-500">{currentPlateConfig.descriptionEn}</p>
        </div>
      </div>

      {/* SVG Plate Container */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[320px] shadow-sm select-none">
        <div className="w-[280px] h-[280px] rounded-full border-4 border-slate-200 shadow-inner flex items-center justify-center overflow-hidden bg-slate-50">
          <svg viewBox="0 0 280 280" width="100%" height="100%">
            {dots.map((dot, idx) => (
              <circle
                key={idx}
                cx={dot.cx}
                cy={dot.cy}
                r={dot.r}
                fill={dot.fill}
              />
            ))}
          </svg>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          Ask customer: "What number do you see in the circle of dots?"
        </div>
      </div>

      {/* Numeric Response Pad */}
      <TestResponse
        mode="NUMERIC"
        onSelectDigit={handleDigitResponse}
        onNothingVisible={handleNothingVisible}
      />

      {onSkip && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Skip Colour Vision Module
          </button>
        </div>
      )}
    </div>
  );
};
