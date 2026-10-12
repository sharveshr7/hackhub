/**
 * Audit and inspection of genuine Firestore data in foceye-2546c
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { OAuth2Client } from 'google-auth-library';
import { Firestore } from '@google-cloud/firestore';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const EXPECTED_PROJECT_ID = 'foceye-2546c';

async function initAdmin() {
  const homeDir = os.homedir();
  const configstorePath = path.join(homeDir, '.config', 'configstore', 'firebase-tools.json');
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

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const authClient = new OAuth2Client();
  authClient.setCredentials({ access_token: accessToken });
  const directDb = new Firestore({ projectId: EXPECTED_PROJECT_ID, authClient });

  return directDb;
}

async function auditData() {
  console.log('========================================================================');
  console.log('  HACKHUB — GENUINE FIRESTORE DATA AUDIT (foceye-2546c)');
  console.log('========================================================================\n');

  const db = await initAdmin();

  const collections = [
    'hackathons',
    'registrations',
    'teams',
    'submissions',
    'attendance',
    'attendance_gates',
    'students',
    'admins',
    'notifications',
    'reg_lookups'
  ];

  const summary = {};

  for (const collName of collections) {
    try {
      const snap = await db.collection(collName).get();
      summary[collName] = snap.size;
      console.log(`Collection [${collName}]: ${snap.size} documents`);
      if (snap.size > 0 && snap.size <= 5) {
        snap.docs.forEach((d, i) => {
          const data = d.data();
          const clean = { ...data };
          // Remove bulky text or timestamps for display
          console.log(`  - Doc ${i + 1} (${d.id}):`, JSON.stringify(clean).slice(0, 150) + '...');
        });
      } else if (snap.size > 5) {
        console.log(`  - Sample Doc 1 (${snap.docs[0].id}):`, JSON.stringify(snap.docs[0].data()).slice(0, 150) + '...');
      }
    } catch (err) {
      console.log(`Collection [${collName}]: Error reading (${err.message})`);
    }
  }

  console.log('\n========================================================================');
  console.log('  SUMMARY COUNTS:');
  console.log(JSON.stringify(summary, null, 2));
  console.log('========================================================================\n');
}

auditData().catch(console.error);
