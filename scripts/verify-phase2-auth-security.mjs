import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('  HACKHUB — PHASE 2 AUTHENTICATION SECURITY VERIFICATION');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

// 1. Static Security Inspection of api/student-auth.ts
const apiPath = path.join(rootDir, 'api', 'student-auth.ts');
const apiContent = fs.readFileSync(apiPath, 'utf-8');

assert(
  !apiContent.includes('@kitcbe.com'),
  'api/student-auth.ts: Hardcoded registration-number-to-email fallback (@kitcbe.com) is completely removed'
);

assert(
  !apiContent.includes('firestore.googleapis.com'),
  'api/student-auth.ts: Unauthenticated Firestore REST endpoint calls are completely removed'
);

assert(
  apiContent.includes('getAdminInstances'),
  'api/student-auth.ts: Uses Firebase Admin SDK server-side for trusted operations'
);

assert(
  apiContent.includes('verifyServerRequest'),
  'api/student-auth.ts: Exports verifyServerRequest for validating Firebase ID tokens and server-side roles'
);

assert(
  apiContent.includes('status: 503') && apiContent.includes('Server authentication configuration required'),
  'api/student-auth.ts: Returns explicit, safe 503 configuration error when server credentials are not provisioned'
);

// 2. Static Security Inspection of src/services/authService.ts
const authServicePath = path.join(rootDir, 'src', 'services', 'authService.ts');
const authServiceContent = fs.readFileSync(authServicePath, 'utf-8');

assert(
  !authServiceContent.includes('doc(db, \'reg_lookups\','),
  'src/services/authService.ts: Unauthenticated client-side read of reg_lookups has been removed'
);

assert(
  authServiceContent.includes('apiRes.status === 503'),
  'src/services/authService.ts: Gracefully catches 503 server configuration errors and notifies user'
);

assert(
  authServiceContent.includes('apiRes.status === 403'),
  'src/services/authService.ts: Rejects deactivated student accounts with 403 status check'
);

// 3. Dynamic Execution Tests for handleStudentAuth
async function runDynamicTests() {
  const { handleStudentAuth, verifyServerRequest } = await import('../api/student-auth.ts');

  // Test A: Missing identifier and password
  const emptyRes = await handleStudentAuth({}, '127.0.0.1');
  assert(
    emptyRes.status === 400 && emptyRes.body.error.includes('required'),
    'handleStudentAuth rejects empty requests with status 400'
  );

  // Test B: Missing server credentials returns explicit 503 for registration numbers
  // (In test environment without FIREBASE_SERVICE_ACCOUNT)
  const originalEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;

  const regNoRes = await handleStudentAuth(
    { identifier: '711525BBM053', password: 'TestPassword123!' },
    '127.0.0.1'
  );

  assert(
    regNoRes.status === 503 && regNoRes.body.error.includes('Server authentication configuration required'),
    'handleStudentAuth returns safe 503 when server credentials are not configured, instructing user to use email'
  );

  // Test C: Email login proceeds to Google Identity authentication without needing registration lookup
  const emailRes = await handleStudentAuth(
    { identifier: 'nonexistent.student.test@example.com', password: 'WrongPassword999!' },
    '127.0.0.1'
  );
  assert(
    emailRes.status === 401 && emailRes.body.error === 'Invalid registration number or password.',
    'handleStudentAuth email login attempts authentication and returns generic 401 for invalid credentials'
  );

  // Test D: Rate Limiting Enforcement
  const testIp = '192.168.1.105';
  let rateLimitHit = false;
  for (let i = 0; i < 6; i++) {
    const res = await handleStudentAuth(
      { identifier: 'test.limit@example.com', password: 'WrongPassword!' },
      testIp
    );
    if (res.status === 429) {
      rateLimitHit = true;
      break;
    }
  }
  assert(rateLimitHit, 'Sliding window rate limiter triggers status 429 after 5 failed attempts');

  // Test E: verifyServerRequest token inspection
  const noHeaderRes = await verifyServerRequest(undefined);
  assert(
    noHeaderRes.status === 401 && noHeaderRes.valid === false,
    'verifyServerRequest rejects missing Authorization header with status 401'
  );

  const malformedRes = await verifyServerRequest('Basic dXNlcjpwYXNz');
  assert(
    malformedRes.status === 401 && malformedRes.valid === false,
    'verifyServerRequest rejects non-Bearer Authorization header with status 401'
  );

  const badTokenRes = await verifyServerRequest('Bearer invalid.jwt.token');
  assert(
    badTokenRes.valid === false && (badTokenRes.status === 401 || badTokenRes.status === 503),
    'verifyServerRequest safely rejects invalid tokens'
  );

  // Restore env if any
  if (originalEnv) process.env.FIREBASE_SERVICE_ACCOUNT = originalEnv;

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDynamicTests().catch((err) => {
  console.error('Fatal error during dynamic tests:', err);
  process.exit(1);
});
