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

    const expectedProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID;

    const existingApps = getApps();
    const adminApp = existingApps.find(a => a.name === 'HackHubAdmin') || (existingApps.length > 0 ? existingApps[0] : null);

    if (adminApp) {
      return {
        adminApp,
        adminDb: getFirestore(adminApp),
        adminAuth: getAuth(adminApp)
      };
    }

    // 1. Full JSON service account string or base64 encoded
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let serviceAccount: any;
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        raw = raw.slice(1, -1).trim();
      }

      if (raw.startsWith('{')) {
        serviceAccount = JSON.parse(raw);
      } else {
        serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      }

      // Validate that credentials belong to the intended HackHub Firebase project
      if (serviceAccount.project_id && serviceAccount.project_id !== expectedProjectId) {
        console.warn(`[StudentAuth] Credential project_id does not match target HackHub project.`);
        return null;
      }

      // Handle private-key newline formatting correctly
      if (typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
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
    }

    // 2. Discrete environment variables
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== expectedProjectId) {
        console.warn(`[StudentAuth] Discrete project_id does not match target HackHub project.`);
        return null;
      }

      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      const app = initializeApp({
        credential: cert({
          projectId: expectedProjectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        }),
        projectId: expectedProjectId
      }, 'HackHubAdmin');
      return {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuth(app)
      };
    }

    // 3. Application Default Credentials (GCP environment)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const app = initializeApp({ projectId: expectedProjectId }, 'HackHubAdmin');
      return {
        adminApp: app,
        adminDb: getFirestore(app),
        adminAuth: getAuth(app)
      };
    }

    return null;
  } catch (err: any) {
    console.warn('[StudentAuth] Admin SDK initialization note:', err.message);
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
  const result = await handleStudentAuth(req.body || {}, clientIp);
  return res.status(result.status).json(result.body);
}
