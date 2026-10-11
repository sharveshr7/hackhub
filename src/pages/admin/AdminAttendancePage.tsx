import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import {
  UserCheck,
  Users,
  UserX,
  Percent,
  Search,
  Download,
  CheckCircle2,
  Clock,
  KeyRound,
  Copy,
  Check,
  Radio,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { hackathonService } from '../../services/hackathonService';
import { attendanceService } from '../../services/attendanceService';

export const AdminAttendancePage: React.FC = () => {
  const { hackathons, registrations, students, currentUser, updateHackathon, updateRegistrationStatus } = useAppStore();
  const { showToast } = useToast();

  const [selectedHackathonId, setSelectedHackathonId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'attended' | 'pending'>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Compute stats per hackathon and totals
  const hackathonStats = hackathons.map((h) => {
    const regs = registrations.filter((r) => r.hackathonId === h.id);
    const present = regs.filter((r) => Boolean(r.attendedAt) || r.status === 'ATTENDED').length;
    const absent = Math.max(0, regs.length - present);
    const rate = regs.length > 0 ? ((present / regs.length) * 100).toFixed(1) : '0.0';
    return {
      hackathon: h,
      registered: regs.length,
      present,
      absent,
      rate
    };
  });

  const totalRegistered = hackathonStats.reduce((acc, curr) => acc + curr.registered, 0);
  const totalPresent = hackathonStats.reduce((acc, curr) => acc + curr.present, 0);
  const totalAbsent = hackathonStats.reduce((acc, curr) => acc + curr.absent, 0);
  const overallPercentage =
    totalRegistered > 0 ? ((totalPresent / totalRegistered) * 100).toFixed(1) : '0.0';

  // Filtered registrations for roster table
  const filteredRegistrations = registrations.filter((reg) => {
    if (selectedHackathonId !== 'all' && reg.hackathonId !== selectedHackathonId) return false;
    const isPresent = Boolean(reg.attendedAt) || reg.status === 'ATTENDED';
    if (filterStatus === 'attended' && !isPresent) return false;
    if (filterStatus === 'pending' && isPresent) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const student = students.find((s) => s.uid === reg.studentId);
      const matchName = student?.name.toLowerCase().includes(q);
      const matchReg = student?.registerNumber.toLowerCase().includes(q);
      const matchDept = student?.department.toLowerCase().includes(q);
      const matchCode = reg.registrationNumber.toLowerCase().includes(q);
      if (!matchName && !matchReg && !matchDept && !matchCode) return false;
    }
    return true;
  });

  const handleCopyPasscode = (hackathonId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(hackathonId);
    showToast('info', 'Passcode Copied', `Venue check-in passcode "${code}" copied to clipboard.`);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleToggleAttendanceOpen = async (hackathonId: string, current: boolean) => {
    try {
      updateHackathon(hackathonId, { attendanceOpen: !current });
      await hackathonService.toggleAttendance(hackathonId, !current);
      showToast(
        'success',
        'Attendance Window Updated',
        `Physical check-in is now ${!current ? 'OPEN' : 'CLOSED'} for this hackathon.`
      );
    } catch (err: any) {
      showToast('error', 'Attendance Window Error', err.message || 'Failed to update attendance window.');
    }
  };

  const handleManualCheckIn = async (registrationId: string, currentAttended: boolean) => {
    const reg = registrations.find((r) => r.id === registrationId);
    if (!reg) return;

    try {
      if (currentAttended) {
        updateRegistrationStatus(registrationId, 'TEAM_CONFIRMED');
        await attendanceService.manualAttendanceOverride(
          reg.hackathonId,
          reg.studentId,
          'ABSENT',
          currentUser?.uid || 'admin'
        );
        showToast('info', 'Status Updated', 'Student attendance reverted to pending.');
      } else {
        updateRegistrationStatus(registrationId, 'ATTENDED');
        await attendanceService.manualAttendanceOverride(
          reg.hackathonId,
          reg.studentId,
          'PRESENT',
          currentUser?.uid || 'admin'
        );
        showToast('success', 'Verified Present', 'Student successfully checked-in at the desk.');
      }
    } catch (err: any) {
      showToast('error', 'Check-in Error', err.message || 'Failed to persist attendance change.');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Registration ID',
      'Student Name',
      'Register No',
      'Department',
      'Hackathon',
      'Attendance Status',
      'Checked-in Time'
    ];
    const rows = filteredRegistrations.map((r) => {
      const s = students.find((st) => st.uid === r.studentId);
      const h = hackathons.find((hk) => hk.id === r.hackathonId);
      const isPresent = Boolean(r.attendedAt) || r.status === 'ATTENDED';
      return [
        r.registrationNumber,
        `"${s?.name || 'Registered Student'}"`,
        s?.registerNumber || 'N/A',
        `"${s?.department || 'Engineering'}"`,
        `"${h?.title || 'Unknown'}"`,
        isPresent ? 'PRESENT' : 'ABSENT',
        r.attendedAt ? new Date(r.attendedAt).toLocaleString() : 'N/A'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KIT_Hackathon_Attendance_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('info', 'Export Successful', 'Downloaded attendance roster.');
  };

  return (
    <div className="space-y-6">
      {/* Unified PageHeader */}
      <PageHeader
        title="Participant Check-in & Attendance Monitoring"
        description="Audit check-in passcodes, monitor student check-in status, and view attendance records."
        category="Participation Monitoring"
        badge={`${totalPresent} / ${totalRegistered} Present`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Attendance CSV
          </Button>
        }
      />

      {/* KPI Cards (Section 27 requirement: Registered, Present, Absent, Attendance %) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Registered
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-950 font-display">{totalRegistered}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Enrolled participants</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
              Present
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-display">{totalPresent}</div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Verified at venue</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
              Absent
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-700 font-display">{totalAbsent}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Pending check-in</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
              Attendance %
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-900 font-display">{overallPercentage}%</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Turnout completion</p>
        </div>
      </div>

      {/* Event-wise Attendance Cards (Section 27: Hackathon, Registered, Present, Absent, Attendance %) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-navy-950 font-display">Hackathon Check-in Passcodes & Attendance</h2>
          <span className="text-xs text-slate-500">Live operational status</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hackathonStats.map(({ hackathon, registered, present, absent, rate }) => (
            <div
              key={hackathon.id}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-navy-950 text-xs truncate">{hackathon.title}</h3>
                    <p className="text-[10px] text-slate-400">
                      {hackathon.eventStart
                        ? new Date(hackathon.eventStart).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'TBA'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      hackathon.attendanceOpen
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {hackathon.attendanceOpen ? 'Check-in Open' : 'Check-in Closed'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">Turnout</span>
                    <span className="text-navy-900 font-mono">{rate}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        Number(rate) > 85 ? 'bg-emerald-500' : Number(rate) > 50 ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>

                {/* Registered, Present, Absent breakdown */}
                <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 bg-slate-50 rounded-lg text-center border border-slate-100 text-[11px] mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Registered</span>
                    <span className="font-bold text-slate-800">{registered}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Present</span>
                    <span className="font-bold text-emerald-700">{present}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Absent</span>
                    <span className="font-bold text-slate-600">{absent}</span>
                  </div>
                </div>
              </div>

              {/* Passcode & Check-in Control */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Passcode:</span>
                  <button
                    onClick={() => handleCopyPasscode(hackathon.id, hackathon.attendanceCode || 'KIT-NEXUS-2026')}
                    className="flex items-center gap-1 font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
                    title="Click to copy venue passcode"
                  >
                    <span>{hackathon.attendanceCode || 'KIT-NEXUS-2026'}</span>
                    {copiedCodeId === hackathon.id ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-blue-500" />
                    )}
                  </button>
                </div>

                <Button
                  size="sm"
                  variant={hackathon.attendanceOpen ? 'danger' : 'secondary'}
                  onClick={() => handleToggleAttendanceOpen(hackathon.id, Boolean(hackathon.attendanceOpen))}
                  className="text-[10px] py-1 px-2.5 h-auto"
                >
                  {hackathon.attendanceOpen ? 'Disable Check-in' : 'Enable Check-in'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Check-in Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-navy-950 font-display">Student Attendance Roster</h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-full font-mono">
              {filteredRegistrations.length} Records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, roll no..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-navy-900 bg-white w-48 sm:w-56"
              />
            </div>

            <select
              value={selectedHackathonId}
              onChange={(e) => setSelectedHackathonId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-navy-900 bg-white"
            >
              <option value="all">All Hackathons</option>
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-navy-900 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="attended">Present Only</option>
              <option value="pending">Absent / Pending Only</option>
            </select>
          </div>
        </div>

        {/* Desktop Table (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 bg-slate-50">Student</th>
                <th className="py-3 px-4 bg-slate-50">Register No</th>
                <th className="py-3 px-4 bg-slate-50">Department</th>
                <th className="py-3 px-4 bg-slate-50">Hackathon</th>
                <th className="py-3 px-4 bg-slate-50">Reg ID</th>
                <th className="py-3 px-4 bg-slate-50">Status</th>
                <th className="py-3 px-4 bg-slate-50">Verified Time</th>
                <th className="py-3 px-4 text-right bg-slate-50">Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => {
                  const s = students.find((st) => st.uid === reg.studentId);
                  const h = hackathons.find((hk) => hk.id === reg.hackathonId);
                  const isPresent = Boolean(reg.attendedAt) || reg.status === 'ATTENDED';

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-navy-950">
                        {s?.name || 'Registered Student'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {s?.registerNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {s?.department || 'Engineering'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 text-[11px]">
                        {h?.title || 'Hackathon'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-blue-700">
                        {reg.registrationNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPresent
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              PRESENT
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              ABSENT / PENDING
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {reg.attendedAt
                          ? new Date(reg.attendedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleManualCheckIn(reg.id, isPresent)}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                            isPresent
                              ? 'text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {isPresent ? 'Undo Check-in' : 'Mark Present'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards Layout (Section 21) */}
        <div className="block md:hidden p-4 space-y-3">
          {filteredRegistrations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching attendance records found.
            </div>
          ) : (
            filteredRegistrations.map((reg) => {
              const s = students.find((st) => st.uid === reg.studentId);
              const h = hackathons.find((hk) => hk.id === reg.hackathonId);
              const isPresent = Boolean(reg.attendedAt) || reg.status === 'ATTENDED';

              return (
                <div key={reg.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-blue-700 font-bold text-xs">{reg.registrationNumber}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPresent
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isPresent ? 'PRESENT' : 'PENDING'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{s?.name || 'Registered Student'}</h4>
                    <p className="text-[11px] text-slate-500">{s?.registerNumber} • {s?.department}</p>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">{h?.title}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {reg.attendedAt ? new Date(reg.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not verified'}
                    </span>
                    <button
                      onClick={() => handleManualCheckIn(reg.id, isPresent)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        isPresent
                          ? 'text-slate-600 bg-slate-200 hover:bg-rose-50 hover:text-rose-600'
                          : 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 font-bold'
                      }`}
                    >
                      {isPresent ? 'Undo' : 'Check-In Student'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{filteredRegistrations.length}</strong> of <strong>{registrations.length}</strong> checked records
          </span>
          <span className="font-medium text-slate-400">Real-time attendance desk synced</span>
        </div>
      </div>
    </div>
  );
};
