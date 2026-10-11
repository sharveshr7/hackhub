import React from 'react';
import { Link } from 'react-router-dom';
import { Hackathon } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Building2,
  Trophy,
  CheckCircle2,
  Users,
  ArrowRight
} from 'lucide-react';
import {
  getOrganizerTypeLabel,
  getOrganizerBadgeStyle,
  getOfficialExternalUrl,
  isExternalOpportunity,
  formatEventDates
} from '../../utils/eventHelpers';

interface OpportunityCardProps {
  hackathon: Hackathon;
  isRegistered?: boolean;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  hackathon,
  isRegistered = false
}) => {
  const isExternal = isExternalOpportunity(hackathon);
  const officialUrl = getOfficialExternalUrl(hackathon);
  const orgBadgeStyle = getOrganizerBadgeStyle(hackathon.organizerType, hackathon.organizer);
  const orgTypeLabel = getOrganizerTypeLabel(hackathon.organizerType, hackathon.organizer);

  const modeDisplay = (hackathon.mode || 'ONLINE').replace('_', ' ');

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group">
      <div className="p-5 flex-1 flex flex-col">
        {/* Top Header: Organizer Type Pill & Mode */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${orgBadgeStyle.bg} ${orgBadgeStyle.text} ${orgBadgeStyle.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${orgBadgeStyle.dot}`} />
              {orgTypeLabel}
            </span>
            {hackathon.category && (
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                {hackathon.category.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={hackathon.status} size="sm" />
          </div>
        </div>

        {/* Organizer / Conducting Institution */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-semibold text-slate-700" title={hackathon.organizer}>
            {hackathon.organizer}
          </span>
        </div>

        {/* Opportunity Title */}
        <Link
          to={`/hackathons/${hackathon.id}`}
          className="text-base font-bold text-navy-950 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-2"
        >
          {hackathon.title}
        </Link>

        {/* Short Description */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 flex-1">
          {hackathon.shortDescription || 'No description provided.'}
        </p>

        {/* Metadata Details Grid */}
        <div className="space-y-2 py-3 border-t border-slate-100 text-xs text-slate-600">
          {/* Mode & Location */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Mode & Venue:
            </span>
            <span className="font-medium text-slate-800 text-right truncate max-w-[180px]">
              {modeDisplay} {hackathon.location ? `• ${hackathon.location}` : ''}
            </span>
          </div>

          {/* Event Dates */}
          {(hackathon.eventStart || hackathon.eventEnd) && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Event Date:
              </span>
              <span className="font-medium text-slate-800 text-right">
                {formatEventDates(hackathon.eventStart, hackathon.eventEnd)}
              </span>
            </div>
          )}

          {/* Registration Deadline */}
          {hackathon.registrationDeadline && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Deadline:
              </span>
              <span className="font-semibold text-amber-800 text-right">
                {new Date(hackathon.registrationDeadline).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}

          {/* Confirmed Prize / Grants (only if confirmed) */}
          {hackathon.prizePool && hackathon.prizePool.trim() && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Prizes:
              </span>
              <span className="font-bold text-emerald-700 truncate max-w-[180px]">
                {hackathon.prizePool}
              </span>
            </div>
          )}

          {/* Eligibility (only if specified) */}
          {hackathon.eligibility && hackathon.eligibility.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Eligibility:
              </span>
              <span className="font-medium text-slate-700 truncate max-w-[180px]">
                {hackathon.eligibility[0]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link
          to={`/hackathons/${hackathon.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-navy-900 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {isRegistered ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Registered
          </span>
        ) : isExternal && officialUrl ? (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Official Link</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <Link
            to={`/hackathons/${hackathon.id}?register=true`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Register</span>
          </Link>
        )}
      </div>
    </div>
  );
};
