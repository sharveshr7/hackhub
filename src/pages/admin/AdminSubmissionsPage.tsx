import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { submissionService } from '../../services/submissionService';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import confetti from 'canvas-confetti';
import {
  Code,
  Globe,
  FileText,
  Star,
  Award,
  Search,
  Download,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
  Video,
  FileCode,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Submission, SubmissionStatus } from '../../types';

export const AdminSubmissionsPage: React.FC = () => {
  const submissions = useAppStore((state) => state.submissions);
  const hackathons = useAppStore((state) => state.hackathons);
  const teams = useAppStore((state) => state.teams);
  const students = useAppStore((state) => state.students);
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHackathon, setSelectedHackathon] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Evaluation modal fields
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState('');
  const [rank, setRank] = useState('');
  const [modalStatus, setModalStatus] = useState<SubmissionStatus>('EVALUATED');
  const [isLoading, setIsLoading] = useState(false);

  // Stats calculation
  const totalCount = submissions.length;
  const draftCount = submissions.filter((s) => s.status === 'DRAFT' || s.isDraft).length;
  const submittedCount = submissions.filter((s) => s.status === 'SUBMITTED').length;
  const underReviewCount = submissions.filter((s) => s.status === 'UNDER_REVIEW').length;
  const shortlistedCount = submissions.filter((s) => s.status === 'SHORTLISTED').length;
  const evaluatedCount = submissions.filter((s) => s.status === 'EVALUATED').length;

  const filteredSubmissions = submissions.filter((s) => {
    if (selectedHackathon !== 'ALL' && s.hackathonId !== selectedHackathon) return false;
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'DRAFT' && !s.isDraft && s.status !== 'DRAFT') return false;
      if (selectedStatus !== 'DRAFT' && s.status !== selectedStatus) return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const match =
        s.projectTitle.toLowerCase().includes(q) ||
        s.teamName.toLowerCase().includes(q) ||
        s.problemStatementTitle.toLowerCase().includes(q) ||
        s.technologies.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleOpenReview = (sub: Submission) => {
    setSelectedSubmission(sub);
    setScore(sub.evaluationScore || 85);
    setFeedback(sub.evaluationFeedback || '');
    setRank(sub.rank || '');
    setModalStatus(sub.status || 'EVALUATED');
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    setIsLoading(true);

    try {
      await submissionService.evaluateSubmission(
        selectedSubmission.id,
        Number(score),
        feedback,
        rank,
        modalStatus
      );
      if (rank || modalStatus === 'SHORTLISTED') {
        confetti({ particleCount: 70, spread: 60 });
      }
      showToast(
        'success',
        'Evaluation Recorded',
        `Score (${score}/100) and status [${modalStatus}] saved for "${selectedSubmission.projectTitle}".`
      );
      setSelectedSubmission(null);
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Submission ID',
      'Project Title',
      'Team Name',
      'Hackathon',
      'Problem Statement',
      'Status',
      'Jury Score',
      'Rank',
      'GitHub URL',
      'Demo URL',
      'Submitted At'
    ];
    const rows = filteredSubmissions.map((s) => {
      const h = hackathons.find((hack) => hack.id === s.hackathonId);
      return [
        s.id,
        `"${s.projectTitle.replace(/"/g, '""')}"`,
        `"${s.teamName.replace(/"/g, '""')}"`,
        `"${(h?.title || s.hackathonId).replace(/"/g, '""')}"`,
        `"${s.problemStatementTitle.replace(/"/g, '""')}"`,
        s.status,
        s.evaluationScore || '',
        `"${(s.rank || '').replace(/"/g, '""')}"`,
        s.githubUrl || '',
        s.demoUrl || '',
        s.submittedAt || s.updatedAt
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KIT_Hackathon_Submissions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('info', 'Export Successful', 'Downloaded submissions evaluation roster.');
  };

  // Find team for currently selected submission
  const currentTeam = selectedSubmission
    ? teams.find(
        (t) =>
          t.id === selectedSubmission.teamId ||
          t.name.toLowerCase() === selectedSubmission.teamName.toLowerCase()
      )
    : null;

  const getStatusBadge = (status: SubmissionStatus, isDraft: boolean) => {
    if (isDraft || status === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3 h-3" />
          <span>Draft</span>
        </span>
      );
    }
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Submitted</span>
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            <Clock className="w-3 h-3" />
            <span>Under Review</span>
          </span>
        );
      case 'SHORTLISTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <Award className="w-3 h-3" />
            <span>Shortlisted</span>
          </span>
        );
      case 'EVALUATED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
            <Star className="w-3 h-3 fill-indigo-600" />
            <span>Evaluated</span>
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* PageHeader (Section 11: Project Submissions) */}
      <PageHeader
        title="Project Submissions"
        description="Monitor team project deliverables, problem statements, source repositories, and jury evaluation results."
        category="COLLEGE SUBMISSION MONITORING"
        badge={`${filteredSubmissions.length} Projects`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Evaluation CSV
          </Button>
        }
      />

      {/* Top 6 Statistics Cards (Section 26 requirement: Total, Draft, Submitted, Under Review, Shortlisted, Evaluated) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold font-display text-navy-950 mt-1">{totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">All projects</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Draft</p>
          <p className="text-2xl font-bold font-display text-amber-900 mt-1">{draftCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">In progress</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Submitted</p>
          <p className="text-2xl font-bold font-display text-blue-900 mt-1">{submittedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Ready for jury</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Under Review</p>
          <p className="text-2xl font-bold font-display text-purple-900 mt-1">{underReviewCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Jury assigned</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Shortlisted</p>
          <p className="text-2xl font-bold font-display text-emerald-900 mt-1">{shortlistedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Finalist stage</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Evaluated</p>
          <p className="text-2xl font-bold font-display text-indigo-900 mt-1">{evaluatedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Scored & ranked</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project, team, track, tech..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-navy-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedHackathon}
            onChange={(e) => setSelectedHackathon(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
          >
            <option value="ALL">All Hackathons</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="EVALUATED">Evaluated</option>
          </select>
        </div>
      </div>

      {/* Submissions Table (Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        {/* Desktop Table (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 bg-slate-50">Project Name</th>
                <th className="px-5 py-3.5 bg-slate-50">Team</th>
                <th className="px-5 py-3.5 bg-slate-50">Hackathon</th>
                <th className="px-5 py-3.5 bg-slate-50">Submitted By</th>
                <th className="px-5 py-3.5 bg-slate-50">Submission Time</th>
                <th className="px-5 py-3.5 bg-slate-50 text-center">Submission Status</th>
                <th className="px-5 py-3.5 bg-slate-50 text-center">Evaluation Status</th>
                <th className="px-5 py-3.5 bg-slate-50 text-center">Result</th>
                <th className="px-5 py-3.5 text-right bg-slate-50">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <FileCode className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No project submissions match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const hackathon = hackathons.find((h) => h.id === sub.hackathonId);
                  const submitterStudent = students.find((st) => st.uid === sub.submittedBy);

                  // Evaluation status
                  const evaluationStatus = sub.evaluationScore ? 'Evaluated' : 'Under Evaluation';

                  // Result
                  const resultBadge =
                    sub.status === 'WINNER'
                      ? 'Winner'
                      : sub.status === 'SHORTLISTED'
                      ? 'Shortlisted'
                      : sub.evaluationScore
                      ? `${sub.evaluationScore}/100`
                      : 'Pending';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Project Name */}
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900 text-sm block">
                          {sub.projectTitle}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs mt-0.5">
                          {sub.problemStatementTitle}
                        </span>
                      </td>

                      {/* Team */}
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-blue-700 block">{sub.teamName}</span>
                      </td>

                      {/* Hackathon */}
                      <td className="px-5 py-3.5 font-medium text-slate-800 max-w-[160px] truncate" title={hackathon?.title}>
                        {hackathon?.title}
                      </td>

                      {/* Submitted By */}
                      <td className="px-5 py-3.5 text-slate-700">
                        <span className="font-medium block">{submitterStudent?.name || 'Team Lead'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{submitterStudent?.registerNumber || 'Student Lead'}</span>
                      </td>

                      {/* Submission Time */}
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Draft In-Progress'}
                      </td>

                      {/* Submission Status */}
                      <td className="px-5 py-3.5 text-center">
                        {getStatusBadge(sub.status, sub.isDraft)}
                      </td>

                      {/* Evaluation Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            evaluationStatus === 'Evaluated'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {evaluationStatus}
                        </span>
                      </td>

                      {/* Result */}
                      <td className="px-5 py-3.5 text-center font-bold">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            resultBadge === 'Winner'
                              ? 'bg-amber-100 text-amber-800'
                              : resultBadge === 'Shortlisted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {resultBadge}
                        </span>
                      </td>

                      {/* Action: View Submission (Section 11 requirement) */}
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenReview(sub)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View Submission
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards Layout (Section 21) */}
        <div className="block md:hidden p-4 space-y-3">
          {filteredSubmissions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching project submissions found.
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const hackathon = hackathons.find((h) => h.id === sub.hackathonId);

              return (
                <div key={sub.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-700 text-xs font-mono">{sub.teamName}</span>
                    {getStatusBadge(sub.status, sub.isDraft)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{sub.projectTitle}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{sub.problemStatementTitle}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{hackathon?.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sub.technologies.slice(0, 4).map((tech, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div>
                      {sub.evaluationScore ? (
                        <div className="flex items-center gap-1 text-xs font-bold font-mono text-slate-800">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{sub.evaluationScore}/100</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unrated</span>
                      )}
                    </div>
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleOpenReview(sub)}
                      leftIcon={<Award className="w-3.5 h-3.5" />}
                    >
                      Evaluate
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{filteredSubmissions.length}</strong> of <strong>{submissions.length}</strong> project submissions
          </span>
          <span className="font-medium text-slate-400">Jury evaluation portal active</span>
        </div>
      </div>

      {/* Submission Detail & Evaluation Modal (Section 26 requirement: Project, Team, Members, Description, Technology, Links, Files, Evaluation) */}
      {selectedSubmission && (
        <Modal
          isOpen={Boolean(selectedSubmission)}
          onClose={() => setSelectedSubmission(null)}
          title={`Submission Audit: ${selectedSubmission.projectTitle}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-700 py-1">
            {/* Top Project Banner */}
            <div className="p-4 rounded-xl bg-navy-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-cyan-300">
                  {selectedSubmission.problemStatementTitle}
                </span>
                <h3 className="text-lg font-bold font-display text-white mt-0.5">
                  {selectedSubmission.projectTitle}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Submitted by team <strong className="text-white">{selectedSubmission.teamName}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedSubmission.status, selectedSubmission.isDraft)}
              </div>
            </div>

            {/* Team & Members Section */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Team Composition & Registered Authors
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {currentTeam?.members.length || 0} Members
                </span>
              </div>
              {currentTeam ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentTeam.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-center gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-navy-900 text-white font-bold flex items-center justify-center text-xs">
                        {m.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 text-xs truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {m.registerNumber} • {m.department}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Team {selectedSubmission.teamName} (Roster ID: {selectedSubmission.teamId})
                </p>
              )}
            </div>

            {/* Description & Technical Solution */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Project Description
                </label>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedSubmission.description}
                </p>
              </div>

              {selectedSubmission.solution && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Engineering Solution & Architecture
                  </label>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                    {selectedSubmission.solution}
                  </p>
                </div>
              )}
            </div>

            {/* Technology Stack */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Technology Stack
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selectedSubmission.technologies.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Links & Uploaded Files */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  External Repositories & URLs
                </label>
                <div className="space-y-2">
                  {selectedSubmission.githubUrl && (
                    <a
                      href={selectedSubmission.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-navy-900 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-medium text-slate-800 truncate">
                        <Code className="w-4 h-4 text-slate-600" />
                        GitHub Repository
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                  {selectedSubmission.demoUrl && (
                    <a
                      href={selectedSubmission.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-navy-900 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-medium text-blue-700 truncate">
                        <Globe className="w-4 h-4 text-blue-600" />
                        Live Web Deployment
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Uploaded Artifacts & Files
                </label>
                <div className="space-y-2">
                  {selectedSubmission.fileUrl && (
                    <a
                      href={selectedSubmission.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-navy-900 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-medium text-blue-700 truncate">
                        <FileCode className="w-4 h-4 text-blue-600" />
                        {selectedSubmission.fileName || 'Cloudinary Project Artifact'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                  {selectedSubmission.files?.map((f: any, idx: number) => (
                    f.url && f.url !== selectedSubmission.fileUrl ? (
                      <a
                        key={idx}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-navy-900 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-medium text-slate-700 truncate">
                          <FileCode className="w-4 h-4 text-slate-600" />
                          {f.name || `Artifact #${idx + 1}`}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    ) : null
                  ))}
                  {selectedSubmission.presentationUrl && (
                    <a
                      href={selectedSubmission.presentationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-navy-900 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-medium text-amber-700 truncate">
                        <FileText className="w-4 h-4 text-amber-600" />
                        Slide Deck (PDF)
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                  {selectedSubmission.reportUrl && (
                    <a
                      href={selectedSubmission.reportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-navy-900 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-medium text-slate-700 truncate">
                        <FileCode className="w-4 h-4 text-slate-600" />
                        Project Technical Report
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                  {selectedSubmission.demoVideoUrl && (
                    <a
                      href={selectedSubmission.demoVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-navy-900 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-medium text-rose-700 truncate">
                        <Video className="w-4 h-4 text-rose-600" />
                        Recorded Demo Video
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                  {!selectedSubmission.fileUrl &&
                    !selectedSubmission.files?.length &&
                    !selectedSubmission.presentationUrl &&
                    !selectedSubmission.reportUrl &&
                    !selectedSubmission.demoVideoUrl && (
                      <p className="text-[11px] text-slate-400 italic p-2">No files attached to this submission.</p>
                    )}
                </div>
              </div>
            </div>

            {/* Evaluation Form */}
            <form
              onSubmit={handleSaveEvaluation}
              className="mt-4 pt-4 border-t border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-2 text-navy-950 font-bold font-display text-sm">
                <Award className="w-4 h-4 text-amber-500" />
                Jury Evaluation Rubric & Scoring
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Jury Numerical Score (0 - 100)"
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  required
                />

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Review Status
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as SubmissionStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-navy-900"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="EVALUATED">Evaluated</option>
                  </select>
                </div>

                <Input
                  label="Honors / Rank Placement"
                  placeholder="e.g. Grand Winner, Top 5 Finalist"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                />
              </div>

              <Textarea
                label="Evaluator Remarks & Recommendations"
                placeholder="Technical feasibility, adherence to problem track, innovation index, code quality..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isLoading}>
                  Save Evaluation & Score
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
