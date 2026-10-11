import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../lib/store';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Clock,
  Filter,
  UserCheck
} from 'lucide-react';
import { Admin } from '../../types';

export const HodAdminApprovalsPage: React.FC = () => {
  const { admins, currentUser } = useAppStore();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Modal States
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'VIEW' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
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

  // Real pending faculty applications from Firestore
  const pendingApplications = useMemo(() => {
    return admins.filter((a) => a.approvalStatus === 'PENDING');
  }, [admins]);

  const filteredApplications = useMemo(() => {
    return pendingApplications.filter((app) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        (app.facultyId || '').toLowerCase().includes(q) ||
        app.department.toLowerCase().includes(q);

      const matchesDept = selectedDept === 'ALL' || app.department === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [pendingApplications, searchQuery, selectedDept]);

  const handleApprove = async () => {
    if (!selectedAdmin) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      const approverName = currentUser?.adminData?.name || 'Head of Department';
      await adminService.approveFacultyAdmin(selectedAdmin.uid, approverName);
      showToast(
        'success',
        'Administrator Approved',
        `Faculty coordinator ${selectedAdmin.name} has been granted administrator access.`
      );
      setActionType(null);
      setSelectedAdmin(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve administrator.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAdmin) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      await adminService.rejectFacultyAdmin(selectedAdmin.uid, rejectReason.trim());
      showToast(
        'success',
        'Application Rejected',
        `Faculty registration for ${selectedAdmin.name} has been rejected.`
      );
      setActionType(null);
      setSelectedAdmin(null);
      setRejectReason('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject application.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Faculty Approvals"
        description="Review, verify, and authorize faculty members requesting administrative and coordinator privileges."
        category="HEAD OF DEPARTMENT GOVERNANCE"
        badge={
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
            {pendingApplications.length} Pending
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
            placeholder="Search by faculty name, email, employee ID, or department..."
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

      {/* Applications Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {pendingApplications.length === 0
                ? 'No Pending Applications'
                : 'No Applications Match Filter'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {pendingApplications.length === 0
                ? 'All faculty registrations have been processed. New registrations submitted via /admin/signup will appear here in real time.'
                : 'Try adjusting your search criteria or department filter to locate specific faculty records.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Employee / Faculty ID</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Application Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => (
                  <tr key={app.uid} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{app.name}</div>
                      <div className="font-mono text-slate-500 text-[11px]">{app.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {app.facultyId || 'Not specified'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {app.department}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {app.designation}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {app.createdAt?.toDate
                        ? app.createdAt.toDate().toLocaleDateString()
                        : typeof app.createdAt === 'string'
                        ? new Date(app.createdAt).toLocaleDateString()
                        : 'Recent'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setSelectedAdmin(app);
                            setActionType('VIEW');
                          }}
                          leftIcon={<Eye className="w-3 h-3" />}
                        >
                          Details
                        </Button>

                        <Button
                          variant="primary"
                          size="xs"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                          onClick={() => {
                            setSelectedAdmin(app);
                            setActionType('APPROVE');
                            setActionError(null);
                          }}
                          leftIcon={<CheckCircle2 className="w-3 h-3" />}
                        >
                          Approve
                        </Button>

                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => {
                            setSelectedAdmin(app);
                            setActionType('REJECT');
                            setActionError(null);
                            setRejectReason('');
                          }}
                          leftIcon={<XCircle className="w-3 h-3" />}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedAdmin && actionType === 'VIEW' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedAdmin(null);
            setActionType(null);
          }}
          title="Faculty Registration Dossier"
          maxWidth="md"
        >
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Applicant Name</span>
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
                <span className="text-slate-500">Academic Department</span>
                <span className="font-medium text-slate-800">{selectedAdmin.department}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Designation</span>
                <span className="font-medium text-slate-800">{selectedAdmin.designation}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Contact Phone</span>
                <span className="text-slate-800">{selectedAdmin.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Institution</span>
                <span className="text-slate-800">{selectedAdmin.institution || 'KIT Coimbatore'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Firebase UID</span>
                <span className="font-mono text-[10px] text-slate-500">{selectedAdmin.uid}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                onClick={() => setActionType('APPROVE')}
              >
                Proceed to Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog: Approve */}
      {selectedAdmin && actionType === 'APPROVE' && (
        <Modal
          isOpen={true}
          onClose={() => !isProcessing && setActionType(null)}
          title="Confirm Administrator Approval"
          maxWidth="sm"
        >
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Authorize Administrator Privileges?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                You are approving <strong>{selectedAdmin.name}</strong> ({selectedAdmin.email}) as a verified faculty coordinator for <strong>{selectedAdmin.department}</strong>.
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
                onClick={handleApprove}
                isLoading={isProcessing}
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog: Reject */}
      {selectedAdmin && actionType === 'REJECT' && (
        <Modal
          isOpen={true}
          onClose={() => !isProcessing && setActionType(null)}
          title="Reject Faculty Registration"
          maxWidth="sm"
        >
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Reject Application?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Rejecting this application will deny administrator privileges to <strong>{selectedAdmin.name}</strong> ({selectedAdmin.email}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Details could not be verified by department records."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                rows={3}
              />
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
                onClick={handleReject}
                isLoading={isProcessing}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
