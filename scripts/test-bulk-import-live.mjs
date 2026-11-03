/**
 * HACKHUB — BULK STUDENT IMPORT & SYNCHRONIZATION TEST SUITE
 * Tests Phase 4 bulk import, duplicate detection, schema validation,
 * and three-way database synchronization (Auth, students/{uid}, reg_lookups/{regNo}).
 */

import { bulkImportStudentAccounts, resetAllRateLimits } from '../api/student-auth.ts';
import { setMockAdminInstances, resetMockAdminInstances } from '../api/_lib/firebaseAdmin.ts';

console.log('========================================================================');
console.log('  HACKHUB — BULK STUDENT IMPORT & DATABASE SYNC VERIFICATION');
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

// In-memory Mock Firestore & Auth store
class MockBatch {
  constructor(db) {
    this.db = db;
    this.ops = [];
  }
  set(ref, data, opts) {
    this.ops.push({ type: 'set', ref, data, opts });
    return this;
  }
  delete(ref) {
    this.ops.push({ type: 'delete', ref });
    return this;
  }
  async commit() {
    for (const op of this.ops) {
      if (op.type === 'set') {
        const existing = this.db.store.get(op.ref.path) || {};
        const merged = op.opts?.merge ? { ...existing, ...op.data } : op.data;
        this.db.store.set(op.ref.path, merged);
      } else if (op.type === 'delete') {
        this.db.store.delete(op.ref.path);
      }
    }
  }
}

class MockDocRef {
  constructor(db, col, id) {
    this.db = db;
    this.col = col;
    this.id = id;
    this.path = `${col}/${id}`;
  }
  async get() {
    const data = this.db.store.get(this.path);
    return {
      exists: data !== undefined,
      id: this.id,
      data: () => data
    };
  }
  async set(data, opts) {
    const existing = this.db.store.get(this.path) || {};
    const merged = opts?.merge ? { ...existing, ...data } : data;
    this.db.store.set(this.path, merged);
  }
  async delete() {
    this.db.store.delete(this.path);
  }
}

class MockCollection {
  constructor(db, col) {
    this.db = db;
    this.col = col;
  }
  doc(id) {
    const docId = id || `auto_${Math.random().toString(36).substring(2, 9)}`;
    return new MockDocRef(this.db, this.col, docId);
  }
  async get() {
    const docs = [];
    for (const [path, data] of this.db.store.entries()) {
      if (path.startsWith(`${this.col}/`)) {
        const id = path.slice(this.col.length + 1);
        docs.push({
          id,
          data: () => data
        });
      }
    }
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0
    };
  }
}

class MockDb {
  constructor() {
    this.store = new Map();
  }
  collection(col) {
    return new MockCollection(this, col);
  }
  batch() {
    return new MockBatch(this);
  }
}

class MockAdminAuth {
  constructor() {
    this.users = new Map();
  }
  async getUserByEmail(email) {
    const user = this.users.get(email.toLowerCase());
    if (!user) {
      const err = new Error('User not found');
      err.code = 'auth/user-not-found';
      throw err;
    }
    return user;
  }
  async createUser(record) {
    const uid = `uid_${Math.random().toString(36).substring(2, 10)}`;
    const user = { uid, ...record };
    this.users.set(record.email.toLowerCase(), user);
    return user;
  }
}

