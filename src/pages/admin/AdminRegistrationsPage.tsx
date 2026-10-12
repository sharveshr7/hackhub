import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../lib/store';
import { adminService } from '../../services/adminService';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  X
} from 'lucide-react';
import { Registration, RegistrationStatus } from '../../types';
import {
  SUPPORTED_DEPARTMENTS,
  SUPPORTED_ACADEMIC_YEARS,
  normalizeAcademicYear
} from '../../constants/departments';
import { downloadExcelWorkbook, getHackathonReportTitle, resolveHackathonReference } from '../../utils/excelExport.mjs';
import { isPlatformAdministrator } from '../../utils/access';

export const AdminRegistrationsPage: React.FC = () => {
  const { registrations, students, hackathons, teams, submissions, currentUser } = useAppStore();
  const { addToast } = useToast();

  const facultyDept = isPlatformAdministrator(currentUser) ? undefined : currentUser?.adminData?.department;
  const authorizedYears = currentUser?.adminData?.authorizedYears;

  const normalizedAuthorizedYears = useMemo(() => {
    if (!authorizedYears || authorizedYears.length === 0) return null;
    return authorizedYears.map(normalizeAcademicYear).filter(Boolean);
  }, [authorizedYears]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHackathon, setSelectedHackathon] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewRegistration, setViewRegistration] = useState<Registration | null>(null);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<string[]>([]);

  const departments = facultyDept ? [facultyDept] : SUPPORTED_DEPARTMENTS;
  const years = SUPPORTED_ACADEMIC_YEARS;

  const filteredRegistrations = registrations.filter((reg) => {
    const student = students.find((s) => s.uid === reg.studentId);
    const hackathon = hackathons.find((h) => h.id === reg.hackathonId);
    const team = teams.find((t) => t.id === reg.teamId);

    // Strict faculty scope enforcement
    if (facultyDept) {
      if (student && student.department !== facultyDept) return false;
      if (normalizedAuthorizedYears && normalizedAuthorizedYears.length > 0) {
        if (!student?.year) return false;
        const normY = normalizeAcademicYear(student.year);
        if (!normY || !normalizedAuthorizedYears.includes(normY)) return false;
      }
    }

    if (selectedHackathon !== 'ALL' && reg.hackathonId !== selectedHackathon) return false;
    if (selectedDepartment !== 'ALL' && student?.department !== selectedDepartment) return false;
    if (selectedYear !== 'ALL') {
      const normSelected = normalizeAcademicYear(selectedYear);
      const normStudent = normalizeAcademicYear(student?.year);
      if (normSelected && normStudent) {
        if (normSelected !== normStudent) return false;
      } else if (String(student?.year) !== selectedYear) {
        return false;
      }
    }
    if (selectedTeamFilter === 'HAS_TEAM' && !reg.teamId) return false;
    if (selectedTeamFilter === 'NO_TEAM' && reg.teamId) return false;
    if (selectedStatus !== 'ALL') {
      if (reg.status !== selectedStatus) return false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const match =
        reg.registrationNumber.toLowerCase().includes(q) ||
        (student?.name.toLowerCase().includes(q) ?? false) ||
        (student?.registerNumber.toLowerCase().includes(q) ?? false) ||
        (hackathon?.title.toLowerCase().includes(q) ?? false) ||
        (team?.name.toLowerCase().includes(q) ?? false);
      if (!match) return false;
    }

    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRegistrationIds(filteredRegistrations.map((r) => r.id));
    } else {
      setSelectedRegistrationIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedRegistrationIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusUpdate = async (newStatus: RegistrationStatus) => {
    try {
      for (const id of selectedRegistrationIds) {
        await adminService.updateRegistrationStatus(id, newStatus);
      }
      addToast(`Updated ${selectedRegistrationIds.length} registrations to ${newStatus}.`, 'success');
      setSelectedRegistrationIds([]);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
    try {
      await adminService.updateRegistrationStatus(id, status);
      addToast(`Registration status set to ${status}.`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleExportExcel = () => {
    const rows = filteredRegistrations.map((registration) => {
      const student = students.find((item) => item.uid === registration.studentId);
      const team = teams.find((item) => item.id === registration.teamId);
      const hackathon = resolveHackathonReference(registration.hackathonId, hackathons);
      return {
        registrationId: registration.registrationNumber || registration.id,
        studentName: student?.name || 'Unresolved student',
        studentRegistrationNumber: student?.registerNumber || '',
        department: student?.department || registration.department || 'Unassigned',
        academicYear: student?.year || 'Unassigned',
        hackathonName: hackathon.name,
        hackathonId: hackathon.id,
        hackathonReferenceStatus: hackathon.status,
        teamName: team?.name || 'No Team',
        teamId: registration.teamId || '',
        status: registration.status,
        attendance: registration.attendanceStatus || (registration.attendedAt ? 'PRESENT' : 'PENDING'),
        submission: registration.submissionStatus || 'NOT_SUBMITTED',
        registeredAt: registration.registeredAt || ''
      };
    });
    downloadExcelWorkbook({
      sheetName: 'Registrations',
      title: `Registration report — ${getHackathonReportTitle(selectedHackathon, hackathons)}`,
      fileName: `hackhub-registrations-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Registration ID', key: 'registrationId' },
        { header: 'Student Name', key: 'studentName' },
        { header: 'Student Registration Number', key: 'studentRegistrationNumber' },
        { header: 'Department', key: 'department' },
        { header: 'Academic Year', key: 'academicYear' },
        { header: 'Hackathon Name', key: 'hackathonName' },
        { header: 'Hackathon ID', key: 'hackathonId' },
        { header: 'Hackathon Reference Status', key: 'hackathonReferenceStatus' },
        { header: 'Team Name', key: 'teamName' },
        { header: 'Team ID', key: 'teamId' },
        { header: 'Status', key: 'status' },
        { header: 'Attendance', key: 'attendance' },
        { header: 'Submission', key: 'submission' },
        { header: 'Registered At', key: 'registeredAt' }
      ],
      rows
    });
    addToast('Registrations downloaded as a filtered Excel report.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* PageHeader (Section 9: Hackathon Registrations) */}
      <PageHeader
        title="Hackathon Registrations"
        description="Monitor collegiate student entries, track assigned squads, and verify registration and participation status across departments."
        category="COLLEGE REGISTRATION MONITORING"
        badge={`${filteredRegistrations.length} Registrations`}
        actions={
          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Roster Excel
          </Button>
        }
      />

      {/* Filter and Search Bar (Section 23 Filters: Hackathon, Department, Year, Status, Team) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, student, roll no..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Hackathon filter */}
            <select
              value={selectedHackathon}
              onChange={(e) => setSelectedHackathon(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Hackathons</option>
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>

            {/* Department filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Year filter (Section 23) */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Academic Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Team filter (Section 23) */}
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Teams</option>
              <option value="HAS_TEAM">Has Assigned Squad</option>
              <option value="NO_TEAM">Squad Formation Pending</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="TEAM_PENDING">Team Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips (Section 22) */}
        {(selectedHackathon !== 'ALL' ||
          selectedDepartment !== 'ALL' ||
          selectedYear !== 'ALL' ||
          selectedTeamFilter !== 'ALL' ||
          selectedStatus !== 'ALL' ||
          searchQuery.trim()) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium text-[11px] mr-1">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedHackathon !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px]">
                Event: {hackathons.find((h) => h.id === selectedHackathon)?.title || selectedHackathon}
                <button onClick={() => setSelectedHackathon('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedDepartment !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px]">
                Dept: {selectedDepartment}
                <button onClick={() => setSelectedDepartment('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px]">
                Status: {selectedStatus}
                <button onClick={() => setSelectedStatus('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedHackathon('ALL');
                setSelectedDepartment('ALL');
                setSelectedYear('ALL');
                setSelectedTeamFilter('ALL');
                setSelectedStatus('ALL');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold ml-2 underline"
            >
              Reset All
            </button>
          </div>
        )}

        {/* Bulk Selection Toolbar */}
        {selectedRegistrationIds.length > 0 && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs animate-fadeIn">
            <span className="font-semibold text-blue-900">
              {selectedRegistrationIds.length} registrations selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleBulkStatusUpdate('CONFIRMED')}
              >
                Bulk Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate('CANCELLED')}
              >
                Bulk Cancel
              </Button>
              <button
                onClick={() => setSelectedRegistrationIds([])}
                className="text-slate-500 hover:text-slate-800 text-[11px] underline ml-1"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Registrations Table (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-8 bg-slate-50">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={filteredRegistrations.length > 0 && selectedRegistrationIds.length === filteredRegistrations.length}
                    className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                  />
                </th>
                <th className="py-3 px-4 bg-slate-50">Registration ID</th>
                <th className="py-3 px-4 bg-slate-50">Student</th>
                <th className="py-3 px-4 bg-slate-50">Hackathon</th>
                <th className="py-3 px-4 bg-slate-50">Department</th>
                <th className="py-3 px-4 bg-slate-50">Team</th>
                <th className="py-3 px-4 bg-slate-50">Status</th>
                <th className="py-3 px-4 bg-slate-50">Participation</th>
                <th className="py-3 px-4 bg-slate-50">Registered</th>
                <th className="py-3 px-4 text-right bg-slate-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No matching registration records found with active filters.
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => {
                  const student = students.find((s) => s.uid === reg.studentId);
                  const hackathon = hackathons.find((h) => h.id === reg.hackathonId);
                  const team = teams.find((t) => t.id === reg.teamId);
                  const hasSub = submissions.some(
                    (sub) => sub.hackathonId === reg.hackathonId && (sub.teamId === reg.teamId || sub.submittedBy === reg.studentId)
                  );

                  let partStatus = 'Registered';
                  if (hackathon?.status === 'COMPLETED') {
                    partStatus = 'Completed';
                  } else if (hasSub) {
                    partStatus = 'Submitted';
                  } else if (team) {
                    partStatus = 'Participating';
                  }

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedRegistrationIds.includes(reg.id)}
                          onChange={() => handleToggleSelect(reg.id)}
                          className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                        />
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-blue-700 text-[11px]">
                        {reg.registrationNumber}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-navy-950 block">{student?.name || 'Registered Student'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{student?.registerNumber}</span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                        {hackathon?.title}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-slate-600">
                        {student?.department || 'Engineering'}
                      </td>

                      {/* Team */}
                      <td className="py-3 px-4">
                        {team ? (
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            {team.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No Team</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            reg.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : reg.status === 'TEAM_PENDING'
                              ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                              : reg.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>

                      {/* Participation Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            partStatus === 'Completed'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : partStatus === 'Submitted'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : partStatus === 'Participating'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {partStatus}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(reg.registeredAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setViewRegistration(reg)}
                            title="View Details"
                            className="p-1 text-slate-400 hover:text-navy-950 rounded hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(reg.id, 'CONFIRMED')}
                            title="Confirm Registration"
                            className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(reg.id, 'CANCELLED')}
                            title="Cancel Registration"
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
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

      {/* Mobile Stacked Cards Layout (Section 21 Requirement) */}
      <div className="block md:hidden space-y-3">
        {filteredRegistrations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No matching registrations found.
          </div>
        ) : (
          filteredRegistrations.map((reg) => {
            const student = students.find((s) => s.uid === reg.studentId);
            const hackathon = hackathons.find((h) => h.id === reg.hackathonId);
            const team = teams.find((t) => t.id === reg.teamId);

            return (
              <div key={reg.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-700 text-xs">{reg.registrationNumber}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      reg.status === 'CONFIRMED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {reg.status}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{student?.name || 'Registered Student'}</h4>
                  <p className="text-xs text-slate-500">{student?.registerNumber} • {student?.department}</p>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="truncate"><strong>Event:</strong> {hackathon?.title}</p>
                  <p><strong>Team:</strong> {team?.name || 'Individual'}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(reg.registeredAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="outline" onClick={() => setViewRegistration(reg)}>
                      View Details
                    </Button>
                    <button
                      onClick={() => handleStatusUpdate(reg.id, 'CONFIRMED')}
                      className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredRegistrations.length}</strong> of <strong>{registrations.length}</strong> total registrations
        </span>
        <span className="font-medium text-slate-400">All records synchronized</span>
      </div>

      {/* Registration Details Modal */}
      {viewRegistration && (
        <Modal
          isOpen={Boolean(viewRegistration)}
          onClose={() => setViewRegistration(null)}
          title="Student Registration Record"
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <p>
                <strong>Registration ID:</strong>{' '}
                <span className="font-mono text-blue-700 font-bold">{viewRegistration.registrationNumber}</span>
              </p>
              <p>
                <strong>Hackathon:</strong>{' '}
                {hackathons.find((h) => h.id === viewRegistration.hackathonId)?.title}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span className="font-bold text-slate-900">{viewRegistration.status}</span>
              </p>
              <p>
                <strong>Registered Timestamp:</strong>{' '}
                {new Date(viewRegistration.registeredAt).toLocaleString()}
              </p>
              {viewRegistration.attendedAt && (
                <p className="text-emerald-700 font-semibold">
                  ✓ Attendance verified at venue: {new Date(viewRegistration.attendedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewRegistration(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
