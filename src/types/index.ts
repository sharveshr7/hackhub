export type UserRole = 'STUDENT' | 'ADMIN' | 'HOD';

export type RegistrationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'TEAM_PENDING'
  | 'CANCELLED'
  | 'ATTENDED'
  | 'SUBMISSION_PENDING'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'EVALUATED'
  | 'WINNER'
  | 'COMPLETED'
  | 'REGISTERED'
  | 'NOT_REGISTERED'
  | 'TEAM_CONFIRMED'
  | 'ATTENDANCE_PENDING';

export type HackathonStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'LIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SUBMISSION_CLOSED'
  // Lowercase aliases for backward compatibility
  | 'draft'
  | 'published'
  | 'registration_open'
  | 'registration_closed'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'submission_closed';

export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'EVALUATED'
  | 'WINNER'
  | 'PENDING'
  | 'UNDER_EVALUATION';

export interface Prize {
  title: string;
  reward: string;
  description?: string;
}

export interface ProblemStatement {
  id: string;
  title: string;
  domain: string;
  description: string;
  expectedOutcome?: string;
}

export interface EvaluationCriterion {
  parameter: string;
  weightage: string;
  description: string;
}

export type EventOrganizerType =
  | 'OUR_COLLEGE'
  | 'OTHER_COLLEGE'
  | 'COMPANY'
  | 'GOVERNMENT'
  | 'COMMUNITY'
  | 'OTHER';

export type EventCategory =
  | 'HACKATHON'
  | 'COMPETITION'
  | 'INNOVATION_CHALLENGE'
  | 'WORKSHOP'
  | 'CONFERENCE'
  | 'OTHER';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Hackathon {
  id: string;
  title: string;
  tagline?: string;
  shortDescription: string;
  description?: string;
  organizer: string; // Conducting institution or organizer name
  organizerType?: EventOrganizerType;
  officialUrl?: string; // Official registration or information website
  externalRegistrationUrl?: string;
  isExternal?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  bannerUrl?: string;
  category?: string;
  registrationStart?: string;
  registrationDeadline?: string;
  eventStart?: string;
  eventEnd?: string;
  submissionDeadline?: string;
  venue?: string;
  location?: string;
  mode: 'IN_PERSON' | 'HYBRID' | 'VIRTUAL' | 'ONLINE' | 'OFFLINE';
  minTeamSize?: number;
  maxTeamSize?: number;
  prizePool?: string;
  participantCount?: number;
  eligibility?: string[];
  rules?: string[];
  prizes?: Prize[];
  problemStatements?: ProblemStatement[];
  evaluationCriteria?: EvaluationCriterion[];
  faq?: FAQItem[];
  status: HackathonStatus;
  attendanceOpen?: boolean;
  attendanceCode?: string; // Secret check-in code announced at the college venue
  createdAt: string;
  updatedAt: string;
  publishedBy?: string;
  publisherName?: string;
}

export interface Student {
  uid: string;
  name: string;
  registerNumber: string;
  registrationNumberNormalized?: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  role?: 'STUDENT' | 'student';
  avatarUrl?: string;
  bio?: string;
  skills: string[];
  accountStatus: 'active' | 'disabled';
  createdAt?: any;
  updatedAt?: any;
  provisionedBy?: string;
  provisionedAt?: any;
}

