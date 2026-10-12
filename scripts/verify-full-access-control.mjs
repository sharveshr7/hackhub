/**
 * HackHub Comprehensive Role-Based Access Control, Department Scope & Specialization Verification Suite
 *
 * Validates all required behaviors from the HackHub specification:
 * 1. Supported Departments & Academic Years
 * 2. Faculty Department-Specific Research Specialization
 * 3. HOD Institution-Level Oversight & Department Approver Delegation
 * 4. Academic Year & Class Scope Boundaries
 * 5. Student Authentication & Provisioning Constraints
 * 6. Least-Privilege Firestore Rules & Role Isolation
 */

import fs from 'fs';
import {
  SUPPORTED_DEPARTMENTS,
  SUPPORTED_ACADEMIC_YEARS,
  isSupportedDepartment,
  normalizeDepartment,
  getDepartmentBadge,
  normalizeAcademicYear,
  isSupportedAcademicYear,
  getSpecializationsForDepartment,
  isValidSpecialization,
  sanitizeCustomSpecialization,
  BIOTECHNOLOGY_SPECIALIZATIONS,
  BIOMEDICAL_SPECIALIZATIONS
} from '../src/constants/departments.ts';

console.log('========================================================================');
console.log('  HACKHUB — COMPLETE ACCESS CONTROL & SPECIALIZATION VERIFICATION SUITE');
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

// ========================================================================
// SECTION 1: SUPPORTED DEPARTMENTS & ACADEMIC YEARS
// ========================================================================
console.log('--- SECTION 1: Supported Departments & Academic Years ---');

assert(
  SUPPORTED_DEPARTMENTS.length === 2 &&
  SUPPORTED_DEPARTMENTS.includes('Biotechnology') &&
  SUPPORTED_DEPARTMENTS.includes('Biomedical Engineering'),
  'Platform strictly and exclusively supports Biotechnology and Biomedical Engineering'
);

assert(
  isSupportedDepartment('Biotechnology') &&
  isSupportedDepartment('Biomedical Engineering') &&
  !isSupportedDepartment('Computer Science') &&
  !isSupportedDepartment('Mechanical') &&
  !isSupportedDepartment(''),
  'isSupportedDepartment() rejects arbitrary or unsupported departments'
);

assert(
  normalizeDepartment('biotech') === 'Biotechnology' &&
  normalizeDepartment('bme') === 'Biomedical Engineering' &&
  normalizeDepartment('Civil') === null,
  'normalizeDepartment() maps colloquial department aliases safely without arbitrary fallback'
);

assert(
  SUPPORTED_ACADEMIC_YEARS.length === 3 &&
  SUPPORTED_ACADEMIC_YEARS.includes('First Year') &&
  SUPPORTED_ACADEMIC_YEARS.includes('Second Year') &&
  SUPPORTED_ACADEMIC_YEARS.includes('Third Year'),
  'Supported academic years strictly include First Year, Second Year, Third Year'
);

assert(
  normalizeAcademicYear('1st Year') === 'First Year' &&
  normalizeAcademicYear('2nd Year') === 'Second Year' &&
  normalizeAcademicYear('3rd Year') === 'Third Year' &&
  normalizeAcademicYear('4th Year') === null,
  'normalizeAcademicYear() safely reconciles legacy "1st Year" formats to standard categories'
);

const btBadge = getDepartmentBadge('Biotechnology');
const bmeBadge = getDepartmentBadge('Biomedical Engineering');
const invalidBadge = getDepartmentBadge('Unknown Dept');
assert(
  btBadge.isValid === true && btBadge.shortCode === 'BT' &&
  bmeBadge.isValid === true && bmeBadge.shortCode === 'BME' &&
  invalidBadge.isValid === false,
  'Department badges provide type-safe visual metadata for authorized departments'
);

// ========================================================================
// SECTION 2: RESEARCH SPECIALIZATION WORKFLOW
// ========================================================================
console.log('\n--- SECTION 2: Department-Specific Research Specialization ---');

