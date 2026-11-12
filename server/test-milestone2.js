const app = require('./dist/app.js').default;
const http = require('http');

let server;
const PORT = 5057;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('   VISIONBRIDGE MILESTONE 2: SECURITY & CUSTOMER API TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  // Start temporary server
  await new Promise(resolve => {
    server = app.listen(PORT, resolve);
  });

  try {
    // TEST 1: Login with valid credentials
    const loginRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'operator@visionbridge.org',
      password: 'OperatorPass123!'
    });

    assert(loginRes.status === 200 && loginRes.body.data?.token, '1. Login with valid Store Operator credentials', JSON.stringify(loginRes.body));
    const operator1Token = loginRes.body.data?.token;

    // TEST 2: Login with invalid credentials
    const invalidLoginRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'operator@visionbridge.org',
      password: 'WrongPassword999!'
    });
    assert(invalidLoginRes.status === 401, '2. Login with invalid password returns 401', JSON.stringify(invalidLoginRes.body));

    // TEST 3: Admin login
    const adminLoginRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'admin@visionbridge.org',
      password: 'VisionBridgeAdmin2026!'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.data?.user?.role === 'ADMIN', '3. Admin login returns signed JWT with ADMIN role');
    const adminToken = adminLoginRes.body.data?.token;

    // TEST 4: Security Boundary: Public registration attempt to forge ADMIN role
    const forgeAdminRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Malicious User',
      email: 'hacker@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'ADMIN' // Trying to self-register as ADMIN
    });
    assert(forgeAdminRes.status === 403, '4. Public self-registration as ADMIN is strictly blocked with 403 Forbidden', JSON.stringify(forgeAdminRes.body));

    // TEST 5: Legitimate Store Operator registration
    const regRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Ravi Teja',
      email: 'ravi.teja@visionpoint.org',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'STORE_OPERATOR',
      storeId: 'ST-AP-CHITTOOR-01'
    });
    assert(regRes.status === 201 && regRes.body.data?.token, '5. Public self-registration as Store Operator succeeds with 201 Created');

    // TEST 6: Forgot Password workflow & Dev Token generation
    const forgotRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/forgot-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'ravi.teja@visionpoint.org'
    });
    assert(forgotRes.status === 200 && forgotRes.body.data?.devResetToken, '6. Forgot Password issues secure reset token in dev simulation');
    const devToken = forgotRes.body.data?.devResetToken;

    // TEST 7: Reset Password execution with token
    const resetRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/reset-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      token: devToken,
      password: 'NewStrongPassword2026!',
      confirmPassword: 'NewStrongPassword2026!'
    });
    assert(resetRes.status === 200, '7. Password Reset succeeds with valid token and enforces bcrypt update');

    // TEST 8: Store-Level Customer Isolation
    // Operator 1 (Chittoor) requests /api/customers
    const op1CustomersRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/customers',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${operator1Token}`
      }
    });
    const op1List = op1CustomersRes.body.data || [];
    const hasOnlyChittoor = op1List.every(c => c.storeId === 'ST-AP-CHITTOOR-01');
    assert(op1CustomersRes.status === 200 && hasOnlyChittoor && op1List.length > 0, '8. Store Operator customer query is strictly isolated to their own store (Chittoor)');

    // TEST 9: Cross-Store Access Denial
    // Operator 1 attempts to access customer VB-2026-0201 from Madanapalle store
    const crossStoreRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/customers/VB-2026-0201',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${operator1Token}`
      }
    });
    assert(crossStoreRes.status === 403, '9. Cross-store customer access attempt is blocked with 403 Forbidden', JSON.stringify(crossStoreRes.body));

    // TEST 10: Customer Registration with Consent Validation
    // Missing consent should fail
    const missingConsentRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/customers',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${operator1Token}`,
        'Content-Type': 'application/json'
      }
    }, {
      fullName: 'Gita Devi',
      age: 38,
      gender: 'FEMALE',
      consentStatus: false // Missing affirmative consent
    });
    assert(missingConsentRes.status === 400, '10. Customer registration rejected if affirmative informed consent is false');

    // Valid customer creation
    const validCustomerRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/customers',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${operator1Token}`,
        'Content-Type': 'application/json'
      }
    }, {
      fullName: 'Gita Devi',
      age: 38,
      gender: 'FEMALE',
      preferredLanguage: 'hi',
      consentStatus: true,
      notes: 'Experiencing near-vision fatigue when reading recipes'
    });
    assert(validCustomerRes.status === 201 && validCustomerRes.body.data?.customerId?.startsWith('VB-2026-'), '11. Customer registration creates unique VB-2026-XXXX ID and binds store ID automatically');
    const createdCustomerId = validCustomerRes.body.data?.customerId;

    // TEST 11: Customer Workflow Status Inspection
    const statusRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/customers/${createdCustomerId}/status`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${operator1Token}`
      }
    });
    assert(statusRes.status === 200 && statusRes.body.data?.stages?.length === 5, '12. Customer workflow status endpoint returns all 5 clinical stages');

    // TEST 12: Admin User Provisioning & Status Toggle
    const provisionRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/users',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Dr. Rahul Bose',
      email: 'dr.rahul@visionbridge.org',
      password: 'OptomPassword123!',
      role: 'OPTOMETRIST',
      licenseNumber: 'OPT-IN-2026-7788'
    });
    assert(provisionRes.status === 201 && provisionRes.body.data?.role === 'OPTOMETRIST', '13. Admin successfully provisions Optometrist Reviewer account');
    const newOptomId = provisionRes.body.data?.id;

    // Operator trying to access /api/users (forbidden)
    const opAccessUsersRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${operator1Token}`
      }
    });
    assert(opAccessUsersRes.status === 403, '14. Store Operator attempting to access admin user management is blocked with 403');

    // Admin deactivating account
    const deactivateRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/users/${newOptomId}/status`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    }, {
      isActive: false
    });
    assert(deactivateRes.status === 200, '15. Admin successfully deactivates user account');

  } catch (err) {
    console.error('[Fatal Test Error]:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSeed = undefined;
runTests();

