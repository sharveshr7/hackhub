import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { studentService } from '../../services/studentService';
import { teamService } from '../../services/teamService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Countdown } from '../../components/common/Countdown';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Layers,
  BookOpen,
  Building2,
  ExternalLink,
  Globe,
  Mail,
  Phone
} from 'lucide-react';
import {
  getOrganizerTypeLabel,
  getOrganizerBadgeStyle,
  getOfficialExternalUrl,
  isExternalOpportunity
} from '../../utils/eventHelpers';

export const HackathonDetailsPage: React.FC = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const hackathons = useAppStore((state) => state.hackathons);
  const registrations = useAppStore((state) => state.registrations);
  const teams = useAppStore((state) => state.teams);
  const submissions = useAppStore((state) => state.submissions);
  const currentUser = useAppStore((state) => state.currentUser);
  const announcements = useAppStore((state) => state.announcements);

  const hackathon = hackathons.find((h) => h.id === hackathonId);

  // Check registration status
  const existingRegistration = registrations.find(
    (r) => currentUser && r.studentId === currentUser.uid && r.hackathonId === hackathonId
  );

  // Team & Submission for current student
  const studentTeam = teams.find(
    (t) => t.hackathonId === hackathonId && t.members?.some((m) => m.studentId === currentUser?.uid)
  );
  const studentSubmission = submissions.find(
    (s) => s.hackathonId === hackathonId && (s.teamId === studentTeam?.id || s.submittedBy === currentUser?.uid)
  );

  const studentParticipationStage = useMemo<string>(() => {
    if (!existingRegistration) return 'Not Registered';
    if (hackathon?.status === 'COMPLETED') return 'Completed';
    if (
      studentSubmission &&
      (studentSubmission.status === 'SUBMITTED' ||
        studentSubmission.status === 'EVALUATED' ||
        studentSubmission.status === 'UNDER_REVIEW')
    ) {
      return 'Submitted';
    }
    if (studentTeam) return 'Participating';
    return 'Team Formation';
  }, [existingRegistration, hackathon, studentSubmission, studentTeam]);

  // Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [teamChoice, setTeamChoice] = useState<'create' | 'join' | 'later'>('later');
  const [newTeamName, setNewTeamName] = useState('');
  const [teamCodeToJoin, setTeamCodeToJoin] = useState('');
  const [teamNameError, setTeamNameError] = useState('');
  const [teamCodeError, setTeamCodeError] = useState('');
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [generatedRegNumber, setGeneratedRegNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchParams.get('register') === 'true' && !existingRegistration) {
      if (!currentUser) {
        navigate('/student-login');
      } else {
        setIsRegisterModalOpen(true);
      }
    }
  }, [searchParams, existingRegistration, currentUser, navigate]);

  if (!hackathon) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800">Hackathon Not Found</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">The specified hackathon does not exist or may have been unlisted.</p>
        <Link to="/hackathons" className="px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-semibold">
          Back to Hackathons
        </Link>
      </div>
    );
  }

  const now = new Date();
  const regDeadline = hackathon.registrationDeadline ? new Date(hackathon.registrationDeadline) : null;
  const eventStart = hackathon.eventStart ? new Date(hackathon.eventStart) : null;
  const eventEnd = hackathon.eventEnd ? new Date(hackathon.eventEnd) : null;

  const statusUpper = String(hackathon.status).toUpperCase();
  const isRegOpen = (statusUpper === 'REGISTRATION_OPEN' || statusUpper === 'PUBLISHED') && (!regDeadline || now <= regDeadline);
  const isRegClosed = regDeadline ? now > regDeadline : statusUpper === 'REGISTRATION_CLOSED';
  const isLive = statusUpper === 'LIVE' || (eventStart && eventEnd && now >= eventStart && now <= eventEnd);
  const isCompleted = statusUpper === 'COMPLETED' || (eventEnd ? now > eventEnd : false);

  const relevantAnnouncements = announcements.filter((a) => a.hackathonId === hackathon.id);

  // Multi-institution event helpers
  const isExternal = isExternalOpportunity(hackathon);
  const officialUrl = getOfficialExternalUrl(hackathon);
  const orgTypeLabel = getOrganizerTypeLabel(hackathon.organizerType, hackathon.organizer);
  const orgBadgeStyle = getOrganizerBadgeStyle(hackathon.organizerType, hackathon.organizer);

  const handleStartRegistration = () => {
    if (!currentUser) {
      navigate('/student-login', { state: { from: { pathname: `/hackathons/${hackathon.id}?register=true` } } });
      return;
    }
    if (currentUser.role !== 'STUDENT') {
      showToast('warning', 'Administrative Account', 'Admins can manage participants from the admin portal.');
      return;
    }
    setIsRegisterModalOpen(true);
    setRegistrationStep(1);
  };

  const handleCompleteRegistration = async () => {
    if (!currentUser?.studentData) return;
    setIsSubmitting(true);

    try {
      // 1. Register student
      const res = await studentService.registerForHackathon(hackathon.id, currentUser.studentData.uid);
      if (!res.success) {
        showToast('error', 'Registration Failed', res.message);
        setIsSubmitting(false);
        return;
      }

      setGeneratedRegNumber(res.registration?.registrationNumber || 'REG-CONFIRMED');

      // 2. Team creation or join if chosen
      if (teamChoice === 'create' && newTeamName.trim()) {
        await teamService.createTeam(hackathon.id, newTeamName.trim(), currentUser.studentData);
      } else if (teamChoice === 'join' && teamCodeToJoin.trim()) {
        await teamService.joinTeamByCode(teamCodeToJoin.trim(), currentUser.studentData);
      }

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      showToast('success', 'Registration Confirmed!', 'Your student registration pass has been generated.');
      setRegistrationStep(5); // Success confirmation
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-2 text-xs text-slate-500">
          <Link to="/hackathons" className="hover:text-navy-900 font-medium">
            Opportunities
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800 font-semibold truncate">{hackathon.title}</span>
        </div>
      </div>

      {/* Hero Banner Section */}
      <div className="bg-navy-950 text-white relative overflow-hidden py-12 lg:py-16">
        {hackathon.bannerUrl && hackathon.bannerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) && (
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <img src={hackathon.bannerUrl} alt={hackathon.title} className="w-full h-full object-cover filter blur-sm" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-950/70" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Organizer Attribution Tag & Status */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${orgBadgeStyle.bg} ${orgBadgeStyle.text} ${orgBadgeStyle.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${orgBadgeStyle.dot}`} />
              {orgTypeLabel}
            </span>
            <StatusBadge status={hackathon.status} />
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
              {hackathon.mode.replace('_', ' ')}
            </span>
            {hackathon.category && (
              <span className="text-xs font-medium text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-800 uppercase">
                {hackathon.category.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {/* Conducting Institution Attribution Heading */}
          <div className="flex items-center gap-2 text-sm text-cyan-300 font-semibold mb-2">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Conducted by: {hackathon.organizer}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight mb-4">
            {hackathon.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed mb-6">
            {hackathon.shortDescription}
          </p>

          {/* External Opportunity Notice */}
          {isExternal && (
            <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-800/80 max-w-3xl mb-6 text-xs text-blue-200 flex items-start gap-3">
              <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">External Opportunity Notice</span>
                <span>
                  This event is conducted by <strong>{hackathon.organizer}</strong>. HackHub is a discovery platform; registrations and contest participation take place directly on the official organizer website.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl py-4 border-t border-white/10 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Conducting Body</span>
              <span className="text-white font-medium mt-0.5 block truncate" title={hackathon.organizer}>{hackathon.organizer}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Event Dates</span>
              <span className="text-white font-medium mt-0.5 block">
                {hackathon.eventStart ? new Date(hackathon.eventStart).toLocaleDateString() : 'Announced Soon'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Registration Deadline</span>
              <span className="text-cyan-400 font-medium mt-0.5 block">
                {hackathon.registrationDeadline ? new Date(hackathon.registrationDeadline).toLocaleDateString() : 'Not Specified'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Location / Venue</span>
              <span className="text-white font-medium mt-0.5 block truncate">{hackathon.venue || hackathon.location || 'Online'}</span>
            </div>
          </div>

          {/* CTA Box */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              {hackathon.registrationDeadline && isRegOpen && (
                <Countdown targetDate={hackathon.registrationDeadline} label="Registration Deadline Countdown:" />
              )}
              {isLive && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Event Currently In Session</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isExternal ? (
                <div className="flex flex-wrap items-center gap-3">
                  {officialUrl ? (
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-sm shadow-glow-cyan transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                    >
                      <span>Visit Official Website & Register</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="px-4 py-2.5 rounded-lg bg-white/10 text-slate-300 text-xs font-medium border border-white/10">
                      Official URL Not Specified
                    </div>
                  )}

                  {existingRegistration ? (
                    <div className="flex items-center gap-2">
                      <div className="px-3.5 py-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Campus Tracked ({existingRegistration.registrationNumber})</span>
                      </div>
                      <Link
                        to="/student/registrations"
                        className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-all"
                      >
                        My Participation
                      </Link>
                    </div>
                  ) : isRegOpen ? (
                    <button
                      onClick={handleStartRegistration}
                      className="px-5 py-3 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-cyan-200 hover:text-white border border-cyan-500/30 text-xs font-semibold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
                      title="Log your participation on HackHub for college institutional monitoring"
                    >
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span>Track Participation on HackHub</span>
                    </button>
                  ) : null}
                </div>
              ) : existingRegistration ? (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Registered ({existingRegistration.registrationNumber})</span>
                  </div>
                  <Link
                    to="/student/team"
                    className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 text-xs font-bold shadow-sm transition-all"
                  >
                    Go to Team Hub
                  </Link>
                </div>
              ) : isRegOpen ? (
                <button
                  onClick={handleStartRegistration}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-sm shadow-glow-cyan transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register for Hackathon</span>
                </button>
              ) : (
                <div className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium">
                  {isCompleted ? 'Hackathon Concluded' : 'Registration Closed for this Event'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Details & Problem Statements */}
          <div className="lg:col-span-8 space-y-10">
            {/* Announcements */}
            {relevantAnnouncements.length > 0 && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Important Updates for Participants</span>
                </div>
                {relevantAnnouncements.map((a) => (
                  <div key={a.id} className="mt-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">{a.title}</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{a.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* About & Overview */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>About the Hackathon</span>
              </h2>
              <div className="prose prose-sm text-slate-600 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {hackathon.description}
              </div>
            </div>

            {/* Problem Statements */}
            {hackathon.problemStatements && hackathon.problemStatements.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-600" />
                    <span>Official Problem Statements</span>
                  </h2>
                  <span className="text-xs font-semibold bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-full border border-cyan-200">
                    {hackathon.problemStatements.length} Tracks Available
                  </span>
                </div>

                <div className="space-y-6">
                  {hackathon.problemStatements.map((ps, idx) => (
                    <div
                      key={ps.id}
                      className="p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-navy-900 text-white px-2 py-0.5 rounded">
                            Track {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-blue-600">{ps.domain}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">ID: {ps.id}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-2">{ps.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">{ps.description}</p>

                      {ps.expectedOutcome && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs">
                          <span className="font-semibold text-slate-800 block mb-0.5">Expected Deliverable:</span>
                          <span className="text-slate-600 leading-normal">{ps.expectedOutcome}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules & Guidelines */}
            {hackathon.rules && hackathon.rules.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <span>Rules & Regulations</span>
                </h2>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                  {hackathon.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Official Timeline (Section 16 Requirement) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Event Timeline & Milestones</span>
              </h2>
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                <div className="relative flex items-start gap-4 pl-8">
                  <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Phase 1: Ingestion</span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">Registration & Roster Lock</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Submit team membership and select challenge track.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shrink-0">
                      Closes: {hackathon.registrationDeadline ? new Date(hackathon.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified'}
                    </span>
                  </div>
                </div>

                <div className="relative flex items-start gap-4 pl-8">
                  <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-cyan-500 border-2 border-white ring-2 ring-cyan-100" />
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Phase 2: Check-in & Kickoff</span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">Physical Attendance Verification</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Registration Desk 3, Block B. Receive computing vouchers.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shrink-0">
                      {hackathon.eventStart ? `${new Date(hackathon.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric' })} • 8:30 AM` : 'TBA'}
                    </span>
                  </div>
                </div>

                <div className="relative flex items-start gap-4 pl-8">
                  <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-100" />
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Phase 3: Code Freeze</span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">Final Project Artifact Submission</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Upload GitHub repository, demo video, and slide deck.</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 shrink-0">
                      {(hackathon.submissionDeadline || hackathon.eventEnd) ? `${new Date(hackathon.submissionDeadline || hackathon.eventEnd || '').toLocaleDateString([], { month: 'short', day: 'numeric' })} • 12:00 PM` : 'TBA'}
                    </span>
                  </div>
                </div>

                <div className="relative flex items-start gap-4 pl-8">
                  <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-100" />
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Phase 4: Grand Jury</span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">Pitch Presentations & Awards</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Live demonstration before academic dean and industry leaders.</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 shrink-0">
                      {hackathon.eventEnd ? new Date(hackathon.eventEnd).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Event Concludes'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation Criteria */}
            {hackathon.evaluationCriteria && hackathon.evaluationCriteria.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Evaluation Criteria & Weightage</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {hackathon.evaluationCriteria.map((crit, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900">{crit.parameter}</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          {crit.weightage}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{crit.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Problem Statements */}
            {hackathon.problemStatements && hackathon.problemStatements.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-600" />
                    <span>Official Problem Statements</span>
                  </h2>
                  <span className="text-xs font-semibold bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-full border border-cyan-200">
                    {hackathon.problemStatements.length} Tracks Available
                  </span>
                </div>

                <div className="space-y-6">
                  {hackathon.problemStatements.map((ps, idx) => (
                    <div
                      key={ps.id}
                      className="p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-navy-900 text-white px-2 py-0.5 rounded">
                            Track {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-blue-600">{ps.domain}</span>
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-1.5">{ps.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">{ps.description}</p>
                      {ps.expectedOutcome && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                          <span className="font-semibold text-slate-700">Expected Outcome: </span>
                          <span className="text-slate-600">{ps.expectedOutcome}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deliverables / Submission Checklist */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
              <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Submission Requirements</span>
              </h2>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                All registered teams must submit their deliverables before the deadline. Incomplete submissions will not be forwarded to the evaluation jury.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">1. Source Code Repository</span>
                  <span className="text-slate-600 block">Public GitHub/GitLab URL with clean README and setup instructions.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">2. Working Demonstration</span>
                  <span className="text-slate-600 block">Live deployed web/mobile demo URL or 2–3 min YouTube/Loom video demo.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">3. Project Artifact File</span>
                  <span className="text-slate-600 block">ZIP or PDF containing presentation pitch deck, architecture diagrams & brief.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">4. Submission Deadline</span>
                  <span className="font-bold text-amber-700 block">
                    {hackathon.submissionDeadline || hackathon.eventEnd ? (
                      new Date(hackathon.submissionDeadline || hackathon.eventEnd!).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    ) : 'Not specified'} (Firm lock)
                  </span>
                </div>
              </div>
            </div>

            {/* Submission Requirements (Section 16 Requirement) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Submission Requirements</span>
              </h2>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                All registered teams must submit their deliverables before the deadline. Incomplete submissions will not be forwarded to the evaluation jury.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">1. Source Code Repository</span>
                  <span className="text-slate-600 block">Public GitHub/GitLab URL with clean README and setup instructions.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">2. Working Demonstration</span>
                  <span className="text-slate-600 block">Live deployed web/mobile demo URL or 2–3 min YouTube/Loom video demo.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">3. Project Artifact File</span>
                  <span className="text-slate-600 block">ZIP or PDF containing presentation pitch deck, architecture diagrams & brief.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">4. Submission Deadline</span>
                  <span className="font-bold text-amber-700 block">
                    {(hackathon.submissionDeadline || hackathon.eventEnd)
                      ? `${new Date(hackathon.submissionDeadline || hackathon.eventEnd || '').toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })} (Firm lock)`
                      : 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* FAQ */}
            {hackathon.faq && hackathon.faq.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-subtle">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-500" />
                  <span>Frequently Asked Questions</span>
                </h2>
                <div className="space-y-4">
                  {hackathon.faq.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">{item.question}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Sidebar with My Participation, Prizes, Eligibility, Timeline */}
          <div className="lg:col-span-4 space-y-6">
            {/* If External Opportunity: Show Official External Registration Box */}
            {isExternal ? (
              <div className="bg-white rounded-2xl border-2 border-blue-500/30 p-6 shadow-elevated space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <span>Official Registration</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    External Event
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-2">
                  <p>
                    This opportunity is conducted by <strong className="text-slate-900">{hackathon.organizer}</strong>.
                  </p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    HackHub is an event discovery platform. Registrations are conducted directly on the official organizer website.
                  </p>
                </div>

                {officialUrl ? (
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <span>Visit Official Website & Register</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-xs text-center">
                    Official registration link not provided by publisher.
                  </div>
                )}

                {/* Contact & Attribution */}
                {(hackathon.contactEmail || hackathon.contactPhone || hackathon.publisherName) && (
                  <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                    <span className="font-semibold text-slate-800 block text-[11px] uppercase">Publisher & Contacts</span>
                    {hackathon.publisherName && (
                      <div className="text-slate-600 text-[11px]">
                        Published by: <span className="font-medium text-slate-900">{hackathon.publisherName}</span>
                      </div>
                    )}
                    {hackathon.contactEmail && (
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <a href={`mailto:${hackathon.contactEmail}`} className="text-blue-600 hover:underline">
                          {hackathon.contactEmail}
                        </a>
                      </div>
                    )}
                    {hackathon.contactPhone && (
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{hackathon.contactPhone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* My Participation Section for College Events */
              <div className="bg-white rounded-2xl border-2 border-blue-500/30 p-6 shadow-elevated">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span>My Participation</span>
                  </h3>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      studentParticipationStage === 'Submitted' || studentParticipationStage === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : studentParticipationStage === 'Participating'
                        ? 'bg-blue-100 text-blue-800'
                        : studentParticipationStage === 'Team Formation' || studentParticipationStage === 'Submission Pending'
                        ? 'bg-amber-100 text-amber-800'
                        : studentParticipationStage === 'Registered'
                        ? 'bg-cyan-100 text-cyan-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {studentParticipationStage}
                  </span>
                </div>

                {!existingRegistration ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      You have not registered for this college hackathon yet. Reserve your spot to form a squad and participate.
                    </p>
                    {isRegOpen ? (
                      <Button onClick={handleStartRegistration} variant="primary" className="w-full font-bold" size="sm">
                        <Sparkles className="w-4 h-4 mr-1" />
                        Register Now
                      </Button>
                    ) : (
                      <div className="text-xs text-slate-400 italic">Registration is currently closed.</div>
                    )}
                  </div>
                ) : (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block">Registration Code</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {existingRegistration.registrationNumber}
                    </span>
                  </div>

                  {/* My Team Section */}
                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>My Team</span>
                    </h4>
                    {studentTeam ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{studentTeam.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">ID: {studentTeam.code}</span>
                        </div>
                        <div className="text-slate-600">
                          <span className="text-slate-400">Members ({studentTeam.members?.length || 0}): </span>
                          <span className="font-medium">
                            {studentTeam.members?.map((m) => m.name).join(', ') || 'No members listed'}
                          </span>
                        </div>
                        <Link
                          to="/student/team"
                          className="inline-flex items-center text-blue-600 font-semibold hover:underline text-[11px] pt-1"
                        >
                          Manage Team Roster & Code →
                        </Link>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 space-y-1.5">
                        <p className="text-[11px]">No team joined yet for this event.</p>
                        <Link
                          to="/student/team"
                          className="inline-block px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px]"
                        >
                          Create or Join Team
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* My Submission Section */}
                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>My Submission</span>
                    </h4>
                    {studentSubmission ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 truncate max-w-[150px]">
                            {studentSubmission.projectTitle || 'Submitted Project'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {studentSubmission.status}
                          </span>
                        </div>
                        {studentSubmission.submittedAt && (
                          <div className="text-[11px] text-slate-500">
                            Submitted:{' '}
                            {new Date(studentSubmission.submittedAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                        <Link
                          to="/student/submissions"
                          className="inline-flex items-center text-blue-600 font-semibold hover:underline text-[11px] pt-1"
                        >
                          View Full Submission Details →
                        </Link>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <p className="text-slate-500 text-[11px]">No project submission uploaded yet.</p>
                        <Link
                          to="/student/submissions"
                          className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px]"
                        >
                          Submit Project Now
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

            {/* Prizes Card */}
            {hackathon.prizes && hackathon.prizes.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>Prizes & Grants</span>
                </h3>
                <div className="space-y-3">
                  {hackathon.prizes.map((prize, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <p className="text-xs font-bold text-amber-900">{prize.title}</p>
                      <p className="text-sm font-extrabold text-amber-700 mt-0.5">{prize.reward}</p>
                      {prize.description && (
                        <p className="text-[11px] text-slate-600 mt-1 leading-normal">{prize.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Eligibility Card */}
            {hackathon.eligibility && hackathon.eligibility.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Eligibility Requirements</span>
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  {hackathon.eligibility.map((el, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{el}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Team Size Box */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle text-xs text-slate-600">
              <h3 className="text-base font-bold text-slate-900 mb-2">Team Parameters</h3>
              <p className="text-slate-500 mb-3">
                Teams must consist of at least <strong>{hackathon.minTeamSize}</strong> and at most{' '}
                <strong>{hackathon.maxTeamSize}</strong> students.
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-800">Cross-Department Allowed</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Combine skills across computing, electronics, and design for maximum project efficacy.
                </p>
              </div>
            </div>

            {/* Registration Action Sidebar */}
            <div className="bg-navy-950 text-white rounded-2xl p-6 shadow-elevated">
              <h3 className="text-base font-bold mb-2">
                {isExternal ? 'Official Participation' : 'Ready to Compete?'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                {isExternal
                  ? `This opportunity is conducted by ${hackathon.organizer}. Proceed to their official website to register.`
                  : 'Register as an individual or team lead to reserve your lab workbench and receive mentor assignments.'}
              </p>

              {isExternal ? (
                <div className="space-y-3">
                  {officialUrl ? (
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-xs shadow-glow-cyan transition-all"
                    >
                      <span>Visit Official Website & Register</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="p-3 bg-white/10 rounded-lg text-slate-300 text-xs text-center border border-white/10">
                      Official registration URL not specified
                    </div>
                  )}

                  {existingRegistration ? (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-semibold text-center">
                      ✓ Campus Tracked ({existingRegistration.registrationNumber})
                    </div>
                  ) : isRegOpen ? (
                    <button
                      onClick={handleStartRegistration}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Track on HackHub</span>
                    </button>
                  ) : null}
                </div>
              ) : existingRegistration ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-950 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-semibold text-center">
                    ✓ You are registered!
                  </div>
                  <Link
                    to="/student/team"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
                  >
                    <span>Manage Team & Submissions</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : isRegOpen ? (
                <Button
                  onClick={handleStartRegistration}
                  variant="accent"
                  className="w-full font-bold"
                  size="lg"
                >
                  Register Now
                </Button>
              ) : (
                <button
                  disabled
                  className="w-full py-3 rounded-lg bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed"
                >
                  Registration Closed
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Step Registration Modal (Guided 4-Step Process) */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          if (registrationStep === 5) {
            setIsRegisterModalOpen(false);
          } else if (window.confirm('Cancel registration process? Your progress will not be saved.')) {
            setIsRegisterModalOpen(false);
          }
        }}
        title={registrationStep === 5 ? 'Registration Confirmed' : 'Hackathon Registration'}
        maxWidth="lg"
      >
        <div className="py-1">
          {/* Visual Step Progress Header */}
          {registrationStep < 5 && (
            <div className="mb-6 pb-4 border-b border-slate-200">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { num: 1, label: 'Student Info' },
                  { num: 2, label: 'Track & Venue' },
                  { num: 3, label: 'Team Setup' },
                  { num: 4, label: 'Rules & Code' }
                ].map((s) => {
                  const isCurrent = registrationStep === s.num;
                  const isCompleted = registrationStep > s.num;
                  return (
                    <div key={s.num} className="flex flex-col items-center text-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-cyan-500 text-navy-950 ring-4 ring-cyan-100 font-extrabold'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                      </div>
                      <span
                        className={`text-[11px] font-medium truncate max-w-full ${
                          isCurrent ? 'text-navy-950 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Student Information */}
          {registrationStep === 1 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900">
                <strong>Step 1: Institutional Student Verification</strong>
                <p className="mt-0.5 text-blue-700">Official credentials verified from KIT student database.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Student Full Name" value={currentUser?.studentData?.name || ''} disabled />
                <Input label="Register Number" value={currentUser?.studentData?.registerNumber || ''} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Department" value={currentUser?.studentData?.department || ''} disabled />
                <Input label="Academic Year" value={currentUser?.studentData?.year || ''} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Email Address" value={currentUser?.studentData?.email || ''} disabled />
                <Input label="Phone Number" value={currentUser?.studentData?.phone || ''} disabled />
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={() => setRegistrationStep(2)} variant="primary">
                  <span>Continue to Track & Logistics</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Hackathon Confirmation & Track */}
          {registrationStep === 2 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900">
                <strong>{isExternal ? 'Step 2: Campus Participation Tracking Details' : 'Step 2: Confirm Hackathon Track & Logistics'}</strong>
                <p className="mt-0.5 text-blue-700">
                  {isExternal
                    ? `Logging participation for ${hackathon.organizer}. HackHub tracks student activity for college monitoring and awards.`
                    : 'Select your preferred problem statement track or decide on kickoff day.'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Event:</span>
                  <span className="font-bold text-slate-900">{hackathon.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Conducting Organizer:</span>
                  <span className="font-semibold text-slate-800">{hackathon.organizer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode & Venue:</span>
                  <span className="font-semibold text-slate-800">{hackathon.mode.replace('_', ' ')} • {hackathon.venue || hackathon.location || 'Online'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dates:</span>
                  <span className="font-semibold text-slate-800">
                    {hackathon.eventStart ? new Date(hackathon.eventStart).toLocaleDateString() : 'TBD'} - {hackathon.eventEnd ? new Date(hackathon.eventEnd).toLocaleDateString() : 'TBD'}
                  </span>
                </div>
              </div>

              {hackathon.problemStatements && hackathon.problemStatements.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Preferred Track / Problem Statement (Optional)
                  </label>
                  <select
                    value={selectedTrack}
                    onChange={(e) => setSelectedTrack(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">General / Undecided (Select during hackathon kickoff)</option>
                    {hackathon.problemStatements.map((ps, i) => (
                      <option key={ps.id} value={ps.id}>
                        Track {i + 1}: {ps.title} ({ps.domain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setRegistrationStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setRegistrationStep(3)} variant="primary">
                  <span>Continue to Team Setup</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Team Setup Choice with Inline Validation */}
          {registrationStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900">
                <strong>Step 3: Team Formation</strong>
                <p className="mt-0.5 text-blue-700">Form a team now, join an existing roster via code, or register individually and form later.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTeamChoice('create');
                    setTeamNameError('');
                  }}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    teamChoice === 'create'
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-slate-900 mb-0.5">Create Team</p>
                  <p className="text-[11px] text-slate-500 font-normal">You will be designated lead.</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTeamChoice('join');
                    setTeamCodeError('');
                  }}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    teamChoice === 'join'
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-slate-900 mb-0.5">Join with Code</p>
                  <p className="text-[11px] text-slate-500 font-normal">Enter 6-char team code.</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTeamChoice('later');
                    setTeamNameError('');
                    setTeamCodeError('');
                  }}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    teamChoice === 'later'
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-slate-900 mb-0.5">Form Later</p>
                  <p className="text-[11px] text-slate-500 font-normal">Join from Team Hub later.</p>
                </button>
              </div>

              {teamChoice === 'create' && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <Input
                    label="Team Name"
                    placeholder="e.g. CyberVanguard, NeuralForge"
                    value={newTeamName}
                    onChange={(e) => {
                      setNewTeamName(e.target.value);
                      if (e.target.value.trim().length >= 3) setTeamNameError('');
                    }}
                    error={teamNameError}
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    A unique 6-character team invite code will be generated for your teammates.
                  </p>
                </div>
              )}

              {teamChoice === 'join' && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <Input
                    label="Team Invite Code"
                    placeholder="e.g. BYTE42"
                    value={teamCodeToJoin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setTeamCodeToJoin(val);
                      if (val.trim().length >= 4) setTeamCodeError('');
                    }}
                    error={teamCodeError}
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Ask your team leader for their alphanumeric invite code.
                  </p>
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setRegistrationStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (teamChoice === 'create' && newTeamName.trim().length < 3) {
                      setTeamNameError('Team name must be at least 3 characters long.');
                      return;
                    }
                    if (teamChoice === 'join' && teamCodeToJoin.trim().length < 4) {
                      setTeamCodeError('Please enter a valid 6-character team code.');
                      return;
                    }
                    setRegistrationStep(4);
                  }}
                  variant="primary"
                >
                  <span>Continue to Rules Acceptance</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Rules & Explicit Acceptance */}
          {registrationStep === 4 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>Step 4: Academic Integrity & Official Rules Acceptance</strong>
                <p className="mt-0.5 text-amber-700">You must explicitly accept the rules to finalize your registration.</p>
              </div>

              <div className="max-h-52 overflow-y-auto p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 space-y-2.5">
                {(hackathon.rules || ['All participants must adhere to institutional codes of conduct and competition guidelines.']).map((rule, idx) => (
                  <p key={idx}>• {rule}</p>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedRules}
                    onChange={(e) => setAcceptedRules(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-900 leading-snug">
                    I have read and agree to the Hackathon Rules and College Code of Conduct.
                  </span>
                </label>
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setRegistrationStep(3)}>
                  Back
                </Button>
                <Button
                  onClick={handleCompleteRegistration}
                  variant="primary"
                  disabled={!acceptedRules}
                  isLoading={isSubmitting}
                >
                  Complete Registration
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Professional Success Confirmation Screen */}
          {registrationStep === 5 && (
            <div className="py-4 space-y-5 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-navy-950">
                  {isExternal ? 'Campus Tracking Recorded' : 'Registration Confirmed'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isExternal
                    ? `Your participation is logged on HackHub for college tracking. Be sure to register on ${hackathon.organizer}'s official portal.`
                    : 'Your credentials have been securely registered for this college hackathon.'}
                </p>
              </div>

              {/* Official Confirmation Card */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-left max-w-sm mx-auto space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    {isExternal ? 'Tracking ID' : 'Registration ID'}
                  </span>
                  <span className="text-sm font-mono font-bold text-blue-700 block mt-0.5">
                    {generatedRegNumber || 'CONFIRMED'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    {isExternal ? 'External Opportunity' : 'Hackathon'}
                  </span>
                  <span className="font-bold text-slate-900 block mt-0.5">{hackathon.title}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      {isExternal ? 'Organizer' : 'Team'}
                    </span>
                    <span className="font-bold text-slate-800 block mt-0.5 truncate">
                      {isExternal
                        ? hackathon.organizer
                        : teamChoice === 'create' && newTeamName
                        ? newTeamName
                        : teamChoice === 'join' && teamCodeToJoin
                        ? `Code: ${teamCodeToJoin}`
                        : 'Individual / Form Later'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Event Date</span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {hackathon.eventStart
                        ? new Date(hackathon.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Announced Soon'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Button
                  onClick={() => {
                    setIsRegisterModalOpen(false);
                    navigate('/student/registrations');
                  }}
                  variant="primary"
                  size="sm"
                >
                  View Registration Pass
                </Button>
                <Button
                  onClick={() => {
                    setIsRegisterModalOpen(false);
                    navigate('/student');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Sticky Desktop CTA Bar (Section 12 Requirement) */}
      {showStickyBar && (
        <div className="hidden lg:block fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 py-3 shadow-elevated transition-all">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">{hackathon.title}</h4>
                <p className="text-xs text-slate-500">
                  Deadline: {hackathon.registrationDeadline ? new Date(hackathon.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified'} • {hackathon.venue || hackathon.location || 'Online'}
                </p>
              </div>
            </div>
            <div>
              {existingRegistration ? (
                <Link
                  to="/student/team"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 text-xs font-bold transition-all inline-flex items-center gap-2"
                >
                  <span>Go to Team Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : isRegOpen ? (
                <button
                  onClick={handleStartRegistration}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register Now</span>
                </button>
              ) : (
                <span className="text-xs text-slate-500 font-semibold px-4 py-2 bg-slate-100 rounded-lg">
                  Registration Closed
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
