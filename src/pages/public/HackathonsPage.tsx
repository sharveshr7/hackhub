import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { HackathonBanner } from '../../components/common/HackathonBanner';
import { SearchAndFilters, ActiveFilterChip } from '../../components/common/SearchAndFilters';
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Plus,
  ChevronRight
} from 'lucide-react';

export const HackathonsPage: React.FC = () => {
  const { hackathons, registrations, currentUser } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN_REG' | 'UPCOMING' | 'REGISTERED' | 'COMPLETED'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [prizeFilter, setPrizeFilter] = useState<string>('ALL');

  // Check student registrations
  const registeredHackathonIds = useMemo(() => {
    return new Set(
      registrations
        .filter((r) => currentUser && r.studentId === currentUser.uid)
        .map((r) => r.hackathonId)
    );
  }, [registrations, currentUser]);

  // Featured Hackathon
  const featuredHackathon = useMemo(() => {
    const visibleHackathons = currentUser?.role === 'ADMIN'
      ? hackathons
      : hackathons.filter((h) => h.status !== 'DRAFT');

    return (
      visibleHackathons.find((h) => h.status === 'LIVE' || h.status === 'REGISTRATION_OPEN') ||
      visibleHackathons[0] ||
      null
    );
  }, [hackathons, currentUser]);

  const filteredHackathons = useMemo(() => {
    return hackathons.filter((h) => {
      // Exclude draft hackathons from students/guests unless admin
      if (currentUser?.role !== 'ADMIN' && h.status === 'DRAFT') {
        return false;
      }

      // Search query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        h.title.toLowerCase().includes(query) ||
        h.shortDescription.toLowerCase().includes(query) ||
        h.organizer.toLowerCase().includes(query) ||
        h.venue.toLowerCase().includes(query) ||
        (h.tagline && h.tagline.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Status Filters
      const statusUpper = String(h.status).toUpperCase();
      if (activeFilter === 'OPEN_REG') {
        if (statusUpper !== 'REGISTRATION_OPEN') return false;
      } else if (activeFilter === 'UPCOMING') {
        if (statusUpper !== 'REGISTRATION_OPEN' && statusUpper !== 'PUBLISHED' && statusUpper !== 'LIVE') return false;
      } else if (activeFilter === 'REGISTERED') {
        if (!registeredHackathonIds.has(h.id)) return false;
      } else if (activeFilter === 'COMPLETED') {
        if (statusUpper !== 'COMPLETED') return false;
      }

      // Department filter
      if (departmentFilter !== 'ALL') {
        const matchesDept =
          h.title.toLowerCase().includes(departmentFilter.toLowerCase()) ||
          h.shortDescription.toLowerCase().includes(departmentFilter.toLowerCase()) ||
          (h.tagline && h.tagline.toLowerCase().includes(departmentFilter.toLowerCase())) ||
          (h.organizer && h.organizer.toLowerCase().includes(departmentFilter.toLowerCase()));
        if (!matchesDept) return false;
      }

      // Mode filter
      if (modeFilter !== 'ALL') {
        const hMode = (h.mode || 'IN_PERSON').toUpperCase();
        if (modeFilter.toUpperCase() !== hMode) return false;
      }

      // Prize range filter
      if (prizeFilter !== 'ALL') {
        const prizeNumeric = parseInt((h.prizePool || '0').replace(/[^0-9]/g, ''), 10);
        if (prizeFilter === '50K_PLUS' && prizeNumeric < 50000) return false;
        if (prizeFilter === '30K_PLUS' && prizeNumeric < 30000) return false;
      }

      return true;
    });
  }, [hackathons, searchQuery, activeFilter, departmentFilter, modeFilter, prizeFilter, registeredHackathonIds]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setActiveFilter('ALL');
    setDepartmentFilter('ALL');
    setModeFilter('ALL');
    setPrizeFilter('ALL');
  };

  // Active chips calculation
  const activeChips: ActiveFilterChip[] = [];
  if (activeFilter !== 'ALL') {
    activeChips.push({
      key: 'status',
      label: 'Status',
      displayValue: activeFilter.replace('_', ' '),
      onRemove: () => setActiveFilter('ALL')
    });
  }
  if (departmentFilter !== 'ALL') {
    activeChips.push({
      key: 'dept',
      label: 'Department',
      displayValue: departmentFilter,
      onRemove: () => setDepartmentFilter('ALL')
    });
  }
  if (modeFilter !== 'ALL') {
    activeChips.push({
      key: 'mode',
      label: 'Mode',
      displayValue: modeFilter.replace('_', ' '),
      onRemove: () => setModeFilter('ALL')
    });
  }
  if (prizeFilter !== 'ALL') {
    activeChips.push({
      key: 'prize',
      label: 'Prize',
      displayValue: prizeFilter === '50K_PLUS' ? '₹50,000+' : '₹30,000+',
      onRemove: () => setPrizeFilter('ALL')
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        category="COLLEGE HACKATHON PORTAL"
        title="Explore Hackathons"
        description="Discover hackathons posted by your college and track your participation."
        badge={
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {filteredHackathons.length} Available
          </span>
        }
        actions={
          currentUser?.role === 'ADMIN' ? (
            <Link
              to="/admin/hackathons/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Post Hackathon</span>
            </Link>
          ) : undefined
        }
      />

      {/* Search and Filters System */}
      <SearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search hackathons by domain, technologies, organizer..."
        filters={[
          {
            key: 'department',
            label: 'Department',
            value: departmentFilter,
            options: [
              { label: 'Computer Science & AI', value: 'Computer' },
              { label: 'Information Technology', value: 'Technology' },
              { label: 'Biomedical & Health', value: 'Health' },
              { label: 'Renewables & GreenTech', value: 'Green' }
            ],
            onChange: setDepartmentFilter
          },
          {
            key: 'mode',
            label: 'Mode',
            value: modeFilter,
            options: [
              { label: 'In-Person', value: 'IN_PERSON' },
              { label: 'Hybrid', value: 'HYBRID' },
              { label: 'Virtual / Online', value: 'VIRTUAL' }
            ],
            onChange: setModeFilter
          },
          {
            key: 'prize',
            label: 'Prize Pool',
            value: prizeFilter,
            options: [
              { label: '₹50,000 and above', value: '50K_PLUS' },
              { label: '₹30,000 and above', value: '30K_PLUS' }
            ],
            onChange: setPrizeFilter
          }
        ]}
        activeChips={activeChips}
        onClearAll={resetAllFilters}
        extraActions={
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'OPEN_REG', label: 'Open' },
              { id: 'UPCOMING', label: 'Upcoming' },
              ...(currentUser ? [{ id: 'REGISTERED', label: 'Registered' }] : []),
              { id: 'COMPLETED', label: 'Completed' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === filter.id
                    ? 'bg-navy-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Featured Hackathon Spotlight */}
      {featuredHackathon && activeFilter === 'ALL' && !searchQuery && activeChips.length === 0 && (
        <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 text-white rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-elevated relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Featured Flagship
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {featuredHackathon.venue} • {featuredHackathon.location}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
                {featuredHackathon.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                {featuredHackathon.tagline || 'Build AI-powered solutions for real-world problems.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-800 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Registration Closes</span>
                <span className="font-bold text-white">
                  {new Date(featuredHackathon.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Team Size</span>
                <span className="font-bold text-white">{featuredHackathon.minTeamSize}–{featuredHackathon.maxTeamSize} Members</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Prize Pool</span>
                <span className="font-bold text-cyan-400">{featuredHackathon.prizePool || '₹50,000'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Participants</span>
                <span className="font-bold text-white">{featuredHackathon.participantCount || 1248} Registered</span>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-3">
              <Link
                to={`/hackathons/${featuredHackathon.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-navy-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              {registeredHackathonIds.has(featuredHackathon.id) ? (
                <Link
                  to="/student/team"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-100 bg-emerald-700/80 hover:bg-emerald-700 rounded-lg border border-emerald-500/30 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Registered (View Squad)</span>
                </Link>
              ) : (
                <Link
                  to={`/hackathons/${featuredHackathon.id}?register=true`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  <span>Register Now</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hackathons Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold font-display text-navy-950">Active Hackathon Roster</h2>
            <p className="text-xs text-slate-500">Official engineering challenges open for collegiate participation.</p>
          </div>
          <span className="text-xs text-slate-600 font-semibold bg-white px-2.5 py-1 rounded-md border border-slate-200">
            {filteredHackathons.length} {filteredHackathons.length === 1 ? 'Event' : 'Events'}
          </span>
        </div>

        {filteredHackathons.length === 0 ? (
          <EmptyState
            title="No hackathons match your criteria"
            description="Try adjusting your search terms or resetting your department/mode filters."
            actionText="Reset All Filters"
            onAction={resetAllFilters}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHackathons.map((h) => {
              const isRegistered = registeredHackathonIds.has(h.id);
              const statusUpper = String(h.status).toUpperCase();
              const isRegOpen = statusUpper === 'REGISTRATION_OPEN';

              return (
                <div
                  key={h.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-subtle hover:border-slate-300 hover:shadow-elevated transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div>
                    {/* Event Banner with Distinct Visual Identity */}
                    <div className="relative">
                      <HackathonBanner
                        id={h.id}
                        title={h.title}
                        mode={h.mode}
                        size="md"
                      />
                      <div className="absolute top-3 left-3 z-20">
                        <StatusBadge status={h.status} size="sm" />
                      </div>
                      {isRegistered && (
                        <div className="absolute top-3 right-3 z-20 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <CheckCircle className="w-3 h-3" />
                          <span>Registered</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider truncate">
                          {h.organizer}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {h.category || 'Tech & AI'}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-base text-navy-950 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {h.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-4 leading-relaxed">
                        {h.shortDescription}
                      </p>

                      {/* Meta Grid */}
                      <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Event Dates:
                          </span>
                          <span className="font-semibold text-slate-800">
                            {new Date(h.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric' })}–
                            {new Date(h.eventEnd).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Reg. Deadline:
                          </span>
                          <span className="font-semibold text-amber-700">
                            {new Date(h.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Team Size:
                          </span>
                          <span className="font-medium text-slate-700">
                            {h.minTeamSize}–{h.maxTeamSize} Members
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Eligibility:
                          </span>
                          <span className="font-medium text-slate-700 truncate max-w-[170px]" title={(h as any).eligibility || 'All KIT UG / PG Batches'}>
                            {(h as any).eligibility || 'All KIT UG / PG Batches'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            Prize Pool:
                          </span>
                          <span className="font-bold text-emerald-700">{h.prizePool || '₹40,000'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Card CTA Button */}
                  <div className="px-5 pb-5 pt-0">
                    {isRegistered ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to={`/hackathons/${h.id}`}
                          className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        >
                          <span>View Details</span>
                        </Link>
                        <Link
                          to="/student/registrations"
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>View Participation</span>
                        </Link>
                      </div>
                    ) : isRegOpen ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to={`/hackathons/${h.id}`}
                          className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        >
                          <span>View Details</span>
                        </Link>
                        <Link
                          to={`/hackathons/${h.id}?register=true`}
                          className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                        >
                          <span>Register</span>
                        </Link>
                      </div>
                    ) : (
                      <Link
                        to={`/hackathons/${h.id}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