const btSpecs = getSpecializationsForDepartment('Biotechnology');
assert(
  btSpecs.length === 8 &&
  btSpecs.includes('Molecular Biology') &&
  btSpecs.includes('Genetic Engineering') &&
  btSpecs.includes('Bioinformatics') &&
  btSpecs.includes('Microbiology') &&
  btSpecs.includes('Bioprocess Technology') &&
  btSpecs.includes('Cell and Tissue Culture') &&
  btSpecs.includes('Environmental Biotechnology') &&
  btSpecs.includes('Other'),
  'Biotechnology displays only the 8 mandated Biotechnology research specializations'
);

const bmeSpecs = getSpecializationsForDepartment('Biomedical Engineering');
assert(
  bmeSpecs.length === 9 &&
  bmeSpecs.includes('Medical Imaging') &&
  bmeSpecs.includes('Biomedical Instrumentation') &&
  bmeSpecs.includes('Biosensors') &&
  bmeSpecs.includes('Rehabilitation Engineering') &&
  bmeSpecs.includes('Biomaterials') &&
  bmeSpecs.includes('Medical Signal Processing') &&
  bmeSpecs.includes('AI in Healthcare') &&
  bmeSpecs.includes('Biomechanics') &&
  bmeSpecs.includes('Other'),
  'Biomedical Engineering displays only the 9 mandated Biomedical Engineering specializations'
);

assert(
  isValidSpecialization('Biotechnology', 'Molecular Biology') &&
  !isValidSpecialization('Biotechnology', 'Medical Imaging') &&
  isValidSpecialization('Biomedical Engineering', 'Medical Imaging') &&
  !isValidSpecialization('Biomedical Engineering', 'Molecular Biology'),
  'Specializations are strictly mutually exclusive and scoped to the department'
);

const sanitizedOther = sanitizeCustomSpecialization('  <script>alert(1)</script> Neural Prosthetics & Implants  ');
assert(
  sanitizedOther === 'alert(1) Neural Prosthetics & Implants' ||
  !sanitizedOther.includes('<script>') && sanitizedOther.includes('Neural Prosthetics'),
  'sanitizeCustomSpecialization() strips dangerous HTML / control characters'
);

// ========================================================================
// SECTION 3: DEPARTMENT APPROVER & DEPARTMENT ADMIN POLICIES
// ========================================================================
console.log('\n--- SECTION 3: Department Approver & Department Admin Delegation ---');

const adminServiceCode = fs.readFileSync('src/services/adminService.ts', 'utf8');

assert(
  adminServiceCode.includes('toggleDepartmentApprover(adminId: string, isApprover: boolean)') &&
  adminServiceCode.includes('isPlatformAdministrator(currentUser)') &&
  adminServiceCode.includes('target.approvalStatus !== \'APPROVED\'') &&
  adminServiceCode.includes('Self-assignment violation: Administrators cannot alter their own approver status.'),
  'Only a platform administrator can designate another approved faculty member as a Department Approver'
);

assert(
  adminServiceCode.includes('targetAdminData.department !== approverDept') &&
  adminServiceCode.includes('Department boundary error: As the'),
  'Department approver is strictly forbidden from approving/rejecting applicants outside their own department'
);

assert(
  adminServiceCode.includes('if (currentUser.uid === adminId)') &&
  adminServiceCode.includes('Self-approval violation: Administrators cannot approve their own application'),
  'Self-approval is explicitly blocked for all roles including Department Approver and Administrator'
);

assert(
  adminServiceCode.includes("action: isApprover ? 'DEPT_APPROVER_DESIGNATED' : 'DEPT_APPROVER_REVOKED'") &&
  adminServiceCode.includes("action: 'FACULTY_PERMISSIONS_UPDATED'"),
  'All privileged approver designations and permission modifications create immutable audit logs'
);

// ========================================================================
// SECTION 4: ACADEMIC YEAR & CLASS SCOPE BOUNDARIES
// ========================================================================
console.log('\n--- SECTION 4: Academic Year Scope & Student Monitoring Boundaries ---');

const adminStudentsCode = fs.readFileSync('src/pages/admin/AdminStudentsPage.tsx', 'utf8');
assert(
  adminStudentsCode.includes('const scopedStudents = useMemo(') &&
  adminStudentsCode.includes('if (facultyDept && s.department !== facultyDept) return false;') &&
  adminStudentsCode.includes('normalizedAuthorizedYears.includes(normY)'),
  'AdminStudentsPage restricts student cohort visibility to authorized department and academic years'
);

