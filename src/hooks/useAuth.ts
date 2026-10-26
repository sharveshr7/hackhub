import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAppStore, CurrentUser } from '../lib/store';
import { authService } from '../services/authService';
import { Student, Admin, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const storeUser = useAppStore((state) => state.currentUser);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        // Get custom token claims if available
        // 1. Check if admin
        const adminDocRef = doc(db, 'admins', fbUser.uid);
        const adminSnap = await getDoc(adminDocRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data() as Admin;
          const roleUpper = (adminData.role || '').toUpperCase();

          const isStaffRole = ['ADMIN', 'FACULTY'].includes(roleUpper);
          const isActive =
            adminData.isActive !== false &&
            (adminData as any).accountStatus !== 'deactivated';

          if (isStaffRole && isActive) {
            const effectiveRole: UserRole = adminData.isPlatformAdmin === true ? 'ADMIN' : 'FACULTY';
            const currentAdmin: CurrentUser = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              role: effectiveRole,
              adminData: {
                ...adminData,
                role: effectiveRole
              }
            };
            setUser(currentAdmin);
            setCurrentUser(currentAdmin);
            setLoading(false);
            return;
          } else {
            console.warn(`[useAuth] Account ${fbUser.uid} is inactive or lacks staff authorization (isActive=${isActive}, role=${adminData.role}).`);
            setUser(null);
            setCurrentUser(null);
            setLoading(false);
            return;
          }
        }

        // 2. Check if student
        const studentDocRef = doc(db, 'students', fbUser.uid);
        let studentSnap = await getDoc(studentDocRef);
        let studentData: Student | null = null;

        if (studentSnap.exists()) {
          studentData = studentSnap.data() as Student;
        }

        if (studentData) {
          const profileRole = String((studentData as any).role || '').toUpperCase();
          const profileEmail = String((studentData as any).email || '').trim().toLowerCase();
          const authenticatedEmail = String(fbUser.email || '').trim().toLowerCase();
          const profileMatchesIdentity =
            (!(studentData as any).uid || (studentData as any).uid === fbUser.uid) &&
            !!profileEmail && profileEmail === authenticatedEmail;
          const isActive =
            studentData.accountStatus !== 'disabled' &&
            (studentData as any).accountStatus !== 'deactivated' &&
            (studentData as any).isActive !== false;

          if (profileRole === 'STUDENT' && profileMatchesIdentity && isActive) {
            const currentStudent: CurrentUser = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              role: 'STUDENT',
              studentData
            };
            setUser(currentStudent);
            setCurrentUser(currentStudent);
            setLoading(false);
            return;
          } else {
            console.warn(`[useAuth] Student account ${fbUser.uid} is deactivated, mismatched, or has an inactive profile.`);
            setUser(null);
            setCurrentUser(null);
            setLoading(false);
            return;
          }
        }

        // Unprovisioned or unauthorized role
        setUser(null);
        setCurrentUser(null);
      } catch (err) {
        console.error('Error fetching user profile from Firestore:', err);
        setUser(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setCurrentUser]);

  return {
    user: user || storeUser,
    role: (user || storeUser)?.role || null,
    loading,
    loginStudent: authService.loginStudent,
    loginStudentWithIdentifier: authService.loginStudentWithIdentifier,
    loginAdmin: authService.loginAdmin,
    resetPassword: authService.resetPassword,
    resetStudentPassword: authService.resetStudentPassword,
    logout: authService.logout
  };
}
