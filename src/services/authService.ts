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

    // 1. Verify duplicate register number before creating auth account
    const regQuery = query(
      collection(db, 'students'),
      where('registerNumber', '==', cleanRegNo)
    );
    const regSnap = await getDocs(regQuery);
    if (!regSnap.empty) {
      throw new Error('This register number is already registered.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const uid = userCredential.user.uid;

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

    // Check if this email is already registered as a student in Firestore
    const studentQuery = query(
      collection(db, 'students'),
      where('email', '==', cleanEmail)
    );
    const studentSnap = await getDocs(studentQuery);
    if (!studentSnap.empty) {
      throw new Error('This email address is already associated with a student account.');
    }

    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, adminInfo.password);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 8 characters long and contain letters and numbers.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid institutional email address.');
      }
      throw new Error(err.message || 'Unable to register admin account. Please try again.');
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
      role: 'ADMIN'
    };

    try {
      await setDoc(doc(db, 'admins', uid), {
        ...adminRecord,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (firestoreErr: any) {
      // If Firestore profile creation fails, clean up the created Firebase Auth user
      try {
        await userCredential.user.delete();
      } catch (e) {
        // ignore delete error
      }
      throw new Error(firestoreErr.message || 'Failed to save administrative profile.');
    }

    // Immediately sign out so user explicitly signs in via /admin/login
    await signOut(auth);
    useAppStore.getState().logout();

    return { uid, email: cleanEmail };
  },

  /**
   * Log in admin with verified Firebase credentials & check admins/{uid}
   */
  async loginAdmin(email: string, pass: string): Promise<CurrentUser> {
    try {
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
      if (roleUpper !== 'ADMIN') {
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
      return currentUser;
    } catch (err: any) {
      if (
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
