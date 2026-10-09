import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Countdown } from '../../components/common/Countdown';
import {
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  Sparkles,
  Trophy,
  Lightbulb,
  Building2,
  FileCheck2,
  Cpu,
  GraduationCap,
  ShieldCheck,
  Megaphone,
  CheckCircle2,
  ChevronRight,
  Code2,
  Layers,
  Terminal,
  Award,
  Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const hackathons = useAppStore((state) => state.hackathons);
  const announcements = useAppStore((state) => state.announcements);
  const registrations = useAppStore((state) => state.registrations);
  const teams = useAppStore((state) => state.teams);
  const submissions = useAppStore((state) => state.submissions);

  const featuredHackathon =
    hackathons.find((h) => h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN') || hackathons[0];
  const upcomingHackathons = hackathons
    .filter(
      (h) =>
        h.id !== featuredHackathon?.id &&
        String(h.status).toUpperCase() !== 'DRAFT' &&
        String(h.status).toUpperCase() !== 'CANCELLED'
    )
    .slice(0, 3);

  // College hackathon lifecycle: Post → Discover → Form Teams → Monitor → Submit → Record Results
  const howItWorksSteps = [
    {
      num: '01',
      title: 'Post & Publish',
      desc: 'Faculty coordinators create and publish college hackathon opportunities, eligibility rules, and timeline deadlines.'
    },
    {
      num: '02',
      title: 'Discover & Register',
      desc: 'Students discover opportunities posted by their college, view requirements, and register for participation.'
    },
    {
      num: '03',
      title: 'Form & Manage Teams',
      desc: 'Students assemble teams with peers or join rosters using team codes while faculty monitor team formation.'
    },
    {
      num: '04',
      title: 'Monitor & Track',
      desc: 'Faculty monitor student registrations, participation milestones, and deadlines while students track milestone progress.'
    },
    {
      num: '05',
      title: 'Submit Deliverables',
      desc: 'Student teams submit project deliverables, repository links, documentation, and demos before deadlines.'
    },
    {
      num: '06',
      title: 'Review & Record Results',
      desc: 'Faculty coordinators review project submissions, record evaluation results, and publish student achievements.'
    }
  ];

  const whyParticipatePillars = [
    {
      icon: <Lightbulb className="w-6 h-6 text-amber-500" />,
      title: 'Innovation',
      desc: 'Tackle real-world challenges, develop creative technical solutions, and explore emerging technologies.'
    },
    {
      icon: <Users className="w-6 h-6 text-blue-500" />,
      title: 'Collaboration',
      desc: 'Assemble multidisciplinary student teams across departments and develop teamwork, planning, and execution skills.'
    },
    {
      icon: <Cpu className="w-6 h-6 text-cyan-500" />,
      title: 'Practical Experience',
      desc: 'Translate academic classroom concepts into working software deliverables and tangible project submissions.'
    },
    {
      icon: <Trophy className="w-6 h-6 text-emerald-500" />,
      title: 'Recognition',
      desc: 'Showcase technical solutions to college faculty, earn institutional recognition, and receive constructive feedback.'
    },
    {
      icon: <FileCheck2 className="w-6 h-6 text-indigo-500" />,
      title: 'Achievements',
      desc: 'Record participation milestones, access faculty evaluations, and download certificates for student portfolios.'
    }
  ];

  return (
    <div className="flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden hero-gradient text-white py-16 sm:py-24 lg:py-28">
        {/* Abstract Technology Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:28px_28px] opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Text */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>HackHub • College Hackathon Management System</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.1] mb-3">
                HackHub
              </h1>
              <p className="text-xl sm:text-2xl font-display font-semibold text-cyan-300 mb-5 leading-snug">
                College Hackathon Posting, Monitoring & Student Participation Management System
              </p>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mb-6">
                A centralized college platform where faculty publish hackathon opportunities and monitor participation while students discover competitions, manage registrations, collaborate with teams, track deadlines, and showcase their project submissions.
              </p>

              <div className="flex items-center gap-2 text-xs text-cyan-300/90 font-medium mb-8 bg-cyan-950/40 border border-cyan-500/20 px-3.5 py-2.5 rounded-lg max-w-xl">
                <span className="font-bold text-white">Institutional Roles:</span>
                <span>Faculty publish opportunities & monitor participation • Students discover competitions & track progress.</span>
              </div>

              {/* Primary Entry Points: Explore Hackathons, Student Login, Admin Login */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/hackathons"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-sm shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
                >
                  <span>Explore Hackathons</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/student-login"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 backdrop-blur-sm transition-all"
                >
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <span>Student Login</span>
                </Link>

                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-navy-900/80 hover:bg-navy-800 text-slate-200 hover:text-white font-semibold text-sm border border-navy-700 backdrop-blur-sm transition-all"
                >
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span>Admin Login</span>
                </Link>
              </div>

              {/* Verified College Pillars */}
              <div className="flex flex-wrap items-center gap-6 pt-10 mt-10 border-t border-white/10 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Institutional College Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Participation Monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Submissions & Progress Tracking</span>
                </div>
              </div>
            </div>

            {/* Right Column: Platform Architecture Graphic */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl p-1 bg-gradient-to-tr from-cyan-500/40 via-blue-500/20 to-indigo-500/40 shadow-2xl">
                <div className="bg-navy-950/95 rounded-2xl p-6 backdrop-blur-xl border border-white/10 text-slate-200">
                  {/* Console Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-mono text-cyan-400 ml-2">hackhub-node ~ college portal</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800">
                      LIVE PLATFORM
                    </span>
                  </div>

                  {/* Architecture Diagram Nodes */}
                  <div className="space-y-4">
                    {/* Active Milestone Card */}
                    <div className="p-4 rounded-xl bg-navy-900/90 border border-navy-800">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Code2 className="w-4 h-4 text-cyan-400" />
                          {featuredHackathon?.title || 'College Hackathon Opportunity'}
                        </span>
                        <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          {featuredHackathon?.status?.replace('_', ' ') || 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {featuredHackathon?.organizer || 'College Department'} • Participation Window
                      </p>
                      <div className="mt-3">
                        <Countdown targetDate={featuredHackathon?.registrationDeadline || '2026-10-10T23:59:59Z'} label="Registration Closes In:" />
                      </div>
                    </div>

                    {/* Telemetry Blocks */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-navy-900/70 border border-navy-800">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-semibold">
                          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Student Entries</span>
                        </div>
                        <p className="text-sm font-mono font-bold text-cyan-400 mt-1">
                          {registrations.length > 0 ? `${registrations.length} Registered` : 'Open'}
                        </p>
                        <p className="text-[10px] text-slate-400">Participation Records</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-navy-900/70 border border-navy-800">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-semibold">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          <span>Teams Forming</span>
                        </div>
                        <p className="text-sm font-bold text-white mt-1">
                          {teams.length > 0 ? `${teams.length} Squads` : 'Collaborative'}
                        </p>
                        <p className="text-[10px] text-slate-400">Team Rosters</p>
                      </div>
                    </div>

                    {/* Faculty Supervision & Oversight Banner */}
                    <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-900/50 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-900/60 text-cyan-300">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-white">Faculty Posting & Oversight</p>
                        <p className="text-[11px] text-slate-400">Monitor student registrations, milestone deadlines, and project submissions.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Central Product Lifecycle Ribbon (Faculty & Student User Journeys) */}
      <section className="bg-navy-950 border-b border-navy-800 text-slate-300 py-4 px-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Faculty Journey */}
          <div className="flex items-center gap-3 text-xs min-w-[780px]">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-900/60 text-cyan-300 border border-blue-700/50 shrink-0">
              Faculty Journey
            </span>
            <div className="flex items-center justify-between flex-1 text-slate-300 text-xs">
              <span className="font-semibold text-white">Sign In</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-white">Post Hackathon</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-white">Publish</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-cyan-400">Monitor Participation</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-white">Review Submissions</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-emerald-400">Record Results</span>
            </div>
          </div>
          {/* Student Journey */}
          <div className="flex items-center gap-3 text-xs min-w-[780px] pt-2 border-t border-navy-900">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50 shrink-0">
              Student Journey
            </span>
            <div className="flex items-center justify-between flex-1 text-slate-300 text-xs">
              <span className="font-semibold text-white">Sign In</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-white">Explore Hackathons</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-cyan-400">Register</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-white">Participate</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-cyan-400">Track Progress</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-white">Submit Project</span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-emerald-400">View Results</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED HACKATHON SECTION */}
      {featuredHackathon && (
        <section className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Flagship Spotlight</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-navy-950 tracking-tight">
                  Featured Hackathon
                </h2>
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                Semester 1 Highlight
              </span>
            </div>

            <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 rounded-3xl p-6 sm:p-10 text-white shadow-elevated border border-navy-800 overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none hidden lg:block" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-8">
                  <div className="flex flex-wrap items-center gap-2.5 mb-4">
                    <StatusBadge status={featuredHackathon.status} />
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/10 text-cyan-300 border border-white/10">
                      {featuredHackathon.mode.replace('_', ' ')}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 bg-white/5 border border-white/5">
                      Teams of {featuredHackathon.minTeamSize}–{featuredHackathon.maxTeamSize}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-4xl font-display font-bold tracking-tight text-white mb-2">
                    {featuredHackathon.title}
                  </h3>
                  <p className="text-cyan-400 font-medium text-sm mb-4">
                    {featuredHackathon.tagline || 'AI • Innovation • Technology'}
                  </p>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mb-6">
                    {featuredHackathon.shortDescription}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-white/10 text-xs text-slate-300 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Event Dates</p>
                        <p className="font-semibold text-white">Oct 12–13, 2026</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Campus Venue</p>
                        <p className="font-semibold text-white truncate">{featuredHackathon.venue}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Award / Recognition</p>
                        <p className="font-bold text-amber-300">{featuredHackathon.prizePool || 'Certificates & Recognition'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      to={`/hackathons/${featuredHackathon.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-sm shadow-glow-cyan transition-all"
                    >
                      <span>Register for Hackathon</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/hackathons/${featuredHackathon.id}`}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/15 transition-all"
                    >
                      <span>Problem Statements & Rules</span>
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-navy-900/90 rounded-2xl p-6 border border-white/10 text-center">
                  <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                    Countdown to Registration Close
                  </p>
                  <div className="mb-6">
                    <Countdown targetDate={featuredHackathon.registrationDeadline} />
                  </div>
                  <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 text-left text-xs space-y-2 text-slate-300">
                    <p className="font-semibold text-white">Host Department / Faculty:</p>
                    <p className="text-slate-400">{featuredHackathon.organizer}</p>
                    <div className="pt-2 border-t border-navy-900 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Registered Students</span>
                      <span className="font-bold text-cyan-400">
                        {registrations.filter((r) => r.hackathonId === featuredHackathon.id).length} Students
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. UPCOMING HACKATHONS */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                <span>College Schedule</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-navy-950 tracking-tight">
                Upcoming Hackathons
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Explore department challenges, assemble a student team, and register for participation.
              </p>
            </div>
            <Link
              to="/hackathons"
              className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              <span>Explore all hackathons</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {upcomingHackathons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingHackathons.map((hackathon) => (
                <div
                  key={hackathon.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-elevated transition-all flex flex-col overflow-hidden group"
                >
                  {/* Banner Image */}
                  <div className="relative h-48 overflow-hidden bg-navy-950">
                    <img
                      src={hackathon.bannerUrl}
                      alt={hackathon.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={hackathon.status} />
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="font-semibold">{hackathon.mode.replace('_', ' ')}</span>
                      <span className="bg-navy-900/80 px-2 py-0.5 rounded text-[11px] backdrop-blur-sm border border-white/10">
                        Teams {hackathon.minTeamSize}–{hackathon.maxTeamSize}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {hackathon.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 mb-3">
                        {hackathon.organizer}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                        {hackathon.shortDescription}
                      </p>

                      <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600 mb-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Event: {new Date(hackathon.eventStart).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{hackathon.venue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-semibold text-slate-800">{hackathon.prizePool || 'Departmental Recognition & Certificates'}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/hackathons/${hackathon.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <span>View Details & Register</span>
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-subtle max-w-xl mx-auto">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-navy-950 mb-1">No Additional Hackathons Scheduled</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Upcoming college hackathon announcements will appear here once new department challenges are published.
              </p>
              <Link
                to="/hackathons"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 transition-colors"
              >
                <span>Browse Full Catalog</span>
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. HOW IT WORKS (Exact 6 Steps from Prompt Section 10) */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Structured Process
            </span>
            <h2 className="text-3xl font-display font-bold text-navy-950 tracking-tight mt-2">
              How It Works
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              The official college lifecycle from discovery to final project recognition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {howItWorksSteps.map((step) => (
              <div
                key={step.num}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 relative hover:border-blue-300 hover:shadow-subtle transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black font-display text-blue-600/30">
                    {step.num}
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-blue-100/60 text-blue-700 font-bold flex items-center justify-center text-xs">
                    {step.num}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-2">{step.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHY PARTICIPATE? (Exact 5 Pillars from Prompt Section 10) */}
      <section id="why-participate" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Academic & Career Growth</span>
            <h2 className="text-3xl font-display font-bold text-navy-950 tracking-tight mt-2">
              Why Participate?
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Unlock competitive learning, multidisciplinary collaboration, and recognized institutional achievements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyParticipatePillars.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-subtle hover:shadow-elevated transition-all flex items-start gap-4"
              >
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-1.5">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. REAL PARTICIPATION METRICS (No fabricated statistics) */}
      <section className="py-20 bg-navy-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Institutional Scale
            </span>
            <h2 className="text-3xl font-display font-bold text-white tracking-tight mt-2">
              College Participation Metrics
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Active engagement metrics tracked across academic departments and student participation records.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-800 backdrop-blur-sm">
              <p className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight">
                {hackathons.filter((h) => h.status !== 'DRAFT').length}
              </p>
              <p className="text-sm font-semibold text-cyan-400 mt-2">Opportunities</p>
              <p className="text-xs text-slate-400 mt-1">Published by faculty</p>
            </div>
            <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-800 backdrop-blur-sm">
              <p className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight">
                {registrations.length}
              </p>
              <p className="text-sm font-semibold text-cyan-400 mt-2">Registrations</p>
              <p className="text-xs text-slate-400 mt-1">Student entries managed</p>
            </div>
            <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-800 backdrop-blur-sm">
              <p className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight">
                {teams.length}
              </p>
              <p className="text-sm font-semibold text-cyan-400 mt-2">Teams</p>
              <p className="text-xs text-slate-400 mt-1">Formed & monitored</p>
            </div>
            <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-800 backdrop-blur-sm">
              <p className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight">
                {submissions.length}
              </p>
              <p className="text-sm font-semibold text-cyan-400 mt-2">Submissions</p>
              <p className="text-xs text-slate-400 mt-1">Deliverables tracked</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. LATEST ANNOUNCEMENTS SECTION */}
      <section id="announcements" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                <Megaphone className="w-4 h-4" />
                <span>Institutional Bulletins</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-navy-950 tracking-tight">
                Latest Announcements
              </h2>
            </div>
            <Link to="/student" className="mt-3 sm:mt-0 text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
              <span>View portal noticeboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                className={`p-6 rounded-2xl border transition-all ${
                  ann.priority === 'CRITICAL'
                    ? 'bg-rose-50/50 border-rose-200'
                    : ann.priority === 'IMPORTANT'
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      ann.priority === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : ann.priority === 'IMPORTANT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {ann.priority}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(ann.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">{ann.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{ann.message}</p>
                {ann.hackathonTitle && (
                  <p className="text-[11px] font-medium text-blue-600 truncate">
                    Related: {ann.hackathonTitle}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
