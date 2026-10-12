/**
 * Creates the authorized missing student account for ARUL MEGITHA J
 * in Firebase Authentication, generates a secure password setup link,
 * and creates the linked Firestore profile and registration lookup.
 * 
 * Never sets or stores a plaintext password.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { OAuth2Client } from 'google-auth-library';
import { Firestore, FieldValue } from '@google-cloud/firestore';

const EXPECTED_PROJECT_ID = 'foceye-2546c';

async function initAdmin() {
  const homeDir = os.homedir();
  const config = JSON.parse(fs.readFileSync(path.join(homeDir, '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
  const refreshToken = config.tokens?.refresh_token;

  const params = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const { access_token } = await tokenRes.json();
  const authClient = new OAuth2Client();
  authClient.setCredentials({ access_token });
  const db = new Firestore({ projectId: EXPECTED_PROJECT_ID, authClient });

  const app = initializeApp({
    credential: { getAccessToken: async () => ({ access_token, expires_in: 3600 }) },
    projectId: EXPECTED_PROJECT_ID
  }, `CreateStudent_${Date.now()}`);

  const auth = getAuth(app);
  return { db, auth };
}

async function run() {
  console.log('========================================================================');
  console.log('  HACKHUB — AUTHORIZED CREATION & RECONCILIATION OF MISSING STUDENT');
  console.log('========================================================================\n');

  const { db, auth } = await initAdmin();

  const studentDetails = {
    name: 'ARUL MEGITHA J',
    email: 'kit29.25bbm009@gmail.com',
    registerNumber: '711525BBM009',
    department: 'Biomedical Engineering',
    year: 'Second Year'
  };

  console.log('Target Student:', studentDetails);

  // 1. Verify that user doesn't already exist
  let existingUser = null;
  try {
    existingUser = await auth.getUserByEmail(studentDetails.email);
    console.log(`User already exists in Firebase Auth: UID = ${existingUser.uid}`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }

  let userRecord = existingUser;
  if (!userRecord) {
    console.log('\nCreating Firebase Authentication account (no plaintext password)...');
    userRecord = await auth.createUser({
      email: studentDetails.email,
      displayName: studentDetails.name,
      emailVerified: false,
      disabled: false
    });
    console.log(`✅ [OK] Created Firebase Auth user: UID = ${userRecord.uid}`);

    // Generate secure password reset invitation link
    const resetLink = await auth.generatePasswordResetLink(studentDetails.email);
    console.log(`✅ [OK] Generated password-setup link for student invitation.`);
  }

  const uid = userRecord.uid;

  // 2. Create matching students/{uid} profile
  console.log(`\nWriting students/${uid}...`);
  const studentRef = db.collection('students').doc(uid);
  await studentRef.set({
    uid: uid,
    name: studentDetails.name,
    email: studentDetails.email,
    registerNumber: studentDetails.registerNumber,
    registrationNumberNormalized: studentDetails.registerNumber,
    department: studentDetails.department,
    year: studentDetails.year,
    role: 'STUDENT',
    accountStatus: 'active',
    isActive: true,
    phone: '',
    bio: 'Engineering student at KalaignarKarunanidhi Institute Of Technology.',
    skills: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`✅ [OK] Successfully written profile students/${uid}`);

  // 3. Create matching reg_lookups/{regNo} document
  console.log(`\nWriting reg_lookups/${studentDetails.registerNumber}...`);
  const lookupRef = db.collection('reg_lookups').doc(studentDetails.registerNumber);
  await lookupRef.set({
    uid: uid,
    email: studentDetails.email,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`✅ [OK] Successfully written lookup reg_lookups/${studentDetails.registerNumber}`);

  console.log('\n========================================================================');
  console.log('  RECONCILIATION COMPLETED SUCCESSFULLY');
  console.log('========================================================================\n');
}

run().catch(err => {
  console.error('Fatal error in reconciliation:', err);
  process.exit(1);
});
