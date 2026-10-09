import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Registration, Student, RegistrationStatus } from '../types';
import { analyticsService } from './analyticsService';
import { useAppStore } from '../lib/store';

export const adminService = {
  getAdminOverviewStats: analyticsService.getAdminOverviewStats.bind(analyticsService),
  getAnalyticsData: analyticsService.getAnalyticsData.bind(analyticsService),

  async getAllRegistrations(): Promise<Registration[]> {
    const snap = await getDocs(collection(db, 'registrations'));
    const registrations = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
    useAppStore.setState({ registrations });
    return registrations;
  },

  async updateRegistrationStatus(id: string, status: RegistrationStatus): Promise<void> {
    await updateDoc(doc(db, 'registrations', id), {
      status,
      updatedAt: serverTimestamp()
    });
    useAppStore.getState().updateRegistrationStatus(id, status);
  },

  async getAllStudents(): Promise<Student[]> {
    const snap = await getDocs(collection(db, 'students'));
    const students = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Student));
    useAppStore.setState({ students });
    return students;
  },

  async toggleStudentAccountStatus(studentId: string, status: 'active' | 'disabled'): Promise<void> {
    await updateDoc(doc(db, 'students', studentId), {
      accountStatus: status,
      updatedAt: serverTimestamp()
    });
    useAppStore.getState().updateStudent(studentId, { accountStatus: status });
  },

  generateRegistrationsCsv(): string {
    const store = useAppStore.getState();
    const headers = ['Registration ID', 'Student ID', 'Hackathon ID', 'Team ID', 'Status', 'Attendance', 'Submission', 'Registered At'];
    const rows = store.registrations.map((r) => [
      r.registrationNumber || r.id,
      r.studentId,
      r.hackathonId,
      r.teamId || 'No Team',
      r.status,
      r.attendanceStatus || 'PENDING',
      r.submissionStatus || 'NOT_SUBMITTED',
      new Date(r.registeredAt).toLocaleDateString()
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }
};
