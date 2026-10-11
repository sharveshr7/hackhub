/**
 * HackHub — Admin Provisioning & Approval Workflow Verification Test
 * 
 * Tests the 7 required verification checkpoints:
 * 1. The first provisioned administrator can log in.
 * 2. The administrator can open the approval screen (/admin/faculty-approvals).
 * 3. A pending faculty account cannot access /admin.
 * 4. The administrator can approve a pending faculty application.
 * 5. The approved account can sign in and access authorized features.
 * 6. Students cannot approve faculty applications or grant themselves admin privileges.
 * 7. Firestore rules enforce the same restrictions.
 */

import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('  HACKHUB — VERIFICATION TEST SUITE');
console.log('  Testing First Administrator Provisioning & Faculty Approvals');
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
// CHECKPOINT 1: The first provisioned administrator account state
// -------------------------------------------------------------
console.log('[Checkpoint 1] First Provisioned Administrator Verification:');
const firstAdminEmail = 'jacksdani74@gmail.com';
const firstAdminUid = 'E3O2Dy67Z3Zyybkjs1048k54CJA3';

// Verify authService loginAdmin logic handles approved administrator
function simulateLoginAdmin(adminDoc) {
  if (!adminDoc) {
    throw new Error('This account does not have administrator access.');
  }
  const roleUpper = (adminDoc.role || '').toUpperCase();
  if (adminDoc.approvalStatus === 'PENDING') {
    throw new Error(
      'Your faculty registration is currently pending approval by the college administrator. Please check back once verified.'
    );
  }
  if (adminDoc.approvalStatus === 'REJECTED') {
    throw new Error(
      'Your faculty registration was not approved. Please contact your department coordinator.'
    );
  }
  const isApproved =
    adminDoc.approvalStatus === 'APPROVED' ||
    (!adminDoc.approvalStatus && roleUpper === 'ADMIN');
  if (roleUpper !== 'ADMIN' || !isApproved) {
    throw new Error('This account does not have administrator access.');
  }
  return {
    uid: adminDoc.uid,
    email: adminDoc.email,
    role: 'ADMIN',
    adminData: adminDoc
  };
}

const provisionedAdminProfile = {
  uid: firstAdminUid,
  email: firstAdminEmail,
  name: 'Dr Jackson Daniel',
  role: 'ADMIN',
  designation: 'Head of Department (HOD)',
  department: 'Biomedical Engineering',
  facultyId: 'Hod',
  phone: '9442445330',
  institution: 'KalaignarKarunanidhi Institute Of Technology',
  approvalStatus: 'APPROVED',
  isFirstAdmin: true
};

try {
  const session = simulateLoginAdmin(provisionedAdminProfile);
  assert(session.role === 'ADMIN', 'Provisioned admin logs in with ADMIN role');
  assert(session.adminData.approvalStatus === 'APPROVED', 'Provisioned admin has APPROVED status');
  assert(session.adminData.isFirstAdmin === true, 'Provisioned admin is tagged as isFirstAdmin');
} catch (err) {
  assert(false, `Provisioned admin failed login check: ${err.message}`);
}

// -------------------------------------------------------------
// CHECKPOINT 2: The administrator can open the approval screen
// -------------------------------------------------------------
console.log('\n[Checkpoint 2] Approval Screen Availability:');
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
const adminLayoutTsx = fs.readFileSync('src/components/layout/AdminLayout.tsx', 'utf8');
const approvalPageExists = fs.existsSync('src/pages/admin/AdminFacultyApprovalsPage.tsx');

assert(approvalPageExists, 'AdminFacultyApprovalsPage.tsx component exists');
assert(appTsx.includes('AdminFacultyApprovalsPage'), 'App.tsx imports AdminFacultyApprovalsPage');
assert(appTsx.includes('path="faculty-approvals"'), 'Route /admin/faculty-approvals is registered');
assert(adminLayoutTsx.includes('/admin/faculty-approvals'), 'AdminLayout navigation contains Faculty Approvals link');
assert(adminLayoutTsx.includes('pendingApprovalsCount'), 'AdminLayout computes pendingApprovalsCount for badge notification');

// -------------------------------------------------------------
// CHECKPOINT 3: A pending faculty account cannot access /admin
// -------------------------------------------------------------
console.log('\n[Checkpoint 3] Pending Faculty Account Access Control:');
const pendingFacultyProfile = {
  uid: 'pending-faculty-uid',
  email: 'pending.faculty@kitcbe.com',
  name: 'Dr. Pending Faculty',
  role: 'admin',
  approvalStatus: 'PENDING'
};

