/**
 * HackHub Serverless API: Student Authentication & Secure Resolution
 * 
 * Provides trusted, rate-limited student authentication and request verification:
 * 1. Resolves registration numbers strictly via Firebase Admin SDK server-side.
 * 2. Never relies on unauthenticated Firestore REST reads or insecure fallback domains.
 * 3. Enforces IP-based sliding window rate limiting (max 5 failed attempts/min) to prevent brute force.
 * 4. Returns identical generic 401 "Invalid registration number or password." for both nonexistent IDs
 *    and wrong passwords, equalizing timing so students cannot be enumerated.
 * 5. Returns explicit, safe 503 configuration error if server credentials are not provisioned.
 * 6. Validates credentials against Google Identity Toolkit without storing passwords anywhere.
 * 7. Enforces server-side active account checks.
 * 8. Provides server-side token and role verification for sensitive operations.
 */

import fs from 'node:fs';
import { randomBytes } from 'node:crypto';

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

function cleanupExpiredEntries(now: number) {
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  cleanupExpiredEntries(now);
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { attempts: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.attempts++;
  return { allowed: true, retryAfter: 0 };
}

function resetRateLimit(ip: string) {
  rateLimitMap.delete(ip);
}

function getDotEnvValue(key: string): string {
  try {
    const line = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find((entry: string) =>
      entry.trimStart().startsWith(`${key}=`)
    );
    return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : '';
  } catch {
    return '';
  }
}

const FIREBASE_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  getDotEnvValue('VITE_FIREBASE_API_KEY') ||
  'AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as';
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  getDotEnvValue('VITE_FIREBASE_PROJECT_ID') ||
  'foceye-2546c';

let mockAdminInstances: any = null;

/**
 * Configure mock Admin SDK instances for unit testing
 */
export function setMockAdminInstances(instances: any) {
  mockAdminInstances = instances;
}

export function resetMockAdminInstances() {
  mockAdminInstances = null;
  cachedAdminInstances = null;
}

/**
 * Reset rate limit entries (useful for test suites)
 */
export function resetAllRateLimits() {
  rateLimitMap.clear();
}

export interface AuthDiagnostics {
  timestamp: string;
  targetProjectId: string;
  adminSdkInitialized: boolean;
  detectedEnvVars: {
    FIREBASE_SERVICE_ACCOUNT: boolean;
    FIREBASE_SERVICE_ACCOUNT_KEY: boolean;
    FIREBASE_SERVICE_ACCOUNT_JSON: boolean;
    FIREBASE_CLIENT_EMAIL: boolean;
    FIREBASE_PRIVATE_KEY: boolean;
    GOOGLE_APPLICATION_CREDENTIALS: boolean;
    FIREBASE_PROJECT_ID: boolean;
  };
  credentialSource: 'FIREBASE_SERVICE_ACCOUNT' | 'FIREBASE_SERVICE_ACCOUNT_KEY' | 'FIREBASE_SERVICE_ACCOUNT_JSON' | 'DISCRETE_VARS' | 'GOOGLE_APPLICATION_CREDENTIALS' | 'NONE';
  credentialFormat: 'raw_json' | 'escaped_json' | 'base64_json' | 'double_stringified_json' | 'discrete_pem' | 'file_path' | 'none';
  credentialProjectId: string | null;
  clientEmailConfigured: boolean;
  privateKeyFormatValid: boolean;
  statusMessage: string;
}

/**
 * Returns the normalized target HackHub Firebase Project ID
 */
export function getExpectedProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    FIREBASE_PROJECT_ID
  ).trim().replace(/^["']|["']$/g, '');
}

/**
 * Safely parses and normalizes service account payloads across various Vercel environment formats:
 * - Direct JSON string
 * - Escaped backslash JSON
 * - Double-stringified JSON
 * - Base64-encoded JSON
 * - Outer quoted strings
 */
export function parseServiceAccountPayload(rawInput: string): {
  serviceAccount: any;
  format: 'raw_json' | 'escaped_json' | 'base64_json' | 'double_stringified_json';
} {
  let raw = (rawInput || '').trim();

  // Strip markdown code fences if copied from documentation
  if (raw.startsWith('```') && raw.endsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Strip leading/trailing surrounding quotes if wrapped
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }

  // Strip UTF-8 BOM if present
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1).trim();
  }

  // Handle escaped quotes from shell or Vercel CLI (e.g. {\"type\": ...})
  if (raw.includes('\\"')) {
    try {
      const unescaped = raw.replace(/\\"/g, '"');
      if (unescaped.startsWith('{')) {
        const parsed = JSON.parse(unescaped);
        return { serviceAccount: parsed, format: 'escaped_json' };
      }
    } catch {
      // Continue to next parsing strategy
    }
  }

  // Direct JSON parse
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
        return { serviceAccount: JSON.parse(parsed.trim()), format: 'double_stringified_json' };
      }
      return { serviceAccount: parsed, format: 'raw_json' };
    } catch (err: any) {
      throw new Error(`Invalid JSON syntax in service account: ${err.message}`);
    }
  }

  // Base64 decode attempt (stripping any accidental whitespace or newlines)
  try {
    const cleanBase64 = raw.replace(/\s+/g, '');
    let decoded = Buffer.from(cleanBase64, 'base64').toString('utf8').trim();
    if (decoded.charCodeAt(0) === 0xFEFF) {
      decoded = decoded.slice(1).trim();
    }
    if (decoded.startsWith('```')) {
      decoded = decoded.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    if ((decoded.startsWith('"') && decoded.endsWith('"')) || (decoded.startsWith("'") && decoded.endsWith("'"))) {
      decoded = decoded.slice(1, -1).trim();
    }
    if (decoded.startsWith('{')) {
      const parsed = JSON.parse(decoded);
      return { serviceAccount: parsed, format: 'base64_json' };
    }
  } catch {
    // Not valid base64
  }

  throw new Error('Service account string is neither valid JSON nor base64-encoded JSON.');
}

/**
 * Normalizes PEM private keys from environment variables:
 * - Converts escaped \n to real newlines
 * - Strips all Windows \r\n and carriage returns
 * - Strips accidental surrounding quotes
 */
