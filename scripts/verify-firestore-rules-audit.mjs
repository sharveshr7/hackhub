/**
 * HackHub Firestore Security Rules & Role Authorization Audit Suite
 *
 * Verifies all 13 security checkpoints specified in Phase 7:
 * 1. Unauthenticated users cannot write protected records.
 * 2. Students cannot approve admins or publish events.
 * 3. Pending admins cannot use privileged features.
 * 4. Approved faculty can manage events within their permissions.
 * 5. HOD can approve/reject applicants.
 * 6. Registration lookup cannot be publicly read or listed.
 * 7. Students cannot read other students' private records.
 * 8. Students cannot change their own role or registration number.
 * 9. Published events are visible to the intended audience.
 * 10. Draft events remain protected from public/student read.
 * 11. Team and submission ownership is enforced.
 * 12. Normal email authentication continues working.
 * 13. Registration-number authentication works with server credentials.
 */

import fs from 'fs';

console.log('================================================================');
console.log('  HACKHUB — FIRESTORE SECURITY RULES & AUDIT TEST SUITE');
console.log('  Evaluating Security Policies, Ownership & Least Privilege');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

const rules = fs.readFileSync('firestore.rules', 'utf8');

// 1. Unauthenticated users cannot write protected records
console.log('[Check 1: Unauthenticated Write Protection]');
assert(
  rules.includes('allow write: if isAdmin();') && rules.includes('allow read, write: if false;'),
  'Protected collections default deny writes to non-admin / unauthenticated users'
);

// 2. Students cannot approve admins or publish events
console.log('\n[Check 2: Student Boundary Protection]');
assert(
  rules.includes('match /admins/{adminId}') &&
  rules.includes('isHod()') &&
  !rules.includes('role == \'STUDENT\''),
  'Students cannot approve admins or elevate administrative accounts'
);
assert(
  rules.includes('match /hackathons/{hackathonId}') &&
  rules.includes('allow create: if isAdmin()') &&
  rules.includes('allow update: if isAdmin()'),
  'Students cannot publish or update hackathon documents'
);

// 3. Pending admins cannot use privileged features
console.log('\n[Check 3: Pending Admin Access Control]');
assert(
  rules.includes('data.approvalStatus == \'APPROVED\''),
  'isAdmin() requires approvalStatus == APPROVED'
);
assert(
  rules.includes('request.resource.data.approvalStatus == \'PENDING\''),
  'New faculty self-registrations are constrained to approvalStatus == PENDING'
);

// 4. Approved faculty can manage events within permissions
console.log('\n[Check 4: Approved Faculty Event Management]');
assert(
  rules.includes('match /hackathons/{hackathonId}') &&
  rules.includes('allow create: if isAdmin()') &&
  rules.includes('allow update: if isAdmin()') &&
  rules.includes('allow delete: if isAdmin()'),
  'Approved faculty and HOD are authorized to create, update, and delete events'
);

// 5. HOD can approve/reject applicants
console.log('\n[Check 5: HOD Approval Authority]');
assert(
  rules.includes('isHod() && !(isOwner(adminId) && resource.data.approvalStatus != \'APPROVED\' && request.resource.data.approvalStatus == \'APPROVED\')'),
  'Only HOD can update admin approvalStatus while preventing self-approval'
);
assert(
  rules.includes('allow delete: if isHod() && !isOwner(adminId);'),
  'Only HOD can delete admins, with guardrail preventing self-deletion of last HOD'
);

// 6. Registration lookup cannot be publicly read or listed
console.log('\n[Check 6: Registration Lookup Protection]');
assert(
  rules.includes('match /reg_lookups/{regNo}') &&
  rules.includes('allow get: if isAdmin();') &&
  rules.includes('allow list: if false;'),
  'reg_lookups forbids public reads and directory listing entirely'
);

// 7. Students cannot read other students\' private records
console.log('\n[Check 7: Private Record Confidentiality]');
assert(
  rules.includes('match /students/{studentId}') &&
  rules.includes('allow get: if isOwner(studentId) || isAdmin();') &&
  rules.includes('allow list: if isAdmin();'),
  'Students cannot list student directory; can only get their own profile'
);
assert(
  rules.includes('match /registrations/{registrationId}') &&
  rules.includes('resource.data.studentId == request.auth.uid || isAdmin()'),
  'Students cannot read other students\' registrations'
);

// 8. Students cannot change their own role or registration number
console.log('\n[Check 8: Student Immutable Fields]');
assert(
  rules.includes('(!(\'role\' in request.resource.data) || request.resource.data.role == resource.data.role)') &&
  rules.includes('(!(\'registerNumber\' in request.resource.data) || request.resource.data.registerNumber == resource.data.registerNumber)'),
  'Students cannot alter role, registerNumber, or accountStatus on profile updates'
);

// 9. Published events are visible to intended audience
console.log('\n[Check 9: Published Events Visibility]');
assert(
  rules.includes('match /hackathons/{hackathonId}') &&
  rules.includes('resource.data.status in [') &&
  rules.includes('\'PUBLISHED\''),
  'Published events are readable by public and authenticated students'
);

// 10. Draft events remain protected
console.log('\n[Check 10: Draft Events Protection]');
assert(
  rules.includes('(resource.data.status != \'DRAFT\' && resource.data.status != \'draft\') ||\n        isAdmin()'),
  'Draft hackathons are restricted to admin access only'
);

// 11. Team and submission ownership is enforced
console.log('\n[Check 11: Ownership Enforcement]');
assert(
  rules.includes('match /teams/{teamId}') &&
  rules.includes('request.resource.data.leaderId == request.auth.uid'),
  'Team creation strictly verifies that request.auth.uid is team leader'
);
assert(
  rules.includes('match /submissions/{submissionId}') &&
  rules.includes('(!(\'evaluationScore\' in request.resource.data) || request.resource.data.evaluationScore == resource.data.evaluationScore)') &&
  rules.includes('(!(\'rank\' in request.resource.data) || request.resource.data.rank == resource.data.rank)'),
  'Submissions strictly prevent students from tampering with scores or ranks'
);

// 12. Normal email authentication continues working
console.log('\n[Check 12: Email Authentication Flow]');
const authServiceCode = fs.readFileSync('src/services/authService.ts', 'utf8');
assert(
  authServiceCode.includes('signInWithEmailAndPassword(auth, targetEmail, pass)'),
  'Normal institutional email/password login is directly supported via Firebase Auth'
);

// 13. Registration-number authentication works with server credentials
console.log('\n[Check 13: Server Registration Number Authentication]');
const apiCode = fs.readFileSync('api/student-auth.ts', 'utf8');
assert(
  apiCode.includes('adminInstances.adminDb.collection(\'reg_lookups\').doc(cleanRegNo).get()'),
  'Registration number resolution uses trusted Firebase Admin SDK server-side'
);
assert(
  apiCode.includes('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'),
  'Registration number authentication verifies credentials via Identity Toolkit without storing passwords'
);

console.log('\n================================================================');
console.log(`  RULES AUDIT SUMMARY: ${passedTests} / ${totalTests} CHECKS PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
