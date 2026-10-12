import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { hackathonService } from '../../services/hackathonService';
import { useAppStore } from '../../lib/store';
import { isPlatformAdministrator } from '../../utils/access';
import { Input, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import {
  ArrowLeft,
  Globe,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { EventOrganizerType, EventCategory, HackathonStatus } from '../../types';
import { SUPPORTED_DEPARTMENTS, isSupportedDepartment } from '../../constants/departments';

export const AdminCreateHackathonPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = useAppStore((state) => state.currentUser);

  const isPlatformAdmin = isPlatformAdministrator(currentUser);
  const facultyDept = isPlatformAdmin ? undefined : currentUser?.adminData?.department;

  // 5 Required Fields (HireToday Style)
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [category, setCategory] = useState<EventCategory>('HACKATHON');
  const [officialUrl, setOfficialUrl] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [department, setDepartment] = useState<string>(facultyDept || '');

  // Collapsed "Additional Details" section state
  const [isAdditionalDetailsOpen, setIsAdditionalDetailsOpen] = useState(false);

  // Optional Fields
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [mode, setMode] = useState<'ONLINE' | 'OFFLINE' | 'HYBRID'>('ONLINE');
  const [location, setLocation] = useState('');
  const [organizerType, setOrganizerType] = useState<EventOrganizerType>('OTHER_COLLEGE');
  const [eligibility, setEligibility] = useState('');
  const [prizeInfo, setPrizeInfo] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Status & Operation States
  const [status, setStatus] = useState<HackathonStatus>('REGISTRATION_OPEN');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Helper validation for URL format
  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (isLoading) return;
    setFormError(null);

    // 1. Validate 5 Required Fields
    if (!title.trim()) {
      setFormError('Please enter the hackathon or event title.');
      return;
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 150) {
      setFormError('Event title must be 150 characters or fewer.');
      return;
    }

    if (!organizer.trim()) {
      setFormError('Please enter the conducting organizer or institution name.');
      return;
    }
    const trimmedOrganizer = organizer.trim();

    if (!officialUrl.trim()) {
      setFormError('Please provide the official event or registration URL.');
      return;
    }
    const trimmedUrl = officialUrl.trim();
    if (!isValidUrl(trimmedUrl)) {
      setFormError('Official event URL must start with http:// or https:// and be a valid web address.');
      return;
    }

    if (!shortDescription.trim()) {
      setFormError('Please write a short description summary of the event.');
      return;
    }
    if (!isSupportedDepartment(department)) {
      setFormError('Select Biotechnology or Biomedical Engineering.');
      return;
    }
    const trimmedDesc = shortDescription.trim();
    if (trimmedDesc.length > 1500) {
      setFormError('Short description must be 1500 characters or fewer.');
      return;
    }

    // 2. Validate Optional Date Consistency when dates are provided
    if (eventStart && eventEnd) {
      const startDate = new Date(eventStart);
      const endDate = new Date(eventEnd);
      if (endDate < startDate) {
        setFormError('Event End Date cannot be earlier than Event Start Date.');
        return;
      }
    }

    if (registrationDeadline && eventStart) {
      const deadlineDate = new Date(registrationDeadline);
      const startDate = new Date(eventStart);
      if (deadlineDate > startDate) {
        setFormError('Registration deadline should not be later than the event start date.');
        return;
      }
    }

    if (bannerUrl.trim() && !isValidUrl(bannerUrl.trim())) {
      setFormError('Poster image URL must be a valid http:// or https:// address.');
      return;
    }

    setIsLoading(true);

    try {
      const isOurCollege = organizerType === 'OUR_COLLEGE';
      const eventStatus: HackathonStatus = isDraft ? 'DRAFT' : status;

      await hackathonService.createHackathon({
        title: title.trim(),
        organizer: organizer.trim(),
        organizerType,
        category,
        officialUrl: officialUrl.trim(),
        externalRegistrationUrl: officialUrl.trim(),
        department,
        shortDescription: shortDescription.trim(),
        description: shortDescription.trim(),
        isExternal: !isOurCollege,

        // Optional Dates (omitted/empty if not provided)
        registrationStart: new Date().toISOString(),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : '',
        eventStart: eventStart ? new Date(eventStart).toISOString() : '',
        eventEnd: eventEnd ? new Date(eventEnd).toISOString() : (eventStart ? new Date(eventStart).toISOString() : ''),
        submissionDeadline: eventEnd ? new Date(eventEnd).toISOString() : (eventStart ? new Date(eventStart).toISOString() : ''),

        // Optional Mode & Location
        mode: mode === 'ONLINE' ? 'VIRTUAL' : mode === 'OFFLINE' ? 'IN_PERSON' : 'HYBRID',
        location: location.trim() || (mode === 'ONLINE' ? 'Virtual / Online' : 'Not specified'),
        venue: location.trim() || (mode === 'ONLINE' ? 'Virtual / Online' : 'Not specified'),

        // Optional Details
        eligibility: eligibility.trim() ? [eligibility.trim()] : [],
        prizePool: prizeInfo.trim() || undefined,
        bannerUrl: bannerUrl.trim() || '',
        status: eventStatus,
        publishedBy: currentUser?.uid,
        publisherName: currentUser?.adminData?.name || currentUser?.email,

        // Defaults for structure without fabricating content
        minTeamSize: 1,
        maxTeamSize: 4,
        rules: [],
        prizes: prizeInfo.trim() ? [{ title: 'Confirmed Prize Pool', reward: prizeInfo.trim() }] : [],
        problemStatements: [],
        evaluationCriteria: [],
        faq: [],
      });

      showToast(
        'success',
        isDraft ? 'Draft Saved' : 'Event Published',
        `"${trimmedTitle}" has been successfully ${isDraft ? 'saved as draft' : 'published to the catalog'}.`
      );
      navigate('/admin/hackathons');
    } catch (err: any) {
      setFormError(err.message || 'Failed to publish event. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Top Header */}
      <div>
        <Link
          to="/admin/hackathons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-950 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Event Listings</span>
        </Link>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Event Publishing</span>
            </div>
            <h1 className="text-xl font-bold font-display text-navy-950 tracking-tight">
              Publish Event or Hackathon
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Publish student opportunities from colleges, companies, government missions, and hackathon platforms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => handleSubmit(e, true)}
              isLoading={isLoading}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={(e) => handleSubmit(e, false)}
              isLoading={isLoading}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Publish Now
            </Button>
          </div>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Publishing Form */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Core Required Section (HireToday Style) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-navy-950 uppercase tracking-wider">
              Required Information
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fill in the 5 essential fields to list this opportunity for students.
            </p>
          </div>

          <div className="space-y-4">
            {/* 1. Event Title */}
            <div>
              <Input
                label="Hackathon or Event Title *"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Smart India Hackathon 2026, GDG DevFest AI Challenge, TechFest 2026"
                required
                maxLength={150}
              />
              <span className="text-[10px] text-slate-400 mt-1 block text-right">
                {title.length}/150 characters
              </span>
            </div>

            {/* 2. Organizer & 3. Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organizer or Institution Name *"
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="e.g. IIT Madras, Google Developer Groups, Ministry of Education, KIT"
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
                >
                  <option value="HACKATHON">Hackathon</option>
                  <option value="COMPETITION">Coding / Tech Competition</option>
                  <option value="INNOVATION_CHALLENGE">Innovation Challenge</option>
                  <option value="WORKSHOP">Workshop / BootCamp</option>
                  <option value="CONFERENCE">Conference / Summit</option>
                  <option value="OTHER">Other Student Event</option>
                </select>
              </div>
            </div>

            {/* Department Scope */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Scope *
              </label>
              {isPlatformAdmin ? (
                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium"
                >
                  <option value="" disabled>Select department</option>
                  {SUPPORTED_DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              ) : (
                <div className="py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium flex items-center justify-between">
                  <span>{facultyDept || 'Department not assigned'}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded font-bold">Authorized Department Scope</span>
                </div>
              )}
            </div>

            {/* 4. Official URL */}
            <Input
              label="Official Event or Registration URL *"
              type="url"
              value={officialUrl}
              onChange={(e) => setOfficialUrl(e.target.value)}
              placeholder="https://official-organizer-website.com/register"
              required
              leftIcon={<Globe className="w-4 h-4 text-slate-400" />}
              helperText="Students will be directed to this verified link for registration and official details."
            />

            {/* 5. Short Description */}
            <div>
              <Textarea
                label="Short Description *"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Provide a concise description of the opportunity, domain, and what students will create or learn..."
                rows={4}
                required
                maxLength={1500}
              />
              <span className="text-[10px] text-slate-400 mt-1 block text-right">
                {shortDescription.length}/1500 characters
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Section: Additional Details (Optional) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAdditionalDetailsOpen(!isAdditionalDetailsOpen)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div>
              <h3 className="text-sm font-bold text-navy-950">
                Additional Details (Optional)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dates, mode, venue location, eligibility criteria, prize information, and poster image.
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              {isAdditionalDetailsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {isAdditionalDetailsOpen && (
            <div className="p-6 pt-2 border-t border-slate-100 space-y-4">
              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Registration Deadline"
                  type="datetime-local"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  leftIcon={<Clock className="w-3.5 h-3.5 text-slate-400" />}
                />

                <Input
                  label="Event Start Date"
                  type="datetime-local"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  leftIcon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
                />

                <Input
                  label="Event End Date"
                  type="datetime-local"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  leftIcon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
                />
              </div>

              {/* Mode, Location & Organizer Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Mode
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
                  >
                    <option value="ONLINE">Online (Virtual)</option>
                    <option value="OFFLINE">Offline (In-Person)</option>
                    <option value="HYBRID">Hybrid (Both)</option>
                  </select>
                </div>

                <Input
                  label="Location / Campus"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore, IIT Bombay Campus, Online"
                  leftIcon={<MapPin className="w-3.5 h-3.5 text-slate-400" />}
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organizer Type
                  </label>
                  <select
                    value={organizerType}
                    onChange={(e) => setOrganizerType(e.target.value as EventOrganizerType)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
                  >
                    <option value="OTHER_COLLEGE">Other College / University</option>
                    <option value="OUR_COLLEGE">Our Institution (KIT Coimbatore)</option>
                    <option value="COMPANY">Company / Tech Organization</option>
                    <option value="GOVERNMENT">Government / National Mission</option>
                    <option value="COMMUNITY">Community / Independent Organizer</option>
                    <option value="OTHER">Other Verified Organization</option>
                  </select>
                </div>
              </div>

              {/* Eligibility & Prizes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Eligibility Criteria"
                  type="text"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  placeholder="e.g. Open to all engineering college students in India"
                  leftIcon={<Users className="w-3.5 h-3.5 text-slate-400" />}
                />

                <Input
                  label="Officially Confirmed Prize Information"
                  type="text"
                  value={prizeInfo}
                  onChange={(e) => setPrizeInfo(e.target.value)}
                  placeholder="e.g. ₹1,00,000 Cash Pool + Direct Interviews"
                  leftIcon={<Trophy className="w-3.5 h-3.5 text-amber-500" />}
                  helperText="Leave blank if prize details are not officially verified."
                />
              </div>

              {/* Poster URL */}
              <Input
                label="Poster Image URL"
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or official CDN image link"
                leftIcon={<ImageIcon className="w-3.5 h-3.5 text-slate-400" />}
              />
            </div>
          )}
        </div>

        {/* Publication Control Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-navy-950 uppercase">Listing Visibility</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select whether this listing is visible immediately to students or saved in Draft.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as HackathonStatus)}
              className="py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="REGISTRATION_OPEN">Published (Open for Registration)</option>
              <option value="LIVE">Live (Event Underway)</option>
              <option value="DRAFT">Draft (Admin Only)</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Publish Opportunity
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
