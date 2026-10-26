import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { hackathonService } from '../../services/hackathonService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Send,
  Eye,
  Settings,
  Megaphone,
  UserCheck,
  FolderGit2,
  Edit,
  Share2,
  Layers,
  Trophy,
  ExternalLink,
  ShieldCheck,
  Check,
  Save,
  UploadCloud,
  FileDown,
  Globe,
  Building2,
  Sparkles
} from 'lucide-react';
import { HackathonStatus, EventOrganizerType, Hackathon } from '../../types';

export const AdminHackathonDetailPage: React.FC = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hackathons, registrations, teams, submissions, students, announcements } = useAppStore();
  const { addToast } = useToast();

  const hackathon = hackathons.find((h) => h.id === hackathonId) || hackathons[0];

  const urlTab = searchParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'REGISTRATIONS' | 'TEAMS' | 'SUBMISSIONS' | 'ATTENDANCE' | 'ANNOUNCEMENTS' | 'SETTINGS'
  >(urlTab && ['OVERVIEW', 'REGISTRATIONS', 'TEAMS', 'SUBMISSIONS', 'ATTENDANCE', 'ANNOUNCEMENTS', 'SETTINGS'].includes(urlTab) ? urlTab : 'OVERVIEW');

  useEffect(() => {
    const tabParam = searchParams.get('tab') as any;
    if (tabParam && ['OVERVIEW', 'REGISTRATIONS', 'TEAMS', 'SUBMISSIONS', 'ATTENDANCE', 'ANNOUNCEMENTS', 'SETTINGS'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [attendanceGate, setAttendanceGate] = useState({ attendanceOpen: false, attendanceCode: '' });
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Editable Form State for Simplified Publishing Schema
  const [editTitle, setEditTitle] = useState(hackathon?.title || '');
  const [editOrganizer, setEditOrganizer] = useState(hackathon?.organizer || '');
  const [editOrganizerType, setEditOrganizerType] = useState<EventOrganizerType>(hackathon?.organizerType || 'OTHER_COLLEGE');
  const [editCategory, setEditCategory] = useState<string>(hackathon?.category || 'HACKATHON');
  const [editOfficialUrl, setEditOfficialUrl] = useState(hackathon?.officialUrl || hackathon?.externalRegistrationUrl || '');
  const [editShortDescription, setEditShortDescription] = useState(hackathon?.shortDescription || hackathon?.description || '');
  const [editEventStart, setEditEventStart] = useState(hackathon?.eventStart ? hackathon.eventStart.split('T')[0] : '');
  const [editEventEnd, setEditEventEnd] = useState(hackathon?.eventEnd ? hackathon.eventEnd.split('T')[0] : '');
  const [editRegDeadline, setEditRegDeadline] = useState(hackathon?.registrationDeadline ? hackathon.registrationDeadline.split('T')[0] : '');
  const [editMode, setEditMode] = useState<'ONLINE' | 'OFFLINE' | 'HYBRID'>(
    hackathon?.mode === 'VIRTUAL' ? 'ONLINE' : hackathon?.mode === 'IN_PERSON' ? 'OFFLINE' : (hackathon?.mode as any) || 'ONLINE'
  );
  const [editLocation, setEditLocation] = useState(hackathon?.location || hackathon?.venue || '');
  const [editEligibility, setEditEligibility] = useState(
    Array.isArray(hackathon?.eligibility) ? hackathon.eligibility.join(', ') : (hackathon?.eligibility || '')
  );
  const [editPrizeInfo, setEditPrizeInfo] = useState(hackathon?.prizePool || (hackathon?.prizes?.[0]?.reward) || '');
  const [editBannerUrl, setEditBannerUrl] = useState(hackathon?.bannerUrl || '');
  const [editStatus, setEditStatus] = useState<HackathonStatus>(hackathon?.status || 'REGISTRATION_OPEN');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (hackathon) {
      setEditTitle(hackathon.title || '');
      setEditOrganizer(hackathon.organizer || '');
      setEditOrganizerType(hackathon.organizerType || 'OTHER_COLLEGE');
      setEditCategory(hackathon.category || 'HACKATHON');
      setEditOfficialUrl(hackathon.officialUrl || hackathon.externalRegistrationUrl || '');
      setEditShortDescription(hackathon.shortDescription || hackathon.description || '');
      setEditEventStart(hackathon.eventStart ? hackathon.eventStart.split('T')[0] : '');
      setEditEventEnd(hackathon.eventEnd ? hackathon.eventEnd.split('T')[0] : '');
      setEditRegDeadline(hackathon.registrationDeadline ? hackathon.registrationDeadline.split('T')[0] : '');
      setEditMode(
        hackathon.mode === 'VIRTUAL' ? 'ONLINE' : hackathon.mode === 'IN_PERSON' ? 'OFFLINE' : (hackathon.mode as any) || 'ONLINE'
      );
      setEditLocation(hackathon.location || hackathon.venue || '');
      setEditEligibility(
        Array.isArray(hackathon.eligibility) ? hackathon.eligibility.join(', ') : (hackathon.eligibility || '')
      );
      setEditPrizeInfo(hackathon.prizePool || (hackathon.prizes?.[0]?.reward) || '');
      setEditBannerUrl(hackathon.bannerUrl || '');
      setEditStatus(hackathon.status || 'REGISTRATION_OPEN');
    }
  }, [hackathon?.id]);

  useEffect(() => {
    let cancelled = false;
    if (hackathon) {
      hackathonService.getAttendanceGate(hackathon.id)
        .then((gate) => { if (!cancelled) setAttendanceGate(gate); })
        .catch(() => { if (!cancelled) setAttendanceGate({ attendanceOpen: false, attendanceCode: '' }); });
    }
    return () => { cancelled = true; };
  }, [hackathon?.id]);

  if (!hackathon) {
    return (
      <div className="bg-white p-8 rounded-xl text-center border border-slate-200">
        <h2 className="text-base font-bold text-navy-950">Hackathon Not Found</h2>
        <Link to="/admin/hackathons" className="text-xs text-blue-600 mt-2 block font-semibold">
          Return to Hackathons Roster
        </Link>
      </div>
    );
  }

  const hackathonRegs = registrations.filter((r) => r.hackathonId === hackathon.id);
  const hackathonTeams = teams.filter((t) => t.hackathonId === hackathon.id);
  const hackathonSubs = submissions.filter((s) => s.hackathonId === hackathon.id);
  const hackathonAnnouncements = announcements.filter((a) => a.hackathonId === hackathon.id);

  const participantCount = hackathonRegs.length;
  const teamCount = hackathonTeams.length;
  const subCount = hackathonSubs.length;

  const handleStatusChange = async (newStatus: HackathonStatus) => {
    try {
      await hackathonService.updateHackathonStatus(hackathon.id, newStatus);
      setEditStatus(newStatus);
      addToast(`Hackathon status set to ${newStatus}.`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleAttendance = async (isOpen: boolean) => {
    setIsLoading(true);
    try {
      const gate = await hackathonService.toggleAttendance(hackathon.id, isOpen);
      setAttendanceGate(gate);
      addToast(`Attendance check-in is now ${isOpen ? 'OPEN' : 'CLOSED'}.`, 'success');
      setIsAttendanceModalOpen(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveHackathon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTitle.trim()) {
      addToast('Event title is required.', 'error');
      return;
    }
    if (!editOrganizer.trim()) {
      addToast('Conducting organizer or institution is required.', 'error');
      return;
    }
    if (!editOfficialUrl.trim()) {
      addToast('Official registration or event URL is required.', 'error');
      return;
    }
    if (!editShortDescription.trim()) {
      addToast('Short description summary is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const isOurCollege = editOrganizerType === 'OUR_COLLEGE';
      const modeMapped = editMode === 'ONLINE' ? 'VIRTUAL' : editMode === 'OFFLINE' ? 'IN_PERSON' : 'HYBRID';
      const cleanPrize = editPrizeInfo.trim();
      const updates: Partial<Hackathon> = {
        title: editTitle.trim(),
        organizer: editOrganizer.trim(),
        organizerType: editOrganizerType,
        category: editCategory,
        officialUrl: editOfficialUrl.trim(),
        externalRegistrationUrl: editOfficialUrl.trim(),
        isExternal: !isOurCollege,
        shortDescription: editShortDescription.trim(),
        description: editShortDescription.trim(),
        mode: modeMapped,
        location: editLocation.trim() || (editMode === 'ONLINE' ? 'Virtual / Online' : 'Not specified'),
        venue: editLocation.trim() || (editMode === 'ONLINE' ? 'Virtual / Online' : 'Not specified'),
        eventStart: editEventStart && !isNaN(new Date(editEventStart).getTime()) ? new Date(editEventStart).toISOString() : '',
        eventEnd: editEventEnd && !isNaN(new Date(editEventEnd).getTime()) ? new Date(editEventEnd).toISOString() : (editEventStart && !isNaN(new Date(editEventStart).getTime()) ? new Date(editEventStart).toISOString() : ''),
        registrationDeadline: editRegDeadline && !isNaN(new Date(editRegDeadline).getTime()) ? new Date(editRegDeadline).toISOString() : '',
        eligibility: editEligibility.trim() ? [editEligibility.trim()] : [],
        prizePool: cleanPrize,
        prizes: cleanPrize ? [{ title: 'Confirmed Prize Pool', reward: cleanPrize }] : [],
        bannerUrl: editBannerUrl.trim(),
        status: editStatus
      };

      await hackathonService.updateHackathon(hackathon.id, updates);
      addToast('Event configuration saved and persisted to Firestore.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save event updates.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/admin/hackathons"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-950 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Hackathons</span>
      </Link>

      {/* Header & Actions Bar (Requirement 7) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <StatusBadge status={hackathon.status} />
              <span className="text-xs text-slate-500 font-medium">
                {hackathon.mode.replace('_', ' ')} • {hackathon.location}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-navy-950">{hackathon.title}</h1>
            <p className="text-xs text-slate-500">{hackathon.organizer} • {hackathon.venue}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hackathon.status === 'DRAFT' ? (
              <Button
                onClick={() => handleStatusChange('REGISTRATION_OPEN')}
                variant="primary"
                size="sm"
                leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
              >
                Publish to Catalog
              </Button>
            ) : (
              <Button
                onClick={() => handleStatusChange('DRAFT')}
                variant="outline"
                size="sm"
                leftIcon={<FileDown className="w-3.5 h-3.5" />}
              >
                Unpublish to Draft
              </Button>
            )}
            {hackathon.status !== 'LIVE' && (
              <Button
                onClick={() => handleStatusChange('LIVE')}
                variant="secondary"
                size="sm"
              >
                Go Live
              </Button>
            )}
            <Button
              onClick={() => setActiveTab('SETTINGS')}
              variant={activeTab === 'SETTINGS' ? 'primary' : 'outline'}
              size="sm"
              leftIcon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit Details
            </Button>
            <Button
              onClick={() => setIsAttendanceModalOpen(true)}
              variant="secondary"
              size="sm"
              leftIcon={<QrCode className="w-3.5 h-3.5" />}
            >
              Check-in Code {attendanceGate.attendanceCode ? `(${attendanceGate.attendanceCode})` : '(Not Set)'}
            </Button>
          </div>
        </div>

        {/* Hero Information Matrix (Requirement 7) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Event Date</span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {hackathon.eventStart ? new Date(hackathon.eventStart).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'TBA'}
              {hackathon.eventEnd ? `–${new Date(hackathon.eventEnd).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Registration Deadline</span>
            <span className="font-bold text-amber-700 mt-0.5 block">
              {hackathon.registrationDeadline ? new Date(hackathon.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Not specified'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Participants</span>
            <span className="font-bold text-navy-950 font-mono mt-0.5 block text-sm">
              {participantCount.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Teams</span>
            <span className="font-bold text-navy-950 font-mono mt-0.5 block text-sm">
              {teamCount}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Submissions</span>
            <span className="font-bold text-emerald-700 font-mono mt-0.5 block text-sm">
              {subCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Requirement 7: Overview, Registrations, Teams, Submissions, Attendance, Announcements, Settings) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 flex items-center gap-1 overflow-x-auto scrollbar-none bg-slate-50/50">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'REGISTRATIONS', label: `Registrations (${hackathonRegs.length})`, icon: <FileCheck2 className="w-3.5 h-3.5" /> },
            { id: 'TEAMS', label: `Teams (${hackathonTeams.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'SUBMISSIONS', label: `Submissions (${hackathonSubs.length})`, icon: <FolderGit2 className="w-3.5 h-3.5" /> },
            { id: 'ATTENDANCE', label: 'Attendance', icon: <UserCheck className="w-3.5 h-3.5" /> },
            { id: 'ANNOUNCEMENTS', label: `Announcements (${hackathonAnnouncements.length})`, icon: <Megaphone className="w-3.5 h-3.5" /> },
            { id: 'SETTINGS', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-navy-950'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'OVERVIEW' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-navy-950 mb-2">Description & Scope</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl whitespace-pre-line">
                {hackathon.description}
              </p>
            </div>

            {/* Problem Statements */}
            {hackathon.problemStatements && hackathon.problemStatements.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-navy-950 mb-3">Problem Statement Tracks</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {hackathon.problemStatements.map((ps) => (
                    <div key={ps.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                        {ps.domain}
                      </span>
                      <h4 className="font-bold text-xs text-navy-950">{ps.title}</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{ps.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prizes */}
            {hackathon.prizes && hackathon.prizes.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-navy-950 mb-3">Prize Pool & Grants</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {hackathon.prizes.map((p, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[10px] uppercase font-bold text-amber-600 block">{p.title}</span>
                      <span className="text-base font-bold text-navy-950 mt-1 block">{p.reward}</span>
                      {p.description && <p className="text-[11px] text-slate-500 mt-1">{p.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Registrations */}
        {activeTab === 'REGISTRATIONS' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Registration ID</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Registered At</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hackathonRegs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No registrations yet.
                      </td>
                    </tr>
                  ) : (
                    hackathonRegs.map((r) => {
                      const st = students.find((s) => s.uid === r.studentId);
                      return (
                        <tr key={r.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{r.registrationNumber}</td>
                          <td className="py-2.5 px-3 font-semibold text-navy-950">{st?.name || 'Registered Student'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{st?.registerNumber || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{st?.department || 'Engineering'}</td>
                          <td className="py-2.5 px-3 text-slate-400">{new Date(r.registeredAt).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Teams */}
        {activeTab === 'TEAMS' && (
          <div className="p-6">
            {hackathonTeams.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active teams.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hackathonTeams.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-navy-950">{t.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">
                        Code: {t.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{t.members.length} Members Enrolled</p>
                    <div className="space-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      {t.members.map((m) => (
                        <div key={m.studentId} className="flex justify-between">
                          <span>{m.name}</span>
                          <span className="text-slate-400 font-medium">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Submissions */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="p-6 space-y-4">
            {hackathonSubs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No submissions yet.
              </div>
            ) : (
              hackathonSubs.map((sub) => (
                <div key={sub.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {sub.teamName}
                    </span>
                    <h4 className="font-bold text-sm text-navy-950 mt-1">{sub.projectTitle}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{sub.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {sub.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Attendance */}
        {activeTab === 'ATTENDANCE' && (
          <div className="p-6 space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-navy-950">Participant Check-in Desk</h3>
            <p className="text-xs text-slate-500">
              Manage the check-in passcode for participating students.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in Status:</span>
                <span className="font-bold text-emerald-700">{attendanceGate.attendanceOpen ? 'OPEN' : 'CLOSED'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Check-in Code:</span>
                <span className="font-mono font-bold text-navy-950">{attendanceGate.attendanceCode || 'Not Set'}</span>
              </div>
            </div>

            <Button onClick={() => setIsAttendanceModalOpen(true)} variant="primary" size="sm">
              Configure Check-in Code
            </Button>
          </div>
        )}

        {/* Tab 6: Announcements */}
        {activeTab === 'ANNOUNCEMENTS' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-navy-950">Targeted Announcements</h3>
              <Link to="/admin/announcements" className="text-xs text-blue-600 font-semibold hover:underline">
                + Create Announcement
              </Link>
            </div>

            {hackathonAnnouncements.map((ann) => (
              <div key={ann.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-xs text-navy-950">{ann.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {ann.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{ann.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 7: Settings & Simplified Configuration */}
        {activeTab === 'SETTINGS' && (
          <form onSubmit={handleSaveHackathon} className="p-6 sm:p-8 space-y-8 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-base font-bold text-navy-950 font-display">
                  Edit Event Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update published details in the institutional catalog. Only 5 core fields are strictly required.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSaving}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save Changes
                </Button>
              </div>
            </div>

            {/* Section 1: Required Fields (5 Essential Fields) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  1. Core Required Information
                </h4>
                <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Required by System
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <Input
                    label="Event Title *"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Smart India Hackathon 2026, CodeForge AI"
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Conducting Organizer / Institution *"
                    value={editOrganizer}
                    onChange={(e) => setEditOrganizer(e.target.value)}
                    placeholder="e.g. Karpagam Institute of Technology, IIT Madras, Google Cloud"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Organizer Classification *
                  </label>
                  <select
                    value={editOrganizerType}
                    onChange={(e) => setEditOrganizerType(e.target.value as EventOrganizerType)}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="OUR_COLLEGE">KIT - Our College (Internal Sprint / Hall Pass)</option>
                    <option value="OTHER_COLLEGE">Other College / University</option>
                    <option value="COMPANY">Industry / Corporate / Startup</option>
                    <option value="GOVERNMENT">Government / Public Sector</option>
                    <option value="COMMUNITY">Tech Community / DAO / Non-Profit</option>
                    <option value="OTHER">Other Organization</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Event Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="HACKATHON">Hackathon</option>
                    <option value="COMPETITION">Coding / Tech Competition</option>
                    <option value="INNOVATION_CHALLENGE">Innovation & Ideathon Challenge</option>
                    <option value="WORKSHOP">Technical Workshop / Bootcamp</option>
                    <option value="CONFERENCE">Conference / Summit</option>
                    <option value="OTHER">Other Opportunity</option>
                  </select>
                </div>

                <div>
                  <Input
                    label="Official Registration / Event Website URL *"
                    value={editOfficialUrl}
                    onChange={(e) => setEditOfficialUrl(e.target.value)}
                    placeholder="https://hackathon.example.com or registration portal"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    label="Short Summary Description *"
                    value={editShortDescription}
                    onChange={(e) => setEditShortDescription(e.target.value)}
                    rows={3}
                    placeholder="Concise overview of themes, problem areas, and opportunity scope."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Optional Information */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  2. Optional Event Logistics
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Leave empty if not confirmed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <Input
                    label="Event Date / Kickoff (Optional)"
                    type="date"
                    value={editEventStart}
                    onChange={(e) => setEditEventStart(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Event End Date (Optional)"
                    type="date"
                    value={editEventEnd}
                    onChange={(e) => setEditEventEnd(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Registration Deadline (Optional)"
                    type="date"
                    value={editRegDeadline}
                    onChange={(e) => setEditRegDeadline(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Participation Mode
                  </label>
                  <select
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="ONLINE">Online / Virtual</option>
                    <option value="OFFLINE">Offline / In-Person</option>
                    <option value="HYBRID">Hybrid (Both)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Physical Location or Venue (Optional)"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. KIT Campus Auditorium / Virtual Platform"
                  />
                </div>

                <div className="sm:col-span-3">
                  <Input
                    label="Eligibility Criteria (Optional)"
                    value={editEligibility}
                    onChange={(e) => setEditEligibility(e.target.value)}
                    placeholder="e.g. All engineering branches, batches 2024-2028, open to college students"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Confirmed Cash Prize or Awards (Optional)"
                    value={editPrizeInfo}
                    onChange={(e) => setEditPrizeInfo(e.target.value)}
                    placeholder="e.g. ₹1,00,000 Total Prize Pool / Internships / Goodies"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Listing Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as HackathonStatus)}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="DRAFT">DRAFT (Unpublished / Internal)</option>
                    <option value="REGISTRATION_OPEN">REGISTRATION_OPEN (Visible to Students)</option>
                    <option value="REGISTRATION_CLOSED">REGISTRATION_CLOSED (Submissions active)</option>
                    <option value="LIVE">LIVE (Ongoing event)</option>
                    <option value="COMPLETED">COMPLETED (Concluded)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <Input
                    label="Poster / Banner Image URL (Optional)"
                    value={editBannerUrl}
                    onChange={(e) => setEditBannerUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or direct image URL"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {editStatus === 'DRAFT' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditStatus('REGISTRATION_OPEN')}
                    leftIcon={<UploadCloud className="w-3.5 h-3.5 text-emerald-600" />}
                  >
                    Set to Open Registration
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditStatus('DRAFT')}
                    leftIcon={<FileDown className="w-3.5 h-3.5 text-amber-600" />}
                  >
                    Revert to Draft (Unpublish)
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSaving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Event Configuration
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Attendance Check-in Modal */}
      {isAttendanceModalOpen && (
        <Modal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          title="Check-in Code Configuration"
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-600">Open or close the private venue check-in gate for {hackathon.title}.</p>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <span className="text-slate-500">Current code: </span>
              <span className="font-mono font-bold text-navy-950">{attendanceGate.attendanceCode || 'No active code'}</span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleToggleAttendance(false)}
                isLoading={isLoading}
              >
                Close Check-in
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleToggleAttendance(true)}
                isLoading={isLoading}
              >
                Save & Open Check-in
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
