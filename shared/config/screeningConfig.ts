/**
 * VisionBridge Preliminary Vision Screening Configuration & Clinical Protocols
 * 
 * Defines standard optotype levels, randomized sequence generation,
 * display calibration protocols, Near Acuity, Contrast Sensitivity (Weber),
 * Colour Vision pseudoisochromatic simulation, Amsler grid definitions,
 * and clinical non-diagnostic disclaimers.
 */

export type ScreeningModuleId = 
  | 'DISTANCE_ACUITY' 
  | 'NEAR_ACUITY' 
  | 'CONTRAST_SENSITIVITY' 
  | 'COLOUR_VISION' 
  | 'AMSLER_GRID';

export type TumblingEDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type LandoltCDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type EyeTested = 'RIGHT' | 'LEFT' | 'BOTH';
export type CalibrationStatus = 'CALIBRATED_PHYSICAL' | 'APPROXIMATE_ESTIMATE' | 'UNCALIBRATED';
export type OptotypeType = 'TUMBLING_E' | 'LANDOLT_C' | 'SLOAN';

export type AmslerResultStatus = 
  | 'NO_DISTORTION' 
  | 'WAVY_LINES' 
  | 'MISSING_AREAS' 
  | 'BLURRED_AREAS' 
  | 'OTHER' 
  | 'UNABLE_TO_COMPLETE';

export type AmslerSector = 'CENTRAL' | 'SUPERIOR' | 'INFERIOR' | 'NASAL' | 'TEMPORAL';

export interface ScreeningModuleMeta {
  id: ScreeningModuleId;
  nameEn: string;
  nameHi: string;
  category: string;
  priority: 'VERY_HIGH' | 'HIGH' | 'MEDIUM';
  estimatedDurationMins: number;
  descriptionEn: string;
  descriptionHi: string;
  defaultSelected: boolean;
}

export const SCREENING_MODULES: ScreeningModuleMeta[] = [
  {
    id: 'DISTANCE_ACUITY',
    nameEn: 'Distance Visual Acuity',
    nameHi: 'दूरी दृष्टि तीक्ष्णता (Distance Acuity)',
    category: 'Visual Acuity',
    priority: 'VERY_HIGH',
    estimatedDurationMins: 3,
    descriptionEn: 'Monocular distance screening at 3 meters using Tumbling-E / Landolt-C / Sloan optotypes.',
    descriptionHi: '3 मीटर की दूरी पर टम्बलिंग-ई अथवा लैंडोल्ट-सी से आँख की दूरी दृष्टि की जांच।',
    defaultSelected: true,
  },
  {
    id: 'NEAR_ACUITY',
    nameEn: 'Near Visual Acuity',
    nameHi: 'निकट दृष्टि तीक्ष्णता (Near Acuity)',
    category: 'Visual Acuity',
    priority: 'VERY_HIGH',
    estimatedDurationMins: 2,
    descriptionEn: 'Monocular and binocular near vision screening at 40 cm (presbyopia and reading acuity).',
    descriptionHi: '40 सेमी की दूरी पर पढ़ने व निकट दृष्टि की जांच (पठन क्षमता व प्रेसबायोपिया जांच)।',
    defaultSelected: true,
  },
  {
    id: 'CONTRAST_SENSITIVITY',
    nameEn: 'Contrast Sensitivity',
    nameHi: 'कंट्रास्ट संवेदनशीलता (Contrast Sensitivity)',
    category: 'Functional Vision',
    priority: 'HIGH',
    estimatedDurationMins: 2,
    descriptionEn: 'Diminishing Weber contrast steps (Pelli-Robson/Mars principles) to check low-contrast visibility.',
    descriptionHi: 'कम चमक व कंट्रास्ट में आकृतियों को पहचानने की क्षमता की जांच।',
    defaultSelected: true,
  },
  {
    id: 'COLOUR_VISION',
    nameEn: 'Colour Vision Assessment',
    nameHi: 'रंग दृष्टि जांच (Colour Vision)',
    category: 'Functional Vision',
    priority: 'HIGH',
    estimatedDurationMins: 2,
    descriptionEn: 'Procedural pseudoisochromatic plates checking red-green and blue-yellow discrimination.',
    descriptionHi: 'लाल-हरे व नीले-पीले रंगों के भेद को पहचानने की प्रारंभिक स्क्रीनिंग जांच।',
    defaultSelected: true,
  },
  {
    id: 'AMSLER_GRID',
    nameEn: 'Amsler Grid Assessment',
    nameHi: 'एम्सलर ग्रिड जांच (Amsler Grid)',
    category: 'Macular Screening',
    priority: 'MEDIUM',
    estimatedDurationMins: 2,
    descriptionEn: 'Monocular 20x20 grid screening for metamorphopsia (wavy lines) and central scotomas.',
    descriptionHi: 'मैकुलर क्षेत्र की जांच - रेखाओं में टेढ़ापन या दृष्टि में अंधे धब्बों की पहचान।',
    defaultSelected: true,
  },
];

