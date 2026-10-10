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
   * Log in student with email and password via Firebase Auth
   */
  async loginStudent(email: string, pass: string): Promise<CurrentUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const uid = userCredential.user.uid;

    const studentSnap = await getDoc(doc(db, 'students', uid));
    if (!studentSnap.exists()) {
      // If student account does not have Firestore document yet, auto-generate standard profile
      const fallbackRecord: Student = {
        uid,
        name: email.split('@')[0].replace('.', ' ').toUpperCase(),
        registerNumber: '717822P' + Math.floor(100 + Math.random() * 900),
        email: email.trim().toLowerCase(),
        phone: '',
        department: 'Computer Science & Engineering',
        year: '3rd Year',
        role: 'STUDENT',
        skills: [],
        accountStatus: 'active'
      };
      await setDoc(doc(db, 'students', uid), {
        ...fallbackRecord,
        role: 'student',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const currentUser: CurrentUser = {
        uid,
        email: email.trim().toLowerCase(),
        role: 'STUDENT',
        studentData: fallbackRecord
      };
      useAppStore.getState().setCurrentUser(currentUser);
      return currentUser;
    }

    const studentData = studentSnap.data() as Student;
    const currentUser: CurrentUser = {
      uid,
      email: userCredential.user.email || email,
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

      const isApproved =
        adminData.approvalStatus === 'APPROVED' ||
        (!adminData.approvalStatus && roleUpper === 'ADMIN');

      if (roleUpper !== 'ADMIN' || !isApproved) {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error('This account does not have administrator access.');
      }

      const currentUser: CurrentUser = {
        uid,
        email: userCredential.user.email || email.trim().toLowerCase(),
        role: 'ADMIN',
        adminData
      };

      useAppStore.getState().setCurrentUser(currentUser);
      console.log('[AuthService] Admin sign in successful for UID:', uid);
      return currentUser;
    } catch (err: any) {
      if (
        err.message?.includes('pending approval') ||
        err.message?.includes('not approved') ||
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
   * Sign in with Google SSO
   */
  async loginWithGoogle(role: UserRole = 'STUDENT'): Promise<CurrentUser> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const uid = user.uid;

    if (role === 'ADMIN') {
      const adminDocRef = doc(db, 'admins', uid);
      const adminSnap = await getDoc(adminDocRef);
      if (!adminSnap.exists()) {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error('You do not have permission to access the admin portal.');
      }
      const adminData = adminSnap.data() as Admin;
      const roleUpper = (adminData.role || '').toUpperCase();
      const isApproved =
        adminData.approvalStatus === 'APPROVED' ||
        (!adminData.approvalStatus && roleUpper === 'ADMIN');

      if (roleUpper !== 'ADMIN' || !isApproved) {
        await signOut(auth);
        useAppStore.getState().logout();
        throw new Error('Your faculty account is pending approval by the college administrator.');
      }

      const currentUser: CurrentUser = {
        uid,
        email: user.email || '',
        role: 'ADMIN',
        adminData
      };
      useAppStore.getState().setCurrentUser(currentUser);
      return currentUser;
    } else {
      const studentDocRef = doc(db, 'students', uid);
      const studentSnap = await getDoc(studentDocRef);
      if (!studentSnap.exists()) {
        const autoStudent: Student = {
          uid,
          name: user.displayName || 'Student',
          registerNumber: 'REG-' + uid.slice(0, 6).toUpperCase(),
          email: user.email || '',
          phone: '',
          department: 'Computer Science & Engineering',
          year: '3rd Year',
          role: 'STUDENT',
          skills: [],
          accountStatus: 'active'
        };
        await setDoc(studentDocRef, {
          ...autoStudent,
          role: 'student',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        const currentUser: CurrentUser = {
          uid,
          email: user.email || '',
          role: 'STUDENT',
          studentData: autoStudent
        };
        useAppStore.getState().setCurrentUser(currentUser);
        return currentUser;
      }
      const studentData = studentSnap.data() as Student;
      const currentUser: CurrentUser = {
        uid,
        email: user.email || '',
        role: 'STUDENT',
        studentData
      };
      useAppStore.getState().setCurrentUser(currentUser);
      return currentUser;
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
