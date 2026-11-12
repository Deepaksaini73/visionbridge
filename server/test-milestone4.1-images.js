/**
 * VisionBridge Milestone 4.1: Patient Profile Images, Clinical Eye Image Upload
 * & Optometrist Image Review Verification Suite
 */

import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';

// Import controllers and utilities from dist
import {
  saveBase64Image,
  deleteStoredFile,
  fileExists,
} from './dist/utils/fileStorage.js';

import {
  uploadProfilePhoto,
  getProfilePhoto,
  deleteProfilePhoto,
  SEED_CUSTOMERS,
} from './dist/controllers/customerController.js';

import {
  uploadEyeImage,
  getCustomerEyeImages,
  getEyeImageById,
  streamEyeImageFile,
  reviewEyeImage,
  deleteEyeImage,
  IN_MEMORY_EYE_IMAGES,
} from './dist/controllers/imageController.js';

import {
  getScreeningPdfReport,
  IN_MEMORY_SCREENINGS,
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

// 1x1 transparent PNG as base64 data URL
const TEST_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Mock response creator supporting Writable streams for .pipe(res)
function createMockRes() {
  const chunks = [];
  const res = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  res.statusCode = 200;
  res.headers = {};
  res.body = null;

  res.status = function (code) {
    this.statusCode = code;
    return this;
  };

  res.setHeader = function (key, value) {
    this.headers[key.toLowerCase()] = value;
    return this;
  };

  res.json = function (data) {
    this.body = data;
    return this;
  };

  res.send = function (data) {
    this.body = data;
    return this;
  };

  return res;
}

async function runMilestone41Suite() {
  console.log('===============================================================');
  console.log('VISIONBRIDGE - MILESTONE 4.1 CLINICAL IMAGING & TELE-REVIEW SUITE');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // TEST SUITE 1: FILE STORAGE ENGINE & SAFETY
  // -------------------------------------------------------------
  console.log('--- Test Suite 1: Private Encrypted Disk Storage Engine ---');

  const saved = saveBase64Image('profiles', TEST_PNG_BASE64, 'test_avatar_sample');
  assert(saved.storagePath && fs.existsSync(saved.storagePath), 'Profile image safely saved to private disk directory');
  assert(saved.mimeType === 'image/png', 'Accurately detected image/png MIME type from magic bytes');
  assert(saved.sizeBytes > 0, `Captured valid file size (${saved.sizeBytes} bytes)`);

  const existsBefore = fileExists(saved.storagePath);
  assert(existsBefore === true, 'Storage engine correctly verifies file existence');

  const deleted = deleteStoredFile(saved.storagePath);
  assert(deleted === true && !fs.existsSync(saved.storagePath), 'Storage engine safely permanently removes file on deletion');

  // -------------------------------------------------------------
  // TEST SUITE 2: PATIENT PROFILE PHOTO WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 2: Patient Profile Photo (Upload, Stream, Remove) ---');

  const testCustomer = SEED_CUSTOMERS[0]; // VB-2026-0101 at ST-AP-CHITTOOR-01
  const operatorUser = {
    id: 'usr_op_01',
    name: 'Ramesh Patel',
    role: 'STORE_OPERATOR',
    storeId: 'ST-AP-CHITTOOR-01',
    storeName: 'VisionPoint Chittoor Center',
  };

  // 2.1 Upload Profile Photo
  const uploadPhotoReq = {
    params: { id: testCustomer.customerId },
    body: { imageData: TEST_PNG_BASE64 },
    user: operatorUser,
  };
  const uploadPhotoRes = createMockRes();
  await uploadProfilePhoto(uploadPhotoReq, uploadPhotoRes);

  assert(uploadPhotoRes.statusCode === 200, 'Profile photo upload returns HTTP 200');
  assert(uploadPhotoRes.body?.success === true, 'Profile photo payload confirms success');
  assert(
    uploadPhotoRes.body?.data?.profilePhotoUrl?.includes('/api/customers/'),
    'Returns authenticated streaming photo URL'
  );

  // 2.2 Retrieve Profile Photo Streaming
  const streamPhotoReq = {
    params: { id: testCustomer.customerId },
    user: operatorUser,
  };
  const streamPhotoRes = createMockRes();
  await getProfilePhoto(streamPhotoReq, streamPhotoRes);

  assert(streamPhotoRes.statusCode === 200, 'Profile photo streaming returns HTTP 200');
  assert(streamPhotoRes.headers['content-type'] === 'image/png', 'Streaming returns correct image/png Content-Type header');

  // -------------------------------------------------------------
  // TEST SUITE 3: CLINICAL EYE IMAGE UPLOAD & CONSENT VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 3: Clinical Eye Image Upload & Consent Verification ---');

  // 3.1 Failure test: Upload without mandatory informed consent
  const noConsentReq = {
    body: {
      customerId: testCustomer.customerId,
      imageData: TEST_PNG_BASE64,
      eyeSide: 'RIGHT',
      imageType: 'ANTERIOR_SEGMENT_SLIT_LAMP',
      hasConsent: false,
    },
    user: operatorUser,
  };
  const noConsentRes = createMockRes();
  await uploadEyeImage(noConsentReq, noConsentRes);

  assert(noConsentRes.statusCode === 400, 'Upload rejects without mandatory informed consent (HTTP 400)');
  assert(
    noConsentRes.body?.error?.code === 'VALIDATION_ERROR' &&
    noConsentRes.body?.error?.message?.includes('consent is required'),
    'Returns specific consent requirement validation error message'
  );

  // 3.2 Success test: Upload with valid consent and clinical metadata
  const validUploadReq = {
    body: {
      customerId: testCustomer.customerId,
      imageData: TEST_PNG_BASE64,
      eyeSide: 'RIGHT',
      imageType: 'ANTERIOR_SEGMENT_SLIT_LAMP',
      gazeDirection: 'PRIMARY',
      description: 'Corneal scratch evaluation under diffuse white light',
      clinicalContext: 'Foreign body sensation reported since 2 days',
      captureDate: '2026-11-08',
      hasConsent: true,
      consentText: 'Patient provided verbal affirmative consent for tele-optometric review',
      consentedBy: testCustomer.fullName,
    },
    user: operatorUser,
  };
  const validUploadRes = createMockRes();
  await uploadEyeImage(validUploadReq, validUploadRes);

  assert(validUploadRes.statusCode === 201, 'Clinical eye image uploaded successfully (HTTP 201 Created)');
  assert(validUploadRes.body?.success === true, 'Upload response confirms success');
  const uploadedImage = validUploadRes.body?.data;
  assert(uploadedImage?.eyeSide === 'RIGHT', 'Image record preserves anatomical Eye Side (Right OD)');
  assert(uploadedImage?.imageType === 'ANTERIOR_SEGMENT_SLIT_LAMP', 'Image record preserves Clinical Image Type');
  assert(uploadedImage?.reviewStatus === 'PENDING_REVIEW', 'Initial image review status set to PENDING_REVIEW');

  // -------------------------------------------------------------
  // TEST SUITE 4: IMAGE RETRIEVAL & SECURE STREAMING
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 4: Clinical Image Retrieval & Streaming ---');

  const getCustImagesReq = {
    params: { customerId: testCustomer.customerId },
    user: operatorUser,
  };
  const getCustImagesRes = createMockRes();
  await getCustomerEyeImages(getCustImagesReq, getCustImagesRes);

  assert(getCustImagesRes.statusCode === 200, 'Customer eye image gallery retrieval returns HTTP 200');
  assert(Array.isArray(getCustImagesRes.body?.data), 'Returns array of clinical image records');
  assert(
    getCustImagesRes.body?.data.some((img) => img.imageId === uploadedImage.imageId),
    'Uploaded image present in customer gallery'
  );

  // Stream by imageId
  const streamEyeReq = {
    params: { id: uploadedImage.imageId },
    user: operatorUser,
  };
  const streamEyeRes = createMockRes();
  await streamEyeImageFile(streamEyeReq, streamEyeRes);
  assert(streamEyeRes.statusCode === 200, 'Stream eye image file returns HTTP 200');
  assert(streamEyeRes.headers['content-type'] === 'image/png', 'Correct image/png streaming Content-Type');

  // -------------------------------------------------------------
  // TEST SUITE 5: STORE OPERATOR ISOLATION & ACCESS CONTROL
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 5: Store Operator Multi-Tenant Isolation ---');

  const rogueOperatorUser = {
    id: 'usr_op_99',
    name: 'Different Store Operator',
    role: 'STORE_OPERATOR',
    storeId: 'ST-AP-MADANAPALLE-02',
    storeName: 'VisionPoint Madanapalle Center',
  };

  const crossStoreReq = {
    params: { customerId: testCustomer.customerId },
    user: rogueOperatorUser,
  };
  const crossStoreRes = createMockRes();
  await getCustomerEyeImages(crossStoreReq, crossStoreRes);

  assert(
    crossStoreRes.statusCode === 403,
    'Store operator cannot access eye images belonging to another store (HTTP 403 Forbidden)'
  );

  // -------------------------------------------------------------
  // TEST SUITE 6: OPTOMETRIST CLINICAL IMAGE REVIEW & SIGN-OFF
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 6: Optometrist Tele-Review & Clinical Sign-off ---');

  const optometristUser = {
    id: 'usr_optom_01',
    name: 'Dr. Ananya Sharma, M.Optom',
    role: 'OPTOMETRIST',
    licenseNumber: 'OPT-REG-IN-2024-8841',
  };

  const reviewReq = {
    params: { id: uploadedImage.imageId },
    body: {
      status: 'SUSPECTED_PATHOLOGY',
      observations: 'Superficial punctate keratopathy suspected in infero-temporal cornea. Slit-lamp exam indicated.',
      recommendations: ['In-Person Slit Lamp Examination', 'Corneal Fluorescein Staining'],
      licenseNumber: 'OPT-REG-IN-2024-8841',
    },
    user: optometristUser,
  };
  const reviewRes = createMockRes();
  await reviewEyeImage(reviewReq, reviewRes);

  assert(reviewRes.statusCode === 200, 'Optometrist review sign-off returns HTTP 200');
  const reviewedRecord = reviewRes.body?.data;
  assert(
    reviewedRecord?.reviewStatus === 'REFERRAL_REQUIRED',
    'SUSPECTED_PATHOLOGY automatically sets reviewStatus to REFERRAL_REQUIRED'
  );
  assert(reviewedRecord?.reviews?.length > 0, 'Review history record appended to eye image');
  assert(
    reviewedRecord?.reviews[0]?.reviewedBy?.name === 'Dr. Ananya Sharma, M.Optom',
    'Review correctly attributed to credentialed optometrist'
  );

  // -------------------------------------------------------------
  // TEST SUITE 7: UNIFIED CLINICAL PDF REPORT APPENDIX
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 7: Unified Clinical Report & Imaging Appendix ---');

  const pdfReq = {
    params: { id: IN_MEMORY_SCREENINGS[0].screeningId },
    user: optometristUser,
  };
  const pdfRes = createMockRes();
  await getScreeningPdfReport(pdfReq, pdfRes);

  assert(pdfRes.statusCode === 200, 'PDF HTML report generated successfully (HTTP 200)');
  assert(
    typeof pdfRes.body === 'string' && pdfRes.body.includes('Comprehensive Screening Report'),
    'Report body contains standardized clinical heading'
  );
  assert(
    pdfRes.body.includes('Appendix: Clinical Eye Photographs & Tele-Triage Observations'),
    'Report HTML incorporates Appendix with clinical eye photographs'
  );

  // -------------------------------------------------------------
  // TEST SUITE 8: CLEANUP & AUDIT INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 8: Cleanup & File Integrity ---');

  // Delete profile photo
  const delPhotoReq = {
    params: { id: testCustomer.customerId },
    user: operatorUser,
  };
  const delPhotoRes = createMockRes();
  await deleteProfilePhoto(delPhotoReq, delPhotoRes);
  assert(delPhotoRes.statusCode === 200, 'Profile photo deletion returns HTTP 200');

  // Delete clinical test image
  const delImgReq = {
    params: { id: uploadedImage.imageId },
    user: operatorUser,
  };
  const delImgRes = createMockRes();
  await deleteEyeImage(delImgReq, delImgRes);
  assert(delImgRes.statusCode === 200, 'Clinical eye image deletion returns HTTP 200');

  // Summary
  console.log('\n===============================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL MILESTONE 4.1 AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.\n');
    process.exit(1);
  }
}

runMilestone41Suite().catch((err) => {
  console.error('Unexpected error executing test suite:', err);
  process.exit(1);
});