async function run() {
  const mockDb = new MockDb();
  const mockAuth = new MockAdminAuth();

  // Populate pre-existing student in DB to test DB duplicate detection
  const existingUid = 'existing-student-uid-01';
  const existingEmail = 'existing.student@kitcbe.com';
  const existingRegNo = '717822P999';

  mockAuth.users.set(existingEmail, { uid: existingUid, email: existingEmail, displayName: 'Existing Student' });
  mockDb.store.set(`students/${existingUid}`, {
    uid: existingUid,
    name: 'Existing Student',
    email: existingEmail,
    registerNumber: existingRegNo,
    department: 'Biotechnology',
    year: 'Second Year'
  });
  mockDb.store.set(`reg_lookups/${existingRegNo}`, {
    uid: existingUid,
    registerNumber: existingRegNo,
    email: existingEmail,
    department: 'Biotechnology',
    year: 'Second Year'
  });

  setMockAdminInstances({ adminDb: mockDb, adminAuth: mockAuth });

  // Dedicated test batch containing:
  // 1. Valid Biotech Second Year
  // 2. Valid BME First Year
  // 3. Duplicate email within the file (matches row 1)
  // 4. Duplicate reg number within the file (matches row 2)
  // 5. Duplicate email against DB (matches existing.student@kitcbe.com)
  // 6. Duplicate reg number against DB (matches 717822P999)
  // 7. Invalid department ("Computer Science")
  // 8. Invalid academic year ("Fourth Year")
  // 9. Invalid email format ("not-an-email")
  // 10. Non-college email domain ("student@gmail.com")
  // 11. Empty student name
  // 12. Invalid registration number syntax ("!!INVALID!!")
  const testRows = [
    { name: 'Kavitha S', registerNumber: '717822P101', email: 'kavitha.s@kitcbe.com', department: 'Biotechnology', year: 'Second Year', phone: '9876543210' },
    { name: 'Manoj Kumar', registerNumber: '717823B102', email: 'manoj.k@kitcbe.com', department: 'Biomedical Engineering', year: 'First Year', phone: '9876543211' },
    { name: 'Kavitha Clone', registerNumber: '717822P103', email: 'kavitha.s@kitcbe.com', department: 'Biotechnology', year: 'Second Year' }, // In-file dup email
    { name: 'Manoj Clone', registerNumber: '717823B102', email: 'different.manoj@kitcbe.com', department: 'Biomedical Engineering', year: 'First Year' }, // In-file dup regNo
    { name: 'DB Email Dup', registerNumber: '717822P105', email: 'existing.student@kitcbe.com', department: 'Biotechnology', year: 'Second Year' }, // DB dup email
    { name: 'DB RegNo Dup', registerNumber: '717822P999', email: 'unique.email@kitcbe.com', department: 'Biotechnology', year: 'Second Year' }, // DB dup regNo
    { name: 'Invalid Dept Student', registerNumber: '717822C101', email: 'cs.student@kitcbe.com', department: 'Computer Science', year: 'First Year' }, // Invalid dept
    { name: 'Invalid Year Student', registerNumber: '717822P106', email: 'final.year@kitcbe.com', department: 'Biotechnology', year: 'Fourth Year' }, // Invalid year
    { name: 'Bad Email Student', registerNumber: '717822P107', email: 'invalid-email-format', department: 'Biotechnology', year: 'First Year' }, // Invalid email
    { name: 'Gmail Domain Student', registerNumber: '717822P108', email: 'student@gmail.com', department: 'Biotechnology', year: 'First Year' }, // Non-college domain
    { name: '', registerNumber: '717822P109', email: 'empty.name@kitcbe.com', department: 'Biotechnology', year: 'First Year' }, // Empty name
    { name: 'Bad Reg Syntax', registerNumber: '!!INVALID!!', email: 'bad.reg@kitcbe.com', department: 'Biotechnology', year: 'First Year' } // Bad syntax
  ];

  console.log(`Executing bulk import test for ${testRows.length} rows...`);

  const actor = {
    uid: 'platform-admin-uid',
    email: 'admin@kitcbe.com',
    role: 'ADMIN',
    isPlatformAdministrator: true
  };

  const response = await bulkImportStudentAccounts({ students: testRows }, actor);

  assert(response.status === 200, `API responds with HTTP 200 OK (got ${response.status})`);

  const summary = response.body.summary;
  const results = response.body.results;

  console.log('\n--- BATCH PROCESSING SUMMARY ---');
  console.log(`Total Rows Submitted: ${summary.total}`);
  console.log(`Successfully Provisioned: ${summary.succeeded}`);
  console.log(`Duplicates Detected & Skipped: ${summary.duplicates}`);
  console.log(`Invalid / Rejected Rows: ${summary.failed}`);

  assert(summary.total === 12, 'Summary reports 12 total rows');
  assert(summary.succeeded === 2, `Exactly 2 valid rows provisioned (got ${summary.succeeded})`);
  assert(summary.duplicates === 4, `Exactly 4 duplicates detected (2 in-file + 2 against DB, got ${summary.duplicates})`);
  assert(summary.failed === 6, `Exactly 6 invalid rows rejected with specific reasons (got ${summary.failed})`);

  console.log('\n--- ROW-LEVEL VERIFICATION ---');
  results.forEach((r) => {
    console.log(`  Row #${r.row} (${r.name || 'unnamed'}): status=${r.status} reason="${r.reason || 'Created'}"`);
  });

  // Verify Row 1: Valid Biotech Second Year
  const row1 = results.find((r) => r.row === 2);
  assert(row1 && row1.status === 'success' && row1.email === 'kavitha.s@kitcbe.com', 'Row 2 (Kavitha S) provisioned successfully');

  // Verify Row 2: Valid BME First Year
  const row2 = results.find((r) => r.row === 3);
  assert(row2 && row2.status === 'success' && row2.email === 'manoj.k@kitcbe.com', 'Row 3 (Manoj Kumar) provisioned successfully');

  // Verify Row 3: In-file duplicate email
  const row3 = results.find((r) => r.row === 4);
  assert(row3 && row3.status === 'duplicate' && row3.reason.includes('earlier row 2'), 'Row 4 rejected as duplicate email matching Row 2');

  // Verify Row 4: In-file duplicate reg number
  const row4 = results.find((r) => r.row === 5);
  assert(row4 && row4.status === 'duplicate' && row4.reason.includes('earlier row 3'), 'Row 5 rejected as duplicate reg number matching Row 3');

  // Verify Row 5: Database duplicate email
  const row5 = results.find((r) => r.row === 6);
  assert(row5 && row5.status === 'duplicate' && row5.reason.includes('already registered in HackHub'), 'Row 6 rejected as duplicate email matching DB');

  // Verify Row 6: Database duplicate reg number
  const row6 = results.find((r) => r.row === 7);
  assert(row6 && row6.status === 'duplicate' && row6.reason.includes('already assigned in HackHub'), 'Row 7 rejected as duplicate reg number matching DB');

  // Verify Row 7: Invalid department
  const row7 = results.find((r) => r.row === 8);
  assert(row7 && row7.status === 'failed' && row7.reason.includes('Department "Computer Science" is not supported'), 'Row 8 rejected with unsupported department error');

  // Verify Row 8: Invalid academic year
  const row8 = results.find((r) => r.row === 9);
  assert(row8 && row8.status === 'failed' && row8.reason.includes('Academic year "Fourth Year" is not supported'), 'Row 9 rejected with unsupported academic year error');

  // Verify Row 10: Non-college domain
  const row10 = results.find((r) => r.row === 11);
  assert(row10 && row10.status === 'failed' && row10.reason.includes('Email domain must be one of: @kitcbe.com'), 'Row 11 rejected with invalid college domain error');

  console.log('\n--- THREE-WAY DATABASE SYNCHRONIZATION ---');
  // 1. Verify Firebase Auth account exists for Kavitha
  const kavithaAuth = mockAuth.users.get('kavitha.s@kitcbe.com');
  assert(kavithaAuth && kavithaAuth.uid, 'Firebase Auth user exists for Kavitha S');

  // 2. Verify Firestore student doc exists and has matching UID
  const kavithaStudentDoc = mockDb.store.get(`students/${kavithaAuth.uid}`);
  assert(
    kavithaStudentDoc &&
    kavithaStudentDoc.name === 'Kavitha S' &&
    kavithaStudentDoc.registerNumber === '717822P101' &&
    kavithaStudentDoc.department === 'Biotechnology' &&
    kavithaStudentDoc.year === 'Second Year' &&
    kavithaStudentDoc.role === 'STUDENT' &&
    kavithaStudentDoc.accountStatus === 'active',
    'Firestore students/{uid} document created with verified profile fields and active status'
  );

  // 3. Verify reg_lookups document exists and synchronizes
  const kavithaRegLookup = mockDb.store.get('reg_lookups/717822P101');
  assert(
    kavithaRegLookup &&
    kavithaRegLookup.uid === kavithaAuth.uid &&
    kavithaRegLookup.email === 'kavitha.s@kitcbe.com' &&
    kavithaRegLookup.department === 'Biotechnology' &&
    kavithaRegLookup.year === 'Second Year',
    'reg_lookups/717822P101 strictly synchronizes with student profile UID and credentials'
  );

  // 4. Verify student_email_lookups document exists
  const kavithaEmailLookup = mockDb.store.get(`student_email_lookups/${encodeURIComponent('kavitha.s@kitcbe.com')}`);
  assert(
    kavithaEmailLookup &&
    kavithaEmailLookup.uid === kavithaAuth.uid &&
    kavithaEmailLookup.registerNumber === '717822P101',
    'student_email_lookups correctly links email to UID and registration number'
  );

  // 5. Verify pre-existing records were NOT touched or corrupted
  const preExistingStudent = mockDb.store.get(`students/${existingUid}`);
  assert(
    preExistingStudent && preExistingStudent.name === 'Existing Student',
    'Pre-existing student accounts remain intact without data loss or corruption'
  );

  // 6. Security check: No plaintext passwords stored anywhere
  let plaintextPasswordFound = false;
  for (const [path, doc] of mockDb.store.entries()) {
    if (doc.password || doc.plainPassword || doc.pass) {
      plaintextPasswordFound = true;
      console.error(`Found password field in ${path}`);
    }
  }
  assert(!plaintextPasswordFound, 'Security check passed: Zero plaintext passwords stored in any Firestore document');

  console.log('\n========================================================================');
  console.log(`  IMPORT TEST COMPLETE: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
  console.log(`  SUCCESS RATE: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('========================================================================\n');

  resetMockAdminInstances();

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

run();
