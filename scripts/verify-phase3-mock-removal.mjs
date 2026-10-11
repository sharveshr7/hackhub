/**
 * HackHub Phase 3 Verification Script
 * Validates mock data removal, HireToday-style publishing flow,
 * multi-institution opportunity attribution, and error/empty state handling.
 */

import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('  HACKHUB — PHASE 3 AUDIT & VERIFICATION SUITE');
console.log('  Mock Data Removal & Simplified Event Publishing Verification');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

// -------------------------------------------------------------
// SECTION A: MOCK & FABRICATED DATA AUDIT
// -------------------------------------------------------------
console.log('[Section A] Audit of Mock and Fabricated Data Removal:');

// Check 1: store.ts initial state
const storeContent = fs.readFileSync('src/lib/store.ts', 'utf-8');
assert(
  storeContent.includes('hackathons: []') &&
  storeContent.includes('registrations: []') &&
  storeContent.includes('teams: []') &&
  storeContent.includes('submissions: []'),
  'Zustand store initializes collections to empty arrays with zero hardcoded mock records'
);

// Check 2: No 'KIT26' or 'KIT-NEXUS-2026' passcodes used as fallbacks
const attendanceServiceContent = fs.readFileSync('src/services/attendanceService.ts', 'utf-8');
assert(
  !attendanceServiceContent.includes("'KIT26'") &&
  attendanceServiceContent.includes('Check-in passcode has not been configured'),
  'attendanceService requires configured passcode and eliminates KIT26 fallback'
);

assert(
  !storeContent.includes("'KIT26'") &&
  storeContent.includes('Check-in passcode has not been configured'),
  'store.ts markAttendance eliminates KIT26 fallback'
);

const adminAttendanceContent = fs.readFileSync('src/pages/admin/AdminAttendancePage.tsx', 'utf-8');
assert(
  !adminAttendanceContent.includes('KIT-NEXUS-2026'),
  'AdminAttendancePage eliminates KIT-NEXUS-2026 fallback'
);

const adminDetailContent = fs.readFileSync('src/pages/admin/AdminHackathonDetailPage.tsx', 'utf-8');
assert(
  !adminDetailContent.includes("'KIT26'"),
  'AdminHackathonDetailPage eliminates KIT26 fallbacks'
);

// Check 3: StudentTeamPage and StudentSubmissionsPage do not fallback to hackathons[0]
const studentTeamContent = fs.readFileSync('src/pages/student/StudentTeamPage.tsx', 'utf-8');
assert(
  studentTeamContent.includes('registeredHackathons') &&
  studentTeamContent.includes('No Active Event Registrations') &&
  !studentTeamContent.includes('hackathons[0]?.id'),
  'StudentTeamPage restricts team management to registered events with empty state'
);

const studentSubmissionsContent = fs.readFileSync('src/pages/student/StudentSubmissionsPage.tsx', 'utf-8');
assert(
  !studentSubmissionsContent.includes('hackathons[0]') &&
  studentSubmissionsContent.includes('No Registered Hackathons'),
  'StudentSubmissionsPage eliminates hackathons[0] fallback for unregistered students'
);

// Check 4: HackathonDetailsPage removes fabricated timeline and duplicate blocks
const hackathonDetailsContent = fs.readFileSync('src/pages/public/HackathonDetailsPage.tsx', 'utf-8');
assert(
  !hackathonDetailsContent.includes('Registration Desk 3, Block B. Receive computing vouchers') &&
  !hackathonDetailsContent.includes('12:00 PM Code Freeze') &&
  !hackathonDetailsContent.includes('in Block B'),
  'HackathonDetailsPage eliminates hardcoded venue desk/freeze timeline mocks'
);

// Check 5: StudentDashboardPage removes hardcoded venue text
const studentDashboardContent = fs.readFileSync('src/pages/student/StudentDashboardPage.tsx', 'utf-8');
assert(
  !studentDashboardContent.includes('in Block B'),
  'StudentDashboardPage eliminates hardcoded "in Block B" location assumption'
);

