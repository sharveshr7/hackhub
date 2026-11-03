/**
 * HACKHUB — LIVE PRODUCTION DEPLOYMENT VERIFICATION
 * Tests live endpoints at https://hackhub-nu.vercel.app/
 */

const PROD_BASE = 'https://hackhub-nu.vercel.app';

console.log('========================================================================');
console.log(`  HACKHUB — PRODUCTION DEPLOYMENT VERIFICATION (${PROD_BASE})`);
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function run() {
  try {
    // 1. Frontend Homepage Delivery
    console.log('1. Checking Production Web Frontend Delivery...');
    const homeRes = await fetch(`${PROD_BASE}/`);
    assert(homeRes.status === 200, `Homepage delivers HTTP 200 OK (got ${homeRes.status})`);
    const homeHtml = await homeRes.text();
    assert(homeHtml.toLowerCase().includes('<!doctype html>') && homeHtml.includes('HackHub'), 'Homepage delivers valid HTML with HackHub branding');

    // 2. Student Auth API Health Check
    console.log('\n2. Checking Production /api/student-auth Health Check...');
    const healthRes = await fetch(`${PROD_BASE}/api/student-auth`);
    assert(healthRes.status === 200, `/api/student-auth responds with HTTP 200 OK (got ${healthRes.status})`);
    const healthJson = await healthRes.json();
    assert(healthJson.status === 'ok' && healthJson.service.includes('HackHub'), `/api/student-auth health check confirms active service: "${healthJson.service}"`);

    // 3. Admin Users API Unauthorized Protection
    console.log('\n3. Checking Production /api/admin/users Security Boundary...');
    const unauthUsersRes = await fetch(`${PROD_BASE}/api/admin/users`);
    assert(unauthUsersRes.status === 401, `Unauthenticated request to /api/admin/users rejected with HTTP 401 Unauthorized (got ${unauthUsersRes.status})`);

    const badTokenUsersRes = await fetch(`${PROD_BASE}/api/admin/users`, {
      headers: { Authorization: 'Bearer fake-invalid-token-12345' }
    });
    assert(badTokenUsersRes.status === 401, `Invalid token request to /api/admin/users rejected with HTTP 401 Unauthorized (got ${badTokenUsersRes.status})`);

    // 4. Student Authentication Rejection & Anti-Enumeration
    console.log('\n4. Checking Production Student Authentication on Live API...');
    const badAuthRes = await fetch(`${PROD_BASE}/api/student-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '717899P999', password: 'WrongPassword123!' })
    });
    assert(badAuthRes.status === 401, `Invalid student credentials rejected with HTTP 401 (got ${badAuthRes.status})`);
    const badAuthJson = await badAuthRes.json();
    assert(badAuthJson.error === 'Invalid registration number or password.', `Anti-enumeration message returned: "${badAuthJson.error}"`);

    // 5. Rate Limiting Protection on Production
    console.log('\n5. Checking Production Rate Limiting Guard...');
    let hitRateLimit = false;
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${PROD_BASE}/api/student-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '717899P999', password: 'WrongPassword123!' })
      });
      if (res.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit === true, 'Rapid failed attempts trigger HTTP 429 Rate Limiter on live production server');

    console.log('\n========================================================================');
    console.log(`  PRODUCTION DEPLOYMENT VERIFICATION: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log(`  SUCCESS RATE: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('Production test network error:', err.message);
  }
}

run();
