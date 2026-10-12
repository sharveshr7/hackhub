import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { Shield, Lock, User, UserCheck, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { isPlatformAdministrator } from '../../utils/access';
import { adminService } from '../../services/adminService';
import {
  getDepartmentBadge,
  getSpecializationsForDepartment,
  sanitizeCustomSpecialization
} from '../../constants/departments';

export const AdminSettingsPage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const admins = useAppStore((state) => state.admins);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'account' | 'faculty' | 'security'>('account');
  const [processingAdminId, setProcessingAdminId] = useState<string | null>(null);

  useEffect(() => {
    if (isPlatformAdministrator(currentUser)) adminService.getAllAdmins().catch(() => {});
  }, [currentUser]);

  // Account / Admin Profile
  const [adminName, setAdminName] = useState(currentUser?.adminData?.name || currentUser?.email?.split('@')[0] || 'Faculty Administrator');
  const [adminEmail] = useState(currentUser?.adminData?.email || currentUser?.email || '');
  const [designation, setDesignation] = useState(currentUser?.adminData?.designation || 'Faculty Coordinator');
  const [department] = useState(currentUser?.adminData?.department || '');
  const [phone, setPhone] = useState(currentUser?.adminData?.phone || '');
  const [researchSpecialization, setResearchSpecialization] = useState(currentUser?.adminData?.researchSpecialization || '');
  const [customSpecialization, setCustomSpecialization] = useState(currentUser?.adminData?.customSpecialization || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const specializations = getSpecializationsForDepartment(department);
  const deptBadge = getDepartmentBadge(department);
  const authorizedYears = currentUser?.adminData?.authorizedYears;
  const isDeptApprover = currentUser?.adminData?.isDepartmentApprover === true;

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser?.adminData) {
      setAdminName(currentUser.adminData.name || '');
      setDesignation(currentUser.adminData.designation || 'Faculty Coordinator');
      setPhone(currentUser.adminData.phone || '');
      setResearchSpecialization(currentUser.adminData.researchSpecialization || '');
      setCustomSpecialization(currentUser.adminData.customSpecialization || '');
    }
  }, [currentUser]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    setIsSavingProfile(true);
    setProfileError(null);

    try {
      if (researchSpecialization === 'Other') {
        const cleanCustom = sanitizeCustomSpecialization(customSpecialization);
        if (!cleanCustom || cleanCustom.length < 3) {
          throw new Error('Please specify your custom research specialization (at least 3 characters).');
        }
      }

      await adminService.updateAdminProfile(currentUser.uid, {
        name: adminName,
        designation,
        phone,
        researchSpecialization,
        customSpecialization: researchSpecialization === 'Other' ? customSpecialization : undefined
      });

      showToast('success', 'Profile Updated', 'Administrator profile details and research specialization saved.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile details.');
      showToast('error', 'Update Failed', err.message || 'Could not save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleDepartmentApprover = async (adminId: string, facultyName: string, isApprover: boolean) => {
    try {
      setProcessingAdminId(adminId);
      await adminService.toggleDepartmentApprover(adminId, !isApprover);
      showToast('success', isApprover ? 'Department Approver Removed' : 'Department Approver Assigned', `${facultyName} ${isApprover ? 'no longer' : 'is now'} a department approver.`);
    } catch (err: any) {
      showToast('error', 'Role Update Failed', err.message || 'Unable to update department approver access.');
    } finally {
      setProcessingAdminId(null);
    }
  };

  const pendingFacultyCount = admins.filter((a) => a.approvalStatus === 'PENDING').length;

  if (!isPlatformAdministrator(currentUser)) return <Navigate to="/admin" replace />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Standardized Page Header */}
      <PageHeader
        category="CONFIGURATION & PREFERENCES"
        title="Admin Profile & Portal Settings"
        description="Update your faculty profile, assign department approvers, and review server managed security configuration."
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
          <span>Faculty & Approvers</span>
          {pendingFacultyCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white leading-none">
              {pendingFacultyCount}
            </span>
          )}
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

      {/* TAB 1: ACCOUNT (Section 32 Admin Profile: Name, Email, Role, Department Scope, Research Specialization) */}
      {activeTab === 'account' && (
        <form onSubmit={handleSaveAccount} className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
          {profileError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-navy-950 text-cyan-400 font-display font-bold text-2xl flex items-center justify-center border-2 border-cyan-400/30 shrink-0 shadow-sm">
              {adminName.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-navy-950 font-display">{adminName}</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${deptBadge.className}`}>
                  {deptBadge.name}
                </span>
                {isDeptApprover ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                    AUTHORIZED DEPT APPROVER
                  </span>
                ) : (
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 text-[10px] font-bold">
                    FACULTY COORDINATOR
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-700 font-semibold">{designation}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                <span className="font-mono text-slate-600">{adminEmail}</span>
                <span>•</span>
                <span>KIT Campus Administrative Network</span>
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Institutional Email
              </label>
              <input
                type="email"
                value={adminEmail}
                readOnly
                disabled
                className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono font-medium cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Institutional email is bound to Firebase Authentication.
              </span>
            </div>

            <Input
              label="Faculty Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Associate Professor & Hackathon Lead"
              required
            />

            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          {/* Department Assignment (Locked) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Assigned Academic Department</span>
              </label>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${deptBadge.className}`}>
                {deptBadge.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              In accordance with HackHub access control policies, faculty members cannot change their own department. Department reassignment must be authorized and conducted by an authorized department administrator.
            </p>
          </div>

          {/* Research Specialization Section */}
          <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/60 space-y-4">
            <div>
              <label className="block text-xs font-bold text-navy-950 mb-1">
                Faculty Research Specialization ({deptBadge.name})
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Select your academic research domain. Specialization options are strictly filtered to your academic department.
              </p>
              <select
                value={researchSpecialization}
                onChange={(e) => setResearchSpecialization(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs font-semibold text-slate-800"
              >
                <option value="">-- Select Research Specialization --</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {researchSpecialization === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Research Specialization <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={customSpecialization}
                  onChange={(e) => setCustomSpecialization(e.target.value)}
                  placeholder="Specify your academic research specialization..."
                  maxLength={100}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs font-medium text-slate-800"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be at least 3 characters.
                </span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-white border border-blue-200/70 text-[11px] text-slate-600 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Academic Boundary Notice:</strong> Research specialization is stored as faculty profile metadata and does not grant or alter student-data access permissions. Access to student records depends strictly on your approved role, department, and assigned academic-year scope.
              </span>
            </div>
          </div>

          {/* Academic-Year & Class Scope (Read-only for faculty) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Authorized Student Academic-Year Scope</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {authorizedYears && authorizedYears.length > 0 ? (
                  authorizedYears.map((yr) => (
                    <span
                      key={yr}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300"
                    >
                      {yr}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    General Department Scope
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Faculty and research staff may only access private student records and cohort participation for the academic years explicitly assigned to them by an authorized department administrator.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button type="submit" variant="primary" isLoading={isSavingProfile}>
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
              <h2 className="text-base font-bold text-navy-950 font-display">Faculty Access & Department Approvers</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign approved faculty members to review registrations for their own department. Department approvers cannot grant platform administrator access.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
              <strong className="text-navy-950">Approval boundary:</strong> Faculty registrations remain <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px]">PENDING</code> until a department approver reviews them. Assign at least one approver in each department below; platform administrators do not approve faculty applications.
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
                const isFaculty = String(admin.role || '').toUpperCase() === 'FACULTY';
                const isDepartmentApprover = admin.isDepartmentApprover === true;

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
                        {isApproved && isDepartmentApprover && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">Department Approver</span>
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

                    {isApproved && isFaculty && !isCurrentSelf && admin.department && (
                      <button
                        type="button"
                        disabled={processingAdminId === admin.uid}
                        onClick={() => handleToggleDepartmentApprover(admin.uid, admin.name || admin.email, isDepartmentApprover)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${isDepartmentApprover ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100' : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
                      >
                        {processingAdminId === admin.uid ? 'Saving?' : isDepartmentApprover ? 'Remove approver role' : 'Make department approver'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SECURITY & SYSTEM */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
          <div>
            <h2 className="text-base font-bold text-navy-950 font-display">Security & Provisioning Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sensitive onboarding and access policies are managed by the trusted server configuration.
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-950 space-y-2">
            <p><strong>Student email domain:</strong> configured by the server environment variable <code>COLLEGE_EMAIL_DOMAINS</code>.</p>
            <p><strong>Initial platform administrator:</strong> provisioned through the audited CLI command documented in README.</p>
            <p><strong>Student passwords:</strong> students set their own password through Firebase's password setup email; passwords are never stored in Firestore.</p>
          </div>
        </div>
      )}
    </div>
  );
};
