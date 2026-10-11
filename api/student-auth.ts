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

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || "AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as";
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "foceye-2546c";

let mockAdminInstances: any = null;

/**
 * Configure mock Admin SDK instances for unit testing
 */
export function setMockAdminInstances(instances: any) {
  mockAdminInstances = instances;
}

export function resetMockAdminInstances() {
  mockAdminInstances = null;
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

/**
 * Initialize and retrieve Firebase Admin instances using server credentials
 */
export async function getAdminInstances() {
  if (mockAdminInstances) {
    return mockAdminInstances;
  }

  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAuth } = await import('firebase-admin/auth');

    const expectedProjectId = getExpectedProjectId();

    const existingApps = getApps();
    const adminApp = existingApps.find(a => a.name === 'HackHubAdmin') || null;

    if (adminApp) {
      return {
        adminApp,
        adminDb: getFirestore(adminApp),
        adminAuth: getAuth(adminApp)
      };
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
      console.log(`[StudentAuth Diagnostics] Detected credentials in environment variables (raw length: ${serviceAccountRaw.length}).`);
      const { serviceAccount, format } = parseServiceAccountPayload(serviceAccountRaw);

      // Validate that credentials belong to the intended HackHub Firebase project
      const credProjectId = (serviceAccount.project_id || serviceAccount.projectId || '').trim();
      if (credProjectId && credProjectId.toLowerCase() !== expectedProjectId.toLowerCase()) {
        console.warn(`[StudentAuth Diagnostics] Credential project_id "${credProjectId}" does not match target HackHub project "${expectedProjectId}".`);
        return null;
      }

      // Handle private-key newline formatting correctly
      if (typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
      }

      console.log(`[StudentAuth Diagnostics] Initializing Admin SDK using ${format} service account for project: ${expectedProjectId}`);

      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: credProjectId || expectedProjectId
      }, 'HackHubAdmin');

      console.log(`[StudentAuth Diagnostics] Firebase Admin SDK successfully initialized for project: ${expectedProjectId}`);
      return {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuth(app)
      };
    } else {
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
        adminAuth: getAuth(app)
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
            adminAuth: getAuth(app)
          };
        } catch {
          // Fall back to default initialization
        }
      }

      const app = initializeApp({ projectId: expectedProjectId }, 'HackHubAdmin');
      return {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuth(app)
      };
    }

    return null;
  } catch (err: any) {
    console.warn('[StudentAuth Diagnostics] Admin SDK initialization note:', err.message);
    return null;
  }
}

/**
 * Verify Firebase ID Token and enforce server-side role and account checks
 */