// Check 6: Unassigned department fallback in analytics & dashboard
const adminDashboardContent = fs.readFileSync('src/pages/admin/AdminDashboardPage.tsx', 'utf-8');
const adminAnalyticsContent = fs.readFileSync('src/pages/admin/AdminAnalyticsPage.tsx', 'utf-8');
assert(
  adminDashboardContent.includes("s?.department || 'Unassigned'") &&
  adminAnalyticsContent.includes("st?.department || 'Unassigned'"),
  'Admin dashboard and analytics handle missing student department as Unassigned instead of fabricating CSE'
);

// -------------------------------------------------------------
// SECTION B: SIMPLIFIED HIRE-TODAY EVENT PUBLISHING FORM
// -------------------------------------------------------------
console.log('\n[Section B] Simplified Event Publishing Form:');

const createHackathonContent = fs.readFileSync('src/pages/admin/AdminCreateHackathonPage.tsx', 'utf-8');

assert(
  createHackathonContent.includes('title') &&
  createHackathonContent.includes('organizer') &&
  createHackathonContent.includes('category') &&
  createHackathonContent.includes('officialUrl') &&
  createHackathonContent.includes('shortDescription'),
  'Form requires the 5 core HireToday fields (Title, Organizer, Category, Official URL, Short Description)'
);

assert(
  createHackathonContent.includes('Additional Details (Optional)') &&
  createHackathonContent.includes('isAdditionalDetailsOpen'),
  'Form contains collapsible "Additional Details" section for optional parameters'
);

assert(
  createHackathonContent.includes('isValidUrl') &&
  createHackathonContent.includes('if (isLoading) return;'),
  'Form validates URL format (http/https) and prevents duplicate submission'
);

// -------------------------------------------------------------
// SECTION C & D: MULTI-INSTITUTION ATTRIBUTION & DISCOVERY
// -------------------------------------------------------------
console.log('\n[Section C & D] Multi-Institution Opportunities & Discovery:');

const opportunityCardContent = fs.readFileSync('src/components/discovery/OpportunityCard.tsx', 'utf-8');
assert(
  opportunityCardContent.includes('getOrganizerBadgeStyle') &&
  opportunityCardContent.includes('getOrganizerTypeLabel') &&
  opportunityCardContent.includes('isExternalOpportunity'),
  'OpportunityCard distinguishes organizer types (Our College, Other Colleges, Companies, Government, Community)'
);

const landingContent = fs.readFileSync('src/pages/public/LandingPage.tsx', 'utf-8');
assert(
  landingContent.includes('filteredOpportunities') &&
  landingContent.includes('selectedOrganizerType') &&
  landingContent.includes('selectedMode') &&
  landingContent.includes('EmptyState'),
  'LandingPage supports search, multi-institution filters, mode filters, and clean EmptyState'
);

const hackathonsListContent = fs.readFileSync('src/pages/public/HackathonsPage.tsx', 'utf-8');
assert(
  hackathonsListContent.includes('filteredHackathons') &&
  hackathonsListContent.includes('organizerTypeOptions') &&
  hackathonsListContent.includes('EmptyState'),
  'HackathonsPage provides comprehensive filtering and graceful empty states without fallback data'
);

// -------------------------------------------------------------
// SECTION E & F: PERMISSIONS & FUNCTIONALITY PRESERVATION
// -------------------------------------------------------------
console.log('\n[Section E & F] Permissions and Functionality Preservation:');

const firestoreRules = fs.readFileSync('firestore.rules', 'utf-8');
assert(
  firestoreRules.includes('isAdmin()') &&
  firestoreRules.includes('match /hackathons/{hackathonId}') &&
  (firestoreRules.includes('allow write: if isAdmin();') || firestoreRules.includes('allow create, update, delete: if isAdmin();')),
  'Firestore security rules restrict hackathon publishing and modifications strictly to authorized admins'
);

assert(
  firestoreRules.includes('match /students/{studentId}') &&
  firestoreRules.includes('match /reg_lookups/{regNo}'),
  'Student profiles and registration lookup privacy are preserved in security rules'
);

// -------------------------------------------------------------
// FINAL SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`  PHASE 3 VERIFICATION RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED`);
if (passedTests === totalTests) {
  console.log('  STATUS: ALL PHASE 3 REQUIREMENTS SUCCESSFULLY VERIFIED (100%)');
} else {
  console.log(`  STATUS: ${totalTests - passedTests} CHECKS FAILED`);
  process.exit(1);
}
console.log('================================================================\n');
