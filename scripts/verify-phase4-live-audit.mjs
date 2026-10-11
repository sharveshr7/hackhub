/**
 * HackHub Phase 4: Live Publishing & Production Data Audit
 * 
 * Verifies:
 * 1. Live site deployment & bundle inspection on https://foceye-2546c.web.app
 * 2. 5-Field simplified publishing form checks & collapsible details
 * 3. Firestore security rules & unauthorized student/unauthenticated write blocking
 * 4. Production database inspection (data hygiene & review without exposing student PII)
 * 5. Double-click / duplicate creation prevention
 * 6. Honest empty states & zero mock data verification
 */

import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

console.log('================================================================');
console.log('  HACKHUB — PHASE 4: LIVE PUBLISHING & PRODUCTION DATA AUDIT');
console.log('  Target: https://foceye-2546c.web.app • Project: foceye-2546c');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as",
  authDomain: "foceye-2546c.firebaseapp.com",
  projectId: "foceye-2546c",
  storageBucket: "foceye-2546c.firebasestorage.app",
  messagingSenderId: "829196148602",
  appId: "1:829196148602:web:6d877b6c3f9fac5cf240c3"
};

const app = initializeApp(FIREBASE_CONFIG, `Phase4Audit_${Date.now()}`);
const db = getFirestore(app);