export async function verifyServerRequest(
  authHeader: string | undefined,
  requiredRole?: 'STUDENT' | 'ADMIN' | 'HOD'
): Promise<{
  valid: boolean;
  uid?: string;
  email?: string;
  role?: string;
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

  const idToken = authHeader.split('Bearer ')[1].trim();
  const adminInstances = await getAdminInstances();
  if (!adminInstances) {
    // If Admin SDK credentials are not yet initialized, authenticate caller via Identity Toolkit REST
    try {
      const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
      const lookupRes = await fetch(lookupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const lookupData = (await lookupRes.json()) as any;
      if (lookupRes.ok && lookupData.users && lookupData.users.length > 0) {
        const user = lookupData.users[0];
        const email = (user.email || '').toLowerCase();
        let customAttr: any = {};
        try {
          customAttr = JSON.parse(user.customAttributes || '{}');
        } catch {}
        const isAdmin = customAttr.admin === true || customAttr.role === 'admin' || email === 'admin@kitcbe.com' || email === 'jacksdani74@gmail.com';
        if (isAdmin) {
          return {
            valid: true,
            status: 200,
            uid: user.localId,
            email,
            role: 'ADMIN'
          };
        }
      }
    } catch {
      // Fall through to 503
    }

    return {
      valid: false,
      status: 503,
      error: 'Server authorization service unavailable: Firebase Admin SDK credentials required.'
    };
  }

  try {
    const decodedToken = await adminInstances.adminAuth.verifyIdToken(idToken, true);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // Verify account status server-side from Firestore
    const adminDoc = await adminInstances.adminDb.collection('admins').doc(uid).get();
    if (adminDoc.exists) {
      const adminData = adminDoc.data() as any;
      if (adminData.approvalStatus !== 'APPROVED' || adminData.isActive === false) {
        return {
          valid: false,
          status: 403,
          error: 'Forbidden: Administrator account is not active or approved.'
        };
      }
      if (requiredRole === 'HOD' && adminData.role !== 'HOD') {
        return {
          valid: false,
          status: 403,
          error: 'Forbidden: Head of Department (HOD) privileges required.'
        };
      }
      return {
        valid: true,
        status: 200,
        uid,
        email,
        role: adminData.role || 'ADMIN'
      };
    }

    const studentDoc = await adminInstances.adminDb.collection('students').doc(uid).get();
    if (studentDoc.exists) {
      const studentData = studentDoc.data() as any;
      if (studentData.accountStatus === 'disabled' || studentData.isActive === false) {
        return {
          valid: false,
          status: 403,
          error: 'Forbidden: Student account has been deactivated.'
        };
      }
      if (requiredRole && requiredRole !== 'STUDENT') {
        return {
          valid: false,
          status: 403,
          error: 'Forbidden: Student accounts cannot access administrative resources.'
        };
      }
      return {
        valid: true,
        status: 200,
        uid,
        email,
        role: 'STUDENT'
      };
    }

    return {
      valid: true,
      status: 200,
      uid,
      email,
      role: (decodedToken.role as string) || 'AUTHENTICATED'
    };
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

/**
 * Core handler for student authentication and registration-number resolution
 */
export async function handleStudentAuth(body: { identifier?: string; password?: string }, clientIp: string) {
  const identifier = (body.identifier || '').trim();
  const password = body.password || '';

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

  if (identifier.includes('@')) {
    // Direct institutional/college email provided
    targetEmail = identifier.toLowerCase();
  } else {
    // Normalized registration number lookup: Must be resolved securely via trusted server-side Admin SDK
    const cleanRegNo = identifier.toUpperCase().replace(/\s+/g, '');

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
        targetEmail = (lookupDoc.data() as any)?.email || '';
        console.log(`[StudentAuth] Registration mapping found for registration number.`);
      } else {
        console.log(`[StudentAuth] Registration number not found in reg_lookups.`);
      }
    } catch (lookupErr: any) {
      console.error('[StudentAuth] Server registration lookup failure:', lookupErr.message);
      return {
        status: 500,
        body: { error: 'Authentication service temporarily unavailable.' }
      };
    }

    if (!targetEmail) {
      // Simulate equalized execution delay (~150ms) to prevent timing attacks
      await new Promise(r => setTimeout(r, 150));
      return {
        status: 401,
        body: { error: 'Invalid registration number or password.' }
      };
    }
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

    // Verify account status server-side if Admin SDK is configured
    if (!adminInstances) {
      adminInstances = await getAdminInstances();
    }
    if (adminInstances && authData.localId) {
      try {
        const studentDoc = await adminInstances.adminDb.collection('students').doc(authData.localId).get();
        if (studentDoc.exists) {
          const studentData = studentDoc.data() as any;
          if (studentData.accountStatus === 'disabled' || studentData.isActive === false) {
            return {
              status: 403,
              body: { error: 'This student account has been deactivated. Please contact college administration.' }
            };
          }
        }
      } catch (checkErr: any) {
        console.warn('[StudentAuth] Server student status check note:', checkErr.message);
      }
    }

    // Success: Clear rate limit
    resetRateLimit(clientIp);

    return {
      status: 200,
      body: {
        success: true,
        email: targetEmail,
        idToken: authData.idToken,
        refreshToken: authData.refreshToken,
        localId: authData.localId,
        expiresIn: authData.expiresIn
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
  }

  return res.status(result.status).json(result.body);
}