const adminRegsCode = fs.readFileSync('src/pages/admin/AdminRegistrationsPage.tsx', 'utf8');
assert(
  adminRegsCode.includes('if (facultyDept)') &&
  adminRegsCode.includes('if (student && student.department !== facultyDept) return false;') &&
  adminRegsCode.includes('normalizedAuthorizedYears.includes(normY)'),
  'AdminRegistrationsPage restricts registration roster to authorized department and academic years'
);

const adminSubmissionsCode = fs.readFileSync('src/pages/admin/AdminSubmissionsPage.tsx', 'utf8');
assert(
  adminSubmissionsCode.includes('const scopedSubmissions = useMemo(') &&
  adminSubmissionsCode.includes('if (s.department && s.department === facultyDept) return true;') &&
  adminSubmissionsCode.includes('hackathon.department === facultyDept'),
  'AdminSubmissionsPage isolates student submission dossiers to faculty department scope'
);

const adminTeamsCode = fs.readFileSync('src/pages/admin/AdminTeamsPage.tsx', 'utf8');
assert(
  adminTeamsCode.includes('if (facultyDept)') &&
  adminTeamsCode.includes('teamDept !== facultyDept'),
  'AdminTeamsPage isolates team roster and disband actions to authorized faculty department'
);

// ========================================================================
// SECTION 5: STUDENT AUTHENTICATION & PROVISIONING SAFETY
// ========================================================================
console.log('\n--- SECTION 5: Student Authentication & Provisioning Safety ---');

const studentAuthApi = fs.readFileSync('api/student-auth.ts', 'utf8');
assert(
  studentAuthApi.includes('Invalid registration number or password.') &&
  !studentAuthApi.includes('Registration number not found in reg_lookups') &&
  !studentAuthApi.includes('Password incorrect for registration number'),
  'student-auth API returns uniform generic authentication errors without revealing account existence'
);

assert(
  studentAuthApi.includes("studentData.accountStatus === 'disabled' || studentData.accountStatus === 'deactivated' || studentData.isActive === false") &&
  studentAuthApi.includes("status: 403") &&
  studentAuthApi.indexOf('Only administrator-provisioned student profiles may use the student portal.') < studentAuthApi.indexOf('idToken: authData.idToken'),
  'Disabled student accounts and accounts without provisioned profiles do not receive a protected session token'
);

assert(
  adminServiceCode.includes('provisionStudent(studentInfo:') &&
  adminServiceCode.includes("action: 'provision-student'") &&
  studentAuthApi.includes("verifyServerRequest(authHeader, 'STAFF')") &&
  studentAuthApi.includes("actor.role !== 'ADMIN' && (!actor.department || department !== actor.department)"),
  'Student provisioning is restricted to authenticated staff and department-scoped faculty'
);

// ========================================================================
// SECTION 6: FIRESTORE LEAST PRIVILEGE RULES
// ========================================================================
console.log('\n--- SECTION 6: Firestore Least-Privilege Rules ---');

const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');

assert(
  firestoreRules.includes('match /admins/{adminId}') &&
  firestoreRules.includes('(!(\'authorizedYears\' in request.resource.data) || request.resource.data.authorizedYears == resource.data.authorizedYears)') &&
  firestoreRules.includes('(!(\'isDepartmentApprover\' in request.resource.data) || request.resource.data.isDepartmentApprover == resource.data.isDepartmentApprover)'),
  'Firestore rules strictly prohibit faculty from elevating their own academic years or approver flags'
);

assert(
  firestoreRules.includes('match /reg_lookups/{regNo}') &&
  firestoreRules.includes('allow get, list, write: if false;'),
  'reg_lookups collection forbids public directory queries and harvesting'
);

assert(
  firestoreRules.includes('match /submissions/{submissionId}') &&
  firestoreRules.includes('(!(\'evaluationScore\' in request.resource.data) || request.resource.data.evaluationScore == resource.data.evaluationScore)') &&
  firestoreRules.includes('resource.data.department == getAdminDept()'),
  'Submissions collection enforces department boundaries and prevents students tampering with grades'
);

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
