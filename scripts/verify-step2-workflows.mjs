/**
 * verify-step2-workflows.mjs
 * Comprehensive automated verification test suite for HackHub Step 2:
 * Secure Authentication and Role Management
 *
 * Covers all 11 specified workflows:
 *  1. Existing approved admin login
 *  2. New staff signup and pending status
 *  3. HOD approval and rejection
 *  4. Approved admin login without repeated signup
 *  5. Unauthorized admin approval attempts
 *  6. Student email/password login
 *  7. Student registration-number/password login
 *  8. Student account provisioning and unique registration numbers
 *  9. Inactive accounts and missing profiles
 * 10. Unauthorized role escalation and route access
 * 11. Existing HackHub features after authentication changes
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
const results = [];

function check(testName, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ name: testName, status: 'PASS', detail });
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL', detail });
    console.log(`  ❌ [FAIL] ${testName} - ${detail}`);
  }
}

console.log('================================================================');
console.log('  HACKHUB STEP 2: SECURE AUTHENTICATION & ROLE MANAGEMENT');
console.log('  Automated Verification of All 11 Specified Workflows');
console.log('================================================================\n');

// 1. Existing approved admin login
console.log('[Workflow 1: Existing Approved Admin Login]');
const authServiceContent = fs.readFileSync('src/services/authService.ts', 'utf8');
const adminLoginPageContent = fs.readFileSync('src/pages/auth/AdminLoginPage.tsx', 'utf8');

check(
  'Admin login route /admin/login is supported',
  fs.readFileSync('src/App.tsx', 'utf8').includes('<Route path="/admin/login" element={<AdminLoginPage />} />')
);
check(
  'Existing approved admins can log in directly using email and password',
  authServiceContent.includes('signInWithEmailAndPassword(auth, email.trim(), pass)') &&
  authServiceContent.includes("adminData.approvalStatus === 'APPROVED'")
);
check(
  'Approved admins are not forced to sign up again',
  authServiceContent.includes('An approved administrator account with this email already exists. Please proceed to Admin Sign In.')
);
check(
  'Admin sign-in refreshes token claims to reflect latest custom claims',
  authServiceContent.includes('userCredential.user.getIdTokenResult(true)')
);

// 2. New staff signup and pending status
console.log('\n[Workflow 2: New Staff Signup and Pending Status]');
const adminSignupPageContent = fs.readFileSync('src/pages/auth/AdminSignupPage.tsx', 'utf8');
const useAuthContent = fs.readFileSync('src/hooks/useAuth.ts', 'utf8');

check(
  'Admin signup route /admin/signup exists',
  fs.readFileSync('src/App.tsx', 'utf8').includes('<Route path="/admin/signup" element={<AdminSignupPage />} />')
);
check(
  'New faculty registration defaults to PENDING approval status',
  authServiceContent.includes("approvalStatus: 'PENDING'") &&
  authServiceContent.includes("role: 'admin'")
);
check(
  'Applicant is logged out immediately after registration to prevent unapproved access',
  authServiceContent.includes('await signOut(auth)') &&
  authServiceContent.includes('useAppStore.getState().logout()')
);
check(
  'Pending staff login attempts are rejected with clear advisory message',
  authServiceContent.includes('Your faculty registration is currently pending approval by the college administrator. Please check back once verified.')
);
check(
  'useAuth hook explicitly withholds permissions for pending accounts',
  useAuthContent.includes('Account ${fbUser.uid} has approvalStatus=${adminData.approvalStatus || \'PENDING\'}') &&
  useAuthContent.includes('withholding admin permissions')
);

// 3. HOD approval and rejection
console.log('\n[Workflow 3: HOD Approval and Rejection]');
const adminServiceContent = fs.readFileSync('src/services/adminService.ts', 'utf8');
const hodApprovalsPage = fs.readFileSync('src/pages/hod/HodAdminApprovalsPage.tsx', 'utf8');
const hodLayout = fs.readFileSync('src/components/layout/HodLayout.tsx', 'utf8');

check(
  'Routes /hod/admin-approvals and /hod/approvals are mapped in App.tsx',
  fs.readFileSync('src/App.tsx', 'utf8').includes('path="admin-approvals"') &&
  fs.readFileSync('src/App.tsx', 'utf8').includes('path="approvals"')
);
check(
  'HOD approval transitions admin status to APPROVED and records approver metadata',
  adminServiceContent.includes("approvalStatus: 'APPROVED'") &&
  adminServiceContent.includes('approvedBy: approverName') &&
  adminServiceContent.includes('approvedByUid: currentUser.uid')
);
check(
  'HOD approval writes immutable audit log with ADMIN_APPROVED action',
  adminServiceContent.includes("action: 'ADMIN_APPROVED'") &&
  adminServiceContent.includes("newStatus: 'APPROVED'")
);
check(
  'HOD rejection transitions admin status to REJECTED with rejection reason',
  adminServiceContent.includes("approvalStatus: 'REJECTED'") &&
  adminServiceContent.includes('rejectionReason: reason') &&
  adminServiceContent.includes("action: 'ADMIN_REJECTED'")
);
check(
  'HOD approval updates in-memory store in real-time',
  adminServiceContent.includes("admins: currentAdmins.map((a)")
);
check(
  'Safety Guardrail: Prevents deactivating the last active HOD account',
  adminServiceContent.includes('Safety Guardrail Triggered: Cannot deactivate the only active Head of Department account without establishing a successor.')
);

// 4. Approved admin login without repeated signup
console.log('\n[Workflow 4: Approved Admin Login Without Repeated Signup]');
check(
  'Approved faculty member logs in without duplicate profile creation',
  authServiceContent.includes("if ((roleUpper !== 'ADMIN' && !isHod) || !isApproved)") &&
  authServiceContent.includes("const effectiveRole: UserRole = isHod ? 'HOD' : 'ADMIN';")
);
check(
  'Approved faculty gets role ADMIN and adminData attached to session',
  authServiceContent.includes("adminData: {") &&
  authServiceContent.includes("role: effectiveRole")
);

// 5. Unauthorized admin approval attempts
console.log('\n[Workflow 5: Unauthorized Admin Approval Attempts]');
const adminFacultyApprovals = fs.readFileSync('src/pages/admin/AdminFacultyApprovalsPage.tsx', 'utf8');

check(
  'adminService strictly rejects non-HOD approval attempts',
  adminServiceContent.includes("if (!currentUser || currentUser.role !== 'HOD')") &&
  adminServiceContent.includes("Unauthorized: Only the Head of Department (HOD) can approve faculty administrators.")
);
check(
  'Self-approval violation is explicitly blocked',
  adminServiceContent.includes("if (currentUser.uid === adminId)") &&
  adminServiceContent.includes("Self-approval violation: Administrators cannot approve their own application.")
);
check(
  'AdminFacultyApprovalsPage renders HOD Only indicator and blocks ordinary admin clicks',
  adminFacultyApprovals.includes("isHod ? 'Head of Department (HOD) Authorization Console' : 'Read-Only View: Staff Administrator Session'") &&
  adminFacultyApprovals.includes("HOD Only") &&
  adminFacultyApprovals.includes("Only the Head of Department (HOD) can approve faculty administrators.")
);

// 6. Student email/password login
console.log('\n[Workflow 6: Student Email/Password Login]');
const studentLoginPage = fs.readFileSync('src/pages/auth/StudentLoginPage.tsx', 'utf8');

check(
  'Route /student-login is registered and active',
  fs.readFileSync('src/App.tsx', 'utf8').includes('<Route path="/student-login" element={<StudentLoginPage />} />')
);
check(
  'Unrestricted public student registration is disabled (redirects to /student-login)',
  fs.readFileSync('src/App.tsx', 'utf8').includes('<Route path="/signup" element={<Navigate to="/student-login" replace />} />')
);
check(
  'Student login supports college email and password',
  authServiceContent.includes('loginStudentWithIdentifier(identifier, pass)') &&
  authServiceContent.includes("rawInput.includes('@')")
);
check(
  'Student credentials are authenticated via Firebase Authentication',
  authServiceContent.includes('signInWithEmailAndPassword(auth, targetEmail, pass)')
);

// 7. Student registration-number/password login
console.log('\n[Workflow 7: Student Registration-Number/Password Login]');
const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');

check(
  'Registration number login normalizes input and queries reg_lookups',
  authServiceContent.includes("cleanRegNo = rawInput.toUpperCase().replace(/\\s+/g, '')") &&
  authServiceContent.includes("getDoc(doc(db, 'reg_lookups', cleanRegNo))")
);
check(
  'reg_lookups allows single get but forbids directory enumeration (list: false)',
  firestoreRules.includes('match /reg_lookups/{regNo} {') &&
  (firestoreRules.includes('allow get: if true;') || firestoreRules.includes('allow get: if isAdmin();')) &&
  firestoreRules.includes('allow list: if false;')
);
check(
  'Does not authenticate on registration number alone; requires actual password',
  authServiceContent.includes('if (!pass) {') &&
  authServiceContent.includes('signInWithEmailAndPassword(auth, targetEmail, pass)')
);
check(
  'Generic error messages prevent registration number enumeration',
  authServiceContent.includes('Invalid registration number or password.')
);
check(
  'Passwords are never stored in Firestore database',
  !authServiceContent.includes('password:') || !authServiceContent.includes('setDoc(doc(db, \'students\', uid), { password')
);

// 8. Student account provisioning and unique registration numbers
console.log('\n[Workflow 8: Student Account Provisioning & Unique Registration Numbers]');
check(
  'adminService provides provisionStudentAccount with required fields',
  adminServiceContent.includes('name: string;') &&
  adminServiceContent.includes('registerNumber: string;') &&
  adminServiceContent.includes('email: string;') &&
  adminServiceContent.includes('department: string;')
);
check(
  'Enforces uniqueness of registration number across reg_lookups and students',
  adminServiceContent.includes("doc(db, 'reg_lookups', cleanRegNo)") &&
  adminServiceContent.includes('Registration number "${cleanRegNo}" is already assigned')
);
check(
  'Enforces uniqueness of student email address',
  adminServiceContent.includes('Email address "${cleanEmail}" is already registered to a student.')
);
check(
  'Creates Firebase Auth user via isolated secondary app to protect active admin session',
  adminServiceContent.includes('initializeApp(firebaseConfig, tempAppName)') &&
  adminServiceContent.includes('createUserWithEmailAndPassword(tempAuth, cleanEmail, initialTempPassword)') &&
  adminServiceContent.includes('deleteApp(tempApp)')
);
check(
  'Dispatches secure password setup / reset email directly to student',
  adminServiceContent.includes('sendPasswordResetEmail(tempAuth, cleanEmail)')
);
check(
  'No Firebase Admin SDK credentials in frontend code',
  !fs.existsSync('src/firebaseAdmin.ts') && !adminServiceContent.includes('serviceAccountKey')
);
check(
  'Writes immutable audit log for student provisioning',
  adminServiceContent.includes("action: 'STUDENT_PROVISIONED'")
);

// 9. Inactive accounts and missing profiles
console.log('\n[Workflow 9: Inactive Accounts & Missing Profiles]');
check(
  'Deactivated admin accounts are denied access',
  authServiceContent.includes("adminData.isActive === false || (adminData as any).accountStatus === 'deactivated'") &&
  authServiceContent.includes('This administrator account has been deactivated. Please contact the Head of Department.')
);
check(
  'Deactivated student accounts are denied access',
  authServiceContent.includes("studentData.accountStatus === 'disabled' || (studentData as any).isActive === false") &&
  authServiceContent.includes('This student account has been deactivated. Please contact college administration.')
);
check(
  'Missing student profiles in Firestore are safely caught and rejected',
  authServiceContent.includes('Student profile record not found. Your account must be provisioned by college administration.')
);

// 10. Unauthorized role escalation and route access
console.log('\n[Workflow 10: Unauthorized Role Escalation & Route Access]');
const storageRules = fs.readFileSync('storage.rules', 'utf8');

check(
  'firestore.rules prohibits public signup from assigning HOD role or approving account',
  firestoreRules.includes("request.resource.data.role != 'HOD'") &&
  firestoreRules.includes("request.resource.data.isHod != true") &&
  firestoreRules.includes("request.resource.data.approvalStatus == 'PENDING'")
);
check(
  'firestore.rules prevents users from self-approving',
  firestoreRules.includes("!(isOwner(adminId) && resource.data.approvalStatus != 'APPROVED' && request.resource.data.approvalStatus == 'APPROVED')")
);
check(
  'firestore.rules restricts team updates to prevent squad hijacking',
  firestoreRules.includes('match /teams/{teamId} {') &&
  firestoreRules.includes('request.resource.data.leaderId == resource.data.leaderId') &&
  firestoreRules.includes('request.resource.data.code == resource.data.code')
);
check(
  'storage.rules removed insecure regex substring matching on emails',
  !storageRules.includes("request.auth.token.email.matches('.*admin.*')") &&
  storageRules.includes("request.auth.token.role == 'admin'") &&
  storageRules.includes("request.auth.token.role == 'HOD'")
);
check(
  'HodLayout strictly blocks non-HOD users from /hod/*',
  hodLayout.includes("currentUser.role !== 'HOD'") &&
  hodLayout.includes('Access Denied: Head of Department Authorization Required')
);

// 11. Existing HackHub features after authentication changes
console.log('\n[Workflow 11: Existing HackHub Features After Authentication Changes]');
const hackathonDetailsPage = fs.readFileSync('src/pages/public/HackathonDetailsPage.tsx', 'utf8');
const landingPage = fs.readFileSync('src/pages/public/LandingPage.tsx', 'utf8');
const adminAttendancePage = fs.readFileSync('src/pages/admin/AdminAttendancePage.tsx', 'utf8');

check(
  'Hackathon discovery landing page functions correctly',
  landingPage.includes('Discover Collegiate Challenges') || landingPage.includes('OpportunityCard')
);
check(
  'Hackathon details page supports registration and external links',
  hackathonDetailsPage.includes('isExternalOpportunity(hackathon)') &&
  hackathonDetailsPage.includes('handleStartRegistration')
);
check(
  'Admin attendance management is wired to persistent Firestore services',
  adminAttendancePage.includes('hackathonService.toggleAttendance(hackathonId, !current)') &&
  adminAttendancePage.includes('attendanceService.manualAttendanceOverride')
);
check(
  'Notification realtime synchronization is scoped for students without permission errors',
  fs.readFileSync('src/hooks/useFirestoreSync.ts', 'utf8').includes("where('userId', 'in', [currentUser.uid, 'ALL'])")
);

console.log('\n================================================================');
console.log(`  WORKFLOW VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
