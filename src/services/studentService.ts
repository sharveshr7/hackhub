import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Student, Registration, Certificate } from '../types';
import { registrationService } from './registrationService';
import { attendanceService } from './attendanceService';
import { certificateService } from './certificateService';
import { useAppStore } from '../lib/store';
import { sanitizeForFirestore } from '../utils/firestoreSerializer';

export const studentService = {
  /**
   * Fetch student profile from Firestore students/{studentId}
   */
  async getStudentProfile(studentId: string): Promise<Student | null> {
    const snap = await getDoc(doc(db, 'students', studentId));
    if (!snap.exists()) return null;
    return snap.data() as Student;
  },

  /**
   * Update student profile in Firestore
   */
  async updateStudentProfile(studentId: string, updates: Partial<Student>): Promise<void> {
    const cleanUpdates = sanitizeForFirestore(updates);
    await updateDoc(doc(db, 'students', studentId), {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });
    useAppStore.getState().updateStudent(studentId, updates);
  },

  /**
   * Fetch registrations for student
   */
  async getStudentRegistrations(studentId: string): Promise<Registration[]> {
    return registrationService.getRegistrationsByStudent(studentId);
  },

  /**
   * Register student for hackathon
   */
  async registerForHackathon(
    hackathonId: string,
    studentId: string
  ): Promise<{ success: boolean; message: string; registration?: Registration }> {
    return registrationService.registerStudent(hackathonId, studentId);
  },

  /**
   * Student check-in via venue gate passcode
   */
  async markAttendance(
    hackathonId: string,
    studentId: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    return attendanceService.checkInWithGateCode(hackathonId, studentId, code);
  },

  /**
   * Fetch student certificates
   */
  async getStudentCertificates(studentId: string): Promise<Certificate[]> {
    return certificateService.getStudentCertificates(studentId);
  }
};
