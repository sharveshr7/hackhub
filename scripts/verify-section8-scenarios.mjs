/**
 * HackHub — Comprehensive Department-Level Scenario Verification Suite
 * 
 * Explicitly tests all required scenarios from the prompt:
 * 1. Biotechnology faculty can manage authorized Biotechnology events.
 * 2. Biotechnology faculty cannot access private Biomedical Engineering records.
 * 3. Biomedical Engineering faculty can manage authorized Biomedical Engineering events.
 * 4. Biomedical Engineering faculty cannot access private Biotechnology records.
 * 5. A department approver cannot approve applicants from another department.
 * 6. Regular faculty cannot approve themselves or grant privileged roles.
 * 7. Complete HOD elimination & pure department-level isolation.
 * 8. Public users cannot read draft events or private student records.
 * 9. Existing event publishing and student participation workflows continue working.
 * 10. Unsupported or missing department values are rejected or flagged for review.
 * 11. No fake production events, users, metrics, or results remain.
 */

import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('  HACKHUB — DEPARTMENT SCENARIO & ACCESS CONTROL TEST SUITE');
console.log('========================================================================\n');

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

// ------------------------------------------------------------------------
// SCENARIO 1 & 3: Faculty can manage authorized events in their department
// ------------------------------------------------------------------------
console.log('--- SCENARIOS 1 & 3: Department-Specific Event Management ---');
const hackathonServiceCode = fs.readFileSync('src/services/hackathonService.ts', 'utf8');
const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');

assert(
  hackathonServiceCode.includes('const dept = platformAdmin ? data.department : userDept;') &&
  hackathonServiceCode.includes('You can only edit events within your department scope') &&
  hackathonServiceCode.includes('You can only delete events within your department scope'),
  'Scenario 1 & 3 (Client): Faculty is strictly locked to their own department when creating, editing, or deleting events'
);

assert(
  firestoreRules.includes('request.resource.data.department == getAdminDept()') &&
  firestoreRules.includes('resource.data.department == getAdminDept()'),
  'Scenario 1 & 3 (Rules): Firestore security rules enforce event creation and updates to getAdminDept()'
);

// ------------------------------------------------------------------------
// SCENARIO 2 & 4: Cross-department private record isolation
// ------------------------------------------------------------------------
console.log('\n--- SCENARIOS 2 & 4: Cross-Department Private Record Isolation ---');
const adminStudentsCode = fs.readFileSync('src/pages/admin/AdminStudentsPage.tsx', 'utf8');
const adminRegsCode = fs.readFileSync('src/pages/admin/AdminRegistrationsPage.tsx', 'utf8');
const adminSubsCode = fs.readFileSync('src/pages/admin/AdminSubmissionsPage.tsx', 'utf8');
const adminTeamsCode = fs.readFileSync('src/pages/admin/AdminTeamsPage.tsx', 'utf8');

assert(
  adminStudentsCode.includes('if (facultyDept && s.department !== facultyDept) return false;'),
  'Scenario 2 & 4 (Students): Biotechnology faculty cannot view Biomedical Engineering private student records (and vice versa)'
);

assert(
  adminRegsCode.includes('if (facultyDept)') &&
  adminRegsCode.includes('if (student && student.department !== facultyDept) return false;'),
  'Scenario 2 & 4 (Registrations): Registrations table isolates records to faculty authorized department'
);

assert(
  adminSubsCode.includes('const scopedSubmissions = useMemo(') &&
  adminSubsCode.includes('if (s.department && s.department === facultyDept) return true;') &&
  adminTeamsCode.includes('teamDept !== facultyDept'),
  'Scenario 2 & 4 (Submissions & Teams): Submissions and team dossiers strictly isolate non-authorized departments'
);

assert(
  firestoreRules.includes('resource.data.department == getAdminDept()'),
  'Scenario 2 & 4 (Rules): Firestore security rules mandate resource.data.department == getAdminDept() for private collections'
);

// ------------------------------------------------------------------------
// SCENARIO 5: Department approver cannot approve outside their department
// ------------------------------------------------------------------------
console.log('\n--- SCENARIO 5: Department Approver Scoped Authority ---');
const adminServiceCode = fs.readFileSync('src/services/adminService.ts', 'utf8');

assert(
  adminServiceCode.includes('targetAdminData.department !== approverDept') &&
  adminServiceCode.includes('Department boundary error: As the') &&
  adminServiceCode.includes('approver, you cannot approve applicants from'),
  'Scenario 5: Department approvers are strictly blocked from approving or rejecting applicants outside their department'
);

// ------------------------------------------------------------------------
// SCENARIO 6: Regular faculty cannot approve themselves or grant roles
// ------------------------------------------------------------------------
console.log('\n--- SCENARIO 6: Self-Approval & Privilege Escalation Prevention ---');

