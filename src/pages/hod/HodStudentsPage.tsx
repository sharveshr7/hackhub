import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../lib/store';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  GraduationCap,
  Search,
  UserPlus,
  AlertCircle,
  Download,
  Filter,
  CheckCircle2,
  Eye,
  Mail,
  Phone,
  Hash
} from 'lucide-react';
import { Student } from '../../types';

import {
  SUPPORTED_DEPARTMENTS,
  isSupportedDepartment,
  getDepartmentBadge,
  SUPPORTED_ACADEMIC_YEARS,
  normalizeAcademicYear
} from '../../constants/departments';

export const HodStudentsPage: React.FC = () => {
  const { students } = useAppStore();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  // Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [provName, setProvName] = useState('');
  const [provRegNo, setProvRegNo] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provDept, setProvDept] = useState<string>(SUPPORTED_DEPARTMENTS[0]);
  const [provYear, setProvYear] = useState<string>(SUPPORTED_ACADEMIC_YEARS[0]);
  const [provPhone, setProvPhone] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  const departments = SUPPORTED_DEPARTMENTS;

  const years = SUPPORTED_ACADEMIC_YEARS;

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.registerNumber.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q);

      const matchesDept = selectedDept === 'ALL' || s.department === selectedDept;
      const matchesYear =
        selectedYear === 'ALL' ||
        (normalizeAcademicYear(s.year) && normalizeAcademicYear(selectedYear)
          ? normalizeAcademicYear(s.year) === normalizeAcademicYear(selectedYear)
          : s.year === selectedYear);

      return matchesSearch && matchesDept && matchesYear;
    });
  }, [students, searchQuery, selectedDept, selectedYear]);

  const handleProvisionStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    setProvisionError(null);

    try {
      const res = await adminService.provisionStudent({
        name: provName,
        registerNumber: provRegNo,
        email: provEmail,
        department: provDept,
        year: provYear,
        phone: provPhone
      });

      showToast(
        'success',
        'Student Account Provisioned',
        `Student ${res.registerNumber} (${res.email}) provisioned successfully! Password setup email dispatched.`
      );
      setIsProvisionModalOpen(false);
      setProvName('');
      setProvRegNo('');
      setProvEmail('');
      setProvPhone('');
    } catch (err: any) {
      setProvisionError(err.message || 'Failed to provision student account.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Name', 'Register Number', 'Email', 'Phone', 'Department', 'Year', 'Status'];
    const rows = filteredStudents.map((s) => [
      s.name,
      s.registerNumber,
      s.email,
      s.phone || 'N/A',
      s.department,
      s.year,
      s.accountStatus || 'active'
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kit-students-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('success', 'Export Complete', 'Student directory exported as CSV.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Account Management"
        description="Oversee verified student profiles, provision new collegiate hackathon accounts, and supervise credential distribution."
        category="HEAD OF DEPARTMENT GOVERNANCE"
        badge={
          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
            {students.length} Total Students
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setProvisionError(null);
                setIsProvisionModalOpen(true);
              }}
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Provision Student
            </Button>
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
          </div>
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
            placeholder="Search by student name, roll number, or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="ALL">All Academic Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No students found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Registration Number</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Year</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((stu) => {
                  const isActive = stu.accountStatus !== 'disabled' && (stu as any).isActive !== false;

                  return (
                    <tr key={stu.uid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{stu.name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{stu.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {stu.registerNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getDepartmentBadge(stu.department).className}`}>
                            {stu.department}
                          </span>
                          {!isSupportedDepartment(stu.department) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Needs Review
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {stu.year}
                      </td>
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            DEACTIVATED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setViewStudent(stu)}
                          leftIcon={<Eye className="w-3 h-3" />}
                        >
                          Dossier
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Student Modal */}
      {viewStudent && (
        <Modal
          isOpen={true}
          onClose={() => setViewStudent(null)}
          title="Student Registration Dossier"
          maxWidth="md"
        >
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{viewStudent.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Roll / Registration Number</span>
                <span className="font-mono font-bold text-slate-900">{viewStudent.registerNumber}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Institutional Email</span>
                <span className="font-mono text-slate-800">{viewStudent.email}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-800">{viewStudent.department}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Academic Year</span>
                <span className="font-medium text-slate-800">{viewStudent.year}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Contact Phone</span>
                <span className="text-slate-800">{viewStudent.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Firebase UID</span>
                <span className="font-mono text-[10px] text-slate-500">{viewStudent.uid}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Provision Student Modal */}
      <Modal
        isOpen={isProvisionModalOpen}
        onClose={() => !isProvisioning && setIsProvisionModalOpen(false)}
        title="Provision Student Account"
        maxWidth="md"
      >
        <form onSubmit={handleProvisionStudent} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Provision an authorized student account. A Firebase Authentication account and student profile will be established, and an email setup link will be dispatched automatically.
          </p>

          {provisionError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{provisionError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Student Full Name"
              type="text"
              value={provName}
              onChange={(e) => setProvName(e.target.value)}
              placeholder="e.g. Sharvesh R"
              required
            />

            <Input
              label="Registration Number"
              type="text"
              value={provRegNo}
              onChange={(e) => setProvRegNo(e.target.value.toUpperCase())}
              placeholder="e.g. 717822P101"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Institutional Email"
              type="email"
              value={provEmail}
              onChange={(e) => setProvEmail(e.target.value)}
              placeholder="e.g. 717822p101@kitcbe.com"
              required
            />

            <Input
              label="Contact Phone (Optional)"
              type="tel"
              value={provPhone}
              onChange={(e) => setProvPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={provDept}
                onChange={(e) => setProvDept(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year
              </label>
              <select
                value={provYear}
                onChange={(e) => setProvYear(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsProvisionModalOpen(false)}
              disabled={isProvisioning}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isProvisioning}
            >
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
