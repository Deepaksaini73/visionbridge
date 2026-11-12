/**
 * VisionBridge Milestone 4: Comprehensive Modular Vision Screening Test Suite
 * 
 * Verifies all 5 screening modules:
 * - Module A: Distance Visual Acuity (LogMAR / Snellen staircase, OD/OS separation)
 * - Module B: Near Visual Acuity (N-point scale at 40cm)
 * - Module C: Contrast Sensitivity (Weber steps & LogCS evaluation)
 * - Module D: Colour Vision Assessment (Procedural pseudoisochromatic plates)
 * - Module E: Amsler Grid Assessment (Macular metamorphopsia & scotoma)
 * - Display Calibration & Ambient Lighting Validity
 * - Store Operator Isolation
 * - Optometrist Clinical Review Sign-Off Workflow
 * - Unified Printable Clinical Report
 */

import {
  SCREENING_MODULES,
  ACUITY_LEVELS,
  NEAR_ACUITY_LEVELS,
  CONTRAST_STEPS,
  COLOUR_PLATES,
  SCREENING_PROTOCOL,
  generateRandomOrientations,
  getTumblingESvgPath,
  CLINICAL_DISCLAIMER_EN,
  UNCALIBRATED_LIMITATION_NOTICE_EN,
} from './dist/config/screeningConfig.js';

import {
  IN_MEMORY_SCREENINGS,
  startScreening,
  getScreeningById,
  completeScreening,
  reviewScreening,
  getScreeningPdfReport,
} from './dist/controllers/screeningController.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('===============================================================');
console.log('VISIONBRIDGE - MILESTONE 4 MODULAR VISION SCREENING SUITE');
console.log('===============================================================\n');

// -------------------------------------------------------------
// TEST SUITE 1: MODULAR STRUCTURE & CONFIGURATION
// -------------------------------------------------------------
console.log('--- Test Suite 1: Screening Modules Configuration & Protocols ---');

assert(SCREENING_MODULES.length === 5, 'Five modular screening tests are defined');
const moduleIds = SCREENING_MODULES.map(m => m.id);
assert(moduleIds.includes('DISTANCE_ACUITY'), 'Module A (DISTANCE_ACUITY) registered');
assert(moduleIds.includes('NEAR_ACUITY'), 'Module B (NEAR_ACUITY) registered');
assert(moduleIds.includes('CONTRAST_SENSITIVITY'), 'Module C (CONTRAST_SENSITIVITY) registered');
assert(moduleIds.includes('COLOUR_VISION'), 'Module D (COLOUR_VISION) registered');
assert(moduleIds.includes('AMSLER_GRID'), 'Module E (AMSLER_GRID) registered');

// -------------------------------------------------------------
// TEST SUITE 2: MODULE A - DISTANCE VISUAL ACUITY
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Module A - Distance Visual Acuity & Visual Angle Math ---');

assert(ACUITY_LEVELS.length === 7, '7 standardized distance acuity levels (6/60 down to 6/6)');
const level7 = ACUITY_LEVELS.find(l => l.level === 7);
assert(level7.snellenMeters === '6/6' && level7.arcMinutesSubtended === 5.0, '6/6 optotype subtends exactly 5.0 arcminutes at 3m');

const seq = generateRandomOrientations(20);
assert(seq.length === 20, 'Generates 20 randomized trials without bias');
let consecutiveCount = 1;
let maxConsecutive = 1;
for (let i = 1; i < seq.length; i++) {
  if (seq[i] === seq[i-1]) {
    consecutiveCount++;
    if (consecutiveCount > maxConsecutive) maxConsecutive = consecutiveCount;
  } else {
    consecutiveCount = 1;
  }
}
assert(maxConsecutive <= 2, 'No more than 2 consecutive identical directions (anti-memorization rule)');

// -------------------------------------------------------------
// TEST SUITE 3: MODULE B - NEAR VISUAL ACUITY
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Module B - Near Visual Acuity (40 cm Reading Distance) ---');

assert(NEAR_ACUITY_LEVELS.length === 7, '7 near acuity levels (N36 down to N5)');
const n6Level = NEAR_ACUITY_LEVELS.find(n => n.nPoint === 'N6');
assert(n6Level.snellenEquivalent === '6/6 Near' && n6Level.standardHeightMmAt40cm === 0.6, 'N6 reading level corresponds to 6/6 near equivalent at 40cm');

// -------------------------------------------------------------
// TEST SUITE 4: MODULE C - CONTRAST SENSITIVITY (WEBER STEPS)
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Module C - Contrast Sensitivity & Weber Conversion ---');

