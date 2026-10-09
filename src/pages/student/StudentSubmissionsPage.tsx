import React, { useState, useRef } from 'react';
import { useAppStore } from '../../lib/store';
import { submissionService } from '../../services/submissionService';
import { cloudinaryService } from '../../services/cloudinaryService';
import { Input, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import confetti from 'canvas-confetti';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  GitBranch,
  Globe,
  Film,
  Presentation,
  Check,
  AlertCircle,
  Users,
  ShieldCheck,
  Lock,
  Layers,
  FileCode,
  ListChecks,
  ExternalLink,
  CircleDot,
  Archive,
  FolderArchive
} from 'lucide-react';

interface UploadedFileItem {
  id: string;
  type: 'PPT' | 'REPORT' | 'VIDEO' | 'ARCHIVE' | 'OTHER';
  name: string;
  size: string;
  progress: number;
  url?: string;
  path?: string;
  cloudinaryPublicId?: string;
  resourceType?: string;
}

export const StudentSubmissionsPage: React.FC = () => {
  const { currentUser, submissions, hackathons, teams, registrations } = useAppStore();
  const { addToast } = useToast();

  const student = currentUser?.studentData;

  // Active hackathon & team
  const studentRegs = registrations.filter((r) => r.studentId === student?.uid);
  const currentHackathon =
    hackathons.find((h) => studentRegs.some((r) => r.hackathonId === h.id)) ||
    (hackathons.length > 0 ? hackathons[0] : null);

  const currentTeam = teams.find(
    (t) => t.hackathonId === currentHackathon?.id && t.members?.some((m) => m.studentId === student?.uid)
  );

  // Existing submission
  const existingSubmission = submissions.find(
    (s) => s.hackathonId === currentHackathon?.id && s.teamId === currentTeam?.id
  );

  // Stepper state: 1. Project -> 2. Technology & Links -> 3. Files -> 4. Review & Submit
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [projectName, setProjectName] = useState(
    existingSubmission?.projectTitle || ''
  );
  const [problemStatementId, setProblemStatementId] = useState(
    existingSubmission?.problemStatementId || ''
  );
  const [description, setDescription] = useState(
    existingSubmission?.description || ''
  );
  const [solution, setSolution] = useState(
    existingSubmission?.solution || ''
  );
  const [techStackInput, setTechStackInput] = useState(
    existingSubmission?.technologies?.join(', ') || existingSubmission?.techStack?.join(', ') || ''
  );
  const [githubUrl, setGithubUrl] = useState(
    existingSubmission?.githubUrl || ''
  );
  const [demoUrl, setDemoUrl] = useState(
    existingSubmission?.demoUrl || existingSubmission?.liveDemoUrl || ''
  );
  const [presentationUrl, setPresentationUrl] = useState(
    existingSubmission?.presentationUrl || ''
  );

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>(
    ((existingSubmission?.files as any) || [])
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'PPT' | 'REPORT' | 'VIDEO' | 'ARCHIVE' | 'OTHER'>('REPORT');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isFinalSubmitted = Boolean(existingSubmission && !existingSubmission.isDraft);

  const triggerFileUpload = (type: 'PPT' | 'REPORT' | 'VIDEO' | 'ARCHIVE' | 'OTHER') => {
    setUploadType(type);
    if (fileInputRef.current) {
      if (type === 'PPT') fileInputRef.current.accept = '.ppt,.pptx';
      else if (type === 'REPORT') fileInputRef.current.accept = '.pdf,.doc,.docx';
      else if (type === 'VIDEO') fileInputRef.current.accept = '.mp4,.webm';
      else fileInputRef.current.accept = '.zip,.pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser || !student) {
      addToast('Authentication required. Please log in as a student.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!currentHackathon || !currentTeam) {
      addToast('Active hackathon and team required for file upload.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Cloudinary pre-upload validation
    const validation = cloudinaryService.validateSubmissionFile(file);
    if (!validation.valid) {
      addToast(validation.error || 'File validation failed.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);

    try {
      const uploaded = await submissionService.uploadSubmissionFile(
        currentTeam.id,
        file,
        currentHackathon.id,
        (progress) => setUploadProgress(progress)
      );

      const newFile: UploadedFileItem = {
        id: `file-${Date.now()}`,
        type: uploadType,
        name: uploaded.name,
        size: uploaded.size,
        progress: 100,
        url: uploaded.url,
        path: uploaded.path,
        cloudinaryPublicId: uploaded.cloudinaryPublicId,
        resourceType: uploaded.resourceType
      };

      setUploadedFiles((prev) => [...prev, newFile]);
      addToast(`${uploaded.name} uploaded to Cloudinary successfully.`, 'success');
    } catch (err: any) {
      addToast(`Upload failed. Your submission was not recorded. ${err.message || 'Please try again.'}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadingFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    addToast('File artifact removed.', 'info');
  };

  const handleSaveDraft = async () => {
    if (!currentUser || !student) {
      addToast('Authentication required. Please sign in as a student.', 'error');
      return;
    }
    if (!currentHackathon || !currentTeam) {
      addToast('Active hackathon and team required to save submission draft.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const psTitle = currentHackathon.problemStatements?.find((ps) => ps.id === problemStatementId)?.title || 'General Track';
      await submissionService.saveSubmission({
        hackathonId: currentHackathon.id,
        teamId: currentTeam.id,
        teamName: currentTeam.name,
        projectTitle: projectName,
        projectName,
        problemStatementId,
        problemStatementTitle: psTitle,
        description,
        solution,
        technologies: techStackInput.split(',').map((t: string) => t.trim()).filter(Boolean),
        githubUrl,
        demoUrl,
        presentationUrl,
        files: uploadedFiles,
        fileName: uploadedFiles[0]?.name || '',
        fileUrl: uploadedFiles[0]?.url || '',
        cloudinaryPublicId: uploadedFiles[0]?.cloudinaryPublicId || uploadedFiles[0]?.path || '',
        fileSize: uploadedFiles[0]?.size || '',
        resourceType: uploadedFiles[0]?.resourceType || 'raw',
        isDraft: true
      });
      addToast('Project submission draft saved successfully.', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!currentUser || !student) {
      addToast('Authentication required. Please sign in as a student.', 'error');
      return;
    }
    if (!currentHackathon || !currentTeam) {
      addToast('Active hackathon and team required to submit project.', 'error');
      return;
    }

    // Verify student is registered for this hackathon
    const isRegistered = registrations.some(
      (r) => r.hackathonId === currentHackathon.id && r.studentId === student.uid
    );
    if (!isRegistered) {
      addToast('You must be registered for this hackathon to submit.', 'error');
      return;
    }

    // Verify student is a member of this team
    const isMember = currentTeam.members?.some((m) => m.studentId === student.uid);
    if (!isMember) {
      addToast('You must be a member of this team to submit.', 'error');
      return;
    }

    // Verify submission deadline
    const deadline = new Date(currentHackathon.submissionDeadline || currentHackathon.eventEnd);
    if (new Date() > deadline) {
      addToast('Project submission deadline has officially elapsed for this challenge.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const psTitle = currentHackathon.problemStatements?.find((ps) => ps.id === problemStatementId)?.title || 'General Track';
      await submissionService.saveSubmission({
        hackathonId: currentHackathon.id,
        teamId: currentTeam.id,
        teamName: currentTeam.name,
        projectTitle: projectName,
        projectName,
        problemStatementId,
        problemStatementTitle: psTitle,
        description,
        solution,
        technologies: techStackInput.split(',').map((t: string) => t.trim()).filter(Boolean),
        githubUrl,
        demoUrl,
        presentationUrl,
        files: uploadedFiles,
        fileName: uploadedFiles[0]?.name || '',
        fileUrl: uploadedFiles[0]?.url || '',
        cloudinaryPublicId: uploadedFiles[0]?.cloudinaryPublicId || uploadedFiles[0]?.path || '',
        fileSize: uploadedFiles[0]?.size || '',
        resourceType: uploadedFiles[0]?.resourceType || 'raw',
        isDraft: false,
        status: 'SUBMITTED'
      });
      confetti({ particleCount: 100, spread: 70 });
      addToast('Project successfully submitted for evaluation!', 'success');
      setIsConfirmModalOpen(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Live checklist evaluation
  const checklist = [
    { label: 'Project Title & Track Defined', valid: Boolean(projectName.trim() && problemStatementId) },
    { label: 'Solution Architecture Documented', valid: Boolean(solution.trim().length > 20) },
    { label: 'Tech Stack Configured', valid: Boolean(techStackInput.trim()) },
    { label: 'GitHub Repository Linked', valid: Boolean(githubUrl.startsWith('http')) },
    { label: 'Demonstration Artifact Uploaded', valid: uploadedFiles.length > 0 }
  ];
  const allChecklistValid = checklist.every((c) => c.valid);

  if (!currentHackathon) {
    return (
      <div className="space-y-6">
        <PageHeader
          category="PROJECT SUBMISSION CONSOLE"
          title="Project Submission"
          description="Submit your software source code, architectural whitepapers, presentation slide decks, and demo video walkthroughs for faculty jury evaluation."
        />
        <EmptyState
          title="No Registered Hackathons"
          description="You are not registered for any hackathons yet. Register for an ongoing hackathon to participate and submit projects."
          actionText="Browse Hackathons"
          onAction={() => window.location.assign('/student/hackathons')}
        />
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="space-y-6">
        <PageHeader
          category="PROJECT SUBMISSION CONSOLE"
          title="Project Submission"
          description={`Submit your project for ${currentHackathon.title}.`}
        />
        <EmptyState
          title="No Team Found"
          description={`You are registered for ${currentHackathon.title}, but project submissions must be made on behalf of a team squad. Form or join a team to proceed.`}
          actionText="Manage Team"
          onAction={() => window.location.assign('/student/team')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Page Header (Section 19: My Submissions) */}
      <PageHeader
        category="COLLEGIATE DELIVERABLES PORTAL"
        title="My Submissions"
        description="Submit your software source code, architectural whitepapers, presentation slide decks, and demo video walkthroughs for faculty jury evaluation."
        badge={
          isFinalSubmitted ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Submission Locked</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Draft In-Progress</span>
            </span>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            {!isFinalSubmitted && (
              <Button onClick={handleSaveDraft} variant="outline" size="sm" isLoading={isLoading}>
                Save Draft
              </Button>
            )}
            <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              Squad: <strong>{currentTeam.name}</strong>
            </div>
          </div>
        }
      />

      {/* 7 Required Summary Fields (Section 19 Requirement) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Active Submission Status</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Hackathon</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5" title={currentHackathon.title}>
              {currentHackathon.title}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Project</span>
            <span className="font-bold text-blue-600 truncate block mt-0.5" title={projectName || existingSubmission?.projectTitle}>
              {projectName || existingSubmission?.projectTitle || 'Untitled Project'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Team</span>
            <span className="font-semibold text-slate-900 truncate block mt-0.5">
              {currentTeam.name}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
            <span
              className={`font-bold block mt-0.5 ${
                isFinalSubmitted ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {existingSubmission?.status || (isFinalSubmitted ? 'SUBMITTED' : 'Pending')}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted At</span>
            <span className="font-medium text-slate-700 truncate block mt-0.5">
              {existingSubmission?.submittedAt
                ? new Date(existingSubmission.submittedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric'
                  })
                : 'Not Submitted'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Evaluation</span>
            <span className="font-medium text-slate-700 block mt-0.5">
              {existingSubmission?.evaluationScore ? 'Evaluated' : existingSubmission ? 'Under Review' : 'Awaiting Submission'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Result</span>
            <span className="font-bold text-purple-700 block mt-0.5 truncate">
              {existingSubmission?.status === 'WINNER'
                ? 'Winner'
                : existingSubmission?.status === 'SHORTLISTED'
                ? 'Shortlisted'
                : existingSubmission?.evaluationScore
                ? `${existingSubmission.evaluationScore}/100`
                : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN DESKTOP LAYOUT (SECTION 16) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Stepper + Form Sections (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stepper Navigation */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-subtle">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { step: 1, label: '1. Project Scope' },
                { step: 2, label: '2. Tech & Repos' },
                { step: 3, label: '3. File Artifacts' },
                { step: 4, label: '4. Summary & Lock' }
              ].map(({ step, label }) => (
                <button
                  key={step}
                  onClick={() => setCurrentStep(step)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    currentStep === step
                      ? 'bg-blue-600 text-white shadow-xs'
                      : currentStep > step
                      ? 'bg-slate-50 text-emerald-700 hover:bg-slate-100'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      currentStep === step
                        ? 'bg-white text-blue-600'
                        : currentStep > step
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {currentStep > step ? '✓' : step}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stepper Content */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-7 shadow-subtle">
            {/* STEP 1: Project Information */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-navy-950 mb-1">Step 1: Project Information</h3>
                  <p className="text-xs text-slate-500">
                    Define the problem statement, high-level scope, and engineering solution architecture.
                  </p>
                </div>

                <Input
                  label="Project Title"
                  placeholder="e.g. Smart Hospital Queue & Rapid Triage System"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Problem Statement Track
                  </label>
                  <select
                    value={problemStatementId}
                    onChange={(e) => setProblemStatementId(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                  >
                    <option value="">Select a Problem Statement / Track</option>
                    {currentHackathon.problemStatements && currentHackathon.problemStatements.length > 0 ? (
                      currentHackathon.problemStatements.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.title} ({ps.domain})
                        </option>
                      ))
                    ) : (
                      <option value="general-track">General Open Innovation Track</option>
                    )}
                  </select>
                </div>

                <Textarea
                  label="Problem Statement Framing"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the critical challenge your prototype addresses..."
                />

                <Textarea
                  label="Engineering Solution & Architecture"
                  rows={4}
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Detail your system design, model inference, and latency benchmarks..."
                />

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button onClick={() => setCurrentStep(2)} variant="primary" size="sm">
                    <span>Continue to Tech & Links</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Technology & Links */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-navy-950 mb-1">Step 2: Technology & Public Repositories</h3>
                  <p className="text-xs text-slate-500">
                    Connect your version control repository, live deployment URL, and presentation slide deck.
                  </p>
                </div>

                <Input
                  label="Technologies & Frameworks (Comma separated)"
                  placeholder="e.g. PyTorch, React, Node.js, Docker, FastAPI"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                  required
                  helperText="These tags will be verified by technical judges against your code repository."
                />

                <Input
                  label="GitHub / GitLab Repository URL"
                  placeholder="https://github.com/organization/project"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  leftIcon={<GitBranch className="w-4 h-4 text-slate-400" />}
                  required
                  helperText="Ensure repository permissions allow public read access for jury review."
                />

                <Input
                  label="Live Deployed Prototype URL"
                  placeholder="https://my-prototype.vercel.app"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  leftIcon={<Globe className="w-4 h-4 text-slate-400" />}
                  helperText="Optional staging URL for the evaluation jury to test in real time."
                />

                <Input
                  label="Presentation Deck URL (Google Slides / Canva / PDF)"
                  placeholder="https://docs.google.com/presentation/d/..."
                  value={presentationUrl}
                  onChange={(e) => setPresentationUrl(e.target.value)}
                  leftIcon={<Presentation className="w-4 h-4 text-slate-400" />}
                  helperText="Link to the slide deck prepared for the finale defense pitch."
                />

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Button onClick={() => setCurrentStep(1)} variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    <span>Back</span>
                  </Button>
                  <Button onClick={() => setCurrentStep(3)} variant="primary" size="sm">
                    <span>Continue to File Uploads</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: File Artifacts */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-navy-950 mb-1">Step 3: Document Artifacts & Video</h3>
                  <p className="text-xs text-slate-500">
                    Upload official PDF reports, architecture charts, and 3-minute video demonstrations.
                  </p>
                </div>

                {/* Upload Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('PPT')}
                    disabled={isUploading}
                    className="p-4 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl text-center transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <Presentation className="w-6 h-6 text-blue-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-navy-950 block">Upload Slides (.PPTX)</span>
                    <span className="text-[10px] text-slate-400">{isUploading ? 'Uploading...' : 'Max 60 MB'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileUpload('REPORT')}
                    disabled={isUploading}
                    className="p-4 border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 rounded-xl text-center transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <FileText className="w-6 h-6 text-emerald-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-navy-950 block">Upload Report (.PDF)</span>
                    <span className="text-[10px] text-slate-400">{isUploading ? 'Uploading...' : 'Max 60 MB'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileUpload('VIDEO')}
                    disabled={isUploading}
                    className="p-4 border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50/20 rounded-xl text-center transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <Film className="w-6 h-6 text-purple-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-navy-950 block">Upload Walkthrough (.MP4)</span>
                    <span className="text-[10px] text-slate-400">{isUploading ? 'Uploading...' : 'Max 60 MB'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileUpload('ARCHIVE')}
                    disabled={isUploading}
                    className="p-4 border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 rounded-xl text-center transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <Archive className="w-6 h-6 text-amber-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-navy-950 block">Upload Archive (.ZIP)</span>
                    <span className="text-[10px] text-slate-400">{isUploading ? 'Uploading...' : 'Max 60 MB'}</span>
                  </button>
                </div>

                {/* Cloudinary Live Upload Progress */}
                {isUploading && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between font-bold text-blue-900">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                        Uploading {uploadingFileName || 'artifact'} to Cloudinary...
                      </span>
                      <span className="font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-blue-700">Project file is uploading directly to Cloudinary storage.</p>
                  </div>
                )}

                {/* List of uploaded files */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-700">Uploaded Project Artifacts ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {f.type === 'PPT' ? (
                          <Presentation className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : f.type === 'VIDEO' ? (
                          <Film className="w-4 h-4 text-purple-600 shrink-0" />
                        ) : f.type === 'ARCHIVE' ? (
                          <Archive className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 truncate">{f.name}</span>
                        <span className="text-[10px] text-slate-400">({f.size})</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {f.url && (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 p-1 rounded inline-flex items-center gap-1 font-semibold text-[11px]"
                            title="Open Cloudinary file"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Cloudinary</span>
                          </a>
                        )}
                        <button
                          onClick={() => handleRemoveFile(f.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                          title="Remove file"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Button onClick={() => setCurrentStep(2)} variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    <span>Back</span>
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} variant="primary" size="sm">
                    <span>Proceed to Review Summary</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Review Summary & Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-navy-950 mb-1">Step 4: Review Everything Entered</h3>
                  <p className="text-xs text-slate-500">
                    Verify all entered information carefully before submitting. Final submission locks your code repository for jury review.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Project Title</span>
                    <p className="font-bold text-sm text-navy-950 mt-0.5">{projectName}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Track / Domain</span>
                      <p className="font-semibold text-slate-800 mt-0.5">Healthcare & Multimodal AI</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Team Squad</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{currentTeam.name}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tech Stack</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {techStackInput.split(',').map((t: string, idx: number) => (
                        <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Public Repository</span>
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>{githubUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Attached Cloudinary Files</span>
                    <div className="space-y-1">
                      {uploadedFiles.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No artifacts uploaded yet.</p>
                      ) : (
                        uploadedFiles.map((f) => (
                          <div key={f.id} className="flex items-center justify-between text-[11px] text-slate-700 p-1.5 rounded bg-white border border-slate-200">
                            <div className="flex items-center gap-2 truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-medium truncate">{f.name}</span>
                              <span className="text-slate-400 shrink-0">({f.size})</span>
                            </div>
                            {f.url && (
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-[10px] font-semibold inline-flex items-center gap-1 shrink-0 ml-2"
                              >
                                <span>Cloudinary Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Button onClick={() => setCurrentStep(3)} variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    <span>Back</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveDraft} variant="outline" size="sm">
                      Save Draft
                    </Button>
                    <Button
                      onClick={() => setIsConfirmModalOpen(true)}
                      variant="primary"
                      size="sm"
                      leftIcon={<Lock className="w-4 h-4" />}
                    >
                      Lock & Final Submit
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Submission Status, Deadlines & Readiness Checklist (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Submission Status & Timer Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Submission Status
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isFinalSubmitted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {isFinalSubmitted ? 'Submitted' : 'Draft'}
              </span>
            </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Event:</span>
                  <span className="font-semibold text-slate-800">{currentHackathon?.title}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Squad:</span>
                  <span className="font-semibold text-slate-800">{currentTeam?.name || 'No Squad Formed'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Deadline:</span>
                  <span className="font-semibold text-rose-600">
                    {currentHackathon?.submissionDeadline
                      ? new Date(currentHackathon.submissionDeadline).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : currentHackathon?.eventEnd
                      ? new Date(currentHackathon.eventEnd).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Closing Milestone'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    {(() => {
                      const dStr = currentHackathon?.submissionDeadline || currentHackathon?.eventEnd;
                      if (!dStr) return 'Active Competition';
                      const diff = new Date(dStr).getTime() - Date.now();
                      if (diff <= 0) return 'Deadline Cutoff Reached';
                      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      return `${d}d ${h}h Remaining`;
                    })()}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Submissions automatically lock after the cutoff. No commits permitted after final submission.
                </p>
              </div>
            </div>

          {/* Submission Readiness Checklist Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Readiness Checklist
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {checklist.filter((c) => c.valid).length} / {checklist.length}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {item.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <CircleDot className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span className={item.valid ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <Button
                onClick={() => setIsConfirmModalOpen(true)}
                variant="primary"
                size="sm"
                className="w-full"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                disabled={!allChecklistValid || isFinalSubmitted}
              >
                {isFinalSubmitted ? 'Submission Locked' : 'Finalize Submission'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog before Final Submission */}
      <ConfirmDialog
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleFinalSubmit}
        title="Submit Project for Final Jury Evaluation?"
        message="Are you sure you want to finalize your submission? Your repository code, architecture diagrams, and slide decks will be locked and directly delivered to the collegiate faculty jury."
        confirmText="Yes, Lock & Submit"
        confirmVariant="primary"
        isLoading={isLoading}
      />
    </div>
  );
};
