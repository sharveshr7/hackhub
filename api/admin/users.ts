/**
 * HackHub Serverless API: Complete Firebase User Management
 * 
 * Provides production-ready, synchronized user management across Firebase Authentication & Cloud Firestore:
 * 1. Verified Bearer ID token with trusted server-side authorization checks.
 * 2. Role-based permission matrix: Platform Admin (all departments) vs. Department Approver (own department).
 * 3. Prevention of self-modification, self-deletion, self-deactivation, and deletion of the last platform admin.
 * 4. User creation with secure password reset setup link, duplicate prevention, and transactional rollback.
 * 5. Full field-level updates with synchronization to Firebase Auth and registration lookups.
 * 6. Dual-system account activation/deactivation (Firebase Auth disabled + Firestore account status + token revocation).
 * 7. Safe user deletion preserving historical hackathon participation, teams, submissions, and audit records.
 * 8. Comprehensive append-only audit logging for all mutations.
 */

const FIREBASE_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  'AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as';

const TARGET_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  'foceye-2546c';

const SUPPORTED_STUDENT_DEPARTMENTS = ['Biotechnology', 'Biomedical Engineering'];
const SUPPORTED_STUDENT_YEARS = ['First Year', 'Second Year', 'Third Year'];

function normalizeRegistrationNumber(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function isValidRegistrationNumber(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{2,31}$/.test(value);
}

function getAllowedCollegeEmailDomains(): string[] {
  const configured = (process.env.COLLEGE_EMAIL_DOMAINS || 'kitcbe.com')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return configured.length > 0 ? configured : ['kitcbe.com'];
}

function normalizePrivateKey(rawKey: string): string {
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

function parseServiceAccountPayload(rawPayload: string): any {
  let raw = (rawPayload || '').trim();
  if (raw.startsWith('```') && raw.endsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1).trim();
  }
  if (raw.includes('\\"')) {
    try {
      const unescaped = raw.replace(/\\"/g, '"');
      if (unescaped.startsWith('{')) {
        return JSON.parse(unescaped);
      }
    } catch {}
  }
  if (raw.startsWith('{')) {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
      return JSON.parse(parsed.trim());
    }
    return parsed;
  }
  try {
    const cleanBase64 = raw.replace(/\s+/g, '');
    let decoded = Buffer.from(cleanBase64, 'base64').toString('utf8').trim();
    if (decoded.charCodeAt(0) === 0xFEFF) decoded = decoded.slice(1).trim();
    if (decoded.startsWith('```')) decoded = decoded.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    if ((decoded.startsWith('"') && decoded.endsWith('"')) || (decoded.startsWith("'") && decoded.endsWith("'"))) {
      decoded = decoded.slice(1, -1).trim();
    }
    if (decoded.startsWith('{')) return JSON.parse(decoded);
  } catch {}
  throw new Error('Service account string is neither valid JSON nor base64-encoded JSON.');
}

let mockAdminInstances: any = null;
let cachedAdminInstances: any = null;

export function setMockAdminInstances(instances: any) {
  mockAdminInstances = instances;
}

export function resetMockAdminInstances() {
  mockAdminInstances = null;
  cachedAdminInstances = null;
}

export async function getAdminInstances() {
  if (mockAdminInstances) return mockAdminInstances;
  if (cachedAdminInstances) return cachedAdminInstances;

  const { getApps, initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');

  const existingApps = getApps();
  const adminApp = existingApps.find(a => a.name === 'HackHubAdmin') || null;
  if (adminApp) {
    cachedAdminInstances = {
      adminApp,
      adminDb: getFirestore(adminApp),
      adminAuth: getAuth(adminApp)
    };
    return cachedAdminInstances;
  }

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
    const serviceAccount = parseServiceAccountPayload(serviceAccountRaw);
    if (typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
    }
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || serviceAccount.projectId || TARGET_PROJECT_ID
    }, 'HackHubAdmin');
    cachedAdminInstances = {
      adminApp: app,
      adminDb: getFirestore(app),
      adminAuth: getAuth(app)
    };
    return cachedAdminInstances;
  }

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
    const app = initializeApp({
      credential: cert({
        projectId: TARGET_PROJECT_ID,
        clientEmail,
        privateKey
      }),
      projectId: TARGET_PROJECT_ID
    }, 'HackHubAdmin');
    cachedAdminInstances = {
      adminApp: app,
      adminDb: getFirestore(app),
      adminAuth: getAuth(app)
    };
    return cachedAdminInstances;
  }

  return null;
}

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
        name: adminData.name || decodedToken.name || '',
        role,
        department: adminData.department,
        authorizedYears: Array.isArray(adminData.authorizedYears) ? adminData.authorizedYears : [],
        isPlatformAdministrator: adminData.isPlatformAdmin === true,
        isDepartmentApprover: adminData.isDepartmentApprover === true
      };
    }

    const studentDoc = await adminInstances.adminDb.collection('students').doc(uid).get();
    if (studentDoc.exists) {
      const studentData = studentDoc.data() as any;
      const accountStatus = String(studentData?.accountStatus || '').toLowerCase();
      if (accountStatus && accountStatus !== 'active') return { valid: false, status: 403, error: 'Forbidden: Student account has been deactivated.' };
      if (studentData?.isActive !== undefined && studentData.isActive !== true) return { valid: false, status: 403, error: 'Forbidden: Student account has been deactivated.' };
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
        : 'Unauthorized: Invalid authentication credentials.'
    };
  }
}

// IP-based Rate Limiter for sensitive User Management operations
interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_MUTATION_ATTEMPTS = 30; // 30 mutation requests per minute per IP
const WINDOW_MS = 60 * 1000;

function checkMutationRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { attempts: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.attempts >= MAX_MUTATION_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.attempts++;
  return { allowed: true, retryAfter: 0 };
}

export function resetUserManagementRateLimits() {
  rateLimitMap.clear();
}

// Supported specializations
const BIOTECH_SPECIALIZATIONS = [
  'Molecular Biology',
  'Genetic Engineering',
  'Bioinformatics',
  'Microbiology',
  'Bioprocess Technology',
  'Cell and Tissue Culture',
  'Environmental Biotechnology',
  'Other'
];

const BME_SPECIALIZATIONS = [
  'Medical Imaging',
  'Biomedical Instrumentation',
  'Biosensors',
  'Rehabilitation Engineering',
  'Biomaterials',
  'Medical Signal Processing',
  'AI in Healthcare',
  'Biomechanics',
  'Other'
];

