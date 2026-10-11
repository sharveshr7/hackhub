import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { hackathonService } from '../../services/hackathonService';
import { useAppStore } from '../../lib/store';
import { Input, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import {
  CalendarDays,
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Trophy,
  Mail,
  Phone,
  Image,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { EventOrganizerType, EventCategory, HackathonStatus } from '../../types';

export const AdminCreateHackathonPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = useAppStore((state) => state.currentUser);

  // Form Fields (Clean empty initial states — No fake defaults)
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [organizerType, setOrganizerType] = useState<EventOrganizerType>('OTHER_COLLEGE');
  const [category, setCategory] = useState<EventCategory>('HACKATHON');
  const [eventDate, setEventDate] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [mode, setMode] = useState<'ONLINE' | 'OFFLINE' | 'HYBRID'>('ONLINE');
  const [location, setLocation] = useState('');
  const [officialUrl, setOfficialUrl] = useState('');
  const [shortDescription, setShortDescription] = useState('');

  // Optional Fields
  const [eligibility, setEligibility] = useState('');
  const [prizeInfo, setPrizeInfo] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Status
  const [status, setStatus] = useState<HackathonStatus>('REGISTRATION_OPEN');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    setFormError(null);

    // Validate Required Fields
    if (!title.trim()) {
      setFormError('Please enter the hackathon or event title.');
      return;
    }
    if (!organizer.trim()) {
      setFormError('Please enter the conducting institution or organizer name.');
      return;
    }
    if (!officialUrl.trim()) {
      setFormError('Please provide the official registration or information URL.');
      return;
    }
    if (!shortDescription.trim()) {
      setFormError('Please write a brief summary description of the event.');
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
        eventStart: eventDate ? new Date(eventDate).toISOString() : '',
        eventEnd: eventDate ? new Date(eventDate).toISOString() : '',
        registrationStart: new Date().toISOString(),
        registrationDeadline: registrationDeadline
          ? new Date(registrationDeadline).toISOString()
          : '',
        submissionDeadline: eventDate ? new Date(eventDate).toISOString() : '',
        mode: mode === 'ONLINE' ? 'VIRTUAL' : mode === 'OFFLINE' ? 'IN_PERSON' : 'HYBRID',
        location: location.trim() || (mode === 'ONLINE' ? 'Virtual / Online' : 'Not specified'),
        venue: location.trim() || (mode === 'ONLINE' ? 'Virtual / Online' : 'Not specified'),
        officialUrl: officialUrl.trim(),
        externalRegistrationUrl: officialUrl.trim(),
        isExternal: !isOurCollege,
        shortDescription: shortDescription.trim(),
        description: shortDescription.trim(),
        eligibility: eligibility.trim() ? [eligibility.trim()] : [],
        prizePool: prizeInfo.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        bannerUrl: bannerUrl.trim() || '',
        status: eventStatus,
        publishedBy: currentUser?.uid,
        publisherName: currentUser?.adminData?.name || currentUser?.email,
        minTeamSize: 1,
        maxTeamSize: 4,
        rules: [],
        prizes: prizeInfo.trim() ? [{ title: 'Grand Prize', reward: prizeInfo.trim() }] : [],
        problemStatements: [],
        evaluationCriteria: [],
        faq: [],
        attendanceOpen: false
      });

      showToast(
        'success',
        isDraft ? 'Draft Saved' : 'Opportunity Published',
        `"${title}" has been successfully ${isDraft ? 'saved as draft' : 'published to the platform'}.`
      );
      navigate('/admin/hackathons');
    } catch (err: any) {
      setFormError(err.message || 'Failed to publish event. Please check inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header */}
      <div>
        <Link
          to="/admin/hackathons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-950 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Event Listings</span>
        </Link>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              Multi-Institution Opportunities
            </span>
            <h1 className="text-xl font-bold font-display text-navy-950 tracking-tight mt-0.5">
              Publish Hackathon or Student Event
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Publish genuine competitions, hackathons, challenges, and workshops from colleges, companies, or national organizers.
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
        {/* Core Opportunity Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-navy-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-cyan-600" />
            <span>Essential Event Details</span>
          </h2>

          <div className="space-y-4">
            <Input
              label="Hackathon or Event Title *"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Smart India Hackathon 2026, GDG DevFest AI Challenge, TechFest 2026"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Conducting Institution or Organizer Name *"
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="e.g. IIT Madras, Google Developer Groups, Ministry of Education, KIT"
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organizer Type *
                </label>
                <select
                  value={organizerType}
                  onChange={(e) => setOrganizerType(e.target.value as EventOrganizerType)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
                >
                  <option value="OUR_COLLEGE">Our Institution (KIT Coimbatore)</option>
                  <option value="OTHER_COLLEGE">Other College / University</option>
                  <option value="COMPANY">Company / Tech Organization</option>
                  <option value="GOVERNMENT">Government / National Mission</option>
                  <option value="COMMUNITY">Community / Independent Organizer</option>
                  <option value="OTHER">Other Verified Organization</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Mode *
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
                label="Location (City / Campus)"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bangalore, IIT Bombay Campus, Online"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Event Date or Start Date"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />

              <Input
                label="Registration Deadline"
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
              />
            </div>

            <Input
              label="Official Registration / Information URL *"
              type="url"
              value={officialUrl}
              onChange={(e) => setOfficialUrl(e.target.value)}
              placeholder="https://official-organizer-website.com/register"
              required
              leftIcon={<Globe className="w-4 h-4" />}
            />

            <Textarea
              label="Short Description *"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief summary of the hackathon, problem domain, eligibility, and what participants will build..."
              rows={4}
              required
            />
          </div>
        </div>

        {/* Optional Context (Prizes, Eligibility, Contacts, Poster) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-navy-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Optional Additional Information (When Officially Confirmed)</span>
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Confirmed Prize Pool or Awards"
                type="text"
                value={prizeInfo}
                onChange={(e) => setPrizeInfo(e.target.value)}
                placeholder="e.g. ₹1,00,000 Cash Pool + Job Interviews"
                leftIcon={<Trophy className="w-4 h-4 text-amber-500" />}
              />

              <Input
                label="Eligibility Details"
                type="text"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                placeholder="e.g. Open to all engineering college students in India"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Contact Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="coordinator@organizer.org"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Official Contact Phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>

            <Input
              label="Event Poster or Logo URL (Optional)"
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or official CDN URL"
              leftIcon={<Image className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Publication Control */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-navy-950 uppercase">Initial Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose whether this opportunity goes live immediately or remains in draft.
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
            >
              Publish Opportunity
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
