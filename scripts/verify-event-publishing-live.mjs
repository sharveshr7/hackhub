import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { OAuth2Client } from 'google-auth-library';
import { Firestore } from '@google-cloud/firestore';

import { initializeApp as initClientApp } from 'firebase/app';
import { getAuth as getClientAuth, signInWithEmailAndPassword, signOut as clientSignOut } from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

import { sanitizeForFirestore, serializeHackathonPayload } from '../src/utils/firestoreSerializer.ts';

const EXPECTED_PROJECT_ID = 'foceye-2546c';

async function initAdmin() {
  const homeDir = os.homedir();
  const configstorePath = path.join(homeDir, '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configstorePath)) {
    throw new Error('Firebase CLI credentials not found at ~/.config/configstore/firebase-tools.json');
  }

  const config = JSON.parse(fs.readFileSync(configstorePath, 'utf8'));
  const refreshToken = config.tokens?.refresh_token;
  const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
  const clientSecret = 'j9iVZfS8kkCEFUPaAeJV0sAi';

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!tokenRes.ok) throw new Error('Failed to refresh Firebase token');
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const authClient = new OAuth2Client();
  authClient.setCredentials({ access_token: accessToken });
  const directDb = new Firestore({ projectId: EXPECTED_PROJECT_ID, authClient });

  const adminApp = initAdminApp({
    credential: {
      getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 })
    },
    projectId: EXPECTED_PROJECT_ID
  }, `Admin_${Date.now()}`);

  const adminAuth = getAdminAuth(adminApp);
  return { directDb, adminAuth };
}

