import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Ruler, 
  Sun, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  CreditCard,
  RotateCcw
} from 'lucide-react';
import { DeviceScreenCalibration, CalibrationStatus } from '@shared/types';
import { UNCALIBRATED_LIMITATION_NOTICE_EN, UNCALIBRATED_LIMITATION_NOTICE_HI } from '@shared/config/screeningConfig';

interface ScreeningCalibrationProps {
  calibration: DeviceScreenCalibration;
  onChange: (updated: DeviceScreenCalibration) => void;
  language?: 'en' | 'hi';
}

export const ScreeningCalibration: React.FC<ScreeningCalibrationProps> = ({
  calibration,
  onChange,
  language = 'hi',
}) => {
  const [showCardTool, setShowCardTool] = useState(false);
  const [cardWidthPx, setCardWidthPx] = useState(320); // adjustable card width in px

  // Auto-detect device metrics on initial mount if not populated
  useEffect(() => {
    const width = window.innerWidth || window.screen.width || 1920;
    const height = window.innerHeight || window.screen.height || 1080;
    const dpr = window.devicePixelRatio || 1;

    let detectedDevice: 'MOBILE' | 'TABLET' | 'DESKTOP' = 'DESKTOP';
    if (width < 640) detectedDevice = 'MOBILE';
    else if (width < 1024) detectedDevice = 'TABLET';

    onChange({
      ...calibration,
      deviceType: detectedDevice,
      viewportWidth: width,
      viewportHeight: height,
      devicePixelRatio: dpr,
    });
  }, []);

  const handleDistanceSelect = (dist: number) => {
    onChange({
      ...calibration,
      configuredDistanceMeters: dist,
      confirmedDistanceMeters: dist,
    });
  };

  const handleLightingSelect = (lighting: 'CONFIRMED_ADEQUATE' | 'DIM' | 'EXCESSIVE_GLARE') => {
    onChange({
      ...calibration,
      ambientLighting: lighting,
    });
  };

  const handleApplyCardCalibration = () => {
    // Standard ID-1 card is exactly 85.6 mm wide
    const physicalCardMm = 85.6;
    const pxPerMm = cardWidthPx / physicalCardMm;

    onChange({
      ...calibration,
      calibrationStatus: 'CALIBRATED_PHYSICAL',
      pixelsPerMm: parseFloat(pxPerMm.toFixed(2)),
    });
    setShowCardTool(false);
  };

  const handleResetToUncalibrated = () => {
    onChange({
      ...calibration,
      calibrationStatus: 'UNCALIBRATED',
      pixelsPerMm: undefined,
    });
  };

  return (
    <div className="space-y-6">

      {/* Mandatory Uncalibrated Display Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 space-y-1.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
            {language === 'hi' ? 'महत्वपूर्ण डिस्प्ले एवं कैलिब्रेशन सीमा' : 'Essential Calibration & Display Notice'}
          </h4>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          {language === 'hi' ? UNCALIBRATED_LIMITATION_NOTICE_HI : UNCALIBRATED_LIMITATION_NOTICE_EN}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Device & Screen Information */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              {calibration.deviceType === 'MOBILE' ? (
                <Smartphone className="w-4 h-4 text-teal-600" />
              ) : calibration.deviceType === 'TABLET' ? (
                <Tablet className="w-4 h-4 text-teal-600" />
              ) : (
                <Monitor className="w-4 h-4 text-teal-600" />
              )}
              <h3 className="font-bold text-xs text-navy-950 uppercase tracking-wide">
                {language === 'hi' ? 'उपकरण एवं स्क्रीन विवरण' : 'Device & Display Properties'}
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
              {calibration.deviceType}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
              <span className="text-[10px] text-slate-400 block">Reported Resolution</span>
              <span className="font-bold text-slate-800">{calibration.viewportWidth} × {calibration.viewportHeight}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
              <span className="text-[10px] text-slate-400 block">Pixel Ratio (DPR)</span>
              <span className="font-bold text-slate-800">{calibration.devicePixelRatio}x</span>
            </div>
          </div>

          {/* Calibration Mode Selector */}
          <div className="pt-1 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {language === 'hi' ? 'डिस्प्ले स्थिति (Calibration Status):' : 'Display Calibration Status:'}
            </label>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                calibration.calibrationStatus === 'CALIBRATED_PHYSICAL'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {calibration.calibrationStatus}
              </span>

              {calibration.calibrationStatus === 'UNCALIBRATED' ? (
                <button
                  type="button"
                  onClick={() => setShowCardTool(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 ml-auto"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'कार्ड द्वारा मापें (Optional)' : 'Measure with Card'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetToUncalibrated}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 ml-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Uncalibrated</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Card Matching Calibration Tool */}
          {showCardTool && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                <span>Standard ID/Credit Card Calibration</span>
                <button onClick={() => setShowCardTool(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <p className="text-[11px] text-teal-800">
                Hold a standard ATM/Aadhaar card against the screen. Adjust slider until on-screen rectangle matches physical card width.
              </p>

              {/* Physical card simulator rectangle */}
              <div className="flex justify-center py-2">
                <div 
                  className="h-16 bg-gradient-to-r from-teal-700 to-navy-950 rounded-xl shadow-md flex items-center justify-center text-white text-[11px] font-bold tracking-wider border-2 border-white"
                  style={{ width: cardWidthPx }}
                >
                  MATCH PHYSICAL CARD WIDTH
                </div>
              </div>

              <div className="space-y-1">
                <input
                  type="range"
                  min="200"
                  max="500"
                  value={cardWidthPx}
                  onChange={(e) => setCardWidthPx(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>200px</span>
                  <span className="font-mono text-teal-900 font-semibold">{cardWidthPx} px</span>
                  <span>500px</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCardTool(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCardCalibration}
                  className="px-3 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Apply Calibration
                </button>
              </div>
            </div>
          )}

        </div>

        {/* 2. Viewing Distance & Ambient Environment */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Ruler className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-xs text-navy-950 uppercase tracking-wide">
              {language === 'hi' ? 'दूरी एवं प्रकाश व्यवस्था' : 'Viewing Distance & Environment'}
            </h3>
          </div>

          {/* Distance Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {language === 'hi' ? 'जांच की दूरी (Testing Distance):' : 'Testing Distance:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { dist: 3.0, label: '3.0 Meters (10 ft)', descEn: 'Standard distance check', descHi: 'मानक दूरी जांच' },
                { dist: 1.0, label: '1.0 Meter (3.3 ft)', descEn: 'Short room distance', descHi: 'छोटे कमरे के लिए' },
                { dist: 0.4, label: '40 cm (16 in)', descEn: 'Near / reading check', descHi: 'पास की जांच' },
              ].map((item) => {
                const isSelected = calibration.confirmedDistanceMeters === item.dist;
                return (
                  <button
                    key={item.dist}
                    type="button"
                    onClick={() => handleDistanceSelect(item.dist)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold ring-2 ring-teal-200 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {language === 'hi' ? item.descHi : item.descEn}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 italic mt-1">
              {language === 'hi'
                ? 'महत्वपूर्ण: सुनिश्चित करें कि ग्राहक और स्क्रीन के बीच की वास्तविक दूरी चुनी गई दूरी के बराबर हो।'
                : 'Operator instruction: Ensure customer is positioned at the selected distance before commencing.'}
            </p>
          </div>

          {/* Ambient Lighting Confirmation */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'hi' ? 'कमरे की रोशनी (Ambient Lighting):' : 'Ambient Room Lighting:'}</span>
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'CONFIRMED_ADEQUATE', labelEn: 'Adequate / Non-glare', labelHi: 'उचित / बिना चकाचौंध' },
                { val: 'DIM', labelEn: 'Dim / Poorly Lit', labelHi: 'कम रोशनी (Dim)' },
                { val: 'EXCESSIVE_GLARE', labelEn: 'Excessive Glare', labelHi: 'ज्यादा चकाचौंध (Glare)' },
              ].map((item) => {
                const isSelected = calibration.ambientLighting === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleLightingSelect(item.val as any)}
                    className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                      isSelected
                        ? item.val === 'CONFIRMED_ADEQUATE'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-200'
                          : 'bg-rose-50 border-rose-400 text-rose-950 font-bold ring-2 ring-rose-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {language === 'hi' ? item.labelHi : item.labelEn}
                  </button>
                );
              })}
            </div>
            {calibration.ambientLighting !== 'CONFIRMED_ADEQUATE' && (
              <p className="text-[10px] text-rose-600 font-semibold mt-1">
                ⚠️ Suboptimal lighting will flag the test validity as INVALID_CONDITIONS.
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

