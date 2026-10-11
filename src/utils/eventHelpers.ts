import { Hackathon, EventOrganizerType } from '../types';

export function getOrganizerTypeLabel(type?: EventOrganizerType, organizerName?: string): string {
  if (type === 'OUR_COLLEGE') return 'Our College (KIT)';
  if (type === 'OTHER_COLLEGE') return 'College / University';
  if (type === 'COMPANY') return 'Company / Tech Industry';
  if (type === 'GOVERNMENT') return 'Government / National Mission';
  if (type === 'COMMUNITY') return 'Community / Non-Profit';
  if (type === 'OTHER') return 'External Organizer';

  // Fallback detection from organizer name if organizerType is not set
  if (organizerName) {
    const orgLower = organizerName.toLowerCase();
    if (orgLower.includes('kit') || orgLower.includes('kalaignarkarunanidhi')) {
      return 'Our College (KIT)';
    }
    if (
      orgLower.includes('iit') ||
      orgLower.includes('nit') ||
      orgLower.includes('university') ||
      orgLower.includes('college') ||
      orgLower.includes('institute')
    ) {
      return 'College / University';
    }
    if (
      orgLower.includes('gov') ||
      orgLower.includes('ministry') ||
      orgLower.includes('mission') ||
      orgLower.includes('raksham') ||
      orgLower.includes('aicte')
    ) {
      return 'Government / National Mission';
    }
    if (
      orgLower.includes('amazon') ||
      orgLower.includes('google') ||
      orgLower.includes('microsoft') ||
      orgLower.includes('tcs') ||
      orgLower.includes('infosys') ||
      orgLower.includes('technologies')
    ) {
      return 'Company / Tech Industry';
    }
  }

  return 'External Organizer';
}

export function getOrganizerBadgeStyle(type?: EventOrganizerType, organizerName?: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const label = getOrganizerTypeLabel(type, organizerName);
  if (label.includes('Our College')) {
    return {
      bg: 'bg-cyan-50',
      text: 'text-cyan-800',
      border: 'border-cyan-200',
      dot: 'bg-cyan-500'
    };
  }
  if (label.includes('College') || label.includes('University')) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-blue-500'
    };
  }
  if (label.includes('Government')) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500'
    };
  }
  if (label.includes('Company')) {
    return {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      dot: 'bg-purple-500'
    };
  }
  return {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400'
  };
}

export function getOfficialExternalUrl(hackathon: Hackathon): string | undefined {
  if (hackathon.officialUrl && hackathon.officialUrl.trim().startsWith('http')) {
    return hackathon.officialUrl.trim();
  }
  if (hackathon.externalRegistrationUrl && hackathon.externalRegistrationUrl.trim().startsWith('http')) {
    return hackathon.externalRegistrationUrl.trim();
  }
  if (
    hackathon.bannerUrl &&
    hackathon.bannerUrl.startsWith('http') &&
    !hackathon.bannerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)
  ) {
    return hackathon.bannerUrl.trim();
  }
  return undefined;
}

export function isExternalOpportunity(hackathon: Hackathon): boolean {
  if (hackathon.isExternal === true) return true;
  if (hackathon.organizerType && hackathon.organizerType !== 'OUR_COLLEGE') return true;
  const official = getOfficialExternalUrl(hackathon);
  if (official) return true;
  const label = getOrganizerTypeLabel(hackathon.organizerType, hackathon.organizer);
  return !label.includes('Our College');
}

export function formatEventDates(start?: string, end?: string): string {
  if (!start && !end) return 'Dates announced soon';
  if (start && !end) return new Date(start).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  if (!start && end) return `Ends ${new Date(end).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  const startDate = new Date(start!);
  const endDate = new Date(end!);
  if (startDate.toDateString() === endDate.toDateString()) {
    return startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return `${startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
