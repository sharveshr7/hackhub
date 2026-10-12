#!/usr/bin/env node

/**
 * HackHub — First Authorized College Administrator Provisioning Script
 * 
 * Secure, audited, one-time bootstrap utility to establish the initial institutional administrator
 * using the Firebase Admin SDK.
 * 
 * Usage:
 *   node scripts/provision-first-admin.mjs --platform-admin --project <projectId> --email <adminEmail> [options]
 * 
 * Options:
 *   --platform-admin        Explicitly confirm platform-wide administrator scope for this account
 *   --project <id>          Firebase Project ID (mandatory; configure FIREBASE_PROJECT_ID to pin the expected project)
 *   --email <email>         Institutional email of the faculty member to promote/provision
 *   --key <path>            Path to Firebase Service Account JSON key (optional if GOOGLE_APPLICATION_CREDENTIALS set)
 *   --token <token>         OAuth access token (optional alternative to service account file)
 *   --name <name>           Full name (optional, defaults to existing profile name or Auth displayName)
 *   --dept <dept>           Academic department (optional, defaults to existing profile)
 *   --designation <title>   Faculty designation (optional, defaults to existing profile)
 *   --faculty-id <id>       College employee/faculty ID (optional, defaults to existing profile)
 *   --institution <name>    College name (optional, defaults to existing profile)
 *   --dry-run               Validate configuration and user status without modifying database
 * 
 * Security Guardrails:
 *   - Explicit Project ID validation prevents accidental modification of wrong environments.
 *   - Verifies user exists in Firebase Auth before granting administrative privileges.
 *   - Prevents student accounts from being mistakenly promoted without explicit confirmation.
 *   - Sets both Firebase Auth Custom Claims (role: 'admin', admin: true) and Firestore profile
 *     (approvalStatus: 'APPROVED', role: 'ADMIN') in exact consistency with firestore.rules.
 *   - Audits provisioning timestamp, approver identifier, and isFirstAdmin flag.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI Arguments
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

const EXPECTED_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
const projectId = args.project || process.env.FIREBASE_PROJECT_ID;
const targetEmail = (args.email || '').trim().toLowerCase();
const serviceAccountPath = args.key || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const accessToken = args.token || process.env.FIREBASE_ACCESS_TOKEN;
const isDryRun = !!args['dry-run'];

async function main() {
  console.log('================================================================');
  console.log('  HACKHUB — SECURE FIRST ADMINISTRATOR PROVISIONING');
  console.log('  KalaignarKarunanidhi Institute Of Technology • College Portal');
  console.log('================================================================\n');

  // 1. Validate Target Project ID
  if (!projectId) {
    console.error('❌ Error: Target Firebase Project ID is required.');
    console.error(`   Provide via --project <projectId> or FIREBASE_PROJECT_ID environment variable.`);
    console.error(`   Current application project: ${EXPECTED_PROJECT_ID}\n`);
    process.exit(1);
  }

  if (!args['platform-admin']) {
    console.error('Error: pass --platform-admin only for the specifically authorized initial platform administrator.');
    process.exit(1);
  }

  if (EXPECTED_PROJECT_ID && projectId !== EXPECTED_PROJECT_ID) {
    console.warn(`⚠️ Warning: Specified project ID (${projectId}) does not match default application project (${EXPECTED_PROJECT_ID}).`);
    console.warn(`   Proceeding with explicit target: ${projectId}\n`);
  }

  // 2. Validate Target Email
  if (!targetEmail) {
    console.error('❌ Error: Administrator email address is required.');
    console.error('   Provide via --email <adminEmail>\n');
    console.error('   Example:');
    console.error(`   node scripts/provision-first-admin.mjs --project ${projectId} --email admin@kitcbe.com --key ./serviceAccountKey.json\n`);
    process.exit(1);
  }

  console.log(`[Config] Target Firebase Project : ${projectId}`);
  console.log(`[Config] Target Admin Email      : ${targetEmail}`);
  console.log(`[Config] Dry Run Mode            : ${isDryRun ? 'ENABLED (Read-Only)' : 'DISABLED (Will execute changes)'}\n`);

  // 3. Load Firebase Admin SDK
  let admin;
  try {
    const adminModule = await import('firebase-admin');
    admin = adminModule.default;
  } catch (err) {
    console.error('❌ Error: firebase-admin package is not installed.');
    console.error('   Run: npm install --save-dev firebase-admin\n');
    process.exit(1);
  }

  // 4. Initialize Firebase Admin App
  try {
    let credential;

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      console.log(`[Auth] Using Service Account JSON key from: ${serviceAccountPath}`);
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      if (serviceAccount.project_id && serviceAccount.project_id !== projectId) {
        console.error(`❌ Error: Service account key project (${serviceAccount.project_id}) does not match target project (${projectId})!`);
        process.exit(1);
      }
      credential = admin.credential.cert(serviceAccount);
    } else if (accessToken) {
      console.log('[Auth] Using provided OAuth access token');
      credential = admin.credential.accessToken(accessToken);
    } else {
      console.log('[Auth] Attempting Application Default Credentials (ADC)...');
      try {
        credential = admin.credential.applicationDefault();
      } catch (adcErr) {
        console.error('❌ Error: No valid authentication credentials found.');
        console.error('   Please provide one of:');
        console.error('   1) --key <path/to/serviceAccountKey.json>');
        console.error('   2) GOOGLE_APPLICATION_CREDENTIALS environment variable');
        console.error('   3) --token <oauth_access_token>\n');
        process.exit(1);
      }
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential,
        projectId
      });
    }
    console.log('✅ Firebase Admin SDK initialized successfully.\n');
  } catch (initErr) {
    console.error('❌ Error initializing Firebase Admin SDK:', initErr.message);
    process.exit(1);
  }

  const auth = admin.auth();
  const db = admin.firestore();

  // 5. Look up User in Firebase Authentication
  console.log(`[Step 1] Verifying user account in Firebase Authentication for: ${targetEmail}...`);
  let authUser;
  try {
    authUser = await auth.getUserByEmail(targetEmail);
    console.log(`✅ Firebase Auth user verified:`);
    console.log(`   - UID           : ${authUser.uid}`);
    console.log(`   - Email         : ${authUser.email}`);
    console.log(`   - Display Name  : ${authUser.displayName || '(none)'}`);
    console.log(`   - Current Claims: ${JSON.stringify(authUser.customClaims || {})}`);
    console.log(`   - Created At    : ${authUser.metadata.creationTime}`);
  } catch (authErr) {
    if (authErr.code === 'auth/user-not-found') {
      console.error(`❌ Error: No user account found in Firebase Auth for "${targetEmail}".`);
      console.error(`   The administrator must first register an account on the HackHub portal:`);
      console.error(`   1. Open the portal: /admin/signup`);
      console.error(`   2. Complete faculty coordinator registration with this email`);
      console.error(`   3. Re-run this script to promote that registered account to authorized administrator.\n`);
      process.exit(1);
    }
    console.error('❌ Error fetching user from Firebase Auth:', authErr.message);
    process.exit(1);
  }

  const uid = authUser.uid;

  // 6. Check for Student Account Collision
  console.log(`\n[Step 2] Checking students collection to prevent role collision...`);
  const studentDocRef = db.collection('students').doc(uid);
  const studentDocSnap = await studentDocRef.get();

  if (studentDocSnap.exists) {
    const studentData = studentDocSnap.data();
    console.warn(`⚠️ WARNING: A student record exists for UID ${uid} (${studentData.name || 'Student'}).`);
    console.warn(`   Elevating an active student account to institutional administrator directly is not recommended.`);
    console.warn(`   In HackHub, faculty administrators should maintain distinct credentials from students.`);
    if (!args['force']) {
      console.error(`❌ Aborting. Use --force if you intentionally wish to override this safeguard.\n`);
      process.exit(1);
    }
  } else {
    console.log(`✅ Clean student boundary: No student profile found for this UID.`);
  }

  // 7. Inspect Current Admin Document in Firestore
  console.log(`\n[Step 3] Inspecting Firestore admins/${uid}...`);
  const adminDocRef = db.collection('admins').doc(uid);
  const adminDocSnap = await adminDocRef.get();

  let existingAdminData = {};
  if (adminDocSnap.exists) {
    existingAdminData = adminDocSnap.data() || {};
    console.log(`ℹ️ Found existing admin/faculty registration document:`);
    console.log(`   - Name           : ${existingAdminData.name || '(unspecified)'}`);
    console.log(`   - Faculty ID     : ${existingAdminData.facultyId || '(unspecified)'}`);
    console.log(`   - Designation    : ${existingAdminData.designation || '(unspecified)'}`);
    console.log(`   - Department     : ${existingAdminData.department || '(unspecified)'}`);
    console.log(`   - Phone          : ${existingAdminData.phone || '(unspecified)'}`);
    console.log(`   - Current Status : ${existingAdminData.approvalStatus || 'PENDING'}`);
    console.log(`   - Current Role   : ${existingAdminData.role || 'admin'}`);
  } else {
    console.log(`ℹ️ No document currently in admins/${uid}. A new approved administrator profile will be created.`);
  }

  if (isDryRun) {
    console.log('\n[Dry Run] Validation successful. No changes were committed to Firebase Auth or Firestore.');
    process.exit(0);
  }

  const legacyHodRecord = String(existingAdminData.role || '').toUpperCase() === 'HOD' || existingAdminData.isHod === true ||
    String(existingAdminData.designation || '').toLowerCase().includes('head of department');
  if (legacyHodRecord) {
    console.error('This account contains a legacy HOD profile. Select the authorized initial administrator account explicitly; this script will not convert HOD access into platform access.');
    process.exit(1);
  }
  const targetRole = 'ADMIN';

  // 8. Grant Authorization Claims in Firebase Auth
  console.log(`\n[Step 4] Granting Firebase Auth Custom Claims: { role: '${targetRole}', admin: true }...`);
  try {
    const existingClaims = authUser.customClaims || {};
    const { hod: _legacyHodClaim, isHod: _legacyIsHodClaim, ...safeClaims } = existingClaims;
    const newClaims = {
      ...safeClaims,
      role: targetRole,
      admin: true
    };
    await auth.setCustomUserClaims(uid, newClaims);
    console.log('✅ Firebase Auth Custom Claims applied successfully.');
  } catch (claimErr) {
    console.error('❌ Error setting custom user claims:', claimErr.message);
    process.exit(1);
  }

  // 9. Update/Create Administrator Profile in Firestore
  console.log(`\n[Step 5] Writing approved administrator document to admins/${uid}...`);
  const FieldValue = admin.firestore.FieldValue;

  const adminProfileData = {
    uid: uid,
    email: targetEmail,
    name: args.name || existingAdminData.name || authUser.displayName || '',
    department: args.dept || existingAdminData.department || '',
    designation: args.designation || existingAdminData.designation || 'Institutional Administrator',
    facultyId: args['faculty-id'] || existingAdminData.facultyId || '',
    phone: existingAdminData.phone || '',
    institution: args.institution || existingAdminData.institution || '',
    role: targetRole,
    isPlatformAdmin: true,
    isDepartmentApprover: false,
    isActive: true,
    approvalStatus: 'APPROVED',
    approvedAt: FieldValue.serverTimestamp(),
    approvedBy: 'System Bootstrap CLI (Explicit Platform Administrator Provisioning)',
    isFirstAdmin: true,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (!existingAdminData.createdAt) {
    adminProfileData.createdAt = FieldValue.serverTimestamp();
  }

  try {
    await adminDocRef.set({ ...adminProfileData, isHod: FieldValue.delete() }, { merge: true });
    console.log(`✅ Firestore admins/${uid} updated with approvalStatus: 'APPROVED' and role: '${targetRole}'.`);

    // Write audit log
    const auditLogRef = db.collection('audit_logs').doc();
    await auditLogRef.set({
      id: auditLogRef.id,
      actorUid: 'CLI_BOOTSTRAP',
      actorEmail: 'system@cli',
      actorName: 'System Bootstrap CLI',
      actorRole: 'SUPER_ADMIN',
      targetUid: uid,
      targetEmail: targetEmail,
      targetName: adminProfileData.name,
      action: 'INITIAL_ADMIN_PROVISIONED',
      timestamp: FieldValue.serverTimestamp(),
      details: {
        role: targetRole,
        department: adminProfileData.department,
        designation: adminProfileData.designation,
        isPlatformAdmin: true
      }
    });
    console.log(`✅ Immutable audit log created with action: 'INITIAL_ADMIN_PROVISIONED'.`);
  } catch (docErr) {
    console.error('❌ Error writing to Firestore admins collection:', docErr.message);
    process.exit(1);
  }

  // 10. Verify Changes
  console.log(`\n[Step 6] Verifying updated authorization state...`);
  const verifyDocSnap = await adminDocRef.get();
  const verifyData = verifyDocSnap.data();
  const updatedAuthUser = await auth.getUser(uid);

  if (verifyData?.approvalStatus === 'APPROVED' && updatedAuthUser.customClaims?.admin === true) {
    console.log('================================================================');
    console.log('🎉 PROVISIONING SUCCESSFUL!');
    console.log('================================================================');
    console.log(`Administrator Details:`);
    console.log(`  Name            : ${verifyData.name}`);
    console.log(`  Email           : ${verifyData.email}`);
    console.log(`  Designation     : ${verifyData.designation}`);
    console.log(`  Department      : ${verifyData.department}`);
    console.log(`  Faculty ID      : ${verifyData.facultyId}`);
    console.log(`  Approval Status : ${verifyData.approvalStatus}`);
    console.log(`  Role            : ${verifyData.role}`);
    console.log(`  Claims Verified : role=${updatedAuthUser.customClaims.role}, admin=${updatedAuthUser.customClaims.admin}`);
    console.log('\nNext Steps:');
    console.log(`  1. The administrator can now navigate to: /admin/login`);
    console.log(`  2. Sign in with ${targetEmail} and their existing password.`);
    console.log(`  3. Open the Faculty Approvals screen to review and approve subsequent coordinators.`);
    console.log('================================================================\n');
  } else {
    console.error('❌ Verification check failed. Profile or claims were not updated correctly.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error during provisioning execution:', err);
  process.exit(1);
});