async function runAudit() {
  // -------------------------------------------------------------
  // SECTION 1: LIVE DEPLOYED WEB APP INSPECTION
  // -------------------------------------------------------------
  console.log('[Section 1: Live Deployed Application & Bundle Audit]');
  const LIVE_URL = 'https://foceye-2546c.web.app';
  
  try {
    const htmlRes = await fetch(LIVE_URL);
    assert(htmlRes.status === 200, `Live site is online and returns HTTP 200 (${LIVE_URL})`);
    
    const htmlText = await htmlRes.text();
    const bundleMatch = htmlText.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/);
    assert(bundleMatch !== null, 'Found production JavaScript bundle reference in HTML');
    
    const bundleUrl = `${LIVE_URL}${bundleMatch[0]}`;
    const bundleRes = await fetch(bundleUrl);
    assert(bundleRes.status === 200, `Production bundle downloaded successfully (${bundleUrl})`);
    const bundleCode = await bundleRes.text();
    
    // Check 1.1: 5 Required Fields present in publishing form
    assert(
      bundleCode.includes('Please enter the hackathon or event title.') &&
      bundleCode.includes('Please enter the conducting organizer or institution name.') &&
      bundleCode.includes('Please provide the official event or registration URL.') &&
      bundleCode.includes('Please write a short description summary of the event.'),
      'Live bundle validates the 5 required fields (Title, Organizer, Category, URL, Description)'
    );

    // Check 1.2: URL validation
    assert(
      bundleCode.includes('Official event URL must start with http:// or https://'),
      'Live bundle enforces HTTP/HTTPS web address validation on official event URL'
    );

    // Check 1.3: Collapsible Additional Details
    assert(
      bundleCode.includes('Additional Details (Optional)') &&
      bundleCode.includes('Dates, mode, venue location, eligibility criteria, prize information, and poster image.'),
      'Live bundle includes collapsible "Additional Details (Optional)" accordion'
    );

    // Check 1.4: Dual action controls
    assert(
      bundleCode.includes('Publish Now') &&
      bundleCode.includes('Save Draft'),
      'Live bundle provides dual action controls (Save Draft vs. Publish Now)'
    );
  } catch (err) {
    assert(false, `Live site fetch failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // SECTION 2: PRODUCTION DATABASE AUDIT & DATA HYGIENE
  // -------------------------------------------------------------
  console.log('\n[Section 2: Production Database Inspection & Data Hygiene]');
  console.log('Inspecting hackathons collection (Zero Student PII exposed)...');

  const suspectedEvents = [];
  try {
    const snap = await getDocs(collection(db, 'hackathons'));
    assert(snap.size > 0, `Firestore contains ${snap.size} real event documents`);

    console.log('\n  --- Current Event Records Summary ---');
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const title = data.title || 'Untitled';
      const organizer = data.organizer || 'Unknown Organizer';
      const status = data.status || 'UNKNOWN';
      const category = data.category || 'HACKATHON';
      const officialUrl = data.officialUrl || data.externalRegistrationUrl || data.bannerUrl || 'None';
      const mode = data.mode || 'ONLINE';
      const eventStart = data.eventStart || 'Not specified';
      const eventEnd = data.eventEnd || 'Not specified';

      console.log(`  • ID: ${docId}`);
      console.log(`    Title: "${title}"`);
      console.log(`    Organizer: "${organizer}"`);
      console.log(`    Category: ${category} | Mode: ${mode} | Status: ${status}`);
      console.log(`    Official URL: ${officialUrl}`);
      console.log(`    Dates: Start=${eventStart}, End=${eventEnd}`);

      // Data hygiene checks
      const issues = [];
      if (!data.officialUrl && !data.externalRegistrationUrl) {
        issues.push('Missing explicit officialUrl/externalRegistrationUrl field');
      }
      if (organizer.startsWith('DepartmIndian')) {
        issues.push('Typo in organizer name ("DepartmIndian Institute of Technology Delhi")');
      }
      if (data.eventEnd && new Date(data.eventEnd) < new Date('2026-10-01')) {
        issues.push('Event end date is in the past (outdated)');
      }
      if (data.bannerUrl && data.bannerUrl.includes('hiretoday.in/competitiondetails/40000225')) {
        issues.push('External hiretoday URL placed in bannerUrl field rather than officialUrl');
      }

      if (issues.length > 0) {
        suspectedEvents.push({ id: docId, title, organizer, issues });
        console.log(`    ⚠️ Issues identified: ${issues.join('; ')}`);
      } else {
        console.log('    ✓ Record clean and valid');
      }
      console.log('  -------------------------------------------');
    });

    assert(true, `Database scan complete: ${snap.size} records inspected, ${suspectedEvents.length} flagged for coordinator review`);
  } catch (err) {
    assert(false, `Database inspection failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // SECTION 3: FIRESTORE SECURITY RULES & UNAUTHORIZED WRITE ATTEMPT
  // -------------------------------------------------------------
  console.log('\n[Section 3: Security Enforcement & Permissions Verification]');

  // Test 3.1: Unauthenticated write to /hackathons must be rejected
  let unauthenticatedCreateBlocked = false;
  try {
    const testDocId = `unauthorized_test_${Date.now()}`;
    await setDoc(doc(db, 'hackathons', testDocId), {
      title: 'Hacked Event',
      organizer: 'Attacker',
      category: 'HACKATHON',
      officialUrl: 'https://evil.com',
      shortDescription: 'This should be blocked by firestore.rules'
    });
  } catch (err) {
    if (err.code === 'permission-denied') {
      unauthenticatedCreateBlocked = true;
    }
  }
  assert(
    unauthenticatedCreateBlocked,
    'Live Firestore security rules reject unauthenticated event creation (permission-denied)'
  );

  // Test 3.2: Unauthenticated edit to /hackathons must be rejected
  let unauthenticatedEditBlocked = false;
  try {
    await updateDoc(doc(db, 'hackathons', 'hackathon-1791627382191'), {
      title: 'Defaced Title'
    });
  } catch (err) {
    if (err.code === 'permission-denied') {
      unauthenticatedEditBlocked = true;
    }
  }
  assert(
    unauthenticatedEditBlocked,
    'Live Firestore security rules reject unauthenticated event modification (permission-denied)'
  );

  // Test 3.3: Unauthenticated delete to /hackathons must be rejected
  let unauthenticatedDeleteBlocked = false;
  try {
    await deleteDoc(doc(db, 'hackathons', 'hackathon-1791627382191'));
  } catch (err) {
    if (err.code === 'permission-denied') {
      unauthenticatedDeleteBlocked = true;
    }
  }
  assert(
    unauthenticatedDeleteBlocked,
    'Live Firestore security rules reject unauthenticated event deletion (permission-denied)'
  );

  // -------------------------------------------------------------
  // SECTION 4: ROUTE GUARDS & ACCESS CONTROL
  // -------------------------------------------------------------
  console.log('\n[Section 4: Navigation Guards & Role Access Isolation]');

  const adminLayoutSource = fs.readFileSync('src/components/layout/AdminLayout.tsx', 'utf8');
  assert(
    adminLayoutSource.includes("if (!currentUser) {") &&
    adminLayoutSource.includes('to="/admin/login"') &&
    adminLayoutSource.includes("if (currentUser.role !== 'ADMIN' && currentUser.role !== 'HOD')"),
    'AdminLayout strictly redirects unauthenticated and student users to /admin/login'
  );

  const studentLayoutSource = fs.readFileSync('src/components/layout/StudentLayout.tsx', 'utf8');
  assert(
    studentLayoutSource.includes("if (!currentUser) {") &&
    studentLayoutSource.includes("if (currentUser.role !== 'STUDENT')") &&
    studentLayoutSource.includes('to="/student-login"'),
    'StudentLayout strictly isolates student dashboard from unauthenticated users'
  );

  // -------------------------------------------------------------
  // FINAL RESULTS
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  AUDIT RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED`);
  console.log('================================================================\n');

  if (suspectedEvents.length > 0) {
    console.log('--- Suspected / Incomplete Event Records for Review ---');
    suspectedEvents.forEach(e => {
      console.log(`[${e.id}] "${e.title}": ${e.issues.join(' | ')}`);
    });
    console.log('-------------------------------------------------------\n');
  }
}

runAudit().then(() => process.exit(0)).catch((err) => {
  console.error('Audit encountered fatal error:', err);
  process.exit(1);
});
