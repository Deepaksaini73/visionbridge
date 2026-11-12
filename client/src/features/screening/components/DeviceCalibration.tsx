import React, { useState } from 'react';
import { DeviceCalibrationState } from '../types/screening';
import { UNCALIBRATED_LIMITATION_NOTICE_EN, UNCALIBRATED_LIMITATION_NOTICE_HI } from '@shared/config/screeningConfig';
import { Sliders, CheckCircle2, AlertTriangle, CreditCard, Sun, ShieldAlert } from 'lucide-react';

interface DeviceCalibrationProps {
  calibration: DeviceCalibrationState;
  onUpdateCalibration: (updated: DeviceCalibrationState) => void;
  onContinue: () => void;
}

export const DeviceCalibration: React.FC<DeviceCalibrationProps> = ({
  calibration,
  onUpdateCalibration,
  onContinue,
}) => {
  const [cardWidthPx, setCardWidthPx] = useState(calibration.pixelsPerMm ? Math.round(calibration.pixelsPerMm * 85.6) : 320);
  const [distanceMeters, setDistanceMeters] = useState(calibration.confirmedDistanceMeters || 3.0);
  const [ambientLighting, setAmbientLighting] = useState(calibration.ambientLighting || 'CONFIRMED_ADEQUATE');
  const [calibratedMode, setCalibratedMode] = useState<boolean>(calibration.calibrationStatus === 'CALIBRATED_PHYSICAL');

  const handleApplyCardCalibration = () => {
    const pxPerMm = cardWidthPx / 85.60;
    onUpdateCalibration({
      ...calibration,
      calibrationStatus: 'CALIBRATED_PHYSICAL',
      pixelsPerMm: pxPerMm,
      confirmedDistanceMeters: distanceMeters,
      ambientLighting,
    });
    setCalibratedMode(true);
  };

  const handleSkipPhysicalCalibration = () => {
    onUpdateCalibration({
      ...calibration,
      calibrationStatus: 'UNCALIBRATED',
      confirmedDistanceMeters: distanceMeters,
      ambientLighting,
    });
    setCalibratedMode(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-teal-600/50 rounded-lg">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Display & Distance Calibration</h2>
            <p className="text-xs text-teal-100">
              Set physical viewing distance and optionally calibrate screen dimensions for accurate optotype sizing.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Notice of limitation */}
        {!calibratedMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold text-amber-900">UNCALIBRATED DISPLAY NOTICE</p>
              <p>{UNCALIBRATED_LIMITATION_NOTICE_EN}</p>
              <p className="text-amber-700 italic">{UNCALIBRATED_LIMITATION_NOTICE_HI}</p>
            </div>
          </div>
        )}

        {/* Section 1: Viewing Distance */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            1. Distance Visual Acuity Viewing Distance
          </label>
          <p className="text-xs text-slate-600 mb-3">
            Ensure the customer's eyes are situated at exactly this measured distance from the screen.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[2.0, 2.5, 3.0, 4.0].map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => {
                  setDistanceMeters(dist);
                  onUpdateCalibration({ ...calibration, confirmedDistanceMeters: dist });
                }}
                className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition-all ${
                  distanceMeters === dist
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500'
                }`}
              >
                {dist.toFixed(1)} Meters {dist === 3.0 && '(Recommended)'}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Physical Card Calibration */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-slate-800">
                2. Physical Scale Calibration (Card Reference)
              </label>
              <p className="text-xs text-slate-600">
                Hold a standard debit/credit or ID card (85.6 mm width) against the screen. Adjust width until it matches.
              </p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
              calibratedMode 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {calibratedMode ? 'Physical Scale Calibrated' : 'Uncalibrated Estimate'}
            </span>
          </div>

          {/* Interactive reference rectangle */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-lg border border-dashed border-slate-300">
            <div
              style={{ width: `${cardWidthPx}px`, height: `${Math.round(cardWidthPx * (53.98 / 85.6))}px` }}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg text-white shadow-md flex flex-col justify-between p-3 border-2 border-blue-400 select-none transition-all"
            >
              <div className="flex justify-between items-center text-[10px] opacity-80">
                <CreditCard className="w-4 h-4" />
                <span>STANDARD CARD (85.6 mm)</span>
              </div>
              <div className="text-center font-mono text-xs font-bold tracking-wider">
                MATCH PHYSICAL CARD
              </div>
              <div className="text-right text-[10px] font-mono opacity-70">
                {cardWidthPx} px • {(cardWidthPx / 85.6).toFixed(2)} px/mm
              </div>
            </div>

            {/* Adjustment Controls */}
            <div className="flex items-center space-x-3 mt-4 w-full max-w-sm">
              <button
                type="button"
                onClick={() => setCardWidthPx(prev => Math.max(200, prev - 2))}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 font-bold hover:bg-slate-50"
              >
                -
              </button>
              <input
                type="range"
                min="200"
                max="500"
                value={cardWidthPx}
                onChange={(e) => setCardWidthPx(parseInt(e.target.value, 10))}
                className="w-full accent-teal-600"
              />
              <button
                type="button"
                onClick={() => setCardWidthPx(prev => Math.min(500, prev + 2))}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 font-bold hover:bg-slate-50"
              >
                +
              </button>
            </div>

            <div className="flex space-x-3 mt-3">
              <button
                type="button"
                onClick={handleApplyCardCalibration}
                className="px-4 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 shadow-sm"
              >
                Confirm Match & Calibrate
              </button>
              <button
                type="button"
                onClick={handleSkipPhysicalCalibration}
                className="px-4 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
              >
                Use Device Default (Uncalibrated)
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Ambient Lighting Checklist */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            3. Room & Ambient Lighting Verification
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'CONFIRMED_ADEQUATE', title: 'Adequate Lighting', desc: 'Diffused room lighting, no direct glare on screen', valid: true },
              { id: 'DIM', title: 'Dim / Dark Room', desc: 'Suboptimal, optotypes appear with elevated contrast', valid: false },
              { id: 'EXCESSIVE_GLARE', title: 'Excessive Glare', desc: 'Direct sunlight or unshaded bulb reflecting on display', valid: false },
            ].map((light) => (
              <button
                key={light.id}
                type="button"
                onClick={() => {
                  setAmbientLighting(light.id as any);
                  onUpdateCalibration({ ...calibration, ambientLighting: light.id as any });
                }}
                className={`p-3 text-left rounded-lg border transition-all ${
                  ambientLighting === light.id
                    ? light.valid
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                      : 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>{light.title}</span>
                  {ambientLighting === light.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{light.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Continue Action */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-2.5 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 shadow flex items-center space-x-2"
          >
            <span>Confirm Calibration & Proceed</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