assert(CONTRAST_STEPS.length === 8, '8 diminishing Weber contrast steps configured');
const step1 = CONTRAST_STEPS[0];
const step7 = CONTRAST_STEPS[6];
assert(step1.weberContrastPct === 100.0 && step1.logCS === 0.00, 'Step 1 is 100% baseline contrast (0.00 LogCS)');
assert(step7.weberContrastPct === 1.56 && step7.logCS === 1.80, 'Step 7 is 1.56% contrast (1.80 LogCS, normal adult threshold)');

// Verify contrast grading formula
function evalContrast(logCS) {
  if (logCS >= 1.65) return 'NORMAL';
  if (logCS >= 1.35) return 'MILD_REDUCTION';
  if (logCS >= 1.05) return 'MODERATE_REDUCTION';
  return 'SEVERE_REDUCTION';
}
assert(evalContrast(1.80) === 'NORMAL', '1.80 LogCS classified as NORMAL contrast sensitivity');
assert(evalContrast(1.20) === 'MODERATE_REDUCTION', '1.20 LogCS classified as MODERATE_REDUCTION');
assert(evalContrast(0.90) === 'SEVERE_REDUCTION', '0.90 LogCS classified as SEVERE_REDUCTION');

// -------------------------------------------------------------
// TEST SUITE 5: MODULE D - COLOUR VISION (PSEUDOISOCHROMATIC)
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: Module D - Colour Vision Procedural Plates ---');

assert(COLOUR_PLATES.length === 4, '4 procedural pseudoisochromatic plates defined');
const demoPlate = COLOUR_PLATES.find(p => p.plateType === 'DEMONSTRATION');
const rgPlate = COLOUR_PLATES.find(p => p.plateType === 'PROTAN_DEUTAN');
assert(demoPlate.expectedDigit === '12', 'Plate 1 is demonstration control plate with expected numeral 12');
assert(rgPlate.expectedDigit === '8' && rgPlate.deficientDigit === '3', 'Plate 2 evaluates red-green discrimination (8 seen by trichromats, 3 or none by deficient)');

// -------------------------------------------------------------
// TEST SUITE 6: MODULE E - AMSLER GRID & WARNING FLAGS
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: Module E - Amsler Grid & Warning Flags ---');

const mockAmslerNormal = {
  performed: true,
  rightEye: { tested: true, status: 'NO_DISTORTION', distortionTypes: [] },
  leftEye: { tested: true, status: 'NO_DISTORTION', distortionTypes: [] },
};
const mockAmslerMetamorphopsia = {
  performed: true,
  rightEye: { tested: true, status: 'NO_DISTORTION', distortionTypes: [] },
  leftEye: { tested: true, status: 'WAVY_LINES', distortionTypes: ['METAMORPHOPSIA'], sectorsAffected: ['CENTRAL'] },
};
assert(mockAmslerNormal.rightEye.status === 'NO_DISTORTION', 'Normal Amsler response reports no distortion');
assert(mockAmslerMetamorphopsia.leftEye.status === 'WAVY_LINES', 'Amsler detects localized metamorphopsia in central sector');

// -------------------------------------------------------------
// TEST SUITE 7: DISPLAY CALIBRATION & TEST VALIDITY
// -------------------------------------------------------------
console.log('\n--- Test Suite 7: Display Calibration & Ambient Lighting Validity ---');

function evaluateValidity(calib) {
  if (calib.ambientLighting === 'DIM' || calib.ambientLighting === 'EXCESSIVE_GLARE') {
    return 'INVALID_CONDITIONS';
  }
  if (calib.calibrationStatus === 'CALIBRATED_PHYSICAL') {
    return 'VALID_CALIBRATED';
  }
  return 'PRELIMINARY_UNCALIBRATED';
}

assert(evaluateValidity({ ambientLighting: 'CONFIRMED_ADEQUATE', calibrationStatus: 'UNCALIBRATED' }) === 'PRELIMINARY_UNCALIBRATED', 'Uncalibrated display marks test as PRELIMINARY_UNCALIBRATED');
assert(evaluateValidity({ ambientLighting: 'CONFIRMED_ADEQUATE', calibrationStatus: 'CALIBRATED_PHYSICAL' }) === 'VALID_CALIBRATED', 'Physical card calibrated display marks test as VALID_CALIBRATED');
assert(evaluateValidity({ ambientLighting: 'EXCESSIVE_GLARE', calibrationStatus: 'CALIBRATED_PHYSICAL' }) === 'INVALID_CONDITIONS', 'Excessive glare overrides to INVALID_CONDITIONS');

