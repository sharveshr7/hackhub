/**
 * Static source audit for HackHub's current Firestore and API authorization paths.
 * This checks source invariants; Firebase Emulator rules execution remains separate.
 */
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const api = fs.readFileSync('api/student-auth.ts', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const adminService = fs.readFileSync('src/services/adminService.ts', 'utf8');
const announcementService = fs.readFileSync('src/services/announcementService.ts', 'utf8');
const indexes = JSON.parse(fs.readFileSync('firestore.indexes.json', 'utf8'));

let passed = 0;
let total = 0;
function check(condition, message) {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`PASS ${message}`);
  } else {
    console.error(`FAIL ${message}`);
  }
}

console.log('HackHub current role and Firestore source audit (static; not an Emulator test)');
check(rules.includes('match /{document=**}') && rules.includes('allow read, write: if false;'), 'Unmatched Firestore paths default deny');
check(!app.includes('/hod') && !fs.existsSync('src/pages/hod') && !rules.includes('function isHod()'), 'HOD routes, pages, and rule helper are removed');
check(rules.includes("getAdminData().approvalStatus == 'APPROVED'") && rules.includes('getAdminData().isPlatformAdmin == true'), 'Approved staff and explicit platform-admin scope are enforced');
check(rules.includes('canAccessScopedDepartment(resource.data.department, resource.data.academicYear)'), 'Private records use department and academic-year scope');
check(rules.includes('isDeptApprover(resource.data.department)') && rules.includes("request.resource.data.approvalStatus in ['APPROVED', 'REJECTED']"), 'Department approvers can review only same-department pending staff');
check(rules.includes('request.resource.data.approvalStatus == resource.data.approvalStatus') && rules.includes('request.resource.data.role == resource.data.role'), 'Self-profile updates cannot grant roles or approval');
check(rules.includes('match /reg_lookups/{regNo}') && rules.includes('allow get, list, write: if false;'), 'Registration lookup documents have no direct client access');
check(rules.includes('match /students/{studentId}') && rules.includes('allow create: if false;') && rules.includes('request.resource.data.registerNumber == resource.data.registerNumber'), 'Student profiles are server-created and identity fields are immutable');
check(rules.includes("resource.data.status != 'DRAFT'") && rules.includes("resource.data.status in [\n        'PUBLISHED'"), 'Public hackathon reads exclude drafts');
check(rules.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt'])") && rules.includes("request.resource.data.status in ['CONFIRMED', 'CANCELLED']"), 'Staff registration updates are limited to confirm or cancel');
check(rules.includes('match /teams/{teamId}') && rules.includes('allow create: if false;'), 'Clients cannot create or change team membership directly');
check(api.includes("req.body?.action === 'remove-team-member'") && api.includes('Only the team leader or authorized department staff can remove a member.'), 'Server team membership changes enforce leader or scoped-staff authority');
check(rules.includes('request.resource.data.memberIds == get(/databases/$(database)/documents/teams/$(request.resource.data.teamId)).data.memberIds') && rules.includes("!('evaluationScore' in request.resource.data)"), 'Submissions must match the real team roster and cannot supply evaluation scores');
check(rules.includes('match /attendance_gates/{hackathonId}') && rules.includes('allow read, write: if false;'), 'Attendance gate codes are never readable by clients');
check(rules.includes('// Check-in records and registration attendance updates are written transactionally by the server.') && api.includes("action === 'check-in'"), 'Attendance outcomes are written through the authenticated server API');
check(api.includes("req.body?.action === 'provision-student'") && api.includes("verifyServerRequest(authHeader, 'STAFF')"), 'Student provisioning requires an authenticated staff profile');
check(api.includes("actor.role !== 'ADMIN' && (!actor.department || department !== actor.department)") && api.includes("SUPPORTED_STUDENT_YEARS.includes(year)"), 'Provisioning enforces department and supported academic-year boundaries');
check(api.includes('existingEmailLookup.exists') && api.includes('existingRegLookup.exists') && api.includes('db.runTransaction'), 'Provisioning rejects duplicates and creates profile/lookup records transactionally');
check(api.includes('createUser({ email, displayName: name, emailVerified: false, disabled: false })') && !api.includes('password: body.password'), 'Student Auth account creation does not store or accept a plaintext password');
check(api.includes("studentData.accountStatus === 'disabled'") && api.includes('idToken: authData.idToken'), 'Student login checks active profile status before returning credentials');
check(adminService.includes('toggleDepartmentApprover(adminId: string, isApprover: boolean)') && adminService.includes('isPlatformAdministrator(currentUser)'), 'Only platform admins can assign department approvers');
check(rules.includes("request.resource.data.target == 'DEPT'") && announcementService.includes("target: 'DEPT' as const"), 'Faculty announcements are limited to their own department');
check(rules.includes("allow create: if isPlatformAdmin() && request.resource.data.userId == 'ALL';") && rules.includes('match /notification_reads/{readId}'), 'Campus notifications are platform-admin-only with per-user read markers');
check(indexes.indexes.some((index) => index.collectionGroup === 'announcements' && index.fields.some((field) => field.fieldPath === 'target') && index.fields.some((field) => field.fieldPath === 'department')), 'Department announcement query index is configured');

console.log(`\nRESULT ${passed}/${total} source checks passed.`);
if (passed !== total) process.exitCode = 1;
