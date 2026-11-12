const app = require('./dist/app.js').default;
const http = require('http');

let server;
const PORT = 5060;

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
  console.log('================================================================');
  console.log('   VISIONBRIDGE MILESTONE 3: VOICE INTERVIEW ENGINE & ADAPTIVE LOGIC');
  console.log('================================================================\n');

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
    // 1. Authenticate Operator 1 (Chittoor Store: ST-AP-CHITTOOR-01)
    const op1Login = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { demoRole: 'STORE_OPERATOR' });

    assert(op1Login.status === 200, 'Operator 1 logs in successfully');
    const token1 = op1Login.body?.data?.token;
    assert(!!token1, 'Operator 1 received valid signed JWT');

    // 2. Start a new Vision Interview for customer VB-2026-0103
    const startRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/interviews/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    }, {
      customerId: 'VB-2026-0103',
      language: 'hi'
    });

    assert(startRes.status === 201 || startRes.status === 200, 'Start Interview returns 200/201', JSON.stringify(startRes.body));
    const interview = startRes.body?.data;
    const interviewId = interview?.interviewId;
    assert(!!interviewId, `Interview created with ID: ${interviewId}`);
    assert(interview?.status === 'IN_PROGRESS', 'Interview status is IN_PROGRESS');
    assert(interview?.language === 'hi', 'Interview language initialized to Hindi');

    // 3. Save Draft Progress (Section A: Basic vision answers)
    const progressAnswers = [
      {
        questionId: 'q_dist',
        sectionId: 'sec_basic',
        questionText: 'Do you experience difficulty seeing objects or people at a distance?',
        category: 'DISTANCE_VISION',
        answerValue: 'MODERATE',
        answerLabel: 'मध्यम परेशानी (पहचानने में दिक्कत)',
        answerType: 'CHOICE',
        inputMethod: 'OPTION_CLICK',
        isRedFlag: false,
      },
      {
        questionId: 'q_near',
        sectionId: 'sec_basic',
        questionText: 'Do you experience difficulty reading nearby text or fine print?',
        category: 'NEAR_VISION',
        answerValue: 'MILD',
        answerLabel: 'पढ़ने में हल्का तनाव / थकान',
        answerType: 'CHOICE',
        inputMethod: 'VOICE',
        voiceTranscript: 'हल्का तनाव होता है पढ़ने में',
        isRedFlag: false,
      },
      {
        questionId: 'q_duration',
        sectionId: 'sec_basic',
        questionText: 'How long have you noticed these vision difficulties?',
        category: 'BLURRED_VISION',
        answerValue: '1_TO_6_MONTHS',
        answerLabel: '1 से 6 महीने से',
        answerType: 'CHOICE',
        inputMethod: 'OPTION_CLICK',
        isRedFlag: false,
      }
    ];

    const saveRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/interviews/${interviewId}/progress`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    }, {
      answers: progressAnswers,
      completedSections: ['sec_basic'],
      language: 'hi'
    });

    assert(saveRes.status === 200, 'Save draft progress returns 200', JSON.stringify(saveRes.body));
    assert(saveRes.body?.data?.answers?.length === 3, 'Recorded 3 answers in progress draft');

    // 4. Fetch in-progress interview by ID
    const getRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/interviews/${interviewId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });

    assert(getRes.status === 200, 'Fetch interview by ID returns 200');
    assert(getRes.body?.data?.interviewId === interviewId, 'Fetched interview matches interviewId');

    // 5. Test Red-Flag Interception & Complete Interview
    // We add an urgent symptom (q_sudden_loss = YES_SUDDEN_DROP)
    const completeAnswers = [
      ...progressAnswers,
      {
        questionId: 'q_spectacles',
        sectionId: 'sec_history',
        questionText: 'Do you currently wear eyeglasses, or have you worn them in the past?',
        category: 'LIFESTYLE',
        answerValue: 'NEVER',
        answerLabel: 'कभी चश्मा नहीं लगाया',
        answerType: 'CHOICE',
        inputMethod: 'OPTION_CLICK',
        isRedFlag: false,
      },
      {
        questionId: 'q_sudden_loss',
        sectionId: 'sec_warning',
        questionText: 'Have you experienced a sudden, unexpected drop in vision, or a dark curtain/veil coming over your eye?',
        category: 'RED_FLAG_URGENT',
        answerValue: 'YES_SUDDEN_DROP',
        answerLabel: 'हाँ: दृष्टि में अचानक भारी गिरावट आई है',
        answerType: 'CHOICE',
        inputMethod: 'VOICE',
        voiceTranscript: 'अचानक दाहिनी आँख की नजर बहुत कम हो गई थी',
        isRedFlag: true,
      }
    ];

    const completeRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/interviews/${interviewId}/complete`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    }, {
      answers: completeAnswers,
      completedSections: ['sec_basic', 'sec_daily', 'sec_history', 'sec_warning', 'sec_lifestyle'],
      durationSeconds: 340,
      language: 'hi'
    });

    assert(completeRes.status === 200, 'Complete interview returns 200', JSON.stringify(completeRes.body));
    const completedData = completeRes.body?.data;
    assert(completedData?.status === 'COMPLETED', 'Interview status updated to COMPLETED');
    assert(completedData?.hasRedFlags === true, 'Red flag condition correctly detected (hasRedFlags = true)');
    assert(completedData?.warningFlags?.length >= 1, `Urgent warning flag logged: ${completedData?.warningFlags?.[0]?.descriptionEn}`);
    assert(!!completedData?.summary?.aiSummarySnippet, `Structured summary generated: "${completedData?.summary?.aiSummarySnippet}"`);

    // 6. Verify Customer record workflowStatus updated to INTERVIEW_COMPLETED
    const custCheck = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/customers/VB-2026-0103',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });

    assert(custCheck.status === 200, 'Customer record retrieved');
    assert(
      custCheck.body?.data?.workflowStatus === 'INTERVIEW_COMPLETED',
      `Customer workflow status is INTERVIEW_COMPLETED (actual: ${custCheck.body?.data?.workflowStatus})`
    );

    // 7. Verify Fetch Interview History for Customer
    const histRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/interviews/customer/VB-2026-0103',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });

    assert(histRes.status === 200, 'Customer interview history retrieved');
    assert(histRes.body?.data?.latest?.interviewId === interviewId, 'Latest interview matches completed interview');

    // 8. Test Store-Level Security Isolation
    // Login as Operator 2 (Store 2: ST-AP-MADANAPALLE-02)
    const op2Login = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'operator2@visionbridge.org',
      password: 'OperatorPass123!'
    });

    if (op2Login.status === 200 && op2Login.body?.data?.token) {
      const token2 = op2Login.body.data.token;
      
      // Operator 2 attempts to fetch Operator 1's customer interview (Store 1: ST-AP-CHITTOOR-01)
      const crossStoreRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/interviews/${interviewId}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token2}` }
      });

      assert(
        crossStoreRes.status === 403,
        `Cross-store interview access blocked with HTTP 403 (actual: ${crossStoreRes.status})`,
        JSON.stringify(crossStoreRes.body)
      );
    } else {
      console.log('[SKIP] Operator 2 login not available for cross-store test');
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    server.close();
  }
}

run();

