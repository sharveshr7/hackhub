import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { hackathonService } from '../../services/hackathonService';
import { Input, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import {
  CalendarDays,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Layers,
  Award,
  Shield,
  HelpCircle,
  Save,
  CheckCircle2,
  FileText,
  Clock,
  Users,
  Image,
  BookOpen
} from 'lucide-react';
import { HackathonStatus, ProblemStatement, Prize, EvaluationCriterion, FAQItem } from '../../types';

export const AdminCreateHackathonPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Active Section (1 to 10)
  const [activeSection, setActiveSection] = useState<number>(1);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('Just now');

  // Form Fields
  // 1. Basic Information
  const [title, setTitle] = useState('CodeForge 2026: Campus DevMarathon');
  const [tagline, setTagline] = useState('Full-Stack Web & AI Engineering Marathon');
  const [shortDescription, setShortDescription] = useState('A 24-hour rapid product development sprint for undergraduate student developers.');
  const [description, setDescription] = useState('CodeForge 2026 brings together the brightest undergraduate coders to build production-ready full-stack applications. Sponsored by departmental industry liaisons.');
  const [organizer, setOrganizer] = useState('Department of Computer Science & Engineering');

  // 2. Schedule
  const [registrationStart, setRegistrationStart] = useState('2026-10-01T00:00');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-10-20T23:59');
  const [eventStart, setEventStart] = useState('2026-10-25T09:00');
  const [eventEnd, setEventEnd] = useState('2026-10-26T17:00');
  const [submissionDeadline, setSubmissionDeadline] = useState('2026-10-26T12:00');
  const [venue, setVenue] = useState('Campus Computing Centre, Lab 1 & 2');
  const [mode, setMode] = useState<'IN_PERSON' | 'HYBRID' | 'VIRTUAL'>('IN_PERSON');

  // 3. Eligibility
  const [eligibility, setEligibility] = useState<string[]>([
    'Currently enrolled KIT undergraduate and postgraduate engineering students',
    'Open to B.E., B.Tech, and M.Tech across all departments',
    'Valid College ID card mandatory at entry gate'
  ]);
  const [newEligibility, setNewEligibility] = useState('');

  // 4. Team Configuration
  const [minTeamSize, setMinTeamSize] = useState(2);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [allowInterdepartmental, setAllowInterdepartmental] = useState(true);

  // 5. Rules
  const [rules, setRules] = useState<string[]>([
    'All code and solution artifacts must be authored during the active sprint hours.',
    'Teams must maintain 2 to 4 registered members throughout the competition.',
    'Third-party libraries and APIs are permitted; plagiarism results in immediate disqualification.',
    'Final prototype demonstrations must be uploaded before the submission deadline.'
  ]);
  const [newRule, setNewRule] = useState('');

  // 6. Prizes
  const [prizePool, setPrizePool] = useState('₹60,000');
  const [prizes, setPrizes] = useState<Prize[]>([
    { title: 'Grand Winner (1st Place)', reward: '₹35,000 + Winner Trophy + Citations' },
    { title: 'First Runner Up (2nd Place)', reward: '₹20,000 + Medals + Certificates' },
    { title: 'Best Clean Architecture Track', reward: '₹5,000 + Departmental Special Award' }
  ]);

  // 7. Evaluation
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriterion[]>([
    { parameter: 'Technical Innovation & Architecture', weightage: '40%', description: 'System design, algorithm optimality, and edge resilience' },
    { parameter: 'Working Prototype & UI Polish', weightage: '35%', description: 'Functional execution, responsiveness, and user experience' },
    { parameter: 'Presentation & Defense', weightage: '25%', description: 'Pitch clarity, problem justification, and jury Q&A' }
  ]);

  // 8. Problem Statements
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([
    {
      id: 'ps-cf-1',
      title: 'Automated Student Attendance & Hall Ticket Generator',
      domain: 'Full Stack & Security',
      description: 'Build a secure, tamper-proof QR hall ticket verification web portal with real-time check-in syncing.',
      expectedOutcome: 'Mobile web scanner with offline caching capabilities and cryptographic signature validation.'
    },
    {
      id: 'ps-cf-2',
      title: 'Distributed Campus Energy Demand Forecaster',
      domain: 'IoT & Machine Learning',
      description: 'Predict laboratory HVAC and power surges from past hourly sensor telemetry data.',
      expectedOutcome: 'Interactive time-series dashboard with proactive peak load shedding alerts.'
    }
  ]);

  // 9. FAQ
  const [faq, setFaq] = useState<FAQItem[]>([
    { question: 'Who is eligible to participate?', answer: 'All verified students of KalaignarKarunanidhi Institute Of Technology across B.E./B.Tech/M.Tech programs.' },
    { question: 'Can teammates belong to different departments?', answer: 'Yes! Interdisciplinary teams (e.g. CSE + Biomedical + ECE) are encouraged.' },
    { question: 'Will hardware/IoT kits be provided?', answer: 'Basic microcontrollers and sensor kits can be requested from the Innovation Lab.' }
  ]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  // 10. Media
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80');

  const [status, setStatus] = useState<HackathonStatus>('REGISTRATION_OPEN');
  const [isLoading, setIsLoading] = useState(false);

  const sections = [
    { num: 1, name: 'Basic Info', icon: <FileText className="w-3.5 h-3.5" /> },
    { num: 2, name: 'Schedule', icon: <Clock className="w-3.5 h-3.5" /> },
    { num: 3, name: 'Eligibility', icon: <Shield className="w-3.5 h-3.5" /> },
    { num: 4, name: 'Teams', icon: <Users className="w-3.5 h-3.5" /> },
    { num: 5, name: 'Rules', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { num: 6, name: 'Prizes', icon: <Award className="w-3.5 h-3.5" /> },
    { num: 7, name: 'Evaluation', icon: <Layers className="w-3.5 h-3.5" /> },
    { num: 8, name: 'Problems', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { num: 9, name: 'FAQ', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { num: 10, name: 'Media', icon: <Image className="w-3.5 h-3.5" /> }
  ];

  const handleAutosave = () => {
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    addToast('Hackathon configuration draft saved.', 'info');
  };

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      await hackathonService.createHackathon({
        title,
        tagline,
        shortDescription,
        description,
        organizer,
        bannerUrl,
        registrationStart: new Date(registrationStart).toISOString(),
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        eventStart: new Date(eventStart).toISOString(),
        eventEnd: new Date(eventEnd).toISOString(),
        submissionDeadline: new Date(submissionDeadline).toISOString(),
        venue,
        location: 'Coimbatore, Tamil Nadu',
        mode,
        minTeamSize: Number(minTeamSize),
        maxTeamSize: Number(maxTeamSize),
        eligibility,
        rules,
        prizes,
        prizePool,
        problemStatements,
        evaluationCriteria,
        faq,
        status,
        attendanceOpen: false,
        attendanceCode: 'CODEFORGE26'
      });

      addToast(`Hackathon "${title}" published successfully!`, 'success');
      navigate('/admin/hackathons');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
      setIsPublishDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div>
        <Link
          to="/admin/hackathons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hackathons</span>
        </Link>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <span>Section {activeSection} of 10</span>
              <span>•</span>
              <span className="text-slate-400">Autosaved at {lastSaved}</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-navy-950">
              Create College Hackathon
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured multi-section configuration for official campus tech events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAutosave}
              variant="outline"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => setIsPublishDialogOpen(true)}
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Publish Event
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar & Section Stepper Tabs (Section 22 Requirements) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-navy-950">Creation Progress</span>
          <span className="font-semibold text-blue-600">{activeSection * 10}% Complete</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${activeSection * 10}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2">
          {sections.map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setActiveSection(s.num)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeSection === s.num
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {s.icon}
              <span>{s.num}. {s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Multi-Section Form Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {/* 1. Basic Information */}
        {activeSection === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              1. Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hackathon Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Input
                label="Tagline / Domain"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. AI • Web • Cloud Systems"
              />
            </div>
            <Input
              label="Host Department / Organizer"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              required
            />
            <Input
              label="Short Description (Appears on Hackathon Cards)"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              required
            />
            <Textarea
              label="Full Hackathon Overview & Scope"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>
        )}

        {/* 2. Schedule */}
        {activeSection === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              2. Schedule & Venue Logistics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Registration Start"
                type="datetime-local"
                value={registrationStart}
                onChange={(e) => setRegistrationStart(e.target.value)}
                required
              />
              <Input
                label="Registration Deadline"
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                required
              />
              <Input
                label="Submission Deadline"
                type="datetime-local"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                required
              />
              <Input
                label="Hackathon Kick-off"
                type="datetime-local"
                value={eventStart}
                onChange={(e) => setEventStart(e.target.value)}
                required
              />
              <Input
                label="Hackathon Finale & Results"
                type="datetime-local"
                value={eventEnd}
                onChange={(e) => setEventEnd(e.target.value)}
                required
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Event Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="IN_PERSON">In-Person (On Campus)</option>
                  <option value="HYBRID">Hybrid (Campus + Online)</option>
                  <option value="VIRTUAL">Virtual / Online</option>
                </select>
              </div>
            </div>
            <Input
              label="Physical Venue / Location"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
            />
          </div>
        )}

        {/* 3. Eligibility */}
        {activeSection === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              3. Eligibility Criteria
            </h2>
            <div className="space-y-2">
              {eligibility.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => setEligibility(eligibility.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add eligibility requirement..."
                value={newEligibility}
                onChange={(e) => setNewEligibility(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newEligibility.trim()) {
                    setEligibility([...eligibility, newEligibility.trim()]);
                    setNewEligibility('');
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* 4. Team Configuration */}
        {activeSection === 4 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              4. Team Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Minimum Team Size"
                type="number"
                min={1}
                max={6}
                value={minTeamSize}
                onChange={(e) => setMinTeamSize(Number(e.target.value))}
                required
              />
              <Input
                label="Maximum Team Size"
                type="number"
                min={1}
                max={6}
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="interdept"
                checked={allowInterdepartmental}
                onChange={(e) => setAllowInterdepartmental(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <label htmlFor="interdept" className="text-xs font-medium text-slate-700">
                Allow Inter-Departmental Teams (Students from different disciplines can team up)
              </label>
            </div>
          </div>
        )}

        {/* 5. Rules */}
        {activeSection === 5 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              5. Official Rules & Conduct Guidelines
            </h2>
            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{idx + 1}. {rule}</span>
                  <button
                    type="button"
                    onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-700 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter competition rule or code of conduct guideline..."
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newRule.trim()) {
                    setRules([...rules, newRule.trim()]);
                    setNewRule('');
                  }
                }}
              >
                Add Rule
              </Button>
            </div>
          </div>
        )}

        {/* 6. Prizes */}
        {activeSection === 6 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              6. Prize Pool & Rewards
            </h2>
            <Input
              label="Total Cumulative Prize Pool"
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              placeholder="e.g. ₹50,000"
            />
            <div className="space-y-3">
              {prizes.map((p, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <Input
                    label="Position / Title"
                    value={p.title}
                    onChange={(e) => {
                      const updated = [...prizes];
                      updated[idx].title = e.target.value;
                      setPrizes(updated);
                    }}
                  />
                  <Input
                    label="Cash Reward / Perks"
                    value={p.reward}
                    onChange={(e) => {
                      const updated = [...prizes];
                      updated[idx].reward = e.target.value;
                      setPrizes(updated);
                    }}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrizes([...prizes, { title: 'Special Recognition Track', reward: '₹5,000 + Certificate' }])}
            >
              + Add Prize Tier
            </Button>
          </div>
        )}

        {/* 7. Evaluation */}
        {activeSection === 7 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              7. Evaluation Criteria & Scoring Weights
            </h2>
            <div className="space-y-3">
              {evaluationCriteria.map((crit, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <Input
                    label="Parameter"
                    value={crit.parameter}
                    onChange={(e) => {
                      const updated = [...evaluationCriteria];
                      updated[idx].parameter = e.target.value;
                      setEvaluationCriteria(updated);
                    }}
                  />
                  <Input
                    label="Weightage (%)"
                    value={crit.weightage}
                    onChange={(e) => {
                      const updated = [...evaluationCriteria];
                      updated[idx].weightage = e.target.value;
                      setEvaluationCriteria(updated);
                    }}
                  />
                  <Input
                    label="Description / Focus"
                    value={crit.description}
                    onChange={(e) => {
                      const updated = [...evaluationCriteria];
                      updated[idx].description = e.target.value;
                      setEvaluationCriteria(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Problem Statements */}
        {activeSection === 8 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              8. Problem Statements
            </h2>
            <div className="space-y-4">
              {problemStatements.map((ps, idx) => (
                <div key={ps.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Track {idx + 1}</span>
                    {problemStatements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setProblemStatements(problemStatements.filter((p) => p.id !== ps.id))}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Track Title"
                      value={ps.title}
                      onChange={(e) => {
                        const updated = [...problemStatements];
                        updated[idx].title = e.target.value;
                        setProblemStatements(updated);
                      }}
                    />
                    <Input
                      label="Domain"
                      value={ps.domain}
                      onChange={(e) => {
                        const updated = [...problemStatements];
                        updated[idx].domain = e.target.value;
                        setProblemStatements(updated);
                      }}
                    />
                  </div>
                  <Textarea
                    label="Problem Framing"
                    value={ps.description}
                    onChange={(e) => {
                      const updated = [...problemStatements];
                      updated[idx].description = e.target.value;
                      setProblemStatements(updated);
                    }}
                    rows={2}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setProblemStatements([
                  ...problemStatements,
                  {
                    id: `ps-${Date.now()}`,
                    title: 'New Innovative Challenge Track',
                    domain: 'Computing & IoT',
                    description: 'Detail the challenge prompt for contestants...',
                    expectedOutcome: 'Functional minimum viable prototype.'
                  }
                ])
              }
            >
              + Add Track Problem
            </Button>
          </div>
        )}

        {/* 9. FAQ */}
        {activeSection === 9 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              9. Frequently Asked Questions (FAQ)
            </h2>
            <div className="space-y-3">
              {faq.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-navy-950">{item.question}</span>
                    <button
                      type="button"
                      onClick={() => setFaq(faq.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <Input
                label="Question"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                placeholder="e.g. Can final year students register?"
              />
              <Textarea
                label="Answer"
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                rows={2}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newFaqQ.trim() && newFaqA.trim()) {
                    setFaq([...faq, { question: newFaqQ.trim(), answer: newFaqA.trim() }]);
                    setNewFaqQ('');
                    setNewFaqA('');
                  }
                }}
              >
                Add FAQ Item
              </Button>
            </div>
          </div>
        )}

        {/* 10. Media */}
        {activeSection === 10 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
              10. Media & Publication Assets
            </h2>
            <Input
              label="Banner Image URL"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              required
            />
            {bannerUrl && (
              <div className="rounded-xl overflow-hidden h-40 max-w-md border border-slate-200">
                <img src={bannerUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <Input
              label="Square Badge / Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
        )}

        {/* Step Navigation Bottom Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveSection(Math.max(1, activeSection - 1))}
            disabled={activeSection === 1}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center gap-2">
            {activeSection < 10 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setActiveSection(activeSection + 1)}
              >
                <span>Next Section</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsPublishDialogOpen(true)}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Review & Publish Hackathon
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog before Publishing (Section 22 Requirement) */}
      <ConfirmDialog
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        onConfirm={handlePublish}
        title="Publish Official College Hackathon?"
        message={`Are you ready to publish "${title}"? Once published, students across all registered engineering departments will be able to view and register for this event.`}
        confirmText="Confirm & Publish"
        confirmVariant="primary"
        isLoading={isLoading}
      />
    </div>
  );
};
