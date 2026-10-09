import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { hackathonService } from '../../services/hackathonService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Send,
  Eye,
  Settings,
  Megaphone,
  UserCheck,
  FolderGit2,
  Edit,
  Share2,
  Layers,
  Trophy,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { HackathonStatus } from '../../types';

export const AdminHackathonDetailPage: React.FC = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const { hackathons, registrations, teams, submissions, students, announcements } = useAppStore();
  const { addToast } = useToast();

  const hackathon = hackathons.find((h) => h.id === hackathonId) || hackathons[0];

  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'REGISTRATIONS' | 'TEAMS' | 'SUBMISSIONS' | 'ATTENDANCE' | 'ANNOUNCEMENTS' | 'SETTINGS'
  >('OVERVIEW');

  const [attendanceCode, setAttendanceCode] = useState(hackathon?.attendanceCode || 'KIT26');
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!hackathon) {
    return (
      <div className="bg-white p-8 rounded-xl text-center border border-slate-200">
        <h2 className="text-base font-bold text-navy-950">Hackathon Not Found</h2>
        <Link to="/admin/hackathons" className="text-xs text-blue-600 mt-2 block font-semibold">
          Return to Hackathons Roster
        </Link>
      </div>
    );
  }

  const hackathonRegs = registrations.filter((r) => r.hackathonId === hackathon.id);
  const hackathonTeams = teams.filter((t) => t.hackathonId === hackathon.id);
  const hackathonSubs = submissions.filter((s) => s.hackathonId === hackathon.id);
  const hackathonAnnouncements = announcements.filter((a) => a.hackathonId === hackathon.id);

  const participantCount = hackathonRegs.length;
  const teamCount = hackathonTeams.length;
  const subCount = hackathonSubs.length;

  const handleStatusChange = async (newStatus: HackathonStatus) => {
    try {
      await hackathonService.updateHackathonStatus(hackathon.id, newStatus);
      addToast(`Hackathon status set to ${newStatus}.`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleAttendance = async (isOpen: boolean) => {
    setIsLoading(true);
    try {
      await hackathonService.toggleAttendance(hackathon.id, isOpen, attendanceCode);
      addToast(`Attendance check-in is now ${isOpen ? 'OPEN' : 'CLOSED'}.`, 'success');
      setIsAttendanceModalOpen(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/admin/hackathons"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-950 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Hackathons</span>
      </Link>

      {/* Header & Actions Bar (Requirement 7) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <StatusBadge status={hackathon.status} />
              <span className="text-xs text-slate-500 font-medium">
                {hackathon.mode.replace('_', ' ')} • {hackathon.location}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-navy-950">{hackathon.title}</h1>
            <p className="text-xs text-slate-500">{hackathon.organizer} • {hackathon.venue}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleStatusChange('REGISTRATION_OPEN')}
              variant="outline"
              size="sm"
            >
              Publish
            </Button>
            <Button
              onClick={() => handleStatusChange('LIVE')}
              variant="primary"
              size="sm"
            >
              Go Live
            </Button>
            <Button
              onClick={() => setIsAttendanceModalOpen(true)}
              variant="secondary"
              size="sm"
              leftIcon={<QrCode className="w-3.5 h-3.5" />}
            >
              Check-in Code ({hackathon.attendanceCode || 'KIT26'})
            </Button>
          </div>
        </div>

        {/* Hero Information Matrix (Requirement 7) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Event Date</span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {new Date(hackathon.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric' })}–
              {new Date(hackathon.eventEnd).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Registration Deadline</span>
            <span className="font-bold text-amber-700 mt-0.5 block">
              {new Date(hackathon.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Participants</span>
            <span className="font-bold text-navy-950 font-mono mt-0.5 block text-sm">
              {participantCount.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Teams</span>
            <span className="font-bold text-navy-950 font-mono mt-0.5 block text-sm">
              {teamCount}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Submissions</span>
            <span className="font-bold text-emerald-700 font-mono mt-0.5 block text-sm">
              {subCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Requirement 7: Overview, Registrations, Teams, Submissions, Attendance, Announcements, Settings) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 flex items-center gap-1 overflow-x-auto scrollbar-none bg-slate-50/50">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'REGISTRATIONS', label: `Registrations (${hackathonRegs.length})`, icon: <FileCheck2 className="w-3.5 h-3.5" /> },
            { id: 'TEAMS', label: `Teams (${hackathonTeams.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'SUBMISSIONS', label: `Submissions (${hackathonSubs.length})`, icon: <FolderGit2 className="w-3.5 h-3.5" /> },
            { id: 'ATTENDANCE', label: 'Attendance', icon: <UserCheck className="w-3.5 h-3.5" /> },
            { id: 'ANNOUNCEMENTS', label: `Announcements (${hackathonAnnouncements.length})`, icon: <Megaphone className="w-3.5 h-3.5" /> },
            { id: 'SETTINGS', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-navy-950'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'OVERVIEW' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-navy-950 mb-2">Description & Scope</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl whitespace-pre-line">
                {hackathon.description}
              </p>
            </div>

            {/* Problem Statements */}
            <div>
              <h3 className="text-sm font-bold text-navy-950 mb-3">Problem Statement Tracks</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hackathon.problemStatements.map((ps) => (
                  <div key={ps.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                      {ps.domain}
                    </span>
                    <h4 className="font-bold text-xs text-navy-950">{ps.title}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{ps.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prizes */}
            <div>
              <h3 className="text-sm font-bold text-navy-950 mb-3">Prize Pool & Grants</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {hackathon.prizes.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[10px] uppercase font-bold text-amber-600 block">{p.title}</span>
                    <span className="text-base font-bold text-navy-950 mt-1 block">{p.reward}</span>
                    {p.description && <p className="text-[11px] text-slate-500 mt-1">{p.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Registrations */}
        {activeTab === 'REGISTRATIONS' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Registration ID</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Registered At</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hackathonRegs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No registrations yet.
                      </td>
                    </tr>
                  ) : (
                    hackathonRegs.map((r) => {
                      const st = students.find((s) => s.uid === r.studentId);
                      return (
                        <tr key={r.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{r.registrationNumber}</td>
                          <td className="py-2.5 px-3 font-semibold text-navy-950">{st?.name || 'Registered Student'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{st?.registerNumber || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{st?.department || 'Engineering'}</td>
                          <td className="py-2.5 px-3 text-slate-400">{new Date(r.registeredAt).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Teams */}
        {activeTab === 'TEAMS' && (
          <div className="p-6">
            {hackathonTeams.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active teams.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hackathonTeams.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-navy-950">{t.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">
                        Code: {t.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{t.members.length} Members Enrolled</p>
                    <div className="space-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      {t.members.map((m) => (
                        <div key={m.studentId} className="flex justify-between">
                          <span>{m.name}</span>
                          <span className="text-slate-400 font-medium">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Submissions */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="p-6 space-y-4">
            {hackathonSubs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No submissions yet.
              </div>
            ) : (
              hackathonSubs.map((sub) => (
                <div key={sub.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {sub.teamName}
                    </span>
                    <h4 className="font-bold text-sm text-navy-950 mt-1">{sub.projectTitle}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{sub.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {sub.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Attendance */}
        {activeTab === 'ATTENDANCE' && (
          <div className="p-6 space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-navy-950">Participant Check-in Desk</h3>
            <p className="text-xs text-slate-500">
              Manage the check-in passcode for participating students.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in Status:</span>
                <span className="font-bold text-emerald-700">{hackathon.attendanceOpen ? 'OPEN' : 'CLOSED'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Check-in Code:</span>
                <span className="font-mono font-bold text-navy-950">{hackathon.attendanceCode || 'KIT26'}</span>
              </div>
            </div>

            <Button onClick={() => setIsAttendanceModalOpen(true)} variant="primary" size="sm">
              Configure Check-in Code
            </Button>
          </div>
        )}

        {/* Tab 6: Announcements */}
        {activeTab === 'ANNOUNCEMENTS' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-navy-950">Targeted Announcements</h3>
              <Link to="/admin/announcements" className="text-xs text-blue-600 font-semibold hover:underline">
                + Create Announcement
              </Link>
            </div>

            {hackathonAnnouncements.map((ann) => (
              <div key={ann.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-xs text-navy-950">{ann.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {ann.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{ann.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 7: Settings */}
        {activeTab === 'SETTINGS' && (
          <div className="p-6 space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-navy-950">Hackathon Configuration</h3>
            <div className="space-y-3 text-xs">
              <Input label="Title" value={hackathon.title} disabled />
              <Input label="Venue" value={hackathon.venue} disabled />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Min Team Size" value={String(hackathon.minTeamSize)} disabled />
                <Input label="Max Team Size" value={String(hackathon.maxTeamSize)} disabled />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Check-in Modal */}
      {isAttendanceModalOpen && (
        <Modal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          title="Check-in Code Configuration"
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-600">
              Update the verification check-in code announced for {hackathon.title}.
            </p>

            <Input
              label="Check-in Security Code"
              value={attendanceCode}
              onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
            />

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleToggleAttendance(false)}
                isLoading={isLoading}
              >
                Close Check-in
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleToggleAttendance(true)}
                isLoading={isLoading}
              >
                Save & Open Check-in
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