// ==========================================
// Module A: Distance Visual Acuity Config
// ==========================================

export interface AcuityLevelConfig {
  level: number;
  label: string; // e.g. "Level 1"
  snellenMeters: string; // e.g. "6/60"
  snellenFeet: string; // e.g. "20/200"
  decimalAcuity: number; // e.g. 0.10
  logMar: number; // e.g. 1.00
  arcMinutesSubtended: number; 
  standardHeightMmAt3m: number;
  descriptionEn: string;
  descriptionHi: string;
}

export const ACUITY_LEVELS: AcuityLevelConfig[] = [
  {
    level: 1,
    label: 'Level 1 (Baseline Check)',
    snellenMeters: '6/60',
    snellenFeet: '20/200',
    decimalAcuity: 0.10,
    logMar: 1.00,
    arcMinutesSubtended: 50.0,
    standardHeightMmAt3m: 43.6,
    descriptionEn: 'Large optotype for baseline orientation confirmation',
    descriptionHi: 'बुनियादी दिशा पहचान के लिए बड़ा अक्षर',
  },
  {
    level: 2,
    label: 'Level 2',
    snellenMeters: '6/36',
    snellenFeet: '20/120',
    decimalAcuity: 0.17,
    logMar: 0.78,
    arcMinutesSubtended: 30.0,
    standardHeightMmAt3m: 26.2,
    descriptionEn: 'Moderate-large preliminary check',
    descriptionHi: 'मध्यम-बड़ा स्तर',
  },
  {
    level: 3,
    label: 'Level 3',
    snellenMeters: '6/24',
    snellenFeet: '20/80',
    decimalAcuity: 0.25,
    logMar: 0.60,
    arcMinutesSubtended: 20.0,
    standardHeightMmAt3m: 17.5,
    descriptionEn: 'Intermediate preliminary check',
    descriptionHi: 'मध्यम स्तर',
  },
  {
    level: 4,
    label: 'Level 4',
    snellenMeters: '6/18',
    snellenFeet: '20/60',
    decimalAcuity: 0.33,
    logMar: 0.48,
    arcMinutesSubtended: 15.0,
    standardHeightMmAt3m: 13.1,
    descriptionEn: 'Moderate visual acuity check',
    descriptionHi: 'दूरी दृष्टि मध्यम स्तर',
  },
  {
    level: 5,
    label: 'Level 5',
    snellenMeters: '6/12',
    snellenFeet: '20/40',
    decimalAcuity: 0.50,
    logMar: 0.30,
    arcMinutesSubtended: 10.0,
    standardHeightMmAt3m: 8.7,
    descriptionEn: 'Functional distance vision threshold (driving benchmark)',
    descriptionHi: 'कार्यकारी दूरी दृष्टि मानक',
  },
  {
    level: 6,
    label: 'Level 6',
    snellenMeters: '6/9',
    snellenFeet: '20/30',
    decimalAcuity: 0.67,
    logMar: 0.18,
    arcMinutesSubtended: 7.5,
    standardHeightMmAt3m: 6.5,
    descriptionEn: 'Good distance visual acuity',
    descriptionHi: 'अच्छी दूरी दृष्टि स्तर',
  },
  {
    level: 7,
    label: 'Level 7',
    snellenMeters: '6/6',
    snellenFeet: '20/20',
    decimalAcuity: 1.00,
    logMar: 0.00,
    arcMinutesSubtended: 5.0,
    standardHeightMmAt3m: 4.4,
    descriptionEn: 'Standard normal visual acuity threshold',
    descriptionHi: 'सामान्य मानक पूर्ण दृष्टि',
  },
];

export const SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;

// ==========================================
// Module B: Near Visual Acuity Config (40 cm)
// ==========================================