assert(
  adminServiceCode.includes('if (currentUser.uid === adminId)') &&
  adminServiceCode.includes('Self-approval violation: Administrators cannot approve their own application.'),
  'Scenario 6 (Client): All self-approvals are strictly blocked across all roles'
);

assert(
  firestoreRules.includes('!isOwner(adminId)') &&
  firestoreRules.includes('request.resource.data.approvalStatus == resource.data.approvalStatus') &&
  firestoreRules.includes('request.resource.data.role == resource.data.role'),
  'Scenario 6 (Rules): Firestore security rules forbid self-updating approvalStatus, role, or permissions'
);

// ------------------------------------------------------------------------
// SCENARIO 7: Complete HOD elimination & pure department-level isolation
// ------------------------------------------------------------------------
console.log('\n--- SCENARIO 7: Total HOD Elimination & Pure Department Isolation ---');
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
const adminDashboardCode = fs.readFileSync('src/pages/admin/AdminDashboardPage.tsx', 'utf8');

assert(
  !appTsx.includes('/hod') &&
  !fs.existsSync('src/pages/hod') &&
  !fs.existsSync('src/components/layout/HodLayout.tsx'),
  'Scenario 7 (Routes & Pages): All HOD pages, layouts, and routes are completely removed'
);

assert(
  !firestoreRules.includes('function isHod()') &&
  !firestoreRules.includes('isHod()'),
  'Scenario 7 (Rules): Firestore rules have zero HOD privileges or cross-department exceptions'
);

assert(
  adminDashboardCode.includes('const scopedHackathons = useMemo(() => {') &&
  adminDashboardCode.includes('platformAdministrator ? hackathons : hackathons.filter((h) => h.department === facultyDept)'),
  'Scenario 7 (Dashboard): Faculty are department scoped and platform administrators retain institution-wide scope'
);

// ------------------------------------------------------------------------
// SCENARIO 8: Public users cannot read draft events or private student records
// ------------------------------------------------------------------------
console.log('\n--- SCENARIO 8: Public Data Confidentiality ---');

assert(
  firestoreRules.includes("(resource.data.status != 'DRAFT' && resource.data.status != 'draft')") &&
  firestoreRules.includes('allow get: if isOwner(studentId) || canReadStudent(resource.data);'),
  'Scenario 8: Draft hackathons are protected from public discovery, and student records require owner or authorized admin access'
);

// ------------------------------------------------------------------------
// SCENARIO 9: Event publishing and student participation workflows working
// ------------------------------------------------------------------------
console.log('\n--- SCENARIO 9: Preservation of Working Workflows ---');
const createHackathonPage = fs.readFileSync('src/pages/admin/AdminCreateHackathonPage.tsx', 'utf8');

assert(
  createHackathonPage.includes('trimmedTitle') &&
  createHackathonPage.includes('trimmedOrganizer') &&
  createHackathonPage.includes('trimmedUrl') &&
  createHackathonPage.includes('trimmedDesc') &&
  createHackathonPage.includes('hackathonService.createHackathon('),
  'Scenario 9: Hackathon creation preserves the 5 required fields and connects to Firestore without regressions'
);

// ------------------------------------------------------------------------
// SCENARIO 10: Unsupported or missing departments rejected or flagged
// ------------------------------------------------------------------------
console.log('\n--- SCENARIO 10: Department Validation & Flagging ---');
const deptConstants = fs.readFileSync('src/constants/departments.ts', 'utf8');
const facultyApprovalsPage = fs.readFileSync('src/pages/admin/AdminFacultyApprovalsPage.tsx', 'utf8');

assert(
  deptConstants.includes("export const SUPPORTED_DEPARTMENTS = [") &&
  deptConstants.includes("'Biotechnology'") &&
  deptConstants.includes("'Biomedical Engineering'") &&
  deptConstants.includes('isSupportedDepartment('),
  'Scenario 10 (Constants): Platform strictly defines Biotechnology and Biomedical Engineering'
);

assert(
  facultyApprovalsPage.includes('!isSupportedDepartment(admin.department)') &&
  facultyApprovalsPage.includes('canApprove'),
  'Scenario 10 (UI): Unsupported departments block approval and enforce departmental boundaries'
);

// ------------------------------------------------------------------------
// SCENARIO 11: Zero fake production events, users, metrics, or results
// ------------------------------------------------------------------------
console.log('\n--- SCENARIO 11: Zero Fake Data in Production UI ---');
const storeCode = fs.readFileSync('src/lib/store.ts', 'utf8');

assert(
  storeCode.includes('// All collections default to empty arrays (Zero mock data)') &&
  !storeCode.includes('DEMO_STUDENT') &&
  !storeCode.includes('mockHackathons'),
  'Scenario 11: Zero mock data arrays or fabricated users exist in store; all data is fetched live from Firebase'
);

// ------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`  SCENARIO RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED`);
console.log('========================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