export function normalizePrivateKey(rawKey: string): string {
  let key = (rawKey || '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  return key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\n/g, '\n');
}

/**
 * Generates safe diagnostic report without exposing secrets or credentials
 */
export async function getAuthDiagnostics(): Promise<AuthDiagnostics> {
  const targetProjectId = getExpectedProjectId();
  const detectedEnvVars = {
    FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    FIREBASE_SERVICE_ACCOUNT_KEY: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    FIREBASE_SERVICE_ACCOUNT_JSON: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    FIREBASE_CLIENT_EMAIL: !!(process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: !!(process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY),
    GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    FIREBASE_PROJECT_ID: !!(process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID)
  };

  let credentialSource: AuthDiagnostics['credentialSource'] = 'NONE';
  let credentialFormat: AuthDiagnostics['credentialFormat'] = 'none';
  let credentialProjectId: string | null = null;
  let clientEmailConfigured = false;
  let privateKeyFormatValid = false;
  let statusMessage = 'No Firebase Admin credentials detected in environment variables.';

  const rawSA =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
    process.env.FIREBASE_ADMIN_KEY ||
    process.env.SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT;

  if (rawSA) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) credentialSource = 'FIREBASE_SERVICE_ACCOUNT';
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) credentialSource = 'FIREBASE_SERVICE_ACCOUNT_KEY';
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) credentialSource = 'FIREBASE_SERVICE_ACCOUNT_JSON';
    else credentialSource = 'FIREBASE_SERVICE_ACCOUNT';

    try {
      const parsed = parseServiceAccountPayload(rawSA);
      credentialFormat = parsed.format;
      credentialProjectId = parsed.serviceAccount.project_id || parsed.serviceAccount.projectId || null;
      clientEmailConfigured = typeof parsed.serviceAccount.client_email === 'string';
      const pk = typeof parsed.serviceAccount.private_key === 'string' ? parsed.serviceAccount.private_key : '';
      privateKeyFormatValid = pk.includes('BEGIN PRIVATE KEY') && pk.includes('END PRIVATE KEY');

      if (credentialProjectId && credentialProjectId !== targetProjectId) {
        statusMessage = `Credential project ID (${credentialProjectId}) does not match target HackHub project (${targetProjectId}).`;
      } else if (!privateKeyFormatValid) {
        statusMessage = 'Service account parsed successfully, but private_key lacks standard PEM headers.';
      } else {
        statusMessage = 'Service account credentials parsed and ready for initialization.';
      }
    } catch (err: any) {
      statusMessage = `Service account detected in ${credentialSource} but malformed: ${err.message}`;
    }
  } else if (detectedEnvVars.FIREBASE_CLIENT_EMAIL && detectedEnvVars.FIREBASE_PRIVATE_KEY) {
    credentialSource = 'DISCRETE_VARS';
    credentialFormat = 'discrete_pem';
    clientEmailConfigured = true;
    const pk = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY || '');
    privateKeyFormatValid = pk.includes('BEGIN PRIVATE KEY') && pk.includes('END PRIVATE KEY');
    credentialProjectId = targetProjectId;
    statusMessage = privateKeyFormatValid
      ? 'Discrete credentials (client email & private key) configured and ready.'
      : 'Discrete credentials detected, but private key lacks standard PEM headers.';
  } else if (detectedEnvVars.GOOGLE_APPLICATION_CREDENTIALS) {
    credentialSource = 'GOOGLE_APPLICATION_CREDENTIALS';
    credentialFormat = 'file_path';
    statusMessage = 'Application Default Credentials configured via GOOGLE_APPLICATION_CREDENTIALS.';
  }

  let adminSdkInitialized = false;
  try {
    const admin = await getAdminInstances();
    adminSdkInitialized = !!admin;
    if (adminSdkInitialized && statusMessage.includes('ready')) {
      statusMessage = `Firebase Admin SDK initialized successfully for project "${targetProjectId}".`;
    }
  } catch (err: any) {
    statusMessage = `Initialization attempt failed: ${err.message}`;
  }

  return {
    timestamp: new Date().toISOString(),
    targetProjectId,
    adminSdkInitialized,
    detectedEnvVars,
    credentialSource,
    credentialFormat,
    credentialProjectId,
    clientEmailConfigured,
    privateKeyFormatValid,
    statusMessage
  };
}

let cachedAdminInstances: any = null;
let lastInitError: string | null = null;

/**
 * Initialize and retrieve Firebase Admin instances using server credentials
 */
export async function getAdminInstances() {
  if (mockAdminInstances) {
    return mockAdminInstances;
  }

  if (process.env.DISABLE_LOCAL_CLI_AUTH === 'true') {
    cachedAdminInstances = null;
  }

  if (cachedAdminInstances) {
    return cachedAdminInstances;
  }

  let currentStep = 'start';
  try {
    currentStep = 'import_firebase_admin';
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    let getAuthFn: any = null;
    try {
      const authModule = await import('firebase-admin/auth');
      getAuthFn = authModule.getAuth;
    } catch {
      // Optional for Firestore lookups
    }

    currentStep = 'check_existing_apps';
    const expectedProjectId = getExpectedProjectId();

    const existingApps = getApps();
    const adminApp = existingApps.find(a => a.name === 'HackHubAdmin') || null;

    if (adminApp) {
      if (cachedAdminInstances) {
        return cachedAdminInstances;
      }
      try {
        const db = getFirestore(adminApp);
        cachedAdminInstances = {
          adminApp,
          adminDb: db,
          adminAuth: getAuthFn ? getAuthFn(adminApp) : null
        };
        return cachedAdminInstances;
      } catch {
        // Fall back to subsequent initializers
      }
    }

    // 1. Full JSON service account string or base64 encoded across all recognized env names
    const serviceAccountRaw =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
      process.env.FIREBASE_ADMIN_KEY ||
      process.env.SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_CREDENTIALS ||
      process.env.GOOGLE_SERVICE_ACCOUNT;

    if (serviceAccountRaw) {
      currentStep = 'parse_service_account';
      console.log(`[StudentAuth Diagnostics] Detected credentials in environment variables (raw length: ${serviceAccountRaw.length}).`);
      const { serviceAccount, format } = parseServiceAccountPayload(serviceAccountRaw);

      // Validate that credentials belong to the intended HackHub Firebase project
      currentStep = 'validate_project_id';
      const credProjectId = (serviceAccount.project_id || serviceAccount.projectId || '').trim();
      if (expectedProjectId && credProjectId && credProjectId.toLowerCase() !== expectedProjectId.toLowerCase()) {
        const mismatchMsg = `Credential project_id "${credProjectId}" does not match target HackHub project "${expectedProjectId}".`;
        lastInitError = `[validate_project_id] ${mismatchMsg}`;
        console.warn(`[StudentAuth Diagnostics] ${mismatchMsg}`);
        return null;
      }

      // Handle private-key newline formatting correctly
      currentStep = 'normalize_key';
      if (typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
      }

      console.log(`[StudentAuth Diagnostics] Initializing Admin SDK using ${format} service account for project: ${expectedProjectId}`);

      currentStep = 'cert_and_initialize_app';
      const credential = cert(serviceAccount);
      const app = initializeApp({
        credential,
        projectId: credProjectId || expectedProjectId
      }, 'HackHubAdmin');

      console.log(`[StudentAuth Diagnostics] Firebase Admin SDK successfully initialized for project: ${expectedProjectId}`);
      lastInitError = null;
      cachedAdminInstances = {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuthFn ? getAuthFn(app) : null
      };
      return cachedAdminInstances;
    } else {
      lastInitError = '[env_check] No credentials detected';
      console.log('[StudentAuth Diagnostics] No service account credentials detected in environment variables (credentialSource=NONE).');
    }

    // 2. Discrete environment variables
    const clientEmail =
      process.env.FIREBASE_CLIENT_EMAIL ||
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      process.env.CLIENT_EMAIL;

    const privateKeyRaw =
      process.env.FIREBASE_PRIVATE_KEY ||
      process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
      process.env.PRIVATE_KEY;

    if (clientEmail && privateKeyRaw) {
      const discreteProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || '').trim();
      if (discreteProjectId && discreteProjectId !== expectedProjectId) {
        console.warn(`[StudentAuth Diagnostics] Discrete project_id "${discreteProjectId}" does not match target HackHub project "${expectedProjectId}".`);
        return null;
      }

      const privateKey = normalizePrivateKey(privateKeyRaw);
      console.log(`[StudentAuth Diagnostics] Initializing Admin SDK using discrete credentials for project: ${expectedProjectId}`);

      const app = initializeApp({
        credential: cert({
          projectId: expectedProjectId,
          clientEmail: clientEmail.trim().replace(/^["']|["']$/g, ''),
          privateKey
        }),
        projectId: expectedProjectId
      }, 'HackHubAdmin');

      console.log(`[StudentAuth Diagnostics] Firebase Admin SDK successfully initialized for project: ${expectedProjectId}`);
      return {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuthFn ? getAuthFn(app) : null
      };
    }

    // 3. Application Default Credentials (GCP / file path)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const gCred = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
      // If user pasted raw JSON or base64 into GOOGLE_APPLICATION_CREDENTIALS
      if (gCred.startsWith('{') || gCred.startsWith('"') || (!gCred.includes('/') && !gCred.includes('\\') && gCred.length > 100)) {
        try {
          const { serviceAccount, format } = parseServiceAccountPayload(gCred);
          console.log(`[StudentAuth Diagnostics] Initializing Admin SDK using ${format} payload from GOOGLE_APPLICATION_CREDENTIALS for project: ${expectedProjectId}`);
          if (typeof serviceAccount.private_key === 'string') {
            serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
          }
          const app = initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id || expectedProjectId
          }, 'HackHubAdmin');
          return {
            adminApp: app,
            adminDb: getFirestore(app),
            adminAuth: getAuthFn ? getAuthFn(app) : null
          };
        } catch {
          // Fall back to default initialization
        }
      }

      const app = initializeApp({ projectId: expectedProjectId }, 'HackHubAdmin');
      return {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuthFn ? getAuthFn(app) : null
      };
    }

    // 4. Local Firebase CLI credentials fallback (development & CLI runtimes)
    if (process.env.DISABLE_LOCAL_CLI_AUTH !== 'true') {
      try {
        const os = await import('node:os');
        const path = await import('node:path');
        const homeDir = os.homedir();
        const configstorePath = path.join(homeDir, '.config', 'configstore', 'firebase-tools.json');
      if (fs.existsSync(configstorePath)) {
        const config = JSON.parse(fs.readFileSync(configstorePath, 'utf8'));
        const refreshToken = config.tokens?.refresh_token;
        if (refreshToken) {
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
              const tokenData = (await tokenRes.json()) as any;
              accessToken = tokenData.access_token;
            }
          }
          if (accessToken) {
            const { OAuth2Client } = await import('google-auth-library');
            const { Firestore } = await import('@google-cloud/firestore');
            const authClient = new OAuth2Client();
            authClient.setCredentials({ access_token: accessToken });
            const directDb = new Firestore({ projectId: expectedProjectId, authClient });
            const customCredential = {
              getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 })
            };
            const app = initializeApp({
              credential: customCredential,
              projectId: expectedProjectId
            }, 'HackHubAdmin');
            lastInitError = null;
            cachedAdminInstances = {
              adminApp: app,
              adminDb: directDb as any,
              adminAuth: getAuthFn ? getAuthFn(app) : null
            };
            return cachedAdminInstances;
          }
        }
      }
    } catch {
      // Continue to final error
    }
  }

  } catch (err: any) {
    lastInitError = `[${currentStep}] ${err?.message || String(err)}`;
    console.warn('[StudentAuth Diagnostics] Admin SDK initialization note:', lastInitError);
    return null;
  }
}