export interface NearAcuityLevelConfig {
  level: number;
  nPoint: string;
  snellenEquivalent: string;
  decimalAcuity: number;
  logMar: number;
  standardHeightMmAt40cm: number;
  sampleSentenceEn: string;
  sampleSentenceHi: string;
}

export const NEAR_ACUITY_LEVELS: NearAcuityLevelConfig[] = [
  {
    level: 1,
    nPoint: 'N36',
    snellenEquivalent: '6/36 Near',
    decimalAcuity: 0.17,
    logMar: 0.78,
    standardHeightMmAt40cm: 3.5,
    sampleSentenceEn: 'Large clear text for initial reading verification.',
    sampleSentenceHi: 'शुरुआती पठन जांच हेतु बड़ा और स्पष्ट पाठ।',
  },
  {
    level: 2,
    nPoint: 'N24',
    snellenEquivalent: '6/24 Near',
    decimalAcuity: 0.25,
    logMar: 0.60,
    standardHeightMmAt40cm: 2.3,
    sampleSentenceEn: 'Books and large notices can be read comfortably.',
    sampleSentenceHi: 'पुस्तकें और बड़े नोटिस आसानी से पढ़े जा सकते हैं।',
  },
  {
    level: 3,
    nPoint: 'N18',
    snellenEquivalent: '6/18 Near',
    decimalAcuity: 0.33,
    logMar: 0.48,
    standardHeightMmAt40cm: 1.7,
    sampleSentenceEn: 'Standard headlines and medicine warnings are legible.',
    sampleSentenceHi: 'समाचार सुर्खियाँ और दवा के लेबल पढ़े जा सकते हैं।',
  },
  {
    level: 4,
    nPoint: 'N12',
    snellenEquivalent: '6/12 Near',
    decimalAcuity: 0.50,
    logMar: 0.30,
    standardHeightMmAt40cm: 1.2,
    sampleSentenceEn: 'Telephone directories and office letters are clear.',
    sampleSentenceHi: 'कार्यालयी पत्र और फोन विवरण स्पष्ट दिखते हैं।',
  },
  {
    level: 5,
    nPoint: 'N8',
    snellenEquivalent: '6/9 Near',
    decimalAcuity: 0.67,
    logMar: 0.18,
    standardHeightMmAt40cm: 0.9,
    sampleSentenceEn: 'Newspaper standard column text is read without difficulty.',
    sampleSentenceHi: 'अखबार का सामान्य लेख बिना किसी कठिनाई के पढ़ा जाता है।',
  },
  {
    level: 6,
    nPoint: 'N6',
    snellenEquivalent: '6/6 Near',
    decimalAcuity: 1.00,
    logMar: 0.00,
    standardHeightMmAt40cm: 0.6,
    sampleSentenceEn: 'Fine print, maps, and technical diagrams are sharply focused.',
    sampleSentenceHi: 'बारीक अक्षर, मानचित्र और तकनीकी चित्र पूरी तरह स्पष्ट हैं।',
  },
  {
    level: 7,
    nPoint: 'N5',
    snellenEquivalent: '6/5 Near',
    decimalAcuity: 1.25,
    logMar: -0.10,
    standardHeightMmAt40cm: 0.5,
    sampleSentenceEn: 'Superior fine near vision acuity achieved consistently.',
    sampleSentenceHi: 'उत्कृष्ट बारीक निकट दृष्टि सहजता से पढ़ी गई।',
  },
];

// ==========================================
// Module C: Contrast Sensitivity Config (Weber Steps)
// ==========================================

export interface ContrastStepConfig {
  step: number;
  weberContrastPct: number;
  logCS: number;
  descriptionEn: string;
  descriptionHi: string;
  expectedVisibility: 'ALL' | 'NORMAL_ONLY' | 'HIGH_SENSITIVITY_ONLY';
}

