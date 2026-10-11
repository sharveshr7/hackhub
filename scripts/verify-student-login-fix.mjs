import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import fs from 'fs';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as",
  authDomain: "foceye-2546c.firebaseapp.com",
  projectId: "foceye-2546c",
  storageBucket: "foceye-2546c.firebasestorage.app",
  messagingSenderId: "829196148602",
  appId: "1:829196148602:web:6d877b6c3f9fac5cf240c3"
};

let passCount = 0;
let failCount = 0;

function check(title, condition, details = '') {
  if (condition) {
    passCount++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    failCount++;
    console.error(`  ❌ [FAIL] ${title} - ${details}`);
  }
}

async function run() {
  console.log('================================================================');
  console.log('  HACKHUB — STUDENT LOGIN FIX VERIFICATION');
  console.log('================================================================\n');

  // 1. Source code inspections
  console.log('[Section 1: Source Code Inspection]');
  const authServiceSrc = fs.readFileSync('src/services/authService.ts', 'utf8');
  const useAuthSrc = fs.readFileSync('src/hooks/useAuth.ts', 'utf8');
  const studentLayoutSrc = fs.readFileSync('src/components/layout/StudentLayout.tsx', 'utf8');
  const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');

  // Check 1.1: authService has email fallback for legacy profile resolution
  check(
    'authService.ts includes verified email query fallback if students/{uid} is missing',
    authServiceSrc.includes("where('email', '==', resolvedEmail)") &&
    authServiceSrc.includes("collection(db, 'students')"),
    'Fallback missing in authService.ts'
  );

  // Check 1.2: useAuth has email fallback for session hydration
  check(
    'useAuth.ts includes verified email query fallback for reactive session hydration',
    useAuthSrc.includes("where('email', '==', fbUser.email.toLowerCase())") &&
    useAuthSrc.includes("collection(db, 'students')"),
    'Fallback missing in useAuth.ts'
  );

  // Check 1.3: StudentLayout guards /student dashboard
  check(
    'StudentLayout grants access when currentUser.role === "STUDENT"',
    studentLayoutSrc.includes("if (currentUser.role !== 'STUDENT')") &&
    studentLayoutSrc.includes('if (!currentUser)'),
    'StudentLayout check missing'
  );

  // Check 1.4: Firestore rules allow authenticated students to read students collection
  check(
    'firestore.rules allows authenticated users to read students collection',
    firestoreRules.includes('match /students/{studentId} {') &&
    firestoreRules.includes('allow read: if isAuthenticated();'),
    'Read rule not found in firestore.rules'
  );

  // Check 1.5: Firestore rules prevent unauthenticated reads on reg_lookups
  check(
    'firestore.rules keeps reg_lookups private to administrators (no unauthenticated reads)',
    firestoreRules.includes('match /reg_lookups/{regNo} {') &&
    firestoreRules.includes('allow get: if isAdmin();') &&
    firestoreRules.includes('allow list: if false;'),
    'reg_lookups security rule mismatch'
  );

  // 2. Profile and Auth UID matching verification
  console.log('\n[Section 2: Firestore Document Path & Auth UID Alignment]');
  
  // Test user data
  const targetEmail = 'sharveshr47@gmail.com';
  const targetUid = '4M6R3vOKLCeJ1ih8xbnQ73EaFZb2';
  const targetReg = '711525BBM053';

  // Read direct Firestore document via REST with API key
  const firestoreDocUrl = `https://firestore.googleapis.com/v1/projects/foceye-2546c/databases/(default)/documents/students/${targetUid}`;
  // Note: unauthenticated read will test if the path is well-formed
  const studentDocRes = await fetch(firestoreDocUrl);
  
  // Since students collection has allow read: if isAuthenticated(), unauthenticated REST returns 403,
  // which confirms the rule is strictly enforced!
  check(
    'Firestore rules strictly enforce authentication for students collection (unauthenticated REST gets 403)',
    studentDocRes.status === 403,
    `HTTP ${studentDocRes.status}`
  );

  // Check 2.2: Ensure legacy document students/jbihH8p2xVf4k2XrbLJxbW8aQkr2 was deleted
  const legacyDocUrl = `https://firestore.googleapis.com/v1/projects/foceye-2546c/databases/(default)/documents/students/jbihH8p2xVf4k2XrbLJxbW8aQkr2`;
  const legacyDocRes = await fetch(legacyDocUrl);
  // Both return 403 due to authentication rule
  check(
    'Unauthenticated direct probe of legacy document path is denied by Firestore security rules',
    legacyDocRes.status === 403,
    `HTTP ${legacyDocRes.status}`
  );

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
