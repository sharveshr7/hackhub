import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../lib/store';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  UserCheck,
  Search,
  Shield,
  ShieldAlert,
  AlertCircle,
  Building2,
  CheckCircle2,
  Ban,
  RotateCcw,
  Eye,
  Filter,
  Award
} from 'lucide-react';
import { Admin } from '../../types';
import {
  SUPPORTED_DEPARTMENTS,
  isSupportedDepartment,
  getDepartmentBadge,
  SUPPORTED_ACADEMIC_YEARS
} from '../../constants/departments';

export const HodAdministratorsPage: React.FC = () => {
  const { admins, currentUser } = useAppStore();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [actionType, setActionType] = useState<'DEACTIVATE' | 'REACTIVATE' | 'VIEW' | 'EDIT_SCOPE' | null>(null);
  const [editYears, setEditYears] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const departments = SUPPORTED_DEPARTMENTS;

  const handleToggleApprover = async (targetAdmin: Admin) => {
    setIsProcessing(true);
    try {
      const newStatus = !targetAdmin.isDepartmentApprover;
      await adminService.toggleDepartmentApprover(targetAdmin.uid, newStatus);
      showToast(
        'success',
        newStatus ? 'Department Approver Designated' : 'Department Approver Revoked',
        `${targetAdmin.name} has been ${newStatus ? 'designated as an authorized' : 'removed as a'} department approver for ${targetAdmin.department}.`
      );
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not update approver role.');
    } finally {
      setIsProcessing(false);
    }
  };

  // List of approved administrators
  const approvedAdmins = useMemo(() => {
    return admins.filter(
      (a) => a.approvalStatus === 'APPROVED' || (!a.approvalStatus && a.role === 'ADMIN')
    );
  }, [admins]);

  const filteredAdmins = useMemo(() => {
    return approvedAdmins.filter((adm) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        adm.name.toLowerCase().includes(q) ||
        adm.email.toLowerCase().includes(q) ||
        (adm.facultyId || '').toLowerCase().includes(q) ||
        adm.department.toLowerCase().includes(q);

      const matchesDept = selectedDept === 'ALL' || adm.department === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [approvedAdmins, searchQuery, selectedDept]);

  const handleDeactivate = async () => {
    if (!selectedAdmin) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      await adminService.deactivateAdmin(selectedAdmin.uid);
      showToast(
        'success',
        'Administrator Deactivated',
        `Access for ${selectedAdmin.name} has been suspended.`
      );
      setActionType(null);
      setSelectedAdmin(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to deactivate administrator.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!selectedAdmin) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      await adminService.reactivateAdmin(selectedAdmin.uid);
      showToast(
        'success',
        'Administrator Reactivated',
        `Access for ${selectedAdmin.name} has been restored.`
      );
      setActionType(null);
      setSelectedAdmin(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reactivate administrator.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAcademicScope = async () => {
    if (!selectedAdmin) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      await adminService.updateFacultyPermissions(selectedAdmin.uid, {
        authorizedYears: editYears
      });
      showToast(
        'success',
        'Academic Permissions Updated',
        `Academic monitoring scope for ${selectedAdmin.name} set to ${editYears.length > 0 ? editYears.join(', ') : 'All Academic Years'}.`
      );
      setActionType(null);
      setSelectedAdmin(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update academic scope.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Faculty Coordinators"
        description="Monitor authorized institutional administrators, oversee department convenors, and manage access privileges."
        category="HEAD OF DEPARTMENT GOVERNANCE"
        badge={
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
            {approvedAdmins.length} Active Staff
          </span>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by coordinator name, email, employee ID, or department..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="ALL">All Academic Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No approved administrators match the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">Administrator</th>
                  <th className="py-3.5 px-4">Faculty ID</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Role Level</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((adm) => {
                  const isDeactivated = adm.isActive === false || (adm as any).accountStatus === 'deactivated';
                  const isTargetHod = adm.isHod === true || adm.role === 'HOD';

                  return (
                    <tr key={adm.uid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{adm.name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{adm.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {adm.facultyId || 'ADMIN'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getDepartmentBadge(adm.department).className}`}>
                            {adm.department}
                          </span>
                          {!isSupportedDepartment(adm.department) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Needs Review
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div>{adm.designation}</div>
                        {adm.researchSpecialization && (
                          <div className="text-[11px] text-slate-500 font-medium pt-0.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Research: </span>
                            {adm.researchSpecialization === 'Other'
                              ? (adm.customSpecialization || 'Other')
                              : adm.researchSpecialization}
                          </div>
                        )}
                        {adm.authorizedYears && adm.authorizedYears.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {adm.authorizedYears.map((yr) => (
                              <span key={yr} className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {yr}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isTargetHod ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Shield className="w-3 h-3 text-amber-600" />
                            HOD
                          </span>
                        ) : adm.isDepartmentApprover ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            <Award className="w-3 h-3 text-indigo-600" />
                            DEPT APPROVER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            COORDINATOR
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isDeactivated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Ban className="w-3 h-3" />
                            DEACTIVATED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setSelectedAdmin(adm);
                              setActionType('VIEW');
                            }}
                          >
                            Details
                          </Button>

                          {!isTargetHod && (
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-blue-700 border-blue-300 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedAdmin(adm);
                                setEditYears(adm.authorizedYears || [...SUPPORTED_ACADEMIC_YEARS]);
                                setActionType('EDIT_SCOPE');
                                setActionError(null);
                              }}
                            >
                              Scope
                            </Button>
                          )}

                          {!isTargetHod && isSupportedDepartment(adm.department) && (
                            <Button
                              variant="outline"
                              size="xs"
                              className={adm.isDepartmentApprover ? "text-amber-700 border-amber-300 hover:bg-amber-50" : "text-indigo-700 border-indigo-300 hover:bg-indigo-50"}
                              onClick={() => handleToggleApprover(adm)}
                              disabled={isProcessing}
                              leftIcon={<Award className="w-3 h-3" />}
                            >
                              {adm.isDepartmentApprover ? 'Revoke Approver' : 'Designate Approver'}
                            </Button>
                          )}

                          {isDeactivated ? (
                            <Button
                              variant="secondary"
                              size="xs"
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => {
                                setSelectedAdmin(adm);
                                setActionType('REACTIVATE');
                                setActionError(null);
                              }}
                              leftIcon={<RotateCcw className="w-3 h-3" />}
                            >
                              Restore
                            </Button>
                          ) : (
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => {
                                setSelectedAdmin(adm);
                                setActionType('DEACTIVATE');
                                setActionError(null);
                              }}
                              leftIcon={<Ban className="w-3 h-3" />}
                            >
                              Deactivate
                            </Button>
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

      {/* View Details Modal */}
      {selectedAdmin && actionType === 'VIEW' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedAdmin(null);
            setActionType(null);
          }}
          title="Administrator Profile Dossier"
          maxWidth="md"
        >
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Name</span>
                <span className="font-bold text-slate-900 text-sm">{selectedAdmin.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Institutional Email</span>
                <span className="font-mono text-slate-800">{selectedAdmin.email}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Faculty ID</span>
                <span className="font-mono font-bold text-slate-900">{selectedAdmin.facultyId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-800">{selectedAdmin.department}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Research Specialization</span>
                <span className="font-semibold text-slate-800">
                  {selectedAdmin.researchSpecialization === 'Other'
                    ? (selectedAdmin.customSpecialization ? `Other (${selectedAdmin.customSpecialization})` : 'Other')
                    : (selectedAdmin.researchSpecialization || 'General / Not specified')}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Authorized Academic Years</span>
                <span className="font-semibold text-slate-800">
                  {selectedAdmin.authorizedYears && selectedAdmin.authorizedYears.length > 0
                    ? selectedAdmin.authorizedYears.join(', ')
                    : 'Institution-Wide (All Years)'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Designation</span>
                <span className="font-medium text-slate-800">{selectedAdmin.designation}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Approved By</span>
                <span className="text-slate-800">{selectedAdmin.approvedBy || 'System Bootstrap CLI'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Firebase UID</span>
                <span className="font-mono text-[10px] text-slate-500">{selectedAdmin.uid}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedAdmin(null);
                  setActionType(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Academic Scope Modal (HOD only) */}
      {selectedAdmin && actionType === 'EDIT_SCOPE' && (
        <Modal
          isOpen={true}
          onClose={() => !isProcessing && setActionType(null)}
          title="Configure Faculty Academic Scope"
          maxWidth="sm"
        >
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Academic-Year Permissions for {selectedAdmin.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure student cohort visibility. {selectedAdmin.name} will only be permitted to monitor and access student records in {selectedAdmin.department} for these selected years:
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              {SUPPORTED_ACADEMIC_YEARS.map((yr) => {
                const isChecked = editYears.includes(yr);
                return (
                  <label key={yr} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditYears((prev) => [...prev, yr]);
                        } else {
                          setEditYears((prev) => prev.filter((y) => y !== yr));
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{yr}</span>
                  </label>
                );
              })}
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {actionError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setActionType(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSaveAcademicScope}
                isLoading={isProcessing}
              >
                Save Permissions
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog: Deactivate */}
      {selectedAdmin && actionType === 'DEACTIVATE' && (
        <Modal
          isOpen={true}
          onClose={() => !isProcessing && setActionType(null)}
          title="Suspend Administrator Access"
          maxWidth="sm"
        >
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Suspend Access for {selectedAdmin.name}?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                This administrator will be blocked from accessing hackathon management features until access is restored.
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {actionError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setActionType(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDeactivate}
                isLoading={isProcessing}
              >
                Confirm Suspension
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog: Reactivate */}
      {selectedAdmin && actionType === 'REACTIVATE' && (
        <Modal
          isOpen={true}
          onClose={() => !isProcessing && setActionType(null)}
          title="Restore Administrator Access"
          maxWidth="sm"
        >
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Restore Access for {selectedAdmin.name}?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                This will re-enable full coordinator and management privileges for <strong>{selectedAdmin.name}</strong>.
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {actionError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setActionType(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                onClick={handleReactivate}
                isLoading={isProcessing}
              >
                Confirm Restore
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
