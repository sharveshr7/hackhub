import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../lib/store';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import {
  History,
  Search,
  Filter,
  Download,
  Shield,
  Clock,
  User,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Ban,
  UserCheck
} from 'lucide-react';
import { AuditLog } from '../../types';

export const HodAuditLogPage: React.FC = () => {
  const { auditLogs } = useAppStore();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        await adminService.getAllAuditLogs();
      } catch (err: any) {
        console.warn('[HodAuditLogPage] Audit log fetch note:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, []);

  const actionTypes = [
    'ADMIN_APPLICATION_SUBMITTED',
    'ADMIN_APPROVED',
    'ADMIN_REJECTED',
    'ADMIN_DEACTIVATED',
    'ADMIN_REACTIVATED',
    'STUDENT_PROVISIONED',
    'ROLE_CHANGED',
    'HOD_PROVISIONED'
  ];

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (log.actorName || '').toLowerCase().includes(q) ||
        (log.actorEmail || '').toLowerCase().includes(q) ||
        (log.targetName || '').toLowerCase().includes(q) ||
        (log.targetEmail || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q);

      const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;

      return matchesSearch && matchesAction;
    });
  }, [auditLogs, searchQuery, selectedAction]);

  const handleExportCsv = () => {
    const headers = ['Log ID', 'Timestamp', 'Action', 'Actor Name', 'Actor Email', 'Actor Role', 'Target Name', 'Target Email', 'Details'];
    const rows = filteredLogs.map((log) => [
      log.id || '',
      log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : typeof log.timestamp === 'string' ? log.timestamp : '',
      log.action,
      log.actorName || '',
      log.actorEmail || '',
      log.actorRole || '',
      log.targetName || '',
      log.targetEmail || '',
      JSON.stringify(log.details || {})
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kit-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('success', 'Export Complete', 'Immutable audit trail exported as CSV.');
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ADMIN_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            ADMIN APPROVED
          </span>
        );
      case 'ADMIN_REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            ADMIN REJECTED
          </span>
        );
      case 'ADMIN_DEACTIVATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Ban className="w-3 h-3" />
            ADMIN SUSPENDED
          </span>
        );
      case 'ADMIN_REACTIVATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            ADMIN RESTORED
          </span>
        );
      case 'STUDENT_PROVISIONED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            STUDENT PROVISIONED
          </span>
        );
      case 'HOD_PROVISIONED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3" />
            HOD BOOTSTRAP
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable Audit History"
        description="Tamper-evident audit records tracking institutional role changes, faculty approvals, suspensions, and student provisioning events."
        category="HEAD OF DEPARTMENT GOVERNANCE"
        badge={
          <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
            {auditLogs.length} Verified Events
          </span>
        }
        actions={
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Compliance Audit CSV
          </Button>
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
            placeholder="Search by actor name/email, target user, or action name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="ALL">All Event Types</option>
            {actionTypes.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            {isLoading ? 'Retrieving verified audit records...' : 'No audit entries match the current query.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Target User</th>
                  <th className="py-3.5 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const formattedTime = log.timestamp?.toDate
                    ? log.timestamp.toDate().toLocaleString()
                    : typeof log.timestamp === 'string'
                    ? new Date(log.timestamp).toLocaleString()
                    : 'Timestamp Recorded';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formattedTime}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{log.actorName || 'System'}</div>
                        <div className="font-mono text-[11px] text-slate-500">{log.actorEmail}</div>
                        {log.actorRole && (
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Role: {log.actorRole}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{log.targetName || log.targetUid}</div>
                        <div className="font-mono text-[11px] text-slate-500">{log.targetEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {log.details ? (
                          <div className="space-y-0.5 text-[11px] text-slate-600">
                            {Object.entries(log.details).map(([key, value]) => (
                              <div key={key}>
                                <strong className="text-slate-700 capitalize">{key}:</strong> {String(value)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No additional metadata</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
