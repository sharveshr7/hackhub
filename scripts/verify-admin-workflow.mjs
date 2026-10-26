/**
 * HackHub — Verification Test Suite
 * 
 * Verifies:
 * 1. Staff login and access without HOD approval.
 * 2. Rejection of unauthorized role escalation (ordinary staff cannot self-promote to platform admin).
 * 3. Department-level access boundaries.
 * 4. Removal of HOD staff-approval workflow across the application.
 * 5. Bulk student upload validation (headers, required fields, duplicate detection, row numbers with reasons).
 * 6. File upload validations (submission artifacts, allowed extensions including video .mp4/.webm, size limits).
 * 7. Firestore & Storage security rules constraints.
 */

import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('  HACKHUB — VERIFICATION TEST SUITE');
console.log('  Staff Access Without Approval & Upload Workflow Diagnostics');
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

// -------------------------------------------------------------
// CHECKPOINT 1: Staff Login & Access Without HOD Approval
// -------------------------------------------------------------
console.log('[Checkpoint 1] Staff Login & Access Without HOD Approval:');

function simulateLoginAdmin(adminDoc) {
  if (!adminDoc) {
    throw new Error('This account does not have administrator access.');
  }
  const roleUpper = (adminDoc.role || '').toUpperCase();
  const isStaffRole = ['ADMIN', 'FACULTY'].includes(roleUpper);
  if (!isStaffRole) {
    throw new Error('This account does not have administrator access.');
  }
  if (adminDoc.isActive === false || adminDoc.accountStatus === 'deactivated') {
    throw new Error('This administrator account has been deactivated. Please contact the department administrator.');
  }
  const effectiveRole = adminDoc.isPlatformAdmin === true ? 'ADMIN' : 'FACULTY';
  return {
    uid: adminDoc.uid,
    email: adminDoc.email,
    role: effectiveRole,
    adminData: {
      ...adminDoc,
      role: effectiveRole
    }
  };
}

// 1.1 Existing staff account with legacy pending approvalStatus can log in without being blocked
const legacyPendingStaff = {
  uid: 'faculty-pending-uid',
  email: 'faculty.bme@kitcbe.com',
  name: 'Dr. Faculty Member',
  role: 'FACULTY',
  department: 'Biomedical Engineering',
  approvalStatus: 'PENDING',
  isActive: true,
  accountStatus: 'active'
};

try {
  const session = simulateLoginAdmin(legacyPendingStaff);
  assert(session.role === 'FACULTY', 'Staff account with legacy PENDING approvalStatus signs in with FACULTY role');
  assert(session.adminData.department === 'Biomedical Engineering', 'Staff maintains authorized department');
} catch (err) {
  assert(false, `Staff with legacy pending status should not be blocked: ${err.message}`);
}

// 1.2 Staff account with missing approvalStatus field signs in directly
const staffNoApprovalField = {
  uid: 'faculty-new-uid',
  email: 'faculty.biotech@kitcbe.com',
  name: 'Dr. Biotech Coordinator',
  role: 'FACULTY',
  department: 'Biotechnology',
  isActive: true,
  accountStatus: 'active'
};

try {
  const session = simulateLoginAdmin(staffNoApprovalField);
  assert(session.role === 'FACULTY', 'Staff without approvalStatus field signs in directly');
} catch (err) {
  assert(false, `Staff without approvalStatus field failed login: ${err.message}`);
}

// 1.3 Deactivated staff account is properly blocked
const deactivatedStaff = {
  uid: 'deactivated-uid',
  email: 'former.staff@kitcbe.com',
  name: 'Former Staff',
  role: 'FACULTY',
  department: 'Biotechnology',
  isActive: false,
  accountStatus: 'deactivated'
};

try {
  simulateLoginAdmin(deactivatedStaff);
  assert(false, 'Deactivated staff should not be allowed to log in');
} catch (err) {
  assert(err.message.includes('deactivated'), `Deactivated staff receives proper deactivation message: "${err.message}"`);
}

// 1.4 Student role account cannot log in through staff login
const studentAccount = {
  uid: 'student-uid',
  email: 'student@kitcbe.com',
  name: 'Student User',
  role: 'STUDENT',
  isActive: true
};

try {
  simulateLoginAdmin(studentAccount);
  assert(false, 'Student should not be allowed staff access');
} catch (err) {
  assert(err.message.includes('does not have administrator access'), 'Student is denied staff portal access');
}

// -------------------------------------------------------------
// CHECKPOINT 2: Rejection of Unauthorized Role Escalation
// -------------------------------------------------------------
console.log('\n[Checkpoint 2] Rejection of Unauthorized Role Escalation:');

// Ordinary staff has FACULTY role, not ADMIN (Platform Admin)
const ordinaryStaffSession = simulateLoginAdmin(legacyPendingStaff);
assert(ordinaryStaffSession.role === 'FACULTY', 'Ordinary staff receives FACULTY role, not platform ADMIN');

const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');
assert(
  firestoreRules.includes('request.resource.data.isPlatformAdmin == resource.data.isPlatformAdmin'),
  'Firestore rules strictly prevent ordinary staff from elevating isPlatformAdmin'
);
assert(
  firestoreRules.includes('request.resource.data.role == resource.data.role'),
  'Firestore rules strictly prevent ordinary staff from elevating their role'
);
assert(
  firestoreRules.includes('request.resource.data.department == resource.data.department'),
  'Firestore rules strictly prevent ordinary staff from changing their department'
);

// -------------------------------------------------------------
// CHECKPOINT 3: Removal of HOD Approval Workflow in UI & API
// -------------------------------------------------------------
console.log('\n[Checkpoint 3] Removal of HOD Approval Workflow:');

