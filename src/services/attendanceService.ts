import { auth, db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { isPlatformAdministrator, isStaffRole } from '../utils/access';

export interface AttendanceRecord {
  id: string;
  hackathonId: string;
  studentId: string;
  department?: string;
  academicYear?: string;
  sessionId?: string;
  status: 'PENDING' | 'PRESENT' | 'ABSENT';
  markedAt: string;
  markedBy: string;
}

async function authenticatedPost(body: Record<string, unknown>) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Sign in before updating attendance.');
  const response = await fetch('/api/student-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'Attendance update failed.');
  return data;
}

export const attendanceService = {
  async checkInWithGateCode(
    hackathonId: string,
    studentId: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    if (!auth.currentUser || auth.currentUser.uid !== studentId) {
      return { success: false, message: 'Sign in as the student account before checking in.' };
    }
    try {
      const result = await authenticatedPost({ action: 'check-in', hackathonId, code });
      useAppStore.getState().updateRegistration(result.registrationId || `reg_${hackathonId}_${studentId}`, {
        attendanceStatus: 'PRESENT',
        status: 'ATTENDED',
        attendedAt: new Date().toISOString()
      } as any);
      return { success: true, message: result.message || 'Attendance verified.' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Check-in could not be completed.' };
    }
  },

  async getAttendanceRecords(hackathonId: string): Promise<AttendanceRecord[]> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser) throw new Error('Authentication required.');
    const constraints = [where('hackathonId', '==', hackathonId)];
    if (isStaffRole(currentUser.role) && !isPlatformAdministrator(currentUser)) {
      constraints.push(where('department', '==', currentUser.adminData?.department || '') as any);
      const years = currentUser.adminData?.authorizedYears || [];
      if (years.length) constraints.push(where('academicYear', 'in', years.slice(0, 10)) as any);
    } else if (currentUser.role === 'STUDENT') {
      constraints.push(where('studentId', '==', currentUser.uid) as any);
    }
    const snapshot = await getDocs(query(collection(db, 'attendance'), ...constraints));
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as AttendanceRecord));
  },

  async manualAttendanceOverride(
    hackathonId: string,
    studentId: string,
    status: 'PRESENT' | 'ABSENT',
    _adminId: string
  ): Promise<void> {
    await authenticatedPost({ action: 'attendance-override', hackathonId, studentId, status });
    const registration = useAppStore.getState().registrations.find((row) => row.hackathonId === hackathonId && row.studentId === studentId);
    if (registration) {
      useAppStore.getState().updateRegistration(registration.id, {
        attendanceStatus: status,
        status: status === 'PRESENT' ? 'ATTENDED' : 'CONFIRMED',
        attendedAt: status === 'PRESENT' ? new Date().toISOString() : undefined
      } as any);
    }
  }
};
