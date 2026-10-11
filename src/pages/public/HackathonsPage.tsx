import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { OpportunityCard } from '../../components/discovery/OpportunityCard';
import {
  Search,
  Filter,
  Plus,
  Building2,
  Calendar,
  Globe,
  RotateCcw
} from 'lucide-react';

export const HackathonsPage: React.FC = () => {
  const { hackathons, registrations, currentUser } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedOrganizerType, setSelectedOrganizerType] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Check student registrations
  const registeredHackathonIds = useMemo(() => {
    return new Set(
      registrations
        .filter((r) => currentUser && r.studentId === currentUser.uid)
        .map((r) => r.hackathonId)
    );
  }, [registrations, currentUser]);

  const categoryOptions = [
    { value: 'ALL', label: 'All Categories' },
    { value: 'HACKATHON', label: 'Hackathons' },
    { value: 'COMPETITION', label: 'Competitions' },
    { value: 'INNOVATION_CHALLENGE', label: 'Innovation Challenges' },
    { value: 'WORKSHOP', label: 'Workshops' },
    { value: 'CONFERENCE', label: 'Conferences' }
  ];

  const organizerTypeOptions = [
    { value: 'ALL', label: 'All Organizers' },
    { value: 'OUR_COLLEGE', label: 'Our Institution (KIT)' },
    { value: 'OTHER_COLLEGE', label: 'Colleges & Universities' },
    { value: 'COMPANY', label: 'Companies & Industry' },
    { value: 'GOVERNMENT', label: 'Government & National Missions' },
    { value: 'COMMUNITY', label: 'Community & Non-Profits' }
  ];

  const modeOptions = [
    { value: 'ALL', label: 'All Modes' },
    { value: 'ONLINE', label: 'Online / Virtual' },
    { value: 'OFFLINE', label: 'Offline / In-Person' },
    { value: 'HYBRID', label: 'Hybrid' }
  ];

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'REGISTRATION_OPEN', label: 'Registration Open' },
    { value: 'LIVE', label: 'Live / In Session' },
    ...(currentUser ? [{ value: 'REGISTERED', label: 'Registered' }] : []),
    { value: 'COMPLETED', label: 'Completed' }
  ];

  const filteredHackathons = useMemo(() => {
    const baseList =
      currentUser?.role === 'ADMIN' || currentUser?.role === 'HOD'
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
          (h.venue && h.venue.toLowerCase().includes(q)) ||
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

      // 5. Status Filter
      if (selectedStatus !== 'ALL') {
        const statusUpper = String(h.status).toUpperCase();
        if (selectedStatus === 'REGISTERED') {
          if (!registeredHackathonIds.has(h.id)) return false;
        } else if (selectedStatus === 'REGISTRATION_OPEN') {
          if (statusUpper !== 'REGISTRATION_OPEN' && statusUpper !== 'PUBLISHED') return false;
        } else if (statusUpper !== selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [
    hackathons,
    currentUser,
    searchQuery,
    selectedCategory,
    selectedOrganizerType,
    selectedMode,
    selectedStatus,
    registeredHackathonIds
  ]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedOrganizerType('ALL');
    setSelectedMode('ALL');
    setSelectedStatus('ALL');
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCategory !== 'ALL' ||
    selectedOrganizerType !== 'ALL' ||
    selectedMode !== 'ALL' ||
    selectedStatus !== 'ALL';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <PageHeader
        category="OPPORTUNITY DISCOVERY PLATFORM"
        title="Explore Hackathons & Events"
        description="Discover hackathons, innovation challenges, and student opportunities conducted across India."
        badge={
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            {filteredHackathons.length} Available
          </span>
        }
        actions={
          currentUser?.role === 'ADMIN' || currentUser?.role === 'HOD' ? (
            <Link
              to="/admin/hackathons/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Opportunity</span>
            </Link>
          ) : undefined
        }
      />

      {/* HireToday-Inspired Search and Filter Container */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, conducting institution, organizer, or keywords..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Organizer Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Organizer Type
            </label>
            <select
              value={selectedOrganizerType}
              onChange={(e) => setSelectedOrganizerType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {organizerTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {modeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button if any filter active */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Found <strong className="text-slate-800">{filteredHackathons.length}</strong> matching events
            </span>
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Opportunities Grid (HireToday Style) */}
      <div>
        {filteredHackathons.length === 0 ? (
          <EmptyState
            title="No opportunities found"
            description="No hackathons or events matched your specified criteria. Try resetting your search query or adjusting your filters."
            actionText="Reset All Filters"
            onAction={resetAllFilters}
            className="my-10"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHackathons.map((h) => (
              <OpportunityCard
                key={h.id}
                hackathon={h}
                isRegistered={registeredHackathonIds.has(h.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