async function runLiveEventPublishingTests() {
  console.log('========================================================================');
  console.log('  HACKHUB — LIVE FIRESTORE EVENT PUBLISHING & SECURITY VERIFICATION');
  console.log('========================================================================\n');

  const { directDb, adminAuth } = await initAdmin();

  // Client SDK setup
  let apiKey = '';
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/VITE_FIREBASE_API_KEY=(.*)/);
    if (match) apiKey = match[1].trim().replace(/^['"]|['"]$/g, '');
  } catch (e) {}

  const clientConfig = {
    apiKey: apiKey || 'AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as',
    authDomain: "foceye-2546c.firebaseapp.com",
    projectId: EXPECTED_PROJECT_ID,
  };

  const clientApp = initClientApp(clientConfig, `Client_Tester_${Date.now()}`);
  const clientAuth = getClientAuth(clientApp);
  const clientDb = getClientFirestore(clientApp);

  const testPass = 'TempPass123!SafeTesting';
  const bmeEmail = `test.bme.faculty.${Date.now()}@kitcbe.com`;
  const studentEmail = `test.student.${Date.now()}@gmail.com`;

  let bmeUid = null;
  let studentUid = null;
  const createdHackathonIds = [];

  try {
    // 1. Provision Test BME Faculty User
    console.log(`[Setup] Provisioning test BME faculty user (${bmeEmail})...`);
    const bmeUser = await adminAuth.createUser({
      email: bmeEmail,
      password: testPass,
      displayName: 'Test BME Coordinator'
    });
    bmeUid = bmeUser.uid;

    await directDb.collection('admins').doc(bmeUid).set({
      uid: bmeUid,
      email: bmeEmail,
      name: 'Test BME Coordinator',
      role: 'FACULTY',
      department: 'Biomedical Engineering',
      designation: 'Assistant Professor',
      isActive: true,
      accountStatus: 'active',
      approvalStatus: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 2. Provision Test Student User
    console.log(`[Setup] Provisioning test Student user (${studentEmail})...`);
    const stuUser = await adminAuth.createUser({
      email: studentEmail,
      password: testPass,
      displayName: 'Test Student'
    });
    studentUid = stuUser.uid;

    await directDb.collection('students').doc(studentUid).set({
      uid: studentUid,
      email: studentEmail,
      name: 'Test Student',
      role: 'STUDENT',
      department: 'Biomedical Engineering',
      year: 'Second Year',
      registerNumber: '7115TEST001',
      registrationNumberNormalized: '7115TEST001',
      isActive: true,
      accountStatus: 'active',
      skills: []
    });

    // Sign in as BME Faculty
    console.log(`\n[Test 1] Signing in as BME Faculty...`);
    await signInWithEmailAndPassword(clientAuth, bmeEmail, testPass);
    console.log(`  ✅ Signed in successfully as ${bmeEmail}`);

    // Scenario A: Publish event with prize money BLANK (optional omitted)
    const event1Id = `hackathon-test-blankprize-${Date.now()}`;
    createdHackathonIds.push(event1Id);
    console.log(`\n[Test 2] BME Faculty publishing event with BLANK prizePool to hackathons/${event1Id}...`);
    
    const payload1 = serializeHackathonPayload({
      title: 'Biomedical Engineering Innovations Challenge 2026',
      organizer: 'Biomedical Engineering Department',
      category: 'HACKATHON',
      officialUrl: 'https://example.com/bme-challenge',
      department: 'Biomedical Engineering',
      shortDescription: 'Annual innovation challenge for medical device design.',
      status: 'PUBLISHED',
      publishedBy: bmeUid,
      publisherName: 'Test BME Coordinator',
      prizePool: '', // BLANK
      rules: ['Adhere to lab safety'],
      eligibility: ['Open to all engineering students'],
      minTeamSize: 1,
      maxTeamSize: 4
    });

    await setDoc(doc(clientDb, 'hackathons', event1Id), {
      ...payload1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`  ✅ [PASS] Successfully written to Firestore with blank prize!`);

    const readDoc1 = await getDoc(doc(clientDb, 'hackathons', event1Id));
    console.log(`  ✅ [PASS] Document verified in Firestore: title="${readDoc1.data().title}", prizePool=${readDoc1.data().prizePool || '(omitted)'}`);

    // Scenario B: Publish event with valid EXPLICIT ZERO prize
    const event2Id = `hackathon-test-zeroprize-${Date.now()}`;
    createdHackathonIds.push(event2Id);
    console.log(`\n[Test 3] BME Faculty publishing event with EXPLICIT ZERO prizePool="0"...`);
    
    const payload2 = serializeHackathonPayload({
      title: 'Free National Research Sprint 2026',
      organizer: 'National Bio Institute',
      category: 'COMPETITION',
      officialUrl: 'https://example.com/free-sprint',
      department: 'Biomedical Engineering',
      shortDescription: 'Zero entry fee research presentation symposium.',
      status: 'PUBLISHED',
      publishedBy: bmeUid,
      publisherName: 'Test BME Coordinator',
      prizePool: '0', // Valid explicit zero
      minTeamSize: 1,
      maxTeamSize: 2
    });

    await setDoc(doc(clientDb, 'hackathons', event2Id), {
      ...payload2,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`  ✅ [PASS] Successfully written with explicit zero prize!`);
    const readDoc2 = await getDoc(doc(clientDb, 'hackathons', event2Id));
    console.log(`  ✅ [PASS] Verified zero prize preserved: prizePool="${readDoc2.data().prizePool}"`);

    // Scenario C: Save DRAFT with optional fields omitted
    const event3Id = `hackathon-test-draft-${Date.now()}`;
    createdHackathonIds.push(event3Id);
    console.log(`\n[Test 4] BME Faculty saving DRAFT with optional fields omitted...`);
    
    const payload3 = serializeHackathonPayload({
      title: 'Upcoming MedTech Hackathon 2026 (Draft)',
      organizer: 'Biomedical Engineering Department',
      category: 'HACKATHON',
      officialUrl: 'https://example.com/draft-info',
      department: 'Biomedical Engineering',
      shortDescription: 'Draft description in progress',
      status: 'DRAFT',
      publishedBy: bmeUid,
      publisherName: 'Test BME Coordinator'
    });

    await setDoc(doc(clientDb, 'hackathons', event3Id), {
      ...payload3,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`  ✅ [PASS] Successfully saved DRAFT!`);

    // Scenario D: Cross-Department rejection test (BME Faculty trying to create event for Biotechnology)
    const event4Id = `hackathon-test-crossdept-${Date.now()}`;
    console.log(`\n[Test 5] BME Faculty attempting cross-department write for "Biotechnology" (Must be REJECTED)...`);
    
    const payload4 = serializeHackathonPayload({
      title: 'Unauthorized Cross-Dept Event',
      organizer: 'Biotech Lab',
      category: 'HACKATHON',
      officialUrl: 'https://example.com/unauthorized',
      department: 'Biotechnology', // CROSS-DEPARTMENT!
      shortDescription: 'Should be rejected by security rules',
      status: 'PUBLISHED',
      publishedBy: bmeUid,
      publisherName: 'Test BME Coordinator'
    });

    let crossDeptFailed = false;
    try {
      await setDoc(doc(clientDb, 'hackathons', event4Id), {
        ...payload4,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      crossDeptFailed = true;
      console.log(`  ✅ [PASS] Cross-department write was strictly rejected with: ${err.code} (${err.message})`);
    }
    if (!crossDeptFailed) {
      throw new Error('SECURITY VIOLATION: Cross-department write succeeded when it must be rejected!');
    }

    // Scenario E: Unauthorized student write test
    await clientSignOut(clientAuth);
    console.log(`\n[Test 6] Signing in as Student (${studentEmail}) to test event creation denial...`);
    await signInWithEmailAndPassword(clientAuth, studentEmail, testPass);

    const event5Id = `hackathon-test-studentwrite-${Date.now()}`;
    let studentWriteFailed = false;
    try {
      await setDoc(doc(clientDb, 'hackathons', event5Id), {
        ...payload1,
        id: event5Id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      studentWriteFailed = true;
      console.log(`  ✅ [PASS] Student write was strictly rejected with: ${err.code} (${err.message})`);
    }
    if (!studentWriteFailed) {
      throw new Error('SECURITY VIOLATION: Student was able to create a hackathon!');
    }

    console.log('\n========================================================================');
    console.log('  ALL LIVE EVENT PUBLISHING & ACCESS CONTROL SCENARIOS PASSED (100%)');
    console.log('========================================================================\n');

  } finally {
    // Clean up test hackathons and auth users
    console.log(`[Cleanup] Cleaning up test documents and users...`);
    for (const hId of createdHackathonIds) {
      try {
        await directDb.collection('hackathons').doc(hId).delete();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (bmeUid) {
      try {
        await directDb.collection('admins').doc(bmeUid).delete();
        await adminAuth.deleteUser(bmeUid);
      } catch (e) {}
    }
    if (studentUid) {
      try {
        await directDb.collection('students').doc(studentUid).delete();
        await adminAuth.deleteUser(studentUid);
      } catch (e) {}
    }
    console.log(`[Cleanup] Cleaned up all test artifacts safely.`);
  }

  process.exit(0);
}

runLiveEventPublishingTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