export interface Admin {
  uid: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'admin' | 'HOD' | 'hod';
  designation: string;
  department: string;
  phone?: string;
  facultyId?: string;
  institution?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isActive?: boolean;
  isHod?: boolean;
  isFirstAdmin?: boolean;
  approvedAt?: any;
  approvedBy?: string;
  rejectedAt?: any;
  rejectedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AuditLog {
  id?: string;
  actorUid: string;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  targetUid: string;
  targetEmail?: string;
  targetName?: string;
  action:
    | 'ADMIN_APPLICATION_SUBMITTED'
    | 'ADMIN_APPROVED'
    | 'ADMIN_REJECTED'
    | 'ADMIN_DEACTIVATED'
    | 'ADMIN_REACTIVATED'
    | 'STUDENT_PROVISIONED'
    | 'ROLE_CHANGED'
    | 'HOD_PROVISIONED';
  timestamp: any;
  details?: Record<string, any>;
  previousStatus?: string;
  newStatus?: string;
}

export interface RegistrationLookup {
  uid: string;
  email: string;
  registerNumber: string;
  name?: string;
  createdAt?: any;
}

export interface TeamMember {
  studentId: string;
  name: string;
  registerNumber: string;
  email: string;
  department: string;
  role: 'LEADER' | 'DEVELOPER' | 'DESIGNER' | 'RESEARCHER' | 'MEMBER';
  joinedAt: string;
}

export interface Team {
  id: string;
  hackathonId: string;
  name: string;
  code: string; // Invite / join code
  leaderId: string;
  members: TeamMember[];
  status: 'forming' | 'ready' | 'locked' | 'confirmed' | 'CONFIRMED';
  createdAt: string;
  updatedAt?: string;
}

export interface Registration {
  id: string;
  hackathonId: string;
  studentId: string;
  teamId?: string;
  registrationNumber: string; // e.g. "HACK-2026-01482"
  status: RegistrationStatus;
  registeredAt: string;
  acceptedRules: boolean;
  attendedAt?: string;
  attendanceStatus?: 'PRESENT' | 'ABSENT' | 'PENDING' | 'ATTENDED';
  submissionStatus?: 'SUBMITTED' | 'PENDING' | 'EVALUATED' | 'NOT_SUBMITTED' | 'DRAFT';
  problemStatementId?: string;
  isExternal?: boolean;
  externalTrackingOnly?: boolean;
  externalStatus?: 'PLANNING' | 'APPLIED_EXTERNALLY' | 'PARTICIPATING' | 'COMPLETED' | 'RESULT_RECORDED' | 'WON' | 'WITHDRAWN';
  externalNotes?: string;
  updatedAt?: string;
}

export interface Submission {
  id: string;
  hackathonId: string;
  teamId: string;
  teamName: string;
  projectTitle: string;
  title?: string;
  problemStatementId: string;
  problemStatementTitle: string;
  tagline?: string;
  description: string;
  solution?: string;
  evaluations?: any[];
  technologies: string[];
  techStack?: string[];
  githubUrl: string;
  demoUrl?: string;
  liveDemoUrl?: string;
  presentationUrl?: string;
  reportUrl?: string;
  demoVideoUrl?: string;
  videoDemoUrl?: string;
  files?: any[];
  projectName?: string;
  fileName?: string;
  fileUrl?: string;
  cloudinaryPublicId?: string;
  fileSize?: string;
  resourceType?: string;
  additionalNotes?: string;
  submittedBy?: string;
  status: SubmissionStatus;
  isDraft: boolean;
  submittedAt?: string;
  createdAt?: string;
  updatedAt: string;
  evaluationScore?: number;
  evaluationFeedback?: string;
  rank?: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  original_filename: string;
  bytes: number;
  format?: string;
  created_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  hackathonId?: string;
  hackathonTitle?: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  target: 'ALL' | 'REGISTERED' | 'SPECIFIC_HACKATHON' | 'DEPT';
  publishedAt: string;
  expiryDate?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  message: string;
  category: 'HACKATHONS' | 'TEAMS' | 'SUBMISSIONS' | 'DEADLINES' | 'ANNOUNCEMENTS' | 'HACKATHON' | 'TEAM' | 'SUBMISSION' | 'DEADLINE' | 'ANNOUNCEMENT' | 'SYSTEM';
  isRead: boolean;
  isImportant: boolean;
  priority?: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  createdAt: string;
  link?: string;
}

export interface Certificate {
  id: string;
  hackathonId: string;
  hackathonTitle: string;
  title?: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  type: 'PARTICIPATION' | 'WINNER' | 'RUNNER_UP' | 'SPECIAL_MENTION';
  issueDate: string;
  verificationCode: string;
}
