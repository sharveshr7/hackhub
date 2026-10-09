import React from 'react';
import { Badge, BadgeVariant } from './Badge';
import { RegistrationStatus, HackathonStatus } from '../../types';

interface StatusBadgeProps {
  status: RegistrationStatus | HackathonStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let label = status.replace(/_/g, ' ');
  let variant: BadgeVariant = 'gray';
  let dot = true;

  switch (status) {
    // Registration States
    case 'NOT_REGISTERED':
      variant = 'gray';
      label = 'Not Registered';
      dot = false;
      break;
    case 'REGISTERED':
      variant = 'blue';
      label = 'Registered';
      break;
    case 'TEAM_PENDING':
      variant = 'amber';
      label = 'Team Pending';
      break;
    case 'TEAM_CONFIRMED':
      variant = 'cyan';
      label = 'Team Confirmed';
      break;
    case 'ATTENDANCE_PENDING':
      variant = 'amber';
      label = 'Check-in Required';
      break;
    case 'ATTENDED':
      variant = 'green';
      label = 'Attendance Verified';
      break;
    case 'SUBMISSION_PENDING':
      variant = 'blue';
      label = 'Submission Pending';
      break;
    case 'SUBMITTED':
      variant = 'green';
      label = 'Project Submitted';
      break;
    case 'UNDER_REVIEW':
      variant = 'navy';
      label = 'Under Review';
      break;
    case 'SHORTLISTED':
      variant = 'cyan';
      label = 'Shortlisted Finalist';
      break;
    case 'WINNER':
      variant = 'green';
      label = 'Winner 🏆';
      break;
    case 'COMPLETED':
      variant = 'navy';
      label = 'Completed';
      break;

    // Hackathon Statuses
    case 'draft':
      variant = 'gray';
      label = 'Draft';
      break;
    case 'published':
      variant = 'navy';
      label = 'Announced';
      break;
    case 'registration_open':
      variant = 'green';
      label = 'Registration Open';
      break;
    case 'registration_closed':
      variant = 'amber';
      label = 'Registration Closed';
      break;
    case 'live':
      variant = 'cyan';
      label = 'Event Live ⚡';
      break;
    case 'completed':
      variant = 'gray';
      label = 'Concluded';
      break;
    case 'cancelled':
      variant = 'red';
      label = 'Cancelled';
      break;

    default:
      variant = 'blue';
      break;
  }

  return (
    <Badge variant={variant} size={size} dot={dot}>
      {label}
    </Badge>
  );
};
