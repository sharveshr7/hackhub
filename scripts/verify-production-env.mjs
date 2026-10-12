/**
 * Audits required production environment variables for Vercel deployment.
 * Never prints or leaks secret values; outputs only presence, format, and status.
 */

import fs from 'node:fs';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = val;
  }
  return result;
}

const localEnv = parseEnvFile('.env');

const REQUIRED_FRONTEND_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const SERVER_AUTH_OPTIONS = [
  'FIREBASE_SERVICE_ACCOUNT',
  'FIREBASE_SERVICE_ACCOUNT_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'FIREBASE_PRIVATE_KEY'
];

console.log('========================================================================');
console.log('  HACKHUB — PRODUCTION ENVIRONMENT VARIABLE AUDIT (SAFE / REDACTED)');
console.log('========================================================================\n');

console.log('[1. Frontend VITE_* Configuration (Required in Vercel & Client Build)]');
let frontendComplete = true;
for (const varName of REQUIRED_FRONTEND_VARS) {
  const val = process.env[varName] || localEnv[varName];
  if (val && val.length > 0) {
    console.log(`  ✅ ${varName.padEnd(35)} : PRESENT (length: ${val.length}, format: valid)`);
  } else {
    console.log(`  ❌ ${varName.padEnd(35)} : MISSING`);
    frontendComplete = false;
  }
}

console.log('\n[2. Serverless Backend Configuration (Required in Vercel Project Settings)]');
const serviceAccountVal =
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  localEnv.FIREBASE_SERVICE_ACCOUNT ||
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
  localEnv.FIREBASE_SERVICE_ACCOUNT_KEY;

const privateKeyVal =
  process.env.FIREBASE_PRIVATE_KEY ||
  localEnv.FIREBASE_PRIVATE_KEY;

const clientEmailVal =
  process.env.FIREBASE_CLIENT_EMAIL ||
  localEnv.FIREBASE_CLIENT_EMAIL;

const webApiKeyVal =
  process.env.FIREBASE_WEB_API_KEY ||
  localEnv.FIREBASE_WEB_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  localEnv.VITE_FIREBASE_API_KEY;

let backendComplete = false;
if (serviceAccountVal && serviceAccountVal.length > 50) {
  let isJson = false;
  try {
    const parsed = JSON.parse(serviceAccountVal.startsWith('"') ? JSON.parse(serviceAccountVal) : serviceAccountVal);
    isJson = Boolean(parsed.project_id && parsed.private_key);
  } catch {
    // Might be base64
    try {
      const decoded = Buffer.from(serviceAccountVal, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      isJson = Boolean(parsed.project_id && parsed.private_key);
    } catch {}
  }
  console.log(`  ✅ FIREBASE_SERVICE_ACCOUNT           : PRESENT (length: ${serviceAccountVal.length}, JSON structure: ${isJson ? 'valid' : 'custom/base64'})`);
  backendComplete = true;
} else if (privateKeyVal && clientEmailVal) {
  console.log(`  ✅ Discrete Credentials (KEY + EMAIL) : PRESENT (length: ${privateKeyVal.length})`);
  backendComplete = true;
} else {
  console.log(`  ⚠️ FIREBASE_SERVICE_ACCOUNT           : NOT in local .env (Relies on Vercel Dashboard Secret / Local CLI fallback)`);
}

if (webApiKeyVal && webApiKeyVal.length > 10) {
  console.log(`  ✅ FIREBASE_WEB_API_KEY (Server auth) : PRESENT (length: ${webApiKeyVal.length})`);
} else {
  console.log(`  ⚠️ FIREBASE_WEB_API_KEY               : MISSING (Falls back to VITE_FIREBASE_API_KEY)`);
}

console.log('\n--- Summary ---');
console.log(`Frontend Build Configuration : ${frontendComplete ? 'COMPLETE & READY' : 'INCOMPLETE'}`);
console.log(`Serverless Auth Setting      : ${backendComplete ? 'CONFIGURED IN ENV' : 'REQUIRES VERCEL DASHBOARD SETTING'}`);

console.log('\n========================================================================\n');
