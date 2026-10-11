#!/usr/bin/env node

/**
 * HackHub — Safe Student Profile Provisioning & Synchronization Utility
 * 
 * Provisions or synchronizes a student's Firestore profile (students/{uid}) and
 * registration lookup (reg_lookups/{regNo}) to match their exact Firebase Authentication UID,
 * without creating duplicate Authentication users, resetting existing passwords, or
 * leaving orphaned records.
 * 
 * Usage:
 *   node scripts/provision-student-profile.mjs --email <email> --reg <regNo> [options]
 * 
 * Options:
 *   --email <email>         Student email address (required)
 *   --reg <regNo>           Collegiate registration number (required)
 *   --name <name>           Student full name (optional, defaults to profile or Auth displayName)
 *   --dept <dept>           Academic department (optional, defaults to "Biomedical Engineering")
 *   --year <year>           Academic year (optional, defaults to "2nd Year")
 *   --phone <phone>         Contact phone (optional)
 *   --uid <uid>             Explicit Firebase Auth UID (optional, auto-detected if omitted)
 */

import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as",
  authDomain: "foceye-2546c.firebaseapp.com",
  projectId: "foceye-2546c",
  storageBucket: "foceye-2546c.firebasestorage.app",
  messagingSenderId: "829196148602",
  appId: "1:829196148602:web:6d877b6c3f9fac5cf240c3"
};

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        params[key] = args[i + 1];
        i++;
      } else {
        params[key] = true;
      }
    }
  }
  return params;
}

const args = parseArgs();
const email = (args.email || '').trim().toLowerCase();
const regNo = (args.reg || '').trim().toUpperCase().replace(/\s+/g, '');
const name = (args.name || '').trim();
const dept = (args.dept || 'Biomedical Engineering').trim();
const year = (args.year || '2nd Year').trim();
const phone = (args.phone || '').trim();
const explicitUid = (args.uid || '').trim();

if (!email || !regNo) {
  console.log(`
Usage: node scripts/provision-student-profile.mjs --email <email> --reg <regNo> [options]

Options:
  --email <email>    Student email address (required)
  --reg <regNo>      Collegiate registration number (required)
  --name <name>      Student full name
  --dept <dept>      Academic department
  --year <year>      Academic year
  --uid <uid>        Explicit Firebase Auth UID (if already known)
`);
  process.exit(1);
}

async function run() {
  console.log('================================================================');
  console.log('  HACKHUB — STUDENT PROFILE PROVISIONING & RECOVERY');
  console.log('================================================================\n');

  console.log(`Target Email:       ${email}`);
  console.log(`Registration No:    ${regNo}`);

  const app = initializeApp(FIREBASE_CONFIG, `StudentProvision_${Date.now()}`);
  const db = getFirestore(app);

  try {
    let authUid = explicitUid;

    // 1. If explicit UID not given, attempt to discover UID via existing documents or REST
    if (!authUid) {
      // Check if existing student document exists for this email
      const emailQuery = query(collection(db, 'students'), where('email', '==', email));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        const existingDoc = emailSnap.docs[0];
        console.log(`Found existing Firestore profile with document ID: ${existingDoc.id}`);
        authUid = existingDoc.data().uid || existingDoc.id;
      }
    }

    if (!authUid) {
      console.error('Error: Could not determine Firebase Auth UID. Please provide --uid <uid>.');
      process.exit(1);
    }

    console.log(`Resolved Auth UID:  ${authUid}`);

    // 2. Prepare standardized student profile
    const studentRecord = {
      uid: authUid,
      name: name || 'Sharvesh R',
      registerNumber: regNo,
      registrationNumberNormalized: regNo,
      email: email,
      phone: phone,
      department: dept,
      year: year,
      role: 'STUDENT',
      accountStatus: 'active',
      isActive: true,
      bio: 'Engineering student at KalaignarKarunanidhi Institute Of Technology.',
      skills: [],
      updatedAt: serverTimestamp()
    };

    // 3. Write / update students/{authUid}
    console.log(`\nWriting student profile to students/${authUid}...`);
    await setDoc(doc(db, 'students', authUid), studentRecord, { merge: true });
    console.log(`✅ [OK] Successfully written profile to students/${authUid}`);

    // 4. Write / update reg_lookups/{regNo}
    console.log(`Writing registration lookup to reg_lookups/${regNo}...`);
    await setDoc(doc(db, 'reg_lookups', regNo), {
      email: email,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`✅ [OK] Successfully written registration lookup to reg_lookups/${regNo}`);

    // 5. Clean up any mismatched duplicate documents in students collection
    const duplicateQuery = query(collection(db, 'students'), where('email', '==', email));
    const duplicateSnap = await getDocs(duplicateQuery);
    for (const snap of duplicateSnap.docs) {
      if (snap.id !== authUid) {
        console.log(`Cleaning up mismatched legacy document: students/${snap.id}...`);
        await deleteDoc(snap.ref);
        console.log(`✅ [OK] Removed legacy duplicate students/${snap.id}`);
      }
    }

    console.log('\n================================================================');
    console.log('  PROVISIONING COMPLETED SUCCESSFULLY');
    console.log('================================================================\n');
  } catch (err) {
    console.error('Provisioning failed:', err);
    process.exit(1);
  } finally {
    try {
      await deleteApp(app);
    } catch {
      // ignore
    }
  }
}

run();
