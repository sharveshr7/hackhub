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
  Filter
} from 'lucide-react';
import { Admin } from '../../types';

export const HodAdministratorsPage: React.FC = () => {
  const { admins, currentUser } = useAppStore();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [actionType, setActionType] = useState<'DEACTIVATE' | 'REACTIVATE' | 'VIEW' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const departments = [
    'Biomedical Engineering',
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication Engineering',
    'Electrical & Electronics Engineering',
    'Mechanical Engineering'
  ];

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
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {adm.department}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {adm.designation}
                      </td>
                      <td className="py-3.5 px-4">
                        {isTargetHod ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Shield className="w-3 h-3 text-amber-600" />
                            HOD
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