export const CONTRAST_STEPS: ContrastStepConfig[] = [
  { step: 1, weberContrastPct: 100.0, logCS: 0.00, descriptionEn: '100% (High Contrast Baseline)', descriptionHi: '100% उच्च कंट्रास्ट', expectedVisibility: 'ALL' },
  { step: 2, weberContrastPct: 50.0,  logCS: 0.30, descriptionEn: '50% Contrast', descriptionHi: '50% कंट्रास्ट', expectedVisibility: 'ALL' },
  { step: 3, weberContrastPct: 25.0,  logCS: 0.60, descriptionEn: '25% Contrast', descriptionHi: '25% कंट्रास्ट', expectedVisibility: 'ALL' },
  { step: 4, weberContrastPct: 12.5,  logCS: 0.90, descriptionEn: '12.5% Contrast', descriptionHi: '12.5% कंट्रास्ट', expectedVisibility: 'ALL' },
  { step: 5, weberContrastPct: 6.25,  logCS: 1.20, descriptionEn: '6.25% Contrast', descriptionHi: '6.25% कंट्रास्ट', expectedVisibility: 'ALL' },
  { step: 6, weberContrastPct: 3.12,  logCS: 1.50, descriptionEn: '3.12% Contrast', descriptionHi: '3.12% कंट्रास्ट', expectedVisibility: 'NORMAL_ONLY' },
  { step: 7, weberContrastPct: 1.56,  logCS: 1.80, descriptionEn: '1.56% Contrast (Normal Human Threshold)', descriptionHi: '1.56% कंट्रास्ट (सामान्य वयस्क सीमा)', expectedVisibility: 'NORMAL_ONLY' },
  { step: 8, weberContrastPct: 1.25,  logCS: 1.90, descriptionEn: '1.25% Contrast (Subtle Threshold)', descriptionHi: '1.25% सूक्ष्म कंट्रास्ट', expectedVisibility: 'HIGH_SENSITIVITY_ONLY' },
];

// ==========================================
// Module D: Colour Vision Assessment Config
// ==========================================

export interface ColourPlateConfig {
  plateIndex: number;
  plateType: 'DEMONSTRATION' | 'PROTAN_DEUTAN' | 'TRITAN' | 'TRANSFORMATION';
  expectedDigit: string;
  deficientDigit?: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
}

export const COLOUR_PLATES: ColourPlateConfig[] = [
  {
    plateIndex: 1,
    plateType: 'DEMONSTRATION',
    expectedDigit: '12',
    deficientDigit: '12',
    titleEn: 'Plate 1: Demonstration Control Plate',
    titleHi: 'प्लेट 1: नियंत्रण प्लेट (प्रदर्शन)',
    descriptionEn: 'Both normal trichromats and color deficient persons should see 12.',
    descriptionHi: 'सामान्य और रंग दोष वाले दोनों व्यक्ति 12 देख सकते हैं।',
  },
  {
    plateIndex: 2,
    plateType: 'PROTAN_DEUTAN',
    expectedDigit: '8',
    deficientDigit: '3',
    titleEn: 'Plate 2: Red-Green Discrimination Plate',
    titleHi: 'प्लेट 2: लाल-हरा भेद प्लेट',
    descriptionEn: 'Normal trichromats see 8. Red-green deficient individuals read 3 or cannot identify.',
    descriptionHi: 'सामान्य दृष्टि वाले 8 देखते हैं; लाल-हरे दोष वाले 3 या कुछ नहीं देखते।',
  },
  {
    plateIndex: 3,
    plateType: 'TRITAN',
    expectedDigit: '5',
    deficientDigit: 'NONE',
    titleEn: 'Plate 3: Blue-Yellow / Tritan Screening Plate',
    titleHi: 'प्लेट 3: नीला-पीला स्क्रीनिंग प्लेट',
    descriptionEn: 'Normal trichromats see 5. Tritan deficient individuals struggle to distinguish.',
    descriptionHi: 'सामान्य दृष्टि वाले 5 देखते हैं; नीले-पीले दोष वाले पहचान नहीं पाते।',
  },
  {
    plateIndex: 4,
    plateType: 'TRANSFORMATION',
    expectedDigit: '2',
    deficientDigit: 'NONE',
    titleEn: 'Plate 4: Subtle Hue Transformation Plate',
    titleHi: 'प्लेट 4: सूक्ष्म रंग परिवर्तन प्लेट',
    descriptionEn: 'Normal trichromats clearly read 2. Red-green deficient individuals read nothing.',
    descriptionHi: 'सामान्य दृष्टि वाले 2 पहचानते हैं; रंग दोष वाले इसे पहचान नहीं पाते।',
  },
];

// ==========================================
// Protocol Settings
// ==========================================

export const SCREENING_PROTOCOL = {
  version: 'VB-ACUITY-2026.1',
  name: 'VisionBridge Comprehensive Preliminary Vision Screening Suite',
  defaultDistanceMeters: 3.0,
  defaultNearDistanceCm: 40.0,
  minTrialsPerLevel: 3,
  maxTrialsPerLevel: 4,
  passingThresholdRatio: 0.75, // At least 3 out of 4 correct to advance
  maxConsecutiveIdenticalDirections: 2, // Avoid memorization
};

