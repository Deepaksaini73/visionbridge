/**
 * Automated Verification Script for Milestone 3.1: Adaptive Question Branching
 *
 * Verifies:
 * 1. Scenario A:
 *    - Distance difficulty = YES ('MILD')
 *    - Near difficulty = NO ('NONE')
 *    - Spectacles = YES ('CURRENT_USER')
 *    - Difficulty in one eye = YES ('RIGHT_ONLY')
 *    => Asserts: q_faces, q_boards, q_eye_detail, q_glasses_age, q_glasses_type are PRESENT.
 *    => Asserts: q_reading, q_phone are EXCLUDED.
 *
 * 2. Scenario B:
 *    - Distance difficulty = NO ('NONE')
 *    - Near difficulty = YES ('MODERATE')
 *    - Spectacles = NO ('NEVER')
 *    - Difficulty in both eyes = YES ('BOTH')
 *    => Asserts: q_reading, q_phone are PRESENT.
 *    => Asserts: q_faces, q_boards, q_eye_detail, q_glasses_age, q_glasses_type are EXCLUDED.
 *
 * 3. Dynamic Answer Modification & Pruning:
 *    - Start with Distance YES ('MILD') and answer q_faces = 'OFTEN'
 *    - Change Distance to NO ('NONE')
 *    - Assert: pruneInapplicableAnswers removes q_faces completely.
 *    - Generate clinical summary: Assert q_faces does NOT appear in distanceVisionConcerns.
 *
 * 4. Red Flag Alert Trigger:
 *    - Answer q_sudden_loss = 'YES_SUDDEN_DROP'
 *    - Assert: Warning flag triggered and included in summary.
 */

import {
  INTERVIEW_QUESTIONS,
  getActiveQuestions,
  isQuestionVisible,
  pruneInapplicableAnswers,
} from './dist/config/interviewQuestions.js';

import {
  generateDeterministicSummary,
} from './dist/services/aiSummaryService.js';

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
console.log('VISIONBRIDGE - MILESTONE 3.1 ADAPTIVE BRANCHING VERIFICATION');
console.log('===============================================================\n');

// -------------------------------------------------------------
// TEST 1: SCENARIO A
// Distance YES, Near NO, Spectacles YES (CURRENT), One eye (RIGHT_ONLY)
// -------------------------------------------------------------
console.log('--- Test Suite 1: Scenario A (Distance YES, Near NO, Spectacles CURRENT, One Eye) ---');

const scenarioAAnswers = {
  q_dist: 'MILD',
  q_near: 'NONE',
  q_blur: 'OCCASIONAL',
  q_eye_affected: 'RIGHT_ONLY',
  q_duration: '1_TO_6_MONTHS',
  q_progression: 'SAME',
  q_spectacles: 'CURRENT_USER',
  q_prev_exam: 'WITHIN_YEAR',
  q_sudden_loss: 'NO',
  q_severe_pain: 'NO',
  q_flashes: 'NO',
  q_floaters: 'NO',
  q_halos: 'NO',
  q_daily: 'NOT_AFFECTED',
  q_screen_hours: 'UNDER_2_HOURS',
  q_outdoor: 'INDOORS',
  q_other_concerns: 'None',
};

const activeA = getActiveQuestions(scenarioAAnswers);
const activeAIds = activeA.map(q => q.id);

console.log(`Scenario A Active Questions Count: ${activeA.length}`);

// Distance follow-ups should be present
assert(activeAIds.includes('q_faces'), 'q_faces included when distance difficulty is MILD');
assert(activeAIds.includes('q_boards'), 'q_boards included when distance difficulty is MILD');

// One-eye follow-up should be present
assert(activeAIds.includes('q_eye_detail'), 'q_eye_detail included when eye affected is RIGHT_ONLY');

// Spectacle follow-ups should be present
assert(activeAIds.includes('q_glasses_age'), 'q_glasses_age included when spectacles is CURRENT_USER');
assert(activeAIds.includes('q_glasses_type'), 'q_glasses_type included when spectacles is CURRENT_USER');

// Near vision follow-ups MUST BE EXCLUDED
assert(!activeAIds.includes('q_reading'), 'q_reading EXCLUDED when near difficulty is NONE');
assert(!activeAIds.includes('q_phone'), 'q_phone EXCLUDED when near difficulty is NONE');

// -------------------------------------------------------------
// TEST 2: SCENARIO B
// Distance NO, Near YES, Spectacles NO (NEVER), Both eyes (BOTH)
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Scenario B (Distance NO, Near YES, Spectacles NEVER, Both Eyes) ---');

const scenarioBAnswers = {
  q_dist: 'NONE',
  q_near: 'MODERATE',
  q_blur: 'OCCASIONAL',
  q_eye_affected: 'BOTH',
  q_duration: '6_TO_12_MONTHS',
  q_progression: 'GETTING_WORSE',
  q_spectacles: 'NEVER',
  q_prev_exam: 'NEVER',
  q_sudden_loss: 'NO',
  q_severe_pain: 'NO',
  q_flashes: 'NO',
  q_floaters: 'NO',
  q_halos: 'NO',
  q_daily: 'SLIGHTLY_AFFECTED',
  q_screen_hours: '2_TO_6_HOURS',
  q_outdoor: 'MODERATE_OUTDOOR',
  q_other_concerns: 'None',
};

