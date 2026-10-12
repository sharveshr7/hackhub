import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { isPlatformAdministrator } from '../../utils/access';
import {
  Users,
  CalendarDays,
  ShieldCheck,
  Clock,
  Plus,
  Megaphone,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  FileText,
  TrendingUp,
  QrCode,
  Radio,
  Building2,
  ShieldAlert,
  Award,
  Filter
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { SUPPORTED_DEPARTMENTS, isSupportedDepartment, getDepartmentBadge } from '../../constants/departments';

export const AdminDashboardPage: React.FC = () => {
  const { currentUser, hackathons, registrations, teams, submissions, students, admins } = useAppStore();
  
  const platformAdministrator = isPlatformAdministrator(currentUser);
  const facultyDept = platformAdministrator ? undefined : currentUser?.adminData?.department;
  const isDeptApprover = Boolean(currentUser?.adminData?.isDepartmentApprover);

  const scopedHackathons = useMemo(() => {
    return platformAdministrator ? hackathons : hackathons.filter((h) => h.department === facultyDept);
  }, [hackathons, facultyDept, platformAdministrator]);

  const scopedRegistrations = useMemo(() => {
    return platformAdministrator ? registrations : registrations.filter((r) => r.department === facultyDept);
  }, [registrations, facultyDept, platformAdministrator]);

  const scopedTeams = useMemo(() => {
    return platformAdministrator ? teams : teams.filter((t) => t.department === facultyDept);
  }, [teams, facultyDept, platformAdministrator]);

  const scopedSubmissions = useMemo(() => {
    return platformAdministrator ? submissions : submissions.filter((s) => s.department === facultyDept);
  }, [submissions, facultyDept, platformAdministrator]);

  const scopedStudents = useMemo(() => {
    return platformAdministrator ? students : students.filter((s) => s.department === facultyDept);
  }, [students, facultyDept, platformAdministrator]);

  const pendingFacultyCount = admins.filter((a) => {
    if (a.approvalStatus !== 'PENDING') return false;
    if (isDeptApprover) return a.department === facultyDept;
    return false;
  }).length;

  const publishedHackathonsCount = scopedHackathons.filter((h) => h.status !== 'DRAFT').length;
  const activeHackathonsCount = scopedHackathons.filter(
    (h) => h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN' || h.status === 'PUBLISHED'
  ).length;

  const totalParticipantsCount = new Set(scopedRegistrations.map((r) => r.studentId)).size;
  const totalRegistrationsCount = scopedRegistrations.length;
  const activeTeamsCount = scopedTeams.length;
  const pendingSubmissionsCount = scopedSubmissions.filter((s) => s.isDraft).length + Math.max(0, scopedTeams.length - scopedSubmissions.filter((s) => !s.isDraft).length);
  const completedAchievementsCount = scopedSubmissions.filter(
    (s) => s.status === 'EVALUATED' || s.status === 'SHORTLISTED' || Boolean(s.rank)
  ).length;

  const activeEvent = scopedHackathons.find((h) => h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN') || scopedHackathons[0];

  // Dynamic Participation Monitoring metrics per hackathon
  const participationMonitoringData = useMemo(() => {
    return scopedHackathons.map((h) => {
      const regList = scopedRegistrations.filter((r) => r.hackathonId === h.id);
      const teamList = scopedTeams.filter((t) => t.hackathonId === h.id);
      const subList = scopedSubmissions.filter((s) => s.hackathonId === h.id && !s.isDraft);
      const pendingSub = Math.max(0, teamList.length - subList.length);
      const completionRate = teamList.length > 0 ? Math.round((subList.length / teamList.length) * 100) : 0;
      const activeParticipants = new Set(regList.map((r) => r.studentId)).size;

      return {
        hackathon: h,
        studentsRegistered: regList.length,
        teamsCount: teamList.length,
        activeParticipants,
        submissionsCount: subList.length,
        pendingSubmissions: pendingSub,
        completionRate,
        status: h.status
      };
    });
  }, [scopedHackathons, scopedRegistrations, scopedTeams, scopedSubmissions]);

  // Dynamic 14-day registration and team velocity
  const registrationActivity14Days = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const regsOnDay = scopedRegistrations.filter((r) => {
        const t = r.registeredAt ? new Date(r.registeredAt).getTime() : 0;
        return t >= dayStart && t < dayEnd;
      }).length;

      const teamsOnDay = scopedTeams.filter((tm) => {
        const t = tm.createdAt ? new Date(tm.createdAt).getTime() : 0;
        return t >= dayStart && t < dayEnd;
      }).length;

      days.push({
        date: dateStr,
        registrations: regsOnDay,
        teamsFormed: teamsOnDay
      });
    }
    return days;
  }, [scopedRegistrations, scopedTeams]);

  // Dynamic upcoming milestones from Firestore hackathons
  const upcomingDeadlines = useMemo(() => {
    const list: Array<{ id: string; hackathonTitle: string; eventType: string; date: string; tag: string; tagColor: string }> = [];
    scopedHackathons.forEach((h) => {
      if (h.registrationDeadline) {
        list.push({
          id: `${h.id}-reg`,
          hackathonTitle: h.title,
          eventType: 'Registration Deadline',
          date: new Date(h.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          tag: 'Registration',
          tagColor: 'amber'
        });
      }
      if (h.submissionDeadline) {
        list.push({
          id: `${h.id}-sub`,
          hackathonTitle: h.title,
          eventType: 'Project Submission Deadline',
          date: new Date(h.submissionDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          tag: 'Submission',
          tagColor: 'emerald'
        });
      }
      if (h.eventStart) {
        list.push({
          id: `${h.id}-start`,
          hackathonTitle: h.title,
          eventType: 'Event Kickoff',
          date: new Date(h.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          tag: 'Event',
          tagColor: 'blue'
        });
      }
    });
    return list.slice(0, 4);
  }, [scopedHackathons]);

  // Dynamic recent activity
  const recentActivities = useMemo(() => {
    const list: Array<{ id: string; type: string; description: string; timeAgo: string; badge: string }> = [];
    scopedSubmissions.slice(-3).forEach((sub) => {
      list.push({
        id: `sub-${sub.id}`,
        type: 'submission',
        description: `Team "${sub.teamName}" updated project submission "${sub.projectTitle}"`,
        timeAgo: 'Recent',
        badge: sub.status
      });
    });
    scopedTeams.slice(-3).forEach((tm) => {
      list.push({
        id: `team-${tm.id}`,
        type: 'team',
        description: `Squad "${tm.name}" formed with ${tm.members.length} members`,
        timeAgo: 'Recent',
        badge: 'TEAM'
      });
    });
    scopedRegistrations.slice(-4).forEach((reg) => {
      list.push({
        id: `reg-${reg.id}`,
        type: 'attendance',
        description: `Student registered for collegiate challenge`,
        timeAgo: 'Recent',
        badge: reg.status
      });
    });
    return list.slice(0, 5);
  }, [scopedSubmissions, scopedTeams, scopedRegistrations]);

  // Dynamic department participation breakdown (strictly Biotechnology & Biomedical Engineering)
  const departmentParticipation = useMemo(() => {
    const counts: Record<string, number> = {};
    SUPPORTED_DEPARTMENTS.forEach((dept) => {
      counts[dept] = 0;
    });

    const studentMap = new Map(scopedStudents.map((s) => [s.uid, s]));
    scopedRegistrations.forEach((r) => {
      const s = studentMap.get(r.studentId);
      const rawDept = r.department || s?.department || 'Unassigned';
      if (counts[rawDept] !== undefined) {
        counts[rawDept] += 1;
      } else {
        counts[rawDept] = (counts[rawDept] || 0) + 1;
      }
    });
    const total = scopedRegistrations.length || 1;
    return Object.entries(counts).map(([department, count]) => ({
      department,
      count,
      percentage: Math.round((count / total) * 100),
      isSupported: isSupportedDepartment(department)
    }));
  }, [scopedRegistrations, scopedStudents]);

  // Dynamic submission status summary
  const submissionStatusSummary = useMemo(() => {
    const submitted = scopedSubmissions.filter((s) => !s.isDraft && s.status !== 'EVALUATED').length;
    const evaluated = scopedSubmissions.filter((s) => s.status === 'EVALUATED').length;
    const drafts = scopedSubmissions.filter((s) => s.isDraft).length;
    return [
      { status: 'Submitted', count: submitted, color: '#10B981' },
      { status: 'Evaluated', count: evaluated, color: '#3B82F6' },
      { status: 'Drafts', count: drafts, color: '#F59E0B' }
    ];
  }, [scopedSubmissions]);

  return (
    <div className="space-y-6">
      {/* SECTION 4 & 5: HEADER & PRIMARY ACTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="font-bold">KalaignarKarunanidhi Institute Of Technology</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">Faculty & Coordinator Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-navy-950 tracking-tight">
            Hackathon Management & Participation Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized collegiate portal to post hackathons, monitor student registrations, track squads, manage deadlines, and evaluate project deliverables.
          </p>
        </div>

        {/* Section 5 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/admin/hackathons/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Hackathon</span>
          </Link>
          <Link
            to="/admin/attendance"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
          >
            <QrCode className="w-4 h-4 text-slate-500" />
            <span>Attendance Desk</span>
          </Link>
        </div>
      </div>

      {/* DEPARTMENT ACCESS CONTROL & GOVERNANCE SCOPE BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Authorized Scope: {platformAdministrator ? 'Platform-wide' : facultyDept || 'Department Incomplete'}
              </span>
              {isDeptApprover && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Award className="w-3 h-3 text-indigo-600" />
                  Department Approver
                </span>
              )}
              {facultyDept && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getDepartmentBadge(facultyDept).className}`}>
                  {facultyDept}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {platformAdministrator
                ? 'Platform-wide reporting uses all current Firebase records.'
                : `Private student records, squads, and registrations are scoped to ${facultyDept || 'your authorized department'}.`}
            </p>
          </div>
        </div>
      </div>

      {/* PENDING FACULTY REGISTRATIONS ALERT BANNER */}
      {pendingFacultyCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                {pendingFacultyCount} Faculty Coordinator {pendingFacultyCount === 1 ? 'Registration' : 'Registrations'} Pending Verification
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                New faculty accounts have registered and are awaiting institutional administrator authorization.
              </p>
            </div>
          </div>
          <Link
            to="/admin/faculty-approvals"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-xs transition-colors"
          >
            <span>Review Applications</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* SECTION 4: TOP 6 SUMMARY CARDS (Real Firebase Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Published Hackathons */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Published
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {publishedHackathonsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {activeHackathonsCount} active / upcoming
            </p>
          </div>
          <Link
            to="/admin/hackathons"
            className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>View Hackathons</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 2: Total Participants */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Participants
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {totalParticipantsCount}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 truncate">
              Across tracked events
            </p>
          </div>
          <Link
            to="/admin/students"
            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>View Students</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 3: Total Registrations */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Registrations
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {totalRegistrationsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Total enrollments
            </p>
          </div>
          <Link
            to="/admin/registrations"
            className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>View Registrations</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 4: Active Teams */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Teams
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {activeTeamsCount}
            </div>
            <p className="text-[11px] text-cyan-700 font-semibold mt-0.5 truncate">
              Formed student squads
            </p>
          </div>
          <Link
            to="/admin/teams"
            className="text-[11px] text-cyan-700 hover:text-cyan-800 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>View Teams</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 5: Pending Submissions */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Submissions
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-700 font-display">
              {pendingSubmissionsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Incomplete deliverables
            </p>
          </div>
          <Link
            to="/admin/submissions"
            className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>View Submissions</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 6: Completed / Achievements */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Achievements
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {completedAchievementsCount}
            </div>
            <p className="text-[11px] text-purple-600 font-semibold mt-0.5 truncate">
              Evaluated & winners
            </p>
          </div>
          <Link
            to="/admin/submissions"
            className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>View Results</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* SECTION 7: PARTICIPATION MONITORING TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-navy-950 font-display">
              Participation Monitoring
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time monitoring of registrations, squad formations, deliverables, and completion rates by hackathon.
            </p>
          </div>
          <Link
            to="/admin/hackathons"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 shrink-0"
          >
            <span>Manage All Hackathons</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {participationMonitoringData.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No hackathons posted yet. Click "Post New Hackathon" to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Hackathon</th>
                  <th className="py-3 px-3 text-center">Students Registered</th>
                  <th className="py-3 px-3 text-center">Teams</th>
                  <th className="py-3 px-3 text-center">Active Participants</th>
                  <th className="py-3 px-3 text-center">Submissions</th>
                  <th className="py-3 px-3 text-center">Pending</th>
                  <th className="py-3 px-3 text-center">Completion Rate</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participationMonitoringData.map((item) => (
                  <tr key={item.hackathon.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-bold text-navy-950 block">{item.hackathon.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.hackathon.organizer} • {item.hackathon.mode.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {item.studentsRegistered}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {item.teamsCount}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-blue-700">
                      {item.activeParticipants}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {item.submissionsCount}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-amber-700">
                      {item.pendingSubmissions}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{item.completionRate}%</span>
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${item.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/admin/hackathons/${item.hackathon.id}`}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                          title="Monitor Details"
                        >
                          Monitor
                        </Link>
                        <Link
                          to={`/admin/registrations?hackathonId=${item.hackathon.id}`}
                          className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px]"
                          title="View Registrations"
                        >
                          Roster
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Area: Two-Column Operational Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Registration Activity Chart (last 14 days) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-navy-950">Registration Activity</h2>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Last 14 Days
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily student sign-ups and team formation velocity across departments.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-slate-600 font-medium">Registrations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-slate-600 font-medium">Teams Formed</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={registrationActivity14Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="teamGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  name="Registrations"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#regGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="teamsFormed"
                  name="Teams Formed"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#teamGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Enrolled: <strong>{totalRegistrationsCount} students</strong></span>
            <Link to="/admin/analytics" className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1">
              <span>View In-depth Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-navy-950">Upcoming Deadlines</h2>
              <span className="text-[11px] font-semibold text-slate-500">Critical Milestones</span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No upcoming deadlines scheduled.
              </div>
            ) : (
              <div className="space-y-3.5">
                {upcomingDeadlines.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-navy-950 truncate">{item.hackathonTitle}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          item.tagColor === 'amber'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : item.tagColor === 'blue'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : item.tagColor === 'emerald'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{item.eventType}</span>
                      <span className="font-semibold text-slate-700">{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to="/admin/hackathons"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 w-full justify-center"
            >
              <span>Manage All Hackathons</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Below Section: Recent Operational Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-navy-950">Recent Activity</h2>
            <p className="text-xs text-slate-500">Real-time audit log of collegiate portal interactions.</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Live feed</span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    {act.type === 'team' && <Users className="w-4 h-4 text-blue-600" />}
                    {act.type === 'submission' && <FileText className="w-4 h-4 text-emerald-600" />}
                    {act.type === 'milestone' && <TrendingUp className="w-4 h-4 text-amber-600" />}
                    {act.type === 'announcement' && <Megaphone className="w-4 h-4 text-indigo-600" />}
                    {act.type === 'attendance' && <CheckCircle2 className="w-4 h-4 text-cyan-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{act.description}</p>
                    <span className="text-[10px] text-slate-400">{act.timeAgo}</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0 uppercase tracking-wider">
                  {act.badge}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-Column Bottom Grid: Department Participation & Submission Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Participation */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-navy-950">Department Participation</h2>
              <p className="text-xs text-slate-500">Student enrollment distribution across engineering faculties.</p>
            </div>
            <Link to="/admin/analytics" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Details
            </Link>
          </div>

          {departmentParticipation.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No department registration data yet.
            </div>
          ) : (
            <div className="space-y-3">
              {departmentParticipation.map((dept) => (
                <div key={dept.department} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      {dept.department}
                      {!dept.isSupported && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Unsupported
                        </span>
                      )}
                    </span>
                    <span className="text-slate-500">
                      <strong>{dept.count}</strong> ({dept.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-navy-950">Submission Status</h2>
              <p className="text-xs text-slate-500">Live milestone progress of student project artifacts.</p>
            </div>
            <Link to="/admin/submissions" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Manage
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {submissionStatusSummary.map((st) => (
              <div key={st.status} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                  <span className="text-[11px] font-semibold text-slate-600 truncate">{st.status}</span>
                </div>
                <span className="text-xl font-bold font-display text-navy-950">{st.count}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Projects</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
