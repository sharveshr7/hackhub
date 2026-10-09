import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { notificationService } from '../../services/notificationService';
import { Input, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import {
  Megaphone,
  Plus,
  Trash2,
  AlertCircle,
  Bell,
  Search,
  Users,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Announcement } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';

export const AdminAnnouncementsPage: React.FC = () => {
  const announcements = useAppStore((state) => state.announcements);
  const hackathons = useAppStore((state) => state.hackathons);
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedHackathon, setSelectedHackathon] = useState<string>('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedHackathonId, setSelectedHackathonId] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'CRITICAL'>('NORMAL');
  const [target, setTarget] = useState<'ALL' | 'REGISTERED' | 'SPECIFIC_HACKATHON' | 'DEPT'>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Filtered list
  const filteredAnnouncements = announcements.filter((ann) => {
    if (selectedPriority !== 'ALL' && ann.priority !== selectedPriority) return false;
    if (selectedHackathon !== 'ALL' && ann.hackathonId !== selectedHackathon) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ann.title.toLowerCase().includes(q);
      const matchMsg = ann.message.toLowerCase().includes(q);
      const matchEvent = (ann.hackathonTitle || '').toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchEvent) return false;
    }
    return true;
  });

  const priorityWeight: Record<string, number> = { CRITICAL: 3, IMPORTANT: 2, NORMAL: 1 };
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const totalCount = announcements.length;
  const criticalCount = announcements.filter((a) => a.priority === 'CRITICAL').length;
  const importantCount = announcements.filter((a) => a.priority === 'IMPORTANT').length;
  const normalCount = announcements.filter((a) => a.priority === 'NORMAL').length;

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const hackathon = hackathons.find((h) => h.id === selectedHackathonId);
      await notificationService.createAnnouncement({
        title,
        message,
        hackathonId: selectedHackathonId || undefined,
        hackathonTitle: hackathon?.title,
        priority,
        target,
        status: 'ACTIVE'
      });

      showToast(
        'success',
        'Announcement Published',
        'Dispatched to target participant dashboard bulletin.'
      );
      setIsCreateModalOpen(false);
      setTitle('');
      setMessage('');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsLoading(true);
    try {
      await notificationService.deleteAnnouncement(deleteTargetId);
      showToast('success', 'Deleted', 'Announcement removed from bulletin.');
      setDeleteTargetId(null);
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (p: 'NORMAL' | 'IMPORTANT' | 'CRITICAL') => {
    switch (p) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            CRITICAL
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            IMPORTANT
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <Info className="w-3 h-3 text-blue-600" />
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        category="CAMPUS COMMUNICATIONS"
        title="Institutional Announcements"
        description="Broadcast official campus advisories, venue logistics, Wi-Fi credentials, and schedule notifications to hackathon participants."
        count={announcements.length}
        countLabel="Total Bulletins"
        actions={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            leftIcon={<Plus className="w-4 h-4 text-cyan-400" />}
          >
            Create Announcement
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Bulletins</p>
          <p className="text-2xl font-bold font-display text-navy-950 mt-1">{totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Published campus alerts</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Critical Alerts</p>
          <p className="text-2xl font-bold font-display text-rose-900 mt-1">{criticalCount}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Urgent notifications</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Important Notices</p>
          <p className="text-2xl font-bold font-display text-amber-900 mt-1">{importantCount}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Deadlines & logistics</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle">
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Normal Updates</p>
          <p className="text-2xl font-bold font-display text-blue-900 mt-1">{normalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">General info updates</p>
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
            placeholder="Search by title, text, or event..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-navy-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:border-navy-900"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="IMPORTANT">Important</option>
            <option value="NORMAL">Normal</option>
          </select>

          <select
            value={selectedHackathon}
            onChange={(e) => setSelectedHackathon(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:border-navy-900"
          >
            <option value="ALL">All Hackathons</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Announcements List Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Title & Message</th>
                <th className="px-6 py-4">Hackathon</th>
                <th className="px-6 py-4">Audience</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Published</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No announcements found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                sortedAnnouncements.map((ann) => (
                  <tr key={ann.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 max-w-sm">
                      <span className="font-bold text-slate-900 text-xs block mb-0.5">{ann.title}</span>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {ann.message}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-semibold text-blue-700 block text-xs">
                        {ann.hackathonTitle || 'Campus-wide'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {ann.target === 'ALL'
                          ? 'All Students'
                          : ann.target === 'REGISTERED'
                          ? 'Registered Only'
                          : ann.target === 'SPECIFIC_HACKATHON'
                          ? 'Event Specific'
                          : ann.target}
                      </span>
                    </td>

                    <td className="px-6 py-4">{getPriorityBadge(ann.priority)}</td>

                    <td className="px-6 py-4 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(ann.publishedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      <span className="block text-[10px] text-slate-400">
                        {new Date(ann.publishedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {ann.status || 'ACTIVE'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteTargetId(ann.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards View (Section 21 Requirement) */}
        <div className="block md:hidden p-4 space-y-3">
          {sortedAnnouncements.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No announcements found.</p>
            </div>
          ) : (
            sortedAnnouncements.map((ann) => (
              <div key={ann.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-blue-700 block">
                      {ann.hackathonTitle || 'Campus-wide'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{ann.title}</h4>
                  </div>
                  {getPriorityBadge(ann.priority)}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {ann.message}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                  <span className="bg-slate-200/70 px-2 py-0.5 rounded font-medium text-slate-700">
                    {ann.target === 'ALL' ? 'All Students' : ann.target === 'REGISTERED' ? 'Registered' : 'Specific'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      {new Date(ann.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setDeleteTargetId(ann.id)}
                      className="text-rose-600 hover:text-rose-800 font-semibold p-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Announcement Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Broadcast Institutional Announcement"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4 py-2 text-xs">
          <Input
            label="Announcement Title"
            placeholder="e.g. Venue Wi-Fi Credentials, Mentor Shift Timing"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label="Message Body"
            placeholder="Write clear, actionable details for participants..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 text-xs py-2 px-3 bg-white text-slate-800 focus:outline-none focus:border-navy-900"
              >
                <option value="NORMAL">Normal (Informative)</option>
                <option value="IMPORTANT">Important (Deadlines/Logistics)</option>
                <option value="CRITICAL">Critical (Urgent Alert)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Audience
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 text-xs py-2 px-3 bg-white text-slate-800 focus:outline-none focus:border-navy-900"
              >
                <option value="ALL">All Students</option>
                <option value="REGISTERED">Registered Students Only</option>
                <option value="SPECIFIC_HACKATHON">Specific Hackathon</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Associated Hackathon (Optional)
            </label>
            <select
              value={selectedHackathonId}
              onChange={(e) => setSelectedHackathonId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 text-xs py-2 px-3 bg-white text-slate-800 focus:outline-none focus:border-navy-900"
            >
              <option value="">General College Bulletin (No specific event)</option>
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Publish Announcement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Announcement?"
        message="This will remove the announcement from the student bulletin board immediately."
        variant="danger"
        confirmText="Delete"
        isLoading={isLoading}
      />
    </div>
  );
};
