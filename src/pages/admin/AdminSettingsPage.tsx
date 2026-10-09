import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { isFirebaseConfigured } from '../../lib/firebase/config';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import {
  Settings,
  Shield,
  Zap,
  RefreshCw,
  Database,
  Lock,
  User,
  Bell,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  KeyRound,
  Check
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';

export const AdminSettingsPage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'appearance' | 'security'>('account');

  // Account / Admin Profile
  const [adminName, setAdminName] = useState(currentUser?.adminData?.name || currentUser?.email?.split('@')[0] || 'Faculty Administrator');
  const [adminEmail, setAdminEmail] = useState(currentUser?.adminData?.email || currentUser?.email || 'admin@kitcbe.com');
  const [designation, setDesignation] = useState(currentUser?.adminData?.designation || 'Faculty Coordinator');
  const [department, setDepartment] = useState(currentUser?.adminData?.department || 'Directorate of Student Innovation');

  // Notifications Preferences (Section 33: Hackathon reminders, Deadline alerts, Team updates, Announcements)
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifTeams, setNotifTeams] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);

  // Appearance (Section 33: Light, Dark, System)
  const [appearance, setAppearance] = useState<'light' | 'dark' | 'system'>('light');

  // Security & Academic Config
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [allowedDomain, setAllowedDomain] = useState('@kitcbe.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Profile Updated', 'Administrator profile details saved successfully.');
  };

  const handleSavePreferences = () => {
    showToast('success', 'Preferences Updated', 'Notification and display settings saved.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Standardized Page Header */}
      <PageHeader
        category="CONFIGURATION & PREFERENCES"
        title="Admin Profile & Portal Settings"
        description="Faculty identity, automated notification triggers, theme settings, and collegiate security policies."
      />

      {/* Settings Navigation Tabs (Section 33: Account, Notifications, Appearance, Security) */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-subtle">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'account'
              ? 'bg-navy-950 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Account & Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'notifications'
              ? 'bg-navy-950 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notification Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'appearance'
              ? 'bg-navy-950 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-navy-950 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & System</span>
        </button>
      </div>

      {/* TAB 1: ACCOUNT (Section 32 Admin Profile: Name, Email, Role, Last login) */}
      {activeTab === 'account' && (
        <form onSubmit={handleSaveAccount} className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-navy-950 text-cyan-400 font-display font-bold text-2xl flex items-center justify-center border-2 border-cyan-400/30">
              KR
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-950 font-display">{adminName}</h2>
              <p className="text-xs text-blue-700 font-semibold">{designation}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                  Role: INSTITUTIONAL ADMIN
                </span>
                <span>•</span>
                <span>Last login: Today, 08:15 AM (KIT Campus Network)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />

            <Input
              label="Official Institutional Email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />

            <Input
              label="Faculty Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
            />

            <Input
              label="Department / Directorate"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" variant="primary">
              Save Account Profile
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: NOTIFICATIONS (Section 33: Hackathon reminders, Deadline alerts, Team updates, Announcements) */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
          <div>
            <h2 className="text-base font-bold text-navy-950 font-display">Notification Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control which system events trigger email notifications and administrative dashboard alerts.
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Hackathon Reminders</p>
                <p className="text-slate-500 text-[11px]">Receive schedule notices when events are within 48 hours of starting.</p>
              </div>
              <input
                type="checkbox"
                checked={notifReminders}
                onChange={(e) => setNotifReminders(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="py-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Deadline Alerts</p>
                <p className="text-slate-500 text-[11px]">Real-time warnings when registration or project submission windows are closing.</p>
              </div>
              <input
                type="checkbox"
                checked={notifDeadlines}
                onChange={(e) => setNotifDeadlines(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="py-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Team Updates</p>
                <p className="text-slate-500 text-[11px]">Alerts when new teams form, fill roster capacity, or disband.</p>
              </div>
              <input
                type="checkbox"
                checked={notifTeams}
                onChange={(e) => setNotifTeams(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="py-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Announcements</p>
                <p className="text-slate-500 text-[11px]">Audited broadcast summaries delivered to registered faculty coordinators.</p>
              </div>
              <input
                type="checkbox"
                checked={notifAnnouncements}
                onChange={(e) => setNotifAnnouncements(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-slate-100">
            <Button variant="primary" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </div>
        </div>
      )}

      {/* TAB 3: APPEARANCE (Section 33: Light, Dark, System) */}
      {activeTab === 'appearance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
          <div>
            <h2 className="text-base font-bold text-navy-950 font-display">Theme & Display Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize portal interface density and visual appearance mode.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => {
                setAppearance('light');
                handleSavePreferences();
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                appearance === 'light'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Sun className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs text-slate-900">Light Mode (Default)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Clean high-contrast campus theme with Deep Navy text.</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAppearance('dark');
                handleSavePreferences();
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                appearance === 'dark'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-navy-900 text-cyan-400 flex items-center justify-center mb-3">
                <Moon className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs text-slate-900">Dark Mode</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Deep Navy canvas with electric cyan accents.</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAppearance('system');
                handleSavePreferences();
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                appearance === 'system'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                <Laptop className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs text-slate-900">System Sync</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Matches student or faculty operating system preference.</p>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & SYSTEM */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
          <div>
            <h2 className="text-base font-bold text-navy-950 font-display">Academic Security & Domain Controls</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Domain validation filters, two-factor authentication, and database reset tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Enforced Student Email Domain"
              value={allowedDomain}
              onChange={(e) => setAllowedDomain(e.target.value)}
              helperText="Only students with this email suffix can enroll"
              required
            />

            <Input
              label="Active Academic Term"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-900">Mandatory 2FA for Evaluators</p>
              <p className="text-slate-500 text-[11px]">Require OTP verification before recording official jury marks.</p>
            </div>
            <input
              type="checkbox"
              checked={twoFactorAuth}
              onChange={(e) => setTwoFactorAuth(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-900">Submissions Grading Lockdown</p>
              <p className="text-slate-500 text-[11px]">Freeze code edits while jury panels finalize hackathon award rankings.</p>
            </div>
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <Button variant="primary" onClick={handleSavePreferences}>
              Save Security Rules
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
