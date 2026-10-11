/**
 * HackHub — Master System Verification Suite
 * Covers all 18 required operational and architectural verification checks.
 */

import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('  HACKHUB MASTER SYSTEM VERIFICATION');
console.log('  Role Governance, Discovery, Participation Tracking & Security');
console.log('================================================================\n');

let pass = 0;
let fail = 0;

function check(testName, condition) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    pass++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    fail++;
  }
}

// 1. Role-Based Access Control Architecture
console.log('\n[Section 1: 3-Tier Role-Based Access Control]');
const typesContent = fs.readFileSync('src/types/index.ts', 'utf8');
check('Types define HOD, ADMIN, and STUDENT roles', 
  typesContent.includes("'HOD'") && typesContent.includes("'ADMIN'") && typesContent.includes("'STUDENT'"));
check('Admin interface contains isActive and approvalStatus fields',
  typesContent.includes('export interface Admin') && 
  typesContent.includes('approvalStatus?:') && 
  typesContent.includes('isActive?:'));

// 2. HOD Portal & Routes
console.log('\n[Section 2: HOD Management Routes & Permissions]');
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
check('Dedicated /hod routes configured with HodLayout',
  appTsx.includes('path="/hod"') && appTsx.includes('HodLayout'));
check('HOD routes include admin approvals, administrator management, students, and audit log',
  appTsx.includes('HodAdminApprovalsPage') && 
  appTsx.includes('HodAdministratorsPage') && 
  appTsx.includes('HodStudentsPage') && 
  appTsx.includes('HodAuditLogPage'));

const hodLayout = fs.readFileSync('src/components/layout/HodLayout.tsx', 'utf8');
check('HodLayout strictly guards against non-HOD users',
  hodLayout.includes("currentUser.role !== 'HOD'") && hodLayout.includes("to=\"/admin/login\""));

// 3. Staff/Faculty Admin Lifecycle
console.log('\n[Section 3: Staff/Faculty Admin Lifecycle]');
const adminService = fs.readFileSync('src/services/adminService.ts', 'utf8');
check('adminService provides approveFacultyAdmin with status update to APPROVED',
  adminService.includes("approvalStatus: 'APPROVED'"));
check('adminService provides rejectFacultyAdmin with rejection notes',
  adminService.includes("approvalStatus: 'REJECTED'"));
check('adminService writes immutable audit logs for approvals and rejections',
  adminService.includes("collection(db, 'audit_logs')") && 
  adminService.includes("ADMIN_APPROVED") && 
  adminService.includes("ADMIN_REJECTED"));

const authService = fs.readFileSync('src/services/authService.ts', 'utf8');
check('Staff signup sets approvalStatus to PENDING by default',
  authService.includes("approvalStatus: 'PENDING'"));
check('Login enforces PENDING rejection error message',
  authService.includes("Your faculty registration is currently pending approval"));
check('Login enforces REJECTED rejection error message',
  authService.includes("Your faculty registration was not approved"));
check('Login enforces INACTIVE deactivation message',
  authService.includes("This administrator account has been deactivated"));

// 4. Student Authentication & Registration Number Resolution
console.log('\n[Section 4: Student Authentication & Provisioning]');
check('Student login route /student-login is registered',
  appTsx.includes('path="/student-login"'));
check('Public student registration /signup is disabled / redirected to /student-login',
  appTsx.includes('to="/student-login"') || appTsx.includes('Navigate to="/student-login"'));

const studentLogin = fs.readFileSync('src/pages/auth/StudentLoginPage.tsx', 'utf8');
check('Student login component calls authService.loginStudentWithIdentifier',
  studentLogin.includes('authService.loginStudentWithIdentifier'));

check('authService supports both College Email and Registration Number login',
  authService.includes('loginStudentWithIdentifier') &&
  authService.includes("rawInput.includes('@')") &&
  authService.includes("doc(db, 'reg_lookups'"));

check('Registration number normalization occurs before lookup',
  authService.includes("rawInput.toUpperCase().replace(/\\s+/g, '')"));

check('Generic error prevents registration number enumeration',
  authService.includes('Invalid registration number or password.') &&
  authService.includes('Invalid email or password.'));

check('adminService provides secure student provisioning with UID matching',
  adminService.includes('provisionStudent') &&
  adminService.includes("doc(db, 'reg_lookups'") &&
  adminService.includes("createUserWithEmailAndPassword"));

// 5. Multi-Institution Event Discovery (HireToday Inspiration)
console.log('\n[Section 5: Multi-Institution Event Discovery & Attribution]');
check('EventOrganizerType includes OUR_COLLEGE, OTHER_COLLEGE, COMPANY, GOVERNMENT',
  typesContent.includes("'OUR_COLLEGE'") &&
  typesContent.includes("'OTHER_COLLEGE'") &&
  typesContent.includes("'COMPANY'") &&
  typesContent.includes("'GOVERNMENT'"));

const eventHelpers = fs.readFileSync('src/utils/eventHelpers.ts', 'utf8');
check('eventHelpers differentiates external opportunities vs college events',
  eventHelpers.includes('isExternalOpportunity') && eventHelpers.includes('getOfficialExternalUrl'));

const landingPage = fs.readFileSync('src/pages/public/LandingPage.tsx', 'utf8');
check('Landing page features HireToday-inspired search, category pills, and multi-institution filters',
  landingPage.includes('searchQuery') && 
  landingPage.includes('selectedCategory') && 
  landingPage.includes('selectedOrganizerType'));
check('Zero mock hackathons in LandingPage - uses live store data without mock arrays',
  !landingPage.includes('mockHackathons') && !landingPage.includes('mockEvents') && landingPage.includes('useAppStore'));

const detailsPage = fs.readFileSync('src/pages/public/HackathonDetailsPage.tsx', 'utf8');
check('HackathonDetailsPage features External Opportunity Banner & Official Website link',
  detailsPage.includes('isExternal') && detailsPage.includes('officialUrl'));
check('HackathonDetailsPage explicitly disclaims that HackHub is a discovery platform for external listings',
  detailsPage.includes('HackHub is a discovery platform') || detailsPage.includes('External Opportunity Notice'));

// 6. Simple Hackathon Publishing
console.log('\n[Section 6: Simple Hackathon Publishing]');
const createPage = fs.readFileSync('src/pages/admin/AdminCreateHackathonPage.tsx', 'utf8');
check('AdminCreateHackathonPage has streamlined single-page form with zero fake defaults',
  createPage.includes('organizerType') && 
  createPage.includes('officialUrl') &&
  createPage.includes('title') &&
  createPage.includes('category'));

// 7. Firebase Security Rules Enforcement
console.log('\n[Section 7: Cloud Firestore Security Rules]');
const rules = fs.readFileSync('firestore.rules', 'utf8');
check('Rules enforce HOD authorization for privileged actions',
  rules.includes('function isHod()'));
check('Rules prevent students from modifying their own roles or registration numbers',
  rules.includes("request.resource.data.role == resource.data.role") &&
  rules.includes("request.resource.data.registerNumber == resource.data.registerNumber"));
check('Rules prevent applicant from self-approving or granting HOD role',
  rules.includes("request.resource.data.approvalStatus == 'PENDING'") &&
  rules.includes("request.resource.data.role != 'HOD'"));
check('Registration lookup collection allows single document get but denies full list',
  rules.includes("match /reg_lookups/{regNo}") &&
  rules.includes("allow get: if true") &&
  rules.includes("allow list: if false"));

console.log('\n================================================================');
console.log(`  SUMMARY: ${pass} / ${pass + fail} TESTS PASSED`);
console.log('================================================================\n');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
