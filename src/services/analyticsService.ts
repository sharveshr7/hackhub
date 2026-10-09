import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface AdminStats {
  totalHackathons: number;
  activeHackathons: number;
  totalStudents: number;
  totalRegistrations: number;
  activeTeams: number;
  pendingSubmissions: number;
}

export interface AnalyticsData {
  departmentData: { name: string; students: number }[];
  registrationTrend: { day: string; count: number }[];
  submissionStats: { name: string; value: number; color: string }[];
  attendancePercentage: number;
  totalRegistrations: number;
  attendedCount: number;
}

export const analyticsService = {
  /**
   * Compute live administrative KPIs directly from Firestore collections
   */
  async getAdminOverviewStats(): Promise<AdminStats> {
    const [hSnap, sSnap, rSnap, tSnap, subSnap] = await Promise.all([
      getDocs(collection(db, 'hackathons')),
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'registrations')),
      getDocs(collection(db, 'teams')),
      getDocs(collection(db, 'submissions'))
    ]);

    const hackathons = hSnap.docs.map((d) => d.data());
    const submissions = subSnap.docs.map((d) => d.data());

    const totalHackathons = hSnap.size;
    const activeHackathons = hackathons.filter(
      (h: any) => h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN' || h.status === 'live' || h.status === 'registration_open'
    ).length;
    const totalStudents = sSnap.size;
    const totalRegistrations = rSnap.size;
    const activeTeams = tSnap.size;
    const pendingSubmissions = submissions.filter((s: any) => s.isDraft).length;

    return {
      totalHackathons,
      activeHackathons,
      totalStudents,
      totalRegistrations,
      activeTeams,
      pendingSubmissions
    };
  },

  /**
   * Compute real analytics from Firestore data without any fake fallbacks
   */
  async getAnalyticsData(): Promise<AnalyticsData> {
    const [sSnap, rSnap, tSnap, subSnap] = await Promise.all([
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'registrations')),
      getDocs(collection(db, 'teams')),
      getDocs(collection(db, 'submissions'))
    ]);

    const studentsMap = new Map<string, any>();
    sSnap.docs.forEach((d) => studentsMap.set(d.id, d.data()));

    const registrations = rSnap.docs.map((d) => d.data() as any);
    const submissions = subSnap.docs.map((d) => d.data() as any);
    const totalRegistrations = registrations.length;

    // 1. Department Breakdown
    const deptCount: Record<string, number> = {};
    registrations.forEach((reg) => {
      const student = studentsMap.get(reg.studentId);
      const dept = student?.department || 'Unspecified';
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });

    const departmentData = Object.entries(deptCount).map(([name, students]) => ({
      name,
      students
    }));

    // 2. Real Registration Trend by Date
    const dateCount: Record<string, number> = {};
    registrations.forEach((reg) => {
      if (reg.registeredAt) {
        const dateStr = new Date(reg.registeredAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        dateCount[dateStr] = (dateCount[dateStr] || 0) + 1;
      }
    });

    const registrationTrend = Object.entries(dateCount).map(([day, count]) => ({
      day,
      count
    }));

    // 3. Submissions breakdown
    const submittedCount = submissions.filter((s) => !s.isDraft).length;
    const draftCount = submissions.filter((s) => s.isDraft).length;
    const pendingCount = Math.max(0, tSnap.size - submissions.length);

    const submissionStats = [
      { name: 'Submitted', value: submittedCount, color: '#10B981' },
      { name: 'Drafts', value: draftCount, color: '#F59E0B' },
      { name: 'Pending Squads', value: pendingCount, color: '#64748B' }
    ];

    // 4. Attendance
    const attendedCount = registrations.filter(
      (r) => r.attendanceStatus === 'PRESENT' || r.status === 'ATTENDED' || r.status === 'SUBMITTED'
    ).length;
    const attendancePercentage = totalRegistrations > 0
      ? Math.round((attendedCount / totalRegistrations) * 100)
      : 0;

    return {
      departmentData,
      registrationTrend,
      submissionStats,
      attendancePercentage,
      totalRegistrations,
      attendedCount
    };
  }
};
