/**
 * VisionBridge Milestone 4.2: Comprehensive Security & Quality Audit Verification Suite
 *
 * Verifies:
 * 1. Strict media authentication & authorization (No unauthenticated exposure)
 * 2. Multi-tenant store isolation across operators and clinical cross-store access for optometrists
 * 3. Real AES-256-GCM file-level storage encryption at rest (with tamper-evidence)
 * 4. Mandatory informed patient consent enforcement
 * 5. Permanent file deletion and metadata consistency
 * 6. Metadata persistence across backend restart in standalone mode
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Writable } from 'stream';

// Import compiled backend modules
import {
  saveBase64Image,
  readStoredImageFile,
  decryptBuffer,
  deleteStoredFile,
  fileExists,
  ENCRYPTION_MAGIC_HEADER,
} from './dist/utils/fileStorage.js';

import {
  loadPersistedRegistry,
  persistCustomerPatch,
  removeCustomerPhotoPatch,
  persistEyeImageRecord,
  removeEyeImageRecord,
} from './dist/utils/metadataPersistence.js';

import {
  authenticateMedia,
} from './dist/middleware/auth.js';

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

const JWT_SECRET = process.env.JWT_SECRET || 'visionbridge_super_secure_jwt_secret_change_in_production';

// Test tracking
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

// 1x1 test PNG base64
const TEST_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TEST_PNG_RAW = Buffer.from(TEST_PNG_BASE64.split(',')[1], 'base64');

// Helper to generate test JWT tokens
function generateTestToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Mock Response Helper
function createMockRes() {
  const chunks = [];
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      this.headers[name.toLowerCase()] = val;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

// Tokens for different roles and stores
const store1OperatorToken = generateTestToken({
  id: 'usr_operator_01',
  email: 'operator1@visionbridge.org',
  name: 'Ramesh Patel',
  role: 'STORE_OPERATOR',
  storeId: 'ST-AP-CHITTOOR-01',
});

const store2OperatorToken = generateTestToken({
  id: 'usr_operator_02',
  email: 'operator2@visionbridge.org',
  name: 'Suresh Kumar',
  role: 'STORE_OPERATOR',
  storeId: 'ST-AP-MADANAPALLE-02',
});

const optometristToken = generateTestToken({
  id: 'usr_optometrist_01',
  email: 'dr.ananya@visionbridge.org',
  name: 'Dr. Ananya Sharma',
  role: 'OPTOMETRIST',
  licenseNumber: 'OPT-IN-2024-8841',
});

const adminToken = generateTestToken({
  id: 'usr_admin_01',
  email: 'admin@visionbridge.org',
  name: 'Dr. Vikram Malhotra',
  role: 'ADMIN',
});

console.log('\n===============================================================');
console.log('VISIONBRIDGE - MILESTONE 4.2 QUALITY & SECURITY AUDIT SUITE');
console.log('===============================================================\n');

// =========================================================================
// SECTION 1: Authentication & Protection Against Unauthenticated Exposure
// =========================================================================
console.log('--- Test Suite 1: Authentication & Media URL Protection ---');

// 1.1 Unauthenticated request with NO token rejected with 401
{
  const req = { headers: {}, query: {} };
  const res = createMockRes();
  let nextCalled = false;

  authenticateMedia(req, res, () => { nextCalled = true; });

  assert(!nextCalled, 'authenticateMedia blocks unauthenticated request from calling next()');
  assert(res.statusCode === 401, 'Unauthenticated media access returns HTTP 401 Unauthorized');
  assert(
    res.body?.error?.code === 'UNAUTHORIZED_MEDIA_ACCESS',
    'Returns UNAUTHORIZED_MEDIA_ACCESS error code'
  );
}

// 1.2 Invalid / expired token rejected with 401
{
  const req = { headers: { authorization: 'Bearer invalid_garbage_token' }, query: {} };
  const res = createMockRes();
  let nextCalled = false;

  authenticateMedia(req, res, () => { nextCalled = true; });

  assert(!nextCalled, 'authenticateMedia blocks invalid token');
  assert(res.statusCode === 401, 'Invalid token returns HTTP 401');
  assert(res.body?.error?.code === 'INVALID_TOKEN', 'Returns INVALID_TOKEN error code');
}

// 1.3 Authorization via Bearer header
{
  const req = { headers: { authorization: `Bearer ${store1OperatorToken}` }, query: {} };
  const res = createMockRes();
  let nextCalled = false;

  authenticateMedia(req, res, () => { nextCalled = true; });

  assert(nextCalled, 'authenticateMedia succeeds with Bearer token');
  assert(req.user?.id === 'usr_operator_01', 'Correctly decodes authenticated user from Bearer header');
}

// 1.4 Authorization via query parameter (?token=...)
{
  const req = { headers: {}, query: { token: store1OperatorToken } };
  const res = createMockRes();
  let nextCalled = false;

  authenticateMedia(req, res, () => { nextCalled = true; });

  assert(nextCalled, 'authenticateMedia succeeds with ?token= query parameter');
  assert(req.user?.id === 'usr_operator_01', 'Correctly decodes authenticated user from query parameter');
}

// 1.5 Authorization via cookie (vb_auth_token=...)
{
  const req = { headers: { cookie: `vb_auth_token=${store1OperatorToken}; other=123` }, query: {} };
  const res = createMockRes();
  let nextCalled = false;

  authenticateMedia(req, res, () => { nextCalled = true; });

  assert(nextCalled, 'authenticateMedia succeeds with Cookie header');
  assert(req.user?.id === 'usr_operator_01', 'Correctly decodes authenticated user from cookie');
}

// =========================================================================
// SECTION 2: Real AES-256-GCM Storage Encryption at Rest
// =========================================================================
console.log('\n--- Test Suite 2: AES-256-GCM Cryptographic Storage Encryption ---');

let auditStoragePath = '';
{
  // Save an image
  const saved = saveBase64Image('eye-images', TEST_PNG_BASE64, 'audit-enc');
  auditStoragePath = saved.storagePath;

  assert(saved.isEncrypted === true, 'File saved with isEncrypted: true flag');
  assert(fs.existsSync(saved.storagePath), 'Encrypted file exists on disk');

  // Read raw bytes directly from the physical filesystem
  const diskBytes = fs.readFileSync(saved.storagePath);

  // Check magic marker: VBP_ENC_v1
  const header = diskBytes.subarray(0, ENCRYPTION_MAGIC_HEADER.length);
  assert(
    header.equals(ENCRYPTION_MAGIC_HEADER),
    `Raw disk file begins with cryptographic header marker: ${ENCRYPTION_MAGIC_HEADER.toString()}`
  );

  // Check that raw disk file does NOT start with PNG magic bytes (\x89PNG)
  const isRawPng = diskBytes[0] === 0x89 && diskBytes[1] === 0x50 && diskBytes[2] === 0x4e && diskBytes[3] === 0x47;
  assert(!isRawPng, 'Raw physical disk file contains ciphertext, NOT plaintext PNG magic bytes');

  // Check decryption restores exact original plaintext buffer
  const decrypted = readStoredImageFile(saved.storagePath);
  assert(decrypted.isEncrypted === true, 'readStoredImageFile confirms file was encrypted at rest');
  assert(decrypted.buffer.equals(TEST_PNG_RAW), 'Decrypted buffer matches original PNG binary bit-for-bit');
  assert(decrypted.mimeType === 'image/png', 'MIME type accurately detected as image/png');

  // Tamper-evidence test: Flip a byte in the ciphertext payload
  const tamperedBytes = Buffer.from(diskBytes);
  // Flip a bit in the ciphertext region (past header, IV, and auth tag)
  tamperedBytes[tamperedBytes.length - 2] ^= 0xff;

  let tamperCaught = false;
  try {
    decryptBuffer(tamperedBytes);
  } catch (err) {
    tamperCaught = true;
  }
  assert(tamperCaught, 'AES-256-GCM authentication tag catches ciphertext tampering and throws integrity error');
}

// =========================================================================
// SECTION 3: Multi-Tenant Store Isolation & Optometrist Access
// =========================================================================
console.log('\n--- Test Suite 3: Multi-Tenant Store Isolation & RBAC ---');

// 3.1 Store Operator from Store 1 attempting to view customer photo from Store 2 (cust_04)
{
  const req = {
    params: { id: 'VB-2026-0201' }, // Store 2 customer
    user: { id: 'usr_operator_01', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await getProfilePhoto(req, res);

  assert(res.statusCode === 403, 'Cross-store profile photo access rejected with HTTP 403 Forbidden');
  assert(res.body?.error?.code === 'FORBIDDEN', 'Returns FORBIDDEN error code on cross-store access');
}

// 3.2 Store Operator from Store 1 attempting to list eye images for Store 2 customer
{
  const req = {
    params: { customerId: 'VB-2026-0201' }, // Store 2 customer
    user: { id: 'usr_operator_01', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await getCustomerEyeImages(req, res);

  assert(res.statusCode === 403, 'Cross-store customer eye image query rejected with HTTP 403 Forbidden');
  assert(res.body?.error?.code === 'CROSS_STORE_ACCESS_DENIED', 'Returns CROSS_STORE_ACCESS_DENIED');
}

// 3.3 Optometrist clinical cross-store access (allowed for tele-health review)
{
  const req = {
    params: { customerId: 'VB-2026-0101' }, // Store 1 customer
    user: { id: 'usr_optometrist_01', role: 'OPTOMETRIST', name: 'Dr. Ananya Sharma' },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await getCustomerEyeImages(req, res);

  assert(res.statusCode === 200, 'Optometrist can access customer images across stores (HTTP 200)');
  assert(Array.isArray(res.body?.data), 'Optometrist receives customer clinical image records');
}

// 3.4 Store Operator attempting to submit clinical optometrist review -> rejected 403
{
  const req = {
    params: { id: 'IMG-2026-0101-OD' },
    user: { id: 'usr_operator_01', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
    body: {
      observations: 'Unauthorized operator clinical notes',
      status: 'NORMAL',
    },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await reviewEyeImage(req, res);

  assert(res.statusCode === 403, 'Store operator cannot sign off on clinical reviews (HTTP 403 Forbidden)');
  assert(res.body?.error?.code === 'UNAUTHORIZED_REVIEWER', 'Returns UNAUTHORIZED_REVIEWER error');
}

// 3.5 Optometrist submitting clinical review -> succeeds 200
{
  const req = {
    params: { id: 'IMG-2026-0101-OD' },
    user: {
      id: 'usr_optometrist_01',
      name: 'Dr. Ananya Sharma',
      role: 'OPTOMETRIST',
      licenseNumber: 'OPT-IN-2024-8841',
    },
    body: {
      observations: 'Milestone 4.2 audit: Cornea intact, pupil round and reactive.',
      recommendations: ['Routine follow-up in 12 months'],
      status: 'NORMAL',
      licenseNumber: 'OPT-IN-2024-8841',
    },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await reviewEyeImage(req, res);

  assert(res.statusCode === 200, 'Optometrist clinical review recorded successfully (HTTP 200)');
  assert(res.body?.data?.reviewStatus === 'REVIEWED', 'Review status set to REVIEWED');
}

// =========================================================================
// SECTION 4: Mandatory Informed Consent Verification
// =========================================================================
console.log('\n--- Test Suite 4: Mandatory Informed Consent ---');

// 4.1 Upload eye image without consent -> rejected 400
{
  const req = {
    body: {
      customerId: 'VB-2026-0101',
      imageData: TEST_PNG_BASE64,
      eyeSide: 'RIGHT',
      hasConsent: false,
    },
    user: { id: 'usr_operator_01', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await uploadEyeImage(req, res);

  assert(res.statusCode === 400, 'Upload without patient consent rejected with HTTP 400');
  assert(
    res.body?.error?.message?.includes('consent is required'),
    'Returns explicit patient consent required validation message'
  );
}

// 4.2 Upload eye image with explicit consent -> succeeds 201
let uploadedAuditImageId = '';
{
  const req = {
    body: {
      customerId: 'VB-2026-0101',
      imageData: TEST_PNG_BASE64,
      eyeSide: 'RIGHT',
      imageType: 'EXTERNAL_PHOTO',
      hasConsent: true,
      consentText: 'Customer gave informed consent for ocular capture and tele-optometry review.',
      consentedBy: 'Lakshmi Narayanan',
    },
    user: { id: 'usr_operator_01', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await uploadEyeImage(req, res);

  assert(res.statusCode === 201, 'Upload with valid consent succeeds with HTTP 201 Created');
  assert(res.body?.data?.consentRecorded?.hasConsent === true, 'Consent record saved in image metadata');
  assert(res.body?.data?.isEncrypted === true, 'Response confirms image was encrypted at rest');
  uploadedAuditImageId = res.body?.data?.imageId;
}

// =========================================================================
// SECTION 5: Streaming & Decryption via Stream Endpoint
// =========================================================================
console.log('\n--- Test Suite 5: Secure Media Streaming & Decryption ---');

{
  const req = {
    params: { id: uploadedAuditImageId },
    user: { id: 'usr_operator_01', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await streamEyeImageFile(req, res);

  assert(res.statusCode === 200, 'Stream endpoint returns HTTP 200 for authorized requester');
  assert(res.headers['content-type'] === 'image/png', 'Correct image/png content-type header returned');
  assert(res.headers['x-storage-encrypted'] === 'AES-256-GCM', 'X-Storage-Encrypted header confirms AES-256-GCM');
  assert(Buffer.isBuffer(res.body), 'Decrypted payload delivered as binary Buffer');
  assert(res.body.equals(TEST_PNG_RAW), 'Streamed binary matches original unencrypted PNG bytes');
}

// =========================================================================
// SECTION 6: Standalone Metadata Persistence Across Restart
// =========================================================================
console.log('\n--- Test Suite 6: Persistence Across Backend Restart ---');

{
  // Check that metadata.json exists and contains our newly uploaded eye image
  const reg = loadPersistedRegistry();
  const foundInMetadata = reg.eyeImages.some((i) => i.imageId === uploadedAuditImageId);
  assert(foundInMetadata, 'Newly uploaded image metadata is persisted to storage/uploads/metadata.json');

  // Verify customer profile photo persistence
  persistCustomerPatch('VB-2026-0101', {
    profilePhotoUrl: '/api/customers/VB-2026-0101/photo',
    testAuditMarker: 'M42_VERIFIED',
  });

  const reloadedReg = loadPersistedRegistry();
  assert(
    reloadedReg.customers['VB-2026-0101']?.testAuditMarker === 'M42_VERIFIED',
    'Customer profile patch persists across reloads in metadata registry'
  );
}

// =========================================================================
// SECTION 7: Deletion & Cryptographic File Cleanup
// =========================================================================
console.log('\n--- Test Suite 7: Permanent Deletion & Disk Cleanup ---');

{
  // Find storage path of the uploaded image
  const targetImage = IN_MEMORY_EYE_IMAGES.find((i) => i.imageId === uploadedAuditImageId);
  const diskPath = targetImage?.imageStoragePath;
  assert(Boolean(diskPath && fs.existsSync(diskPath)), 'Encrypted file exists on disk prior to deletion');

  // Delete the image
  const req = {
    params: { id: uploadedAuditImageId },
    user: { id: 'usr_operator_01', role: 'STORE_OPERATOR', storeId: 'ST-AP-CHITTOOR-01' },
    ip: '127.0.0.1',
  };
  const res = createMockRes();

  await deleteEyeImage(req, res);

  assert(res.statusCode === 200, 'Delete eye image returns HTTP 200');
  assert(!fs.existsSync(diskPath), 'Encrypted image file is permanently unlinked from disk');

  // Verify deletion reflected in metadata registry
  const regAfterDel = loadPersistedRegistry();
  const archivedInReg = regAfterDel.eyeImages.find((i) => i.imageId === uploadedAuditImageId);
  assert(archivedInReg?.isArchived === true, 'Image archived in metadata registry on deletion');

  // Clean up audit test file
  if (auditStoragePath && fs.existsSync(auditStoragePath)) {
    deleteStoredFile(auditStoragePath);
  }
}

// =========================================================================
// Final Summary
// =========================================================================
console.log('\n===============================================================');
console.log(`TOTAL AUDIT TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('===============================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL MILESTONE 4.2 SECURITY & QUALITY AUDIT TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.error('❌ SOME AUDIT TESTS FAILED. PLEASE REVIEW LOG OUTPUT.');
  process.exit(1);
}
