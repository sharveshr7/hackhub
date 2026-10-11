import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { registrationService } from '../../services/registrationService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import { Registration } from '../../types';
import {
  Calendar,
  Users,
  MapPin,
  ExternalLink,
  QrCode,
  ChevronRight,
  Sparkles,
  FileText,
  Trophy,
  Award,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  Globe,
  Shield,
  Edit,
  Save
} from 'lucide-react';

export const StudentRegistrationsPage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const registrations = useAppStore((state) => state.registrations);
  const hackathons = useAppStore((state) => state.hackathons);
  const teams = useAppStore((state) => state.teams);
  const submissions = useAppStore((state) => state.submissions);
  const certificates = useAppStore((state) => state.certificates);
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ACTIVE');
  const [selectedPass, setSelectedPass] = useState<Registration | null>(null);

  // External Opportunity Status Update Modal State
  const [updateTargetReg, setUpdateTargetReg] = useState<Registration | null>(null);
  const [newExternalStatus, setNewExternalStatus] = useState<
    'APPLIED_EXTERNALLY' | 'PARTICIPATING' | 'COMPLETED' | 'WON' | 'WITHDRAWN'
  >('APPLIED_EXTERNALLY');
  const [externalNotes, setExternalNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const studentRegistrations = useMemo(() => {
    return registrations.filter((r) => currentUser && r.studentId === currentUser.uid);
  }, [registrations, currentUser]);

  const categorizedRegistrations = useMemo(() => {
    const now = new Date();

    const active: Registration[] = [];
    const upcoming: Registration[] = [];
    const completed: Registration[] = [];

    studentRegistrations.forEach((reg) => {
      const hackathon = hackathons.find((h) => h.id === reg.hackathonId);
      if (!hackathon) return;

      const eventStart = new Date(hackathon.eventStart || '');
      const eventEnd = new Date(hackathon.eventEnd || '');
      const statusUpper = String(hackathon.status).toUpperCase();

      if (statusUpper === 'COMPLETED' || now > eventEnd) {
        completed.push(reg);
      } else if (now >= eventStart && now <= eventEnd || statusUpper === 'LIVE') {
        active.push(reg);
      } else {
        // Future event or in registration/preparation phase
        upcoming.push(reg);
      }
    });

    return { active, upcoming, completed };
  }, [studentRegistrations, hackathons]);

  const handleUpdateExternalStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTargetReg) return;
    setIsUpdatingStatus(true);
    try {
      await registrationService.updateExternalTrackingStatus(
        updateTargetReg.id,
        newExternalStatus,
        externalNotes
      );
      addToast('External participation status updated successfully!', 'success');
      setUpdateTargetReg(null);
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const currentList =
    activeTab === 'ACTIVE'
      ? categorizedRegistrations.active
      : activeTab === 'UPCOMING'
      ? categorizedRegistrations.upcoming
      : categorizedRegistrations.completed;

  return (
    <div className="space-y-6">
      <PageHeader
        category="STUDENT PARTICIPATION PORTAL"
        title="My Participation"
        description="Monitor your active, upcoming, and completed hackathons, manage squads, submissions, deadlines, evaluation results, and certificates."
        badge={
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            {studentRegistrations.length} Total Registered
          </span>
        }
        actions={
          <Link
            to="/student/hackathons"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explore Hackathons</span>
          </Link>
        }
      />

      {/* Sections Tab Navigation (Section 17: Active, Upcoming, Completed) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'ACTIVE', label: 'Active', count: categorizedRegistrations.active.length, icon: Clock },
          { id: 'UPCOMING', label: 'Upcoming', count: categorizedRegistrations.upcoming.length, icon: Calendar },
          { id: 'COMPLETED', label: 'Completed', count: categorizedRegistrations.completed.length, icon: Trophy }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-navy-950 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Participation Cards List */}
      {currentList.length === 0 ? (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} hackathons`}
          description={
            activeTab === 'ACTIVE'
              ? 'You have no hackathons currently in session.'
              : activeTab === 'UPCOMING'
              ? 'No upcoming registered hackathons. Discover newly posted campus challenges!'
              : 'You have not completed any hackathons yet.'
          }
          actionText="Explore Hackathons"
          onAction={() => window.location.assign('/student/hackathons')}
        />
      ) : (
        <div className="space-y-4">
          {currentList.map((reg) => {
            const hackathon = hackathons.find((h) => h.id === reg.hackathonId);
            const team = teams.find(
              (t) => t.hackathonId === reg.hackathonId && t.members?.some((m) => m.studentId === currentUser?.uid)
            );
            const submission = submissions.find(
              (s) => s.hackathonId === reg.hackathonId && (s.teamId === team?.id || s.submittedBy === currentUser?.uid)
            );
            const cert = certificates.find(
              (c) => c.hackathonId === reg.hackathonId && c.studentId === currentUser?.uid
            );

            const isExt = Boolean(
              reg.isExternal ||
              hackathon?.isExternal ||
              (hackathon?.organizerType && hackathon.organizerType !== 'OUR_COLLEGE')
            );
            const officialUrl = hackathon?.officialUrl || hackathon?.externalRegistrationUrl;

            // Compute participation status
            let participationStatus = 'Registered';
            if (hackathon?.status === 'COMPLETED' || activeTab === 'COMPLETED') {
              participationStatus = 'Completed';
            } else if (submission && submission.status === 'SUBMITTED') {
              participationStatus = 'Submitted';
            } else if (team) {
              participationStatus = 'Participating';
            }

            return (
              <div
                key={reg.id}
                className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-subtle hover:border-slate-300 hover:shadow-elevated transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                {/* Left Information */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Participation Status Badge */}
                    {isExt ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-amber-600" />
                        <span>Campus Tracked (External)</span>
                      </span>
                    ) : (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          participationStatus === 'Completed'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : participationStatus === 'Submitted'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : participationStatus === 'Participating'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}
                      >
                        {participationStatus}
                      </span>
                    )}

                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {reg.registrationNumber}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      Registered on{' '}
                      {new Date(reg.registeredAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-navy-950 hover:text-blue-600 transition-colors">
                      {hackathon?.title || 'Collegiate Hackathon'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{hackathon?.organizer}</p>
                  </div>

                  {/* 4 Essential Fields: Team, Submission Status, Result, Certificate */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                    {/* Team */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                        <Users className="w-3 h-3 text-indigo-500" />
                        {isExt ? 'Participation' : 'Team'}
                      </span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">
                        {isExt ? (team ? team.name : 'Individual / External Squad') : (team ? team.name : 'Not Formed')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isExt ? 'External Entry' : team ? `${team.members?.length || 1} Members` : 'Join / Create'}
                      </span>
                    </div>

                    {/* Submission Status */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-500" />
                        {isExt ? 'Progress' : 'Submission'}
                      </span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">
                        {isExt
                          ? (reg.externalStatus ? reg.externalStatus.replace('_', ' ') : 'APPLIED')
                          : (submission ? submission.status : 'Pending')}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {isExt ? (reg.externalNotes || 'External portal') : submission?.title ? submission.title : 'No project yet'}
                      </span>
                    </div>

                    {/* Result */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        Result
                      </span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">
                        {isExt
                          ? reg.externalStatus === 'WON'
                            ? 'Award / Winner'
                            : reg.externalStatus === 'COMPLETED'
                            ? 'Completed'
                            : 'In Progress'
                          : submission?.status === 'EVALUATED' || submission?.status === 'WINNER'
                          ? 'Evaluated'
                          : submission
                          ? 'Under Review'
                          : 'Awaiting Submission'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isExt ? 'Host Evaluation' : submission?.evaluations?.length ? 'Jury Scored' : 'Pending Jury'}
                      </span>
                    </div>

                    {/* Certificate */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-500" />
                        Certificate
                      </span>
                      {cert ? (
                        <Link
                          to="/student/certificates"
                          className="font-bold text-emerald-600 hover:underline block mt-0.5 text-xs truncate"
                        >
                          Verified Available
                        </Link>
                      ) : activeTab === 'COMPLETED' ? (
                        <span className="font-medium text-slate-500 block mt-0.5">Processing</span>
                      ) : (
                        <span className="font-medium text-slate-400 block mt-0.5">Post-Event</span>
                      )}
                      <span className="text-[10px] text-slate-400">Institutional</span>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch md:self-auto justify-end">
                  {isExt ? (
                    <>
                      {officialUrl && (
                        <a
                          href={officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setUpdateTargetReg(reg);
                          setNewExternalStatus(reg.externalStatus || 'APPLIED_EXTERNALLY');
                          setExternalNotes(reg.externalNotes || '');
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                        <span>Update Status</span>
                      </button>
                      <button
                        onClick={() => setSelectedPass(reg)}
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        <span>Campus Record</span>
                      </button>
                      <Link
                        to={`/hackathons/${reg.hackathonId}`}
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <span>Details</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setSelectedPass(reg)}
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-slate-500" />
                        <span>Hall Pass</span>
                      </button>

                      <Link
                        to={`/hackathons/${reg.hackathonId}`}
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <span>Event Details</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>

                      <Link
                        to="/student/team"
                        className="px-3.5 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        Manage Squad
                      </Link>

                      <Link
                        to="/student/submissions"
                        className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        {submission ? 'View Submission' : 'Submit Project'}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hall Pass & Campus Verification Record Modal */}
      {selectedPass && (
        <Modal
          isOpen={Boolean(selectedPass)}
          onClose={() => setSelectedPass(null)}
          title={selectedPass.isExternal ? "Campus Participation Record" : "Collegiate Hackathon Hall Pass"}
          maxWidth="md"
        >
          <div className="p-6 rounded-xl bg-gradient-to-br from-navy-950 to-blue-950 text-white text-center space-y-4 shadow-elevated border border-navy-800">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 text-left">
              <div>
                <p className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                  {selectedPass.isExternal ? 'EXTERNAL OPPORTUNITY TRACKING' : 'KIT HACKATHON PASS'}
                </p>
                <h4 className="font-bold text-sm text-white">
                  {hackathons.find((h) => h.id === selectedPass.hackathonId)?.title}
                </h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-cyan-400">
                {selectedPass.isExternal ? <Globe className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl text-slate-900 inline-block shadow-inner mx-auto">
              <QrCode className="w-32 h-32 mx-auto text-navy-950" />
              <p className="font-mono text-xs font-extrabold text-navy-950 tracking-wider mt-2">
                {selectedPass.registrationNumber}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-left bg-white/5 p-3 rounded-lg border border-white/10">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Student</span>
                <span className="font-semibold text-white">{currentUser?.studentData?.name}</span>
                <span className="text-[10px] text-cyan-300 block font-mono">
                  {currentUser?.studentData?.registerNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  {selectedPass.isExternal ? 'Conducting Body' : 'Department'}
                </span>
                <span className="font-semibold text-white truncate block">
                  {selectedPass.isExternal
                    ? hackathons.find((h) => h.id === selectedPass.hackathonId)?.organizer || 'External'
                    : currentUser?.studentData?.department}
                </span>
                <span className="text-[10px] text-slate-300 block">
                  {selectedPass.isExternal ? 'Campus Monitored' : currentUser?.studentData?.year}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              {selectedPass.isExternal
                ? 'This record certifies that student participation in this external opportunity is logged with college coordinators for credit and award tracking. Official participation is governed by the external host portal.'
                : 'Present this digital pass alongside your College ID card at the entry verification desk.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Record</span>
            </button>
            <button
              onClick={() => setSelectedPass(null)}
              className="px-4 py-1.5 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* External Participation Status Update Modal */}
      {updateTargetReg && (
        <Modal
          isOpen={Boolean(updateTargetReg)}
          onClose={() => setUpdateTargetReg(null)}
          title="Update External Participation Progress"
          maxWidth="md"
        >
          <form onSubmit={handleUpdateExternalStatus} className="space-y-4 py-1 text-xs">
            <p className="text-slate-600">
              Keep your departmental coordinators updated on your progress in{' '}
              <strong>{hackathons.find((h) => h.id === updateTargetReg.hackathonId)?.title}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Current Participation Status
              </label>
              <select
                value={newExternalStatus}
                onChange={(e) => setNewExternalStatus(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-slate-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="APPLIED_EXTERNALLY">Applied / Registered on Organizer Portal</option>
                <option value="PARTICIPATING">Actively Participating / Building Solution</option>
                <option value="COMPLETED">Completed / Submitted Project to Host</option>
                <option value="WON">Won Award / Special Recognition / Cash Prize</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>

            <div>
              <Textarea
                label="Progress Details / Notes / Achievements (Optional)"
                value={externalNotes}
                onChange={(e) => setExternalNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Qualified for round 2 finals, submitted project on GitHub, won 2nd runner-up prize..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUpdateTargetReg(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isUpdatingStatus}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Progress to Firestore
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
