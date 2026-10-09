import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

export type DeadlineState = 'normal' | 'approaching' | 'urgent' | 'expired' | 'completed';

interface DeadlineCardProps {
  title: string;
  dueDate: string; // ISO date string or formatted date
  description?: string;
  isCompleted?: boolean;
  showCountdown?: boolean;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const DeadlineCard: React.FC<DeadlineCardProps> = ({
  title,
  dueDate,
  description,
  isCompleted = false,
  showCountdown = false,
  actionText,
  onAction,
  className = ''
}) => {
  const now = new Date().getTime();
  const target = new Date(dueDate).getTime();
  const diffMs = target - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  let state: DeadlineState = 'normal';

  if (isCompleted) {
    state = 'completed';
  } else if (diffMs <= 0) {
    state = 'expired';
  } else if (diffHours <= 24) {
    state = 'urgent';
  } else if (diffDays <= 3) {
    state = 'approaching';
  } else {
    state = 'normal';
  }

  const stateConfig = {
    completed: {
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeText: 'Completed',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      timeText: 'Milestone reached',
      cardBorder: 'border-slate-200'
    },
    urgent: {
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse',
      badgeText: 'Urgent',
      icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
      timeText: diffHours > 0 ? `${diffHours} hours remaining` : 'Closing today',
      cardBorder: 'border-rose-300 bg-rose-50/20'
    },
    approaching: {
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeText: 'Approaching',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      timeText: `${diffDays} days remaining`,
      cardBorder: 'border-amber-200 bg-amber-50/10'
    },
    expired: {
      badgeBg: 'bg-slate-100 text-slate-600 border-slate-200',
      badgeText: 'Concluded',
      icon: <Clock className="w-4 h-4 text-slate-400" />,
      timeText: 'Deadline passed',
      cardBorder: 'border-slate-200 opacity-75'
    },
    normal: {
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
      badgeText: 'On Track',
      icon: <Calendar className="w-4 h-4 text-blue-600" />,
      timeText: `${diffDays} days remaining`,
      cardBorder: 'border-slate-200'
    }
  }[state];

  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${stateConfig.cardBorder} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
          {stateConfig.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold text-navy-950 tracking-tight">{title}</h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${stateConfig.badgeBg}`}
            >
              {stateConfig.badgeText}
            </span>
          </div>
          {description && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 text-[11px] font-medium text-slate-500">
            <span>
              Due: {new Date(dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span>•</span>
            <span className={state === 'urgent' ? 'text-rose-600 font-bold' : state === 'approaching' ? 'text-amber-700 font-bold' : ''}>
              {stateConfig.timeText}
            </span>
          </div>
        </div>
      </div>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 self-start sm:self-center"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
