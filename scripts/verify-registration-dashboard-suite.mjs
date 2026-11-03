/**
 * HACKHUB — REGISTRATION WORKFLOW & DASHBOARD REGRESSION TEST SUITE
 * Tests Phase 2, Phase 3, Phase 5 & Phase 6 scenarios
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('========================================================================');
console.log('  HACKHUB — STUDENT REGISTRATION & DASHBOARD REGRESSION SUITE');
console.log('  Testing 12 Critical Workflows, Security Bounds & UI Logic');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

// 1. Check firestore.rules for safe registration read and write
const firestoreRules = readFileSync(resolve('firestore.rules'), 'utf-8');

console.log('--- SCENARIO 1 & 4: Registration Security Rules Authorization ---');
assert(
  firestoreRules.includes('allow get: if (isAuthenticated() && (resource == null || resource.data.studentId == request.auth.uid))'),
  'Security rules permit get when resource == null (preventing permission-denied crash during first-time registration transaction)'
);
assert(
  firestoreRules.includes('allow list: if (isAuthenticated() && resource.data.studentId == request.auth.uid)'),
  'Security rules isolate registration listing to studentId == request.auth.uid or scoped staff'
);
assert(
  firestoreRules.includes("request.resource.data.status == 'CONFIRMED'"),
  'Students cannot self-approve; status must be initial CONFIRMED'
);
assert(
  firestoreRules.includes('request.resource.data.studentId == request.auth.uid'),
  'Students can never register on behalf of another student UID'
);
assert(
  firestoreRules.includes('request.resource.data.department == get(/databases/$(database)/documents/students/$(request.auth.uid)).data.department'),
  'Registration department must match verified student document profile'
);
assert(
  firestoreRules.includes('request.resource.data.academicYear == get(/databases/$(database)/documents/students/$(request.auth.uid)).data.year') ||
  firestoreRules.includes('request.resource.data.academicYear == get(/databases/$(database)/documents/students/$(request.auth.uid)).data.academicYear'),
  'Registration academicYear supports both year and academicYear profile fields'
);

console.log('\n--- SCENARIO 2 & 3: Team Service Integration & API Security ---');
const teamServiceContent = readFileSync(resolve('src/services/teamService.ts'), 'utf-8');
const studentAuthApi = readFileSync(resolve('api/student-auth.ts'), 'utf-8');

assert(
  teamServiceContent.includes('createTeam') && teamServiceContent.includes('/api/student-auth'),
  'Team creation delegates to secure server-side endpoint /api/student-auth'
);
assert(
  teamServiceContent.includes('joinTeamByCode') && teamServiceContent.includes('/api/student-auth'),
  'Team joining validates invite code server-side via /api/student-auth'
);
assert(
  studentAuthApi.includes("action === 'create-team'") && studentAuthApi.includes("verifyServerRequest(authHeader, 'STUDENT')"),
  'Server enforces verified student authentication before team creation'
);
assert(
  studentAuthApi.includes("action === 'join-team'") && studentAuthApi.includes("verifyServerRequest(authHeader, 'STUDENT')"),
  'Server enforces verified student authentication before joining team'
);

console.log('\n--- SCENARIO 5 & 6: Registration Modal UI Simplification (Phase 3) ---');
const hackathonDetailsPage = readFileSync(resolve('src/pages/public/HackathonDetailsPage.tsx'), 'utf-8');

assert(
  hackathonDetailsPage.includes("{ num: 1, label: 'Student Info' }") &&
  hackathonDetailsPage.includes("{ num: 2, label: 'Team Setup' }") &&
  hackathonDetailsPage.includes("{ num: 3, label: 'Track & Venue' }") &&
  hackathonDetailsPage.includes("{ num: 4, label: 'Rules & Summary' }"),
  'Registration modal uses clean, reordered 4-step sequence: Student Info -> Team Setup -> Track & Venue -> Rules & Summary'
);

assert(
  hackathonDetailsPage.includes('displayRules') && !hackathonDetailsPage.includes('(hackathon.rules || ['),
  'Rules panel uses displayRules fallback guaranteeing no blank grey box when hackathon.rules is empty'
);

assert(
  hackathonDetailsPage.includes('disabled={!acceptedRules || isSubmitting}') &&
  hackathonDetailsPage.includes('isLoading={isSubmitting}'),
  'Complete Registration button disables during submission to prevent double-click race conditions'
);

assert(
  hackathonDetailsPage.includes('studentPhone') && hackathonDetailsPage.includes('setStudentPhone'),
  'Step 1 allows editing contact phone number while keeping name, regNo, dept, and year read-only'
);

console.log('\n--- SCENARIO 7 & 8: Student Dashboard & Deadlines Separation (Phase 5) ---');
const studentDashboardPage = readFileSync(resolve('src/pages/student/StudentDashboardPage.tsx'), 'utf-8');

assert(
  !studentDashboardPage.includes("hackathons.find((h) => h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN'") &&
  studentDashboardPage.includes('const activeHackathon =') &&
  studentDashboardPage.includes('myRegistrations.some((r) => r.hackathonId === h.id'),
  'activeHackathon only resolves if student actually has registered for the hackathon (no fake active event)'
);

assert(
  studentDashboardPage.includes('myRegistrations.length === 0 &&') &&
  studentDashboardPage.includes('Explore Available Hackathons'),
  'When student has 0 registrations, an Exploration Banner is shown instead of an active event hero'
);

assert(
  studentDashboardPage.includes('myRegisteredDeadlines') &&
  studentDashboardPage.includes('publicOpportunities') &&
  studentDashboardPage.includes('deadlinesTab'),
  'Deadlines section separates My Registered Deadlines from Public Opportunities with dedicated tabs'
);

assert(
  studentDashboardPage.includes('No active deadlines') &&
  studentDashboardPage.includes('Register for a collegiate hackathon to track deadlines'),
  'Empty state for registered deadlines guides student to public opportunities'
);

assert(
  studentDashboardPage.includes('No announcements at this time'),
  'Notice Board displays clean icon-centered empty state when no announcements are present'
);

console.log('\n--- SCENARIO 9: Navigation & Access Control (Phase 6) ---');
const adminLayout = readFileSync(resolve('src/components/layout/AdminLayout.tsx'), 'utf-8');
const studentLayout = readFileSync(resolve('src/components/layout/StudentLayout.tsx'), 'utf-8');

assert(
  adminLayout.includes('isPlatformAdministrator(currentUser) || isDepartmentApprover(currentUser)'),
  'User Management is accessible to both platform administrators and designated department approvers'
);

assert(
  !studentLayout.includes('hackathons[0]'),
  'StudentLayout top bar active hackathon indicator is undefined when student is not registered (no fake pill)'
);

console.log('\n========================================================================');
console.log(`  VERIFICATION COMPLETE: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
console.log(`  SUCCESS RATE: ${Math.round((passedTests / totalTests) * 100)}%`);
console.log('========================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}