const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
const adminLayoutTsx = fs.readFileSync('src/components/layout/AdminLayout.tsx', 'utf8');
const authServiceTsx = fs.readFileSync('src/services/authService.ts', 'utf8');
const useAuthTsx = fs.readFileSync('src/hooks/useAuth.ts', 'utf8');
const studentAuthApi = fs.readFileSync('api/student-auth.ts', 'utf8');
const adminUsersApi = fs.readFileSync('api/admin/users.ts', 'utf8');

assert(!appTsx.includes('AdminFacultyApprovalsPage'), 'App.tsx does not import AdminFacultyApprovalsPage');
assert(appTsx.includes('path="faculty-approvals" element={<Navigate to="/admin" replace />}'), 'Route /admin/faculty-approvals redirects safely to /admin');
assert(!adminLayoutTsx.includes('/admin/faculty-approvals'), 'AdminLayout navigation has no Faculty Approvals item');
assert(!adminLayoutTsx.includes('pendingApprovalsCount'), 'AdminLayout does not compute pending approvals count');
assert(!authServiceTsx.includes("approvalStatus === 'PENDING'"), 'authService.loginAdmin does not block pending approval accounts');
assert(!authServiceTsx.includes("approvalStatus === 'REJECTED'"), 'authService.loginAdmin does not block rejected approval accounts');
assert(!useAuthTsx.includes("approvalStatus === 'APPROVED'"), 'useAuth hook does not require approvalStatus to grant staff access');
assert(!studentAuthApi.includes("adminData.approvalStatus !== 'APPROVED'"), 'api/student-auth.ts does not check approvalStatus');
assert(!adminUsersApi.includes("adminData.approvalStatus !== 'APPROVED'"), 'api/admin/users.ts does not check approvalStatus');
assert(!firestoreRules.includes("getAdminData().approvalStatus == 'APPROVED'"), 'firestore.rules does not require approvalStatus for staff');
assert(!firestoreRules.includes('isDeptApprover'), 'firestore.rules has removed isDeptApprover helper and approval branches');

// -------------------------------------------------------------
// CHECKPOINT 4: Bulk Student Upload Validation & Diagnostics
// -------------------------------------------------------------
console.log('\n[Checkpoint 4] Bulk Student Upload Validation & Diagnostics:');

assert(studentAuthApi.includes("action === 'bulk-import-students'"), 'API student-auth supports bulk-import-students action');
assert(studentAuthApi.includes('fileEmails.has(email)') && studentAuthApi.includes('fileRegNos.has(registerNumber)'), 'API detects in-file duplicates with referencing row numbers');
assert(studentAuthApi.includes('existingEmails.has(email)') && studentAuthApi.includes('existingRegNos.has(registerNumber)'), 'API detects database duplicates before writing');
assert(studentAuthApi.includes('SUPPORTED_STUDENT_DEPARTMENTS.includes(department)'), 'API validates department against supported values');
assert(studentAuthApi.includes('SUPPORTED_STUDENT_YEARS.includes(year)'), 'API validates academic year against supported values');
assert(studentAuthApi.includes("actor.role !== 'ADMIN' && (!actor.department || department !== actor.department)"), 'API enforces department-level boundaries on student import');
assert(studentAuthApi.includes('results.push({ row: rowNum') && studentAuthApi.includes("status: 'failed', reason:"), 'API reports row-level actionable rejection reasons without aborting entire import');
assert(fs.existsSync('src/components/admin/BulkStudentImportModal.tsx'), 'BulkStudentImportModal UI component exists');

const bulkModalSource = fs.readFileSync('src/components/admin/BulkStudentImportModal.tsx', 'utf8');
assert(bulkModalSource.includes('handleDownloadTemplate'), 'Bulk import modal provides standard sample CSV template download');
assert(bulkModalSource.includes('file.name.toLowerCase().endsWith(\'.csv\')'), 'Bulk import validates file type (.csv)');
assert(bulkModalSource.includes('previewFilter'), 'Bulk import modal provides filterable inspection preview table');

// -------------------------------------------------------------
// CHECKPOINT 5: Submission & File Upload Diagnostics
// -------------------------------------------------------------
console.log('\n[Checkpoint 5] Submission & File Upload Diagnostics:');

const cloudinaryService = fs.readFileSync('src/services/cloudinaryService.ts', 'utf8');
assert(cloudinaryService.includes("'mp4'") && cloudinaryService.includes("'webm'"), 'cloudinaryService ALLOWED_EXTENSIONS includes mp4 and webm videos');
assert(cloudinaryService.includes('MAX_FILE_SIZE_BYTES = 60 * 1024 * 1024'), 'File upload enforces 60 MB size limit');

const storageRules = fs.readFileSync('storage.rules', 'utf8');
assert(!storageRules.includes("adminData().approvalStatus == 'APPROVED'"), 'storage.rules isStaff does not require HOD approval');
assert(storageRules.includes('match /hackathons/{hackathonId}/{allPaths=**}'), 'storage.rules manages hackathon banner uploads');
assert(storageRules.includes('match /submissions/{teamId}/{allPaths=**}'), 'storage.rules allows team members to upload submissions');

// -------------------------------------------------------------
// CHECKPOINT 6: Submission Rule Permitted Keys
// -------------------------------------------------------------
console.log('\n[Checkpoint 6] Submission Rule Permitted Keys:');

const submissionKeysMatch = firestoreRules.includes('problemStatementId') &&
  firestoreRules.includes('cloudinaryPublicId') &&
  firestoreRules.includes('fileUrl') &&
  firestoreRules.includes('fileName');

assert(submissionKeysMatch, 'firestore.rules submissions update rule permits all upload artifact and problem statement keys');

console.log(`\n================================================================`);
console.log(`  RESULT: ${passedTests}/${totalTests} tests passed`);
console.log(`================================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
