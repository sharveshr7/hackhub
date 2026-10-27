import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initializeApp as initAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { OAuth2Client } from 'google-auth-library';
import { Firestore } from '@google-cloud/firestore';

import { isPlatformAdministrator, isStaffRole } from '../src/utils/access.ts';

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

  const adminApp = initAdminApp({
    credential: {
      getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 })
    },
    projectId: EXPECTED_PROJECT_ID
  }, `Verify_Jackson_${Date.now()}`);

  const adminAuth = getAdminAuth(adminApp);
  return { directDb, adminAuth };
}

async function verifyDrJacksonDaniel() {
  console.log('========================================================================');
  console.log('  HACKHUB — VERIFICATION OF DR JACKSON DANIEL AUTHORIZATION STATE');
  console.log('========================================================================\n');

  const { directDb, adminAuth } = await initAdmin();
  const uid = 'E3O2Dy67Z3Zyybkjs1048k54CJA3';

  // 1. Verify Firestore document
  const docSnap = await directDb.collection('admins').doc(uid).get();
  if (!docSnap.exists) {
    throw new Error(`Admin doc for UID ${uid} not found!`);
  }
  const data = docSnap.data();

  console.log('[Firestore Profile Check]');
  console.log(`  Name: ${data.name}`);
  console.log(`  Email: ${data.email}`);
  console.log(`  Role: ${data.role}`);
  console.log(`  isPlatformAdmin: ${data.isPlatformAdmin}`);
  console.log(`  isFirstAdmin: ${data.isFirstAdmin}`);
  console.log(`  isActive: ${data.isActive}`);
  console.log(`  accountStatus: ${data.accountStatus}`);
  console.log(`  approvalStatus: ${data.approvalStatus}`);

  if (data.role !== 'ADMIN') throw new Error('Expected role == ADMIN');
  if (data.isPlatformAdmin !== true) throw new Error('Expected isPlatformAdmin == true');
  if (data.isActive !== true) throw new Error('Expected isActive == true');
  if (data.accountStatus !== 'active') throw new Error('Expected accountStatus == active');
  console.log('  ✅ [PASS] Firestore profile fields verified intact and well-formed.');

  // 2. Verify Auth claims
  const authUser = await adminAuth.getUser(uid);
  console.log('\n[Firebase Auth Claims Check]');
  console.log(`  Auth UID: ${authUser.uid}`);
  console.log(`  Custom Claims: ${JSON.stringify(authUser.customClaims)}`);
  if (!authUser.customClaims?.admin || authUser.customClaims?.role !== 'admin') {
    throw new Error('Expected custom claims { admin: true, role: "admin" }');
  }
  console.log('  ✅ [PASS] Firebase Auth custom claims verified.');

  // 3. Verify access helper function
  console.log('\n[Client Access Helper Check]');
  const mockCurrentUser = {
    uid,
    email: data.email,
    role: 'ADMIN',
    adminData: data
  };
  const isPlatform = isPlatformAdministrator(mockCurrentUser);
  const isStaff = isStaffRole(mockCurrentUser.role);
  console.log(`  isPlatformAdministrator(Dr Jackson Daniel): ${isPlatform}`);
  console.log(`  isStaffRole(Dr Jackson Daniel): ${isStaff}`);
  if (!isPlatform) throw new Error('isPlatformAdministrator must return true!');
  if (!isStaff) throw new Error('isStaffRole must return true!');
  console.log('  ✅ [PASS] Client access helpers recognize platform administrator scope.');

  console.log('\n========================================================================');
  console.log('  DR JACKSON DANIEL AUTHORIZATION VERIFICATION COMPLETED (100%)');
  console.log('========================================================================\n');
  process.exit(0);
}

verifyDrJacksonDaniel().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
