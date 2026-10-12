import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { isPlatformAdministrator } from '../../utils/access';
import { teamService } from '../../services/teamService';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import {
  Users,
  Search,
  Trash2,
  Eye,
  Crown,
  Copy,
  AlertTriangle,
  UserX,
  GraduationCap,
  Download
} from 'lucide-react';
import { Team } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { downloadExcelWorkbook, getHackathonReportTitle, resolveHackathonReference } from '../../utils/excelExport.mjs';

export const AdminTeamsPage: React.FC = () => {
  const { teams, hackathons, submissions, currentUser } = useAppStore();
  const { addToast } = useToast();

  const facultyDept = isPlatformAdministrator(currentUser) ? undefined : currentUser?.adminData?.department;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHackathon, setSelectedHackathon] = useState('ALL');
  const [viewTeam, setViewTeam] = useState<Team | null>(null);
  const [disbandTargetId, setDisbandTargetId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ teamId: string; memberId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredTeams = teams.filter((t) => {
    // Scoped to faculty department
    if (facultyDept) {
      const hackathon = hackathons.find((h) => h.id === t.hackathonId);
      const teamDept = (t as any).department || hackathon?.department;
      if (teamDept && teamDept !== facultyDept) return false;
    }

    if (selectedHackathon !== 'ALL' && t.hackathonId !== selectedHackathon) return false;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const match =
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.members.some((m) => m.name.toLowerCase().includes(q) || m.registerNumber.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleDisbandTeam = async () => {
    if (!disbandTargetId) return;
    setIsLoading(true);
    try {
      await teamService.disbandTeam(disbandTargetId);
      addToast('Team disbanded and members unlinked.', 'success');
      setDisbandTargetId(null);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsLoading(true);
    try {
      const result = await teamService.removeMember(memberToRemove.teamId, memberToRemove.memberId);
      if (!result.success) throw new Error(result.message);
      addToast('Student unassigned from team roster.', 'success');
      setMemberToRemove(null);
      if (viewTeam) {
        const updated = teams.find((t) => t.id === viewTeam.id);
        setViewTeam(updated || null);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredTeams.length === 0) {
      addToast('No teams matching current criteria to export.', 'warning');
      return;
    }

    const rows = filteredTeams.map((team) => {
      const hackathon = resolveHackathonReference(team.hackathonId, hackathons);
      const leader = team.members.find((m) => m.role === 'LEADER') || team.members[0];
      const sub = submissions.find(
        (s) => s.teamId === team.id || (s.hackathonId === team.hackathonId && team.members.some((m) => m.studentId === s.submittedBy))
      );
      const membersList = team.members.map((m) => `${m.name} (${m.registerNumber || m.studentId})`).join('; ');

      return {
        teamId: team.id,
        teamCode: team.code || '',
        teamName: team.name,
        hackathonName: hackathon.name,
        hackathonId: hackathon.id,
        hackathonReferenceStatus: hackathon.status,
        leaderName: leader?.name || 'Unassigned',
        leaderRegisterNumber: leader?.registerNumber || '',
        memberCount: team.members.length,
        members: membersList,
        submissionStatus: sub ? sub.status : 'Pending',
        createdAt: team.createdAt || ''
      };
    });

    downloadExcelWorkbook({
      sheetName: 'Teams',
      title: `Team Squads — ${getHackathonReportTitle(selectedHackathon === 'ALL' ? undefined : selectedHackathon, hackathons)}`,
      fileName: `hackhub-teams-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Team ID', key: 'teamId' },
        { header: 'Team Code', key: 'teamCode' },
        { header: 'Team Name', key: 'teamName' },
        { header: 'Hackathon Name', key: 'hackathonName' },
        { header: 'Hackathon ID', key: 'hackathonId' },
        { header: 'Hackathon Reference Status', key: 'hackathonReferenceStatus' },
        { header: 'Team Leader', key: 'leaderName' },
        { header: 'Leader Register No', key: 'leaderRegisterNumber' },
        { header: 'Team Size', key: 'memberCount' },
        { header: 'Members', key: 'members' },
        { header: 'Submission Status', key: 'submissionStatus' },
        { header: 'Created At', key: 'createdAt' }
      ],
      rows
    });
    addToast('Team roster exported as Excel.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header (Section 10: Teams) */}
      <PageHeader
        category="COLLEGE TEAM MONITORING"
        title="Teams"
        description="Monitor collegiate hackathon squads, member composition, submission deliverables, and participation progress across events."
        count={teams.length}
        countLabel="Registered Squads"
        actions={
          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Teams (Excel)
          </Button>
        }
      />

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by team name, invite code, student..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <select
          value={selectedHackathon}
          onChange={(e) => setSelectedHackathon(e.target.value)}
          className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="ALL">All Hackathons ({teams.length} Teams)</option>
          {hackathons.map((h) => (
            <option key={h.id} value={h.id}>
              {h.title}
            </option>
          ))}
        </select>
      </div>

      {/* Teams Table & Mobile Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Team Name</th>
                <th className="py-3 px-4">Hackathon</th>
                <th className="py-3 px-4">Team Leader</th>
                <th className="py-3 px-4">Members</th>
                <th className="py-3 px-4 text-center">Team Size</th>
                <th className="py-3 px-4 text-center">Submission Status</th>
                <th className="py-3 px-4 text-center">Participation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No active teams found.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => {
                  const hackathon = hackathons.find((h) => h.id === team.hackathonId);
                  const leader = team.members.find((m) => m.role === 'LEADER') || team.members[0];
                  const teamDisplayId = team.code ? `SQUAD-${team.code}` : team.id;
                  const sub = submissions.find(
                    (s) => s.teamId === team.id || (s.hackathonId === team.hackathonId && team.members.some((m) => m.studentId === s.submittedBy))
                  );

                  const subStatus = sub ? sub.status : 'Pending';
                let partStatus = 'Participating';
                if (hackathon?.status === 'COMPLETED') {
                  partStatus = 'Completed';
                } else if (sub?.status === 'SUBMITTED') {
                  partStatus = 'Submitted';
                }

                return (
                  <tr key={team.id} className="hover:bg-slate-50 transition-colors">
                    {/* Team Name */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-mono text-[10px] text-blue-700 font-bold block">
                          {teamDisplayId}
                        </span>
                        <span className="font-bold text-navy-950 text-sm">{team.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">Code: {team.code}</span>
                      </div>
                    </td>

                    {/* Hackathon */}
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={hackathon?.title}>
                      {hackathon?.title || 'Collegiate Sprint'}
                    </td>

                    {/* Leader */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900">{leader?.name || 'Unassigned'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{leader?.registerNumber}</p>
                        </div>
                      </div>
                    </td>

                    {/* Members */}
                    <td className="py-3 px-4 max-w-[180px]">
                      <span className="text-slate-800 font-medium block truncate" title={team.members.map((m) => m.name).join(', ')}>
                        {team.members.map((m) => m.name).join(', ')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {team.members.map((m) => m.department.replace(' Engineering', '')).join(', ')}
                      </span>
                    </td>

                    {/* Team Size */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100">
                        {team.members.length} / {hackathon?.maxTeamSize || 4}
                      </span>
                    </td>

                    {/* Submission Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          subStatus === 'SUBMITTED' || subStatus === 'EVALUATED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : subStatus === 'DRAFT'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {subStatus}
                      </span>
                    </td>

                    {/* Participation Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          partStatus === 'Completed'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : partStatus === 'Submitted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {partStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewTeam(team)}
                          title="View Members"
                          className="p-1 text-slate-400 hover:text-navy-950 rounded hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDisbandTargetId(team.id)}
                          title="Disband Team"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards (Section 21) */}
        <div className="block md:hidden p-4 space-y-3">
          {filteredTeams.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No squads found matching search.</p>
            </div>
          ) : (
            filteredTeams.map((team) => {
              const hackathon = hackathons.find((h) => h.id === team.hackathonId);
              const leader = team.members.find((m) => m.role === 'LEADER') || team.members[0];
              const teamDisplayId = team.code ? `SQUAD-${team.code}` : team.id;

              return (
                <div key={team.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-blue-700 font-bold block">
                        {teamDisplayId} • Code: {team.code}
                      </span>
                      <h4 className="font-bold text-navy-950 text-sm mt-0.5">{team.name}</h4>
                      <p className="text-[11px] text-slate-500">{hackathon?.title}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Confirmed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Lead</span>
                      <span className="font-semibold text-slate-800">{leader?.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Roster</span>
                      <span className="font-semibold text-slate-800">{team.members.length} / 4 Members</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {team.members.map((m) => m.name.split(' ')[0]).join(', ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewTeam(team)}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-800" onClick={() => setDisbandTargetId(team.id)}>
                        Disband
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Disband Dialog */}
      <ConfirmDialog
        isOpen={Boolean(disbandTargetId)}
        onClose={() => setDisbandTargetId(null)}
        onConfirm={handleDisbandTeam}
        title="Disband Team"
        message="Are you sure you want to permanently disband this squad? All members will be detached."
        confirmText="Disband Team"
        confirmVariant="danger"
        isLoading={isLoading}
      />

      {/* View Team Modal */}
      {viewTeam && (
        <Modal
          isOpen={Boolean(viewTeam)}
          onClose={() => setViewTeam(null)}
          title={`Team Details: ${viewTeam.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-blue-700 font-bold block">TEAM-084</span>
              <h4 className="text-sm font-bold text-navy-950">{viewTeam.name}</h4>
              <p className="text-slate-500">Invite Code: <strong className="font-mono">{viewTeam.code}</strong></p>
            </div>

            <div>
              <h5 className="font-bold text-navy-950 mb-2">Member Profiles ({viewTeam.members.length})</h5>
              <div className="space-y-2">
                {viewTeam.members.map((m) => (
                  <div key={m.studentId} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-[11px] text-slate-500">{m.department} • <span className="font-mono">{m.registerNumber}</span></p>
                      <span className="text-[10px] font-semibold text-blue-600 uppercase">{m.role}</span>
                    </div>

                    {m.role !== 'LEADER' && (
                      <button
                        onClick={() => setMemberToRemove({ teamId: viewTeam.id, memberId: m.studentId })}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewTeam(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
