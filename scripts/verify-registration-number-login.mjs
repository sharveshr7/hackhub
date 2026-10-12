/**
 * Isolated API checks with mocked Firebase Admin and Identity Toolkit responses.
 * These checks validate backend behavior but do not verify a live Firebase project.
 */

import fs from 'node:fs';

process.env.FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'unit-test-web-api-key';

const {
  handleStudentAuth,
  resetAllRateLimits,
  setMockAdminInstances,
  resetMockAdminInstances
} = await import('../api/student-auth.ts');

const originalFetch = globalThis.fetch;
const authRecords = new Map();
const profileRecords = new Map();
const lookupRecords = new Map();
let assertions = 0;
let failures = 0;

function assert(condition, message) {
  assertions++;
  if (condition) console.log(`PASS ${message}`);
  else {
    failures++;
    console.error(`FAIL ${message}`);
  }
}

function snapshot(id, data) {
  return { id, exists: !!data, data: () => data };
}

const mockDb = {
  collection(name) {
    return {
      doc(id) {
        return {
          id,
          get: async () => snapshot(id, (name === 'students' ? profileRecords : lookupRecords).get(id) || null)
        };
      },
      where(field, operator, value) {
        return {
          get: async () => {
            const docs = [];
            if (name === 'students' && operator === '==') {
              for (const [id, data] of profileRecords) {
                if (data[field] === value) docs.push(snapshot(id, data));
              }
            }
            return { docs, empty: docs.length === 0, size: docs.length };
          }
        };
      }
    };
  }
};

function seedStudent({ uid = 'student-uid-1', email = 'kit29.25bbm001@kitcbe.com', registrationNumber = '711525BBM001', profile = {}, lookup = {} } = {}) {
  authRecords.set(email, uid);
  profileRecords.set(uid, {
    uid,
    email,
    registerNumber: registrationNumber,
    registrationNumberNormalized: registrationNumber,
    role: 'STUDENT',
    accountStatus: 'active',
    isActive: true,
    ...profile
  });
  lookupRecords.set(registrationNumber, { uid, email, ...lookup });
  return { uid, email, registrationNumber };
}

function resetData() {
  authRecords.clear();
  profileRecords.clear();
  lookupRecords.clear();
  resetAllRateLimits();
}

globalThis.fetch = async (_url, options) => {
  const request = JSON.parse(options.body);
  const uid = authRecords.get(String(request.email || '').toLowerCase());
  if (!uid || request.password !== 'CorrectPassword123!') {
    return { ok: false, json: async () => ({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }) };
  }
  return {
    ok: true,
    json: async () => ({
      localId: uid,
      email: request.email,
      idToken: `id-token-${uid}`,
      refreshToken: `refresh-token-${uid}`,
      expiresIn: '3600'
    })
  };
};

setMockAdminInstances({ adminApp: {}, adminDb: mockDb, adminAuth: {} });

try {
  resetData();
  const valid = seedStudent();
  const good = await handleStudentAuth({ identifier: ` ${valid.registrationNumber.toLowerCase()} `, password: 'CorrectPassword123!' }, 'unit-valid');
  assert(good.status === 200 && good.body.localId === valid.uid && good.body.email === valid.email, 'valid registration number/password resolves and returns the matching UID');

  const wrongPassword = await handleStudentAuth({ identifier: valid.registrationNumber, password: 'WrongPassword123!' }, 'unit-wrong-pass');
  assert(wrongPassword.status === 401 && !('email' in wrongPassword.body), 'incorrect password returns a generic response without revealing an email');

  const invalidNumber = await handleStudentAuth({ identifier: '??', password: 'CorrectPassword123!' }, 'unit-invalid');
  assert(invalidNumber.status === 400, 'invalid registration number format is rejected');

  const missingNumber = await handleStudentAuth({ identifier: '711599BBM999', password: 'CorrectPassword123!' }, 'unit-missing-reg');
  assert(missingNumber.status === 401 && !('email' in missingNumber.body), 'unknown registration number returns the same generic auth response');

  resetData();
  const missing = seedStudent({ uid: 'uid-without-profile' });
  profileRecords.delete(missing.uid);
  const missingProfile = await handleStudentAuth({ identifier: missing.registrationNumber, password: 'CorrectPassword123!' }, 'unit-missing-profile');
  assert(missingProfile.status === 401, 'authenticated Auth account without a profile is rejected');

  resetData();
  const inactive = seedStudent({ profile: { accountStatus: 'disabled', isActive: false } });
  const inactiveResult = await handleStudentAuth({ identifier: inactive.registrationNumber, password: 'CorrectPassword123!' }, 'unit-inactive');
  assert(inactiveResult.status === 403, 'inactive student account is rejected after valid credentials');

  resetData();
  const noRole = seedStudent({ profile: { role: 'FACULTY' } });
  const noRoleResult = await handleStudentAuth({ identifier: noRole.registrationNumber, password: 'CorrectPassword123!' }, 'unit-wrong-role');
  assert(noRoleResult.status === 401, 'profile without the student role is rejected');

  resetData();
  const ambiguous = seedStudent();
  profileRecords.set('duplicate-uid', {
    uid: 'duplicate-uid',
    email: 'other@kitcbe.com',
    registerNumber: ambiguous.registrationNumber,
    registrationNumberNormalized: ambiguous.registrationNumber,
    role: 'STUDENT',
    accountStatus: 'active',
    isActive: true
  });
  const ambiguousResult = await handleStudentAuth({ identifier: ambiguous.registrationNumber, password: 'CorrectPassword123!' }, 'unit-ambiguous');
  assert(ambiguousResult.status === 401, 'duplicate registration numbers are rejected as ambiguous');

  resetData();
  const mismatch = seedStudent({ lookup: { uid: 'different-uid' } });
  const mismatchResult = await handleStudentAuth({ identifier: mismatch.registrationNumber, password: 'CorrectPassword123!' }, 'unit-uid-mismatch');
  assert(mismatchResult.status === 401, 'lookup UID mismatch is rejected');

  resetData();
  const emailStudent = seedStudent({ email: 'student.email@kitcbe.com', registrationNumber: '711525BBM002' });
  const emailLogin = await handleStudentAuth({ identifier: emailStudent.email, password: 'CorrectPassword123!' }, 'unit-email');
  assert(emailLogin.status === 200 && emailLogin.body.localId === emailStudent.uid, 'registered email/password flow remains supported');

  const authService = fs.readFileSync(new URL('../src/services/authService.ts', import.meta.url), 'utf8');
  const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert(authService.includes('signInWithEmailAndPassword(auth, targetEmail, pass)'), 'client still establishes Firebase email/password session');
  assert(rules.includes('match /reg_lookups/{regNo}') && rules.includes('allow get, list, write: if false;'), 'registration lookup documents remain unavailable to direct client reads');
} finally {
  resetMockAdminInstances();
  globalThis.fetch = originalFetch;
}

console.log(`\nMocked registration login checks: ${assertions - failures}/${assertions} passed.`);
if (failures) process.exitCode = 1;
