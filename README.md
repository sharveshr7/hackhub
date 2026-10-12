# HackHub — College Hackathon Monitoring & Student Participation Management System

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
- **State**: Zustand populated from live, role-scoped Firebase listeners; private records are not persisted between sessions
- **Charts & Data Visualizations**: Recharts
- **Icons**: Lucide React
- **Celebration Effects**: Canvas Confetti
- **Backend / Cloud Services**: Firebase Web SDK (Auth, Firestore, Cloud Storage) and Firebase Admin SDK server APIs deployed as Vercel Serverless Functions

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
│   └── store.ts                    # Zustand state store hydrated from Firebase
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx           # Role selector portal
│   │   ├── StudentLoginPage.tsx    # Student sign-in with registration-number or email sign-in
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
│       ├── AdminRegistrationsPage.tsx # Participant roster, approval actions, Excel export
│       ├── AdminTeamsPage.tsx      # Team squads roster, view members, disband action
│       ├── AdminSubmissionsPage.tsx# Deliverables review, jury scoring, award honors
│       ├── AdminStudentsPage.tsx   # Student directory, account active/disabled toggles
│       ├── AdminAnnouncementsPage.tsx # Priority bulletins (Normal, Important, Critical)
│       ├── AdminNotificationsPage.tsx # Platform-wide in-app broadcasts with presets
│       ├── AdminAnalyticsPage.tsx  # Interactive Recharts analytics & cohort rates
│       └── AdminSettingsPage.tsx   # College portal settings & backend telemetry
├── services/
│   ├── adminService.ts             # Admin analytics, metrics, student toggles, scoped export helpers
│   ├── authService.ts              # Authentication service for student & admin
│   ├── hackathonService.ts         # Hackathon CRUD and attendance gate toggles
│   ├── notificationService.ts      # Department announcements and in-app notifications
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

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Production build
npm run build
```

The application runs locally on `http://localhost:5173/`. Vite routes `/api/student-auth` to the server handler during development.

For production, deploy the app to Vercel so `/api/student-auth` is served by `api/student-auth.ts` as a serverless function. Set the server environment variables in Vercel before deploying. Firebase Hosting serves the static frontend only in the current configuration; deploying there alone will not provide the `/api` endpoint.

---

## Firebase setup and student onboarding

1. Copy `.env.example` to `.env.local` and enter the Firebase Web App configuration from your Firebase project settings. Keep service-account credentials out of `.env.local`, the browser build, and Git.
2. In Firebase Authentication, enable Email/Password sign-in, add the deployed app domain under Authorized domains, and configure the password reset email template.
3. Configure the server runtime with `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `COLLEGE_EMAIL_DOMAINS`, and a Firebase Admin service identity using the hosting provider's secret manager. Do not commit or share the service-account JSON.
4. Provision the selected initial platform administrator with `npm run provision:admin -- --platform-admin --project <project-id> --email <admin-email> --dry-run`; remove `--dry-run` only after reviewing the target account and project. Choose a separate account if the candidate has a legacy HOD designation; the bootstrap script will not convert that designation into platform access.
5. Review the legacy migrations in dry-run mode: `npm run migrate:staff-roles -- --project <project-id> --platform-admin-uid <admin-uid>` and `npm run migrate:attendance-gates -- --project <project-id>`. If the reported changes are correct, add `--apply` to each command. They retain existing documents, normalize staff roles, remove HOD claims, and move any public attendance codes into private gate documents.
6. Deploy the Firestore rules, indexes, and Storage rules in `firebase.json` after reviewing and applying the migrations. Storage Rules read approved staff and team scope from Firestore; enable Firebase Storage to Firestore cross-service access when prompted.
7. Deploy the web app to Vercel with `npx vercel --prod`; configure the Firebase Admin and college email-domain variables in the Vercel project settings first. Keep Firebase Hosting for the frontend only if you separately add an authenticated server runtime for `/api/student-auth`.
8. Authorized department staff can add students from **Admin > Students**. Enter name, college email, registration number, department, and academic year. The server checks uniqueness, creates the Firebase Auth account without a plaintext password, links the Firestore profile, and sends the password setup email.

The current student email-domain default is `kitcbe.com`; set `COLLEGE_EMAIL_DOMAINS` to the institution's actual email domains before enabling onboarding. Student registration numbers resolve only through the authenticated server endpoint.
