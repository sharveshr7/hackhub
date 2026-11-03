/**
 * HackHub Serverless — Centralized Firebase Admin SDK Initialization Module
 *
 * Provides a single, unified server-only Firebase Admin SDK instance across all API routes:
 * 1. Supports full JSON or base64-encoded service account credentials (FIREBASE_SERVICE_ACCOUNT, etc.)
 * 2. Supports discrete environment variables (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
 * 3. Supports Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)
 * 4. Supports local development credentials via Firebase CLI configstore fallback
 * 5. Prevents duplicate Firebase App initialization and SDK credential mismatch errors
 * 6. Enforces target project ID integrity (foceye-2546c)
 * 7. Never exposes service credentials to the client
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TARGET_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  'foceye-2546c';

export function getExpectedProjectId(): string {
  return TARGET_PROJECT_ID.trim();
}

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

export function parseServiceAccountPayload(rawPayload: string): { serviceAccount: any; format: string } {
  let raw = (rawPayload || '').trim();
  if (raw.startsWith('```') && raw.endsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1).trim();
  }
  if (raw.includes('\\"')) {
    try {
      const unescaped = raw.replace(/\\"/g, '"');
      if (unescaped.startsWith('{')) {
        return { serviceAccount: JSON.parse(unescaped), format: 'escaped_json' };
      }
    } catch {}
  }
  if (raw.startsWith('{')) {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
      return { serviceAccount: JSON.parse(parsed.trim()), format: 'stringified_json' };
    }
    return { serviceAccount: parsed, format: 'raw_json' };
  }
  try {
    const cleanBase64 = raw.replace(/\s+/g, '');
    let decoded = Buffer.from(cleanBase64, 'base64').toString('utf8').trim();
    if (decoded.charCodeAt(0) === 0xfeff) decoded = decoded.slice(1).trim();
    if (decoded.startsWith('```')) decoded = decoded.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    if ((decoded.startsWith('"') && decoded.endsWith('"')) || (decoded.startsWith("'") && decoded.endsWith("'"))) {
      decoded = decoded.slice(1, -1).trim();
    }
    if (decoded.startsWith('{')) {
      return { serviceAccount: JSON.parse(decoded), format: 'base64_json' };
    }
  } catch {}
  throw new Error('Service account string is neither valid JSON nor base64-encoded JSON.');
}

let mockAdminInstances: any = null;
let cachedAdminInstances: any = null;
let lastInitError: string | null = null;

export function setMockAdminInstances(instances: any) {
  mockAdminInstances = instances;
}

export function resetMockAdminInstances() {
  mockAdminInstances = null;
  cachedAdminInstances = null;
  lastInitError = null;
}

export function getAdminInitStatus(): { isInitialized: boolean; error: string | null; projectId: string } {
  return {
    isInitialized: Boolean(mockAdminInstances || cachedAdminInstances),
    error: lastInitError,
    projectId: TARGET_PROJECT_ID
  };
}

export async function getAdminInstances() {
  if (mockAdminInstances) return mockAdminInstances;
  if (cachedAdminInstances) return cachedAdminInstances;

  const expectedProjectId = getExpectedProjectId();

  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAuth } = await import('firebase-admin/auth');

    // 1. Check existing Firebase Admin Apps
    const existingApps = getApps();
    const existingAdminApp = existingApps.find((a) => a.name === 'HackHubAdmin');
    if (existingAdminApp) {
      try {
        const db = getFirestore(existingAdminApp);
        cachedAdminInstances = {
          adminApp: existingAdminApp,
          adminDb: db,
          adminAuth: getAuth(existingAdminApp)
        };
        lastInitError = null;
        return cachedAdminInstances;
      } catch {
        // App exists without certificate credentials; will proceed with custom/fallback
      }
    }

    // 2. Full JSON / base64 service account environment configuration
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
      const { serviceAccount } = parseServiceAccountPayload(serviceAccountRaw);
      const credProjectId = (serviceAccount.project_id || serviceAccount.projectId || '').trim();
      if (expectedProjectId && credProjectId && credProjectId.toLowerCase() !== expectedProjectId.toLowerCase()) {
        const mismatch = `Service account project_id "${credProjectId}" does not match target project "${expectedProjectId}".`;
        lastInitError = mismatch;
        console.warn(`[FirebaseAdmin] ${mismatch}`);
        return null;
      }
      if (typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
      }
      const app = initializeApp(
        {
          credential: cert(serviceAccount),
          projectId: credProjectId || expectedProjectId
        },
        'HackHubAdmin'
      );
      cachedAdminInstances = {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuth(app)
      };
      lastInitError = null;
      return cachedAdminInstances;
    }

    // 3. Discrete environment variables (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
    const clientEmail =
      process.env.FIREBASE_CLIENT_EMAIL ||
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      process.env.CLIENT_EMAIL;

    const privateKeyRaw =
      process.env.FIREBASE_PRIVATE_KEY ||
      process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
      process.env.PRIVATE_KEY;

    if (clientEmail && privateKeyRaw) {
      const privateKey = normalizePrivateKey(privateKeyRaw);
      const app = initializeApp(
        {
          credential: cert({
            projectId: expectedProjectId,
            clientEmail: clientEmail.trim().replace(/^["']|["']$/g, ''),
            privateKey
          }),
          projectId: expectedProjectId
        },
        'HackHubAdmin'
      );
      cachedAdminInstances = {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuth(app)
      };
      lastInitError = null;
      return cachedAdminInstances;
    }

    // 4. Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const gCred = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
      if (gCred.startsWith('{') || gCred.startsWith('"') || (!gCred.includes('/') && !gCred.includes('\\') && gCred.length > 100)) {
        try {
          const { serviceAccount } = parseServiceAccountPayload(gCred);
          if (typeof serviceAccount.private_key === 'string') {
            serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
          }
          const app = initializeApp(
            {
              credential: cert(serviceAccount),
              projectId: serviceAccount.project_id || expectedProjectId
            },
            'HackHubAdmin'
          );
          cachedAdminInstances = {
            adminApp: app,
            adminDb: getFirestore(app),
            adminAuth: getAuth(app)
          };
          lastInitError = null;
          return cachedAdminInstances;
        } catch {}
      } else if (fs.existsSync(gCred)) {
        try {
          const content = fs.readFileSync(gCred, 'utf8');
          const { serviceAccount } = parseServiceAccountPayload(content);
          if (typeof serviceAccount.private_key === 'string') {
            serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
          }
          const app = initializeApp(
            {
              credential: cert(serviceAccount),
              projectId: serviceAccount.project_id || expectedProjectId
            },
            'HackHubAdmin'
          );
          cachedAdminInstances = {
            adminApp: app,
            adminDb: getFirestore(app),
            adminAuth: getAuth(app)
          };
          lastInitError = null;
          return cachedAdminInstances;
        } catch {}
      }
    }

    // 5. Local Development Fallback: Firebase CLI credentials from user configstore
    if (process.env.DISABLE_LOCAL_CLI_AUTH !== 'true') {
      try {
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
              const app = initializeApp(
                {
                  credential: customCredential,
                  projectId: expectedProjectId
                },
                'HackHubAdmin_LocalCLI'
              );

              cachedAdminInstances = {
                adminApp: app,
                adminDb: directDb as any,
                adminAuth: getAuth(app)
              };
              lastInitError = null;
              return cachedAdminInstances;
            }
          }
        }
      } catch (cliErr: any) {
        console.warn('[FirebaseAdmin] Local CLI fallback note:', cliErr?.message);
      }
    }

    lastInitError = 'Firebase Admin credentials not configured. Please set FIREBASE_SERVICE_ACCOUNT in your server environment.';
    console.warn(`[FirebaseAdmin] ${lastInitError}`);
    return null;
  } catch (err: any) {
    lastInitError = err?.message || String(err);
    console.error('[FirebaseAdmin] Failed to initialize Firebase Admin SDK:', lastInitError);
    return null;
  }
}

/**
 * Unified Server Request Authorization Verification
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
  isDepartmentApprover?: boolean;
  name?: string;
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
  const instances = await getAdminInstances();
  if (!instances?.adminAuth || !instances.adminDb) {
    return {
      valid: false,
      status: 503,
      error: 'Server authorization service unavailable: Firebase Admin SDK credentials required.'
    };
  }

  try {
    const decodedToken = await instances.adminAuth.verifyIdToken(idToken, true);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // Check Admins/Faculty collection
    const adminDoc = await instances.adminDb.collection('admins').doc(uid).get();
    if (adminDoc.exists) {
      const adminData = adminDoc.data() as any;
      const storedRole = String(adminData.role || '').toUpperCase();
      if (adminData.isActive === false || adminData.accountStatus === 'deactivated' || !['ADMIN', 'FACULTY'].includes(storedRole)) {
        return { valid: false, status: 403, error: 'Forbidden: Staff account is deactivated or unauthorized.' };
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
        name: adminData.name || decodedToken.name || '',
        role,
        department: adminData.department,
        authorizedYears: Array.isArray(adminData.authorizedYears) ? adminData.authorizedYears : [],
        isPlatformAdministrator: adminData.isPlatformAdmin === true,
        isDepartmentApprover: adminData.isDepartmentApprover === true
      };
    }

    // Check Students collection
    const studentDoc = await instances.adminDb.collection('students').doc(uid).get();
    if (studentDoc.exists) {
      const studentData = studentDoc.data() as any;
      const accountStatus = String(studentData?.accountStatus || '').toLowerCase();
      if (accountStatus && accountStatus !== 'active') return { valid: false, status: 403, error: 'Forbidden: Student account has been deactivated.' };
      if (studentData?.isActive !== undefined && studentData.isActive !== true) return { valid: false, status: 403, error: 'Forbidden: Student account has been deactivated.' };
      if (requiredRole && requiredRole !== 'STUDENT') {
        return { valid: false, status: 403, error: 'Forbidden: Student accounts cannot access staff resources.' };
      }
      return {
        valid: true,
        status: 200,
        uid,
        email,
        name: studentData.name || decodedToken.name || '',
        role: 'STUDENT',
        department: studentData.department,
        authorizedYears: studentData.year ? [studentData.year] : []
      };
    }

    return { valid: false, status: 403, error: 'Forbidden: No authorized HackHub profile is linked to this account.' };
  } catch (err: any) {
    return {
      valid: false,
      status: 401,
      error:
        err.code === 'auth/id-token-expired'
          ? 'Session expired. Please log in again.'
          : 'Unauthorized: Invalid authentication credentials.'
    };
  }
}
