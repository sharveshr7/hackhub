import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import {
  ShieldCheck,
  UserCheck,
  GraduationCap,
  History,
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { Admin, AuditLog } from '../../types';

export const HodDashboardPage: React.FC = () => {
  const { admins, students, hackathons, auditLogs } = useAppStore();
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const logs = await adminService.getAllAuditLogs();
        setRecentLogs(logs.slice(0, 5));
      } catch (err) {
        console.warn('Audit logs load warning:', err);
      } finally {
        setIsLoadingLogs(false);
      }
    };
    fetchLogs();
  }, []);

  const pendingAdmins = admins.filter((a) => a.approvalStatus === 'PENDING');
  const approvedAdmins = admins.filter((a) => a.approvalStatus === 'APPROVED' || (!a.approvalStatus && a.role === 'ADMIN'));
  const activeStudents = students.filter((s) => s.accountStatus !== 'disabled' && (s as any).isActive !== false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Oversight Dashboard"
        description="Head of Department administrative governance, faculty coordinator approvals, and verified student account oversight."
        category="HEAD OF DEPARTMENT GOVERNANCE"
        badge={
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
            SUPER ADMIN
          </span>
        }
      />

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/hod/admin-approvals"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              pendingAdmins.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-bold font-display text-navy-950 block">
            {pendingAdmins.length}
          </span>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-semibold text-amber-600 group-hover:text-amber-700">
            <span>{pendingAdmins.length > 0 ? 'Action required' : 'All clear'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/hod/administrators"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-cyan-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Approved Coordinators
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-bold font-display text-navy-950 block">
            {approvedAdmins.length}
          </span>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            <span>Manage Access</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/hod/students"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Provisioned Students
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-bold font-display text-navy-950 block">
            {activeStudents.length}
          </span>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            <span>Provision Accounts</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/hod/audit-log"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Immutable Audit Logs
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-bold font-display text-navy-950 block">
            {auditLogs.length || recentLogs.length}
          </span>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs font-semibold text-purple-600 group-hover:text-purple-700">
            <span>View Security Logs</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Pending Applications Alert Banner */}
      {pendingAdmins.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                {pendingAdmins.length} Faculty Registration{pendingAdmins.length > 1 ? 's' : ''} Awaiting Review
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                New faculty coordinators have applied for institutional privileges and require HOD approval.
              </p>
            </div>
          </div>
          <Link to="/hod/admin-approvals">
            <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none">
              Review Applications
            </Button>
          </Link>
        </div>
      )}

      {/* Pending Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pending Faculty Coordinator Applications</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real applications submitted through /admin/signup</p>
          </div>
          <Link
            to="/hod/admin-approvals"
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {pendingAdmins.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No Pending Applications</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All faculty coordinator registrations have been reviewed. New applications will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Faculty Name</th>
                  <th className="py-3 px-4">Institutional Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingAdmins.slice(0, 5).map((admin) => (
                  <tr key={admin.uid} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{admin.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{admin.email}</td>
                    <td className="py-3 px-4 text-slate-600">{admin.department}</td>
                    <td className="py-3 px-4 text-slate-600">{admin.designation}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        PENDING
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to="/hod/admin-approvals">
                        <Button variant="outline" size="xs">
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Security & Governance Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Security & Provisioning Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">Immutable records of institutional authorization events</p>
          </div>
          <Link
            to="/hod/audit-log"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <span>Complete Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No privileged events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.timestamp?.toDate
                        ? log.timestamp.toDate().toLocaleString()
                        : typeof log.timestamp === 'string'
                        ? new Date(log.timestamp).toLocaleString()
                        : 'Recent'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <strong>{log.actorName || log.actorRole}</strong>
                      <span className="text-slate-400 block text-[11px]">{log.actorEmail}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <strong>{log.targetName || log.targetUid}</strong>
                      <span className="text-slate-400 block text-[11px]">{log.targetEmail}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
