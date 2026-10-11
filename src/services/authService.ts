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

export const authService = {
  /**
   * Register a new student in Firebase Auth and create Firestore profile in students/{uid}
   */
  async registerStudent(
    email: string,
    pass: string,
    studentInfo: {
      name: string;
      registerNumber: string;
      phone?: string;
      department: string;
      year?: string;
    }
  ): Promise<CurrentUser> {
    const cleanRegNo = studentInfo.registerNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Create Firebase Auth user first (establishes authentication for Firestore operations)
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        throw new Error('This email address is already registered. Please sign in instead.');
      }
      throw authErr;
    }

    const uid = userCredential.user.uid;

    // 2. Verify duplicate register number with authenticated session
    try {
      const regQuery = query(
        collection(db, 'students'),
        where('registerNumber', '==', cleanRegNo)
      );
      const regSnap = await getDocs(regQuery);
      if (!regSnap.empty) {
        await userCredential.user.delete();
        throw new Error('This register number is already registered.');
      }
    } catch (regErr: any) {
      try {
        await userCredential.user.delete();
      } catch (delErr: any) {
        // ignore delete error
      }
      throw regErr;
    }

    const studentRecord: Student = {
      uid,
      name: studentInfo.name.trim(),
      registerNumber: studentInfo.registerNumber.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      phone: studentInfo.phone?.trim() || '',
      department: studentInfo.department,
      year: studentInfo.year || '3rd Year',
      role: 'STUDENT',
      accountStatus: 'active',
      bio: 'Enthusiastic engineering student building production-ready prototypes.',
      skills: ['TypeScript', 'React', 'Problem Solving']
    };

    // Create the student's Firestore profile at students/{uid}
    await setDoc(doc(db, 'students', uid), {
      ...studentRecord,
      role: 'student',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const currentUser: CurrentUser = {
      uid,
      email: email.trim().toLowerCase(),
      role: 'STUDENT',
      studentData: studentRecord
    };

    useAppStore.getState().setCurrentUser(currentUser);
    return currentUser;
  },

  /**
   * Log in student with either registration number OR email address + password
   */
  async loginStudent(identifier: string, pass: string): Promise<CurrentUser> {
    return this.loginStudentWithIdentifier(identifier, pass);
  },

  async loginStudentWithIdentifier(identifier: string, pass: string): Promise<CurrentUser> {
    const rawInput = identifier.trim();
    if (!rawInput) {
      throw new Error('Please enter your registration number or registered email address.');
    }
    if (!pass) {
      throw new Error('Please enter your password.');
    }

    let targetEmail: string = '';

    if (rawInput.includes('@')) {
      targetEmail = rawInput.toLowerCase();
    } else {
      // 1. Attempt trusted serverless API endpoint (/api/student-auth) first for rate limiting & secure resolution
      let resolvedViaApi = false;
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        try {
          const apiRes = await fetch('/api/student-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: rawInput, password: pass })
          });

          if (apiRes.status === 429) {
            const data = await apiRes.json().catch(() => ({}));
            throw new Error(data.error || 'Too many login attempts. Please wait 1 minute before trying again.');
          }

          if (apiRes.status === 401) {
            throw new Error('Invalid registration number or password.');
          }

          if (apiRes.ok) {
            const data = await apiRes.json().catch(() => ({}));
            if (data?.email) {
              targetEmail = data.email;
              resolvedViaApi = true;
            }
          }
        } catch (apiErr: any) {
          if (apiErr.message?.includes('Invalid') || apiErr.message?.includes('Too many')) {
            throw apiErr;
          }
        }
      }

      // 2. Direct lookup fallback if API is not available
      if (!resolvedViaApi && !targetEmail) {
        const cleanRegNo = rawInput.toUpperCase().replace(/\s+/g, '');
        try {
          const lookupSnap = await getDoc(doc(db, 'reg_lookups', cleanRegNo));
          if (lookupSnap.exists()) {
            targetEmail = lookupSnap.data().email;
          } else {
            // Fallback query to students collection
            const regQuery = query(
              collection(db, 'students'),
              where('registerNumber', '==', cleanRegNo)
            );
            const regSnap = await getDocs(regQuery);
            if (!regSnap.empty) {
              targetEmail = regSnap.docs[0].data().email;
            } else {
              // Generic error message to prevent registration number enumeration
              throw new Error('Invalid registration number or password.');
            }
          }
        } catch (err: any) {
          if (err.message?.includes('Invalid registration number or password')) {
            throw err;
          }
          throw new Error('Invalid registration number or password.');
        }
      }
    }

    // Authenticate with Firebase Email/Password
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, targetEmail, pass);
    } catch (authErr: any) {
      if (
        authErr.code === 'auth/invalid-credential' ||
        authErr.code === 'auth/user-not-found' ||
        authErr.code === 'auth/wrong-password' ||
        authErr.code === 'auth/invalid-email'
      ) {
        throw new Error(
          rawInput.includes('@')
            ? 'Invalid email or password.'
            : 'Invalid registration number or password.'
        );
      }
      if (authErr.code === 'auth/too-many-requests') {
        throw new Error('Too many failed sign in attempts. Please try again in a few minutes.');
      }
      if (authErr.code === 'auth/user-disabled') {
        throw new Error('This student account has been disabled. Please contact college administration.');
      }
      throw new Error(authErr.message || 'Unable to authenticate student credentials.');
    }

    const uid = userCredential.user.uid;

    // Retrieve verified student profile from Firestore
    let studentSnap = await getDoc(doc(db, 'students', uid));
    let studentData: Student | null = null;

    if (studentSnap.exists()) {
      studentData = studentSnap.data() as Student;
    } else {
      // Fallback: Query by verified email in students collection in case of legacy UID mapping
      const resolvedEmail = (userCredential.user.email || targetEmail || '').trim().toLowerCase();
      if (resolvedEmail) {
        const emailQuery = query(collection(db, 'students'), where('email', '==', resolvedEmail));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          studentData = emailSnap.docs[0].data() as Student;
        }
      }
    }

    if (!studentData) {
      await signOut(auth);
      useAppStore.getState().logout();
      throw new Error(
        'Student profile record not found. Your account must be provisioned by college administration.'
      );
    }

    // Verify account status
    if (studentData.accountStatus === 'disabled' || (studentData as any).isActive === false) {
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
  }): Promise<{ uid: string; email: string }> {
    const cleanEmail = adminInfo.email.trim().toLowerCase();
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
            const adminData = existingAdminSnap.data() as Admin;
            await signOut(auth);
            if (adminData.approvalStatus === 'PENDING') {
              throw new Error(
                'Your faculty registration has already been submitted and is pending administrator verification. Please check back once verified.'
              );
            }
            if (
              adminData.approvalStatus === 'APPROVED' ||
              (!adminData.approvalStatus && (adminData.role || '').toUpperCase() === 'ADMIN')
            ) {
              throw new Error(
                'An approved administrator account with this email already exists. Please proceed to Admin Sign In.'
              );
            }
            throw new Error('An account with this email already exists. Please sign in instead.');
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
      department: adminInfo.department.trim(),
      designation: adminInfo.designation.trim(),
      facultyId: adminInfo.facultyId.trim(),
      institution: adminInfo.institution?.trim() || 'KalaignarKarunanidhi Institute Of Technology',
      role: 'ADMIN',
      approvalStatus: 'PENDING'
    };

    // 2. Write pending faculty profile to Firestore at admins/{uid}
    try {
      console.log('[AuthService] Writing pending faculty profile to admins/' + uid);
      await setDoc(doc(db, 'admins', uid), {
        ...adminRecord,
        role: 'admin',
        approvalStatus: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Confirm profile document was successfully created
      const verifySnap = await getDoc(doc(db, 'admins', uid));
      if (!verifySnap.exists()) {
        throw new Error('Profile verification failed: admin document was not created.');
      }
      console.log('[AuthService] Faculty profile confirmed in Firestore with PENDING status for UID:', uid);
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

      // Check for token custom claims or HOD designation
      let tokenClaims: Record<string, any> = {};
      try {
        const idTokenRes = await userCredential.user.getIdTokenResult(true);
        tokenClaims = idTokenRes.claims || {};
      } catch (tokenErr) {
        // ignore
      }

      const isHod =
        tokenClaims.hod === true ||
        tokenClaims.role === 'HOD' ||
        adminData.isHod === true ||
        roleUpper === 'HOD';

      if (adminData.approvalStatus === 'PENDING') {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error(
          'Your faculty registration is currently pending approval by the college administrator. Please check back once verified.'
        );
      }

      if (adminData.approvalStatus === 'REJECTED') {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error(
          'Your faculty registration was not approved. Please contact your department coordinator.'
        );
      }

      if (adminData.isActive === false || (adminData as any).accountStatus === 'deactivated') {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error('This administrator account has been deactivated. Please contact the Head of Department.');
      }

      const isApproved =
        adminData.approvalStatus === 'APPROVED' ||
        isHod ||
        (!adminData.approvalStatus && roleUpper === 'ADMIN');

      if ((roleUpper !== 'ADMIN' && !isHod) || !isApproved) {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error('This account does not have administrator access.');
      }

      const effectiveRole: UserRole = isHod ? 'HOD' : 'ADMIN';

      const currentUser: CurrentUser = {
        uid,
        email: userCredential.user.email || email.trim().toLowerCase(),
        role: effectiveRole,
        adminData: {
          ...adminData,
          role: effectiveRole,
          isHod
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
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-email'
      ) {
        throw new Error('Invalid email or password.');
      }
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      if (err.code === 'auth/user-disabled') {
        throw new Error('This administrator account has been disabled.');
      }
      throw new Error(err.message || 'Unable to sign in. Please try again.');
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
      const cleanRegNo = rawInput.toUpperCase().replace(/\s+/g, '');
      try {
        const lookupSnap = await getDoc(doc(db, 'reg_lookups', cleanRegNo));
        if (lookupSnap.exists()) {
          targetEmail = lookupSnap.data().email;
        } else {
          const regQuery = query(collection(db, 'students'), where('registerNumber', '==', cleanRegNo));
          const regSnap = await getDocs(regQuery);
          if (!regSnap.empty) {
            targetEmail = regSnap.docs[0].data().email;
          }
        }
      } catch (err) {
        // Generic catch to avoid enumeration
      }
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
   * Sign out from Firebase Authentication
   */
  async logout(): Promise<void> {
    await signOut(auth);
    useAppStore.getState().logout();
  }
};
