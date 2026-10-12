import { db, auth } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { Team, Student } from '../types';
import { isStaffRole } from '../utils/access';
import { isPlatformAdministrator } from '../utils/access';

export const teamService = {
  /**
   * Fetch all teams for a specific hackathon from Firestore
   */
  async getTeamsByHackathon(hackathonId: string): Promise<Team[]> {
    const currentUser = useAppStore.getState().currentUser;
    if (isStaffRole(currentUser?.role)) {
      const constraints = [where('hackathonId', '==', hackathonId)];
      if (!isPlatformAdministrator(currentUser)) {
        constraints.push(where('department', '==', currentUser?.adminData?.department || '') as any);
        const years = currentUser?.adminData?.authorizedYears || [];
        if (years.length) constraints.push(where('academicYear', 'in', years.slice(0, 10)) as any);
      }
      const q = query(collection(db, 'teams'), ...constraints);
      const snap = await getDocs(q);
      const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
      useAppStore.setState((state) => ({
        teams: [...state.teams.filter((t) => t.hackathonId !== hackathonId), ...teams]
      }));
      return teams;
    }
    return useAppStore.getState().teams.filter((t) => t.hackathonId === hackathonId);
  },

  /**
   * Fetch a team by ID
   */
  async getTeamById(teamId: string): Promise<Team | null> {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Team;
  },

  /**
   * Find the team for a student in a specific hackathon
   */
  async getStudentTeam(hackathonId: string, studentId: string): Promise<Team | null> {
    // 1. Check local store first
    const storeTeam = useAppStore.getState().teams.find(
      (t) => t.hackathonId === hackathonId && (t.leaderId === studentId || t.memberIds?.includes(studentId) || t.members?.some((m) => m.studentId === studentId))
    );
    if (storeTeam) return storeTeam;

    // 2. Query scoped to the student's memberIds
    try {
      const q = query(collection(db, 'teams'), where('memberIds', 'array-contains', studentId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const team = { id: d.id, ...d.data() } as Team;
        if (team.hackathonId === hackathonId) {
          return team;
        }
      }
    } catch (err: any) {
      console.warn('[TeamService] Scoped student team query note:', err.message);
    }
    return null;
  },

  /**
   * Create a new squad in Firestore
   */
  async createTeam(
    hackathonId: string,
    name: string,
    leader: Student
  ): Promise<{ success: boolean; team?: Team; message: string }> {
    const currentAuthUser = auth.currentUser;
    const idToken = await currentAuthUser?.getIdToken();
    if (!currentAuthUser || !idToken || currentAuthUser.uid !== leader.uid) {
      return { success: false, message: 'Sign in as the student account before creating a team.' };
    }
    try {
      const response = await fetch('/api/student-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action: 'create-team', hackathonId, name })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.team) {
        return { success: false, message: data.error || 'Team could not be created. Try again.' };
      }
      const newTeam = data.team as Team;
      useAppStore.setState((state) => ({
        teams: [newTeam, ...state.teams.filter((team) => team.id !== newTeam.id)],
        registrations: state.registrations.map((registration) =>
          registration.hackathonId === hackathonId && registration.studentId === leader.uid
            ? { ...registration, teamId: newTeam.id }
            : registration
        )
      }));
      return { success: true, team: newTeam, message: `Team created. Share code ${newTeam.code} with your teammates.` };
    } catch {
      return { success: false, message: 'Team service is unavailable. Please try again.' };
    }
  },

  /**
   * Join an existing team by invite code
   */
  async joinTeamByCode(
    code: string,
    student: Student
  ): Promise<{ success: boolean; team?: Team; message: string }> {
    const cleanCode = code.trim().toUpperCase();
    const currentAuthUser = auth.currentUser;
    const idToken = await currentAuthUser?.getIdToken();
    if (!currentAuthUser || !idToken || currentAuthUser.uid !== student.uid) {
      return { success: false, message: 'Sign in as the student account before joining a team.' };
    }
    try {
      const response = await fetch('/api/student-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action: 'join-team', code: cleanCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.team) {
        return { success: false, message: data.error || 'Team join could not be completed.' };
      }
      const team = data.team as Team;
      useAppStore.setState((state) => ({
        teams: [team, ...state.teams.filter((item) => item.id !== team.id)],
        registrations: state.registrations.map((registration) =>
          registration.hackathonId === team.hackathonId && registration.studentId === student.uid
            ? { ...registration, teamId: team.id }
            : registration
        )
      }));
      return { success: true, team, message: data.message || `Joined ${team.name}.` };
    } catch {
      return { success: false, message: 'Team service is unavailable. Please try again.' };
    }
  },

  /**
   * Leave team
   */
  async leaveTeam(teamId: string, studentId: string): Promise<{ success: boolean; message: string }> {
    const currentAuthUser = auth.currentUser;
    const idToken = await currentAuthUser?.getIdToken();
    if (!currentAuthUser || !idToken || currentAuthUser.uid !== studentId) return { success: false, message: 'Sign in as this student before leaving the team.' };
    try {
      const response = await fetch('/api/student-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action: 'leave-team', teamId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) return { success: false, message: data.error || 'Team membership could not be updated.' };
      useAppStore.setState((state) => ({
        teams: data.team
          ? [data.team as Team, ...state.teams.filter((team) => team.id !== teamId)]
          : state.teams.filter((team) => team.id !== teamId),
        registrations: state.registrations.map((registration) =>
          registration.teamId === teamId && registration.studentId === studentId
            ? { ...registration, teamId: undefined }
            : registration
        )
      }));
      return { success: true, message: data.message || 'You left the team.' };
    } catch {
      return { success: false, message: 'Team service is unavailable. Please try again.' };
    }
  },

  /**
   * Remove a member (by leader or admin)
   */
  async removeMember(teamId: string, memberId: string): Promise<{ success: boolean; message: string }> {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return { success: false, message: 'Sign in before removing a team member.' };
    try {
      const response = await fetch('/api/student-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action: 'remove-team-member', teamId, memberId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) return { success: false, message: data.error || 'Team member could not be removed.' };
      useAppStore.setState((state) => ({
        teams: data.team
          ? [data.team as Team, ...state.teams.filter((team) => team.id !== teamId)]
          : state.teams.filter((team) => team.id !== teamId),
        registrations: state.registrations.map((registration) =>
          registration.studentId === memberId && registration.teamId === teamId
            ? { ...registration, teamId: undefined }
            : registration
        )
      }));
      return { success: true, message: data.message || 'Member removed from squad.' };
    } catch {
      return { success: false, message: 'Team service is unavailable. Please try again.' };
    }
  },

  /**
   * Disband squad
   */
  async disbandTeam(teamId: string): Promise<{ success: boolean; message: string }> {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return { success: false, message: 'Sign in before disbanding a team.' };
    try {
      const response = await fetch('/api/student-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action: 'disband-team', teamId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) return { success: false, message: data.error || 'Team could not be disbanded.' };
      useAppStore.getState().disbandTeam(teamId);
      return { success: true, message: data.message || 'Team disbanded successfully.' };
    } catch {
      return { success: false, message: 'Team service is unavailable. Please try again.' };
    }
  }
};
