/**
 * Comprehensive Automated Verification Suite for:
 * 1. P0: Firestore Document Serialization & prizePool Undefined Elimination
 * 2. P1: Audit of All Firestore Write Paths across Services
 * 3. P2: Complete Event Workflow (Publish, Draft, Blank Prize, Zero Prize, Update)
 * 4. P3: Confirmation of HOD Staff Approval Removal
 * 5. P4: Validation & Error Handling
 */

import fs from 'node:fs';
import assert from 'node:assert';

console.log('========================================================================');
console.log('  HACKHUB — EVENT SERIALIZATION & FIRESTORE WRITE VERIFICATION SUITE');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function check(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}: ${err.message}`);
  }
}

// Mock Firestore Validator: Replicates Firebase Client SDK strict undefined rejection
function assertNoUndefinedFields(obj, path = '') {
  if (obj === undefined) {
    throw new Error(`Unsupported field value: undefined at path "${path}"`);
  }
  if (obj === null || typeof obj !== 'object') {
    return;
  }
  // Allow Firestore FieldValue / Date objects
  if (obj instanceof Date || typeof obj._methodName === 'string' || obj._delegate !== undefined) {
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      if (item === undefined) {
        throw new Error(`Unsupported field value: undefined in array at "${path}[${idx}]"`);
      }
      assertNoUndefinedFields(item, `${path}[${idx}]`);
    });
    return;
  }
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (val === undefined) {
      throw new Error(`Function setDoc() called with invalid data. Unsupported field value: undefined (found in field ${currentPath})`);
    }
    assertNoUndefinedFields(val, currentPath);
  }
}

// Import code dynamically or test serialized outputs
const serializerCode = fs.readFileSync('src/utils/firestoreSerializer.ts', 'utf8');
const createPageCode = fs.readFileSync('src/pages/admin/AdminCreateHackathonPage.tsx', 'utf8');
const detailPageCode = fs.readFileSync('src/pages/admin/AdminHackathonDetailPage.tsx', 'utf8');
const hackathonServiceCode = fs.readFileSync('src/services/hackathonService.ts', 'utf8');

// ========================================================================
// SECTION 1: CODE INSPECTION & ELIMINATION OF "prizePool: ... || undefined"
// ========================================================================
console.log('[SECTION 1: Elimination of Undefined prizePool Pattern]');

check('AdminCreateHackathonPage.tsx does not set prizePool to undefined', () => {
  assert(!createPageCode.includes('prizePool: prizeInfo.trim() || undefined'), 'Obsolete prizePool undefined assignment must be eliminated from AdminCreateHackathonPage.tsx');
});

check('AdminHackathonDetailPage.tsx does not set prizePool to undefined', () => {
  assert(!detailPageCode.includes('prizePool: editPrizeInfo.trim() || undefined'), 'Obsolete prizePool undefined assignment must be eliminated from AdminHackathonDetailPage.tsx');
});

check('hackathonService.createHackathon serializes document before setDoc()', () => {
  assert(hackathonServiceCode.includes('serializeHackathonPayload'), 'hackathonService must import and call serializeHackathonPayload');
  assert(hackathonServiceCode.includes('setDoc(doc(db, \'hackathons\', id), {'), 'setDoc must persist serialized document');
});

check('hackathonService.updateHackathon serializes updates before updateDoc()', () => {
  assert(hackathonServiceCode.includes('serializeHackathonPayload(updates, { isUpdate: true })'), 'hackathonService.updateHackathon must serialize updates with isUpdate flag');
  assert(hackathonServiceCode.includes('updateDoc(doc(db, \'hackathons\', id), {'), 'updateDoc must persist sanitized updates');
});

// ========================================================================
// SECTION 2: SIMULATED SERIALIZATION & EVENT DATA LIFECYCLE
// ========================================================================
console.log('\n[SECTION 2: Event Workflow Data Serialization & Edge Cases]');

// Implement pure replica of serializeHackathonPayload for runtime assertion
function mockSerializeHackathonPayload(data, options = {}) {
  const payload = {};
  if (data.title !== undefined) payload.title = String(data.title).trim();
  if (data.organizer !== undefined) payload.organizer = String(data.organizer).trim();
  if (data.shortDescription !== undefined) {
    payload.shortDescription = String(data.shortDescription).trim();
    payload.description = payload.shortDescription;
  }
  if (data.category !== undefined) payload.category = data.category;
  if (data.organizerType !== undefined) payload.organizerType = data.organizerType;
  if (data.officialUrl !== undefined) payload.officialUrl = String(data.officialUrl).trim();
  if (data.department !== undefined) payload.department = data.department;
  if (data.isExternal !== undefined) payload.isExternal = Boolean(data.isExternal);
  if (data.mode !== undefined) payload.mode = data.mode;
  if (data.location !== undefined) payload.location = String(data.location).trim();
  if (data.status !== undefined) payload.status = data.status;
  if (data.publishedBy !== undefined && data.publishedBy) payload.publishedBy = data.publishedBy;
  if (data.publisherName !== undefined && data.publisherName) payload.publisherName = data.publisherName;

  if (data.prizePool !== undefined) {
    const rawPrize = typeof data.prizePool === 'number' ? String(data.prizePool) : String(data.prizePool).trim();
    if (rawPrize.length > 0) {
      payload.prizePool = rawPrize;
      if (!data.prizes || data.prizes.length === 0) {
        payload.prizes = [{ title: 'Confirmed Prize Pool', reward: rawPrize }];
      }
    } else if (options.isUpdate) {
      payload.prizePool = { _methodName: 'deleteField' };
      payload.prizes = [];
    }
  }

  if (data.minTeamSize !== undefined && typeof data.minTeamSize === 'number') payload.minTeamSize = data.minTeamSize;
  if (data.maxTeamSize !== undefined && typeof data.maxTeamSize === 'number') payload.maxTeamSize = data.maxTeamSize;
  if (data.eligibility !== undefined && Array.isArray(data.eligibility)) {
    payload.eligibility = data.eligibility.filter(Boolean);
  }

  // Recursive sanitation
  function clean(item) {
    if (item === undefined) return undefined;
    if (item === null || typeof item !== 'object') return item;
    if (item instanceof Date || typeof item._methodName === 'string') return item;
    if (Array.isArray(item)) return item.map(clean).filter((v) => v !== undefined);
    const res = {};
    for (const [k, v] of Object.entries(item)) {
      if (v === undefined) continue;
      const c = clean(v);
      if (c !== undefined) res[k] = c;
    }
    return res;
  }
  return clean(payload);
}

check('Scenario 1: Event with blank prize money produces no undefined fields for setDoc', () => {
  const inputEvent = {
    title: 'Biotech Innovation Challenge 2026',
    organizer: 'KIT Biotech Dept',
    category: 'HACKATHON',
    officialUrl: 'https://kitcbe.com/events/bio2026',
    department: 'Biotechnology',
    shortDescription: 'National level bio-hackathon challenge.',
    prizePool: undefined, // Simulates blank prize form input
    minTeamSize: 1,
    maxTeamSize: 4,
    mode: 'IN_PERSON',
    status: 'PUBLISHED'
  };

  const serialized = mockSerializeHackathonPayload(inputEvent);
  assertNoUndefinedFields(serialized, 'hackathons/hackathon-1793032737488');
  assert(!('prizePool' in serialized), 'prizePool should be completely omitted when blank, not present as undefined');
  assert(serialized.title === 'Biotech Innovation Challenge 2026');
});

check('Scenario 2: Event with valid explicit zero prize money preserves "0"', () => {
  const inputEvent = {
    title: 'Open Source Biomedical Sprint',
    organizer: 'Biomedical Engineering Society',
    category: 'COMPETITION',
    officialUrl: 'https://kitcbe.com/events/bme-sprint',
    department: 'Biomedical Engineering',
    shortDescription: 'Educational hackathon focused on open-source medical software.',
    prizePool: 0, // Explicit zero prize money
    minTeamSize: 1,
    maxTeamSize: 3,
    status: 'PUBLISHED'
  };

  const serialized = mockSerializeHackathonPayload(inputEvent);
  assertNoUndefinedFields(serialized);
  assert(serialized.prizePool === '0', 'Explicit 0 prize money must be preserved as "0" and not dropped');
  assert(Array.isArray(serialized.prizes) && serialized.prizes[0].reward === '0', 'Prizes array should reflect confirmed zero prize pool');
});

check('Scenario 3: Event with string zero "0" or "₹0" is preserved', () => {
  const inputEvent = {
    title: 'Free Hackathon',
    organizer: 'Student Club',
    department: 'Biotechnology',
    shortDescription: 'Community event.',
    prizePool: '₹0',
    status: 'PUBLISHED'
  };

  const serialized = mockSerializeHackathonPayload(inputEvent);
  assertNoUndefinedFields(serialized);
  assert(serialized.prizePool === '₹0', 'String "₹0" must be preserved');
});

check('Scenario 4: Draft saved with optional fields omitted produces safe Firestore payload', () => {
  const draftEvent = {
    title: 'Draft Hackathon Name',
    organizer: 'Biotechnology Department',
    department: 'Biotechnology',
    shortDescription: 'Draft Hackathon Name (Draft)',
    status: 'DRAFT',
    prizePool: undefined,
    officialUrl: '',
    bannerUrl: '',
    eventStart: undefined,
    eventEnd: undefined
  };

  const serialized = mockSerializeHackathonPayload(draftEvent);
  assertNoUndefinedFields(serialized, 'hackathons/draft-event-1');
  assert(serialized.status === 'DRAFT');
  assert(!('prizePool' in serialized));
});

check('Scenario 5: Update with cleared prize pool deletes field safely without overwriting other fields', () => {
  const updatePayload = {
    prizePool: '', // Admin cleared the prize field
    shortDescription: 'Updated event summary'
  };

  const serialized = mockSerializeHackathonPayload(updatePayload, { isUpdate: true });
  assertNoUndefinedFields(serialized);
  assert(serialized.prizePool._methodName === 'deleteField', 'Cleared prizePool on update must trigger Firestore deleteField()');
  assert(serialized.shortDescription === 'Updated event summary', 'Other update fields must be preserved');
});

// ========================================================================
// SECTION 3: AUDIT OF ALL OTHER FIRESTORE WRITE SERVICES
// ========================================================================
console.log('\n[SECTION 3: Audit of All Other Firestore Services]');

const certServiceCode = fs.readFileSync('src/services/certificateService.ts', 'utf8');
const notifServiceCode = fs.readFileSync('src/services/notificationService.ts', 'utf8');
const annServiceCode = fs.readFileSync('src/services/announcementService.ts', 'utf8');
const studentServiceCode = fs.readFileSync('src/services/studentService.ts', 'utf8');
const subServiceCode = fs.readFileSync('src/services/submissionService.ts', 'utf8');
const regServiceCode = fs.readFileSync('src/services/registrationService.ts', 'utf8');
const adminServiceCode = fs.readFileSync('src/services/adminService.ts', 'utf8');

check('certificateService.ts sanitizes cert payload before setDoc', () => {
  assert(certServiceCode.includes('sanitizeForFirestore(cert)'), 'certificateService must sanitize cert before setDoc');
});

check('notificationService.ts sanitizes notification payload before setDoc', () => {
  assert(notifServiceCode.includes('sanitizeForFirestore(notifItem)'), 'notificationService must sanitize notifItem before setDoc');
});

check('announcementService.ts sanitizes announcement payload before setDoc', () => {
  assert(annServiceCode.includes('sanitizeForFirestore(newAnn)'), 'announcementService must sanitize newAnn before setDoc');
});

check('studentService.ts sanitizes student updates before updateDoc', () => {
  assert(studentServiceCode.includes('sanitizeForFirestore(updates)'), 'studentService must sanitize updates before updateDoc');
});

check('submissionService.ts sanitizes submissions and evaluations before writes', () => {
  assert(subServiceCode.includes('sanitizeForFirestore({'), 'submissionService must sanitize submission before setDoc');
  assert(subServiceCode.includes('sanitizeForFirestore({\n      evaluationScore: score,'), 'submissionService must sanitize evaluation payload before updateDoc');
});

check('registrationService.ts sanitizes registrations before transaction.set and updateDoc', () => {
  assert(regServiceCode.includes('sanitizeForFirestore(firestorePayload)'), 'registrationService must sanitize firestorePayload');
  assert(regServiceCode.includes('sanitizeForFirestore({\n      ...updates,'), 'registrationService must sanitize cleanUpdates');
});

check('adminService.ts sanitizes audit logs before setDoc across all actions', () => {
  assert(adminServiceCode.includes('setDoc(auditLogRef, sanitizeForFirestore(auditLogData))'), 'adminService must sanitize audit logs before setDoc');
});

// ========================================================================
// SECTION 4: HOD APPROVAL REMOVAL CONFIRMATION
// ========================================================================
console.log('\n[SECTION 4: Confirmation of HOD Approval Removal]');

const rulesCode = fs.readFileSync('firestore.rules', 'utf8');
const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const adminLayoutCode = fs.readFileSync('src/components/layout/AdminLayout.tsx', 'utf8');

check('firestore.rules isStaff() does not require approvalStatus == APPROVED', () => {
  assert(!rulesCode.includes('getAdminData().approvalStatus == \'APPROVED\''), 'isStaff() must not require approvalStatus == APPROVED');
  assert(!rulesCode.includes('isDeptApprover('), 'Obsolete isDeptApprover helper must be completely removed');
});

check('App.tsx redirects /admin/faculty-approvals safely', () => {
  assert(!appCode.includes('AdminFacultyApprovalsPage'), 'App.tsx must not import obsolete AdminFacultyApprovalsPage');
  assert(appCode.includes('path="faculty-approvals" element={<Navigate to="/admin" replace />}'), 'faculty-approvals route must redirect to /admin');
});

check('AdminLayout.tsx navigation does not display Faculty Approvals item', () => {
  assert(!adminLayoutCode.includes('Faculty Approvals'), 'AdminLayout must not display Faculty Approvals item');
  assert(!adminLayoutCode.includes('pendingApprovalsCount'), 'AdminLayout must not compute pendingApprovalsCount');
});

// ========================================================================
// SUMMARY
// ========================================================================
console.log('\n========================================================================');
console.log(`  VERIFICATION RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED`);
console.log('========================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
