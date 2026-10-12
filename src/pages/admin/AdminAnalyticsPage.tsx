import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../lib/store';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  BarChart3,
  Download,
  Users,
  CheckCircle2,
  FolderGit2,
  Percent,
  Trophy,
  Award,
  Layers,
  GraduationCap,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { SUPPORTED_DEPARTMENTS } from '../../constants/departments';
import { downloadExcelWorkbook, resolveHackathonReference } from '../../utils/excelExport.mjs';

export const AdminAnalyticsPage: React.FC = () => {
  const { hackathons, registrations, teams, submissions, students, certificates } = useAppStore();
  const { addToast } = useToast();

  const [selectedHackathon, setSelectedHackathon] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const studentById = useMemo(() => new Map(students.map((student) => [student.uid, student])), [students]);
  const filteredHackathons = useMemo(() => hackathons.filter((hackathon) => {
    if (selectedHackathon !== 'ALL' && hackathon.id !== selectedHackathon) return false;
    if (selectedDept !== 'ALL' && hackathon.department && hackathon.department !== 'ALL' && hackathon.department !== selectedDept) return false;
    return true;
  }), [hackathons, selectedHackathon, selectedDept]);

  // Apply the same hackathon and department scope to dashboard counts and exports.
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      if (selectedHackathon !== 'ALL' && r.hackathonId !== selectedHackathon) return false;
      if (selectedDept !== 'ALL' && studentById.get(r.studentId)?.department !== selectedDept) return false;
      return true;
    });
  }, [registrations, selectedHackathon, selectedDept, studentById]);

  // Real Metrics (Section 12)
  const hackathonsPosted = filteredHackathons.length;
  const totalRegistrations = filteredRegistrations.length;

  const activeParticipants = useMemo(() => {
    return new Set(filteredRegistrations.map((r) => r.studentId)).size;
  }, [filteredRegistrations]);

  const relevantTeams = useMemo(() => teams.filter((team) => {
    if (selectedHackathon !== 'ALL' && team.hackathonId !== selectedHackathon) return false;
    if (selectedDept !== 'ALL' && team.department !== selectedDept && !team.members.some((member) => studentById.get(member.studentId)?.department === selectedDept)) return false;
    return true;
  }), [teams, selectedHackathon, selectedDept, studentById]);
  const activeTeams = relevantTeams.length;

  const relevantSubmissions = useMemo(() => {
    const relevantTeamIds = new Set(relevantTeams.map((team) => team.id));
    return submissions.filter((submission) => {
      if (selectedHackathon !== 'ALL' && submission.hackathonId !== selectedHackathon) return false;
      if (selectedDept !== 'ALL' && submission.department !== selectedDept && !relevantTeamIds.has(submission.teamId)) return false;
      return true;
    });
  }, [submissions, selectedHackathon, selectedDept, relevantTeams]);

  const submittedProjects = relevantSubmissions.filter((s) => !s.isDraft || s.status === 'SUBMITTED').length;
  const submissionRate = activeTeams > 0 ? Math.round((submittedProjects / activeTeams) * 100) : 0;

  const evaluatedCount = relevantSubmissions.filter((s) => s.status === 'EVALUATED' || s.evaluationScore).length;
  const completionRate = submittedProjects > 0 ? Math.round((evaluatedCount / submittedProjects) * 100) : 0;

  const shortlistedCount = relevantSubmissions.filter((s) => s.status === 'SHORTLISTED').length;
  const winnersCount = relevantSubmissions.filter((s) => s.status === 'WINNER').length;
  const certificatesCount = certificates.filter((certificate) => {
    if (selectedHackathon !== 'ALL' && certificate.hackathonId !== selectedHackathon) return false;
    if (selectedDept !== 'ALL' && studentById.get(certificate.studentId)?.department !== selectedDept) return false;
    return true;
  }).length;

  // Real Department Participation
  const departmentParticipation = useMemo(() => {
    const studentMap = new Map(students.map((s) => [s.uid, s]));
    const counts: Record<string, number> = {};

    filteredRegistrations.forEach((r) => {
      const st = studentMap.get(r.studentId);
      const dept = st?.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });

    return Object.entries(counts).map(([department, count]) => ({
      department: department.replace(' Engineering', '').replace(' & ', '/'),
      count
    }));
  }, [filteredRegistrations, students]);

  // Real Year-wise Participation
  const yearWiseParticipation = useMemo(() => {
    const studentMap = new Map(students.map((s) => [s.uid, s]));
    const counts: Record<string, number> = {
      '1st Year': 0,
      '2nd Year': 0,
      '3rd Year': 0,
      '4th Year': 0
    };

    filteredRegistrations.forEach((r) => {
      const st = studentMap.get(r.studentId);
      if (st?.year) {
        if (counts[st.year] !== undefined) {
          counts[st.year] += 1;
        } else {
          counts[st.year] = 1;
        }
      }
    });

    return Object.entries(counts).map(([year, count]) => ({
      year,
      count
    }));
  }, [filteredRegistrations, students]);

  // Real 14-day registration trend
  const registrationActivity14Days = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const count = registrations.filter((r) => {
        const t = r.registeredAt ? new Date(r.registeredAt).getTime() : 0;
        return t >= dayStart && t < dayEnd;
      }).length;

      days.push({
        date: dateStr,
        registrations: count
      });
    }
    return days;
  }, [registrations]);

  const hasData = registrations.length > 0 || hackathons.length > 0;

  const handleExportExcel = () => {
    const rows = filteredHackathons.map((hackathon) => {
      const reference = resolveHackathonReference(hackathon.id, hackathons);
      const hackathonRegistrations = filteredRegistrations.filter((registration) => registration.hackathonId === hackathon.id);
      const hackathonTeams = relevantTeams.filter((team) => team.hackathonId === hackathon.id);
      const teamIds = new Set(hackathonTeams.map((team) => team.id));
      const hackathonSubmissions = relevantSubmissions.filter((submission) => submission.hackathonId === hackathon.id && (selectedDept === 'ALL' || submission.department === selectedDept || teamIds.has(submission.teamId)));
      const submitted = hackathonSubmissions.filter((submission) => !submission.isDraft || submission.status === 'SUBMITTED');
      const evaluated = hackathonSubmissions.filter((submission) => submission.status === 'EVALUATED' || Boolean(submission.evaluationScore));
      const hackathonCertificates = certificates.filter((certificate) => certificate.hackathonId === hackathon.id && (selectedDept === 'ALL' || studentById.get(certificate.studentId)?.department === selectedDept));
      return {
        hackathonName: reference.name,
        hackathonId: reference.id,
        hackathonReferenceStatus: reference.status,
        registrations: hackathonRegistrations.length,
        activeParticipants: new Set(hackathonRegistrations.map((registration) => registration.studentId)).size,
        teamsFormed: hackathonTeams.length,
        submittedProjects: submitted.length,
        submissionRate: hackathonTeams.length ? `${Math.round((submitted.length / hackathonTeams.length) * 100)}%` : '0%',
        evaluatedProjects: evaluated.length,
        completionRate: submitted.length ? `${Math.round((evaluated.length / submitted.length) * 100)}%` : '0%',
        shortlisted: hackathonSubmissions.filter((submission) => submission.status === 'SHORTLISTED').length,
        winners: hackathonSubmissions.filter((submission) => submission.status === 'WINNER').length,
        certificates: hackathonCertificates.length
      };
    });
    downloadExcelWorkbook({
      sheetName: 'Hackathon Analytics',
      title: 'Hackathon analytics by event',
      fileName: `hackhub-analytics-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Hackathon Name', key: 'hackathonName' },
        { header: 'Hackathon ID', key: 'hackathonId' },
        { header: 'Hackathon Reference Status', key: 'hackathonReferenceStatus' },
        { header: 'Registrations', key: 'registrations' },
        { header: 'Active Participants', key: 'activeParticipants' },
        { header: 'Teams Formed', key: 'teamsFormed' },
        { header: 'Submitted Projects', key: 'submittedProjects' },
        { header: 'Submission Rate', key: 'submissionRate' },
        { header: 'Evaluated Projects', key: 'evaluatedProjects' },
        { header: 'Completion Rate', key: 'completionRate' },
        { header: 'Shortlisted', key: 'shortlisted' },
        { header: 'Winners', key: 'winners' },
        { header: 'Certificates Issued', key: 'certificates' }
      ],
      rows
    });
    addToast('Participation analytics exported as Excel.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* PageHeader (Section 12: Hackathon Participation Analytics) */}
      <PageHeader
        title="Hackathon Participation Analytics"
        description="Comprehensive analytics on posted hackathons, student participation rates, interdisciplinary squads, submission velocity, and institutional achievements."
        category="COLLEGE TELEMETRY & REPORTING"
        badge={
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            Real Telemetry
          </span>
        }
        actions={
          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Analytics Excel
          </Button>
        }
      />

      {!hasData ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-subtle">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-navy-950 mb-1">Not enough participation data yet.</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Institutional metrics and performance charts will populate automatically as students register for hackathons and form squads.
          </p>
          <Button
            onClick={() => window.location.assign('/admin/hackathons')}
            variant="primary"
            size="sm"
          >
            Post Hackathon
          </Button>
        </div>
      ) : (
        <>
          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-navy-950">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Scope analytics by hackathon and department:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedHackathon}
                onChange={(e) => setSelectedHackathon(e.target.value)}
                className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">All Posted Hackathons ({hackathons.length})</option>
                {hackathons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title}
                  </option>
                ))}
              </select>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                aria-label="Filter analytics by department"
              >
                <option value="ALL">All authorized departments</option>
                {SUPPORTED_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 12 KPI Summary Cards (Real Data Only) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Hackathons Posted */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Hackathons Posted
              </span>
              <span className="text-2xl font-bold font-display text-navy-950 mt-1 block">
                {hackathonsPosted}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">Active campus challenges</span>
            </div>

            {/* Registrations */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Registrations
              </span>
              <span className="text-2xl font-bold font-display text-navy-950 mt-1 block">
                {totalRegistrations}
              </span>
              <span className="text-[10px] text-slate-500">Student signups</span>
            </div>

            {/* Active Participants */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Participants
              </span>
              <span className="text-2xl font-bold font-display text-emerald-700 mt-1 block">
                {activeParticipants}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Unique students</span>
            </div>

            {/* Teams */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Teams
              </span>
              <span className="text-2xl font-bold font-display text-navy-950 mt-1 block">
                {activeTeams}
              </span>
              <span className="text-[10px] text-slate-500">Formed squads</span>
            </div>

            {/* Submission Rate */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Submission Rate
              </span>
              <span className="text-2xl font-bold font-display text-indigo-700 mt-1 block">
                {submissionRate}%
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold">{submittedProjects} project drafts</span>
            </div>

            {/* Completion Rate */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Completion Rate
              </span>
              <span className="text-2xl font-bold font-display text-purple-700 mt-1 block">
                {completionRate}%
              </span>
              <span className="text-[10px] text-purple-600 font-semibold">{evaluatedCount} jury scored</span>
            </div>
          </div>

          {/* Secondary KPI Row: Shortlisted, Winners, Certificates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Shortlisted Students
                </span>
                <span className="text-xl font-bold font-display text-emerald-700 mt-0.5 block">
                  {shortlistedCount}
                </span>
                <span className="text-[10px] text-slate-500">Advanced to jury defense</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Winners Recorded
                </span>
                <span className="text-xl font-bold font-display text-amber-700 mt-0.5 block">
                  {winnersCount}
                </span>
                <span className="text-[10px] text-slate-500">Podium finishers</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Certificates Issued
                </span>
                <span className="text-xl font-bold font-display text-purple-700 mt-0.5 block">
                  {certificatesCount}
                </span>
                <span className="text-[10px] text-slate-500">Institutional credentials</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Department Participation */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-navy-950 font-display">Department Participation</h3>
                  <p className="text-xs text-slate-500">Student enrollment distribution across engineering disciplines.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {departmentParticipation.length} Branches
                </span>
              </div>

              {departmentParticipation.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                  Not enough participation data yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentParticipation}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="department" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Year-wise Participation */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-navy-950 font-display">Year-wise Participation</h3>
                  <p className="text-xs text-slate-500">Participation breakdown across academic batches.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  All Cohorts
                </span>
              </div>

              {yearWiseParticipation.every((y) => y.count === 0) ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                  Not enough participation data yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearWiseParticipation}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="year" stroke="#64748B" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 3: 14-Day Registration Velocity */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-navy-950 font-display">Registration Activity Velocity</h3>
                  <p className="text-xs text-slate-500">Daily student signup trajectory across the past 14 days.</p>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  14-Day Window
                </span>
              </div>

              {registrationActivity14Days.every((d) => d.registrations === 0) ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                  Not enough participation data yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={registrationActivity14Days}>
                      <defs>
                        <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="registrations"
                        stroke="#1e3a8a"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#regGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