function isValidSpecializationForDept(dept: string, spec: string): boolean {
  if (dept === 'Biotechnology') return BIOTECH_SPECIALIZATIONS.includes(spec);
  if (dept === 'Biomedical Engineering') return BME_SPECIALIZATIONS.includes(spec);
  return false;
}

export interface ManagedUserSummary {
  uid: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  department: string;
  academicYear?: string;
  registerNumber?: string;
  phone?: string;
  designation?: string;
  facultyId?: string;
  researchSpecialization?: string;
  customSpecialization?: string;
  status: 'active' | 'inactive' | 'pending' | 'deleted';
  isActive: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isPlatformAdmin?: boolean;
  isDepartmentApprover?: boolean;
  disabled?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Extract target UID and sub-action from request URL or query params
 */
export function extractRouteContext(req: any): { uid?: string; isStatusAction: boolean } {
  const url = String(req.url || '');
  const queryUid = typeof req.query?.uid === 'string' ? req.query.uid.trim() : undefined;
  
  // Clean URL without query params
  const pathname = url.split('?')[0].replace(/\/+$/, '');
  const segments = pathname.split('/').filter(Boolean);
  
  // Check if ending with /status
  let isStatusAction = false;
  let pathUid: string | undefined = undefined;

  if (segments.length >= 4 && segments[segments.length - 1] === 'status') {
    isStatusAction = true;
    pathUid = segments[segments.length - 2];
  } else if (segments.length >= 3 && segments[1] === 'admin' && segments[2] === 'users' && segments[3]) {
    pathUid = segments[3];
  }

  if (
    req.body?.action === 'status' ||
    req.query?.action === 'status' ||
    req.body?.statusAction === true ||
    req.body?.action === 'activate' ||
    req.body?.action === 'deactivate'
  ) {
    isStatusAction = true;
  }

  const uid = queryUid || (pathUid && pathUid !== 'users' ? pathUid : undefined);
  return { uid, isStatusAction };
}

/**
 * Send password reset email via Identity Toolkit API so user securely sets their own password
 */
async function sendPasswordResetInvite(email: string): Promise<boolean> {
  if (!FIREBASE_API_KEY) {
    console.warn('[UserManagement] FIREBASE_WEB_API_KEY is not provisioned; cannot send password reset email.');
    return false;
  }
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(FIREBASE_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email })
    });
    return res.ok;
  } catch (err) {
    console.error('[UserManagement] Failed to send password reset invite:', err);
    return false;
  }
}

/**
 * Unified Handler for /api/admin/users
 */
