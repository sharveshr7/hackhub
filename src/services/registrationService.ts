import { auth, db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
  ,runTransaction
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
    // The real-time sync keeps only records the signed-in role is allowed to read.
    return useAppStore.getState().registrations.filter((registration) => registration.hackathonId === hackathonId);
  },

  /**
   * Fetch all registrations (Admin operational view) from Firestore
   */
  async getAllRegistrations(): Promise<Registration[]> {
    // Return the current user's already scoped live dataset; never issue an unscoped collection read.
    return useAppStore.getState().registrations;
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
    const deadline = new Date(hackathon.registrationDeadline || '');
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
    const nowIso = new Date().toISOString();
    if (!auth.currentUser || auth.currentUser.uid !== studentId) {
      return { success: false, message: 'Sign in as the student account before registering.' };
    }
    const regId = `reg_${hackathonId}_${studentId}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const isExt = Boolean(
      hackathon.isExternal ||
      (hackathon.organizerType && hackathon.organizerType !== 'OUR_COLLEGE')
    );
    const registrationNumber = isExt ? `EXT-TRACK-${randNum}` : `HACK-2026-${randNum}`;
    const currentStudent =
      useAppStore.getState().currentUser?.studentData ||
      useAppStore.getState().students.find((s) => s.uid === studentId);
    if (!currentStudent?.department || !currentStudent.year) {
      return { success: false, message: 'Your provisioned student profile must include a department and academic year.' };
    }
    const studentDept = currentStudent.department;

    const newReg: Registration = {
      id: regId,
      hackathonId,
      studentId,
      department: studentDept,
      academicYear: currentStudent.year,
      registrationNumber,
      status: 'CONFIRMED',
      isExternal: isExt,
      externalTrackingOnly: isExt,
      acceptedRules: true,
      attendanceStatus: isExt ? 'ATTENDED' : 'PENDING',
      submissionStatus: 'NOT_SUBMITTED',
      registeredAt: nowIso,
      ...(isExt ? { externalStatus: 'APPLIED_EXTERNALLY' } : {})
    };

    // Build payload for Firestore, strictly omitting undefined fields
    const firestorePayload: Record<string, any> = {
      id: regId,
      hackathonId,
      studentId,
      department: studentDept,
      academicYear: currentStudent.year,
      registrationNumber,
      status: 'CONFIRMED',
      isExternal: isExt,
      externalTrackingOnly: isExt,
      acceptedRules: true,
      attendanceStatus: isExt ? 'ATTENDED' : 'PENDING',
      submissionStatus: 'NOT_SUBMITTED',
      registeredAt: nowIso,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // For external opportunity tracking, include externalStatus
    if (isExt) {
      firestorePayload.externalStatus = 'APPLIED_EXTERNALLY';
    }

    // Only include optional fields if they have defined values
    if (newReg.teamId !== undefined) {
      firestorePayload.teamId = newReg.teamId;
    }
    if (newReg.attendedAt !== undefined) {
      firestorePayload.attendedAt = newReg.attendedAt;
    }
    if (newReg.externalNotes !== undefined) {
      firestorePayload.externalNotes = newReg.externalNotes;
    }

    // Defensive strip of any undefined values
    const cleanPayload = Object.fromEntries(
      Object.entries(firestorePayload).filter(([, value]) => value !== undefined)
    );

    try {
      await runTransaction(db, async (transaction) => {
        const registrationRef = doc(db, 'registrations', regId);
        const existingRegistration = await transaction.get(registrationRef);
        if (existingRegistration.exists()) throw new Error('You have already registered for this hackathon.');
        transaction.set(registrationRef, cleanPayload);
      });
    } catch (error: any) {
      if (error?.message?.includes('already registered')) return { success: false, message: error.message };
      throw error;
    }

    // Sync into store
    useAppStore.setState((state) => ({
      registrations: [newReg, ...state.registrations]
    }));

    return {
      success: true,
      registration: newReg,
      message: isExt
        ? 'Participation tracked for college monitoring! Remember to also complete your official registration on the host organizer portal.'
        : 'Registration confirmed successfully!'
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
  },

  /**
   * Update external participation status (e.g. APPLIED_EXTERNALLY, PARTICIPATING, COMPLETED, WON, WITHDRAWN)
   */
  async updateExternalTrackingStatus(
    id: string,
    externalStatus: 'PLANNING' | 'APPLIED_EXTERNALLY' | 'PARTICIPATING' | 'COMPLETED' | 'RESULT_RECORDED' | 'WON' | 'WITHDRAWN',
    notes?: string
  ): Promise<void> {
    const updates: Partial<Registration> = {
      externalStatus,
      updatedAt: new Date().toISOString()
    };
    if (notes !== undefined && notes.trim() !== '') {
      updates.externalNotes = notes.trim();
    }
    const cleanUpdates = Object.fromEntries(
      Object.entries({
        ...updates,
        updatedAt: serverTimestamp()
      }).filter(([, value]) => value !== undefined)
    );
    await updateDoc(doc(db, 'registrations', id), cleanUpdates);
    useAppStore.getState().updateRegistration(id, updates);
  }
};
