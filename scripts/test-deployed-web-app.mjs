/**
 * Programmatic verification of the live deployed web application:
 * URL: https://foceye-2546c.web.app
 * 
 * Verifies:
 * 1. Live web hosting HTTP status and headers
 * 2. Deployed student login bundle contents and input types
 * 3. Deployed admin/faculty login bundle contents
 * 4. Google Identity Toolkit authentication responses against live Firebase Auth
 * 5. Production Firestore rule protection
 */

import fs from 'node:fs';

const BASE_URL = 'https://foceye-2546c.web.app';

function getDotEnvValue(key) {
  try {
    const line = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find((entry) =>
      entry.trimStart().startsWith(`${key}=`)
    );
    return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : '';
  } catch {
    return '';
  }
}

const API_KEY = process.env.VITE_FIREBASE_API_KEY || getDotEnvValue('VITE_FIREBASE_API_KEY');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

async function runDeployedTests() {
  console.log('========================================================================');
  console.log('  HACKHUB — DEPLOYED WEB APPLICATION VERIFICATION');
  console.log('  Testing live site: https://foceye-2546c.web.app');
  console.log('========================================================================\n');

  // Test 1: Student Login Page HTTP response
  console.log('[1. Live Student Login Endpoint & Bundle Inspection]');
  const studentPageRes = await fetch(`${BASE_URL}/student-login`);
  assert(studentPageRes.status === 200, 'Student login route returns HTTP 200 OK');

  const studentHtml = await studentPageRes.text();
  const bundleMatch = studentHtml.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/);
  assert(Boolean(bundleMatch), `Deployed index bundle found in HTML: ${bundleMatch ? bundleMatch[0] : 'None'}`);

  if (bundleMatch) {
    const bundleRes = await fetch(`${BASE_URL}${bundleMatch[0]}`);
    assert(bundleRes.status === 200, 'Main production JS bundle downloads with HTTP 200 OK');
    const bundleText = await bundleRes.text();

    assert(
      bundleText.includes('COLLEGE EMAIL OR REGISTRATION NUMBER'),
      'Production bundle contains updated label: "COLLEGE EMAIL OR REGISTRATION NUMBER"'
    );
    assert(
      bundleText.includes('Enter college email or registration number'),
      'Production bundle contains updated placeholder: "Enter college email or registration number"'
    );
    assert(
      bundleText.includes('type:"text"') || bundleText.includes('type:`text`'),
      'Production bundle identifier input is type="text" (allowing registration number input)'
    );
  }

  // Test 2: Admin Login Page HTTP response
  console.log('\n[2. Live Admin & Faculty Login Endpoint Inspection]');
  const adminPageRes = await fetch(`${BASE_URL}/admin/login`);
  assert(adminPageRes.status === 200, 'Admin login route returns HTTP 200 OK');

  // Test 3: Public Catalog HTTP response
  console.log('\n[3. Public Discovery & Catalog Inspection]');
  const catalogRes = await fetch(`${BASE_URL}/hackathons`);
  assert(catalogRes.status === 200, 'Public hackathon catalog route returns HTTP 200 OK');

  // Test 4: Live Google Identity Toolkit Authentication Checks
  console.log('\n[4. Live Identity Toolkit Checks against foceye-2546c]');
  
  // 4a. Authorized second-year BME student account with deliberately wrong password
  const studentAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const wrongPassRes = await fetch(studentAuthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'kit29.25bbm001@gmail.com',
      password: 'IntentionalWrongPassword999!',
      returnSecureToken: true
    })
  });
  const wrongPassData = await wrongPassRes.json();
  assert(
    wrongPassRes.status === 400 && wrongPassData.error?.message === 'INVALID_LOGIN_CREDENTIALS',
    'Real registered student email with bad password returns generic INVALID_LOGIN_CREDENTIALS'
  );

  // 4b. Unknown student email
  const unknownEmailRes = await fetch(studentAuthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent.student.kit@example.com',
      password: 'IntentionalWrongPassword999!',
      returnSecureToken: true
    })
  });
  const unknownEmailData = await unknownEmailRes.json();
  assert(
    unknownEmailRes.status === 400 && unknownEmailData.error?.message === 'INVALID_LOGIN_CREDENTIALS',
    'Nonexistent email returns identical generic INVALID_LOGIN_CREDENTIALS (anti-enumeration)'
  );

  // 4c. Verified missing account 711525BBM009
  const missingAccountRes = await fetch(studentAuthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'kit29.25bbm009@gmail.com',
      password: 'IntentionalWrongPassword999!',
      returnSecureToken: true
    })
  });
  const missingAccountData = await missingAccountRes.json();
  assert(
    missingAccountRes.status === 400 && missingAccountData.error?.message === 'INVALID_LOGIN_CREDENTIALS',
    'Missing student kit29.25bbm009@gmail.com returns generic INVALID_LOGIN_CREDENTIALS without revealing account status'
  );

  // 4d. Administrator email with wrong password
  const adminAuthRes = await fetch(studentAuthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'jacksdani74@gmail.com',
      password: 'IntentionalWrongPassword999!',
      returnSecureToken: true
    })
  });
  const adminAuthData = await adminAuthRes.json();
  assert(
    adminAuthRes.status === 400 && adminAuthData.error?.message === 'INVALID_LOGIN_CREDENTIALS',
    'Platform Administrator account with bad password returns generic INVALID_LOGIN_CREDENTIALS'
  );

  // Test 5: Production Firestore Rules Security
  console.log('\n[5. Live Firestore Security Verification]');
  const restLookupRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/foceye-2546c/databases/(default)/documents/reg_lookups/711525BBM001`
  );
  assert(
    restLookupRes.status === 403,
    'Unauthenticated direct read of reg_lookups document is blocked (HTTP 403 Forbidden)'
  );

  const restListLookupsRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/foceye-2546c/databases/(default)/documents/reg_lookups`
  );
  assert(
    restListLookupsRes.status === 403,
    'Unauthenticated directory enumeration of reg_lookups collection is blocked (HTTP 403 Forbidden)'
  );

  console.log('\n========================================================================');
  console.log(`  DEPLOYED APPLICATION VERIFICATION: ${passed} / ${total} CHECKS PASSED`);
  if (passed === total) {
    console.log('  STATUS: DEPLOYED APPLICATION & BACKEND FULLY VERIFIED (100%)');
  } else {
    console.log(`  STATUS: ${total - passed} CHECKS FAILED`);
    process.exitCode = 1;
  }
  console.log('========================================================================\n');
}

runDeployedTests().catch(err => {
  console.error('Fatal error running deployed tests:', err);
  process.exit(1);
});
