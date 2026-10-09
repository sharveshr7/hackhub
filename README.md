# HackHub — College Hackathon Posting, Monitoring & Student Participation Management System

A centralized college platform where faculty publish hackathon opportunities and monitor participation while students discover competitions, manage registrations, collaborate with teams, track deadlines, and showcase their project submissions.

HackHub is an institutional platform for college faculty to post hackathons and monitor participation, and for students to discover, participate in, and track those opportunities. HackHub is **not** a hackathon organiser, event-management company, or external hackathon hosting platform.

---

## 🏛️ System Overview

HackHub manages collegiate hackathon participation lifecycle across institutional roles:

### Faculty / Admin
- **Post College Hackathons**: Create, edit, publish, and manage hackathon announcements and opportunities.
- **Define Guidelines**: Configure eligibility, registration deadlines, team requirements, and submission deadlines.
- **Participation Monitoring**: Monitor student registrations, team formations, and student turnout.
- **Submissions & Milestones**: Track project deliverables, repository links, documentation, and deadlines.
- **Evaluation & Results**: Record evaluation scores, feedback, rankings, and student achievements.
- **Bulletins & Reminders**: Issue announcements and deadline notifications to registered students.

### Students
- **Opportunity Discovery**: Discover hackathons posted by their college departments.
- **Eligibility & Deadlines**: Review requirements, problem statements, and key milestones.
- **Registrations & Teams**: Register for hackathons and form or join student teams.
- **Progress Tracking**: Track registration status, deadlines, and milestone progress.
- **Project Submissions**: Submit repository links, live demos, decks, and deliverables where enabled.
- **Results & Certificates**: View evaluation results, achievements, and downloadable certificates.

---

## ⚡ Technology Stack

- **Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (Tailwind 3.4), Custom collegiate design tokens (Deep Navy, Electric Cyan, Royal Blue)
- **Routing**: React Router v7 (`react-router-dom`)
- **State & Local Persistence**: Zustand with `persist` local cache
- **Charts & Data Visualizations**: Recharts
- **Icons**: Lucide React
- **Celebration Effects**: Canvas Confetti
- **Backend / Cloud Services**: Firebase Web SDK (Auth, Firestore, Cloud Storage, Firebase Cloud Messaging)

---

## 📁 Project Architecture

