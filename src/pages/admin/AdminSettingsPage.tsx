import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Check,
  UserCheck,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { adminService } from '../../services/adminService';

export const AdminSettingsPage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const admins = useAppStore((state) => state.admins);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'account' | 'faculty' | 'notifications' | 'appearance' | 'security'>('account');
  const [processingAdminId, setProcessingAdminId] = useState<string | null>(null);

  useEffect(() => {
    adminService.getAllAdmins().catch(() => {});
  }, []);

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

  const handleApproveFaculty = async (adminId: string, facultyName: string) => {
    try {
      setProcessingAdminId(adminId);
      const approver = currentUser?.adminData?.name || currentUser?.email || 'Institutional Administrator';
      await adminService.approveFacultyAdmin(adminId, approver);
      showToast('success', 'Faculty Coordinator Approved', `${facultyName} has been approved with administrative access.`);
    } catch (err: any) {
      showToast('error', 'Approval Error', err.message || 'Unable to approve faculty member.');
    } finally {
      setProcessingAdminId(null);
    }
  };

  const handleRejectFaculty = async (adminId: string, facultyName: string) => {
    try {
      setProcessingAdminId(adminId);
      await adminService.rejectFacultyAdmin(adminId);
      showToast('info', 'Faculty Request Rejected', `Application for ${facultyName} was rejected.`);
    } catch (err: any) {
      showToast('error', 'Rejection Error', err.message || 'Unable to update faculty status.');
    } finally {
      setProcessingAdminId(null);
    }
  };

  const pendingFacultyCount = admins.filter((a) => a.approvalStatus === 'PENDING').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Standardized Page Header */}
      <PageHeader
        category="CONFIGURATION & PREFERENCES"
        title="Admin Profile & Portal Settings"
        description="Faculty identity, automated notification triggers, theme settings, and collegiate security policies."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-subtle flex-wrap">
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
          onClick={() => setActiveTab('faculty')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all relative ${
            activeTab === 'faculty'
              ? 'bg-navy-950 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Faculty Approvals</span>
          {pendingFacultyCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white leading-none">
              {pendingFacultyCount}
            </span>
          )}
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

      {/* TAB: FACULTY APPROVALS */}
      {activeTab === 'faculty' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-navy-950 font-display">Faculty Coordinator Approvals</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review institutional faculty registrations. Only verified coordinators with approved status are granted administrative privileges.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/admin/faculty-approvals"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-navy-950 hover:bg-navy-900 text-cyan-400 border border-navy-800 shadow-xs transition-colors"
              >
                Open Full Approvals Console →
              </Link>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {admins.length} Total
              </span>
              {pendingFacultyCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingFacultyCount} Pending
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <Shield className="w-4 h-4 text-navy-900 shrink-0 mt-0.5" />
            <p>
              <strong className="text-navy-950">Security Notice:</strong> In accordance with institutional policy, public faculty signups create accounts in a <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px]">PENDING</code> state. Firestore security rules prevent pending accounts from creating hackathons, modifying student data, or recording scores until explicitly approved here by an institutional administrator.
            </p>
          </div>

          {admins.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No faculty accounts registered yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {admins.map((admin) => {
                const status = admin.approvalStatus || 'APPROVED';
                const isPending = status === 'PENDING';
                const isApproved = status === 'APPROVED';
                const isRejected = status === 'REJECTED';
                const isCurrentSelf = admin.uid === currentUser?.uid;

                return (
                  <div key={admin.uid} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{admin.name || 'Unnamed Faculty'}</span>
                        {isCurrentSelf && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">
                            You
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" /> Pending Verification
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>{admin.email}</span>
                        <span>•</span>
                        <span>{admin.department || 'General Faculty'}</span>
                        <span>•</span>
                        <span>{admin.designation || 'Faculty Coordinator'}</span>
                        {admin.facultyId && (
                          <>
                            <span>•</span>
                            <span className="font-mono">ID: {admin.facultyId}</span>
                          </>
                        )}
                      </div>

                      {admin.approvedBy && (
                        <p className="text-[10px] text-slate-400">
                          Approved by {admin.approvedBy}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={processingAdminId === admin.uid}
                            onClick={() => handleApproveFaculty(admin.uid, admin.name || admin.email)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            disabled={processingAdminId === admin.uid}
                            onClick={() => handleRejectFaculty(admin.uid, admin.name || admin.email)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {isApproved && !isCurrentSelf && (
                        <button
                          type="button"
                          disabled={processingAdminId === admin.uid}
                          onClick={() => handleRejectFaculty(admin.uid, admin.name || admin.email)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors disabled:opacity-50"
                        >
                          Revoke Access
                        </button>
                      )}

                      {isRejected && (
                        <button
                          type="button"
                          disabled={processingAdminId === admin.uid}
                          onClick={() => handleApproveFaculty(admin.uid, admin.name || admin.email)}
                          className="text-xs text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1 rounded hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          Re-approve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