// ==========================================
// Clinical Disclaimers & Notices
// ==========================================

export const CLINICAL_DISCLAIMER_EN = 
  'This is a preliminary vision-screening tool. It does not diagnose eye conditions, determine exact spectacle power, or replace a comprehensive eye examination by a qualified eye-care professional.';

export const CLINICAL_DISCLAIMER_HI = 
  'यह एक प्रारंभिक दृष्टि-जांच (स्क्रीनिंग) साधन है। यह किसी नेत्र रोग का निदान नहीं करता, न ही चश्मे का सटीक नंबर निर्धारित करता है, और न ही किसी योग्य नेत्र विशेषज्ञ (आई डॉक्टर) द्वारा की जाने वाली संपूर्ण नेत्र-जांच का विकल्प है।';

export const UNCALIBRATED_LIMITATION_NOTICE_EN = 
  'NOTICE: This display has not undergone clinical laboratory calibration. Optotype physical sizes are software estimates based on device reporting. Scores reflect preliminary relative performance only, not certified Snellen acuity.';

export const UNCALIBRATED_LIMITATION_NOTICE_HI = 
  'सूचना: इस डिस्प्ले का कोई नैदानिक प्रयोगशाला कैलिब्रेशन नहीं हुआ है। अक्षर का आकार डिवाइस की रिपोर्ट पर आधारित एक अनुमान है। यह केवल एक प्रारंभिक स्क्रीनिंग परिणाम है, प्रमाणित दृष्टि-माप नहीं।';

export const CONTRAST_PROTOTYPE_NOTICE_EN = 
  'SCREENING PROTOTYPE: This digital contrast sensitivity test is an uncalibrated software screening tool based on Weber contrast principles. Display gamma and ambient lighting significantly alter physical luminance.';

export const COLOUR_PROTOTYPE_NOTICE_EN = 
  'SCREENING PROTOTYPE: Digital pseudoisochromatic plates are simulated renderings and do not replace certified printed Ishihara / Hardy-Rand-Rittler books under standardized CIE daylight lighting.';

// ==========================================
// Directional & Geometry Helpers
// ==========================================

export function generateRandomOrientations(count: number): TumblingEDirection[] {
  const directions: TumblingEDirection[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  const sequence: TumblingEDirection[] = [];

  for (let i = 0; i < count; i++) {
    const available = directions.filter(d => {
      if (sequence.length >= 2) {
        const last1 = sequence[sequence.length - 1];
        const last2 = sequence[sequence.length - 2];
        if (last1 === d && last2 === d) {
          return false;
        }
      }
      return true;
    });

    const chosen = available[Math.floor(Math.random() * available.length)];
    sequence.push(chosen);
  }

  return sequence;
}

export function generateRandomLandoltCDirections(count: number): LandoltCDirection[] {
  return generateRandomOrientations(count) as LandoltCDirection[];
}

export function generateRandomSloanLetters(count: number): string[] {
  const letters = [...SLOAN_LETTERS];
  const sequence: string[] = [];
  for (let i = 0; i < count; i++) {
    const available = letters.filter(l => sequence[sequence.length - 1] !== l);
    sequence.push(available[Math.floor(Math.random() * available.length)]);
  }
  return sequence;
}

export function getTumblingESvgPath(): string {
  return `
    M 0 0
    L 100 0
    L 100 20
    L 20 20
    L 20 40
    L 100 40
    L 100 60
    L 20 60
    L 20 80
    L 100 80
    L 100 100
    L 0 100
    Z
  `.replace(/\s+/g, ' ').trim();
}

export const DIRECTION_ROTATION_DEGREES: Record<TumblingEDirection, number> = {
  RIGHT: 0,
  DOWN: 90,
  LEFT: 180,
  UP: 270,
};

export const DIRECTION_LABELS: Record<TumblingEDirection, { en: string; hi: string; symbol: string }> = {
  UP: { en: 'UP', hi: 'ऊपर (Up)', symbol: '▲' },
  DOWN: { en: 'DOWN', hi: 'नीचे (Down)', symbol: '▼' },
  LEFT: { en: 'LEFT', hi: 'बाएँ (Left)', symbol: '◀' },
  RIGHT: { en: 'RIGHT', hi: 'दाएँ (Right)', symbol: '▶' },
};
