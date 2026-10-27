import fs from 'node:fs';

console.log('========================================================================');
console.log('  HACKHUB — VERIFICATION OF ADMIN LOGIN (NO EMPLOYEE ID)');
console.log('========================================================================\n');

let total = 0;
let passed = 0;

function check(title, condition) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    console.error(`  ❌ [FAIL] ${title}`);
  }
}

// 1. Inspect AdminLoginPage.tsx
const adminLoginCode = fs.readFileSync('src/pages/auth/AdminLoginPage.tsx', 'utf8');

check(
  'AdminLoginPage does not contain Employee ID label or input',
  !adminLoginCode.toLowerCase().includes('employee id') &&
  !adminLoginCode.toLowerCase().includes('employeeid') &&
  !adminLoginCode.toLowerCase().includes('faculty id')
);

check(
  'AdminLoginPage contains Email Address input',
  adminLoginCode.includes('label="Email Address"') && adminLoginCode.includes('type="email"')
);

check(
  'AdminLoginPage contains Password input',
  adminLoginCode.includes('label="Password"')
);

check(
  'AdminLoginPage calls authService.loginAdmin with email and password only',
  adminLoginCode.includes('authService.loginAdmin(email, password)')
);

// 2. Inspect authService.ts loginAdmin
const authServiceCode = fs.readFileSync('src/services/authService.ts', 'utf8');

check(
  'authService.loginAdmin accepts only (email: string, pass: string)',
  authServiceCode.includes('async loginAdmin(email: string, pass: string): Promise<CurrentUser>')
);

check(
  'authService.loginAdmin authenticates via signInWithEmailAndPassword',
  authServiceCode.includes('signInWithEmailAndPassword(auth, email.trim(), pass)')
);

check(
  'authService.loginAdmin resolves privileges from Firestore admins/{uid} document',
  authServiceCode.includes("doc(db, 'admins', uid)")
);

check(
  'authService.loginAdmin rejects non-staff roles without trusting client browser role',
  authServiceCode.includes("['ADMIN', 'FACULTY'].includes(roleUpper)")
);

// 3. Inspect student login independence
const studentLoginCode = fs.readFileSync('src/pages/auth/StudentLoginPage.tsx', 'utf8');

check(
  'Student login independently supports registration number and college email',
  studentLoginCode.includes('loginStudentWithIdentifier')
);

console.log('\n========================================================================');
console.log(`  RESULTS: ${passed} / ${total} CHECKS PASSED`);
console.log('========================================================================\n');

if (passed !== total) {
  process.exit(1);
}
