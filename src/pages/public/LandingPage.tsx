import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { isStaffRole } from '../../utils/access';
import { OpportunityCard } from '../../components/discovery/OpportunityCard';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Search,
  Building2,
  Calendar,
  Globe,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  FileCheck2,
  Users,
  Award
} from 'lucide-react';
import { EventOrganizerType } from '../../types';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const hackathons = useAppStore((state) => state.hackathons);
  const currentUser = useAppStore((state) => state.currentUser);
  const registrations = useAppStore((state) => state.registrations);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedOrganizerType, setSelectedOrganizerType] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');

  // Categories shortcut pills
  const categoryPills = [
    { id: 'ALL', label: 'All Opportunities' },
    { id: 'HACKATHON', label: 'Hackathons' },
    { id: 'COMPETITION', label: 'Competitions' },
    { id: 'INNOVATION_CHALLENGE', label: 'Innovation Challenges' },
    { id: 'WORKSHOP', label: 'Workshops' },
    { id: 'CONFERENCE', label: 'Conferences' }
  ];

  // Organizer Type filter options
  const organizerTypeOptions = [
    { value: 'ALL', label: 'All Organizers' },
    { value: 'OUR_COLLEGE', label: 'Our Institution (KIT)' },
    { value: 'OTHER_COLLEGE', label: 'Colleges & Universities' },
    { value: 'COMPANY', label: 'Companies & Industry' },
    { value: 'GOVERNMENT', label: 'Government & National Missions' },
    { value: 'COMMUNITY', label: 'Community & Non-Profits' }
  ];

  // Mode filter options
  const modeOptions = [
    { value: 'ALL', label: 'All Modes' },
    { value: 'ONLINE', label: 'Online / Virtual' },
    { value: 'OFFLINE', label: 'Offline / In-Person' },
    { value: 'HYBRID', label: 'Hybrid' }
  ];

  // Student registered set
  const registeredHackathonIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    return new Set(
      registrations
        .filter((r) => r.studentId === currentUser.uid)
        .map((r) => r.hackathonId)
    );
  }, [registrations, currentUser]);

  // Filtered live hackathons from Firestore only
  const filteredOpportunities = useMemo(() => {
    // Only published hackathons for non-admin users
    const baseList =
      isStaffRole(currentUser?.role)
        ? hackathons
        : hackathons.filter((h) => String(h.status).toUpperCase() !== 'DRAFT');

    return baseList.filter((h) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesQuery =
          h.title.toLowerCase().includes(q) ||
          h.organizer.toLowerCase().includes(q) ||
          (h.shortDescription && h.shortDescription.toLowerCase().includes(q)) ||
          (h.location && h.location.toLowerCase().includes(q)) ||
          (h.category && h.category.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        const cat = (h.category || 'HACKATHON').toUpperCase();
        if (selectedCategory === 'HACKATHON' && !cat.includes('HACK')) return false;
        if (selectedCategory === 'COMPETITION' && !cat.includes('COMPET')) return false;
        if (selectedCategory === 'INNOVATION_CHALLENGE' && !cat.includes('INNOV') && !cat.includes('CHALLENG')) return false;
        if (selectedCategory === 'WORKSHOP' && !cat.includes('WORKSHOP')) return false;
        if (selectedCategory === 'CONFERENCE' && !cat.includes('CONF')) return false;
      }

      // 3. Organizer Type Filter
      if (selectedOrganizerType !== 'ALL') {
        if (selectedOrganizerType === 'OUR_COLLEGE') {
          const isOur =
            h.organizerType === 'OUR_COLLEGE' ||
            h.organizer.toLowerCase().includes('kit') ||
            h.organizer.toLowerCase().includes('kalaignarkarunanidhi');
          if (!isOur) return false;
        } else if (selectedOrganizerType === 'OTHER_COLLEGE') {
          const isOtherCollege =
            h.organizerType === 'OTHER_COLLEGE' ||
            h.organizer.toLowerCase().includes('iit') ||
            h.organizer.toLowerCase().includes('nit') ||
            h.organizer.toLowerCase().includes('university') ||
            (h.organizer.toLowerCase().includes('college') && !h.organizer.toLowerCase().includes('kit'));
          if (!isOtherCollege) return false;
        } else if (selectedOrganizerType === 'GOVERNMENT') {
          const isGov =
            h.organizerType === 'GOVERNMENT' ||
            h.organizer.toLowerCase().includes('gov') ||
            h.organizer.toLowerCase().includes('raksham') ||
            h.organizer.toLowerCase().includes('ministry');
          if (!isGov) return false;
        } else if (selectedOrganizerType === 'COMPANY') {
          const isCompany =
            h.organizerType === 'COMPANY' ||
            h.organizer.toLowerCase().includes('amazon') ||
            h.organizer.toLowerCase().includes('google') ||
            h.organizer.toLowerCase().includes('technologies');
          if (!isCompany) return false;
        } else if (selectedOrganizerType === 'COMMUNITY') {
          if (h.organizerType !== 'COMMUNITY') return false;
        }
      }

      // 4. Mode Filter
      if (selectedMode !== 'ALL') {
        const mode = (h.mode || 'ONLINE').toUpperCase();
        if (selectedMode === 'ONLINE' && !mode.includes('ONLINE') && !mode.includes('VIRTUAL')) return false;
        if (selectedMode === 'OFFLINE' && !mode.includes('OFFLINE') && !mode.includes('PERSON')) return false;
        if (selectedMode === 'HYBRID' && !mode.includes('HYBRID')) return false;
      }

      return true;
    });
  }, [hackathons, currentUser, searchQuery, selectedCategory, selectedOrganizerType, selectedMode]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedOrganizerType('ALL');
    setSelectedMode('ALL');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HIRE-TODAY INSPIRED DISCOVERY HERO SECTION */}
      <section className="relative overflow-hidden hero-gradient text-white py-14 sm:py-20 lg:py-24 border-b border-navy-800">
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:28px_28px] opacity-15 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Platform Identity Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>HackHub • Student Hackathon & Event Discovery Platform</span>
            </div>

            {/* Clear Headline & Concise Tagline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.15] mb-4">
              Discover Hackathons & Competitions Across India
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
              Explore verified hackathons, innovation challenges, and student opportunities conducted by universities, companies, government missions, and educational institutions.
            </p>

            {/* Prominent Search Bar (HireToday Layout) */}
            <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mb-6">
              <div className="relative flex items-center bg-white rounded-2xl shadow-elevated p-1.5 border border-slate-200">
                <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by event title, organizer, university, location, or domain..."
                  className="w-full px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/hackathons"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-xs sm:text-sm shadow-glow-cyan transition-all"
              >
                <span>Browse All Opportunities</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {!currentUser && (
                <>
                  <Link
                    to="/student-login"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all"
                  >
                    <GraduationCap className="w-4 h-4 text-cyan-400" />
                    <span>Student Login</span>
                  </Link>

                  <Link
                    to="/admin/login"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-900/80 hover:bg-navy-800 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm border border-navy-700 transition-all"
                  >
                    <Lock className="w-4 h-4 text-blue-400" />
                    <span>Faculty / Admin</span>
                  </Link>
                </>
              )}
            </div>

            {/* Multi-Institution Scope Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-8 mt-8 border-t border-white/10 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Pan-India Opportunities</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Institutions & Tech Organizations</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Verified Official Links</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY SHORTCUT PILLS & SECONDARY FILTERS BAR */}
      <section className="bg-white border-b border-slate-200 sticky top-20 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
          {/* Category Shortcuts Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoryPills.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Secondary Dropdown Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Organizer Type Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Organizer:</span>
                <select
                  value={selectedOrganizerType}
                  onChange={(e) => setSelectedOrganizerType(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {organizerTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Mode:</span>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {modeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Filter Clear */}
              {(searchQuery || selectedCategory !== 'ALL' || selectedOrganizerType !== 'ALL' || selectedMode !== 'ALL') && (
                <button
                  onClick={resetFilters}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer text-xs"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="text-slate-500 font-medium">
              Showing <span className="font-bold text-navy-950">{filteredOpportunities.length}</span> verified{' '}
              {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'}
            </div>
          </div>
        </div>
      </section>

      {/* 3. LATEST OPPORTUNITIES LISTING (Strictly Real Firestore Records) */}
      <section className="py-12 bg-slate-50 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <span>Real Opportunities</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-navy-950 tracking-tight">
                Latest Opportunities
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                Real student hackathons and competitions published by verified institutions across India.
              </p>
            </div>

            <Link
              to="/hackathons"
              className="mt-4 sm:mt-0 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              <span>Explore all opportunities</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {filteredOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  hackathon={opportunity}
                  isRegistered={registeredHackathonIds.has(opportunity.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No opportunities found"
              description="No hackathons or events matched your current search filters. Try clearing your search query or adjusting the selected category."
              actionText="Reset All Filters"
              onAction={resetFilters}
              className="max-w-md mx-auto my-8"
            />
          )}
        </div>
      </section>

      {/* 4. HOW HACKHUB WORKS (Informative Process - No fake statistics) */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Event Discovery & Monitoring
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-navy-950 tracking-tight mt-1">
              How HackHub Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              A transparent platform connecting students with legitimate technical competitions and managing institutional participation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold text-sm mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-navy-950 mb-2">Discover Genuine Events</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explore real competitions, hackathons, and challenges conducted by colleges, universities, tech organizations, and national missions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-cyan-100/70 text-cyan-800 flex items-center justify-center font-bold text-sm mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-navy-950 mb-2">Accurate Attribution</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Clear distinction between internal college events and external opportunities. External events provide direct links to the organizer's official website.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center font-bold text-sm mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-navy-950 mb-2">Track Campus Participation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                For college-sponsored events, students form teams, submit project deliverables, track attendance passcode check-ins, and receive verified certificates.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