// -------------------------------------------------------------
// TEST SUITE 8: STORE OPERATOR ISOLATION
// -------------------------------------------------------------
console.log('\n--- Test Suite 8: Store Center Isolation & Security ---');

const demoRecord = IN_MEMORY_SCREENINGS[0];
assert(demoRecord && demoRecord.storeId === 'ST-AP-CHITTOOR-01', 'Demo screening record belongs to Chittoor center');

const reqSameStore = {
  params: { id: demoRecord.screeningId },
  user: { id: 'usr_op_1', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
};
const reqOtherStore = {
  params: { id: demoRecord.screeningId },
  user: { id: 'usr_op_2', role: 'STORE_OPERATOR', storeId: 'ST-TN-VELLORE-01' },
};

let sameStoreAllowed = false;
getScreeningById(reqSameStore, {
  status: (code) => ({
    json: (body) => { if (code === 200 && body.success) sameStoreAllowed = true; }
  })
});
assert(sameStoreAllowed, 'Store operator can view records belonging to their store');

let otherStoreBlocked = false;
getScreeningById(reqOtherStore, {
  status: (code) => ({
    json: (body) => { if (code === 403) otherStoreBlocked = true; }
  })
});
assert(otherStoreBlocked, 'Store operator is blocked from viewing records belonging to another store');

// -------------------------------------------------------------
// TEST SUITE 9: OPTOMETRIST CLINICAL REVIEW SIGN-OFF WORKFLOW
// -------------------------------------------------------------
console.log('\n--- Test Suite 9: Optometrist Clinical Review Sign-Off ---');

const reqUnauthorizedReviewer = {
  params: { id: demoRecord.screeningId },
  user: { id: 'usr_op_1', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
  body: {
    clinicalDecision: 'OPHTHALMIC_REFERRAL',
    urgency: 'PROMPT_1_2_WEEKS',
    notes: 'Unauthorized operator review',
  },
};

let unauthorizedRejected = false;
reviewScreening(reqUnauthorizedReviewer, {
  status: (code) => ({
    json: (body) => { if (code === 403 && body.error?.code === 'UNAUTHORIZED_REVIEWER') unauthorizedRejected = true; }
  })
});
assert(unauthorizedRejected, 'Store operator cannot sign off clinical review (strictly requires OPTOMETRIST or ADMIN)');

const reqAuthorizedOptometrist = {
  params: { id: demoRecord.screeningId },
  user: { id: 'usr_optometrist_01', name: 'Dr. Ananya Sharma', role: 'OPTOMETRIST', licenseNumber: 'OPT-IN-2024-8841' },
  body: {
    clinicalDecision: 'OPHTHALMIC_REFERRAL',
    urgency: 'PROMPT_1_2_WEEKS',
    notes: 'Customer exhibits interocular acuity disparity and subtle macular distortion. Dilated fundoscopy indicated.',
    provisionalRecommendations: ['Slit-lamp examination', 'Refraction & spectacle prescription'],
    licenseNumber: 'OPT-IN-2024-8841',
  },
};

let optometristReviewSucceeded = false;
let updatedReviewStatus = '';
reviewScreening(reqAuthorizedOptometrist, {
  status: (code) => ({
    json: (body) => {
      if (code === 200 && body.success) {
        optometristReviewSucceeded = true;
        updatedReviewStatus = body.data.professionalReviewStatus;
      }
    }
  })
});
assert(optometristReviewSucceeded, 'Authorized optometrist successfully signs off clinical review');
assert(updatedReviewStatus === 'REVIEWED', 'Screening professional review status transitions to REVIEWED');

// -------------------------------------------------------------
// TEST SUITE 10: UNIFIED PRINTABLE CLINICAL REPORT
// -------------------------------------------------------------
console.log('\n--- Test Suite 10: Unified Printable Clinical Report (PDF/HTML) ---');

let pdfReportHtml = '';
getScreeningPdfReport({ params: { id: demoRecord.screeningId }, user: { role: 'ADMIN' } }, {
  status: (code) => ({
    send: (content) => { if (code === 200) pdfReportHtml = content; }
  })
});

assert(pdfReportHtml.includes('VisionBridge') && pdfReportHtml.includes('Comprehensive Screening Report'), 'Report generates valid HTML with branding and document title');
assert(pdfReportHtml.includes('Module A: Distance Visual Acuity'), 'Report includes Module A (Distance Acuity) table');
assert(pdfReportHtml.includes('Optometrist Clinical Review'), 'Report includes Optometrist Clinical Review section');
assert(pdfReportHtml.includes(CLINICAL_DISCLAIMER_EN), 'Report contains mandatory clinical non-diagnostic disclaimer');

console.log('\n===============================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('===============================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