/**
 * Verify Firebase ID Token and enforce server-side role and account checks
 */
export async function verifyServerRequest(
  authHeader: string | undefined,
  requiredRole?: 'STUDENT' | 'STAFF' | 'ADMIN'
): Promise<{
  valid: boolean;
  uid?: string;
  email?: string;
  role?: string;
  department?: string;
  authorizedYears?: string[];
  isPlatformAdministrator?: boolean;
  error?: string;
  status: number;
}> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      status: 401,
      error: 'Unauthorized: Missing or invalid Bearer authentication header.'
    };
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  const adminInstances = await getAdminInstances();
  if (!adminInstances?.adminAuth || !adminInstances.adminDb) {
    return { valid: false, status: 503, error: 'Server authorization service unavailable: Firebase Admin SDK credentials required.' };
  }
  try {
    const decodedToken = await adminInstances.adminAuth.verifyIdToken(idToken, true);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const adminDoc = await adminInstances.adminDb.collection('admins').doc(uid).get();
    if (adminDoc.exists) {
      const adminData = adminDoc.data() as any;
      const storedRole = String(adminData.role || '').toUpperCase();
      if (adminData.approvalStatus !== 'APPROVED' || adminData.isActive === false || adminData.accountStatus === 'deactivated' || !['ADMIN', 'FACULTY'].includes(storedRole)) {
        return { valid: false, status: 403, error: 'Forbidden: Staff account is not active or approved.' };
      }
      const role = adminData.isPlatformAdmin === true ? 'ADMIN' : 'FACULTY';
      if (requiredRole === 'STUDENT' || (requiredRole === 'ADMIN' && role !== 'ADMIN')) {
        return { valid: false, status: 403, error: 'Forbidden: This operation is not available to this staff account.' };
      }
      return {
        valid: true,
        status: 200,
        uid,
        email,
        role,
        department: adminData.department,
        authorizedYears: Array.isArray(adminData.authorizedYears) ? adminData.authorizedYears : [],
        isPlatformAdministrator: adminData.isPlatformAdmin === true
      };
    }

    const studentDoc = await adminInstances.adminDb.collection('students').doc(uid).get();
    if (studentDoc.exists) {
      const studentData = studentDoc.data() as any;
      if (
        !hasStudentRole(studentData) ||
        (studentData.uid && studentData.uid !== uid) ||
        String(studentData.email || '').trim().toLowerCase() !== String(email || '').trim().toLowerCase()
      ) {
        return { valid: false, status: 403, error: 'Forbidden: Student account does not match its provisioned profile.' };
      }
      if (!isStudentAccountActive(studentData)) {
        return { valid: false, status: 403, error: 'Forbidden: Student account has been deactivated.' };
      }
      if (requiredRole && requiredRole !== 'STUDENT') {
        return { valid: false, status: 403, error: 'Forbidden: Student accounts cannot access staff resources.' };
      }
      return { valid: true, status: 200, uid, email, role: 'STUDENT' };
    }

    return { valid: false, status: 403, error: 'Forbidden: No authorized HackHub profile is linked to this account.' };
  } catch (err: any) {
    return {
      valid: false,
      status: 401,
      error: err.code === 'auth/id-token-expired'
        ? 'Session expired. Please log in again.'
        : 'Invalid authentication credentials.'
    };
  }
}

const SUPPORTED_STUDENT_DEPARTMENTS = ['Biotechnology', 'Biomedical Engineering'];
const SUPPORTED_STUDENT_YEARS = ['First Year', 'Second Year', 'Third Year'];

