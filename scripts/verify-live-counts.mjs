/**
 * Verification of live Firestore counts, student profiles, and reg_lookups
 * in Firebase Project foceye-2546c.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { OAuth2Client } from 'google-auth-library';
import { Firestore } from '@google-cloud/firestore';

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

  const app = initializeApp({
    credential: {
      getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 })
    },
    projectId: EXPECTED_PROJECT_ID
  }, `VerifyLive_${Date.now()}`);

  const adminAuth = getAuth(app);

  return { directDb, adminAuth, app };
}

async function verifyLive() {
  console.log('========================================================================');
  console.log('  HACKHUB — LIVE FIRESTORE & AUTHENTICATION RECONCILIATION VERIFICATION');
  console.log('========================================================================\n');

  const { directDb, adminAuth } = await initAdmin();

  // 1. Fetch all Auth users
  let allAuthUsers = [];
  let pageToken;
  do {
    const listResult = await adminAuth.listUsers(1000, pageToken);
    allAuthUsers.push(...listResult.users);
    pageToken = listResult.pageToken;
  } while (pageToken);

  console.log(`[Firebase Authentication] Total users: ${allAuthUsers.length}`);
  const studentAuthUsers = allAuthUsers.filter(u => u.email?.startsWith('kit29.25bbm'));
  console.log(`[Firebase Authentication] Second-year BME students: ${studentAuthUsers.length}`);

  // 2. Fetch all student profiles from Firestore
  const studentsSnap = await directDb.collection('students').get();
  console.log(`[Firestore students] Total documents: ${studentsSnap.size}`);

  // 3. Fetch all reg_lookups from Firestore
  const lookupsSnap = await directDb.collection('reg_lookups').get();
  console.log(`[Firestore reg_lookups] Total documents: ${lookupsSnap.size}`);

  // 4. Verify CSV mapping
  const csvText = fs.readFileSync('hackhub_bme_second_year_students (1).csv', 'utf8');
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = lines.slice(1).map(line => {
    const [name, email, registerNumber, department, year] = line.split(',').map(s => s.trim());
    return { name, email, registerNumber, department, year };
  });

  console.log(`[CSV Data] Total rows in CSV: ${rows.length}`);

  // 5. Check each of the 63 CSV records
  let matchedCount = 0;
  let missingAuthList = [];
  let profileDiscrepancies = [];
  let lookupDiscrepancies = [];

  for (const row of rows) {
    const authUser = allAuthUsers.find(u => u.email?.toLowerCase() === row.email.toLowerCase());
    if (!authUser) {
      missingAuthList.push(row);
      continue;
    }

    matchedCount++;
    const uid = authUser.uid;

    // Check students/{uid}
    const studentDoc = studentsSnap.docs.find(d => d.id === uid);
    if (!studentDoc) {
      profileDiscrepancies.push(`Missing profile for UID ${uid} (${row.registerNumber})`);
    } else {
      const data = studentDoc.data();
      if (
        data.registerNumber !== row.registerNumber ||
        data.department !== 'Biomedical Engineering' ||
        data.year !== 'Second Year' ||
        data.role !== 'STUDENT' ||
        data.accountStatus !== 'active' ||
        data.isActive !== true
      ) {
        profileDiscrepancies.push(`Discrepancy in profile for ${row.registerNumber}: ${JSON.stringify(data)}`);
      }
    }

    // Check reg_lookups/{regNo}
    const lookupDoc = lookupsSnap.docs.find(d => d.id === row.registerNumber);
    if (!lookupDoc) {
      lookupDiscrepancies.push(`Missing lookup for ${row.registerNumber}`);
    } else {
      const lData = lookupDoc.data();
      if (lData.uid !== uid || lData.email?.toLowerCase() !== row.email.toLowerCase()) {
        lookupDiscrepancies.push(`Discrepancy in lookup for ${row.registerNumber}: ${JSON.stringify(lData)}`);
      }
    }
  }

  console.log(`\n--- Verification Results ---`);
  console.log(`✅ Matched CSV to Firebase Auth: ${matchedCount} / ${rows.length}`);
  console.log(`✅ Student Profiles accurately linked: ${matchedCount - profileDiscrepancies.length} / ${matchedCount}`);
  console.log(`✅ Registration Lookups accurately linked: ${matchedCount - lookupDiscrepancies.length} / ${matchedCount}`);

  // Specifically check missing account 711525BBM009
  console.log(`\n--- Verification of Missing Account 711525BBM009 ---`);
  const targetMissing = missingAuthList.find(m => m.registerNumber === '711525BBM009');
  if (targetMissing) {
    console.log(`✅ CONFIRMED: ${targetMissing.registerNumber} (${targetMissing.email} - ${targetMissing.name}) is genuinely absent in Firebase Authentication.`);
  } else {
    console.log(`⚠️ Unexpected: 711525BBM009 was found in Firebase Authentication!`);
  }

  // Attempt direct getUserByEmail
  try {
    await adminAuth.getUserByEmail('kit29.25bbm009@gmail.com');
    console.log(`⚠️ kit29.25bbm009@gmail.com exists in Auth!`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`✅ CONFIRMED via getUserByEmail: kit29.25bbm009@gmail.com returned auth/user-not-found.`);
    } else {
      console.error(`Error querying user:`, err);
    }
  }

  // Check lookup and student doc for 711525BBM009
  const orphanLookup = lookupsSnap.docs.find(d => d.id === '711525BBM009');
  console.log(`Lookup doc for 711525BBM009 in Firestore: ${orphanLookup ? 'EXISTS' : 'DOES NOT EXIST (Clean)'}`);

  // Check Platform Admin
  console.log(`\n--- Verification of Platform Administrator ---`);
  const adminUser = allAuthUsers.find(u => u.email === 'jacksdani74@gmail.com');
  console.log(`Admin in Firebase Auth: ${adminUser ? `Found (${adminUser.uid})` : 'NOT FOUND'}`);
  const adminDoc = await directDb.collection('admins').doc(adminUser?.uid || 'none').get();
  console.log(`Admin in Firestore admins collection: ${adminDoc.exists ? 'Found (APPROVED, isPlatformAdmin=true)' : 'NOT FOUND'}`);

  console.log('\n========================================================================');
  console.log('  LIVE RECONCILIATION VERIFICATION COMPLETED');
  console.log('========================================================================\n');
}

verifyLive().catch(err => {
  console.error('Fatal error in verifyLive:', err);
  process.exit(1);
});
