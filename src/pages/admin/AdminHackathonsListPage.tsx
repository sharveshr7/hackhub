import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { hackathonService } from '../../services/hackathonService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import {
  CalendarDays,
  Plus,
  Search,
  Eye,
  Trash2,
  QrCode,
  Users,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Edit,
  FolderGit2,
  FileCheck2,
  Megaphone,
  Activity
} from 'lucide-react';
import { Hackathon, HackathonStatus } from '../../types';

export const AdminHackathonsListPage: React.FC = () => {
  const { hackathons, registrations, teams, submissions } = useAppStore();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DRAFT' | 'REG_OPEN' | 'REG_CLOSED' | 'LIVE' | 'COMPLETED'>('ALL');

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<Hackathon | null>(null);
  const [newAttendanceCode, setNewAttendanceCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filters = [
    { id: 'ALL', label: 'All' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'REG_OPEN', label: 'Registration Open' },
    { id: 'REG_CLOSED', label: 'Registration Closed' },
    { id: 'LIVE', label: 'Live' },
    { id: 'COMPLETED', label: 'Completed' }
  ];

  const filteredHackathons = hackathons.filter((h) => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const match =
        h.title.toLowerCase().includes(q) ||
        h.organizer.toLowerCase().includes(q) ||
        h.venue.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Filter
    const st = String(h.status).toUpperCase();
    if (activeFilter === 'DRAFT') {
      return st === 'DRAFT';
    }
    if (activeFilter === 'REG_OPEN') {
      return st === 'REGISTRATION_OPEN';
    }
    if (activeFilter === 'REG_CLOSED') {
      return st === 'REGISTRATION_CLOSED';
    }
    if (activeFilter === 'LIVE') {
      return st === 'LIVE';
    }
    if (activeFilter === 'COMPLETED') {
      return st === 'COMPLETED';
    }

    return true;
  });

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsLoading(true);
    try {
      await hackathonService.deleteHackathon(deleteTargetId);
      addToast('Hackathon removed from institutional roster.', 'success');
      setDeleteTargetId(null);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAttendance = async (isOpen: boolean) => {
    if (!attendanceTarget) return;
    setIsLoading(true);
    try {
      await hackathonService.toggleAttendance(
        attendanceTarget.id,
        isOpen,
        newAttendanceCode || attendanceTarget.attendanceCode
      );
      addToast(`Venue attendance code set to ${isOpen ? 'ACTIVE' : 'CLOSED'}.`, 'success');
      setAttendanceTarget(null);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified PageHeader */}
      <PageHeader
        title="Hackathons"
        description="Create, manage, and monitor all college sprint hackathons."
        category="Events & Competitions"
        badge={`${filteredHackathons.length} Events`}
        actions={
          <Link
            to="/admin/hackathons/create"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Hackathon</span>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, department, venue..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === f.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View (hidden on mobile, Section 21) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Hackathon</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Registrations</th>
                <th className="py-3 px-4 text-center">Teams</th>
                <th className="py-3 px-4 text-center">Submissions</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHackathons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching hackathons found.
                  </td>
                </tr>
              ) : (
                filteredHackathons.map((h) => {
                  const regCount = registrations.filter((r) => r.hackathonId === h.id).length;
                  const teamCount = teams.filter((t) => t.hackathonId === h.id).length;
                  const subCount = submissions.filter((s) => s.hackathonId === h.id && !s.isDraft).length;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                      {/* Name & Organizer */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/admin/hackathons/${h.id}`}
                          className="font-bold text-navy-950 hover:text-blue-600 transition-colors block"
                        >
                          {h.title}
                        </Link>
                        <span className="text-[10px] text-slate-400 block font-medium mt-0.5 truncate max-w-xs">
                          {h.organizer}
                        </span>
                      </td>

                      {/* Event Date */}
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {new Date(h.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric' })}–
                        {new Date(h.eventEnd).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Registration Count */}
                      <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                        {regCount.toLocaleString()}
                      </td>

                      {/* Team Count */}
                      <td className="py-3 px-4 text-center font-semibold text-slate-700 font-mono">
                        {teamCount}
                      </td>

                      {/* Submissions Count */}
                      <td className="py-3 px-4 text-center font-semibold text-emerald-700 font-mono">
                        {subCount}
                      </td>

                      {/* Registration Deadline */}
                      <td className="py-3 px-4 text-amber-700 font-semibold">
                        {new Date(h.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={h.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Link
                            to={`/admin/hackathons/${h.id}`}
                            title="View / Monitor / Edit Control Center"
                            className="p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/admin/registrations`}
                            title="View Registrations"
                            className="p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/admin/teams`}
                            title="View Teams"
                            className="p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/admin/submissions`}
                            title="View Submissions"
                            className="p-1 text-slate-600 hover:text-emerald-600 rounded hover:bg-slate-100"
                          >
                            <FolderGit2 className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/admin/announcements`}
                            title="Announcements"
                            className="p-1 text-slate-600 hover:text-amber-600 rounded hover:bg-slate-100"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => {
                              setAttendanceTarget(h);
                              setNewAttendanceCode(h.attendanceCode || '');
                            }}
                            title="Venue Check-in Code"
                            className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(h.id)}
                            title="Delete Hackathon"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View (Section 21: Mobile converts rows into cards) */}
      <div className="block md:hidden space-y-3">
        {filteredHackathons.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            No matching hackathons found.
          </div>
        ) : (
          filteredHackathons.map((h) => {
            const regCount = registrations.filter((r) => r.hackathonId === h.id).length;
            const teamCount = teams.filter((t) => t.hackathonId === h.id).length;
            const subCount = submissions.filter((s) => s.hackathonId === h.id && !s.isDraft).length;

            return (
              <div
                key={h.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/admin/hackathons/${h.id}`}
                      className="font-bold text-sm text-navy-950 hover:text-blue-600 block"
                    >
                      {h.title}
                    </Link>
                    <span className="text-[11px] text-slate-400">{h.organizer}</span>
                  </div>
                  <StatusBadge status={h.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date</span>
                    <span className="font-medium text-slate-800 text-[11px]">
                      {new Date(h.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Deadline</span>
                    <span className="font-semibold text-amber-700 text-[11px]">
                      {new Date(h.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Registrations</span>
                    <span className="font-bold text-slate-900 font-mono">{regCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Teams</span>
                    <span className="font-bold text-slate-900 font-mono">{teamCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Submissions</span>
                    <span className="font-bold text-emerald-700 font-mono">{subCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Attendance</span>
                    <span className="font-mono text-blue-600 font-bold">{h.attendanceCode || 'None'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/hackathons/${h.id}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      <span>Control Center</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to={`/admin/registrations`}
                      className="text-xs font-semibold text-slate-600 hover:text-blue-600"
                    >
                      Regs
                    </Link>
                    <Link
                      to={`/admin/teams`}
                      className="text-xs font-semibold text-slate-600 hover:text-blue-600"
                    >
                      Teams
                    </Link>
                    <Link
                      to={`/admin/submissions`}
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-600"
                    >
                      Subs
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAttendanceTarget(h);
                        setNewAttendanceCode(h.attendanceCode || '');
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Attendance Check-in"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(h.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Hackathon"
        message="Are you sure you want to permanently delete this hackathon? All associated participant registrations and team workspaces will be removed."
        confirmText="Delete Hackathon"
        confirmVariant="danger"
        isLoading={isLoading}
      />

      {/* Attendance Check-in Modal */}
      {attendanceTarget && (
        <Modal
          isOpen={Boolean(attendanceTarget)}
          onClose={() => setAttendanceTarget(null)}
          title={`Check-in Code: ${attendanceTarget.title}`}
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-600">
              Students must enter this passcode in their portal to verify attendance for this hackathon.
            </p>

            <Input
              label="Check-in Security Code"
              value={newAttendanceCode}
              onChange={(e) => setNewAttendanceCode(e.target.value.toUpperCase())}
              placeholder="e.g. KIT26"
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
