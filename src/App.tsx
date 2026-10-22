import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { HackathonsPage } from './pages/public/HackathonsPage';
import { HackathonDetailsPage } from './pages/public/HackathonDetailsPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { StudentLoginPage } from './pages/auth/StudentLoginPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { AdminSignupPage } from './pages/auth/AdminSignupPage';

// Student Pages
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { StudentHackathonsPage } from './pages/student/StudentHackathonsPage';
import { StudentRegistrationsPage } from './pages/student/StudentRegistrationsPage';
import { StudentTeamPage } from './pages/student/StudentTeamPage';
import { StudentSubmissionsPage } from './pages/student/StudentSubmissionsPage';
import { StudentNotificationsPage } from './pages/student/StudentNotificationsPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { StudentCertificatesPage } from './pages/student/StudentCertificatesPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminHackathonsListPage } from './pages/admin/AdminHackathonsListPage';
import { AdminCreateHackathonPage } from './pages/admin/AdminCreateHackathonPage';
import { AdminHackathonDetailPage } from './pages/admin/AdminHackathonDetailPage';
import { AdminRegistrationsPage } from './pages/admin/AdminRegistrationsPage';
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage';
import { AdminSubmissionsPage } from './pages/admin/AdminSubmissionsPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAttendancePage } from './pages/admin/AdminAttendancePage';
import { AdminFacultyApprovalsPage } from './pages/admin/AdminFacultyApprovalsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';


import { useAuth } from './hooks/useAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';

export function App() {
  useAuth();
  useFirestoreSync();

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/hackathons" element={<HackathonsPage />} />
            <Route path="/hackathons/:hackathonId" element={<HackathonDetailsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<Navigate to="/student-login" replace />} />
            <Route path="/student-login" element={<StudentLoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/signup" element={<AdminSignupPage />} />
            <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
          </Route>

          {/* Student Protected Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentDashboardPage />} />
            <Route path="hackathons" element={<StudentHackathonsPage />} />
            <Route path="hackathons/:hackathonId" element={<HackathonDetailsPage />} />
            <Route path="registrations" element={<StudentRegistrationsPage />} />
            <Route path="my-registrations" element={<StudentRegistrationsPage />} />
            <Route path="team" element={<StudentTeamPage />} />
            <Route path="submissions" element={<StudentSubmissionsPage />} />
            <Route path="notifications" element={<StudentNotificationsPage />} />
            <Route path="certificates" element={<StudentCertificatesPage />} />
            <Route path="profile" element={<StudentProfilePage />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="hackathons" element={<AdminHackathonsListPage />} />
            <Route path="hackathons/create" element={<AdminCreateHackathonPage />} />
            <Route path="hackathons/:hackathonId" element={<AdminHackathonDetailPage />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="registrations" element={<AdminRegistrationsPage />} />
            <Route path="teams" element={<AdminTeamsPage />} />
            <Route path="attendance" element={<AdminAttendancePage />} />
            <Route path="submissions" element={<AdminSubmissionsPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="faculty-approvals" element={<AdminFacultyApprovalsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>


          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
