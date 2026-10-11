import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { studentService } from '../../services/studentService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { DeadlineCard } from '../../components/common/DeadlineCard';
import { useToast } from '../../components/common/Toast';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  QrCode,
  FileCheck2,
  Megaphone,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Trophy,
  Compass,
  Bell,
  Award,
  ExternalLink,
  Code2,
  Cpu,
  Layers,
  CircleDashed,
  Timer,
  Building2
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { currentUser, hackathons, registrations, teams, submissions, announcements, notifications, certificates } = useAppStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const student = currentUser?.studentData;
  const studentName = student?.name || 'Student';

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  const myRegistrations = registrations.filter((r) => r.studentId === student?.uid);
  const myCertificates = certificates.filter((c) => c.studentId === student?.uid || c.registerNumber === student?.registerNumber);

  // Active hackathon: find one the student is registered for, or live/open hackathon
  const activeHackathon =
    hackathons.find((h) => myRegistrations.some((r) => r.hackathonId === h.id && (h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN' || h.status === 'PUBLISHED'))) ||
    hackathons.find((h) => myRegistrations.some((r) => r.hackathonId === h.id)) ||
    hackathons.find((h) => h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN' || h.status === 'PUBLISHED') ||
    hackathons.find((h) => h.status !== 'DRAFT') ||
    null;

  // Active student registration
  const activeRegistration = activeHackathon
    ? registrations.find((r) => r.studentId === student?.uid && r.hackathonId === activeHackathon.id)
    : undefined;

  // Team
  const studentTeam = activeHackathon
    ? teams.find((t) => t.hackathonId === activeHackathon.id && t.members?.some((m) => m.studentId === student?.uid))
    : undefined;

  // Submission
  const teamSubmission = activeHackathon && studentTeam
    ? submissions.find((s) => s.hackathonId === activeHackathon.id && s.teamId === studentTeam.id)
    : undefined;

  // Attendance check
  const isAttended = Boolean(activeRegistration?.attendedAt || activeRegistration?.status === 'ATTENDED');

  // Countdown calculations for hero
  const targetDateStr = activeHackathon?.eventStart || activeHackathon?.submissionDeadline;
  const diff = targetDateStr ? new Date(targetDateStr).getTime() - Date.now() : 0;
  const daysLeft = diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
  const hoursLeft = diff > 0 ? Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) : 0;
  const minutesLeft = diff > 0 ? Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)) : 0;

  // Attendance Modal state
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceCode, setAttendanceCode] = useState('');
  const [isVerifyingAttendance, setIsVerifyingAttendance] = useState(false);

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHackathon || !student) return;

    setIsVerifyingAttendance(true);
    try {
      const res = await studentService.markAttendance(activeHackathon.id, student.uid, attendanceCode);
      if (res.success) {
        confetti({ particleCount: 70, spread: 60 });
        addToast('Attendance successfully confirmed at venue!', 'success');
        setIsAttendanceModalOpen(false);
        setAttendanceCode('');
      } else {
        addToast(res.message, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsVerifyingAttendance(false);
    }
  };

  // Section 14: My Hackathon Participation detailed calculation
  const studentParticipations = React.useMemo(() => {
    return myRegistrations.map((reg) => {
      const hackathon = hackathons.find((h) => h.id === reg.hackathonId);
      const team = teams.find((t) => t.hackathonId === reg.hackathonId && t.members?.some((m) => m.studentId === student?.uid));
      const submission = hackathon && team ? submissions.find((s) => s.hackathonId === hackathon.id && s.teamId === team.id) : undefined;
      
      let participationStatus = 'Registered';
      let progressPercent = 25;
      if (reg.status === 'COMPLETED' || hackathon?.status === 'COMPLETED') {
        participationStatus = 'Completed';
        progressPercent = 100;
      } else if (submission && !submission.isDraft) {
        participationStatus = 'Submitted';
        progressPercent = 90;
      } else if (submission?.isDraft) {
        participationStatus = 'Submission Pending';
        progressPercent = 75;
      } else if (team) {
        participationStatus = 'In Progress';
        progressPercent = 50;
      }

      const submissionStatus = submission ? (submission.isDraft ? 'Draft' : submission.status || 'Submitted') : 'Pending';

      let deadlineText = 'No deadline';
      let deadlineUrgent = false;
      if (hackathon?.submissionDeadline) {
        const diffMs = new Date(hackathon.submissionDeadline).getTime() - Date.now();
        if (diffMs < 0) {
          deadlineText = 'Concluded';
        } else if (diffMs < 24 * 60 * 60 * 1000) {
          deadlineText = 'Due today';
          deadlineUrgent = true;
        } else if (diffMs < 48 * 60 * 60 * 1000) {
          deadlineText = 'Due tomorrow';
          deadlineUrgent = true;
        } else {
          const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
          deadlineText = `${days} days remaining`;
        }
      }

      return {
        reg,
        hackathon,
        team,
        submission,
        participationStatus,
        submissionStatus,
        progressPercent,
        deadlineText,
        deadlineUrgent
      };
    });
  }, [myRegistrations, hackathons, teams, submissions, student]);

  // Section 20: Upcoming Deadlines monitoring system
  const trackedDeadlines = React.useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      hackathonTitle: string;
      dateStr: string;
      formattedDate: string;
      urgencyLabel: string;
      isUrgent: boolean;
      hackathonId: string;
    }> = [];

    hackathons.forEach((h) => {
      const addDeadline = (type: string, dateString?: string) => {
        if (!dateString) return;
        const diff = new Date(dateString).getTime() - Date.now();
        if (diff < -24 * 60 * 60 * 1000) return;
        let urgencyLabel = '';
        let isUrgent = false;
        if (diff < 0) {
          urgencyLabel = 'Concluded';
        } else if (diff < 24 * 60 * 60 * 1000) {
          urgencyLabel = 'Due today';
          isUrgent = true;
        } else if (diff < 48 * 60 * 60 * 1000) {
          urgencyLabel = 'Due tomorrow';
          isUrgent = true;
        } else {
          const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
          urgencyLabel = `${days} days left`;
        }

        list.push({
          id: `${h.id}-${type}`,
          title: type,
          hackathonTitle: h.title,
          dateStr: dateString,
          formattedDate: new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          urgencyLabel,
          isUrgent,
          hackathonId: h.id
        });
      };

      if (h.registrationDeadline) addDeadline('Registration Deadline', h.registrationDeadline);
      if (h.eventStart) {
        const teamDeadline = new Date(new Date(h.eventStart).getTime() - 12 * 60 * 60 * 1000).toISOString();
        addDeadline('Team Formation Deadline', teamDeadline);
        addDeadline('Event Date', h.eventStart);
      }
      if (h.submissionDeadline) addDeadline('Submission Deadline', h.submissionDeadline);
      if (h.eventEnd) addDeadline('Result Announcement', h.eventEnd);
    });

    return list.sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()).slice(0, 5);
  }, [hackathons]);

  // Section 13 Top Cards Data
  const registeredHackathonsCount = myRegistrations.length;
  const activeParticipationCount = hackathons.filter(
    (h) => myRegistrations.some((r) => r.hackathonId === h.id) &&
           (h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN' || h.status === 'PUBLISHED')
  ).length;
  const nearestDeadlineLabel = trackedDeadlines[0]?.urgencyLabel || 'No deadlines';
  const myTeamsCount = teams.filter((t) => t.members?.some((m) => m.studentId === student?.uid)).length;
  const pendingSubmissionsCount = studentParticipations.filter(
    (p) => p.submissionStatus === 'Pending' || p.submissionStatus === 'Draft'
  ).length;
  const achievementsCount = myCertificates.length + submissions.filter(
    (s) => s.submittedBy === student?.uid && (s.rank || s.status === 'SHORTLISTED' || s.status === 'EVALUATED')
  ).length;

  const recentAnnouncements = announcements.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* SECTION 1: Top Welcome Header with Current Date */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>KalaignarKarunanidhi Institute Of Technology</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">{todayFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-navy-950 tracking-tight">
            My Hackathon Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, {studentName}. Track your participation milestones, active squads, submissions, and upcoming deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/student/hackathons"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Hackathons</span>
          </Link>
          <Link
            to="/student/team"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>My Team</span>
          </Link>
        </div>
      </div>

      {/* SECTION 13: 6 TOP SUMMARY CARDS (Real Firebase Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Registered Hackathons */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Registered
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {registeredHackathonsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {registeredHackathonsCount > 0 ? `${registeredHackathonsCount} registered` : 'No registrations'}
            </p>
          </div>
          <Link
            to="/student/registrations"
            className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>View Events</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 2: Active Participation */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Events
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {activeParticipationCount}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 truncate">
              {activeParticipationCount > 0 ? 'In progress' : 'None active'}
            </p>
          </div>
          <Link
            to="/student/hackathons"
            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>Explore</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 3: Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Deadlines
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-700 font-display truncate">
              {nearestDeadlineLabel}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {trackedDeadlines[0] ? trackedDeadlines[0].title : 'All clear'}
            </p>
          </div>
          <a
            href="#deadlines-section"
            className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>Timeline</span>
            <ChevronRight className="w-3 h-3" />
          </a>
        </div>

        {/* Card 4: My Teams */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              My Teams
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {myTeamsCount}
            </div>
            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5 truncate">
              {studentTeam ? studentTeam.name : 'No squad'}
            </p>
          </div>
          <Link
            to="/student/team"
            className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>View Team</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 5: Pending Submissions */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Submits
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {pendingSubmissionsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {pendingSubmissionsCount > 0 ? 'Requires action' : 'All delivered'}
            </p>
          </div>
          <Link
            to="/student/submissions"
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>Submissions</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 6: Achievements */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Achievements
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-navy-950 font-display">
              {achievementsCount}
            </div>
            <p className="text-[11px] text-purple-600 font-semibold mt-0.5 truncate">
              {myCertificates.length} certificates
            </p>
          </div>
          <Link
            to="/student/certificates"
            className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold mt-2 inline-flex items-center gap-1"
          >
            <span>Awards</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* SECTION 14: MY HACKATHON PARTICIPATION MAIN SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold font-display text-navy-950">
              My Hackathon Participation
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {studentParticipations.length} Tracked Challenge{studentParticipations.length === 1 ? '' : 's'}
          </span>
        </div>

        {studentParticipations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-navy-950 mb-1">No Hackathon Participation Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
              You haven't registered for any collegiate hackathons yet. Discover ongoing and upcoming hackathons to participate and track your progress.
            </p>
            <Link
              to="/student/hackathons"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Hackathons</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentParticipations.map((part) => (
              <div
                key={part.reg.id}
                className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle hover:border-slate-300 hover:shadow-elevated transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-navy-950 leading-tight">
                        {part.hackathon?.title || 'Hackathon Event'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {part.hackathon?.organizer || 'College Department'}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase shrink-0 ${
                        part.participationStatus === 'Completed'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : part.participationStatus === 'Submitted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : part.participationStatus === 'Submission Pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {part.participationStatus}
                    </span>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Team:</span>
                      <span className="font-semibold text-slate-900 truncate block">
                        {part.team?.name || 'Pending Squad'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Event Date:</span>
                      <span className="text-slate-800 font-medium block">
                        {part.hackathon?.eventStart ? new Date(part.hackathon.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'TBD'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Submission:</span>
                      <span
                        className={`font-semibold inline-block ${
                          part.submissionStatus === 'Submitted'
                            ? 'text-emerald-600'
                            : part.submissionStatus === 'Draft'
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {part.submissionStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Deadline:</span>
                      <span className={`font-semibold ${part.deadlineUrgent ? 'text-amber-600' : 'text-slate-700'}`}>
                        {part.deadlineText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Next Action */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500">Milestone Progress:</span>
                      <span className="text-navy-950 font-bold">{part.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          part.progressPercent >= 100
                            ? 'bg-purple-600'
                            : part.progressPercent >= 75
                            ? 'bg-emerald-500'
                            : part.progressPercent >= 50
                            ? 'bg-blue-600'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${part.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      to={`/student/hackathons/${part.reg.hackathonId}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Details
                    </Link>
                    {part.submission ? (
                      <Link
                        to="/student/submissions"
                        className="px-3.5 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <Link
                        to="/student/submissions"
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1"
                      >
                        <span>Submit Project</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 20: UPCOMING DEADLINES MONITORING & CAMPUS NOTICE BOARD */}
      <div id="deadlines-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (lg:col-span-7): UPCOMING DEADLINES WITH REAL TIMESTAMPS */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-bold text-navy-950 font-display">
                Upcoming Deadlines
              </h2>
            </div>
            <span className="text-xs text-slate-400">Real-Time Firestore Sync</span>
          </div>

          <div className="space-y-3">
            {trackedDeadlines.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80 shadow-subtle">
                No upcoming deadlines tracked at this time.
              </div>
            ) : (
              trackedDeadlines.map((dl) => (
                <div
                  key={dl.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-navy-950">{dl.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          dl.urgencyLabel === 'Due today'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : dl.urgencyLabel === 'Due tomorrow'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {dl.urgencyLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{dl.hackathonTitle}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{dl.formattedDate}</p>
                  </div>
                  <Link
                    to={`/student/hackathons/${dl.hackathonId}`}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (lg:col-span-5): CAMPUS NOTICE BOARD */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-navy-950 font-display">
                  Official Notice Board
                </h3>
              </div>
              <Link to="/student/notifications" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {recentAnnouncements.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                  No announcements published yet.
                </div>
              ) : (
                recentAnnouncements.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-navy-950 truncate">{item.title}</span>
                      {item.priority === 'CRITICAL' ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 uppercase">
                          Urgent
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
                          Notice
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      {new Date(item.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRIORITY 5: COMPACT QUICK ACTIONS (SECTION 8) */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Quick Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            to="/student/hackathons"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-subtle transition-all group flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                Explore Events
              </p>
              <p className="text-[10px] text-slate-400 truncate">{hackathons.length} Event{hackathons.length === 1 ? '' : 's'}</p>
            </div>
          </Link>

          <Link
            to="/student/team"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-subtle transition-all group flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                My Team
              </p>
              <p className="text-[10px] text-slate-400 truncate">{studentTeam?.name || 'Form squad'}</p>
            </div>
          </Link>

          <Link
            to="/student/submissions"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-subtle transition-all group flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Send className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                Submit Project
              </p>
              <p className="text-[10px] text-slate-400 truncate">Repo & Slides</p>
            </div>
          </Link>

          <Link
            to="/student/notifications"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-subtle transition-all group flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
                Notifications
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {notifications.filter((n) => !n.isRead).length} new alerts
              </p>
            </div>
          </Link>

          <Link
            to="/student/certificates"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-purple-400 hover:shadow-subtle transition-all group flex items-center gap-3 col-span-2 sm:col-span-1"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors truncate">
                Certificates
              </p>
              <p className="text-[10px] text-slate-400 truncate">{myCertificates.length} Records</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Attendance Pass Check-in Modal */}
      {isAttendanceModalOpen && (
        <Modal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          title="Participant Check-in & Attendance Verification"
          maxWidth="md"
        >
          <form onSubmit={handleMarkAttendance} className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Physical Check-in Required
              </p>
              <p className="text-slate-600 leading-relaxed">
                Provide the 6-character check-in code announced at the registration counter in Block B to confirm attendance for <strong>{activeHackathon?.title}</strong>.
              </p>
            </div>

            <Input
              label="Venue Attendance Code"
              placeholder="e.g. PASSCODE"
              value={attendanceCode}
              onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
              required
              helperText="Enter the uppercase check-in code announced at the venue"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsAttendanceModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isVerifyingAttendance}>
                Confirm Attendance
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