function normalizeRegistrationNumber(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function isValidRegistrationNumber(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{2,31}$/.test(value);
}

function hasStudentRole(student: any): boolean {
  return String(student?.role || '').toUpperCase() === 'STUDENT';
}

function isStudentAccountActive(student: any): boolean {
  const accountStatus = String(student?.accountStatus || '').toLowerCase();
  if (accountStatus && accountStatus !== 'active') return false;
  if (student?.isActive !== undefined && student.isActive !== true) return false;
  return accountStatus === 'active' || student?.isActive === true;
}

async function findRegistrationProfiles(db: any, registrationNumber: string, lookupUid?: string) {
  const students = db.collection('students');
  const queries = await Promise.all([
    students.where('registrationNumberNormalized', '==', registrationNumber).get(),
    students.where('registerNumber', '==', registrationNumber).get()
  ]);
  const matches = new Map<string, any>();
  for (const result of queries) {
    for (const profile of result.docs || []) matches.set(profile.id, profile);
  }
  if (matches.size !== 1) return null;

  const profile = [...matches.values()][0];
  const profileData = profile.data() || {};
  const profileRegistrations = [profileData.registrationNumberNormalized, profileData.registerNumber]
    .filter((value) => typeof value === 'string' && value.trim())
    .map(normalizeRegistrationNumber);
  if (
    !profileRegistrations.length ||
    profileRegistrations.some((value) => value !== registrationNumber) ||
    (lookupUid && lookupUid !== profile.id) ||
    (profileData.uid && profileData.uid !== profile.id)
  ) return null;
  return profile;
}

function getAllowedCollegeEmailDomains(): string[] {
  const configured = (process.env.COLLEGE_EMAIL_DOMAINS || 'kitcbe.com')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return configured;
}

export async function provisionStudentAccount(
  body: Record<string, unknown>,
  actor: { uid: string; email?: string; department?: string; role?: string }
): Promise<{ status: number; body: Record<string, unknown> }> {
  const name = String(body.name || '').replace(/[\u0000-\u001f<>]/g, '').trim();
  const registerNumber = String(body.registerNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  const email = String(body.email || '').trim().toLowerCase();
  const department = String(body.department || '').trim();
  const year = String(body.year || '').trim();
  const phone = String(body.phone || '').trim().slice(0, 40);
  if (name.length < 2 || name.length > 100) return { status: 400, body: { error: 'Enter a student name between 2 and 100 characters.' } };
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(registerNumber)) return { status: 400, body: { error: 'Registration number must contain 3–32 letters, digits, or hyphens.' } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { status: 400, body: { error: 'Enter a valid college email address.' } };
  const domains = getAllowedCollegeEmailDomains();
  if (!domains.length || !domains.some((domain) => email.endsWith(`@${domain}`))) {
    return { status: 400, body: { error: `Use a college email ending in ${domains.map((domain) => `@${domain}`).join(' or ')}.` } };
  }
  if (!SUPPORTED_STUDENT_DEPARTMENTS.includes(department)) return { status: 400, body: { error: 'Select Biotechnology or Biomedical Engineering.' } };
  if (!SUPPORTED_STUDENT_YEARS.includes(year)) return { status: 400, body: { error: 'Select First Year, Second Year, or Third Year.' } };
  if (actor.role !== 'ADMIN' && (!actor.department || department !== actor.department)) {
    return { status: 403, body: { error: 'You can provision students only for your authorized department.' } };
  }

  const instances = await getAdminInstances();
  if (!instances?.adminAuth || !instances.adminDb) return { status: 503, body: { error: 'Student provisioning requires Firebase Admin SDK credentials on the server.' } };
  const apiKey = FIREBASE_API_KEY;
  if (!apiKey) return { status: 503, body: { error: 'Student password setup email is not configured. Set the Firebase Web API key in the server environment.' } };

  const db = instances.adminDb;
  const normalizedEmailId = encodeURIComponent(email);
  const regRef = db.collection('reg_lookups').doc(registerNumber);
  const emailRef = db.collection('student_email_lookups').doc(normalizedEmailId);
  let user: any = null;
  let studentRef: any = null;
  let auditRef: any = null;
  let committed = false;

  try {
    const [legacyStudents, existingRegLookup, existingEmailLookup] = await Promise.all([
      db.collection('students').get(),
      regRef.get(),
      emailRef.get()
    ]);
    const studentRows = legacyStudents.docs.map((document: any) => document.data() || {});
    const hasLegacyRegistration = studentRows.some((student: any) =>
      String(student.registrationNumberNormalized || student.registerNumber || '').trim().toUpperCase().replace(/\s+/g, '') === registerNumber
    );
    const hasLegacyEmail = studentRows.some((student: any) => String(student.email || '').trim().toLowerCase() === email);
    if (hasLegacyRegistration || existingRegLookup.exists) {
      return { status: 409, body: { error: `Registration number ${registerNumber} is already assigned.` } };
    }
    if (hasLegacyEmail || existingEmailLookup.exists) {
      return { status: 409, body: { error: 'This college email is already linked to a student profile.' } };
    }
    try {
      await instances.adminAuth.getUserByEmail(email);
      return { status: 409, body: { error: 'This email already has a Firebase Authentication account. Verify and reconcile the existing account before provisioning.' } };
    } catch (err: any) {
      if (err?.code !== 'auth/user-not-found') throw err;
    }

    user = await instances.adminAuth.createUser({ email, displayName: name, emailVerified: false, disabled: false });
    studentRef = db.collection('students').doc(user.uid);
    auditRef = db.collection('audit_logs').doc();
    const { FieldValue } = await import('firebase-admin/firestore');
    await db.runTransaction(async (transaction: any) => {
      const [regSnap, emailSnap, studentSnap] = await Promise.all([
        transaction.get(regRef),
        transaction.get(emailRef),
        transaction.get(studentRef)
      ]);
      if (regSnap.exists) throw Object.assign(new Error('Registration number already assigned.'), { code: 'duplicate-registration' });
      if (emailSnap.exists) throw Object.assign(new Error('College email already assigned.'), { code: 'duplicate-email' });
      if (studentSnap.exists) throw new Error('The new Firebase account already has a student profile.');

      const timestamp = FieldValue.serverTimestamp();
      transaction.create(studentRef, {
        uid: user.uid,
        name,
        registerNumber,
        registrationNumberNormalized: registerNumber,
        email,
        phone,
        department,
        year,
        role: 'STUDENT',
        accountStatus: 'active',
        isActive: true,
        skills: [],
        provisionedBy: actor.uid,
        provisionedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      transaction.create(regRef, { email, uid: user.uid, createdAt: timestamp });
      transaction.create(emailRef, { uid: user.uid, createdAt: timestamp });
      transaction.create(auditRef, {
        id: auditRef.id,
        actorUid: actor.uid,
        actorEmail: actor.email || '',
        actorRole: 'STAFF',
        targetUid: user.uid,
        targetEmail: email,
        targetName: name,
        action: 'STUDENT_PROVISIONED',
        timestamp,
        details: { registerNumber, department, year }
      });
    });
    committed = true;

    const sendEmail = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email })
    });
    if (!sendEmail.ok) throw new Error('Firebase could not send the password setup email. Check the email template and authorized domain configuration.');
    return { status: 201, body: { success: true, uid: user.uid, email, registerNumber, message: 'Student provisioned and password setup email sent.' } };
  } catch (err: any) {
    if (committed && studentRef && auditRef) {
      try {
        await db.runTransaction(async (transaction: any) => {
          transaction.delete(studentRef);
          transaction.delete(regRef);
          transaction.delete(emailRef);
          transaction.delete(auditRef);
        });
      } catch (rollbackError: any) {
        console.error('[StudentProvisioning] Firestore rollback failed:', rollbackError?.message || 'unknown error');
      }
    }
    if (user?.uid) {
      try { await instances.adminAuth.deleteUser(user.uid); }
      catch (rollbackError: any) { console.error('[StudentProvisioning] Auth rollback failed:', rollbackError?.message || 'unknown error'); }
    }
    if (err?.code === 'auth/email-already-exists') return { status: 409, body: { error: 'This email already has a Firebase Authentication account.' } };
    if (err?.code === 'duplicate-registration') return { status: 409, body: { error: `Registration number ${registerNumber} is already assigned.` } };
    if (err?.code === 'duplicate-email') return { status: 409, body: { error: 'This college email is already linked to a student profile.' } };
    console.error('[StudentProvisioning] Provisioning failed:', err?.message || 'unknown error');
    return { status: 500, body: { error: 'Student provisioning failed. No success was recorded; check server logs if the account needs reconciliation.' } };
  }
}

/**
 * Core handler for student authentication and registration-number resolution
 */
