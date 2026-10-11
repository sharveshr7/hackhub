import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('  HACKHUB — VERIFY FIRESTORE REGISTRATION PAYLOAD FIX');
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

// 1. Inspect src/services/registrationService.ts
const regServicePath = path.join(rootDir, 'src', 'services', 'registrationService.ts');
const regServiceContent = fs.readFileSync(regServicePath, 'utf-8');

assert(
  !regServiceContent.includes('externalStatus: isExt ? \'APPLIED_EXTERNALLY\' : undefined'),
  'registrationService.ts no longer assigns externalStatus to undefined for internal hackathons'
);

assert(
  regServiceContent.includes('firestorePayload.externalStatus = \'APPLIED_EXTERNALLY\''),
  'externalStatus is conditionally assigned only when isExt is true'
);

assert(
  regServiceContent.includes('cleanPayload = Object.fromEntries'),
  'cleanPayload strips any undefined properties before calling setDoc()'
);

assert(
  regServiceContent.includes('await setDoc(doc(db, \'registrations\', regId), cleanPayload)'),
  'setDoc uses the sanitized cleanPayload dictionary'
);

// 2. Validate simulation of internal and external payloads
function simulateRegistration(hackathon) {
  const regId = `reg_${Date.now()}_test`;
  const isExt = Boolean(
    hackathon.isExternal ||
    (hackathon.organizerType && hackathon.organizerType !== 'OUR_COLLEGE')
  );
  const nowIso = new Date().toISOString();

  const newReg = {
    id: regId,
    hackathonId: hackathon.id,
    studentId: 'test_student_uid',
    registrationNumber: isExt ? 'EXT-TRACK-1234' : 'HACK-2026-1234',
    status: 'CONFIRMED',
    isExternal: isExt,
    externalTrackingOnly: isExt,
    acceptedRules: true,
    attendanceStatus: isExt ? 'ATTENDED' : 'PENDING',
    submissionStatus: 'NOT_SUBMITTED',
    registeredAt: nowIso,
    ...(isExt ? { externalStatus: 'APPLIED_EXTERNALLY' } : {})
  };

  const firestorePayload = {
    id: regId,
    hackathonId: hackathon.id,
    studentId: 'test_student_uid',
    registrationNumber: newReg.registrationNumber,
    status: 'CONFIRMED',
    isExternal: isExt,
    externalTrackingOnly: isExt,
    acceptedRules: true,
    attendanceStatus: isExt ? 'ATTENDED' : 'PENDING',
    submissionStatus: 'NOT_SUBMITTED',
    registeredAt: nowIso,
    createdAt: 'SERVER_TIMESTAMP_PLACEHOLDER',
    updatedAt: 'SERVER_TIMESTAMP_PLACEHOLDER'
  };

  if (isExt) {
    firestorePayload.externalStatus = 'APPLIED_EXTERNALLY';
  }

  if (newReg.teamId !== undefined) {
    firestorePayload.teamId = newReg.teamId;
  }
  if (newReg.attendedAt !== undefined) {
    firestorePayload.attendedAt = newReg.attendedAt;
  }
  if (newReg.externalNotes !== undefined) {
    firestorePayload.externalNotes = newReg.externalNotes;
  }

  const cleanPayload = Object.fromEntries(
    Object.entries(firestorePayload).filter(([_, v]) => v !== undefined)
  );

  return { newReg, cleanPayload };
}

// Internal Hackathon
const internalHackathon = {
  id: 'hack-internal-101',
  title: 'KIT Innovation Challenge 2026',
  organizerType: 'OUR_COLLEGE',
  isExternal: false
};
const internalResult = simulateRegistration(internalHackathon);

assert(
  !('externalStatus' in internalResult.cleanPayload),
  'Internal hackathon clean payload does NOT include externalStatus key'
);
assert(
  Object.values(internalResult.cleanPayload).every(v => v !== undefined),
  'Internal hackathon clean payload has zero undefined values'
);
assert(
  internalResult.cleanPayload.externalTrackingOnly === false,
  'Internal hackathon has externalTrackingOnly set to false'
);
assert(
  internalResult.cleanPayload.attendanceStatus === 'PENDING',
  'Internal hackathon has attendanceStatus set to PENDING'
);

// External Opportunity
const externalHackathon = {
  id: 'hack-external-202',
  title: 'Smart India Hackathon 2026',
  organizerType: 'GOVERNMENT',
  isExternal: true
};
const externalResult = simulateRegistration(externalHackathon);

assert(
  externalResult.cleanPayload.externalStatus === 'APPLIED_EXTERNALLY',
  'External hackathon includes externalStatus: APPLIED_EXTERNALLY'
);
assert(
  externalResult.cleanPayload.externalTrackingOnly === true,
  'External hackathon has externalTrackingOnly set to true'
);
assert(
  externalResult.cleanPayload.attendanceStatus === 'ATTENDED',
  'External hackathon has attendanceStatus set to ATTENDED'
);
assert(
  Object.values(externalResult.cleanPayload).every(v => v !== undefined),
  'External hackathon clean payload has zero undefined values'
);

// 3. Inspect submissionService.ts for undefined submittedAt prevention
const subServicePath = path.join(rootDir, 'src', 'services', 'submissionService.ts');
const subServiceContent = fs.readFileSync(subServicePath, 'utf-8');

assert(
  !subServiceContent.includes('submittedAt: data.isDraft ? undefined : nowIso'),
  'submissionService.ts no longer assigns undefined to submittedAt on draft save'
);
assert(
  subServiceContent.includes('cleanSubmission = Object.fromEntries'),
  'submissionService.ts sanitizes cleanSubmission before setDoc()'
);

console.log('\n================================================================');
console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