```
src/
├── components/
│   ├── common/
│   │   ├── Badge.tsx               # Academic and tech badges
│   │   ├── Button.tsx              # Primary, secondary, accent, danger, ghost, loading states
│   │   ├── Card.tsx                # Subtle shadow and border elevation cards
│   │   ├── ConfirmDialog.tsx       # Modals for destructive actions & final locks
│   │   ├── Countdown.tsx           # Live countdown clocks for deadlines and starts
│   │   ├── DemoAccountBanner.tsx   # Top telemetry bar for 1-click persona switching
│   │   ├── EmptyState.tsx          # Zero-data state views
│   │   ├── FileUpload.tsx          # Drag & drop upload with file preview
│   │   ├── Input.tsx               # Input, Textarea, and Select components
│   │   ├── LoadingSkeleton.tsx     # Skeleton loaders for card grids & tables
│   │   ├── Modal.tsx               # Accessible modal dialogs
│   │   ├── NotificationBell.tsx    # Live notification bell with unread dropdown
│   │   ├── ProgressStepper.tsx     # Visual 7-stage hackathon progress stepper
│   │   ├── StatusBadge.tsx         # Workflow and hackathon status badge mapper
│   │   └── Toast.tsx               # Toast notification provider & container
│   └── layout/
│       ├── PublicLayout.tsx        # Collegiate navigation, hero banner, footer
│       ├── StudentLayout.tsx       # Protected student portal layout with role guard
│       └── AdminLayout.tsx         # Protected admin console layout with collapsible sidebar
├── lib/
│   ├── firebase/
│   │   └── config.ts               # Isolated Firebase SDK init & offline fallback detector
│   ├── mockData.ts                 # Realistic initial seed data for college hackathons
│   └── store.ts                    # Zustand reactive state store with local persistence
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx           # Role selector portal
│   │   ├── StudentLoginPage.tsx    # Student sign-in with 1-click credentials & Google SSO
│   │   └── AdminLoginPage.tsx      # Verified faculty/convenor login
│   ├── public/
│   │   ├── LandingPage.tsx         # "Build. Innovate. Compete." showcase landing page
│   │   ├── HackathonsPage.tsx      # Filterable hackathon discovery with search
│   │   └── HackathonDetailsPage.tsx# Deep track info & 4-step registration wizard
│   ├── student/
│   │   ├── StudentDashboardPage.tsx# Live status card, 7-stage progress stepper, attendance
│   │   ├── StudentHackathonsPage.tsx# Browse hackathons inside student portal
│   │   ├── StudentRegistrationsPage.tsx # My registrations and hall passes
│   │   ├── StudentTeamPage.tsx     # Create team, join with code, member roles & limits
│   │   ├── StudentSubmissionsPage.tsx # Submission form, save draft, confirm & lock
│   │   ├── StudentNotificationsPage.tsx # Notification center with categories
│   │   └── StudentProfilePage.tsx  # Academic bio, skills, verified certificates
│   └── admin/
│       ├── AdminDashboardPage.tsx  # 6 KPI cards, registration curve, department chart
│       ├── AdminHackathonsListPage.tsx # Hackathon lifecycle toggles & attendance gate
│       ├── AdminCreateHackathonPage.tsx # Multi-field hackathon setup wizard
│       ├── AdminHackathonDetailPage.tsx # Deep inspection of single hackathon & attendance
│       ├── AdminRegistrationsPage.tsx # Participant roster, approval actions, CSV export
│       ├── AdminTeamsPage.tsx      # Team squads roster, view members, disband action
│       ├── AdminSubmissionsPage.tsx# Deliverables review, jury scoring, award honors
│       ├── AdminStudentsPage.tsx   # Student directory, account active/disabled toggles
│       ├── AdminAnnouncementsPage.tsx # Priority bulletins (Normal, Important, Critical)
│       ├── AdminNotificationsPage.tsx # Trigger push broadcasts with presets
│       ├── AdminAnalyticsPage.tsx  # Interactive Recharts analytics & cohort rates
│       └── AdminSettingsPage.tsx   # College portal settings & backend telemetry
├── services/
│   ├── adminService.ts             # Admin analytics, metrics, student toggles, CSV generator
│   ├── authService.ts              # Authentication service for student & admin
│   ├── hackathonService.ts         # Hackathon CRUD and attendance gate toggles
│   ├── notificationService.ts      # Announcements and in-app/FCM notifications
│   ├── studentService.ts           # Student profile, registrations, and check-in
│   ├── submissionService.ts        # Project submission drafts, final locks, and scoring
│   └── teamService.ts              # Team formation, join codes, member limits
├── types/
│   └── index.ts                    # Strict TypeScript definitions for all Firestore entities
├── App.tsx                         # Master routing tree with strict role guards
├── index.css                       # Tailwind layers, glassmorphism, custom scrollbars
└── main.tsx                        # Application root entry
```

---

## 🔄 Institutional User Journeys

The platform supports participation management across distinct institutional roles:

### Faculty Journey
```
Sign In ➔ Post Hackathon ➔ Publish ➔ Monitor Participation ➔ Review Submissions ➔ Record Results
```

### Student Journey
```
Sign In ➔ Explore Hackathons ➔ Register ➔ Participate ➔ Track Progress ➔ Submit Project ➔ View Results
```

- **Deadline Control**: If registration deadline has passed, registration is closed.
- **Team Rules**: Submissions respect team size configurations defined by faculty.
- **Participation Check-in**: Faculty can activate check-in passcodes for arrival tracking.
- **Project Locking**: After final submission confirmation, the deliverables are locked for faculty evaluation.

---

## 🔑 Demo Test Personas

The portal contains a **Top Persona Switcher Banner** for instant 1-click evaluation:

| Persona | Role | Email | Password | Pre-configured State |
| :--- | :--- | :--- | :--- | :--- |
| **Alex Johnson** | `STUDENT` | `alex.johnson@ait.edu` | `password123` | Enrolled in *ApexHack 2026*, Leader of *ByteForce*, Attendance Confirmed, Submitted *SmartCampus Flow* |
| **Dr. Sarah Jenkins** | `ADMIN` | `sarah.jenkins@ait.edu` | `adminpass456` | Hackathon Convenor & Dean, Full access to analytics, hackathon creation, approvals, and jury evaluation |

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Production build
npm run build
```

The application runs locally on `http://localhost:5173/`.

---

## 🌐 Connecting Real Firebase

When ready to link your Google Firebase project:
1. Copy `.env.example` to `.env.local`
2. Populate your Firebase configuration keys:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-college-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-college-project
VITE_FIREBASE_STORAGE_BUCKET=your-college-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:...
```
When configured, `src/lib/firebase/config.ts` automatically switches from the persistent local demo cache to live Firebase Authentication, Cloud Firestore, Cloud Storage, and FCM!
