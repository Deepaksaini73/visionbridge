const app = require('./dist/app.js').default;
const http = require('http');

let server;
const PORT = 5058;

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

async function run() {
  console.log('Testing one-click demo login & center locations...\n');
  await new Promise(res => { server = app.listen(PORT, res); });

  let passed = 0;
  let failed = 0;
  function assert(cond, name, info = '') {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${info}`);
      failed++;
    }
  }

  try {
    // 1. One-click login for ADMIN
    const adminLogin = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { demoRole: 'ADMIN' });

    assert(adminLogin.status === 200, 'Direct login for ADMIN returns 200', JSON.stringify(adminLogin.body));
    assert(adminLogin.body?.data?.token, 'ADMIN login returns valid JWT token');
    const adminToken = adminLogin.body?.data?.token;

    // 2. One-click login for STORE_OPERATOR
    const opLogin = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { demoRole: 'STORE_OPERATOR' });

    assert(opLogin.status === 200, 'Direct login for STORE_OPERATOR returns 200', JSON.stringify(opLogin.body));
    assert(opLogin.body?.data?.token, 'STORE_OPERATOR login returns valid JWT token');

    // 3. One-click login for OPTOMETRIST
    const docLogin = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { demoRole: 'OPTOMETRIST' });

    assert(docLogin.status === 200, 'Direct login for OPTOMETRIST returns 200', JSON.stringify(docLogin.body));
    assert(docLogin.body?.data?.token, 'OPTOMETRIST login returns valid JWT token');

    // 4. Test public GET /api/stores (no auth required)
    const publicStores = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/stores',
      method: 'GET'
    });
    assert(publicStores.status === 200, 'GET /api/stores is accessible without token', `status ${publicStores.status}`);
    assert(Array.isArray(publicStores.body?.data) && publicStores.body.data.length >= 3,
      `GET /api/stores returns centres list (found ${publicStores.body?.data?.length} centers)`);

    // 5. Test protected GET /api/users using the ADMIN token
    const usersRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert(usersRes.status === 200, 'Protected GET /api/users works with direct-login token (no Session Expired error)', `status ${usersRes.status}`);

    // 6. Test Admin creating a new STORE_OPERATOR with storeId
    const storeId = publicStores.body.data[0].storeId;
    const createRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      name: 'Ravi Kumar',
      email: 'ravi.op@visionbridge.org',
      password: 'Password@123',
      role: 'STORE_OPERATOR',
      storeId: storeId
    });
    assert(createRes.status === 201, 'Admin can create new Store Operator with selected centre location', JSON.stringify(createRes.body));

    // 7. Test Admin creating a new OPTOMETRIST with storeId
    const createDocRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      name: 'Dr. Anita Desai',
      email: 'dr.anita@visionbridge.org',
      password: 'Password@123',
      role: 'OPTOMETRIST',
      storeId: storeId
    });
    assert(createDocRes.status === 201, 'Admin can create new Specialist Doctor with selected centre location', JSON.stringify(createDocRes.body));

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    server.close();
  }
}

run();