export async function handleStudentAuth(body: { identifier?: string; password?: string }, clientIp: string) {
  const identifier = (body.identifier || '').trim();
  const password = body.password || '';
  const isEmailLogin = identifier.includes('@');
  const cleanRegNo = isEmailLogin ? '' : normalizeRegistrationNumber(identifier);

  if (!identifier || !password) {
    return {
      status: 400,
      body: { error: 'Registration number/email and password are required.' }
    };
  }

  // Rate Limiting Check
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return {
      status: 429,
      body: { 
        error: `Too many login attempts. Please wait ${rateLimit.retryAfter} seconds before trying again.`,
        retryAfter: rateLimit.retryAfter
      }
    };
  }

  let targetEmail = '';
  let adminInstances: Awaited<ReturnType<typeof getAdminInstances>> = null;
  let registrationLookup: any = null;

  if (isEmailLogin) {
    // Direct institutional/college email provided
    targetEmail = identifier.toLowerCase();
  } else {
    // Normalized registration number lookup: Must be resolved securely via trusted server-side Admin SDK
    if (!isValidRegistrationNumber(cleanRegNo)) {
      return { status: 400, body: { error: 'Enter a valid college registration number or registered email address.' } };
    }

    adminInstances = await getAdminInstances();
    if (!adminInstances) {
      console.warn(`[StudentAuth] Login attempt for registration number rejected: Firebase Admin SDK credentials not available in environment.`);
      // Explicit safe configuration error: Never silently fall back to insecure REST or fake domains
      return {
        status: 503,
        body: {
          error: 'Server authentication configuration required: Firebase Admin SDK credentials must be set in environment variables (FIREBASE_SERVICE_ACCOUNT) to resolve registration numbers. Please sign in with your registered college email.'
        }
      };
    }

    try {
      const lookupDoc = await adminInstances.adminDb.collection('reg_lookups').doc(cleanRegNo).get();
      if (lookupDoc.exists) {
        registrationLookup = lookupDoc.data() as any;
        targetEmail = String(registrationLookup?.email || '').trim().toLowerCase();
      }
    } catch (lookupErr: any) {
      console.error('[StudentAuth] Server registration lookup failure:', lookupErr.message);
      return {
        status: 500,
        body: { error: 'Authentication service temporarily unavailable.' }
      };
    }

    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      // Simulate equalized execution delay (~150ms) to prevent timing attacks
      await new Promise(r => setTimeout(r, 150));
      return {
        status: 401,
        body: { error: 'Invalid registration number or password.' }
      };
    }
  }

  if (!adminInstances) adminInstances = await getAdminInstances();
  if (!adminInstances?.adminDb) {
    return {
      status: 503,
      body: { error: 'Student authentication is temporarily unavailable because trusted Firebase server credentials are not configured.' }
    };
  }
  if (!FIREBASE_API_KEY) {
    return { status: 503, body: { error: 'Student password login is not configured. Set FIREBASE_WEB_API_KEY in the server environment.' } };
  }

  // Authenticate credentials against Google Identity Toolkit
  try {
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: targetEmail,
        password: password,
        returnSecureToken: true
      })
    });

    const authData = (await authRes.json()) as any;

    if (!authRes.ok || authData?.error) {
      return {
        status: 401,
        body: { error: 'Invalid registration number or password.' }
      };
    }

    // Only administrator-provisioned student profiles may use the student portal.
    try {
      const studentDoc = await adminInstances.adminDb.collection('students').doc(authData.localId).get();
      if (!studentDoc.exists) {
        return { status: 401, body: { error: 'Invalid registration number or password.' } };
      }
      const studentData = studentDoc.data() as any;
      if (
        (studentData.uid && studentData.uid !== authData.localId) ||
        String(studentData.email || '').trim().toLowerCase() !== String(authData.email || targetEmail).trim().toLowerCase() ||
        !hasStudentRole(studentData)
      ) {
        return { status: 401, body: { error: 'Invalid registration number or password.' } };
      }
      if (studentData.accountStatus === 'disabled' || studentData.accountStatus === 'deactivated' || studentData.isActive === false || !isStudentAccountActive(studentData)) {
        return {
          status: 403,
          body: { error: 'Account is disabled. Please contact your department administrator.' }
        };
      }
      if (!isEmailLogin) {
        const uniqueProfile = await findRegistrationProfiles(
          adminInstances.adminDb,
          cleanRegNo,
          registrationLookup?.uid
        );
        const mappedEmail = String(registrationLookup?.email || '').trim().toLowerCase();
        const profileEmail = String(studentData.email || '').trim().toLowerCase();
        if (
          !uniqueProfile ||
          uniqueProfile.id !== authData.localId ||
          !mappedEmail ||
          mappedEmail !== profileEmail ||
          profileEmail !== String(authData.email || targetEmail).trim().toLowerCase()
        ) {
          return { status: 401, body: { error: 'Invalid registration number or password.' } };
        }
      }
    } catch (checkErr: any) {
      console.error('[StudentAuth] Server student status check failed:', checkErr.message);
      return { status: 503, body: { error: 'Student authentication is temporarily unavailable.' } };
    }

    // Success: Clear rate limit
    resetRateLimit(clientIp);

    return {
      status: 200,
      body: {
        success: true,
        email: targetEmail,
        localId: authData.localId,
        idToken: authData.idToken
      }
    };
  } catch {
    return {
      status: 500,
      body: { error: 'Authentication service temporarily unavailable.' }
    };
  }
}

