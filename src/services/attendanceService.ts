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
import { Hackathon } from '../types';
import { useAppStore } from '../lib/store';

export interface AttendanceRecord {
  id: string;
  hackathonId: string;
  studentId: string;
  sessionId?: string;
  status: 'PENDING' | 'PRESENT' | 'ABSENT';
  markedAt: string;
  markedBy: string;
}

export const attendanceService = {
  /**
   * Student checks in at venue with live gate security code
   */
  async checkInWithGateCode(
    hackathonId: string,
    studentId: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Fetch hackathon to verify gate code and status
    const hSnap = await getDoc(doc(db, 'hackathons', hackathonId));
    if (!hSnap.exists()) {
      return { success: false, message: 'Hackathon not found.' };
    }
    const hackathon = hSnap.data() as Hackathon;

    if (!hackathon.attendanceOpen) {
      return { success: false, message: 'Venue check-in gate is currently CLOSED by the convenor desk.' };
    }

    const expectedCode = (hackathon.attendanceCode || 'NEXUS26').trim().toUpperCase();
    if (code.trim().toUpperCase() !== expectedCode) {
      return { success: false, message: 'Invalid attendance code. Please check venue screen display.' };
    }

    // 2. Prevent duplicate check-in
    const existingQ = query(
      collection(db, 'attendance'),
      where('hackathonId', '==', hackathonId),
      where('studentId', '==', studentId)
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      return { success: false, message: 'Your venue attendance has already been verified.' };
    }

    // 3. Record attendance in Firestore
    const attId = `att_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const record: AttendanceRecord = {
      id: attId,
      hackathonId,
      studentId,
      status: 'PRESENT',
      markedAt: now,
      markedBy: 'STUDENT_GATE_CODE'
    };

    await setDoc(doc(db, 'attendance', attId), {
      ...record,
      createdAt: serverTimestamp()
    });

    // 4. Update student registration attendanceStatus
    const regQ = query(
      collection(db, 'registrations'),
      where('hackathonId', '==', hackathonId),
      where('studentId', '==', studentId)
    );
    const regSnap = await getDocs(regQ);
    if (!regSnap.empty) {
      await updateDoc(doc(db, 'registrations', regSnap.docs[0].id), {
        attendanceStatus: 'PRESENT',
        status: 'ATTENDED',
        updatedAt: serverTimestamp()
      });
    }

    useAppStore.getState().markAttendance(hackathonId, studentId, code);
    return { success: true, message: 'Attendance verified! Welcome to ' + hackathon.title + '.' };
  },

  /**
   * Fetch all attendance records for a hackathon
   */
  async getAttendanceRecords(hackathonId: string): Promise<AttendanceRecord[]> {
    const q = query(collection(db, 'attendance'), where('hackathonId', '==', hackathonId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord));
  },

  /**
   * Admin manual attendance override
   */
  async manualAttendanceOverride(
    hackathonId: string,
    studentId: string,
    status: 'PRESENT' | 'ABSENT',
    adminId: string
  ): Promise<void> {
    const attId = `att_${hackathonId}_${studentId}`;
    await setDoc(doc(db, 'attendance', attId), {
      id: attId,
      hackathonId,
      studentId,
      status,
      markedAt: new Date().toISOString(),
      markedBy: `ADMIN_${adminId}`,
      updatedAt: serverTimestamp()
    });

    // Update registration
    const regQ = query(
      collection(db, 'registrations'),
      where('hackathonId', '==', hackathonId),
      where('studentId', '==', studentId)
    );
    const regSnap = await getDocs(regQ);
    if (!regSnap.empty) {
      await updateDoc(doc(db, 'registrations', regSnap.docs[0].id), {
        attendanceStatus: status,
        status: status === 'PRESENT' ? 'ATTENDED' : 'CONFIRMED',
        updatedAt: serverTimestamp()
      });
    }
  }
};
