import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
        // 1. Check if admin
        const adminDocRef = doc(db, 'admins', fbUser.uid);
        const adminSnap = await getDoc(adminDocRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data() as Admin;
          const roleUpper = (adminData.role || '').toUpperCase();
          if (roleUpper === 'ADMIN') {
            const currentAdmin: CurrentUser = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              role: 'ADMIN',
              adminData
            };
            setUser(currentAdmin);
            setCurrentUser(currentAdmin);
            setLoading(false);
            return;
          }
        }

        // 2. Check if student
        const studentDocRef = doc(db, 'students', fbUser.uid);
        const studentSnap = await getDoc(studentDocRef);

        if (studentSnap.exists()) {
          const studentData = studentSnap.data() as Student;
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
    loginAdmin: authService.loginAdmin,
    register: authService.registerStudent,
    resetPassword: authService.resetPassword,
    logout: authService.logout
  };
}
