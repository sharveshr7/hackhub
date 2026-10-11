import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Hackathon,
  Student,
  Admin,
  Team,
  Registration,
  Submission,
  Announcement,
  NotificationItem,
  Certificate,
  UserRole,
  RegistrationStatus,
  SubmissionStatus,
  AuditLog
} from '../types';

export interface CurrentUser {
  uid: string;
  email: string;
  role: UserRole;
  studentData?: Student;
  adminData?: Admin;
}

interface AppStoreState {
  // Auth
  currentUser: CurrentUser | null;
  isLoadingAuth: boolean;
  setCurrentUser: (user: CurrentUser | null) => void;
  logout: () => void;

  // Real Collections
  hackathons: Hackathon[];
  students: Student[];
  admins: Admin[];
  teams: Team[];
  registrations: Registration[];
  submissions: Submission[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  certificates: Certificate[];
  auditLogs: AuditLog[];

  // Bulk Firestore Setters
  setHackathons: (hackathons: Hackathon[]) => void;
  setStudents: (students: Student[]) => void;
  setAdmins: (admins: Admin[]) => void;
  setTeams: (teams: Team[]) => void;
  setRegistrations: (registrations: Registration[]) => void;
  setSubmissions: (submissions: Submission[]) => void;
  setAnnouncements: (announcements: Announcement[]) => void;
  setNotifications: (notifications: NotificationItem[]) => void;
  setCertificates: (certificates: Certificate[]) => void;
  setAuditLogs: (auditLogs: AuditLog[]) => void;
  addAuditLog: (log: AuditLog) => void;

  // Hackathons Actions
  addHackathon: (hackathon: Omit<Hackathon, 'id' | 'createdAt' | 'updatedAt'>) => Hackathon;
  updateHackathon: (id: string, updates: Partial<Hackathon>) => void;
  deleteHackathon: (id: string) => void;

  // Registration Actions
  registerStudent: (hackathonId: string, studentId: string) => { success: boolean; registration?: Registration; message: string };
  updateRegistration: (id: string, updates: Partial<Registration>) => void;
  updateRegistrationStatus: (registrationId: string, status: RegistrationStatus) => void;
  markAttendance: (hackathonId: string, studentId: string, code: string) => { success: boolean; message: string };

  // Team Actions
  createTeam: (hackathonId: string, name: string, leader: Student) => { success: boolean; team?: Team; message: string };
  joinTeamByCode: (code: string, student: Student) => { success: boolean; team?: Team; message: string };
  leaveTeam: (teamId: string, studentId: string) => { success: boolean; message: string };
  removeTeamMember: (teamId: string, memberId: string) => { success: boolean; message: string };
  disbandTeam: (teamId: string) => { success: boolean; message: string };

  // Submission Actions
  saveSubmission: (data: Partial<Submission> & { hackathonId: string; teamId: string; teamName: string; isDraft?: boolean }) => Submission;
  evaluateSubmission: (submissionId: string, score: number, feedback: string, rank?: string, status?: SubmissionStatus) => void;

  // Announcement Actions
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => Announcement;
  deleteAnnouncement: (id: string) => void;

  // Notification Actions
  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // Student Profile
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      // Real authenticated user state (starts unauthenticated)
      currentUser: null,
      isLoadingAuth: true,

      setCurrentUser: (user) => set({ currentUser: user, isLoadingAuth: false }),
      logout: () => set({ currentUser: null, isLoadingAuth: false }),

      // All collections default to empty arrays (Zero mock data)
      hackathons: [],
      students: [],
      admins: [],
      teams: [],
      registrations: [],
      submissions: [],
      announcements: [],
      notifications: [],
      certificates: [],
      auditLogs: [],

      // Direct Firebase Setters
      setHackathons: (hackathons) => set({ hackathons }),
      setStudents: (students) => set({ students }),
      setAdmins: (admins) => set({ admins }),
      setTeams: (teams) => set({ teams }),
      setRegistrations: (registrations) => set({ registrations }),
      setSubmissions: (submissions) => set({ submissions }),
      setAnnouncements: (announcements) => set({ announcements }),
      setNotifications: (notifications) => set({ notifications }),
      setCertificates: (certificates) => set({ certificates }),
      setAuditLogs: (auditLogs) => set({ auditLogs }),
      addAuditLog: (log) => set((s) => ({ auditLogs: [log, ...s.auditLogs] })),

      // Hackathon Operations
      addHackathon: (data) => {
        const newHackathon: Hackathon = {
          ...data,
          id: `hackathon-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set((state) => ({ hackathons: [newHackathon, ...state.hackathons] }));
        return newHackathon;
      },

      updateHackathon: (id, updates) => {
        set((state) => ({
          hackathons: state.hackathons.map((h) =>
            h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h
          )
        }));
      },

      deleteHackathon: (id) => {
        set((state) => ({
          hackathons: state.hackathons.filter((h) => h.id !== id),
          registrations: state.registrations.filter((r) => r.hackathonId !== id),
          teams: state.teams.filter((t) => t.hackathonId !== id)
        }));
      },

      // Student Registration
      registerStudent: (hackathonId, studentId) => {
        const state = get();
        const hackathon = state.hackathons.find((h) => h.id === hackathonId);
        if (!hackathon) {
          return { success: false, message: 'Hackathon not found.' };
        }

        const now = new Date();
        if (hackathon.registrationDeadline) {
          const deadline = new Date(hackathon.registrationDeadline);
          if (now > deadline) {
            return { success: false, message: 'Registration has officially closed for this hackathon.' };
          }
        }
        if (hackathon.status === 'registration_closed' || hackathon.status === 'completed') {
          return { success: false, message: 'Registration has officially closed for this hackathon.' };
        }

        const existing = state.registrations.find(
          (r) => r.hackathonId === hackathonId && r.studentId === studentId
        );
        if (existing) {
          return { success: false, message: 'Student is already registered for this hackathon.' };
        }

        const randDigits = Math.floor(1000 + Math.random() * 9000);
        const registrationNumber = `HACK-2026-0${randDigits}`;

        const newReg: Registration = {
          id: `reg-${Date.now()}`,
          hackathonId,
          studentId,
          registrationNumber,
          status: 'CONFIRMED',
          acceptedRules: true,
          attendanceStatus: 'PENDING',
          submissionStatus: 'NOT_SUBMITTED',
          registeredAt: new Date().toISOString()
        };

        set((s) => ({ registrations: [newReg, ...s.registrations] }));
        return { success: true, registration: newReg, message: 'Registration confirmed.' };
      },

      updateRegistration: (id, updates) => {
        set((state) => ({
          registrations: state.registrations.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          )
        }));
      },

      updateRegistrationStatus: (registrationId, status) => {
        set((state) => ({
          registrations: state.registrations.map((r) =>
            r.id === registrationId ? { ...r, status, updatedAt: new Date().toISOString() } : r
          )
        }));
      },

      markAttendance: (hackathonId, studentId, code) => {
        const state = get();
        const hackathon = state.hackathons.find((h) => h.id === hackathonId);
        if (!hackathon) {
          return { success: false, message: 'Hackathon not found.' };
        }

        if (code.trim().toUpperCase() !== (hackathon.attendanceCode || 'KIT26').trim().toUpperCase()) {
          return { success: false, message: 'Invalid attendance passcode.' };
        }

        set((s) => ({
          registrations: s.registrations.map((r) =>
            r.hackathonId === hackathonId && r.studentId === studentId
              ? { ...r, attendanceStatus: 'PRESENT', status: 'ATTENDED' }
              : r
          )
        }));

        return { success: true, message: 'Attendance confirmed.' };
      },

      // Team Operations
      createTeam: (hackathonId, name, leader) => {
        const state = get();
        const existingTeam = state.teams.find(
          (t) => t.hackathonId === hackathonId && t.members.some((m) => m.studentId === leader.uid)
        );
        if (existingTeam) {
          return { success: false, message: `Already part of squad "${existingTeam.name}".` };
        }

        const code = `TEAM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const newTeam: Team = {
          id: `team-${Date.now()}`,
          hackathonId,
          name: name.trim(),
          code,
          leaderId: leader.uid,
          members: [
            {
              studentId: leader.uid,
              name: leader.name,
              email: leader.email,
              department: leader.department,
              registerNumber: leader.registerNumber,
              role: 'LEADER',
              joinedAt: new Date().toISOString()
            }
          ],
          status: 'CONFIRMED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        set((s) => ({
          teams: [newTeam, ...s.teams],
          registrations: s.registrations.map((r) =>
            r.hackathonId === hackathonId && r.studentId === leader.uid
              ? { ...r, teamId: newTeam.id }
              : r
          )
        }));

        return { success: true, team: newTeam, message: `Squad "${name}" formed.` };
      },