const activeB = getActiveQuestions(scenarioBAnswers);
const activeBIds = activeB.map(q => q.id);

console.log(`Scenario B Active Questions Count: ${activeB.length}`);

// Near vision follow-ups should be present
assert(activeBIds.includes('q_reading'), 'q_reading included when near difficulty is MODERATE');
assert(activeBIds.includes('q_phone'), 'q_phone included when near difficulty is MODERATE');

// Distance vision follow-ups MUST BE EXCLUDED
assert(!activeBIds.includes('q_faces'), 'q_faces EXCLUDED when distance difficulty is NONE');
assert(!activeBIds.includes('q_boards'), 'q_boards EXCLUDED when distance difficulty is NONE');

// One-eye follow-up MUST BE EXCLUDED
assert(!activeBIds.includes('q_eye_detail'), 'q_eye_detail EXCLUDED when eye affected is BOTH');

// Spectacle follow-ups MUST BE EXCLUDED
assert(!activeBIds.includes('q_glasses_age'), 'q_glasses_age EXCLUDED when spectacles is NEVER');
assert(!activeBIds.includes('q_glasses_type'), 'q_glasses_type EXCLUDED when spectacles is NEVER');

// -------------------------------------------------------------
// TEST 3: DYNAMIC ANSWER MODIFICATION & PRUNING
// Answer Distance YES + q_faces, then switch Distance to NO
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Dynamic Answer Change & Inapplicable Answers Pruning ---');

// Initial state: user answered distance difficulty and filled out distance follow-ups
const initialAnswers = {
  q_dist: 'MILD',
  q_faces: 'OFTEN',
  q_boards: 'CANNOT_READ',
  q_spectacles: 'CURRENT_USER',
  q_glasses_age: 'OVER_2_YEARS',
  q_glasses_type: 'READING_ONLY',
};

// User goes back and changes Distance to NONE, and spectacles to NEVER
const modifiedAnswers = {
  ...initialAnswers,
  q_dist: 'NONE',
  q_spectacles: 'NEVER',
};

const pruned = pruneInapplicableAnswers(modifiedAnswers);
console.log('Answers before pruning keys:', Object.keys(modifiedAnswers));
console.log('Answers after pruning keys:', Object.keys(pruned));

assert(pruned.q_faces === undefined, 'q_faces is pruned when q_dist is changed to NONE');
assert(pruned.q_boards === undefined, 'q_boards is pruned when q_dist is changed to NONE');
assert(pruned.q_glasses_age === undefined, 'q_glasses_age is pruned when q_spectacles is changed to NEVER');
assert(pruned.q_glasses_type === undefined, 'q_glasses_type is pruned when q_spectacles is changed to NEVER');
assert(pruned.q_dist === 'NONE', 'q_dist = NONE is preserved');
assert(pruned.q_spectacles === 'NEVER', 'q_spectacles = NEVER is preserved');

// Verify Summary Generation: Stale answers never leak into clinical summary
const formattedAnswersForSummary = Object.entries(pruned).map(([qid, val]) => ({
  questionId: qid,
  sectionId: 'sec_basic',
  questionText: qid,
  category: 'DISTANCE_VISION',
  answerValue: val,
  answerLabel: val,
  answerType: 'CHOICE',
  language: 'en',
  inputMethod: 'OPTION_CLICK',
  isRedFlag: false,
  answeredAt: new Date(),
}));

const summary = generateDeterministicSummary(formattedAnswersForSummary, []);
console.log('Distance concerns in summary:', summary.distanceVisionConcerns);
assert(
  summary.distanceVisionConcerns.length === 0,
  'Summary distanceVisionConcerns is empty because pruned q_faces/q_boards do not leak'
);
assert(
  summary.spectacleHistory === 'Never prescribed or worn spectacles',
  'Summary spectacleHistory correctly reflects NEVER, without stale glasses age or type'
);

// -------------------------------------------------------------
// TEST 4: RED FLAG CONCERNING SYMPTOM HANDLING
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Urgent Red Flag Warning Triggers ---');

const urgentAnswers = {
  ...scenarioAAnswers,
  q_sudden_loss: 'YES_SUDDEN_DROP',
};

const warningFlag = {
  flagType: 'RED_FLAG_URGENT',
  questionId: 'q_sudden_loss',
  severity: 'URGENT',
  descriptionEn: 'Sudden vision loss reported. Prompt medical assessment required.',
  descriptionHi: 'अचानक दृष्टि हानि की सूचना।',
};

const urgentFormattedAnswers = Object.entries(urgentAnswers).map(([qid, val]) => ({
  questionId: qid,
  sectionId: 'sec_warning',
  questionText: qid,
  category: qid === 'q_sudden_loss' ? 'RED_FLAG_URGENT' : 'DISTANCE_VISION',
  answerValue: val,
  answerLabel: val,
  answerType: 'CHOICE',
  language: 'en',
  inputMethod: 'OPTION_CLICK',
  isRedFlag: qid === 'q_sudden_loss',
  answeredAt: new Date(),
}));

const urgentSummary = generateDeterministicSummary(urgentFormattedAnswers, [warningFlag]);
assert(
  urgentSummary.warningSymptoms.length > 0,
  'Urgent warning symptoms are highlighted in clinical summary'
);
assert(
  urgentSummary.warningSymptoms[0].includes('Sudden vision loss'),
  'Warning symptom describes sudden vision loss'
);

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n===============================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('===============================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

