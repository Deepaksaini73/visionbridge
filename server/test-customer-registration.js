const app = require('./dist/app.js').default;
const http = require('http');

let server;
const PORT = 5059;

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
  console.log('Testing Customer Registration & duplicate key prevention...\n');
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
    // 1. Login as Store Operator to get JWT
    const opLogin = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { demoRole: 'STORE_OPERATOR' });

    assert(opLogin.status === 200, 'Operator login returns 200');
    const token = opLogin.body?.data?.token;
    assert(!!token, 'Operator JWT token obtained');

    // 2. Register Customer 1
    const cust1 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/customers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      fullName: 'Aarav Sharma',
      age: 45,
      gender: 'MALE',
      phone: '+91 98765 11111',
      preferredLanguage: 'hi',
      consentStatus: true,
      notes: 'Initial check'
    });

    assert(cust1.status === 201, 'Register Customer 1 returns 201 Created', JSON.stringify(cust1.body));
    assert(cust1.body?.data?.customerId, 'Customer 1 has customerId: ' + cust1.body?.data?.customerId);
    assert(cust1.body?.data?.customerCode, 'Customer 1 has customerCode: ' + cust1.body?.data?.customerCode);
    assert(cust1.body?.data?.customerCode === cust1.body?.data?.customerId, 'customerCode matches customerId');

    // 3. Register Customer 2 (verify NO E11000 duplicate key error on customerCode: null)
    const cust2 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/customers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      fullName: 'Pooja Reddy',
      age: 52,
      gender: 'FEMALE',
      phone: '+91 98765 22222',
      preferredLanguage: 'hi',
      consentStatus: true,
      notes: 'Second customer test'
    });

    assert(cust2.status === 201, 'Register Customer 2 returns 201 Created (no duplicate key collision)', JSON.stringify(cust2.body));
    assert(cust2.body?.data?.customerCode !== null, 'Customer 2 customerCode is not null');
    assert(cust2.body?.data?.customerId !== cust1.body?.data?.customerId, 'Customer 2 has distinct unique ID');

    // 4. Register Customer 3 with dateOfBirth instead of age
    const cust3 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/customers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      fullName: 'Kiran Patel',
      dateOfBirth: '1980-05-15',
      gender: 'OTHER',
      phone: '+91 98765 33333',
      preferredLanguage: 'en',
      consentStatus: true
    });

    assert(cust3.status === 201, 'Register Customer 3 returns 201 Created', JSON.stringify(cust3.body));

    // 5. Look up customer by customerCode / customerId
    const targetCode = cust1.body.data.customerCode;
    const getRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/customers/${targetCode}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    assert(getRes.status === 200, 'Lookup customer by customerCode succeeds', JSON.stringify(getRes.body));
    assert(getRes.body?.data?.fullName === 'Aarav Sharma', 'Customer details match');

    // 6. Test search including customerCode
    const searchRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/customers?search=${targetCode}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    assert(searchRes.status === 200, 'Search by customerCode succeeds', JSON.stringify(searchRes.body));
    assert(searchRes.body?.data?.length >= 1, 'Search returned matching customer');

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    server.close();
  }
}

run();

