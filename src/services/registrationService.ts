import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { Registration, RegistrationStatus, Hackathon } from '../types';

export const registrationService = {
  /**
   * Fetch all registrations for a specific student from Firestore
   */
  async getRegistrationsByStudent(studentId: string): Promise<Registration[]> {
    const q = query(collection(db, 'registrations'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const registrations = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
    
    // Update store
    useAppStore.setState((state) => ({
      registrations: [
        ...state.registrations.filter((r) => r.studentId !== studentId),
        ...registrations
      ]
    }));
    return registrations;
  },

  /**
   * Fetch all registrations for a hackathon from Firestore
   */
  async getRegistrationsByHackathon(hackathonId: string): Promise<Registration[]> {
    const q = query(collection(db, 'registrations'), where('hackathonId', '==', hackathonId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
  },

  /**
   * Fetch all registrations (Admin operational view) from Firestore
   */
  async getAllRegistrations(): Promise<Registration[]> {
    const snap = await getDocs(collection(db, 'registrations'));
    const registrations = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
    useAppStore.setState({ registrations });
    return registrations;
  },

  /**
   * Register authenticated student for an open hackathon
   */
  async registerStudent(
    hackathonId: string,
    studentId: string
  ): Promise<{ success: boolean; registration?: Registration; message: string }> {
    // 1. Verify hackathon exists in Firestore
    const hackathonSnap = await getDoc(doc(db, 'hackathons', hackathonId));
    if (!hackathonSnap.exists()) {
      return { success: false, message: 'Hackathon not found.' };
    }
    const hackathon = hackathonSnap.data() as Hackathon;

    // 2. Validate registration deadline & status
    const now = new Date();
    const deadline = new Date(hackathon.registrationDeadline);
    if (now > deadline || hackathon.status === 'registration_closed' || hackathon.status === 'completed') {
      return { success: false, message: 'Registration has officially closed for this challenge.' };
    }

    // 3. Prevent duplicate registration
    const existingQ = query(
      collection(db, 'registrations'),
      where('hackathonId', '==', hackathonId),
      where('studentId', '==', studentId)
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      return { success: false, message: 'You have already registered for this hackathon.' };
    }

    // 4. Create real registration record
    const regId = `reg_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const registrationNumber = `HACK-2026-${randNum}`;

    const newReg: Registration = {
      id: regId,
      hackathonId,
      studentId,
      registrationNumber,
      status: 'CONFIRMED',
      acceptedRules: true,
      attendanceStatus: 'PENDING',
      submissionStatus: 'NOT_SUBMITTED',
      registeredAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'registrations', regId), {
      ...newReg,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Sync into store
    useAppStore.setState((state) => ({
      registrations: [newReg, ...state.registrations]
    }));

    return {
      success: true,
      registration: newReg,
      message: 'Registration confirmed successfully!'
    };
  },

  /**
   * Update registration status (e.g. ATTENDED, SUBMITTED, CANCELLED)
   */
  async updateRegistrationStatus(id: string, status: RegistrationStatus): Promise<void> {
    await updateDoc(doc(db, 'registrations', id), {
      status,
      updatedAt: serverTimestamp()
    });
    useAppStore.getState().updateRegistrationStatus(id, status);
  }
};
