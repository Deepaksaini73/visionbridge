import React from 'react';
import { Eye, Check, AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react';
import { AmslerResultStatus } from '@shared/config/screeningConfig';
import { AmslerGridEyeResult } from '@shared/types';

interface AmslerGridProps {
  eye: 'RIGHT' | 'LEFT';
  result: AmslerGridEyeResult;
  onChange: (updated: AmslerGridEyeResult) => void;
  language?: 'en' | 'hi';
}

export const AmslerGrid: React.FC<AmslerGridProps> = ({
  eye,
  result,
  onChange,
  language = 'hi',
}) => {
  const isRightEye = eye === 'RIGHT';

  const statusOptions: Array<{
    value: AmslerResultStatus;
    labelEn: string;
    labelHi: string;
    descEn: string;
    descHi: string;
    isAbnormal?: boolean;
  }> = [
    {
      value: 'NO_DISTORTION',
      labelEn: 'Normal: Lines are Straight',
      labelHi: 'सामान्य: सभी रेखाएँ सीधी व स्पष्ट हैं',
      descEn: 'All grid squares appear uniform, straight, and parallel with no breaks or waves.',
      descHi: 'ग्रिड की सभी लाइनें सीधी, समानांतर और बिना किसी झुकाव के दिख रही हैं।',
    },
    {
      value: 'WAVY_LINES',
      labelEn: 'Wavy / Curved Lines (Metamorphopsia)',
      labelHi: 'लहरदार या टेढ़ी रेखाएँ (Wavy Lines)',
      descEn: 'Customer perceives straight lines as wavy, bent, or distorted near center or periphery.',
      descHi: 'ग्राहक को सीधी लाइनें मुड़ी हुई, लहरदार या टेढ़ी दिखाई दे रही हैं।',
      isAbnormal: true,
    },
    {
      value: 'MISSING_AREAS',
      labelEn: 'Missing / Dark Areas (Scotoma)',
      labelHi: 'गायब हिस्से या अंधे धब्बे (Dark Patches)',
      descEn: 'Portions of the grid appear missing, blank, obscured, or greyed out.',
      descHi: 'ग्रिड का कोई हिस्सा खाली, गायब या काला धब्बा जैसा दिख रहा है।',
      isAbnormal: true,
    },
    {
      value: 'BLURRED_AREAS',
      labelEn: 'Localized Blur / Haze',
      labelHi: 'धुंधले या अस्पष्ट हिस्से',
      descEn: 'Certain zones appear blurry or smeared despite reading spectacles.',
      descHi: 'ग्रिड का कुछ हिस्सा धुंधला या अस्पष्ट महसूस हो रहा है।',
      isAbnormal: true,
    },
    {
      value: 'OTHER',
      labelEn: 'Other Subjective Anomaly',
      labelHi: 'अन्य असामान्य अनुभव',
      descEn: 'Customer reports other visual irregularities (e.g. shimmer, color tint, pulsating).',
      descHi: 'ग्राहक किसी अन्य प्रकार की परेशानी या चमक की सूचना दे रहा है।',
      isAbnormal: true,
    },
    {
      value: 'UNABLE_TO_COMPLETE',
      labelEn: 'Unable to Complete / Inconclusive',
      labelHi: 'जांच पूरी करने में असमर्थ',
      descEn: 'Customer unable to maintain fixation or understand instructions.',
      descHi: 'ग्राहक निर्देश समझने या केंद्र पर ध्यान केंद्रित रखने में असमर्थ रहा।',
    },
  ];

  const handleSelectStatus = (val: AmslerResultStatus) => {
    const isAbnormal = val !== 'NO_DISTORTION' && val !== 'UNABLE_TO_COMPLETE';
    const distortionTypes = isAbnormal ? [val] : [];
    onChange({
      ...result,
      tested: true,
      status: val,
      distortionTypes,
    });
  };

  const handleNotesChange = (notesText: string) => {
    onChange({
      ...result,
      tested: true,
      notes: notesText,
    });
  };

  // Generate 20x20 grid lines (grid size 300x300 px)
  const gridSize = 280;
  const divisions = 20;
  const step = gridSize / divisions;

  return (
    <div className="space-y-6">
      
      {/* Eye & Protocol Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
            {isRightEye ? 'OD' : 'OS'}
          </div>
          <div>
            <h3 className="font-bold text-xs text-navy-950 uppercase tracking-wide">
              {isRightEye 
                ? (language === 'hi' ? 'दाहिनी आँख की जांच (Right Eye - OD)' : 'Right Eye (OD) Evaluation')
                : (language === 'hi' ? 'बाईं आँख की जांच (Left Eye - OS)' : 'Left Eye (OS) Evaluation')}
            </h3>
            <p className="text-[11px] text-teal-800">
              {isRightEye
                ? (language === 'hi' ? 'कृपया ग्राहक की बाईं आँख ढकने को कहें। (Cover LEFT eye)' : 'Customer gently covers LEFT eye.')
                : (language === 'hi' ? 'कृपया ग्राहक की दाहिनी आँख ढकने को कहें। (Cover RIGHT eye)' : 'Customer gently covers RIGHT eye.')}
            </p>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
          👓 {language === 'hi' ? 'रीडिंग चश्मा पहनाएं (यदि लगाते हों)' : 'Wear reading glasses if applicable'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left: The Amsler Grid Graphic (Crisp High-Contrast Canvas/SVG) */}
        <div className="md:col-span-5 flex flex-col items-center space-y-3">
          <div 
            className="p-4 bg-white rounded-2xl shadow-healthcare-md border-2 border-slate-300 flex items-center justify-center select-none"
            style={{ width: gridSize + 32, height: gridSize + 32 }}
          >
            <svg
              width={gridSize}
              height={gridSize}
              viewBox={`0 0 ${gridSize} ${gridSize}`}
              className="bg-white"
              shapeRendering="crispEdges"
            >
              {/* Outer Border */}
              <rect
                x={0}
                y={0}
                width={gridSize}
                height={gridSize}
                fill="none"
                stroke="#0f172a"
                strokeWidth={2}
              />

              {/* Vertical & Horizontal Grid Lines */}
              {Array.from({ length: divisions - 1 }).map((_, i) => {
                const pos = (i + 1) * step;
                return (
                  <React.Fragment key={i}>
                    {/* Vertical line */}
                    <line
                      x1={pos}
                      y1={0}
                      x2={pos}
                      y2={gridSize}
                      stroke="#475569"
                      strokeWidth={1}
                    />
                    {/* Horizontal line */}
                    <line
                      x1={0}
                      y1={pos}
                      x2={gridSize}
                      y2={pos}
                      stroke="#475569"
                      strokeWidth={1}
                    />
                  </React.Fragment>
                );
              })}

              {/* Central Fixation Dot */}
              <circle
                cx={gridSize / 2}
                cy={gridSize / 2}
                r={4.5}
                fill="#0f172a"
              />
            </svg>
          </div>

          <p className="text-[10px] text-slate-500 text-center max-w-[280px]">
            {language === 'hi'
              ? 'निर्देश: फोन को लगभग 35 सेमी दूरी पर रखें और केवल बीच वाले काले बिंदु को देखें।'
              : 'Hold screen approx 35cm away. Customer must fixate continuously on the center black dot.'}
          </p>
        </div>

        {/* Right: Observation Selector */}
        <div className="md:col-span-7 space-y-3">
          <label className="block text-xs font-bold text-navy-950 uppercase tracking-wide">
            {language === 'hi' ? 'ग्राहक द्वारा बताया गया अनुभव दर्ज करें:' : 'Record Customer Response:'}
          </label>

          <div className="space-y-2">
            {statusOptions.map((opt) => {
              const isSelected = result.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectStatus(opt.value)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start justify-between ${
                    isSelected
                      ? opt.isAbnormal
                        ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200 text-rose-950'
                        : 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-200 text-teal-950 font-semibold'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="font-semibold text-xs">
                      {language === 'hi' ? opt.labelHi : opt.labelEn}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {language === 'hi' ? opt.descHi : opt.descEn}
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? opt.isAbnormal ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white'
                      : 'border border-slate-300 text-transparent'
                  }`}>
                    <Check className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional notes text */}
          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {language === 'hi' ? 'अतिरिक्त टिप्पणी (वैकल्पिक):' : 'Operator Observation Notes (Optional):'}
            </label>
            <input
              type="text"
              value={result.notes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'उदा. केंद्र के पास बाईं ओर हल्का सा मुड़ाव दिखता है...'
                  : 'e.g. Mild distortion reported in upper nasal quadrant...'
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-500"
            />
          </div>

        </div>

      </div>

      {/* Clinical notice */}
      <div className="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-600 flex items-start gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Preliminary Screening Notice:</strong> Amsler assessment is subjective. It does not diagnose macular degeneration, and a normal response does not rule out retinal or optic pathway conditions.
        </span>
      </div>

    </div>
  );
};

