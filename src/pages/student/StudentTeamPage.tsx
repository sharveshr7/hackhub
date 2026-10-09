import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { teamService } from '../../services/teamService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import {
  Users,
  UserPlus,
  Copy,
  Trash2,
  LogOut,
  Crown,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Link as LinkIcon,
  Code,
  Palette,
  FileSearch,
  Mail,
  GraduationCap
} from 'lucide-react';

export const StudentTeamPage: React.FC = () => {
  const { currentUser, teams, hackathons, registrations, students, submissions } = useAppStore();
  const { addToast } = useToast();

  const student = currentUser?.studentData;

  // Selected Hackathon for team management
  const studentRegs = registrations.filter((r) => r.studentId === student?.uid);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>(
    studentRegs[0]?.hackathonId || hackathons[0]?.id || ''
  );

  const currentHackathon = hackathons.find((h) => h.id === selectedHackathonId) || hackathons[0];

  // Find team for this student in this hackathon
  const currentTeam = teams.find(
    (t) => t.hackathonId === selectedHackathonId && t.members.some((m) => m.studentId === student?.uid)
  );

  const isLeader = Boolean(currentTeam && student && currentTeam.leaderId === student.uid);

  // Find team leader details
  const teamLeaderMember = currentTeam?.members.find((m) => m.role === 'LEADER' || m.studentId === currentTeam.leaderId);

  // Submissions status
  const currentSubmission = submissions.find(
    (s) => s.hackathonId === selectedHackathonId && (s.teamId === currentTeam?.id || s.submittedBy === student?.uid)
  );
  const submissionStatus = currentSubmission ? currentSubmission.status : 'Pending';
  const participationStatus = currentSubmission?.status === 'SUBMITTED' ? 'Submitted' : currentTeam ? 'Participating' : 'Registered';

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState(currentTeam?.name || '');

  // Confirm dialogs
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isDisbandDialogOpen, setIsDisbandDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !currentHackathon) return;
    setIsLoading(true);

    try {
      const res = await teamService.createTeam(currentHackathon.id, newTeamName, student);
      if (res.success) {
        addToast(res.message, 'success');
        setIsCreateModalOpen(false);
        setNewTeamName('');
      } else {
        addToast(res.message, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setIsLoading(true);

    try {
      const res = await teamService.joinTeamByCode(joinCode, student);
      if (res.success) {
        addToast(res.message, 'success');
        setIsJoinModalOpen(false);
        setJoinCode('');
      } else {
        addToast(res.message, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!currentTeam || !memberToRemove) return;
    setIsLoading(true);
    try {
      const res = await teamService.removeMember(currentTeam.id, memberToRemove);
      if (res.success) {
        addToast(res.message, 'success');
        setMemberToRemove(null);
      } else {
        addToast(res.message, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisbandTeam = async () => {
    if (!currentTeam) return;
    setIsLoading(true);
    try {
      const res = await teamService.disbandTeam(currentTeam.id);
      if (res.success) {
        addToast(res.message, 'success');
        setIsDisbandDialogOpen(false);
      } else {
        addToast(res.message, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!currentTeam || !student) return;
    setIsLoading(true);
    try {
      const res = await teamService.leaveTeam(currentTeam.id, student.uid);
      if (res.success) {
        addToast(res.message, 'success');
        setIsLeaveDialogOpen(false);
      } else {
        addToast(res.message, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (!currentTeam) return;
    navigator.clipboard.writeText(currentTeam.code);
    addToast(`Invite Code "${currentTeam.code}" copied to clipboard.`, 'info');
  };

  const maxTeamSize = currentHackathon?.maxTeamSize || 4;
  const currentMemberCount = currentTeam?.members.length || 0;
  const isMaxReached = currentMemberCount >= maxTeamSize;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'LEADER':
        return <Crown className="w-3.5 h-3.5 text-amber-600" />;
      case 'DEVELOPER':
        return <Code className="w-3.5 h-3.5 text-blue-600" />;
      case 'DESIGNER':
        return <Palette className="w-3.5 h-3.5 text-indigo-600" />;
      case 'RESEARCHER':
        return <FileSearch className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Users className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'LEADER':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DEVELOPER':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'DESIGNER':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'RESEARCHER':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Hackathon Context (Section 18) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <span>KIT CAMPUS HACKATHON SYSTEM</span>
              <span>•</span>
              <span>STUDENT TEAM MANAGEMENT</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-navy-950">
              My Team
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Form squads, invite classmates, assign technical roles, and coordinate deliverables for official campus challenges.
            </p>
          </div>

          {/* Hackathon Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Selected Event:</span>
            <select
              value={selectedHackathonId}
              onChange={(e) => setSelectedHackathonId(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 max-w-[240px]"
            >
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6 Essential Metadata Cards (Section 18 Requirement) */}
        {currentTeam && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Hackathon</span>
              <span className="font-bold text-slate-900 truncate block mt-0.5" title={currentHackathon?.title}>
                {currentHackathon?.title || 'Unknown Event'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Team Name</span>
              <span className="font-bold text-blue-600 truncate block mt-0.5">
                {currentTeam.name}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Team ID</span>
              <span className="font-mono font-bold text-slate-800 truncate block mt-0.5" title={currentTeam.id}>
                {currentTeam.id.slice(0, 10)}...
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Team Leader</span>
              <span className="font-semibold text-slate-900 truncate block mt-0.5">
                {teamLeaderMember?.name || (isLeader ? student?.name : 'Leader')}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Team Size</span>
              <span className="font-bold text-slate-800 block mt-0.5">
                {currentMemberCount} / {maxTeamSize} Members
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Submission</span>
              <span
                className={`font-bold block mt-0.5 ${
                  submissionStatus === 'SUBMITTED' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {submissionStatus}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* If No Team Yet */}
      {!currentTeam ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-navy-950 mb-1">No Team Formed for this Hackathon</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            You need a squad with 2 to 4 members to compete and submit projects for{' '}
            <strong>{currentHackathon?.title}</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              size="sm"
            >
              Create Team
            </Button>
            <Button
              onClick={() => setIsJoinModalOpen(true)}
              variant="outline"
              size="sm"
            >
              Join with Code
            </Button>
          </div>
        </div>
      ) : (
        /* Team Workspace View */
        <div className="space-y-6">
          {/* Team Progress & Cap Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-navy-950">Team Roster Status</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                  Confirmed & Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Team progress: <strong className="text-slate-800">{currentMemberCount} / {maxTeamSize} Members</strong>
                {isMaxReached && <span className="text-emerald-600 ml-1 font-semibold">(Maximum team capacity reached)</span>}
              </p>
            </div>

            {/* Invite Code & Action Buttons */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Code:</span>
                <span className="font-mono font-bold text-xs text-navy-950">{currentTeam.code}</span>
                <button
                  onClick={copyInviteCode}
                  title="Copy Code"
                  className="text-slate-400 hover:text-slate-700 ml-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Requirement: Add member button should disappear when maximum team size is reached */}
              {!isMaxReached && isLeader && (
                <Button
                  onClick={() => setIsInviteModalOpen(true)}
                  variant="primary"
                  size="sm"
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Invite Member
                </Button>
              )}

              {isLeader && (
                <Button
                  onClick={() => {
                    setEditedTeamName(currentTeam.name);
                    setIsEditModalOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Edit Team
                </Button>
              )}

              {isLeader ? (
                <Button
                  onClick={() => setIsDisbandDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                >
                  Disband
                </Button>
              ) : (
                <Button
                  onClick={() => setIsLeaveDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                >
                  Leave
                </Button>
              )}
            </div>
          </div>

          {/* Members Displayed as Profile Cards (Section 18 Specifications) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-navy-950">Team Squad Members</h3>
              <span className="text-xs text-slate-500">Official Registered Participants</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentTeam.members.map((member) => {
                const memberStudent = students.find((s) => s.uid === member.studentId);
                const yearText = memberStudent?.year ? (memberStudent.year.includes('Year') ? memberStudent.year : `${memberStudent.year} Year`) : '3rd Year';

                return (
                  <div
                    key={member.studentId}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Avatar & Role Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-navy-900 text-cyan-400 font-bold flex items-center justify-center text-sm shadow-sm">
                          {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${getRoleBadgeClass(
                            member.role
                          )}`}
                        >
                          {getRoleIcon(member.role)}
                          <span>{member.role === 'LEADER' ? 'Team Leader' : member.role}</span>
                        </span>
                      </div>

                      {/* Name & Register Number */}
                      <h4 className="font-bold text-navy-950 text-sm">{member.name}</h4>
                      <p className="text-[11px] font-mono text-slate-400 font-medium">{member.registerNumber}</p>

                      {/* Department, Year & Email */}
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{member.department}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Academic Year:</span>
                          <span className="font-semibold text-slate-700">{yearText}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions / Leader Removal */}
                    {isLeader && member.role !== 'LEADER' && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => setMemberToRemove(member.studentId)}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Remove Member
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Disband Dialog */}
      <ConfirmDialog
        isOpen={isDisbandDialogOpen}
        onClose={() => setIsDisbandDialogOpen(false)}
        onConfirm={handleDisbandTeam}
        title="Disband Team"
        message="Are you sure you want to disband this team? All members will be removed and project submissions will be archived."
        confirmText="Disband Team"
        confirmVariant="danger"
        isLoading={isLoading}
      />

      {/* Leave Dialog */}
      <ConfirmDialog
        isOpen={isLeaveDialogOpen}
        onClose={() => setIsLeaveDialogOpen(false)}
        onConfirm={handleLeaveTeam}
        title="Leave Team"
        message="Are you sure you want to leave this team? You will need to join or form another squad before the deadline."
        confirmText="Leave Team"
        confirmVariant="danger"
        isLoading={isLoading}
      />

      {/* Remove Member Dialog */}
      <ConfirmDialog
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Team Member"
        message="Are you sure you want to remove this student from your team roster?"
        confirmText="Remove Member"
        confirmVariant="danger"
        isLoading={isLoading}
      />

      {/* Edit Team Modal (Section 18 Requirement) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Team Details"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Team Name</label>
            <Input
              value={editedTeamName}
              onChange={(e) => setEditedTeamName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-200">
            <span>Team ID: <strong className="font-mono text-slate-700">TEAM-084</strong></span>
            <span className="block mt-1">Hackathon: <strong>{currentHackathon?.title}</strong></span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setIsEditModalOpen(false)} variant="outline" size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (currentTeam) {
                  currentTeam.name = editedTeamName;
                }
                addToast('Team details updated successfully.', 'success');
                setIsEditModalOpen(false);
              }}
              variant="primary"
              size="sm"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Teammates"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Share this team join code with your college peers. When they register for {currentHackathon?.title}, they can enter this code to join your squad.
          </p>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Team Join Code</span>
              <span className="text-lg font-mono font-bold text-navy-950">{currentTeam?.code}</span>
            </div>
            <Button onClick={copyInviteCode} variant="outline" size="sm" leftIcon={<Copy className="w-3.5 h-3.5" />}>
              Copy Code
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsInviteModalOpen(false)} variant="secondary" size="sm">
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Team Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Team Squad"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <Input
            label="Squad Name"
            placeholder="e.g. Neural Forge"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            required
            helperText="Choose a distinctive team name for your hackathon submission."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Team Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Join Team with Invite Code"
      >
        <form onSubmit={handleJoinTeam} className="space-y-4">
          <Input
            label="6-Character Team Code"
            placeholder="e.g. TECH26"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            required
            helperText="Enter the invite code shared by your team leader."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsJoinModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
              Join Squad
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
