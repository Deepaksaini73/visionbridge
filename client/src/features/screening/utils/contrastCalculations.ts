/**
 * Weber Contrast & LogCS Calculations
 * 
 * Implements standard functional vision contrast sensitivity formulas:
 * Weber Contrast: C_w = (L_background - L_target) / L_background
 * LogCS: log10(1 / C_w)
 */

export interface ContrastGradeResult {
  grade: 'NORMAL' | 'MILD_REDUCTION' | 'MODERATE_REDUCTION' | 'SEVERE_REDUCTION';
  labelEn: string;
  labelHi: string;
  descriptionEn: string;
  isAbnormal: boolean;
}

export function evaluateContrastGrade(logCS: number): ContrastGradeResult {
  if (logCS >= 1.65) {
    return {
      grade: 'NORMAL',
      labelEn: 'Normal Contrast Sensitivity',
      labelHi: 'सामान्य कंट्रास्ट संवेदनशीलता',
      descriptionEn: 'Within expected adult threshold (>= 1.65 LogCS). Low-contrast edges well resolved.',
      isAbnormal: false,
    };
  }
  if (logCS >= 1.35) {
    return {
      grade: 'MILD_REDUCTION',
      labelEn: 'Mild Contrast Reduction',
      labelHi: 'हल्की कंट्रास्ट कमी',
      descriptionEn: 'Mild attenuation (1.35 - 1.60 LogCS). May cause difficulty in fog, glare, or dusk.',
      isAbnormal: false,
    };
  }
  if (logCS >= 1.05) {
    return {
      grade: 'MODERATE_REDUCTION',
      labelEn: 'Moderate Contrast Reduction',
      labelHi: 'मध्यम कंट्रास्ट कमी',
      descriptionEn: 'Noticeable impairment (1.05 - 1.30 LogCS). Early cataract or retinal changes possible.',
      isAbnormal: true,
    };
  }
  return {
    grade: 'SEVERE_REDUCTION',
    labelEn: 'Severe Contrast Reduction',
    labelHi: 'गंभीर कंट्रास्ट कमी',
    descriptionEn: 'Significant loss (< 1.05 LogCS). In-person ophthalmic workup strongly indicated.',
    isAbnormal: true,
  };
}

/**
 * Returns hex/rgb color for optotype given a Weber contrast percentage against a white #FFFFFF background.
 * For Weber contrast C (0.0125 to 1.00):
 * Target luminance = 255 * (1 - C)
 */
export function getOptotypeColorForContrast(weberContrastPct: number): string {
  const c = Math.max(0.01, Math.min(1.0, weberContrastPct / 100.0));
  const channel = Math.round(255 * (1 - c));
  return `rgb(${channel}, ${channel}, ${channel})`;
}

