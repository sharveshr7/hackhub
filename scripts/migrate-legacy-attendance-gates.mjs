#!/usr/bin/env node

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const projectIndex = args.indexOf('--project');
const projectId = (projectIndex >= 0 ? args[projectIndex + 1] : undefined) || process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('Set FIREBASE_PROJECT_ID or pass --project <id>.');

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const credential = serviceAccountJson ? cert(JSON.parse(serviceAccountJson)) : applicationDefault();
const app = getApps()[0] || initializeApp({ credential, projectId });
const db = getFirestore(app);
const snapshot = await db.collection('hackathons').get();
const legacy = snapshot.docs.filter((document) => {
  const data = document.data();
  return typeof data.attendanceCode === 'string' || typeof data.attendanceOpen === 'boolean';
});

console.log(`Project: ${projectId}`);
console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
console.log(`Hackathons with legacy public gate fields: ${legacy.length}`);
legacy.forEach((document) => console.log(`  ${document.id}: public gate fields will be moved to attendance_gates/${document.id} and removed from hackathons/${document.id}`));

if (!apply) {
  console.log('Dry run only. No Firestore records were changed.');
  process.exit(0);
}

for (let start = 0; start < legacy.length; start += 250) {
  const batch = db.batch();
  for (const document of legacy.slice(start, start + 250)) {
    const data = document.data();
    const gateRef = db.collection('attendance_gates').doc(document.id);
    batch.set(gateRef, {
      hackathonId: document.id,
      attendanceOpen: data.attendanceOpen === true,
      ...(data.attendanceOpen === true && data.attendanceCode ? { attendanceCode: data.attendanceCode } : {}),
      migratedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    batch.update(document.ref, {
      attendanceCode: FieldValue.delete(),
      attendanceOpen: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  await batch.commit();
}

console.log(`Migrated ${legacy.length} hackathon attendance gate(s).`);
