/**
 * HackHub — Live Firebase Project Integration Verification
 *
 * Tests authentication endpoints and validation logic directly against the live
 * Firebase project "foceye-2546c" without modifying database records.
 */

import fs from 'node:fs';
import { handleStudentAuth, resetAllRateLimits } from '../api/student-auth.ts';

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

const FIREBASE_API_KEY = process.env.FIREBASE_WEB_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  getDotEnvValue('VITE_FIREBASE_API_KEY');

const liveResults = [];

function recordLive(name, passed, details) {
  liveResults.push({ name, passed, details });
  if (passed) {
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    console.error(`  ❌ [FAIL] ${name} - ${details}`);
  }
}

async function runLiveTests() {
  console.log('================================================================');
  console.log('  HACKHUB — LIVE FIREBASE PROJECT CHECKS (foceye-2546c)');
  console.log('================================================================\n');

  resetAllRateLimits();

  // Test 1: Real Firebase account with intentionally incorrect password
  console.log('1. Testing real student account with incorrect password...');
  const realAccountWrongPass = await handleStudentAuth(
    { identifier: 'kit29.25bbm001@gmail.com', password: 'DefinitelyWrongPassword123!' },
    '127.0.0.1'
  );
  recordLive(
    'Real Firebase email + incorrect password returns generic 401 error',
    realAccountWrongPass.status === 401 && realAccountWrongPass.body.error === 'Invalid registration number or password.',
    `HTTP ${realAccountWrongPass.status}: ${JSON.stringify(realAccountWrongPass.body)}`
  );

  // Test 2: Invalid registration number format
  console.log('\n2. Testing invalid registration number syntax...');
  const invalidSyntax = await handleStudentAuth(
    { identifier: '??', password: 'AnyPassword123!' },
    '127.0.0.1'
  );
  recordLive(
    'Invalid registration number format returns 400 bad request',
    invalidSyntax.status === 400,
    `HTTP ${invalidSyntax.status}: ${JSON.stringify(invalidSyntax.body)}`
  );

  // Test 3: Unknown / Nonexistent registration number
  console.log('\n3. Testing unknown registration number...');
  const unknownReg = await handleStudentAuth(
    { identifier: '711599BBM999', password: 'AnyPassword123!' },
    '127.0.0.1'
  );
  recordLive(
    'Unknown registration number returns generic 401 (anti-enumeration)',
    unknownReg.status === 401 && unknownReg.body.error === 'Invalid registration number or password.',
    `HTTP ${unknownReg.status}: ${JSON.stringify(unknownReg.body)}`
  );

  // Test 4: Missing Firebase Auth account (student in CSV without Auth account)
  console.log('\n4. Testing student missing in Firebase Authentication...');
  const missingAuthStudent = await handleStudentAuth(
    { identifier: 'kit29.25bbm009@gmail.com', password: 'AnyPassword123!' },
    '127.0.0.1'
  );
  recordLive(
    'Student email without Auth account returns generic 401 without leaking existence',
    missingAuthStudent.status === 401 && missingAuthStudent.body.error === 'Invalid registration number or password.',
    `HTTP ${missingAuthStudent.status}: ${JSON.stringify(missingAuthStudent.body)}`
  );

  // Test 5: Verify Google Identity Toolkit API directly with invalid credentials
  console.log('\n5. Testing Google Identity Toolkit endpoint directly...');
  const idToolkitRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kit29.25bbm001@gmail.com',
        password: 'WrongPasswordForLiveCheck123!',
        returnSecureToken: true
      })
    }
  );
  const idToolkitData = await idToolkitRes.json();
  recordLive(
    'Google Identity Toolkit rejects bad credentials with INVALID_LOGIN_CREDENTIALS',
    idToolkitRes.status === 400 && idToolkitData?.error?.message === 'INVALID_LOGIN_CREDENTIALS',
    `HTTP ${idToolkitRes.status}: ${idToolkitData?.error?.message}`
  );

  // Test 6: Rate Limiting Enforcement
  console.log('\n6. Testing rate limiting against rapid attempts...');
  resetAllRateLimits();
  let rateLimited = false;
  for (let i = 0; i < 7; i++) {
    const res = await handleStudentAuth(
      { identifier: '711599BBM999', password: `Attempt${i}` },
      '10.0.0.99'
    );
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
  }
  recordLive(
    '5+ failed attempts triggers HTTP 429 rate limit response',
    rateLimited,
    'Rate limit triggered successfully'
  );

  const passedCount = liveResults.filter((r) => r.passed).length;
  console.log(`\n================================================================`);
  console.log(`  LIVE TEST RESULTS: ${passedCount} / ${liveResults.length} PASSED`);
  console.log(`================================================================\n`);

  if (passedCount !== liveResults.length) {
    process.exitCode = 1;
  }
}

runLiveTests().catch((err) => {
  console.error('Live test error:', err);
  process.exitCode = 1;
});
