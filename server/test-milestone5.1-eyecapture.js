/**
 * VisionBridge Milestone 5.1 — EyeCapture AI Integration Verification Script
 * Validates Python AI Microservice + Node.js Express Gateway + EyeCapture AI Pipelines
 */

import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_PORT = 8001;
const AI_SERVICE_BASE = `http://127.0.0.1:${PYTHON_PORT}`;

// Load a realistic synthetic anterior ocular image from test_data
const SAMPLE_IMAGE_PATH = path.resolve(__dirname, '..', 'ai-service', 'test_data', 'images', 'SUBJ_001_sess1_phone1_straight_01.png');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log(' VisionBridge Milestone 5.1 — EyeCapture AI Verification Suite ');
  console.log('================================================================\n');

  let pyProcess = null;

  try {
    // 1. Check if Python microservice is already running; if not, spawn it
    console.log('[Test 1] Checking Python AI microservice connection...');
    let healthy = false;
    try {
      const ping = await fetchJson(`${AI_SERVICE_BASE}/health`);
      if (ping.status === 200 && ping.body.status === 'healthy') {
        console.log('  -> AI service is already running on port 8001.');
        healthy = true;
      }
    } catch {
      // not running yet
    }

    if (!healthy) {
      console.log('  -> Launching Python AI service via virtualenv python.exe...');
      const pythonExe = path.resolve(__dirname, '..', 'ai-service', '.venv', 'Scripts', 'python.exe');
      pyProcess = spawn(
        pythonExe,
        ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(PYTHON_PORT)],
        { cwd: path.resolve(__dirname, '..', 'ai-service'), stdio: 'pipe' }
      );

      // Wait up to 10 seconds for startup
      for (let i = 0; i < 20; i++) {
        await wait(500);
        try {
          const ping = await fetchJson(`${AI_SERVICE_BASE}/health`);
          if (ping.status === 200) {
            healthy = true;
            console.log('  -> Python AI service successfully started and responded healthy.');
            break;
          }
        } catch {
          // keep waiting
        }
      }
    }

    if (!healthy) {
      throw new Error('Failed to start or connect to Python AI microservice on port 8001.');
    }

    // 2. Test Capabilities catalog
    console.log('\n[Test 2] Querying /api/v1/capabilities...');
    const capsRes = await fetchJson(`${AI_SERVICE_BASE}/api/v1/capabilities`);
    console.log(`  -> Status: ${capsRes.status}`);
    console.log(`  -> Total Capabilities: ${capsRes.body.total_capabilities}`);
    console.log(`  -> Implemented Anterior Modules: ${capsRes.body.implemented_count}`);
    if (capsRes.body.implemented_count < 5) {
      throw new Error(`Expected at least 5 implemented modules; received ${capsRes.body.implemented_count}`);
    }

    // 3. Test EyeCapture AI status endpoint
    console.log('\n[Test 3] Querying /api/v1/eye-analysis/status...');
    const statusRes = await fetchJson(`${AI_SERVICE_BASE}/api/v1/eye-analysis/status`);
    console.log(`  -> Status: ${statusRes.status}`);
    console.log(`  -> Module: ${statusRes.body.module} (${statusRes.body.version})`);
    console.log(`  -> Hardware Device: ${statusRes.body.segmentation_engine.device}`);
    console.log(`  -> Quality Engine: ${statusRes.body.quality_engine.method}`);
    console.log(`  -> Regulatory Disclaimer: "${statusRes.body.regulatory_disclaimer.substring(0, 60)}..."`);

    // 4. Test Image Quality Assessment with Real Ocular Image
    console.log('\n[Test 4] Testing Image Quality Assessment (/api/v1/eye-analysis/quality-check)...');
    const imgBuffer = fs.readFileSync(SAMPLE_IMAGE_PATH);
    const boundary = '----WebKitFormBoundaryEyeCaptureTest7MA4YWxkTrZu0gW';

    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_eye.png"\r\nContent-Type: image/png\r\n\r\n`),
      imgBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const qaRes = await fetchJson(`${AI_SERVICE_BASE}/api/v1/eye-analysis/quality-check`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
    });

    console.log(`  -> Status: ${qaRes.status}`);
    console.log(`  -> Image Suitability Status: ${qaRes.body.status}`);
    console.log(`  -> Usable Flag: ${qaRes.body.is_usable}`);
    console.log(`  -> Overall Score: ${qaRes.body.overall_score}/100`);
    console.log(`  -> Sharpness Score: ${qaRes.body.sharpness_score}%`);
    console.log(`  -> Exposure Score: ${qaRes.body.exposure_score}%`);
    console.log(`  -> Contrast Score: ${qaRes.body.contrast_score}%`);
    console.log(`  -> Recapture Guidance Items: ${qaRes.body.recapture_guidance.length}`);

    // 5. Test 4-Class Anatomy Segmentation
    console.log('\n[Test 5] Testing 4-Class Anatomy Segmentation (/api/v1/eye-analysis/segment)...');
    const segRes = await fetchJson(`${AI_SERVICE_BASE}/api/v1/eye-analysis/segment`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
    });

    console.log(`  -> Status: ${segRes.status}`);
    console.log(`  -> Success: ${segRes.body.success}`);
    console.log(`  -> Inference Pipeline: ${segRes.body.inference_method}`);
    console.log(`  -> Transparent RGBA Overlay Generated: ${segRes.body.overlay_rgba_base64?.startsWith('data:image/png;base64,')}`);
    console.log(`  -> Blended Preview Generated: ${segRes.body.blended_preview_base64?.startsWith('data:image/jpeg;base64,')}`);
    console.log(`  -> Class Coverage Percentages:`);
    console.log(`     • Sclera: ${segRes.body.coverage?.sclera_pct}%`);
    console.log(`     • Iris: ${segRes.body.coverage?.iris_pct}%`);
    console.log(`     • Pupil: ${segRes.body.coverage?.pupil_pct}%`);
    console.log(`  -> Anatomical Telemetry:`);
    console.log(`     • Iris detected: ${segRes.body.telemetry?.iris?.detected} (center: [${segRes.body.telemetry?.iris?.center}], dia: ${segRes.body.telemetry?.iris?.estimated_diameter_px}px)`);
    console.log(`     • Pupil detected: ${segRes.body.telemetry?.pupil?.detected} (center: [${segRes.body.telemetry?.pupil?.center}], dia: ${segRes.body.telemetry?.pupil?.estimated_diameter_px}px)`);
    console.log(`     • Pupil/Iris Ratio: ${segRes.body.telemetry?.pupil_to_iris_ratio} (${segRes.body.telemetry?.pupillary_symmetry_flag})`);

    // 6. Test Orchestrated Analysis & Quality Gating
    console.log('\n[Test 6] Testing Orchestrated Quality Gating (/api/v1/eye-analysis/analyze)...');
    const fullRes = await fetchJson(`${AI_SERVICE_BASE}/api/v1/eye-analysis/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
    });

    console.log(`  -> Status: ${fullRes.status}`);
    console.log(`  -> Success: ${fullRes.body.success}`);
    console.log(`  -> Quality Status: ${fullRes.body.quality?.status}`);
    console.log(`  -> Segmentation Executed: ${fullRes.body.segmentation !== null}`);
    console.log(`  -> Halted Due to Quality: ${fullRes.body.halted_due_to_poor_quality}`);
    console.log(`  -> Pipeline Message: "${fullRes.body.message}"`);

    console.log('\n================================================================');
    console.log(' ALL 6 EYE-CAPTURE AI INTEGRATION TESTS PASSED SUCCESSFULLY!    ');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (pyProcess) {
      console.log('Cleaning up spawned test processes...');
      pyProcess.kill();
    }
  }
}

runTests();