      joinTeamByCode: (code, student) => {
        const state = get();
        const cleanCode = code.trim().toUpperCase();
        const team = state.teams.find((t) => t.code.toUpperCase() === cleanCode);

        if (!team) {
          return { success: false, message: 'Invalid invite code.' };
        }

        if (team.members.length >= 4) {
          return { success: false, message: 'Squad capacity reached (4/4 members).' };
        }

        if (team.members.some((m) => m.studentId === student.uid)) {
          return { success: false, message: 'You are already in this squad.' };
        }

        const newMember = {
          studentId: student.uid,
          name: student.name,
          email: student.email,
          department: student.department,
          registerNumber: student.registerNumber,
          role: 'MEMBER' as const,
          joinedAt: new Date().toISOString()
        };

        const updatedTeam = {
          ...team,
          members: [...team.members, newMember]
        };

        set((s) => ({
          teams: s.teams.map((t) => (t.id === team.id ? updatedTeam : t)),
          registrations: s.registrations.map((r) =>
            r.hackathonId === team.hackathonId && r.studentId === student.uid
              ? { ...r, teamId: team.id }
              : r
          )
        }));

        return { success: true, team: updatedTeam, message: `Joined "${team.name}".` };
      },

      leaveTeam: (teamId, studentId) => {
        const state = get();
        const team = state.teams.find((t) => t.id === teamId);
        if (!team) return { success: false, message: 'Team not found.' };

        if (team.members.length <= 1) {
          return get().disbandTeam(teamId);
        }

        const remainingMembers = team.members.filter((m) => m.studentId !== studentId);
        let newLeaderId = team.leaderId;
        if (team.leaderId === studentId && remainingMembers.length > 0) {
          remainingMembers[0].role = 'LEADER';
          newLeaderId = remainingMembers[0].studentId;
        }

        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, members: remainingMembers, leaderId: newLeaderId }
              : t
          ),
          registrations: s.registrations.map((r) =>
            r.teamId === teamId && r.studentId === studentId ? { ...r, teamId: undefined } : r
          )
        }));

        return { success: true, message: 'Left the squad.' };
      },

      removeTeamMember: (teamId, memberId) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, members: t.members.filter((m) => m.studentId !== memberId) }
              : t
          ),
          registrations: s.registrations.map((r) =>
            r.teamId === teamId && r.studentId === memberId ? { ...r, teamId: undefined } : r
          )
        }));
        return { success: true, message: 'Member removed from squad.' };
      },

      disbandTeam: (teamId) => {
        set((s) => ({
          teams: s.teams.filter((t) => t.id !== teamId),
          registrations: s.registrations.map((r) =>
            r.teamId === teamId ? { ...r, teamId: undefined } : r
          )
        }));
        return { success: true, message: 'Squad disbanded.' };
      },

      // Submissions
      saveSubmission: (data) => {
        const state = get();
        const existing = state.submissions.find(
          (s) => s.hackathonId === data.hackathonId && s.teamId === data.teamId
        );

        const now = new Date().toISOString();
        const sub: Submission = {
          id: existing?.id || `sub-${Date.now()}`,
          hackathonId: data.hackathonId,
          teamId: data.teamId,
          teamName: data.teamName,
          projectTitle: data.projectTitle || 'Untitled Prototype',
          problemStatementId: data.problemStatementId || '',
          problemStatementTitle: data.problemStatementTitle || 'General Track',
          tagline: data.tagline || '',
          description: data.description || '',
          technologies: data.technologies || data.techStack || [],
          techStack: data.techStack || data.technologies || [],
          githubUrl: data.githubUrl || '',
          demoUrl: data.demoUrl || data.liveDemoUrl || '',
          liveDemoUrl: data.liveDemoUrl || data.demoUrl || '',
          videoDemoUrl: data.videoDemoUrl || '',
          presentationUrl: data.presentationUrl || '',
          files: data.files || [],
          status: data.isDraft ? 'DRAFT' : 'SUBMITTED',
          isDraft: Boolean(data.isDraft),
          submittedAt: data.isDraft ? undefined : now,
          createdAt: existing?.createdAt || now,
          updatedAt: now
        };

        set((s) => ({
          submissions: existing
            ? s.submissions.map((item) => (item.id === existing.id ? sub : item))
            : [sub, ...s.submissions],
          registrations: s.registrations.map((r) =>
            r.hackathonId === data.hackathonId && r.teamId === data.teamId
              ? { ...r, submissionStatus: data.isDraft ? 'DRAFT' : 'SUBMITTED' }
              : r
          )
        }));

        return sub;
      },

      evaluateSubmission: (submissionId, score, feedback, rank, status = 'EVALUATED') => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.id === submissionId
              ? {
                  ...s,
                  evaluationScore: score,
                  evaluationFeedback: feedback,
                  rank: rank || s.rank,
                  status,
                  updatedAt: new Date().toISOString()
                }
              : s
          )
        }));
      },

      // Announcements
      addAnnouncement: (data) => {
        const newAnn: Announcement = {
          ...data,
          id: `ann-${Date.now()}`,
          publishedAt: new Date().toISOString()
        };
        set((s) => ({ announcements: [newAnn, ...s.announcements] }));
        return newAnn;
      },

      deleteAnnouncement: (id) => {
        set((s) => ({
          announcements: s.announcements.filter((a) => a.id !== id)
        }));
      },

      // Notifications
      addNotification: (data) => {
        const notif: NotificationItem = {
          ...data,
          id: `notif-${Date.now()}`,
          createdAt: new Date().toISOString(),
          isRead: false
        };
        set((state) => ({ notifications: [notif, ...state.notifications] }));
      },

      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        }));
      },

      markAllNotificationsAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true }))
        }));
      },

      // Student Profile
      updateStudent: (studentId, updates) => {
        set((state) => {
          const updatedStudents = state.students.map((s) =>
            s.uid === studentId ? { ...s, ...updates } : s
          );
          const updatedCurrentUser =
            state.currentUser?.studentData?.uid === studentId
              ? {
                  ...state.currentUser,
                  studentData: { ...state.currentUser.studentData, ...updates }
                }
              : state.currentUser;

          return {
            students: updatedStudents,
            currentUser: updatedCurrentUser
          };
        });
      }
    }),
    {
      name: 'cit-college-hackathon-portal-production-v1'
    }
  )
);
