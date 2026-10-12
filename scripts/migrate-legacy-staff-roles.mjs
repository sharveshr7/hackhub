#!/usr/bin/env node

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const getValue = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const projectId = getValue('project') || process.env.FIREBASE_PROJECT_ID;
const platformAdminUid = getValue('platform-admin-uid');
const apply = hasFlag('apply');

if (!projectId) throw new Error('Set FIREBASE_PROJECT_ID or pass --project <id>.');
if (apply && !platformAdminUid) throw new Error('Applying the migration requires an explicitly reviewed --platform-admin-uid.');

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const credential = serviceAccountJson
  ? cert(JSON.parse(serviceAccountJson))
  : applicationDefault();
const app = getApps()[0] || initializeApp({ credential, projectId });
const db = getFirestore(app);
const auth = getAuth(app);
const snapshot = await db.collection('admins').get();

const changes = snapshot.docs.map((document) => {
  const data = document.data();
  const isLegacyHod = String(data.role || '').toUpperCase() === 'HOD' || data.isHod === true;
  if (apply && document.id === platformAdminUid && isLegacyHod) {
    throw new Error(`Refusing to grant platform access to legacy HOD record ${document.id}; choose a separately authorized account.`);
  }
  const isPlatformAdmin = document.id === platformAdminUid;
  return {
    ref: document.ref,
    uid: document.id,
    oldRole: String(data.role || 'missing'),
    isLegacyHod,
    isPlatformAdmin,
    nextRole: isPlatformAdmin ? 'ADMIN' : 'FACULTY',
    isDepartmentApprover: isLegacyHod ? false : data.isDepartmentApprover === true
  };
});

if (platformAdminUid && !changes.some((change) => change.uid === platformAdminUid)) {
  throw new Error(`No admins/${platformAdminUid} record exists in project ${projectId}.`);
}

console.log(`Project: ${projectId}`);
console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
console.log(`Staff records reviewed: ${changes.length}`);
for (const change of changes) {
  console.log(`${change.uid}: ${change.oldRole} -> ${change.nextRole}${change.isPlatformAdmin ? ' (explicit platform administrator)' : ''}${change.isLegacyHod ? ' (legacy HOD fields removed; record retained)' : ''}`);
}

if (!apply) {
  console.log('Dry run only. No Firestore or Firebase Auth records were changed.');
  process.exit(0);
}

for (const change of changes) {
  await change.ref.set({
    role: change.nextRole,
    isPlatformAdmin: change.isPlatformAdmin,
    isDepartmentApprover: change.isDepartmentApprover,
    isHod: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  try {
    const user = await auth.getUser(change.uid);
    const claims = { ...(user.customClaims || {}) };
    delete claims.hod;
    delete claims.isHod;
    delete claims.admin;
    claims.role = change.nextRole;
    await auth.setCustomUserClaims(change.uid, claims);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
    console.warn(`No Firebase Auth account found for admins/${change.uid}; Firestore profile was normalized.`);
  }
}

console.log(`Updated ${changes.length} staff profile(s). Existing records were retained; only the explicitly selected UID received platform scope.`);