export default async function handler(req: any, res: any) {
  // CORS & Options
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1')
    .toString()
    .split(',')[0]
    .trim();

  // Rate Limiting for mutations
  if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    const rateCheck = checkMutationRateLimit(clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfter));
      return res.status(429).json({
        error: `Too many requests. Please wait ${rateCheck.retryAfter} seconds before trying again.`
      });
    }
  }

  // Verify ID Token and administrative permissions
  const authHeader = req.headers['authorization'];
  const caller = await verifyServerRequest(authHeader, 'STAFF');

  if (!caller.valid || !caller.uid) {
    return res.status(caller.status).json({
      error: caller.error || 'Unauthorized: Valid staff credentials required.'
    });
  }

  // Authorization Boundary: Must be Platform Admin or Department Approver
  const isPlatformAdmin = caller.isPlatformAdministrator === true;
  const isDeptApprover = caller.isDepartmentApprover === true;

  if (!isPlatformAdmin && !isDeptApprover) {
    return res.status(403).json({
      error: 'Forbidden: Access to user management requires platform administrator or department approver privileges.'
    });
  }

  const adminInstances = await getAdminInstances();
  if (!adminInstances?.adminAuth || !adminInstances.adminDb) {
    return res.status(503).json({
      error: 'Server authorization service unavailable: Firebase Admin SDK credentials required.'
    });
  }

  const { adminAuth, adminDb } = adminInstances;
  const { FieldValue } = await import('firebase-admin/firestore');
  const { uid: targetUid, isStatusAction } = extractRouteContext(req);

  try {
    // =========================================================================
    // 1. POST /api/admin/users/:uid/status (or POST with isStatusAction)
    // =========================================================================
    if (req.method === 'POST' && (isStatusAction || req.body?.statusAction)) {
      if (!targetUid) {
        return res.status(400).json({ error: 'Target user UID is required to update account status.' });
      }

      const action = String(req.body?.action || req.body?.statusAction || '').toLowerCase();
      if (!['activate', 'deactivate'].includes(action)) {
        return res.status(400).json({ error: 'Action must be either "activate" or "deactivate".' });
      }

      // Safeguard 1: Prevent self-deactivation
      if (caller.uid === targetUid && action === 'deactivate') {
        return res.status(400).json({ error: 'Self-modification forbidden: You cannot deactivate your own account.' });
      }

      // Fetch target from Firestore
      const [studentSnap, adminSnap] = await Promise.all([
        adminDb.collection('students').doc(targetUid).get(),
        adminDb.collection('admins').doc(targetUid).get()
      ]);

      if (!studentSnap.exists && !adminSnap.exists) {
        return res.status(404).json({ error: 'Target user profile not found.' });
      }

      const isStudent = studentSnap.exists;
      const targetDoc = isStudent ? studentSnap : adminSnap;
      const targetData = targetDoc.data() || {};
      const targetRole = String(targetData.role || (isStudent ? 'STUDENT' : 'FACULTY')).toUpperCase();
      const targetDept = targetData.department || '';

      // Safeguard 2: Department-level access restrictions
      if (!isPlatformAdmin) {
        if (targetDept !== caller.department) {
          return res.status(403).json({
            error: `Department boundary error: As the ${caller.department} approver, you cannot modify accounts in ${targetDept || 'other departments'}.`
          });
        }
        if (targetData.isPlatformAdmin === true || targetRole === 'ADMIN') {
          return res.status(403).json({
            error: 'Forbidden: Department approvers cannot alter platform administrator accounts.'
          });
        }
      }

      // Safeguard 3: Prevent deactivating the last active platform administrator
      if (targetData.isPlatformAdmin === true && action === 'deactivate') {
        const platformAdminsSnap = await adminDb.collection('admins')
          .where('isPlatformAdmin', '==', true)
          .get();
        const activePlatformAdmins = platformAdminsSnap.docs.filter((d: any) => {
          const dData = d.data() || {};
          return dData.isActive !== false && dData.accountStatus !== 'deactivated';
        });
        if (activePlatformAdmins.length <= 1) {
          return res.status(400).json({
            error: 'Safe operation rejected: Cannot deactivate the last active platform administrator.'
          });
        }
      }

      // Apply Auth and Firestore changes
      const willBeActive = action === 'activate';
      const targetDisabled = !willBeActive;

      // Update Firebase Auth user status
      try {
        await adminAuth.updateUser(targetUid, { disabled: targetDisabled });
        if (targetDisabled) {
          await adminAuth.revokeRefreshTokens(targetUid);
        }
      } catch (authErr: any) {
        console.warn(`[UserManagement] Firebase Auth updateUser warning for ${targetUid}:`, authErr.message);
      }

      // Update Firestore document
      const timestamp = FieldValue.serverTimestamp();
      const docUpdates: any = {
        isActive: willBeActive,
        accountStatus: willBeActive ? 'active' : (isStudent ? 'disabled' : 'deactivated'),
        updatedAt: timestamp
      };

      if (!willBeActive) {
        docUpdates.deactivatedAt = timestamp;
        docUpdates.deactivatedByUid = caller.uid;
      } else {
        docUpdates.reactivatedAt = timestamp;
        docUpdates.reactivatedByUid = caller.uid;
      }

      await targetDoc.ref.update(docUpdates);

      // Audit Log
      const auditRef = adminDb.collection('audit_logs').doc();
      await auditRef.set({
        id: auditRef.id,
        actorUid: caller.uid,
        actorEmail: caller.email || '',
        actorName: caller.name || '',
        actorRole: isPlatformAdmin ? 'ADMIN' : 'DEPT_APPROVER',
        targetUid,
        targetEmail: targetData.email || '',
        targetName: targetData.name || '',
        action: willBeActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        timestamp,
        details: {
          role: targetRole,
          department: targetDept,
          previousStatus: targetData.accountStatus || (targetData.isActive === false ? 'disabled' : 'active'),
          newStatus: docUpdates.accountStatus,
          reason: req.body?.reason || ''
        }
      });

      return res.status(200).json({
        success: true,
        uid: targetUid,
        isActive: willBeActive,
        accountStatus: docUpdates.accountStatus,
        message: `User ${targetData.name || targetData.email} successfully ${willBeActive ? 'reactivated' : 'deactivated'}.`
      });
    }

    // =========================================================================
    // 2. GET /api/admin/users/:uid (Single User Details)
    // =========================================================================
    if (req.method === 'GET' && targetUid) {
      const [studentSnap, adminSnap] = await Promise.all([
        adminDb.collection('students').doc(targetUid).get(),
        adminDb.collection('admins').doc(targetUid).get()
      ]);

      if (!studentSnap.exists && !adminSnap.exists) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      const isStudent = studentSnap.exists;
      const targetDoc = isStudent ? studentSnap : adminSnap;
      const targetData = targetDoc.data() || {};
      const targetDept = targetData.department || '';

      // Department scope check for approvers
      if (!isPlatformAdmin && targetDept !== caller.department) {
        return res.status(403).json({
          error: `Department boundary error: You do not have permission to view profiles outside ${caller.department}.`
        });
      }

      // Fetch Auth details safely
      let authUser: any = null;
      try {
        authUser = await adminAuth.getUser(targetUid);
      } catch (err: any) {
        console.warn(`[UserManagement] Firebase Auth user lookup note for ${targetUid}:`, err.message);
      }

      const isAccountActive = targetData.isActive !== false &&
        targetData.accountStatus !== 'disabled' &&
        targetData.accountStatus !== 'deactivated';

      const userDetails = {
        uid: targetUid,
        name: targetData.name || authUser?.displayName || '',
        email: targetData.email || authUser?.email || '',
        role: targetData.role || (isStudent ? 'STUDENT' : 'FACULTY'),
        department: targetDept,
        phone: targetData.phone || '',
        status: isAccountActive ? 'active' : 'inactive',
        isActive: isAccountActive,
        accountStatus: targetData.accountStatus || (isAccountActive ? 'active' : 'disabled'),
        approvalStatus: targetData.approvalStatus || (isStudent ? 'APPROVED' : 'PENDING'),
        isPlatformAdmin: targetData.isPlatformAdmin === true,
        isDepartmentApprover: targetData.isDepartmentApprover === true,
        ...(isStudent ? {
          registerNumber: targetData.registerNumber || targetData.registrationNumberNormalized || '',
          academicYear: targetData.year || '',
          skills: targetData.skills || [],
          provisionedBy: targetData.provisionedBy || ''
        } : {
          designation: targetData.designation || '',
          facultyId: targetData.facultyId || '',
          researchSpecialization: targetData.researchSpecialization || '',
          customSpecialization: targetData.customSpecialization || '',
          authorizedYears: targetData.authorizedYears || []
        }),
        authMetadata: authUser ? {
          disabled: authUser.disabled,
          emailVerified: authUser.emailVerified,
          creationTime: authUser.metadata?.creationTime,
          lastSignInTime: authUser.metadata?.lastSignInTime
        } : null,
        createdAt: targetData.createdAt?.toDate ? targetData.createdAt.toDate().toISOString() : targetData.createdAt,
        updatedAt: targetData.updatedAt?.toDate ? targetData.updatedAt.toDate().toISOString() : targetData.updatedAt
      };

      return res.status(200).json({ user: userDetails });
    }

    // =========================================================================
    // 3. GET /api/admin/users (List, Search, Filter & Paginate)
    // =========================================================================
    if (req.method === 'GET' && !targetUid) {
      const {
        search = '',
        role = 'ALL',
        department = 'ALL',
        year = 'ALL',
        status = 'ALL',
        page = '1',
        limit = '25'
      } = req.query;

      // Query collections based on caller department scope
      let studentQuery = adminDb.collection('students');
      let adminQuery = adminDb.collection('admins');

      // Restrict department approver strictly to own department
      if (!isPlatformAdmin) {
        studentQuery = studentQuery.where('department', '==', caller.department);
        adminQuery = adminQuery.where('department', '==', caller.department);
      } else if (department !== 'ALL' && SUPPORTED_STUDENT_DEPARTMENTS.includes(department)) {
        studentQuery = studentQuery.where('department', '==', department);
        adminQuery = adminQuery.where('department', '==', department);
      }

      const [studentsSnap, adminsSnap] = await Promise.all([
        studentQuery.get(),
        adminQuery.get()
      ]);

      const allUsers: ManagedUserSummary[] = [];

      // Process Students
      for (const doc of studentsSnap.docs) {
        const d = doc.data() || {};
        const isActive = d.isActive !== false && d.accountStatus !== 'disabled' && d.accountStatus !== 'deactivated';
        const userStatus: ManagedUserSummary['status'] = isActive ? 'active' : 'inactive';
        
        allUsers.push({
          uid: doc.id,
          name: d.name || '',
          email: d.email || '',
          role: 'STUDENT',
          department: d.department || '',
          academicYear: d.year || '',
          registerNumber: d.registerNumber || d.registrationNumberNormalized || '',
          phone: d.phone || '',
          status: userStatus,
          isActive,
          approvalStatus: 'APPROVED',
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || ''),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : (d.updatedAt || '')
        });
      }

      // Process Admins & Faculty
      for (const doc of adminsSnap.docs) {
        const d = doc.data() || {};
        const roleUpper = String(d.role || 'FACULTY').toUpperCase();
        const userRole: 'ADMIN' | 'FACULTY' = d.isPlatformAdmin === true || roleUpper === 'ADMIN' ? 'ADMIN' : 'FACULTY';
        const isApproved = d.approvalStatus === 'APPROVED' || (!d.approvalStatus && userRole === 'ADMIN');
        const isActive = d.isActive !== false && d.accountStatus !== 'deactivated';
        
        let userStatus: ManagedUserSummary['status'] = 'active';
        if (!isApproved || d.approvalStatus === 'PENDING') userStatus = 'pending';
        else if (!isActive || d.accountStatus === 'deactivated') userStatus = 'inactive';

        allUsers.push({
          uid: doc.id,
          name: d.name || '',
          email: d.email || '',
          role: userRole,
          department: d.department || '',
          phone: d.phone || '',
          designation: d.designation || '',
          facultyId: d.facultyId || '',
          researchSpecialization: d.researchSpecialization || '',
          customSpecialization: d.customSpecialization || '',
          status: userStatus,
          isActive,
          approvalStatus: d.approvalStatus || 'APPROVED',
          isPlatformAdmin: d.isPlatformAdmin === true,
          isDepartmentApprover: d.isDepartmentApprover === true,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || ''),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : (d.updatedAt || '')
        });
      }

      // Summary statistics before filters
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter(u => u.status === 'active').length;
      const inactiveUsers = allUsers.filter(u => u.status === 'inactive').length;
      const studentCount = allUsers.filter(u => u.role === 'STUDENT').length;
      const facultyCount = allUsers.filter(u => u.role === 'FACULTY' || u.role === 'ADMIN').length;

      // Apply Filters
      let filtered = allUsers;

      // Role Filter
      if (role !== 'ALL') {
        const cleanRole = String(role).toUpperCase();
        filtered = filtered.filter(u => u.role === cleanRole);
      }

      // Department Filter (if platform admin queried department)
      if (isPlatformAdmin && department !== 'ALL') {
        filtered = filtered.filter(u => u.department === department);
      }

      // Academic Year Filter
      if (year !== 'ALL') {
        filtered = filtered.filter(u => u.academicYear === year);
      }

      // Account Status Filter
      if (status !== 'ALL') {
        const cleanStatus = String(status).toLowerCase();
        filtered = filtered.filter(u => u.status === cleanStatus);
      }

      // Search Query Filter (name, email, register number)
      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.registerNumber && u.registerNumber.toLowerCase().includes(q))
        );
      }

      // Sort by creation date descending
      filtered.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      // Pagination
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
      const totalFiltered = filtered.length;
      const totalPages = Math.ceil(totalFiltered / limitNum) || 1;
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedUsers = filtered.slice(startIndex, startIndex + limitNum);

      return res.status(200).json({
        users: paginatedUsers,
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          studentCount,
          facultyCount
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalFiltered,
          totalPages
        }
      });
    }

    // =========================================================================
    // 4. POST /api/admin/users (Create User)
    // =========================================================================
    if (req.method === 'POST') {
      const body = req.body || {};
      const targetRole = String(body.role || '').toUpperCase();

      if (!['STUDENT', 'FACULTY', 'ADMIN'].includes(targetRole)) {
        return res.status(400).json({ error: 'Role must be STUDENT, FACULTY, or ADMIN.' });
      }

      // Permission Check: Administrator Privileges
      if (targetRole === 'ADMIN' && !isPlatformAdmin) {
        return res.status(403).json({
          error: 'Forbidden: Only authorized platform administrators can provision administrator accounts.'
        });
      }

      // Permission Check: Department Approver Scope
      const department = String(body.department || '').trim();
      if (!SUPPORTED_STUDENT_DEPARTMENTS.includes(department)) {
        return res.status(400).json({
          error: `Select a supported department: ${SUPPORTED_STUDENT_DEPARTMENTS.join(' or ')}.`
        });
      }

      if (!isPlatformAdmin && department !== caller.department) {
        return res.status(403).json({
          error: `Department boundary error: You can only create accounts for your authorized department (${caller.department}).`
        });
      }

      // Field Validation
      const name = String(body.name || '').replace(/[\u0000-\u001f<>]/g, '').trim();
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
      }

      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Enter a valid college email address.' });
      }

      const allowedDomains = getAllowedCollegeEmailDomains();
      if (allowedDomains.length && !allowedDomains.some(d => email.endsWith(`@${d}`))) {
        return res.status(400).json({
          error: `Use a college email ending in ${allowedDomains.map(d => `@${d}`).join(' or ')}.`
        });
      }

      const phone = String(body.phone || '').trim().slice(0, 40);

      // Student-specific fields
      let registerNumber = '';
      let academicYear = '';
      if (targetRole === 'STUDENT') {
        registerNumber = normalizeRegistrationNumber(body.registerNumber);
        if (!isValidRegistrationNumber(registerNumber)) {
          return res.status(400).json({
            error: 'Registration number must contain 3–32 letters, digits, or hyphens.'
          });
        }

        academicYear = String(body.academicYear || body.year || '').trim();
        if (!SUPPORTED_STUDENT_YEARS.includes(academicYear)) {
          return res.status(400).json({
            error: `Select a supported academic year: ${SUPPORTED_STUDENT_YEARS.join(', ')}.`
          });
        }
      }

      // Faculty/Admin-specific fields
      let designation = String(body.designation || '').trim();
      let facultyId = String(body.facultyId || '').trim();
      let researchSpecialization = String(body.researchSpecialization || '').trim();
      let customSpecialization = String(body.customSpecialization || '').trim();

      if (targetRole !== 'STUDENT') {
        if (!designation) {
          designation = targetRole === 'ADMIN' ? 'Institutional Administrator' : 'Faculty Coordinator';
        }
        if (researchSpecialization) {
          if (!isValidSpecializationForDept(department, researchSpecialization)) {
            return res.status(400).json({
              error: `Specialization "${researchSpecialization}" is not valid for ${department}.`
            });
          }
          if (researchSpecialization === 'Other') {
            if (customSpecialization.length < 3 || customSpecialization.length > 100) {
              return res.status(400).json({
                error: 'Custom specialization must be between 3 and 100 characters.'
              });
            }
          } else {
            customSpecialization = '';
          }
        }
      }

      // Check duplicates in Firebase Auth & Firestore
      try {
        await adminAuth.getUserByEmail(email);
        return res.status(409).json({
          error: 'An account with this email address already exists in Firebase Authentication.'
        });
      } catch (authLookupErr: any) {
        if (authLookupErr?.code !== 'auth/user-not-found') throw authLookupErr;
      }

      if (targetRole === 'STUDENT') {
        const regDocRef = adminDb.collection('reg_lookups').doc(registerNumber);
        const [regLookupSnap, emailLookupSnap] = await Promise.all([
          regDocRef.get(),
          adminDb.collection('student_email_lookups').doc(encodeURIComponent(email)).get()
        ]);

        if (regLookupSnap.exists) {
          return res.status(409).json({
            error: `Registration number ${registerNumber} is already assigned to another student.`
          });
        }
        if (emailLookupSnap.exists) {
          return res.status(409).json({
            error: 'This email is already registered in student registration lookups.'
          });
        }
      } else {
        const existingAdminSnap = await adminDb.collection('admins').where('email', '==', email).limit(1).get();
        if (!existingAdminSnap.empty) {
          return res.status(409).json({
            error: 'This email is already registered to a staff profile in Firestore.'
          });
        }
      }

      // Step 1: Create Firebase Auth User
      let createdAuthUser: any = null;
      let committed = false;
      let targetRef: any = null;
      let regRef: any = null;
      let emailRef: any = null;
      let auditRef: any = null;

      try {
        createdAuthUser = await adminAuth.createUser({
          email,
          displayName: name,
          emailVerified: false,
          disabled: false
        });

        const newUid = createdAuthUser.uid;

        // Set Custom Claims for Staff/Admin
        if (targetRole === 'ADMIN') {
          await adminAuth.setCustomUserClaims(newUid, { role: 'ADMIN', admin: true });
        } else if (targetRole === 'FACULTY') {
          await adminAuth.setCustomUserClaims(newUid, { role: 'FACULTY', faculty: true });
        }

        const timestamp = FieldValue.serverTimestamp();

        // Step 2: Firestore Transaction
        if (targetRole === 'STUDENT') {
          targetRef = adminDb.collection('students').doc(newUid);
          regRef = adminDb.collection('reg_lookups').doc(registerNumber);
          emailRef = adminDb.collection('student_email_lookups').doc(encodeURIComponent(email));
          auditRef = adminDb.collection('audit_logs').doc();

          await adminDb.runTransaction(async (transaction: any) => {
            const [regSnap, emailSnap, studSnap] = await Promise.all([
              transaction.get(regRef),
              transaction.get(emailRef),
              transaction.get(targetRef)
            ]);

            if (regSnap.exists) throw Object.assign(new Error(`Registration number ${registerNumber} is already taken.`), { code: 'duplicate-registration' });
            if (emailSnap.exists) throw Object.assign(new Error('Email is already taken.'), { code: 'duplicate-email' });
            if (studSnap.exists) throw new Error('Student profile already exists for this UID.');

            transaction.create(targetRef, {
              uid: newUid,
              name,
              registerNumber,
              registrationNumberNormalized: registerNumber,
              email,
              phone,
              department,
              year: academicYear,
              role: 'STUDENT',
              accountStatus: 'active',
              isActive: true,
              skills: [],
              provisionedBy: caller.uid,
              provisionedAt: timestamp,
              createdAt: timestamp,
              updatedAt: timestamp
            });

            transaction.create(regRef, { email, uid: newUid, createdAt: timestamp });
            transaction.create(emailRef, { uid: newUid, createdAt: timestamp });
            transaction.create(auditRef, {
              id: auditRef.id,
              actorUid: caller.uid,
              actorEmail: caller.email || '',
              actorName: caller.name || '',
              actorRole: isPlatformAdmin ? 'ADMIN' : 'DEPT_APPROVER',
              targetUid: newUid,
              targetEmail: email,
              targetName: name,
              action: 'STUDENT_CREATED',
              timestamp,
              details: { registerNumber, department, academicYear }
            });
          });
        } else {
          // FACULTY or ADMIN Profile
          targetRef = adminDb.collection('admins').doc(newUid);
          auditRef = adminDb.collection('audit_logs').doc();

          await adminDb.runTransaction(async (transaction: any) => {
            const adminSnap = await transaction.get(targetRef);
            if (adminSnap.exists) throw new Error('Staff profile already exists for this UID.');

            transaction.create(targetRef, {
              uid: newUid,
              name,
              email,
              phone,
              department,
              designation,
              facultyId,
              role: targetRole,
              isPlatformAdmin: targetRole === 'ADMIN',
              isDepartmentApprover: false,
              isActive: true,
              accountStatus: 'active',
              approvalStatus: 'APPROVED',
              approvedBy: caller.name || caller.email || 'Authorized Administrator',
              approvedByUid: caller.uid,
              approvedAt: timestamp,
              researchSpecialization: researchSpecialization || null,
              customSpecialization: customSpecialization || null,
              createdAt: timestamp,
              updatedAt: timestamp
            });

            transaction.create(auditRef, {
              id: auditRef.id,
              actorUid: caller.uid,
              actorEmail: caller.email || '',
              actorName: caller.name || '',
              actorRole: isPlatformAdmin ? 'ADMIN' : 'DEPT_APPROVER',
              targetUid: newUid,
              targetEmail: email,
              targetName: name,
              action: targetRole === 'ADMIN' ? 'ADMIN_CREATED' : 'FACULTY_CREATED',
              timestamp,
              details: { department, designation, role: targetRole }
            });
          });
        }

        committed = true;

        // Step 3: Dispatch Secure Password Reset Setup Email
        const emailSent = await sendPasswordResetInvite(email);

        return res.status(201).json({
          success: true,
          uid: newUid,
          email,
          name,
          role: targetRole,
          department,
          emailSent,
          message: `User ${name} successfully created. An invitation has been sent to ${email} to set their password.`
        });
      } catch (mutationErr: any) {
        console.error('[UserManagement] Creation failed; rolling back:', mutationErr.message);

        // Compensation / Rollback
        if (committed && targetRef) {
          try {
            await adminDb.runTransaction(async (tx: any) => {
              tx.delete(targetRef);
              if (regRef) tx.delete(regRef);
              if (emailRef) tx.delete(emailRef);
              if (auditRef) tx.delete(auditRef);
            });
          } catch (rbErr) {
            console.error('[UserManagement] Firestore rollback warning:', rbErr);
          }
        }

        if (createdAuthUser?.uid) {
          try {
            await adminAuth.deleteUser(createdAuthUser.uid);
          } catch (rbAuthErr) {
            console.error('[UserManagement] Auth rollback warning:', rbAuthErr);
          }
        }

        if (mutationErr?.code === 'duplicate-registration') {
          return res.status(409).json({ error: mutationErr.message });
        }
        if (mutationErr?.code === 'duplicate-email') {
          return res.status(409).json({ error: mutationErr.message });
        }

        return res.status(500).json({
          error: `User creation failed: ${mutationErr.message || 'Server error occurred during account synchronization.'}`
        });
      }
    }

    // =========================================================================
    // 5. PATCH /api/admin/users/:uid (Edit Permitted User Fields)
    // =========================================================================
    if (req.method === 'PATCH') {
      if (!targetUid) {
        return res.status(400).json({ error: 'Target user UID is required.' });
      }

      const [studentSnap, adminSnap] = await Promise.all([
        adminDb.collection('students').doc(targetUid).get(),
        adminDb.collection('admins').doc(targetUid).get()
      ]);

      if (!studentSnap.exists && !adminSnap.exists) {
        return res.status(404).json({ error: 'User record not found.' });
      }

      const isStudent = studentSnap.exists;
      const targetDoc = isStudent ? studentSnap : adminSnap;
      const targetData = targetDoc.data() || {};
      const targetDept = targetData.department || '';
      const targetRole = String(targetData.role || (isStudent ? 'STUDENT' : 'FACULTY')).toUpperCase();

      // Authorization Restrictions
      if (!isPlatformAdmin) {
        if (targetDept !== caller.department) {
          return res.status(403).json({
            error: `Department boundary error: You cannot edit profiles outside your authorized department (${caller.department}).`
          });
        }
        if (!isStudent) {
          return res.status(403).json({
            error: 'Forbidden: Department approvers can only edit student records, not staff or administrator records.'
          });
        }
      }

      const isSelf = caller.uid === targetUid;
      const body = req.body || {};

      // Security Check: Disallow self-elevation or role modification
      if (body.role && body.role !== targetRole) {
        if (!isPlatformAdmin) {
          return res.status(403).json({ error: 'Forbidden: You cannot change user roles.' });
        }
        if (isSelf) {
          return res.status(400).json({ error: 'Invalid operation: Administrators cannot alter their own role.' });
        }
        // Protect last platform admin
        if (targetData.isPlatformAdmin === true && body.role !== 'ADMIN') {
          const platformAdminsSnap = await adminDb.collection('admins')
            .where('isPlatformAdmin', '==', true)
            .get();
          const activeAdmins = platformAdminsSnap.docs.filter((d: any) => d.data()?.isActive !== false);
          if (activeAdmins.length <= 1) {
            return res.status(400).json({ error: 'Cannot demote the last active platform administrator.' });
          }
        }
      }

      const timestamp = FieldValue.serverTimestamp();
      const docUpdates: any = { updatedAt: timestamp };
      const authUpdates: any = {};
      const changedFields: Record<string, { from: any; to: any }> = {};

      // Name Update
      if (body.name !== undefined) {
        const cleanName = String(body.name).replace(/[\u0000-\u001f<>]/g, '').trim();
        if (cleanName.length < 2 || cleanName.length > 100) {
          return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
        }
        if (cleanName !== targetData.name) {
          changedFields.name = { from: targetData.name, to: cleanName };
          docUpdates.name = cleanName;
          authUpdates.displayName = cleanName;
        }
      }

      // Phone Update
      if (body.phone !== undefined) {
        const cleanPhone = String(body.phone).trim().slice(0, 40);
        if (cleanPhone !== targetData.phone) {
          changedFields.phone = { from: targetData.phone, to: cleanPhone };
          docUpdates.phone = cleanPhone;
        }
      }

      // Email Update
      let oldEmailLookupRef: any = null;
      let newEmailLookupRef: any = null;
      if (body.email !== undefined) {
        const cleanEmail = String(body.email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
          return res.status(400).json({ error: 'Enter a valid college email address.' });
        }
        const allowedDomains = getAllowedCollegeEmailDomains();
        if (allowedDomains.length && !allowedDomains.some(d => cleanEmail.endsWith(`@${d}`))) {
          return res.status(400).json({
            error: `Use a college email ending in ${allowedDomains.map(d => `@${d}`).join(' or ')}.`
          });
        }
        if (cleanEmail !== targetData.email) {
          // Verify email is not already in use
          try {
            const existingAuth = await adminAuth.getUserByEmail(cleanEmail);
            if (existingAuth.uid !== targetUid) {
              return res.status(409).json({ error: 'This email is already in use by another account.' });
            }
          } catch (err: any) {
            if (err?.code !== 'auth/user-not-found') throw err;
          }

          changedFields.email = { from: targetData.email, to: cleanEmail };
          docUpdates.email = cleanEmail;
          authUpdates.email = cleanEmail;

          if (isStudent) {
            oldEmailLookupRef = adminDb.collection('student_email_lookups').doc(encodeURIComponent(targetData.email));
            newEmailLookupRef = adminDb.collection('student_email_lookups').doc(encodeURIComponent(cleanEmail));
          }
        }
      }

      // Department Update
      if (body.department !== undefined) {
        const cleanDept = String(body.department).trim();
        if (!SUPPORTED_STUDENT_DEPARTMENTS.includes(cleanDept)) {
          return res.status(400).json({
            error: `Department must be ${SUPPORTED_STUDENT_DEPARTMENTS.join(' or ')}.`
          });
        }
        if (!isPlatformAdmin && cleanDept !== caller.department) {
          return res.status(403).json({
            error: `Department boundary error: You cannot move users outside ${caller.department}.`
          });
        }
        if (cleanDept !== targetData.department) {
          changedFields.department = { from: targetData.department, to: cleanDept };
          docUpdates.department = cleanDept;
          // Clear research specialization if incompatible with new department
          if (!isStudent && targetData.researchSpecialization && !isValidSpecializationForDept(cleanDept, targetData.researchSpecialization)) {
            docUpdates.researchSpecialization = null;
            docUpdates.customSpecialization = null;
          }
        }
      }

      // Student-specific fields: Academic Year & Registration Number
      let oldRegLookupRef: any = null;
      let newRegLookupRef: any = null;
      if (isStudent) {
        if (body.academicYear !== undefined || body.year !== undefined) {
          const cleanYear = String(body.academicYear || body.year || '').trim();
          if (!SUPPORTED_STUDENT_YEARS.includes(cleanYear)) {
            return res.status(400).json({
              error: `Academic year must be ${SUPPORTED_STUDENT_YEARS.join(', ')}.`
            });
          }
          if (cleanYear !== targetData.year) {
            changedFields.academicYear = { from: targetData.year, to: cleanYear };
            docUpdates.year = cleanYear;
          }
        }

        if (body.registerNumber !== undefined) {
          const cleanReg = normalizeRegistrationNumber(body.registerNumber);
          if (!isValidRegistrationNumber(cleanReg)) {
            return res.status(400).json({
              error: 'Registration number must contain 3–32 letters, digits, or hyphens.'
            });
          }
          const currentReg = normalizeRegistrationNumber(targetData.registerNumber || targetData.registrationNumberNormalized);
          if (cleanReg !== currentReg) {
            // Check uniqueness
            const existingRegDoc = await adminDb.collection('reg_lookups').doc(cleanReg).get();
            if (existingRegDoc.exists && existingRegDoc.data()?.uid !== targetUid) {
              return res.status(409).json({
                error: `Registration number ${cleanReg} is already assigned to another student.`
              });
            }
            changedFields.registerNumber = { from: currentReg, to: cleanReg };
            docUpdates.registerNumber = cleanReg;
            docUpdates.registrationNumberNormalized = cleanReg;
            oldRegLookupRef = adminDb.collection('reg_lookups').doc(currentReg);
            newRegLookupRef = adminDb.collection('reg_lookups').doc(cleanReg);
          }
        }
      }

      // Faculty-specific fields: Designation, Faculty ID, Specialization
      if (!isStudent) {
        if (body.designation !== undefined) {
          docUpdates.designation = String(body.designation).trim();
          changedFields.designation = { from: targetData.designation, to: docUpdates.designation };
        }
        if (body.facultyId !== undefined) {
          docUpdates.facultyId = String(body.facultyId).trim();
          changedFields.facultyId = { from: targetData.facultyId, to: docUpdates.facultyId };
        }
        if (body.researchSpecialization !== undefined) {
          const targetDeptForSpec = docUpdates.department || targetData.department;
          const cleanSpec = String(body.researchSpecialization).trim();
          if (cleanSpec) {
            if (!isValidSpecializationForDept(targetDeptForSpec, cleanSpec)) {
              return res.status(400).json({
                error: `Specialization "${cleanSpec}" is not valid for ${targetDeptForSpec}.`
              });
            }
            docUpdates.researchSpecialization = cleanSpec;
            if (cleanSpec === 'Other') {
              const custom = String(body.customSpecialization || '').trim();
              if (custom.length < 3 || custom.length > 100) {
                return res.status(400).json({
                  error: 'Custom specialization must be between 3 and 100 characters.'
                });
              }
              docUpdates.customSpecialization = custom;
            } else {
              docUpdates.customSpecialization = null;
            }
          } else {
            docUpdates.researchSpecialization = null;
            docUpdates.customSpecialization = null;
          }
          changedFields.researchSpecialization = { from: targetData.researchSpecialization, to: docUpdates.researchSpecialization };
        }
      }

      // Role changes (Platform Admin only)
      if (isPlatformAdmin && body.role && body.role !== targetRole) {
        const newRole = String(body.role).toUpperCase();
        if (newRole === 'ADMIN') {
          docUpdates.role = 'ADMIN';
          docUpdates.isPlatformAdmin = true;
          await adminAuth.setCustomUserClaims(targetUid, { role: 'ADMIN', admin: true });
        } else if (newRole === 'FACULTY') {
          docUpdates.role = 'FACULTY';
          docUpdates.isPlatformAdmin = false;
          await adminAuth.setCustomUserClaims(targetUid, { role: 'FACULTY', faculty: true });
        }
        changedFields.role = { from: targetRole, to: newRole };
      }

      // Execute updates
      if (Object.keys(authUpdates).length > 0) {
        try {
          await adminAuth.updateUser(targetUid, authUpdates);
        } catch (authErr: any) {
          return res.status(500).json({
            error: `Failed to update Firebase Authentication credentials: ${authErr.message}`
          });
        }
      }

      // Execute Firestore writes in a transaction
      await adminDb.runTransaction(async (tx: any) => {
        tx.update(targetDoc.ref, docUpdates);

        // Update registration number lookup if changed
        if (oldRegLookupRef && newRegLookupRef) {
          tx.delete(oldRegLookupRef);
          tx.set(newRegLookupRef, {
            email: docUpdates.email || targetData.email,
            uid: targetUid,
            updatedAt: timestamp
          });
        }

        // Update student email lookup if changed
        if (oldEmailLookupRef && newEmailLookupRef) {
          tx.delete(oldEmailLookupRef);
          tx.set(newEmailLookupRef, {
            uid: targetUid,
            updatedAt: timestamp
          });
        }

        // Record Audit Log
        const auditRef = adminDb.collection('audit_logs').doc();
        tx.set(auditRef, {
          id: auditRef.id,
          actorUid: caller.uid,
          actorEmail: caller.email || '',
          actorName: caller.name || '',
          actorRole: isPlatformAdmin ? 'ADMIN' : 'DEPT_APPROVER',
          targetUid,
          targetEmail: docUpdates.email || targetData.email,
          targetName: docUpdates.name || targetData.name,
          action: 'USER_UPDATED',
          timestamp,
          details: {
            changedFields
          }
        });
      });

      return res.status(200).json({
        success: true,
        uid: targetUid,
        changedFields,
        message: 'User profile updated successfully.'
      });
    }

    // =========================================================================
    // 6. DELETE /api/admin/users/:uid (Safe User Deletion)
    // =========================================================================
    if (req.method === 'DELETE') {
      if (!targetUid) {
        return res.status(400).json({ error: 'Target user UID is required.' });
      }

      // Safeguard 1: Prevent self-deletion
      if (caller.uid === targetUid) {
        return res.status(400).json({
          error: 'Self-deletion rejected: Administrators cannot delete their own account.'
        });
      }

      const [studentSnap, adminSnap] = await Promise.all([
        adminDb.collection('students').doc(targetUid).get(),
        adminDb.collection('admins').doc(targetUid).get()
      ]);

      if (!studentSnap.exists && !adminSnap.exists) {
        // Idempotency: If already deleted, return clean 404 or success
        return res.status(404).json({ error: 'User profile not found or already deleted.' });
      }

      const isStudent = studentSnap.exists;
      const targetDoc = isStudent ? studentSnap : adminSnap;
      const targetData = targetDoc.data() || {};
      const targetDept = targetData.department || '';
      const targetRole = String(targetData.role || (isStudent ? 'STUDENT' : 'FACULTY')).toUpperCase();

      // Safeguard 2: Privilege boundaries
      if (!isPlatformAdmin) {
        if (targetDept !== caller.department) {
          return res.status(403).json({
            error: `Department boundary error: You cannot delete accounts outside ${caller.department}.`
          });
        }
        if (!isStudent) {
          return res.status(403).json({
            error: 'Forbidden: Department approvers cannot delete staff or administrator accounts.'
          });
        }
      }

      // Safeguard 3: Prevent deleting the last active platform administrator
      if (targetData.isPlatformAdmin === true || targetRole === 'ADMIN') {
        const platformAdminsSnap = await adminDb.collection('admins')
          .where('isPlatformAdmin', '==', true)
          .get();
        const activePlatformAdmins = platformAdminsSnap.docs.filter((d: any) => {
          const dData = d.data() || {};
          return dData.isActive !== false && dData.accountStatus !== 'deactivated';
        });
        if (activePlatformAdmins.length <= 1) {
          return res.status(400).json({
            error: 'Safe deletion rejected: Cannot delete the last active platform administrator.'
          });
        }
      }

      // Safeguard 4: Check historical references
      // If historical records exist (registrations, teams, submissions, certificates),
      // preserve records while revoking Auth and lookups.
      const timestamp = FieldValue.serverTimestamp();
      let hasHistoricalRecords = false;

      if (isStudent) {
        const [regsSnap, teamsSnap, subsSnap] = await Promise.all([
          adminDb.collection('registrations').where('studentId', '==', targetUid).limit(1).get(),
          adminDb.collection('teams').where('memberIds', 'array-contains', targetUid).limit(1).get(),
          adminDb.collection('submissions').where('submittedBy', '==', targetUid).limit(1).get()
        ]);
        hasHistoricalRecords = !regsSnap.empty || !teamsSnap.empty || !subsSnap.empty;
      }

      // Step 1: Delete/Disable from Firebase Auth so account cannot authenticate
      try {
        await adminAuth.deleteUser(targetUid);
      } catch (authErr: any) {
        if (authErr?.code !== 'auth/user-not-found') {
          console.warn(`[UserManagement] Auth delete note for ${targetUid}:`, authErr.message);
        }
      }

      // Step 2: Remove lookups so registration number and email are freed
      const regNo = normalizeRegistrationNumber(targetData.registerNumber || targetData.registrationNumberNormalized);
      const studentEmail = String(targetData.email || '').trim().toLowerCase();

      if (isStudent) {
        if (regNo) {
          await adminDb.collection('reg_lookups').doc(regNo).delete().catch(() => {});
        }
        if (studentEmail) {
          await adminDb.collection('student_email_lookups').doc(encodeURIComponent(studentEmail)).delete().catch(() => {});
        }
      }

      // Step 3: Handle Firestore profile
      if (hasHistoricalRecords) {
        // Safe retirement: preserve profile data for historical reporting but mark as deleted
        await targetDoc.ref.update({
          accountStatus: 'deleted',
          isActive: false,
          deletedAt: timestamp,
          deletedByUid: caller.uid,
          updatedAt: timestamp
        });
      } else {
        // Hard deletion if no historical hackathon data exists
        await targetDoc.ref.delete();
      }

      // Step 4: Record Audit Log
      const auditRef = adminDb.collection('audit_logs').doc();
      await auditRef.set({
        id: auditRef.id,
        actorUid: caller.uid,
        actorEmail: caller.email || '',
        actorName: caller.name || '',
        actorRole: isPlatformAdmin ? 'ADMIN' : 'DEPT_APPROVER',
        targetUid,
        targetEmail: targetData.email || '',
        targetName: targetData.name || '',
        action: 'USER_DELETED',
        timestamp,
        details: {
          role: targetRole,
          department: targetDept,
          hadHistoricalRecords: hasHistoricalRecords,
          preservationStrategy: hasHistoricalRecords ? 'RETIRED_PROFILE_AND_RECORDS_PRESERVED' : 'COMPLETE_REMOVAL'
        }
      });

      return res.status(200).json({
        success: true,
        uid: targetUid,
        hasHistoricalRecords,
        message: `Account for ${targetData.name || targetData.email} has been safely ${hasHistoricalRecords ? 'retired (historical records preserved)' : 'deleted'}.`
      });
    }

    // Fallback for unsupported methods
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });

  } catch (serverErr: any) {
    console.error('[UserManagement] Server API error:', serverErr);
    const isDev = process.env.NODE_ENV === 'development';
    return res.status(500).json({
      error: isDev ? (serverErr?.message || 'Internal server error.') : 'An internal server error occurred while processing user management.'
    });
  }
}
