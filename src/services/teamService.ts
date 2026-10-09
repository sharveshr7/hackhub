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
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { Team, Student, TeamMember } from '../types';

export const teamService = {
  /**
   * Fetch all teams for a specific hackathon from Firestore
   */
  async getTeamsByHackathon(hackathonId: string): Promise<Team[]> {
    const q = query(collection(db, 'teams'), where('hackathonId', '==', hackathonId));
    const snap = await getDocs(q);
    const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
    useAppStore.setState((state) => ({
      teams: [...state.teams.filter((t) => t.hackathonId !== hackathonId), ...teams]
    }));
    return teams;
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
    const q = query(collection(db, 'teams'), where('hackathonId', '==', hackathonId));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const team = { id: d.id, ...d.data() } as Team;
      if (team.members && team.members.some((m) => m.studentId === studentId)) {
        return team;
      }
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
    // 1. Check if student is already in a team for this hackathon
    const existingTeam = await this.getStudentTeam(hackathonId, leader.uid);
    if (existingTeam) {
      return { success: false, message: 'You are already a member of squad "' + existingTeam.name + '".' };
    }

    // 2. Generate unique 6-character team invite code
    const randCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `NEXUS-${randCode}`;
    const teamId = `team_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const leaderMember: TeamMember = {
      studentId: leader.uid,
      name: leader.name,
      email: leader.email,
      department: leader.department,
      registerNumber: leader.registerNumber,
      role: 'LEADER',
      joinedAt: new Date().toISOString()
    };

    const newTeam: Team = {
      id: teamId,
      hackathonId,
      name: name.trim(),
      code,
      leaderId: leader.uid,
      members: [leaderMember],
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Firestore
    await setDoc(doc(db, 'teams', teamId), {
      ...newTeam,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update student's registration to attach teamId
    const regQ = query(
      collection(db, 'registrations'),
      where('hackathonId', '==', hackathonId),
      where('studentId', '==', leader.uid)
    );
    const regSnap = await getDocs(regQ);
    if (!regSnap.empty) {
      await updateDoc(doc(db, 'registrations', regSnap.docs[0].id), {
        teamId,
        updatedAt: serverTimestamp()
      });
    }

    useAppStore.getState().createTeam(hackathonId, name, leader);
    return {
      success: true,
      team: newTeam,
      message: 'Squad created successfully! Share code ' + code + ' with your teammates.'
    };
  },

  /**
   * Join an existing team by invite code
   */
  async joinTeamByCode(
    code: string,
    student: Student
  ): Promise<{ success: boolean; team?: Team; message: string }> {
    const cleanCode = code.trim().toUpperCase();
    const q = query(collection(db, 'teams'), where('code', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, message: 'Invalid team invite code. No squad found.' };
    }

    const teamDoc = snap.docs[0];
    const team = { id: teamDoc.id, ...teamDoc.data() } as Team;

    // Check capacity (max 4 members)
    if (team.members && team.members.length >= 4) {
      return { success: false, message: 'This squad has reached maximum capacity (4/4 members).' };
    }

    // Check if already in this team
    if (team.members && team.members.some((m) => m.studentId === student.uid)) {
      return { success: false, message: 'You are already in this squad.' };
    }

    // Check if already in another team for this hackathon
    const existing = await this.getStudentTeam(team.hackathonId, student.uid);
    if (existing) {
      return { success: false, message: 'You are already in squad "' + existing.name + '" for this hackathon.' };
    }

    const newMember: TeamMember = {
      studentId: student.uid,
      name: student.name,
      email: student.email,
      department: student.department,
      registerNumber: student.registerNumber,
      role: 'MEMBER',
      joinedAt: new Date().toISOString()
    };

    const updatedMembers = [...team.members, newMember];

    await updateDoc(doc(db, 'teams', team.id), {
      members: updatedMembers,
      updatedAt: serverTimestamp()
    });

    // Update student's registration
    const regQ = query(
      collection(db, 'registrations'),
      where('hackathonId', '==', team.hackathonId),
      where('studentId', '==', student.uid)
    );
    const regSnap = await getDocs(regQ);
    if (!regSnap.empty) {
      await updateDoc(doc(db, 'registrations', regSnap.docs[0].id), {
        teamId: team.id,
        updatedAt: serverTimestamp()
      });
    }

    useAppStore.getState().joinTeamByCode(code, student);
    return {
      success: true,
      team: { ...team, members: updatedMembers },
      message: 'Successfully joined ' + team.name + '!'
    };
  },

  /**
   * Leave team
   */
  async leaveTeam(teamId: string, studentId: string): Promise<{ success: boolean; message: string }> {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (!snap.exists()) {
      return { success: false, message: 'Team not found.' };
    }
    const team = snap.data() as Team;

    if (team.members.length <= 1) {
      // Disband if only member
      return this.disbandTeam(teamId);
    }

    const updatedMembers = team.members.filter((m) => m.studentId !== studentId);
    let newLeaderId = team.leaderId;
    if (team.leaderId === studentId && updatedMembers.length > 0) {
      updatedMembers[0].role = 'LEADER';
      newLeaderId = updatedMembers[0].studentId;
    }

    await updateDoc(doc(db, 'teams', teamId), {
      members: updatedMembers,
      leaderId: newLeaderId,
      updatedAt: serverTimestamp()
    });

    useAppStore.getState().leaveTeam(teamId, studentId);
    return { success: true, message: 'You have left the squad.' };
  },

  /**
   * Remove a member (by leader or admin)
   */
  async removeMember(teamId: string, memberId: string): Promise<{ success: boolean; message: string }> {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (!snap.exists()) return { success: false, message: 'Team not found.' };
    const team = snap.data() as Team;

    const updatedMembers = team.members.filter((m) => m.studentId !== memberId);
    await updateDoc(doc(db, 'teams', teamId), {
      members: updatedMembers,
      updatedAt: serverTimestamp()
    });

    useAppStore.getState().removeTeamMember(teamId, memberId);
    return { success: true, message: 'Member removed from squad.' };
  },

  /**
   * Disband squad
   */
  async disbandTeam(teamId: string): Promise<{ success: boolean; message: string }> {
    await deleteDoc(doc(db, 'teams', teamId));
    useAppStore.getState().disbandTeam(teamId);
    return { success: true, message: 'Squad disbanded successfully.' };
  }
};
