import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../lib/store';
import { adminService } from '../../services/adminService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import {
  GraduationCap,
  Search,
  Mail,
  Phone,
  Eye,
  Calendar,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  Users,
  FileText,
  Trophy,
  Filter,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { Student } from '../../types';
import {
  SUPPORTED_DEPARTMENTS,
  getDepartmentBadge,
  SUPPORTED_ACADEMIC_YEARS,
  normalizeAcademicYear
} from '../../constants/departments';

export const AdminStudentsPage: React.FC = () => {
  const { students, registrations, teams, hackathons, submissions, certificates, currentUser } = useAppStore();
  const { addToast } = useToast();

  const isHod = currentUser?.role === 'HOD' || currentUser?.adminData?.isHod === true;
  const facultyDept = currentUser?.adminData?.department;
  const authorizedYears = currentUser?.adminData?.authorizedYears;

  const normalizedAuthorizedYears = useMemo(() => {
    if (!authorizedYears || authorizedYears.length === 0) return null;
    return authorizedYears.map(normalizeAcademicYear).filter(Boolean);
  }, [authorizedYears]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedHackathonId, setSelectedHackathonId] = useState('ALL');
  const [selectedParticipationStatus, setSelectedParticipationStatus] = useState('ALL');
  const [selectedSubmissionStatus, setSelectedSubmissionStatus] = useState('ALL');

  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  // Student Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [provName, setProvName] = useState('');
  const [provRegNo, setProvRegNo] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provDept, setProvDept] = useState(facultyDept || SUPPORTED_DEPARTMENTS[0]);
  const [provYear, setProvYear] = useState<string>(SUPPORTED_ACADEMIC_YEARS[0]);
  const [provPhone, setProvPhone] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const departments = isHod ? SUPPORTED_DEPARTMENTS : (facultyDept ? [facultyDept] : SUPPORTED_DEPARTMENTS);
  const years = SUPPORTED_ACADEMIC_YEARS;

  // Restrict student dataset according to faculty department and authorized academic years
  const scopedStudents = useMemo(() => {
    if (isHod) return students;
    return students.filter((s) => {
      // Must match faculty department
      if (facultyDept && s.department !== facultyDept) return false;
      // If authorizedYears is configured, must match assigned academic years
      if (normalizedAuthorizedYears && normalizedAuthorizedYears.length > 0) {
        if (!s.year) return false;
        const normY = normalizeAcademicYear(s.year);
        if (!normY || !normalizedAuthorizedYears.includes(normY)) return false;
      }
      return true;
    });
  }, [students, isHod, facultyDept, normalizedAuthorizedYears]);

  // Enrich each student with participation statistics
  const enrichedStudents = useMemo(() => {
    const now = new Date();

    return scopedStudents.map((s) => {
      const studentRegs = registrations.filter((r) => r.studentId === s.uid);
      const studentTeams = teams.filter((t) => t.members.some((m) => m.studentId === s.uid));
      const studentTeamIds = new Set(studentTeams.map((t) => t.id));

      const studentSubmissions = submissions.filter(
        (sub) => studentTeamIds.has(sub.teamId) || sub.submittedBy === s.uid
      );

      const studentCerts = certificates.filter((c) => c.studentId === s.uid);

      // Hackathon instances
      const registeredHackathons = hackathons.filter((h) =>
        studentRegs.some((r) => r.hackathonId === h.id)
      );

      const activeHackathons = registeredHackathons.filter((h) => {
        const start = h.eventStart ? new Date(h.eventStart) : null;
        const end = h.eventEnd ? new Date(h.eventEnd) : null;
        const isTimeActive = (start && end) ? (now >= start && now <= end) : false;
        return isTimeActive || h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN';
      });

      const completedHackathons = registeredHackathons.filter((h) => {
        const end = h.eventEnd ? new Date(h.eventEnd) : null;
        const isPastEnd = end ? now > end : false;
        return isPastEnd || h.status === 'COMPLETED';
      });

      // Statuses
      const hasActiveParticipation = activeHackathons.length > 0;
      const isRegistered = studentRegs.length > 0;
      const hasSubmitted = studentSubmissions.some((sub) => sub.status === 'SUBMITTED' || sub.status === 'EVALUATED');
      const hasEvaluated = studentSubmissions.some((sub) => sub.status === 'EVALUATED' || sub.status === 'WINNER');

      return {
        student: s,
        studentRegs,
        registeredHackathons,
        activeHackathons,
        completedHackathons,
        teams: studentTeams,
        submissions: studentSubmissions,
        certificates: studentCerts,
        hasActiveParticipation,
        isRegistered,
        hasSubmitted,
        hasEvaluated
      };
    });
  }, [scopedStudents, registrations, teams, hackathons, submissions, certificates]);

  // Apply Section 8 Filters
  const filteredRecords = useMemo(() => {
    return enrichedStudents.filter(({ student: s, studentRegs, hasActiveParticipation, isRegistered, hasSubmitted, hasEvaluated }) => {
      // Dept filter
      if (selectedDept !== 'ALL' && s.department !== selectedDept) return false;

      // Year filter
      if (selectedYear !== 'ALL') {
        const normSelected = normalizeAcademicYear(selectedYear);
        const normStudent = normalizeAcademicYear(s.year);
        if (normSelected && normStudent) {
          if (normSelected !== normStudent) return false;
        } else if (s.year !== selectedYear) {
          return false;
        }
      }

      // Hackathon filter
      if (selectedHackathonId !== 'ALL') {
        const isInHackathon = studentRegs.some((r) => r.hackathonId === selectedHackathonId);
        if (!isInHackathon) return false;
      }

      // Participation Status filter
      if (selectedParticipationStatus === 'ACTIVE' && !hasActiveParticipation) return false;
      if (selectedParticipationStatus === 'REGISTERED' && !isRegistered) return false;
      if (selectedParticipationStatus === 'NOT_REGISTERED' && isRegistered) return false;

      // Submission Status filter
      if (selectedSubmissionStatus === 'SUBMITTED' && !hasSubmitted) return false;
      if (selectedSubmissionStatus === 'PENDING' && (!isRegistered || hasSubmitted)) return false;
      if (selectedSubmissionStatus === 'EVALUATED' && !hasEvaluated) return false;

      // Search query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const match =
          s.name.toLowerCase().includes(q) ||
          s.registerNumber.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    enrichedStudents,
    selectedDept,
    selectedYear,
    selectedHackathonId,
    selectedParticipationStatus,
    selectedSubmissionStatus,
    searchQuery
  ]);

  const handleExportCsv = () => {
    const headers = [
      'Student Name',
      'Register Number',
      'Department',
      'Year',
      'Email',
      'Registered Hackathons',
      'Active Participation',
      'Teams',
      'Submissions',
      'Completed Hackathons',
      'Achievements'
    ];

    const rows = filteredRecords.map(({ student: s, registeredHackathons, activeHackathons, teams: t, submissions: sub, completedHackathons, certificates: c }) => [
      `"${s.name}"`,
      s.registerNumber,
      `"${s.department}"`,
      s.year,
      s.email,
      registeredHackathons.length,
      activeHackathons.length > 0 ? 'Yes' : 'No',
      `"${t.map((team) => team.name).join('; ') || 'None'}"`,
      sub.length,
      completedHackathons.length,
      c.length
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kit-student-participation-monitoring-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    addToast('Student participation records exported as CSV.', 'success');
  };

  const handleProvisionStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    setProvisionError(null);

    try {
      const res = await adminService.provisionStudent({
        name: provName,
        registerNumber: provRegNo,
        email: provEmail,
        department: provDept,
        year: provYear,
        phone: provPhone
      });

      addToast(`Student ${res.registerNumber} provisioned successfully! Password setup email dispatched to ${res.email}.`, 'success');
      setIsProvisionModalOpen(false);
      setProvName('');
      setProvRegNo('');
      setProvEmail('');
      setProvPhone('');
    } catch (err: any) {
      setProvisionError(err.message || 'Failed to provision student account.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const totalRegisteredCount = enrichedStudents.filter((e) => e.isRegistered).length;
  const totalActiveCount = enrichedStudents.filter((e) => e.hasActiveParticipation).length;
  const totalSubmissionsCount = enrichedStudents.filter((e) => e.hasSubmitted).length;
  const totalAchievementsCount = certificates.length;

  return (
    <div className="space-y-6">
      {/* Unified PageHeader (Section 8: Student Participation) */}
      <PageHeader
        title="Student Participation"
        description="Monitor student participation across hackathons, track team squads, deliverables, deadlines, and academic achievements."
        category="CAMPUS PARTICIPATION MONITORING"
        badge={
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {filteredRecords.length} Monitored
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setProvisionError(null);
                setIsProvisionModalOpen(true);
              }}
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Provision Student
            </Button>
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Participation CSV
            </Button>
          </div>
        }
      />

      {/* 4 Top Participation Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Registered Students
          </span>
          <span className="text-2xl font-bold font-display text-navy-950 mt-1 block">
            {totalRegisteredCount}
          </span>
          <span className="text-[11px] text-blue-600 font-semibold">In ≥1 Hackathon Roster</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Active Participation
          </span>
          <span className="text-2xl font-bold font-display text-emerald-700 mt-1 block">
            {totalActiveCount}
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold">Currently competing</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Submitted Projects
          </span>
          <span className="text-2xl font-bold font-display text-purple-700 mt-1 block">
            {totalSubmissionsCount}
          </span>
          <span className="text-[11px] text-purple-600 font-semibold">Completed deliverables</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Achievements
          </span>
          <span className="text-2xl font-bold font-display text-amber-700 mt-1 block">
            {totalAchievementsCount}
          </span>
          <span className="text-[11px] text-amber-600 font-semibold">Issued certificates & awards</span>
        </div>
      </div>

      {/* Section 8 Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Participation Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, roll no, department..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Hackathon Filter */}
          <select
            value={selectedHackathonId}
            onChange={(e) => setSelectedHackathonId(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Hackathons</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>

          {/* Participation Status Filter */}
          <select
            value={selectedParticipationStatus}
            onChange={(e) => setSelectedParticipationStatus(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Participation</option>
            <option value="ACTIVE">Active in Hackathon</option>
            <option value="REGISTERED">Registered (Any)</option>
            <option value="NOT_REGISTERED">Not Registered</option>
          </select>
        </div>
      </div>

      {/* 10-Column Desktop Participation Table (Section 8) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 bg-slate-50">Student Name</th>
                <th className="py-3 px-4 bg-slate-50">Register No</th>
                <th className="py-3 px-4 bg-slate-50">Department</th>
                <th className="py-3 px-4 bg-slate-50">Year</th>
                <th className="py-3 px-4 bg-slate-50 text-center">Reg. Hackathons</th>
                <th className="py-3 px-4 bg-slate-50 text-center">Active</th>
                <th className="py-3 px-4 bg-slate-50">Teams</th>
                <th className="py-3 px-4 bg-slate-50 text-center">Submissions</th>
                <th className="py-3 px-4 bg-slate-50 text-center">Completed</th>
                <th className="py-3 px-4 bg-slate-50 text-center">Achievements</th>
                <th className="py-3 px-4 text-right bg-slate-50">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No student participation records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(({ student: s, registeredHackathons, activeHackathons, completedHackathons, teams: t, submissions: sub, certificates: c }) => (
                  <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-navy-950">
                      {s.name}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-700 text-[11px]">
                      {s.registerNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {(() => {
                        const badge = getDepartmentBadge(s.department);
                        if (!badge.isValid) {
                          return (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                              title={`Legacy/Unsupported department: ${s.department || 'None'}`}
                            >
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Requires Review</span>
                            </span>
                          );
                        }
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.colorClass}`}>
                            {badge.name}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {s.year}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {registeredHackathons.length}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {activeHackathons.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Yes ({activeHackathons.length})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 truncate max-w-[140px]" title={t.map((tm) => tm.name).join(', ')}>
                      {t.length > 0 ? t.map((tm) => tm.name).join(', ') : <span className="text-slate-400">Individual</span>}
                    </td>

                    <td className="py-3 px-4 text-center font-medium">
                      {sub.length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                          {sub.length}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-medium">
                      {completedHackathons.length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">
                          {completedHackathons.length}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {c.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-600" />
                          {c.length}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setViewStudent(s)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Student Modal */}
      {viewStudent && (
        <Modal
          isOpen={Boolean(viewStudent)}
          onClose={() => setViewStudent(null)}
          title="Student Participation Dossier"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <h3 className="text-base font-bold text-navy-950">{viewStudent.name}</h3>
                <p className="font-mono text-slate-600 mt-0.5">
                  Roll No: {viewStudent.registerNumber} • {viewStudent.year}
                </p>
                <p className="text-slate-500">{viewStudent.department}</p>
              </div>
              <div className="text-left sm:text-right space-y-1">
                <span className="text-slate-400 block">{viewStudent.email}</span>
                <span className="text-slate-400 block">{viewStudent.phone || 'Phone not provided'}</span>
              </div>
            </div>

            {/* Detailed Participation Tabs/List */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Registered Hackathons & Teams
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {registrations
                  .filter((r) => r.studentId === viewStudent.uid)
                  .map((reg) => {
                    const h = hackathons.find((hk) => hk.id === reg.hackathonId);
                    const t = teams.find((tm) => tm.id === reg.teamId);
                    const sub = submissions.find(
                      (sb) => sb.hackathonId === reg.hackathonId && (sb.teamId === t?.id || sb.submittedBy === viewStudent.uid)
                    );

                    return (
                      <div
                        key={reg.id}
                        className="p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{h?.title || 'Unknown Hackathon'}</span>
                          <span className="text-slate-500 text-[11px]">
                            Squad: <strong>{t?.name || 'Individual'}</strong> • Reg: {reg.registrationNumber}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 block mb-0.5">
                            {sub ? `Submitted (${sub.status})` : 'Submission Pending'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(reg.registeredAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button onClick={() => setViewStudent(null)} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Provision Student Modal */}
      <Modal
        isOpen={isProvisionModalOpen}
        onClose={() => !isProvisioning && setIsProvisionModalOpen(false)}
        title="Provision Student Account"
        maxWidth="md"
      >
        <form onSubmit={handleProvisionStudent} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Provision an authorized student account for college hackathon participation. The student will be assigned the <strong>STUDENT</strong> role and receive a secure password setup link.
          </p>

          {provisionError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{provisionError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Student Full Name"
              type="text"
              value={provName}
              onChange={(e) => setProvName(e.target.value)}
              placeholder="e.g. Sharvesh R"
              required
            />

            <Input
              label="Registration Number"
              type="text"
              value={provRegNo}
              onChange={(e) => setProvRegNo(e.target.value.toUpperCase())}
              placeholder="e.g. 717822P101"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Institutional Email"
              type="email"
              value={provEmail}
              onChange={(e) => setProvEmail(e.target.value)}
              placeholder="e.g. 717822p101@kitcbe.com"
              required
            />

            <Input
              label="Contact Phone (Optional)"
              type="tel"
              value={provPhone}
              onChange={(e) => setProvPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department {!isHod && <span className="text-[10px] text-slate-500 font-normal">(Locked to your department)</span>}
              </label>
              <select
                value={provDept}
                onChange={(e) => setProvDept(e.target.value)}
                disabled={!isHod}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-500"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year
              </label>
              <select
                value={provYear}
                onChange={(e) => setProvYear(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsProvisionModalOpen(false)}
              disabled={isProvisioning}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isProvisioning}
            >
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