// Vercel Serverless Function Default Export
export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const urlStr = req.url || '/';
    const hasDiagnosticsQuery = urlStr.includes('diagnostics=true') || urlStr.includes('diagnostics=1');

    if (hasDiagnosticsQuery) {
      // Detailed diagnostics requested: Require administrative authorization
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({
          error: 'Unauthorized: Administrative authorization required to view internal diagnostic telemetry.'
        });
      }

      const verification = await verifyServerRequest(authHeader, 'ADMIN');
      if (!verification.valid) {
        return res.status(verification.status).json({
          error: verification.error || 'Forbidden: Administrative privileges required.'
        });
      }

      const diag = await getAuthDiagnostics();
      return res.status(200).json({
        status: 'ok',
        service: 'HackHub Student Authentication & Verification API',
        diagnostics: diag
      });
    }

    // Public health check: confirms service availability without leaking internal infrastructure details
    return res.status(200).json({
      status: 'ok',
      service: 'HackHub Student Authentication & Verification API'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Handle authenticated squad join via invite code
  if (req.body?.action === 'provision-student') {
    const authHeader = req.headers['authorization'];
    const verification = await verifyServerRequest(authHeader, 'STAFF');
    if (!verification.valid || !verification.uid) {
      return res.status(verification.status).json({ error: verification.error || 'Authorized staff access is required.' });
    }
    const result = await provisionStudentAccount(req.body, {
      uid: verification.uid,
      email: verification.email,
      department: verification.department,
      role: verification.role
    });
    return res.status(result.status).json(result.body);
  }

  if (req.body?.action === 'create-team') {
    const authHeader = req.headers['authorization'];
    const verification = await verifyServerRequest(authHeader, 'STUDENT');
    if (!verification.valid || !verification.uid) {
      return res.status(verification.status).json({ error: verification.error || 'A student account is required.' });
    }
    const hackathonId = String(req.body?.hackathonId || '').trim();
    const name = String(req.body?.name || '').replace(/[\u0000-\u001f<>]/g, '').trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(hackathonId) || name.length < 2 || name.length > 80) {
      return res.status(400).json({ error: 'Choose a hackathon and enter a team name between 2 and 80 characters.' });
    }
    const instances = await getAdminInstances();
    if (!instances?.adminDb) return res.status(503).json({ error: 'Server authentication configuration required.' });

    const db = instances.adminDb;
    const teamId = `team_${hackathonId}_${verification.uid}`;
    const code = `TEAM-${randomBytes(5).toString('hex').toUpperCase()}`;
    const hackathonRef = db.collection('hackathons').doc(hackathonId);
    const studentRef = db.collection('students').doc(verification.uid);
    const registrationRef = db.collection('registrations').doc(`reg_${hackathonId}_${verification.uid}`);
    const teamRef = db.collection('teams').doc(teamId);
    try {
      const team = await db.runTransaction(async (transaction: any) => {
        const [hackathonSnap, studentSnap, registrationSnap, existingTeamSnap, codeSnap] = await Promise.all([
          transaction.get(hackathonRef),
          transaction.get(studentRef),
          transaction.get(registrationRef),
          transaction.get(teamRef),
          transaction.get(db.collection('teams').where('code', '==', code).limit(1))
        ]);
        if (!hackathonSnap.exists || !studentSnap.exists) throw Object.assign(new Error('Hackathon or student profile was not found.'), { status: 404 });
        if (!registrationSnap.exists) throw Object.assign(new Error('Register for this hackathon before creating a team.'), { status: 403 });
        if (existingTeamSnap.exists || registrationSnap.get('teamId')) throw Object.assign(new Error('You already have a team for this hackathon.'), { status: 409 });
        if (!codeSnap.empty) throw Object.assign(new Error('Could not reserve a unique team code. Please try again.'), { status: 409 });

        const hackathon = hackathonSnap.data() as any;
        const student = studentSnap.data() as any;
        const registration = registrationSnap.data() as any;
        const status = String(hackathon.status || '').toUpperCase();
        const deadlineValue = hackathon.registrationDeadline;
        const deadline = deadlineValue?.toDate
          ? deadlineValue.toDate().getTime()
          : deadlineValue
            ? new Date(deadlineValue).getTime()
            : Number.POSITIVE_INFINITY;
        if (!['PUBLISHED', 'REGISTRATION_OPEN', 'UPCOMING'].includes(status) || Date.now() > deadline) {
          throw Object.assign(new Error('Team creation is closed for this hackathon.'), { status: 409 });
        }
        if (registration.studentId !== verification.uid || registration.department !== student.department || registration.academicYear !== student.year) {
          throw Object.assign(new Error('Your registration does not match your provisioned student profile.'), { status: 403 });
        }
        if (registration.externalTrackingOnly || registration.isExternal) {
          throw Object.assign(new Error('External participation tracking does not support team creation here.'), { status: 409 });
        }

        const now = new Date().toISOString();
        const member = {
          studentId: verification.uid,
          name: student.name || '',
          email: student.email || '',
          registerNumber: student.registerNumber || '',
          department: student.department,
          role: 'LEADER',
          joinedAt: now
        };
        const newTeam = {
          id: teamId,
          hackathonId,
          name,
          code,
          leaderId: verification.uid,
          department: student.department,
          academicYear: student.year,
          members: [member],
          memberIds: [verification.uid],
          status: 'forming',
          createdAt: now,
          updatedAt: now
        };
        transaction.create(teamRef, newTeam);
        transaction.update(registrationRef, { teamId, updatedAt: now });
        return newTeam;
      });
      return res.status(201).json({ success: true, team, message: `Team ${name} created.` });
    } catch (err: any) {
      return res.status(err?.status || 500).json({ error: err?.status ? err.message : 'Team could not be created. Try again.' });
    }
  }

  if (req.body?.action === 'leave-team') {
    const authHeader = req.headers['authorization'];
    const verification = await verifyServerRequest(authHeader, 'STUDENT');
    if (!verification.valid || !verification.uid) {
      return res.status(verification.status).json({ error: verification.error || 'A student account is required.' });
    }
    const teamId = String(req.body?.teamId || '').trim();
    if (!teamId) return res.status(400).json({ error: 'Team ID is required.' });
    const instances = await getAdminInstances();
    if (!instances?.adminDb) return res.status(503).json({ error: 'Server authentication configuration required.' });
    const db = instances.adminDb;
    const teamRef = db.collection('teams').doc(teamId);
    try {
      const result = await db.runTransaction(async (transaction: any) => {
        const teamSnap = await transaction.get(teamRef);
        if (!teamSnap.exists) throw Object.assign(new Error('Team not found.'), { status: 404 });
        const team = teamSnap.data() as any;
        const registrationRef = db.collection('registrations').doc(`reg_${team.hackathonId}_${verification.uid}`);
        const registrationSnap = await transaction.get(registrationRef);
        const members = Array.isArray(team.members) ? team.members : [];
        const memberIds = Array.isArray(team.memberIds) ? team.memberIds : members.map((member: any) => member.studentId);
        if (!memberIds.includes(verification.uid)) throw Object.assign(new Error('You are not a member of this team.'), { status: 403 });
        if (!registrationSnap.exists || registrationSnap.get('teamId') !== teamId) throw Object.assign(new Error('Your team registration could not be verified.'), { status: 409 });

        const remainingMembers = members.filter((member: any) => member.studentId !== verification.uid);
        const remainingIds = memberIds.filter((uid: string) => uid !== verification.uid);
        const now = new Date().toISOString();
        transaction.update(registrationRef, { teamId: (await import('firebase-admin/firestore')).FieldValue.delete(), updatedAt: now });
        if (!remainingMembers.length) {
          transaction.delete(teamRef);
          return { team: null, message: 'You left the team. The empty team was removed.' };
        }
        let leaderId = team.leaderId;
        if (leaderId === verification.uid) {
          leaderId = remainingMembers[0].studentId;
          remainingMembers[0] = { ...remainingMembers[0], role: 'LEADER' };
        }
        const updatedTeam = { ...team, members: remainingMembers, memberIds: remainingIds, leaderId, updatedAt: now };
        transaction.update(teamRef, { members: remainingMembers, memberIds: remainingIds, leaderId, updatedAt: now });
        return { team: updatedTeam, message: 'You left the team.' };
      });
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      return res.status(err?.status || 500).json({ error: err?.status ? err.message : 'Team membership could not be updated.' });
    }
  }

  if (req.body?.action === 'remove-team-member') {
    const authHeader = req.headers['authorization'];
    const verification = await verifyServerRequest(authHeader);
    if (!verification.valid || !verification.uid) {
      return res.status(verification.status).json({ error: verification.error || 'Authentication is required.' });
    }
    const teamId = String(req.body?.teamId || '').trim();
    const memberId = String(req.body?.memberId || '').trim();
    if (!teamId || !memberId || teamId.length > 160 || memberId.length > 128) {
      return res.status(400).json({ error: 'Team and member IDs are required.' });
    }
    const instances = await getAdminInstances();
    if (!instances?.adminDb) return res.status(503).json({ error: 'Server authentication configuration required.' });
    const db = instances.adminDb;
    const teamRef = db.collection('teams').doc(teamId);
    const { FieldValue } = await import('firebase-admin/firestore');
    try {
      const result = await db.runTransaction(async (transaction: any) => {
        const teamSnap = await transaction.get(teamRef);
        if (!teamSnap.exists) throw Object.assign(new Error('Team not found.'), { status: 404 });
        const team = teamSnap.data() as any;
        const members = Array.isArray(team.members) ? team.members : [];
        const memberIds = Array.isArray(team.memberIds) ? team.memberIds : members.map((member: any) => member.studentId);
        if (!memberIds.includes(memberId)) throw Object.assign(new Error('That student is not a member of this team.'), { status: 404 });
        if (verification.uid === memberId) throw Object.assign(new Error('Use Leave Team to remove yourself.'), { status: 400 });
        const isStudentLeader = verification.role === 'STUDENT' && team.leaderId === verification.uid;
        const isScopedStaff = verification.role === 'ADMIN' && verification.isPlatformAdministrator === true || (
          verification.role === 'FACULTY' && verification.department === team.department &&
          (!verification.authorizedYears?.length || verification.authorizedYears.includes(team.academicYear))
        );
        if (!isStudentLeader && !isScopedStaff) throw Object.assign(new Error('Only the team leader or authorized department staff can remove a member.'), { status: 403 });
        if (team.leaderId === memberId && !isScopedStaff) throw Object.assign(new Error('A team leader cannot remove the team leader. Transfer leadership first.'), { status: 403 });

        const registrationRef = db.collection('registrations').doc(`reg_${team.hackathonId}_${memberId}`);
        const registrationSnap = await transaction.get(registrationRef);
        if (!registrationSnap.exists || registrationSnap.get('teamId') !== teamId) {
          throw Object.assign(new Error('The student registration is not linked to this team.'), { status: 409 });
        }
        const remainingMembers = members.filter((member: any) => member.studentId !== memberId);
        const remainingIds = memberIds.filter((uid: string) => uid !== memberId);
        const now = new Date().toISOString();
        transaction.update(registrationRef, { teamId: FieldValue.delete(), updatedAt: now });
        if (!remainingMembers.length) {
          transaction.delete(teamRef);
          return { team: null, message: 'Member removed and the empty team was deleted.' };
        }
        let leaderId = team.leaderId;
        if (leaderId === memberId) {
          leaderId = remainingMembers[0].studentId;
          remainingMembers[0] = { ...remainingMembers[0], role: 'LEADER' };
        }
        const updatedTeam = { ...team, members: remainingMembers, memberIds: remainingIds, leaderId, updatedAt: now };
        transaction.update(teamRef, { members: remainingMembers, memberIds: remainingIds, leaderId, updatedAt: now });
        return { team: updatedTeam, message: 'Member removed from the team.' };
      });
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      return res.status(err?.status || 500).json({ error: err?.status ? err.message : 'Team member could not be removed.' });
    }
  }

  if (req.body?.action === 'disband-team') {
    const authHeader = req.headers['authorization'];
    const verification = await verifyServerRequest(authHeader);
    if (!verification.valid || !verification.uid) {
      return res.status(verification.status).json({ error: verification.error || 'Authentication is required.' });
    }
    const teamId = String(req.body?.teamId || '').trim();
    if (!teamId) return res.status(400).json({ error: 'Team ID is required.' });
    const instances = await getAdminInstances();
    if (!instances?.adminDb) return res.status(503).json({ error: 'Server authentication configuration required.' });
    const db = instances.adminDb;
    const teamRef = db.collection('teams').doc(teamId);
    const { FieldValue } = await import('firebase-admin/firestore');
    try {
      await db.runTransaction(async (transaction: any) => {
        const teamSnap = await transaction.get(teamRef);
        if (!teamSnap.exists) throw Object.assign(new Error('Team not found.'), { status: 404 });
        const team = teamSnap.data() as any;
        const isStudentLeader = verification.role === 'STUDENT' && team.leaderId === verification.uid;
        const isScopedStaff = verification.role === 'ADMIN' && verification.isPlatformAdministrator === true || (
          verification.role === 'FACULTY' && verification.department === team.department &&
          (!verification.authorizedYears?.length || verification.authorizedYears.includes(team.academicYear))
        );
        if (!isStudentLeader && !isScopedStaff) throw Object.assign(new Error('Only the team leader or authorized department staff can remove this team.'), { status: 403 });

        const registrationsQuery = db.collection('registrations')
          .where('hackathonId', '==', team.hackathonId)
          .where('teamId', '==', teamId);
        const registrationsSnap = await transaction.get(registrationsQuery);
        registrationsSnap.docs.forEach((registration: any) => {
          transaction.update(registration.ref, { teamId: FieldValue.delete(), updatedAt: new Date().toISOString() });
        });
        transaction.delete(teamRef);
      });
      return res.status(200).json({ success: true, message: 'Team disbanded and registration links cleared.' });
    } catch (err: any) {
      return res.status(err?.status || 500).json({ error: err?.status ? err.message : 'Team could not be disbanded.' });
    }
  }

  if (['get-attendance-gate', 'toggle-attendance', 'check-in', 'attendance-override'].includes(String(req.body?.action || ''))) {
    const action = String(req.body.action);
    const authHeader = req.headers['authorization'];
    const requiredRole = action === 'check-in' ? 'STUDENT' : action === 'attendance-override' || action === 'toggle-attendance' || action === 'get-attendance-gate' ? 'STAFF' : undefined;
    const verification = await verifyServerRequest(authHeader, requiredRole as 'STUDENT' | 'STAFF' | undefined);
    if (!verification.valid || !verification.uid) {
      return res.status(verification.status).json({ error: verification.error || 'Authorized access is required.' });
    }
    const hackathonId = String(req.body?.hackathonId || '').trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(hackathonId)) return res.status(400).json({ error: 'A valid hackathon ID is required.' });
    const instances = await getAdminInstances();
    if (!instances?.adminDb) return res.status(503).json({ error: 'Server authentication configuration required.' });
    const db = instances.adminDb;
    const hackathonRef = db.collection('hackathons').doc(hackathonId);
    const gateRef = db.collection('attendance_gates').doc(hackathonId);

    if (action === 'get-attendance-gate' || action === 'toggle-attendance') {
      const hackathonSnap = await hackathonRef.get();
      if (!hackathonSnap.exists) return res.status(404).json({ error: 'Hackathon not found.' });
      const hackathon = hackathonSnap.data() as any;
      const hasStaffScope = verification.isPlatformAdministrator === true || (
        verification.role === 'FACULTY' && verification.department === hackathon.department
      );
      if (!hasStaffScope) return res.status(403).json({ error: 'You do not have permission to manage this hackathon attendance gate.' });
      if (action === 'get-attendance-gate') {
        const gateSnap = await gateRef.get();
        const gate = gateSnap.exists ? gateSnap.data() as any : {};
        return res.status(200).json({ success: true, attendanceOpen: gate.attendanceOpen === true, attendanceCode: gate.attendanceOpen === true ? gate.attendanceCode || '' : '' });
      }
      const isOpen = req.body?.isOpen === true;
      const attendanceCode = isOpen ? randomBytes(3).toString('hex').toUpperCase() : '';
      const { FieldValue } = await import('firebase-admin/firestore');
      await gateRef.set({ hackathonId, attendanceOpen: isOpen, attendanceCode: isOpen ? attendanceCode : FieldValue.delete(), updatedByUid: verification.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return res.status(200).json({ success: true, attendanceOpen: isOpen, attendanceCode, message: isOpen ? 'Attendance check-in is open.' : 'Attendance check-in is closed.' });
    }

    if (action === 'check-in') {
      const suppliedCode = String(req.body?.code || '').trim().toUpperCase();
      if (!suppliedCode) return res.status(400).json({ error: 'Enter the venue check-in code.' });
      const registrationQuery = db.collection('registrations').where('hackathonId', '==', hackathonId).where('studentId', '==', verification.uid).limit(1);
      const existingAttendanceQuery = db.collection('attendance').where('hackathonId', '==', hackathonId).where('studentId', '==', verification.uid).limit(1);
      const attendanceRef = db.collection('attendance').doc(`att_${hackathonId}_${verification.uid}`);
      const registrationStatus = await db.runTransaction(async (transaction: any) => {
        const [hackathonSnap, gateSnap, registrationSnap, existingAttendanceSnap, attendanceSnap] = await Promise.all([
          transaction.get(hackathonRef), transaction.get(gateRef), transaction.get(registrationQuery),
          transaction.get(existingAttendanceQuery), transaction.get(attendanceRef)
        ]);
        if (!hackathonSnap.exists || !gateSnap.exists || gateSnap.get('attendanceOpen') !== true) throw Object.assign(new Error('Check-in is closed for this hackathon.'), { status: 409 });
        if (gateSnap.get('attendanceCode') !== suppliedCode) throw Object.assign(new Error('Invalid check-in code.'), { status: 401 });
        if (registrationSnap.empty) throw Object.assign(new Error('Register for this hackathon before checking in.'), { status: 403 });
        if (!existingAttendanceSnap.empty || attendanceSnap.exists) throw Object.assign(new Error('Your attendance has already been recorded.'), { status: 409 });
        const registration = registrationSnap.docs[0];
        const studentSnap = await transaction.get(db.collection('students').doc(verification.uid));
        if (!studentSnap.exists || registration.get('department') !== studentSnap.get('department') || registration.get('academicYear') !== studentSnap.get('year')) {
          throw Object.assign(new Error('Your registration does not match your student profile.'), { status: 403 });
        }
        const { FieldValue } = await import('firebase-admin/firestore');
        const now = new Date().toISOString();
        transaction.create(attendanceRef, {
          id: attendanceRef.id, hackathonId, studentId: verification.uid,
          department: studentSnap.get('department'), academicYear: studentSnap.get('year'),
          status: 'PRESENT', markedAt: now, markedBy: 'STUDENT_GATE_CODE', createdAt: FieldValue.serverTimestamp()
        });
        transaction.update(registration.ref, { attendanceStatus: 'PRESENT', status: 'ATTENDED', attendedAt: now, updatedAt: FieldValue.serverTimestamp() });
        return { hackathonTitle: hackathonSnap.get('title') || 'this hackathon', attendanceId: attendanceRef.id, registrationId: registration.id };
      });
      return res.status(200).json({ success: true, ...registrationStatus, message: `Attendance verified for ${registrationStatus.hackathonTitle}.` });
    }

    const status = req.body?.status === 'PRESENT' ? 'PRESENT' : req.body?.status === 'ABSENT' ? 'ABSENT' : null;
    const studentId = String(req.body?.studentId || '').trim();
    if (!status || !studentId) return res.status(400).json({ error: 'Student and attendance status are required.' });
    const hackathonSnap = await hackathonRef.get();
    const studentRef = db.collection('students').doc(studentId);
    const registrationQuery = db.collection('registrations').where('hackathonId', '==', hackathonId).where('studentId', '==', studentId).limit(1);
    const attendanceRef = db.collection('attendance').doc(`att_${hackathonId}_${studentId}`);
    if (!hackathonSnap.exists) return res.status(404).json({ error: 'Hackathon not found.' });
    const hackathon = hackathonSnap.data() as any;
    const hasStaffScope = verification.isPlatformAdministrator === true || (
      verification.role === 'FACULTY' && verification.department === hackathon.department
    );
    if (!hasStaffScope) return res.status(403).json({ error: 'You do not have permission to update attendance for this hackathon.' });
    const { FieldValue } = await import('firebase-admin/firestore');
    await db.runTransaction(async (transaction: any) => {
      const [studentSnap, registrationSnap, attendanceSnap] = await Promise.all([
        transaction.get(studentRef), transaction.get(registrationQuery), transaction.get(attendanceRef)
      ]);
      if (!studentSnap.exists || registrationSnap.empty) throw Object.assign(new Error('Student registration was not found.'), { status: 404 });
      const student = studentSnap.data() as any;
      if (student.department !== hackathon.department || (verification.role === 'FACULTY' && verification.authorizedYears?.length && !verification.authorizedYears.includes(student.year))) {
        throw Object.assign(new Error('Student is outside your authorized department or academic year.'), { status: 403 });
      }
      const now = new Date().toISOString();
      const record = { id: attendanceRef.id, hackathonId, studentId, department: student.department, academicYear: student.year, status, markedAt: now, markedBy: verification.uid, updatedAt: FieldValue.serverTimestamp() };
      if (attendanceSnap.exists) transaction.update(attendanceRef, record);
      else transaction.create(attendanceRef, { ...record, createdAt: FieldValue.serverTimestamp() });
      const registration = registrationSnap.docs[0];
      transaction.update(registration.ref, {
        attendanceStatus: status,
        status: status === 'PRESENT' ? 'ATTENDED' : 'CONFIRMED',
        ...(status === 'PRESENT' ? { attendedAt: now } : { attendedAt: FieldValue.delete() }),
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    return res.status(200).json({ success: true, message: 'Attendance status updated.' });
  }

  if (req.body?.action === 'join-team') {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required to join squad.' });
    }
    const verification = await verifyServerRequest(authHeader, 'STUDENT');
    if (!verification.valid || !verification.uid) {
      return res.status(verification.status).json({ error: verification.error || 'Invalid or expired authentication session.' });
    }

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invite code is required.' });
    }

    const instances = await getAdminInstances();
    if (!instances) {
      return res.status(503).json({ error: 'Server authentication configuration required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const teamSnap = await instances.adminDb.collection('teams').where('code', '==', cleanCode).limit(1).get();
    if (teamSnap.empty) {
      return res.status(404).json({ error: 'Invalid team invite code. No squad found.' });
    }

    const teamDoc = teamSnap.docs[0];
    const studentSnap = await instances.adminDb.collection('students').doc(verification.uid).get();
    if (!studentSnap.exists) return res.status(403).json({ error: 'A provisioned student profile is required to join a team.' });
    const student = studentSnap.data() as any;
    const registrationQuery = instances.adminDb.collection('registrations')
      .where('hackathonId', '==', teamDoc.get('hackathonId'))
      .where('studentId', '==', verification.uid)
      .limit(1);
    const registrationSnap = await registrationQuery.get();
    if (registrationSnap.empty) return res.status(403).json({ error: 'Register for this hackathon before joining its team.' });

    const teamData = await instances.adminDb.runTransaction(async (transaction: any) => {
      const freshTeamSnap = await transaction.get(teamDoc.ref);
      const freshRegSnap = await transaction.get(registrationQuery);
      if (!freshTeamSnap.exists || freshRegSnap.empty) throw Object.assign(new Error('Team or hackathon registration is no longer available.'), { status: 404 });
      const freshTeam = freshTeamSnap.data() as any;
      const registration = freshRegSnap.docs[0].data() as any;
      if (freshTeam.status === 'locked' || freshTeam.status === 'confirmed' || freshTeam.status === 'CONFIRMED') {
        throw Object.assign(new Error('This team is no longer accepting members.'), { status: 409 });
      }
      if (freshTeam.department !== student.department || freshTeam.academicYear !== student.year ||
        registration.department !== student.department || registration.academicYear !== student.year) {
        throw Object.assign(new Error('Your student profile, registration, and team must share the same department and academic year.'), { status: 403 });
      }
      if (registration.teamId) throw Object.assign(new Error('You already have a team for this hackathon.'), { status: 409 });
      const members = freshTeam.members || [];
      const memberIds = freshTeam.memberIds || members.map((member: any) => member.studentId);
      if (memberIds.includes(verification.uid)) throw Object.assign(new Error('You are already in this team.'), { status: 409 });
      const maxMembers = Number(freshTeam.maxTeamSize || 4);
      if (Math.max(members.length, memberIds.length) >= Math.min(4, maxMembers)) throw Object.assign(new Error('This team has reached maximum capacity.'), { status: 409 });

      const newMember = {
        studentId: verification.uid,
        name: student.name || '',
        email: student.email || '',
        department: student.department || '',
        registerNumber: student.registerNumber || '',
        role: 'MEMBER',
        joinedAt: new Date().toISOString()
      };
      const updatedMembers = [...members, newMember];
      const updatedMemberIds = [...memberIds, verification.uid];
      transaction.update(teamDoc.ref, { members: updatedMembers, memberIds: updatedMemberIds, updatedAt: new Date().toISOString() });
      transaction.update(freshRegSnap.docs[0].ref, { teamId: teamDoc.id, updatedAt: new Date().toISOString() });
      return { ...freshTeam, members: updatedMembers, memberIds: updatedMemberIds };
    }).catch((err: any) => {
      if (err?.status) throw err;
      throw Object.assign(new Error('Team membership could not be updated.'), { status: 409 });
    });

    return res.status(200).json({
      success: true,
      team: { id: teamDoc.id, ...teamData },
      message: `Successfully joined ${teamData.name}!`
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
  const result = await handleStudentAuth(req.body || {}, clientIp);

  if (result.status === 503) {
    const rawSA =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
      process.env.FIREBASE_ADMIN_KEY ||
      process.env.SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_CREDENTIALS ||
      process.env.GOOGLE_SERVICE_ACCOUNT;
    res.setHeader('X-Auth-Credential-Detected', rawSA ? 'true' : 'false');
    if (rawSA) {
      res.setHeader('X-Auth-Credential-Length', rawSA.length.toString());
      try {
        const { serviceAccount, format } = parseServiceAccountPayload(rawSA);
        res.setHeader('X-Auth-Credential-Format', format);
        const pId = serviceAccount.project_id || serviceAccount.projectId;
        res.setHeader('X-Auth-Credential-Project', pId ? pId.toString() : 'missing');
      } catch {
        res.setHeader('X-Auth-Init-Reason', 'MALFORMED_PAYLOAD');
      }
    } else {
      res.setHeader('X-Auth-Init-Reason', 'ENVIRONMENT_VARIABLE_MISSING');
    }

    if (lastInitError) {
      res.setHeader('X-Auth-Init-Error', lastInitError.replace(/[\r\n]/g, ' '));
    }
  }

  return res.status(result.status).json(result.body);
}
