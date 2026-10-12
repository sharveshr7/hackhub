import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { notificationService } from '../../services/notificationService';
import { Input, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import { isPlatformAdministrator } from '../../utils/access';
import {
  Bell,
  Send,
  Zap,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FolderGit2,
  Users,
  Trophy,
  CheckCircle2
} from 'lucide-react';

export const AdminNotificationsPage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const hackathons = useAppStore((state) => state.hackathons);
  const notifications = useAppStore((state) => state.notifications);
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'HACKATHON' | 'TEAM' | 'SUBMISSION' | 'DEADLINE' | 'ANNOUNCEMENT' | 'SYSTEM'>('DEADLINE');
  const [selectedHackathonId, setSelectedHackathonId] = useState('');
  const [isImportant, setIsImportant] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  if (!isPlatformAdministrator(currentUser)) return <Navigate to="/admin" replace />;

  // Exact prompt Section 29 presets
  const presets = [
    {
      title: 'Registration Closing Tomorrow',
      message: 'College hackathon registration closes tomorrow. Confirm your registration details before 11:59 PM.',
      category: 'DEADLINE' as const,
      isImportant: true
    },
    {
      title: 'Team Formation Notice',
      message: 'Your team is now complete. Review your roster roles and synchronize on problem statements.',
      category: 'TEAM' as const,
      isImportant: false
    },
    {
      title: 'Submission Deadline Approaching',
      message: 'Submission deadline is in 6 hours. Upload your slide decks and code repositories on time.',
      category: 'DEADLINE' as const,
      isImportant: true
    },
    {
      title: 'Jury Evaluation Update',
      message: 'Your project has been shortlisted for the final campus jury demonstration round.',
      category: 'SUBMISSION' as const,
      isImportant: true
    }
  ];

  const handleApplyPreset = (tmpl: typeof presets[0]) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setCategory(tmpl.category);
    setIsImportant(tmpl.isImportant);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await notificationService.sendNotification({
        title,
        message,
        category,
        isImportant
      });

      showToast(
        'success',
        'Notification Published',
        'Saved to the in-app notification center for students.'
      );
      setTitle('');
      setMessage('');
    } catch (err: any) {
      showToast('error', 'Broadcast Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'DEADLINE':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'TEAM':
        return <Users className="w-3.5 h-3.5 text-blue-500" />;
      case 'SUBMISSION':
        return <Trophy className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-cyan-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Unified PageHeader */}
      <PageHeader
        title="Campus Notification Center"
        description="Dispatch urgent deadline alerts, team updates, and submission milestones to student dashboards."
        category="Communications & Alerts"
        badge="Platform-wide Broadcast"
      />

      {/* Quick Presets */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Suggested Broadcast Presets (Section 29)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presets.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(tmpl)}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-subtle text-left text-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-slate-900 group-hover:text-blue-600">
                  {tmpl.title}
                </p>
                <span className="text-[10px] font-semibold text-slate-400 font-mono">
                  {tmpl.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                {tmpl.message}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Broadcast Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <Input
            label="Notification Title"
            placeholder="e.g. Hackathon registration closes tomorrow at 11:59 PM"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="Notification Message"
            placeholder="Write clear, concise notification text..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 text-xs py-2.5 px-3 bg-white text-slate-800 focus:outline-none focus:border-navy-900"
              >
                <option value="DEADLINE">Deadlines</option>
                <option value="HACKATHON">Hackathons</option>
                <option value="TEAM">Teams</option>
                <option value="SUBMISSION">Submissions</option>
                <option value="ANNOUNCEMENT">Announcements</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Associated Hackathon
              </label>
              <select
                value={selectedHackathonId}
                onChange={(e) => setSelectedHackathonId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 text-xs py-2.5 px-3 bg-white text-slate-800 focus:outline-none focus:border-navy-900"
              >
                <option value="">All Enrolled Students</option>
                {hackathons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>Highlight as High-Priority Banner (Elevated Student Alert)</span>
            </label>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Dispatched to real-time store + persistent client notifications
            </span>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={!title.trim() || !message.trim()}
              leftIcon={<Send className="w-4 h-4 text-cyan-400" />}
            >
              Trigger Broadcast
            </Button>
          </div>
        </form>
      </div>

      {/* Recent Dispatches Audit Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle">
        <h3 className="text-sm font-bold text-navy-950 font-display mb-4">
          Broadcast History (Audit Log)
        </h3>
        <div className="space-y-2.5">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No notifications dispatched yet.
            </div>
          ) : (
            notifications.slice(0, 6).map((n) => (
            <div
              key={n.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start justify-between gap-4 text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  {getCategoryIcon(n.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{n.title}</p>
                    {n.isImportant && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded">
                        PRIORITY
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
};
