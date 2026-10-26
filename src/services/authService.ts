import { auth, db } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { useAppStore, CurrentUser } from '../lib/store';
import { Student, Admin, UserRole } from '../types';
import { isSupportedDepartment, isValidSpecialization, sanitizeCustomSpecialization } from '../constants/departments';

let studentAuthResolver: ((identifier: string, pass: string) => Promise<{ status: number; data: any }>) | null = null;

export function setStudentAuthResolver(resolver: typeof studentAuthResolver) {
  studentAuthResolver = resolver;
}

export function resetStudentAuthResolver() {
  studentAuthResolver = null;
}

function isCredentialMismatch(err: any): boolean {
  if (!err) return false;
  const code = (err.code || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();

  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/invalid-login-credentials' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-email'
  ) {
    return true;
  }

  if (
    msg.includes('invalid-credential') ||
    msg.includes('invalid_credential') ||
    msg.includes('invalid-login-credentials') ||
    msg.includes('invalid_login_credentials') ||
    msg.includes('user-not-found') ||
    msg.includes('wrong-password') ||
    msg.includes('invalid_password') ||
    msg.includes('email_not_found') ||
    msg.includes('invalid credential') ||
    msg.includes('invalid password')
  ) {
    return true;
  }

  return false;
}

function normalizeRegistrationNumber(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function hasActiveStudentStatus(student: Student): boolean {
  const data = student as any;
  return data.accountStatus === 'active' || data.isActive === true;
}

export const authService = {
  /**
   * Register a new student in Firebase Auth and create Firestore profile in students/{uid}
   */
  async registerStudent(
    _email: string,
    _pass: string,
    _studentInfo: {
      name: string;
      registerNumber: string;
      phone?: string;
      department: string;
      year?: string;
    }
  ): Promise<CurrentUser> {
    throw new Error('Student accounts are provisioned by an authorized administrator. Public student registration is closed.');
  },

  /**
   * Log in student with either registration number OR email address + password
   */
  async loginStudent(identifier: string, pass: string): Promise<CurrentUser> {
    return this.loginStudentWithIdentifier(identifier, pass);
  },

  async loginStudentWithIdentifier(identifier: string, pass: string): Promise<CurrentUser> {
    const rawInput = identifier.trim();
    const isEmailLogin = rawInput.includes('@');
    if (!rawInput) {
      throw new Error('Please enter your registration number or registered email address.');
    }
    if (!pass) {
      throw new Error('Please enter your password.');
    }

    let targetEmail: string = '';
    let resolvedUid: string | null = null;

    if (isEmailLogin) {
      targetEmail = rawInput.toLowerCase();
    } else {
      const cleanRegNo = normalizeRegistrationNumber(rawInput);
      if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(cleanRegNo)) {
        throw new Error('Enter a valid college registration number.');
      }
      // Architecture Note: Direct client read of reg_lookups collection is forbidden by firestore.rules.
      // Registration lookup resolution is routed through trusted backend endpoint /api/student-auth.
      let resolvedViaApi = false;

      if (studentAuthResolver) {
        const res = await studentAuthResolver(cleanRegNo, pass);
        if (res.status === 429) {
          throw new Error(res.data?.error || 'Too many login attempts. Please wait 1 minute before trying again.');
        }
        if (res.status === 401) {
          throw new Error('Invalid registration number or password.');
        }
        if (res.status === 403) {
          throw new Error(res.data?.error || 'This student account has been deactivated. Please contact college administration.');
        }
        if (res.status === 503) {
          throw new Error(res.data?.error || 'Registration number login requires server configuration. Please sign in with your college email.');
        }
        if (res.status === 200 && res.data?.email && res.data?.localId) {
          targetEmail = String(res.data.email).trim().toLowerCase();
          resolvedUid = String(res.data.localId);
          resolvedViaApi = true;
        } else {
          throw new Error(res.data?.error || 'Authentication service temporarily unavailable.');
        }
      } else if (typeof fetch === 'function') {
        try {
          const apiRes = await fetch('/api/student-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: cleanRegNo, password: pass })
          });

          if (apiRes.status === 429) {
            const data = await apiRes.json().catch(() => ({}));
            throw new Error(data.error || 'Too many login attempts. Please wait 1 minute before trying again.');
          }

          if (apiRes.status === 401) {
            throw new Error('Invalid registration number or password.');
          }

          if (apiRes.status === 403) {
            const data = await apiRes.json().catch(() => ({}));
            throw new Error(data.error || 'This student account has been deactivated. Please contact college administration.');
          }

          if (apiRes.status === 503) {
            const data = await apiRes.json().catch(() => ({}));
            throw new Error(data.error || 'Registration number login requires server configuration. Please sign in with your college email.');
          }

          if (apiRes.ok) {
            const data = await apiRes.json().catch(() => ({}));
            if (data?.email && data?.localId) {
              targetEmail = String(data.email).trim().toLowerCase();
              resolvedUid = String(data.localId);
              resolvedViaApi = true;
            }
          } else {
            const errData = await apiRes.json().catch(() => ({}));
            throw new Error(errData?.error || 'Authentication service temporarily unavailable.');
          }
        } catch (apiErr: any) {
          if (
            apiErr.message?.includes('Invalid') ||
            apiErr.message?.includes('Too many') ||
            apiErr.message?.includes('deactivated') ||
            apiErr.message?.includes('configuration required') ||
            apiErr.message?.includes('temporarily unavailable')
          ) {
            throw apiErr;
          }
        }
      }

      if (!resolvedViaApi && !targetEmail) {
        throw new Error('Unable to resolve registration number. Please log in using your college email address.');
      }
    }

    // Authenticate with Firebase Email/Password
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, targetEmail, pass);
    } catch (authErr: any) {
      if (isCredentialMismatch(authErr)) {
        throw new Error(
          rawInput.includes('@')
            ? 'Invalid email or password.'
            : 'Invalid registration number or password.'
        );
      }
      if (authErr.code === 'auth/too-many-requests' || authErr.message?.includes('too-many-requests')) {
        throw new Error('Too many failed sign in attempts. Please try again in a few minutes.');
      }
      if (authErr.code === 'auth/user-disabled' || authErr.message?.includes('user-disabled')) {
        throw new Error('This student account has been disabled. Please contact college administration.');
      }
      // Safe fallback ensuring generic error
      throw new Error(
        rawInput.includes('@')
          ? 'Invalid email or password.'
          : 'Invalid registration number or password.'
      );
    }

    const uid = userCredential.user.uid;

    if (
      (resolvedUid && uid !== resolvedUid) ||
      (userCredential.user.email || '').trim().toLowerCase() !== targetEmail
    ) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error(isEmailLogin ? 'Invalid email or password.' : 'Invalid registration number or password.');
    }

    // Retrieve verified student profile from Firestore
    const studentSnap = await getDoc(doc(db, 'students', uid));
    let studentData: Student | null = null;

    if (studentSnap.exists()) {
      studentData = studentSnap.data() as Student;
    }

    if (!studentData) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error(
        'Student profile record not found. Your account must be provisioned by college administration.'
      );
    }

    if (studentData.uid && studentData.uid !== uid) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error('Access denied: student profile does not match the authenticated account.');
    }

    if ((studentData.email || '').trim().toLowerCase() !== targetEmail) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error(isEmailLogin ? 'Invalid email or password.' : 'Invalid registration number or password.');
    }

    if (!isEmailLogin && normalizeRegistrationNumber(
      studentData.registrationNumberNormalized || studentData.registerNumber
    ) !== normalizeRegistrationNumber(rawInput)) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error('Invalid registration number or password.');
    }

    // Verify account status
    const inactive = isEmailLogin
      ? studentData.accountStatus === 'disabled' || (studentData as any).accountStatus === 'deactivated' || (studentData as any).isActive === false
      : !hasActiveStudentStatus(studentData);
    if (inactive) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error('This student account has been deactivated. Please contact college administration.');
    }

    // Verify student role
    const studentRole = (studentData.role || '').toUpperCase();
    if (studentRole !== 'STUDENT') {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error('Access denied: account does not have student authorization.');
    }

    const currentUser: CurrentUser = {
      uid,
      email: userCredential.user.email || targetEmail,
      role: 'STUDENT',
      studentData
    };

    useAppStore.getState().setCurrentUser(currentUser);
    return currentUser;
  },

  /**
   * Register a new faculty coordinator / admin account in Firebase Auth and Firestore admins/{uid}
   */
  async registerAdmin(adminInfo: {
    name: string;
    email: string;
    password: string;
    phone: string;
    department: string;
    designation: string;
    facultyId: string;
    institution?: string;
    researchSpecialization?: string;
    customSpecialization?: string;
  }): Promise<{ uid: string; email: string }> {
    const cleanEmail = adminInfo.email.trim().toLowerCase();
    const cleanDept = adminInfo.department.trim();

    if (!isSupportedDepartment(cleanDept)) {
      throw new Error(`Invalid department "${cleanDept}". HackHub strictly supports Biotechnology and Biomedical Engineering.`);
    }

    const validSpec = adminInfo.researchSpecialization?.trim() || '';
    if (!isValidSpecialization(cleanDept, validSpec)) {
      throw new Error(`Select a valid research specialization for ${cleanDept}.`);
    }
    let validCustom = '';
    if (validSpec === 'Other') {
      validCustom = sanitizeCustomSpecialization(adminInfo.customSpecialization);
      if (validCustom.length < 3) {
        throw new Error('Please specify a valid custom research specialization (at least 3 characters).');
      }
    }

    console.log('[AuthService] Initiating faculty registration for:', cleanEmail);

    let userCredential;
    let isNewlyCreated = false;

    // 1. Create or recover Firebase Auth account
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, adminInfo.password);
      isNewlyCreated = true;
      console.log('[AuthService] Firebase Auth account created successfully for UID:', userCredential.user.uid);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        // Safe Recovery Path: The Auth account exists, potentially from a previous attempt where Firestore write was interrupted
        console.log('[AuthService] Email in use. Checking for incomplete registration recovery for:', cleanEmail);
        try {
          userCredential = await signInWithEmailAndPassword(auth, cleanEmail, adminInfo.password);
          console.log('[AuthService] Recovery sign-in succeeded for UID:', userCredential.user.uid);

          // Check if profile is already registered in admins
          const existingAdminSnap = await getDoc(doc(db, 'admins', userCredential.user.uid));
          if (existingAdminSnap.exists()) {
            await signOut(auth);
            throw new Error(
              'An administrator account with this email already exists. Please proceed to Admin Sign In.'
            );
          }

          // If no admin doc exists, this was an incomplete registration where Auth succeeded but profile write failed.
          // Proceed with creating the profile using this authenticated session.
        } catch (recoveryErr: any) {
          if (
            recoveryErr.message?.includes('already been submitted') ||
            recoveryErr.message?.includes('already exists')
          ) {
            throw recoveryErr;
          }
          throw new Error('An account with this email already exists. If this is your account, please check your password or sign in.');
        }
      } else if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 8 characters long and contain letters and numbers.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid institutional email address.');
      } else {
        throw new Error(err.message || 'Unable to register faculty account. Please try again.');
      }
    }

    const uid = userCredential.user.uid;

    const adminRecord: Admin = {
      uid,
      name: adminInfo.name.trim(),
      email: cleanEmail,
      phone: adminInfo.phone.trim(),
      department: cleanDept,
      designation: adminInfo.designation.trim(),
      facultyId: adminInfo.facultyId.trim(),
      institution: adminInfo.institution?.trim() || 'KalaignarKarunanidhi Institute Of Technology',
      role: 'FACULTY',
      approvalStatus: 'APPROVED',
      isActive: true,
      accountStatus: 'active',
      ...(validSpec ? { researchSpecialization: validSpec } : {}),
      ...(validCustom ? { customSpecialization: validCustom } : {})
    };

    // 2. Write faculty profile to Firestore at admins/{uid}
    try {
      console.log('[AuthService] Writing faculty profile to admins/' + uid);
      await setDoc(doc(db, 'admins', uid), {
        ...adminRecord,
        role: 'FACULTY',
        approvalStatus: 'APPROVED',
        isActive: true,
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Confirm profile document was successfully created
      const verifySnap = await getDoc(doc(db, 'admins', uid));
      if (!verifySnap.exists()) {
        throw new Error('Profile verification failed: admin document was not created.');
      }
      console.log('[AuthService] Faculty profile confirmed in Firestore for UID:', uid);
    } catch (firestoreErr: any) {
      console.error('[AuthService] Profile creation failed for UID:', uid, firestoreErr.code, firestoreErr.message);
      // Clean up newly created auth user so the account is not orphaned
      if (isNewlyCreated) {
        try {
          await userCredential.user.delete();
          console.log('[AuthService] Cleaned up auth account after profile creation failure.');
        } catch (delErr: any) {
          console.warn('[AuthService] Rollback auth deletion warning:', delErr.message);
        }
      }
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error('Failed to save faculty profile: ' + (firestoreErr.message || 'Permission denied'));
    }

    // 4. Sign out so user is not automatically authenticated with admin privileges
    await signOut(auth);
    useAppStore.getState().logout();

    return { uid, email: cleanEmail };
  },

  /**
   * Log in admin with verified Firebase credentials & check admins/{uid}
   */
  async loginAdmin(email: string, pass: string): Promise<CurrentUser> {
    try {
      console.log('[AuthService] Attempting admin sign in for:', email.trim().toLowerCase());
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const uid = userCredential.user.uid;

      const adminDocRef = doc(db, 'admins', uid);
      const adminSnap = await getDoc(adminDocRef);

      if (!adminSnap.exists()) {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error('This account does not have administrator access.');
      }

      const adminData = adminSnap.data() as Admin;
      const roleUpper = (adminData.role || '').toUpperCase();

      const isStaffRole = ['ADMIN', 'FACULTY'].includes(roleUpper);
      if (!isStaffRole) {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error('This account does not have administrator access.');
      }

      if (adminData.isActive === false || (adminData as any).accountStatus === 'deactivated') {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error('This administrator account has been deactivated. Please contact the department administrator.');
      }

      const effectiveRole: UserRole = adminData.isPlatformAdmin === true ? 'ADMIN' : 'FACULTY';

      const currentUser: CurrentUser = {
        uid,
        email: userCredential.user.email || email.trim().toLowerCase(),
        role: effectiveRole,
        adminData: {
          ...adminData,
          role: effectiveRole
        }
      };

      useAppStore.getState().setCurrentUser(currentUser);
      console.log('[AuthService] Admin sign in successful for UID:', uid, 'Role:', effectiveRole);
      return currentUser;
    } catch (err: any) {
      if (
        err.message?.includes('pending approval') ||
        err.message?.includes('not approved') ||
        err.message?.includes('deactivated') ||
        err.message === 'This account does not have administrator access.' ||
        err.message === 'You do not have permission to access the admin portal.'
      ) {
        throw err;
      }
      if (isCredentialMismatch(err)) {
        throw new Error('Invalid email or password.');
      }
      if (err.code === 'auth/too-many-requests' || err.message?.includes('too-many-requests')) {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      if (err.code === 'auth/user-disabled' || err.message?.includes('user-disabled')) {
        throw new Error('This administrator account has been disabled.');
      }
      throw new Error('Invalid email or password.');
    }
  },

  /**
   * Reset student password via email or registration number (safe against enumeration)
   */
  async resetStudentPassword(identifier: string): Promise<void> {
    const rawInput = identifier.trim();
    if (!rawInput) return;

    let targetEmail = '';
    if (rawInput.includes('@')) {
      targetEmail = rawInput.toLowerCase();
    } else {
      // Registration lookup documents are private and not accessible to unauthenticated clients.
      // Password reset instructions must be requested via the student's registered college email.
      return;
    }

    if (targetEmail) {
      try {
        await sendPasswordResetEmail(auth, targetEmail);
      } catch (err) {
        // Generic catch
      }
    }
  },

  /**
   * Send password reset email via Firebase Auth
   */
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  },

  /**
   * Google Sign-In for students with provisioned accounts
   */
  async loginWithGoogle(): Promise<CurrentUser> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const uid = userCredential.user.uid;
    const email = (userCredential.user.email || '').trim().toLowerCase();

    // Verify student profile exists
    const studentSnap = await getDoc(doc(db, 'students', uid));
    let studentData: Student | null = null;
    if (studentSnap.exists()) {
      studentData = studentSnap.data() as Student;
    }

    if (!studentData) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error('Student profile record not found. Your account must be provisioned by college administration.');
    }

    if (
      String(studentData.role || '').toUpperCase() !== 'STUDENT' ||
      (studentData.uid && studentData.uid !== uid) ||
      String(studentData.email || '').trim().toLowerCase() !== email
    ) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error('Access denied: account does not match a provisioned student profile.');
    }

    if (studentData.accountStatus === 'disabled' || (studentData as any).accountStatus === 'deactivated' || (studentData as any).isActive === false) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error('This student account has been deactivated. Please contact college administration.');
    }

    const currentUser: CurrentUser = {
      uid,
      email,
      role: 'STUDENT',
      studentData
    };

    useAppStore.getState().setCurrentUser(currentUser);
    return currentUser;
  },

  /**
   * Sign out from Firebase Authentication
   */
  async logout(): Promise<void> {
    await signOut(auth);
    useAppStore.getState().logout();
  }
};
