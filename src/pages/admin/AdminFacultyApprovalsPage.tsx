import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../lib/store';
import { adminService } from '../../services/adminService';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Admin } from '../../types';
import { SUPPORTED_DEPARTMENTS, isSupportedDepartment, getDepartmentBadge } from '../../constants/departments';
import {
  Shield,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  AlertTriangle,
  Check,
  RefreshCw,
  UserX,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

export const AdminFacultyApprovalsPage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const admins = useAppStore((state) => state.admins);
  const { showToast } = useToast();

  const isHod = currentUser?.role === 'HOD' || currentUser?.adminData?.isHod === true;
  const isDeptApprover = currentUser?.adminData?.isDepartmentApprover === true;
  const approverDept = currentUser?.adminData?.department;

  const canApprove = (admin: Admin) => {
    if (admin.uid === currentUser?.uid) return false;
    if (!isSupportedDepartment(admin.department)) return false;
    if (isHod) return true;
    if (isDeptApprover && approverDept && admin.department === approverDept) {
      return true;
    }
    return false;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [processingAdminId, setProcessingAdminId] = useState<string | null>(null);

  // Inspection / Confirmation Modals
  const [inspectAdmin, setInspectAdmin] = useState<Admin | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{
    type: 'APPROVE' | 'REJECT' | 'REVOKE';
    admin: Admin;
  } | null>(null);

  // Fetch all admins on mount
  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      await adminService.getAllAdmins();
    } catch (err: any) {
      console.warn('Failed to load admins list:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // Compute status counts
  const counts = useMemo(() => {
    const total = admins.length;
    const pending = admins.filter((a) => a.approvalStatus === 'PENDING').length;
    const approved = admins.filter((a) => a.approvalStatus === 'APPROVED' || (!a.approvalStatus && (a.role || '').toUpperCase() === 'ADMIN')).length;
    const rejected = admins.filter((a) => a.approvalStatus === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [admins]);

  // Department options for filter dropdown
  const departments = useMemo(() => {
    return [...SUPPORTED_DEPARTMENTS];
  }, []);

  // Filtered and searched list
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      const status = admin.approvalStatus || ((admin.role || '').toUpperCase() === 'ADMIN' ? 'APPROVED' : 'PENDING');
      
      if (filterStatus !== 'ALL' && status !== filterStatus) {
        return false;
      }

      if (selectedDepartment !== 'ALL') {
        if (selectedDepartment === 'UNSUPPORTED') {
          if (isSupportedDepartment(admin.department)) return false;
        } else if (admin.department !== selectedDepartment) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (admin.name || '').toLowerCase().includes(q);
        const matchesEmail = (admin.email || '').toLowerCase().includes(q);
        const matchesDept = (admin.department || '').toLowerCase().includes(q);
        const matchesDesig = (admin.designation || '').toLowerCase().includes(q);
        const matchesId = (admin.facultyId || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesDept && !matchesDesig && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [admins, filterStatus, selectedDepartment, searchQuery]);

  const handleApprove = async (admin: Admin) => {
    if (!canApprove(admin)) {
      showToast('error', 'Authorization Error', 'You do not have permission to approve applicants for this department.');
      return;
    }
    try {
      setProcessingAdminId(admin.uid);
      const approverName = currentUser?.adminData?.name || currentUser?.email || 'Authorized Administrator';
      await adminService.approveFacultyAdmin(admin.uid, approverName);
      showToast(
        'success',
        'Faculty Account Approved',
        `${admin.name || admin.email} has been granted administrative access.`
      );
      setActionConfirm(null);
      setInspectAdmin(null);
    } catch (err: any) {
      showToast('error', 'Approval Error', err.message || 'Unable to approve faculty member.');
    } finally {
      setProcessingAdminId(null);
    }
  };

  const handleReject = async (admin: Admin) => {
    if (!canApprove(admin)) {
      showToast('error', 'Authorization Error', 'You do not have permission to decline applicants for this department.');
      return;
    }
    try {
      setProcessingAdminId(admin.uid);
      await adminService.rejectFacultyAdmin(admin.uid);
      showToast(
        'info',
        'Registration Rejected',
        `Administrative access for ${admin.name || admin.email} was declined.`
      );
      setActionConfirm(null);
      setInspectAdmin(null);
    } catch (err: any) {
      showToast('error', 'Rejection Error', err.message || 'Unable to update faculty status.');
    } finally {
      setProcessingAdminId(null);
    }
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    if (typeof dateVal === 'string') return new Date(dateVal).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    if (dateVal.toDate) return dateVal.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return 'N/A';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          category="INSTITUTIONAL GOVERNANCE & ACCESS CONTROL"
          title="Faculty Coordinator Approvals"
          description="Review collegiate faculty registrations. Verify academic identities and authorize access to administrative hackathon tools."
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadAdmins}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh List
          </Button>
        </div>
      </div>

      {/* Security Governance Notice */}
      <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 shadow-sm ${
        isHod
          ? 'bg-slate-900 border-slate-800 text-slate-300'
          : isDeptApprover
          ? 'bg-cyan-950/20 border-cyan-800/40 text-cyan-200'
          : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
      }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
          isHod
            ? 'bg-blue-500/20 text-cyan-400 border-blue-500/30'
            : isDeptApprover
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        }`}>
          <Shield className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-white text-xs">
            {isHod
              ? 'Institutional Governance Console (Head of Department)'
              : isDeptApprover
              ? `Authorized Department Approver Console (${approverDept})`
              : 'Department Faculty Coordinator Console'}
          </p>
          <p className="leading-relaxed text-[11px] opacity-90">
            {isHod
              ? 'As the Head of Department, you have institution-wide authority to review, approve, or reject faculty registrations across all departments, and designate authorized department approvers.'
              : isDeptApprover
              ? `You are designated by the HOD as an authorized Department Approver for ${approverDept}. You can review and approve faculty registrations strictly within your department scope.`
              : 'Pending faculty registrations require approval from the Head of Department (HOD) or your designated Department Approver before administrative tools are unlocked.'}
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterStatus === 'ALL'
              ? 'bg-white border-blue-600 shadow-md ring-1 ring-blue-600/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Registered</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold font-display text-navy-950">{counts.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">All faculty accounts</p>
        </div>

        <div
          onClick={() => setFilterStatus('PENDING')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterStatus === 'PENDING'
              ? 'bg-amber-50/50 border-amber-500 shadow-md ring-1 ring-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-amber-300 shadow-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-display text-amber-900">{counts.pending}</p>
          <p className="text-[11px] text-amber-700/80 mt-1">Awaiting verification</p>
        </div>

        <div
          onClick={() => setFilterStatus('APPROVED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterStatus === 'APPROVED'
              ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved Admins</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-display text-emerald-900">{counts.approved}</p>
          <p className="text-[11px] text-emerald-700/80 mt-1">Full portal access</p>
        </div>

        <div
          onClick={() => setFilterStatus('REJECTED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterStatus === 'REJECTED'
              ? 'bg-rose-50/50 border-rose-500 shadow-md ring-1 ring-rose-500/20'
              : 'bg-white border-slate-200/80 hover:border-rose-300 shadow-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-display text-rose-900">{counts.rejected}</p>
          <p className="text-[11px] text-rose-700/80 mt-1">Access revoked</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, department, faculty ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Quick status tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterStatus === 'ALL' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-600 hover:text-navy-950'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                filterStatus === 'PENDING' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterStatus === 'APPROVED' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              Approved ({counts.approved})
            </button>
          </div>
        </div>
      </div>

      {/* Faculty Coordinator Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No applications match your criteria</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filterStatus === 'PENDING'
                ? 'Great news! There are currently no faculty coordinator registrations awaiting administrative approval.'
                : 'Try adjusting your search query or department filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Institutional Details</th>
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-4">Status & Reviewer</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((admin) => {
                  const status = admin.approvalStatus || 'APPROVED';
                  const isPending = status === 'PENDING';
                  const isApproved = status === 'APPROVED';
                  const isRejected = status === 'REJECTED';
                  const isSelf = admin.uid === currentUser?.uid;

                  return (
                    <tr
                      key={admin.uid}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Name & Contact */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-navy-950 text-cyan-400 font-bold flex items-center justify-center shrink-0 border border-navy-900 text-xs shadow-xs">
                            {admin.name ? admin.name.slice(0, 2).toUpperCase() : 'FC'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {admin.name || 'Unnamed Faculty'}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-mono">{admin.email}</span>
                            </div>
                            {admin.phone && (
                              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-0.5">
                                <Phone className="w-2.5 h-2.5 shrink-0" />
                                <span>{admin.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Institutional Details */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 text-xs">
                            {admin.designation || 'Faculty Coordinator'}
                          </p>
                          <div>
                            {(() => {
                              const badge = getDepartmentBadge(admin.department);
                              if (!badge.isValid) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>Requires Review: {badge.name}</span>
                                  </span>
                                );
                              }
                              return (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.colorClass}`}>
                                  {badge.name}
                                </span>
                              );
                            })()}
                          </div>
                          {admin.isDepartmentApprover && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Shield className="w-3 h-3 text-purple-600 shrink-0" />
                              <span>Dept Approver</span>
                            </span>
                          )}
                          {admin.researchSpecialization && (
                            <p className="text-[11px] text-slate-600 font-medium pt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Research: </span>
                              {admin.researchSpecialization === 'Other'
                                ? (admin.customSpecialization || 'Other')
                                : admin.researchSpecialization}
                            </p>
                          )}
                          {admin.authorizedYears && admin.authorizedYears.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {admin.authorizedYears.map((yr) => (
                                <span key={yr} className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  {yr}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">
                            {admin.institution || 'KalaignarKarunanidhi Institute Of Technology'}
                          </p>
                        </div>
                      </td>

                      {/* Faculty ID */}
                      <td className="py-4 px-4 align-top">
                        <span className="inline-block px-2.5 py-1 rounded bg-slate-100 font-mono text-slate-700 text-[11px] font-bold border border-slate-200">
                          {admin.facultyId || 'NOT SET'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Registered: {formatDate(admin.createdAt)}
                        </div>
                      </td>

                      {/* Status & Audit Details */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              Pending Verification
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Approved Admin
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Access Withheld
                            </span>
                          )}

                          {admin.approvedBy && (
                            <p className="text-[10px] text-slate-500 pt-0.5">
                              Approved by <strong className="text-slate-700">{admin.approvedBy}</strong>
                            </p>
                          )}
                          {admin.approvedAt && (
                            <p className="text-[10px] text-slate-400">
                              on {formatDate(admin.approvedAt)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setInspectAdmin(admin)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Inspect application details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <>
                              {!isSupportedDepartment(admin.department) ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                                  title="Department is unsupported. Requires review before approval."
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Review Dept</span>
                                </span>
                              ) : isSelf ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200"
                                  title="Self-approval is forbidden."
                                >
                                  <span>Self Account</span>
                                </span>
                              ) : canApprove(admin) ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={processingAdminId === admin.uid}
                                    onClick={() => setActionConfirm({ type: 'APPROVE', admin })}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={processingAdminId === admin.uid}
                                    onClick={() => setActionConfirm({ type: 'REJECT', admin })}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200"
                                  title={`Requires HOD or ${admin.department} approver authorization`}
                                >
                                  <Shield className="w-3 h-3 text-slate-400" />
                                  <span>Approver Only</span>
                                </span>
                              )}
                            </>
                          )}

                              {isApproved && !isSelf && (
                                <button
                                  type="button"
                                  disabled={processingAdminId === admin.uid}
                                  onClick={() => setActionConfirm({ type: 'REVOKE', admin })}
                                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50 transition-colors disabled:opacity-50"
                                >
                                  Revoke Access
                                </button>
                              )}

                              {isRejected && (
                                <button
                                  type="button"
                                  disabled={processingAdminId === admin.uid}
                                  onClick={() => setActionConfirm({ type: 'APPROVE', admin })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Re-Approve</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Detail Inspection Modal */}
      {inspectAdmin && (
        <Modal
          isOpen={Boolean(inspectAdmin)}
          onClose={() => setInspectAdmin(null)}
          title="Faculty Registration Review"
          maxWidth="lg"
        >
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-navy-950 text-cyan-400 font-display font-bold text-xl flex items-center justify-center border border-navy-900 shadow-sm shrink-0">
                {inspectAdmin.name ? inspectAdmin.name.slice(0, 2).toUpperCase() : 'FC'}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-navy-950 font-display">
                    {inspectAdmin.name || 'Unnamed Faculty Member'}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      inspectAdmin.approvalStatus === 'PENDING'
                        ? 'bg-amber-100 text-amber-900'
                        : inspectAdmin.approvalStatus === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-rose-100 text-rose-900'
                    }`}
                  >
                    {inspectAdmin.approvalStatus || 'APPROVED'}
                  </span>
                </div>
                <p className="text-xs text-blue-700 font-semibold">{inspectAdmin.designation}</p>
                <p className="text-xs text-slate-500">{inspectAdmin.department}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Institutional Email
                </span>
                <span className="font-mono text-slate-800 font-semibold">{inspectAdmin.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  College / Faculty ID
                </span>
                <span className="font-mono text-slate-800 font-bold">{inspectAdmin.facultyId || 'NOT SPECIFIED'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contact Mobile Number
                </span>
                <span className="text-slate-800 font-semibold">{inspectAdmin.phone || 'NOT PROVIDED'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Research Specialization
                </span>
                <span className="text-slate-800 font-semibold">
                  {inspectAdmin.researchSpecialization === 'Other'
                    ? (inspectAdmin.customSpecialization ? `Other (${inspectAdmin.customSpecialization})` : 'Other')
                    : (inspectAdmin.researchSpecialization || 'General / Not specified')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Authorized Academic Years
                </span>
                <span className="text-slate-800 font-semibold">
                  {inspectAdmin.authorizedYears && inspectAdmin.authorizedYears.length > 0
                    ? inspectAdmin.authorizedYears.join(', ')
                    : 'General Department Scope (Pending Specific Year Assignment)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Institution
                </span>
                <span className="text-slate-800 font-semibold">{inspectAdmin.institution || 'KalaignarKarunanidhi Institute Of Technology'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Application Submitted
                </span>
                <span className="text-slate-800">{formatDate(inspectAdmin.createdAt)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Firebase User UID
                </span>
                <span className="font-mono text-slate-600 text-[11px] truncate block">{inspectAdmin.uid}</span>
              </div>
            </div>

            {inspectAdmin.approvedBy && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Verification Audit Log
                </span>
                <p>
                  Approved by <strong>{inspectAdmin.approvedBy}</strong> on {formatDate(inspectAdmin.approvedAt)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setInspectAdmin(null)}>
                Close
              </Button>
              {inspectAdmin.approvalStatus === 'PENDING' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      const adm = inspectAdmin;
                      setInspectAdmin(null);
                      setActionConfirm({ type: 'REJECT', admin: adm });
                    }}
                  >
                    Reject Application
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const adm = inspectAdmin;
                      setInspectAdmin(null);
                      setActionConfirm({ type: 'APPROVE', admin: adm });
                    }}
                  >
                    Approve as Administrator
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {actionConfirm && (
        <Modal
          isOpen={Boolean(actionConfirm)}
          onClose={() => setActionConfirm(null)}
          title={
            actionConfirm.type === 'APPROVE'
              ? 'Authorize Faculty Administrator?'
              : actionConfirm.type === 'REVOKE'
              ? 'Revoke Administrative Access?'
              : 'Decline Faculty Registration?'
          }
          maxWidth="sm"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  actionConfirm.type === 'APPROVE'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                {actionConfirm.type === 'APPROVE' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {actionConfirm.admin.name || actionConfirm.admin.email}
                </p>
                <p className="text-[11px] text-slate-500">
                  {actionConfirm.admin.department} • {actionConfirm.admin.facultyId}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {actionConfirm.type === 'APPROVE' ? (
                <>
                  Are you sure you want to approve this faculty registration? Once approved,{' '}
                  <strong>{actionConfirm.admin.name}</strong> will be granted administrative privileges
                  to create hackathons, supervise participants, and publish official grades.
                </>
              ) : actionConfirm.type === 'REVOKE' ? (
                <>
                  Are you sure you want to revoke administrative access for{' '}
                  <strong>{actionConfirm.admin.name}</strong>? They will be unable to access the admin portal until re-approved.
                </>
              ) : (
                <>
                  Are you sure you want to decline this registration request? The account will remain in a rejected status and will not have administrative portal access.
                </>
              )}
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setActionConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant={actionConfirm.type === 'APPROVE' ? 'primary' : 'danger'}
                className="flex-1"
                isLoading={processingAdminId === actionConfirm.admin.uid}
                onClick={() => {
                  if (actionConfirm.type === 'APPROVE') {
                    handleApprove(actionConfirm.admin);
                  } else {
                    handleReject(actionConfirm.admin);
                  }
                }}
              >
                {actionConfirm.type === 'APPROVE'
                  ? 'Confirm Approval'
                  : actionConfirm.type === 'REVOKE'
                  ? 'Confirm Revocation'
                  : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
