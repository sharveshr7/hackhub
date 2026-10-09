import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { notificationService } from '../../services/notificationService';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Bell,
  CheckCheck,
  Calendar,
  Users,
  Send,
  Clock,
  Megaphone,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const StudentNotificationsPage: React.FC = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAppStore();
  const { addToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: 'HACKATHONS', label: 'Hackathons' },
    { id: 'TEAMS', label: 'Teams' },
    { id: 'SUBMISSIONS', label: 'Submissions' },
    { id: 'DEADLINES', label: 'Deadlines' },
    { id: 'ANNOUNCEMENTS', label: 'Announcements' }
  ];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (activeCategory !== 'ALL') {
      const matchPlural = n.category === activeCategory;
      const matchSingular = `${n.category}S` === activeCategory || n.category === activeCategory.slice(0, -1);
      if (!matchPlural && !matchSingular) return false;
    }
    if (filterUnreadOnly && n.isRead) return false;
    return true;
  });

  const getCategoryIcon = (cat: string) => {
    const c = cat.toUpperCase();
    if (c.includes('HACKATHON')) return <Calendar className="w-4 h-4 text-blue-600" />;
    if (c.includes('TEAM')) return <Users className="w-4 h-4 text-cyan-600" />;
    if (c.includes('SUBMISSION')) return <Send className="w-4 h-4 text-emerald-600" />;
    if (c.includes('DEADLINE')) return <Clock className="w-4 h-4 text-amber-600" />;
    if (c.includes('ANNOUNCEMENT')) return <Megaphone className="w-4 h-4 text-indigo-600" />;
    return <Bell className="w-4 h-4 text-slate-500" />;
  };

  const handleMarkAllRead = async () => {
    markAllNotificationsAsRead();
    addToast('All notifications marked as read.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Unified PageHeader */}
      <PageHeader
        title="Notification Center"
        description="Deadline reminders, team activity, submission reviews, and campus announcements."
        category="Updates & Alerts"
        badge={unreadCount > 0 ? `${unreadCount} Unread` : 'All caught up'}
        actions={
          <Button
            onClick={handleMarkAllRead}
            variant="outline"
            size="sm"
            leftIcon={<CheckCheck className="w-3.5 h-3.5 text-blue-600" />}
          >
            Mark All as Read
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filterUnreadOnly}
            onChange={(e) => setFilterUnreadOnly(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
          />
          <span>Unread Only</span>
        </label>
      </div>

      {/* Notification Items List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="You're all caught up."
            description="Try changing your category filters or search criteria."
          />
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => markNotificationAsRead(item.id)}
              className={`p-5 flex items-start gap-4 transition-colors cursor-pointer hover:bg-slate-50/80 ${
                !item.isRead ? 'bg-blue-50/20' : ''
              }`}
            >
              {/* Category Icon */}
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                {getCategoryIcon(item.category)}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-xs text-navy-950">{item.title}</span>

                  {item.priority === 'CRITICAL' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wide">
                      Urgent
                    </span>
                  )}
                  {item.priority === 'IMPORTANT' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                      Important
                    </span>
                  )}

                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>

                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                  <span>{new Date(item.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>

                  {item.link && (
                    <Link
                      to={item.link}
                      className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Open Link</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