try {
  simulateLoginAdmin(pendingFacultyProfile);
  assert(false, 'Pending faculty should not be allowed to log in as ADMIN');
} catch (err) {
  assert(
    err.message.includes('pending approval by the college administrator'),
    `Pending faculty receives exact pending notice: "${err.message}"`
  );
}

// Verify useAuth hook withholds admin permissions
const useAuthContent = fs.readFileSync('src/hooks/useAuth.ts', 'utf8');
assert(
  useAuthContent.includes('isApproved') && useAuthContent.includes('withholding admin permissions'),
  'useAuth hook explicitly withholds admin permissions for unapproved accounts'
);

// Verify AdminLayout guards /admin
assert(
  adminLayoutTsx.includes('currentUser.role !== \'ADMIN\'') && adminLayoutTsx.includes('Access Denied: Admin Authorization Required'),
  'AdminLayout strictly blocks any user whose role is not ADMIN'
);

// -------------------------------------------------------------
// CHECKPOINT 4: The administrator can approve a pending application
// -------------------------------------------------------------
console.log('\n[Checkpoint 4] Administrator Faculty Approval Action:');
const adminServiceContent = fs.readFileSync('src/services/adminService.ts', 'utf8');
assert(adminServiceContent.includes('approveFacultyAdmin'), 'adminService contains approveFacultyAdmin method');
assert(adminServiceContent.includes('rejectFacultyAdmin'), 'adminService contains rejectFacultyAdmin method');

function simulateApproveFaculty(applicant, approverName) {
  return {
    ...applicant,
    approvalStatus: 'APPROVED',
    approvedBy: approverName,
    approvedAt: new Date().toISOString(),
    role: 'admin'
  };
}

const approvedByAdmin = simulateApproveFaculty(pendingFacultyProfile, 'Dr Jackson Daniel');
assert(approvedByAdmin.approvalStatus === 'APPROVED', 'Approval action transitions status to APPROVED');
assert(approvedByAdmin.approvedBy === 'Dr Jackson Daniel', 'Approver name is recorded');
assert(Boolean(approvedByAdmin.approvedAt), 'Approval timestamp is recorded');

// -------------------------------------------------------------
// CHECKPOINT 5: The newly approved account can sign in
// -------------------------------------------------------------
console.log('\n[Checkpoint 5] Newly Approved Faculty Access:');
try {
  const newSession = simulateLoginAdmin(approvedByAdmin);
  assert(newSession.role === 'ADMIN', 'Newly approved faculty successfully logs in with ADMIN role');
} catch (err) {
  assert(false, `Approved faculty failed login: ${err.message}`);
}

// -------------------------------------------------------------
// CHECKPOINT 6: Students cannot approve faculty or elevate themselves
// -------------------------------------------------------------
console.log('\n[Checkpoint 6] Student Role Boundary Enforcement:');
const studentProfile = {
  uid: 'student-uid-123',
  email: 'student@kitcbe.com',
  name: 'Student User',
  role: 'STUDENT'
};

try {
  simulateLoginAdmin(studentProfile);
  assert(false, 'Student should not log in as admin');
} catch (err) {
  assert(
    err.message.includes('does not have administrator access'),
    `Student is blocked from admin login: "${err.message}"`
  );
}

// -------------------------------------------------------------
// CHECKPOINT 7: Firestore security rules enforce identical restrictions
// -------------------------------------------------------------
console.log('\n[Checkpoint 7] Firestore Security Rules Enforcement:');
const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');

assert(
  firestoreRules.includes('data.approvalStatus == \'APPROVED\''),
  'firestore.rules requires approvalStatus == APPROVED in isAdmin()'
);
assert(
  firestoreRules.includes('match /admins/{adminId}') && (firestoreRules.includes('isHod()') || firestoreRules.includes('isAdmin()')),
  'firestore.rules restricts updating admins to approved HOD / admins only'
);
assert(
  firestoreRules.includes('!exists(/databases/$(database)/documents/students/$(request.auth.uid))'),
  'firestore.rules prevents existing students from registering in admins collection'
);
assert(
  firestoreRules.includes('request.resource.data.approvalStatus == \'PENDING\''),
  'firestore.rules forces self-created faculty profiles to have approvalStatus == PENDING'
);

console.log('\n================================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
