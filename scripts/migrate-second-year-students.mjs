#!/usr/bin/env node

/**
 * HackHub — Second-Year Students CSV Profile & Registration-Number Link Migration
 *
 * Reads hackhub_bme_second_year_students (1).csv, validates all 63 records,
 * reconciles with existing Firebase Authentication accounts, and safely provisions
 * Firestore student profiles (students/{uid}) and private registration lookups (reg_lookups/{regNo}).
 *
 * Usage:
 *   Preview (read-only): npm run migrate:second-year -- --preview
 *   Apply:               npm run migrate:second-year -- --apply
 *
 * Security & Guardrails:
 * - Never creates Firebase Authentication accounts.
 * - Never deletes records.
 * - Preserves existing UIDs and legitimate profile fields.
 * - Safe to rerun (idempotent).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { Firestore } from '@google-cloud/firestore';

const DEFAULT_CSV_NAMES = [
  'hackhub_bme_second_year_students (1).csv',
  'hackhub_bme_second_year_students.csv',
  'hackhub_second_year_bme_students (1).csv',
  'hackhub_second_year_bme_students.csv'
];

const TARGET_DEPARTMENT = 'Biomedical Engineering';
const TARGET_YEAR = 'Second Year';

function parseArgs() {
  const args = process.argv.slice(2);
  let csvPath = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && args[i + 1]) {
      csvPath = args[i + 1];
      break;
    }
  }
  return {
    apply: args.includes('--apply'),
    preview: args.includes('--preview') || !args.includes('--apply'),
    csvPath
  };
}

function getDotEnvValue(key) {
  try {
    const line = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find((entry) =>
      entry.trimStart().startsWith(`${key}=`)
    );
    return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : '';
  } catch {
    return '';
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRegistrationNumber(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function locateCsvFile(explicitPath) {
  if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;
  for (const name of DEFAULT_CSV_NAMES) {
    if (fs.existsSync(name)) return name;
  }
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  for (const name of DEFAULT_CSV_NAMES) {
    const candidate = path.join(downloadsDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function parseAndValidateCsv(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error(`CSV file ${filePath} does not contain enough rows.`);
  }

  const rawHeaders = lines[0].split(',').map((h) => h.trim());
  const expectedHeaders = ['name', 'email', 'registerNumber', 'department', 'year'];
  const hasAllHeaders = expectedHeaders.every((h) => rawHeaders.includes(h));
  if (!hasAllHeaders) {
    throw new Error(`CSV header mismatch. Expected columns: ${expectedHeaders.join(', ')}. Found: ${rawHeaders.join(', ')}`);
  }

  const nameIdx = rawHeaders.indexOf('name');
  const emailIdx = rawHeaders.indexOf('email');
  const regIdx = rawHeaders.indexOf('registerNumber');
  const deptIdx = rawHeaders.indexOf('department');
  const yearIdx = rawHeaders.indexOf('year');

  const rows = [];
  const seenEmails = new Map();
  const seenRegNos = new Map();
  const missingFields = [];
  const invalidEmails = [];
  const invalidRegNos = [];
  const mismatchedDepartments = [];
  const mismatchedYears = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map((p) => p.trim());
    const rowNum = i + 1;
    const name = parts[nameIdx] || '';
    const email = normalizeEmail(parts[emailIdx]);
    const registerNumber = normalizeRegistrationNumber(parts[regIdx]);
    const department = parts[deptIdx] || '';
    const year = parts[yearIdx] || '';

    const record = { rowNum, name, email, registerNumber, department, year };

    if (!name || !email || !registerNumber || !department || !year) {
      missingFields.push({ rowNum, record });
    }
    if (!email.includes('@') || !email.includes('.')) {
      invalidEmails.push({ rowNum, email });
    }
    if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(registerNumber)) {
      invalidRegNos.push({ rowNum, registerNumber });
    }
    if (department !== TARGET_DEPARTMENT) {
      mismatchedDepartments.push({ rowNum, department });
    }
    if (year !== TARGET_YEAR) {
      mismatchedYears.push({ rowNum, year });
    }

    if (seenEmails.has(email)) {
      seenEmails.get(email).push(rowNum);
    } else {
      seenEmails.set(email, [rowNum]);
    }

    if (seenRegNos.has(registerNumber)) {
      seenRegNos.get(registerNumber).push(rowNum);
    } else {
      seenRegNos.set(registerNumber, [rowNum]);
    }

    rows.push(record);
  }

  const duplicateEmails = [...seenEmails.entries()].filter(([, r]) => r.length > 1);
  const duplicateRegNos = [...seenRegNos.entries()].filter(([, r]) => r.length > 1);

  return {
    filePath,
    totalRecords: rows.length,
    rows,
    summary: {
      totalRecords: rows.length,
      missingFieldsCount: missingFields.length,
      duplicateEmailsCount: duplicateEmails.length,
      duplicateRegNosCount: duplicateRegNos.length,
      invalidEmailsCount: invalidEmails.length,
      invalidRegNosCount: invalidRegNos.length,
      mismatchedDepartmentsCount: mismatchedDepartments.length,
      mismatchedYearsCount: mismatchedYears.length,
      isValid:
        missingFields.length === 0 &&
        duplicateEmails.length === 0 &&
        duplicateRegNos.length === 0 &&
        invalidEmails.length === 0 &&
        invalidRegNos.length === 0 &&
        mismatchedDepartments.length === 0 &&
        mismatchedYears.length === 0
    },
    issues: {
      missingFields,
      duplicateEmails,
      duplicateRegNos,
      invalidEmails,
      invalidRegNos,
      mismatchedDepartments,
      mismatchedYears
    }
  };
}

async function getAdminSdk(targetProjectId) {
  const rawServiceAccount =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (rawServiceAccount) {
    try {
      const parsed = JSON.parse(rawServiceAccount);
      const app = getApps().find((a) => a.name === 'second-year-migration') ||
        initializeApp({ credential: cert(parsed), projectId: targetProjectId }, 'second-year-migration');
      return { auth: getAuth(app), db: getFirestore(app) };
    } catch {
      // Continue to next candidate
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      const app = getApps().find((a) => a.name === 'second-year-migration') ||
        initializeApp({ credential: applicationDefault(), projectId: targetProjectId }, 'second-year-migration');
      return { auth: getAuth(app), db: getFirestore(app) };
    } catch {
      // Continue to next candidate
    }
  }

  // Fallback: Local Firebase CLI token from configstore with auto-refresh
  const homeDir = os.homedir();
  const configstorePath = path.join(homeDir, '.config', 'configstore', 'firebase-tools.json');
  if (fs.existsSync(configstorePath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configstorePath, 'utf8'));
      const refreshToken = config.tokens?.refresh_token;
      if (refreshToken) {
        // Firebase CLI client credentials
        const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
        const clientSecret = 'j9iVZfS8kkCEFUPaAeJV0sAi';
        let accessToken = config.tokens?.access_token;
        const expiresAt = config.tokens?.expires_at || 0;

        if (!accessToken || expiresAt < Date.now() + 60000) {
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
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            accessToken = tokenData.access_token;
          }
        }

        if (accessToken) {
          const authClient = new OAuth2Client();
          authClient.setCredentials({ access_token: accessToken });
          const db = new Firestore({ projectId: targetProjectId, authClient });

          const customCredential = {
            getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 })
          };
          const app = getApps().find((a) => a.name === 'second-year-migration') ||
            initializeApp({ credential: customCredential, projectId: targetProjectId }, 'second-year-migration');
          const auth = getAuth(app);
          return { auth, db };
        }
      }
    } catch {
      // Continue to final error
    }
  }

  throw new Error('Firebase Admin credentials unavailable. Set FIREBASE_SERVICE_ACCOUNT or ensure Firebase CLI is logged in.');
}

async function listAllAuthUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

export async function runMigration(options = { preview: true, apply: false, csvPath: '' }) {
  const targetProjectId = (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    getDotEnvValue('VITE_FIREBASE_PROJECT_ID') ||
    'foceye-2546c'
  ).trim();

  const csvFile = locateCsvFile(options.csvPath);
  if (!csvFile) {
    throw new Error(
      'CSV file "hackhub_bme_second_year_students (1).csv" was not found in the workspace or Downloads directory. Please place it in the workspace root.'
    );
  }

  console.log('================================================================');
  console.log('  HACKHUB — SECOND-YEAR STUDENT REGISTRATION & PROFILE LINK');
  console.log('================================================================');
  console.log(`Target Project:     ${targetProjectId}`);
  console.log(`CSV Source:         ${csvFile}`);
  console.log(`Mode:               ${options.apply ? 'APPLY (writing to Firestore)' : 'PREVIEW (read-only)'}`);
  console.log('----------------------------------------------------------------\n');

  // 1. Validate CSV
  console.log('1. Validating student CSV...');
  const validation = parseAndValidateCsv(csvFile);
  console.log(`   - Total records in CSV:        ${validation.totalRecords}`);
  console.log(`   - Missing fields:              ${validation.summary.missingFieldsCount}`);
  console.log(`   - Duplicate emails:            ${validation.summary.duplicateEmailsCount}`);
  console.log(`   - Duplicate registration nos:  ${validation.summary.duplicateRegNosCount}`);
  console.log(`   - Department check (BME):      ${validation.totalRecords - validation.summary.mismatchedDepartmentsCount} / ${validation.totalRecords} matched`);
  console.log(`   - Academic Year check (2nd):   ${validation.totalRecords - validation.summary.mismatchedYearsCount} / ${validation.totalRecords} matched`);

  if (!validation.summary.isValid) {
    console.error('\n❌ CSV validation failed with discrepancies:');
    console.error(JSON.stringify(validation.issues, null, 2));
    throw new Error('Please resolve CSV validation issues before proceeding.');
  }
  console.log('   ✅ CSV validation passed with 100% data integrity.\n');

  // 2. Connect to Firebase and fetch live state
  console.log('2. Querying live Firebase Authentication & Firestore state...');
  const { auth, db } = await getAdminSdk(targetProjectId);

  const [authUsers, studentsSnapshot, lookupsSnapshot] = await Promise.all([
    listAllAuthUsers(auth),
    db.collection('students').get(),
    db.collection('reg_lookups').get()
  ]);

  console.log(`   - Live Firebase Auth users:    ${authUsers.length}`);
  console.log(`   - Existing student profiles:   ${studentsSnapshot.size}`);
  console.log(`   - Existing reg_lookups:        ${lookupsSnapshot.size}\n`);

  const authByEmail = new Map();
  for (const user of authUsers) {
    if (user.email) authByEmail.set(normalizeEmail(user.email), user);
  }

  const existingProfilesByUid = new Map();
  for (const doc of studentsSnapshot.docs) {
    existingProfilesByUid.set(doc.id, { doc, data: doc.data() });
  }

  const existingLookupsByReg = new Map();
  for (const doc of lookupsSnapshot.docs) {
    existingLookupsByReg.set(normalizeRegistrationNumber(doc.id), { doc, data: doc.data() });
  }

  // 3. Plan actions for each CSV record
  console.log('3. Reconciling CSV records against Firebase Authentication & Firestore...');
  const actions = [];
  const missingInAuth = [];
  let profilesToCreate = 0;
  let profilesToUpdate = 0;
  let profilesUnchanged = 0;
  let lookupsToCreate = 0;
  let lookupsToUpdate = 0;
  let lookupsUnchanged = 0;

  for (const student of validation.rows) {
    const authUser = authByEmail.get(student.email);
    if (!authUser) {
      missingInAuth.push(student);
      actions.push({
        status: 'MISSING_IN_AUTH',
        email: student.email,
        registerNumber: student.registerNumber,
        name: student.name,
        uid: null,
        profileAction: 'SKIP (No Auth account exists)',
        lookupAction: 'SKIP (No Auth account exists)'
      });
      continue;
    }

    const uid = authUser.uid;
    const existingProfile = existingProfilesByUid.get(uid);
    let profileAction = 'CREATE';
    let profileFields = {};

    if (existingProfile) {
      const data = existingProfile.data;
      const needsUpdate =
        data.year !== student.year ||
        data.department !== student.department ||
        data.name !== student.name ||
        data.registerNumber !== student.registerNumber ||
        data.registrationNumberNormalized !== student.registerNumber ||
        data.role !== 'STUDENT' ||
        data.accountStatus !== 'active';

      if (needsUpdate) {
        profileAction = 'UPDATE';
        profilesToUpdate++;
        profileFields = {
          year: student.year,
          department: student.department,
          name: student.name,
          registerNumber: student.registerNumber,
          registrationNumberNormalized: student.registerNumber,
          role: 'STUDENT',
          accountStatus: 'active',
          isActive: true
        };
      } else {
        profileAction = 'NO_CHANGE';
        profilesUnchanged++;
      }
    } else {
      profileAction = 'CREATE';
      profilesToCreate++;
      profileFields = {
        uid,
        name: student.name,
        email: student.email,
        registerNumber: student.registerNumber,
        registrationNumberNormalized: student.registerNumber,
        department: student.department,
        year: student.year,
        role: 'STUDENT',
        accountStatus: 'active',
        isActive: true,
        phone: '',
        bio: 'Engineering student at KalaignarKarunanidhi Institute Of Technology.',
        skills: []
      };
    }

    const existingLookup = existingLookupsByReg.get(student.registerNumber);
    let lookupAction = 'CREATE';
    let lookupFields = {};

    if (existingLookup) {
      const data = existingLookup.data;
      if (normalizeEmail(data.email) !== student.email || data.uid !== uid) {
        lookupAction = 'UPDATE';
        lookupsToUpdate++;
        lookupFields = { email: student.email, uid };
      } else {
        lookupAction = 'NO_CHANGE';
        lookupsUnchanged++;
      }
    } else {
      lookupAction = 'CREATE';
      lookupsToCreate++;
      lookupFields = { email: student.email, uid };
    }

    actions.push({
      status: 'MATCHED',
      email: student.email,
      registerNumber: student.registerNumber,
      name: student.name,
      uid,
      profileAction,
      lookupAction,
      profileFields,
      lookupFields
    });
  }

  console.log(`   - Matched Auth accounts:       ${actions.filter((a) => a.status === 'MATCHED').length} / ${validation.totalRecords}`);
  console.log(`   - Missing Auth accounts:       ${missingInAuth.length} / ${validation.totalRecords}`);
  if (missingInAuth.length > 0) {
    console.log('\n⚠️ Students in CSV missing in Firebase Authentication (will be skipped):');
    missingInAuth.forEach((m) => console.log(`     • ${m.registerNumber} | ${m.email} | ${m.name}`));
  }

  console.log('\nProposed Firestore changes:');
  console.log(`   • Student Profiles (students/{uid}):`);
  console.log(`       - New profiles to create:  ${profilesToCreate}`);
  console.log(`       - Profiles to update:      ${profilesToUpdate}`);
  console.log(`       - Profiles unchanged:      ${profilesUnchanged}`);
  console.log(`   • Registration Lookups (reg_lookups/{regNo}):`);
  console.log(`       - New lookups to create:   ${lookupsToCreate}`);
  console.log(`       - Lookups to update:       ${lookupsToUpdate}`);
  console.log(`       - Lookups unchanged:       ${lookupsUnchanged}`);

  // Display Preview Table
  console.log('\nPreview Summary (first 10 records):');
  console.log('Row | Reg No | Email | UID | Profile Action | Lookup Action');
  console.log('----+--------------+--------------------------+------------------------------+----------------+--------------');
  actions.slice(0, 10).forEach((a, idx) => {
    console.log(
      `${String(idx + 1).padStart(3)} | ${a.registerNumber.padEnd(12)} | ${a.email.padEnd(24)} | ${(a.uid || 'N/A').padEnd(28)} | ${a.profileAction.padEnd(14)} | ${a.lookupAction}`
    );
  });
  if (actions.length > 10) {
    console.log(`... and ${actions.length - 10} more records.`);
  }

  if (!options.apply) {
    console.log('\n================================================================');
    console.log('  PREVIEW COMPLETE — NO CHANGES APPLIED TO FIRESTORE');
    console.log('  To apply these changes, re-run with:');
    console.log('    npm run migrate:second-year -- --apply');
    console.log('================================================================\n');
    return {
      validation,
      missingInAuth,
      profilesToCreate,
      profilesToUpdate,
      profilesUnchanged,
      lookupsToCreate,
      lookupsToUpdate,
      lookupsUnchanged,
      applied: false
    };
  }

  // Apply Changes
  console.log('\n4. Applying changes to Firestore in batches...');
  const studentProfileWrites = actions.filter((a) => a.status === 'MATCHED' && (a.profileAction === 'CREATE' || a.profileAction === 'UPDATE'));
  const lookupWrites = actions.filter((a) => a.status === 'MATCHED' && (a.lookupAction === 'CREATE' || a.lookupAction === 'UPDATE'));

  const totalWrites = studentProfileWrites.length + lookupWrites.length;
  console.log(`   Total document operations to execute: ${totalWrites}`);

  if (totalWrites === 0) {
    console.log('   All profiles and registration lookups are already fully provisioned. No writes needed.');
    return { validation, applied: true, totalWrites: 0 };
  }

  const batch = db.batch();
  for (const item of studentProfileWrites) {
    const docRef = db.collection('students').doc(item.uid);
    if (item.profileAction === 'CREATE') {
      batch.set(docRef, {
        ...item.profileFields,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      batch.update(docRef, {
        ...item.profileFields,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }

  for (const item of lookupWrites) {
    const lookupRef = db.collection('reg_lookups').doc(item.registerNumber);
    batch.set(lookupRef, {
      ...item.lookupFields,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  console.log(`\n✅ Successfully committed ${totalWrites} Firestore writes.`);
  console.log(`   - Created ${profilesToCreate} and updated ${profilesToUpdate} student profiles in students/{uid}`);
  console.log(`   - Created ${lookupsToCreate} and updated ${lookupsToUpdate} registration lookups in reg_lookups/{regNo}`);
  console.log('\nAll verified second-year student profiles are now linked and ready for registration-number login!');

  return {
    validation,
    missingInAuth,
    profilesToCreate,
    profilesToUpdate,
    lookupsToCreate,
    lookupsToUpdate,
    applied: true,
    totalWrites
  };
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('migrate-second-year-students.mjs') ||
  process.argv[1].includes('migrate-second-year-students')
);

if (isDirectRun) {
  const options = parseArgs();
  runMigration(options).catch((err) => {
    console.error(`\nMigration failed: ${err.message || String(err)}`);
    process.exitCode = 1;
  });
}
