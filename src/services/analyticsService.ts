import { useAppStore } from '../lib/store';

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

function asDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  const date = value instanceof Date ? value : new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Use the live, rules-scoped records already loaded for the signed-in user. */
export const analyticsService = {
  async getAdminOverviewStats(): Promise<AdminStats> {
    const { hackathons, students, registrations, teams, submissions } = useAppStore.getState();
    return {
      totalHackathons: hackathons.length,
      activeHackathons: hackathons.filter((h) => ['LIVE', 'REGISTRATION_OPEN', 'PUBLISHED'].includes(String(h.status).toUpperCase())).length,
      totalStudents: students.length,
      totalRegistrations: registrations.length,
      activeTeams: teams.length,
      pendingSubmissions: submissions.filter((submission) => submission.isDraft).length
    };
  },

  async getAnalyticsData(): Promise<AnalyticsData> {
    const { students, registrations, teams, submissions } = useAppStore.getState();
    const studentsMap = new Map(students.map((student) => [student.uid, student]));
    const departmentCounts = new Map<string, number>();
    const dateCounts = new Map<string, number>();

    registrations.forEach((registration) => {
      const department = studentsMap.get(registration.studentId)?.department || registration.department || 'Unspecified';
      departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1);
      const date = asDate(registration.registeredAt);
      if (date) {
        const label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        dateCounts.set(label, (dateCounts.get(label) || 0) + 1);
      }
    });

    const submittedCount = submissions.filter((submission) => !submission.isDraft || submission.status === 'SUBMITTED').length;
    const draftCount = submissions.filter((submission) => submission.isDraft).length;
    const attendedCount = registrations.filter((registration) =>
      registration.attendanceStatus === 'PRESENT' || registration.status === 'ATTENDED' || registration.status === 'SUBMITTED'
    ).length;
    const totalRegistrations = registrations.length;

    return {
      departmentData: Array.from(departmentCounts, ([name, students]) => ({ name, students })),
      registrationTrend: Array.from(dateCounts, ([day, count]) => ({ day, count })),
      submissionStats: [
        { name: 'Submitted', value: submittedCount, color: '#10B981' },
        { name: 'Drafts', value: draftCount, color: '#F59E0B' },
        { name: 'Pending Squads', value: Math.max(0, teams.length - submissions.length), color: '#64748B' }
      ],
      attendancePercentage: totalRegistrations ? Math.round((attendedCount / totalRegistrations) * 100) : 0,
      totalRegistrations,
      attendedCount
    };
  }
};
