import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { adminService } from '../../services/adminService';
import { useAppStore } from '../../lib/store';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  FileText,
  RefreshCw,
  Trash2,
  Check
} from 'lucide-react';
import {
  SUPPORTED_DEPARTMENTS,
  SUPPORTED_ACADEMIC_YEARS,
  normalizeAcademicYear
} from '../../constants/departments';

interface ParsedStudentRow {
  rowNum: number;
  name: string;
  email: string;
  registerNumber: string;
  department: string;
  year: string;
  phone: string;
  isValid: boolean;
  isDuplicate: boolean;
  validationError?: string;
}

interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyDept?: string;
  isPlatformAdmin: boolean;
}

export const BulkStudentImportModal: React.FC<BulkStudentImportModalProps> = ({
  isOpen,
  onClose,
  facultyDept,
  isPlatformAdmin
}) => {
  const { addToast } = useToast();
  const existingStudents = useAppStore((state) => state.students);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'ISSUES'>('ALL');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    duplicates: number;
    results: Array<{
      row: number;
      name: string;
      email: string;
      registerNumber: string;
      status: 'success' | 'failed' | 'duplicate';
      reason?: string;
    }>;
  } | null>(null);

  const resetState = () => {
    setFileName('');
    setParsedRows([]);
    setPreviewFilter('ALL');
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModalClose = () => {
    if (isImporting) return;
    resetState();
    onClose();
  };

  // Generate and download standard CSV template
  const handleDownloadTemplate = () => {
    const defaultDept = facultyDept || 'Biotechnology';
    const sampleContent =
      `name,registerNumber,email,department,year,phone\n` +
      `Arun Kumar,717822P101,arun.k@kitcbe.com,${defaultDept},Second Year,9876543210\n` +
      `Deepa Sharma,717822P102,deepa.s@kitcbe.com,${defaultDept},Second Year,9876543211\n`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'hackhub_student_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Sample CSV template downloaded.', 'info');
  };

  // Parse and validate uploaded CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      addToast('Please upload a valid comma-separated (.csv) spreadsheet file.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast('File size exceeds the 10 MB limit.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = (event.target?.result as string) || '';
        // Strip UTF-8 BOM
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          addToast('CSV file is empty or missing data rows.', 'error');
          return;
        }

        // Parse headers
        const rawHeaders = lines[0].split(',').map((h) =>
          h.trim().toLowerCase().replace(/[\s_-]+/g, '')
        );

        const nameIdx = rawHeaders.findIndex((h) => ['name', 'studentname', 'fullname'].includes(h));
        const regIdx = rawHeaders.findIndex((h) =>
          ['registernumber', 'regno', 'registrationnumber', 'rollno', 'rollnumber'].includes(h)
        );
        const emailIdx = rawHeaders.findIndex((h) =>
          ['email', 'studentemail', 'collegeemail', 'mail', 'emailaddress'].includes(h)
        );
        const deptIdx = rawHeaders.findIndex((h) => ['department', 'dept', 'branch'].includes(h));
        const yearIdx = rawHeaders.findIndex((h) => ['year', 'academicyear', 'class'].includes(h));
        const phoneIdx = rawHeaders.findIndex((h) => ['phone', 'phonenumber', 'mobile', 'contact'].includes(h));

        const missingCols: string[] = [];
        if (nameIdx === -1) missingCols.push('name');
        if (regIdx === -1) missingCols.push('registerNumber');
        if (emailIdx === -1) missingCols.push('email');
        if (deptIdx === -1 && !facultyDept) missingCols.push('department');
        if (yearIdx === -1) missingCols.push('year');

        if (missingCols.length > 0) {
          addToast(`Missing required columns in CSV header: ${missingCols.join(', ')}`, 'error');
          return;
        }

        // Map existing database values for fast duplicate checking
        const existingEmailSet = new Set(
          existingStudents.map((s) => (s.email || '').trim().toLowerCase())
        );
        const existingRegNoSet = new Set(
          existingStudents.map((s) =>
            (s.registrationNumberNormalized || s.registerNumber || '').trim().toUpperCase().replace(/\s+/g, '')
          )
        );

        // Tracking file internal duplicates
        const fileEmails = new Map<string, number>();
        const fileRegNos = new Map<string, number>();

        const parsed: ParsedStudentRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const rowNum = i + 1;
          const line = lines[i];
          // Handle simple CSV splitting
          const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));

          const name = (parts[nameIdx] || '').replace(/[\u0000-\u001f<>]/g, '').trim();
          const email = (parts[emailIdx] || '').trim().toLowerCase();
          const registerNumber = (parts[regIdx] || '').trim().toUpperCase().replace(/\s+/g, '');
          const department = (deptIdx !== -1 ? parts[deptIdx] : facultyDept) || '';
          const rawYear = (parts[yearIdx] || '').trim();
          const year = normalizeAcademicYear(rawYear) || rawYear;
          const phone = phoneIdx !== -1 ? (parts[phoneIdx] || '').trim() : '';

          let isValid = true;
          let isDuplicate = false;
          let validationError: string | undefined = undefined;

          // Required field checks
          if (!name || name.length < 2 || name.length > 100) {
            isValid = false;
            validationError = 'Name must be between 2 and 100 characters.';
          } else if (!registerNumber || !/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(registerNumber)) {
            isValid = false;
            validationError = 'Registration number must be 3–32 alphanumeric characters or hyphens.';
          } else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            isValid = false;
            validationError = 'Invalid email address format.';
          } else if (!email.endsWith('@kitcbe.com')) {
            isValid = false;
            validationError = 'Email must end with institutional domain (@kitcbe.com).';
          } else if (!SUPPORTED_DEPARTMENTS.includes(department as any)) {
            isValid = false;
            validationError = `Invalid department "${department}". Must be Biotechnology or Biomedical Engineering.`;
          } else if (!isPlatformAdmin && facultyDept && department !== facultyDept) {
            isValid = false;
            validationError = `Department mismatch: you can only import students for ${facultyDept}.`;
          } else if (!SUPPORTED_ACADEMIC_YEARS.includes(year as any)) {
            isValid = false;
            validationError = `Invalid year "${year}". Must be First Year, Second Year, or Third Year.`;
          } else if (fileEmails.has(email)) {
            isValid = false;
            isDuplicate = true;
            validationError = `Duplicate email: matches earlier row ${fileEmails.get(email)} in this file.`;
          } else if (fileRegNos.has(registerNumber)) {
            isValid = false;
            isDuplicate = true;
            validationError = `Duplicate reg number: matches earlier row ${fileRegNos.get(registerNumber)} in this file.`;
          } else if (existingEmailSet.has(email)) {
            isValid = false;
            isDuplicate = true;
            validationError = `Email ${email} is already registered in the database.`;
          } else if (existingRegNoSet.has(registerNumber)) {
            isValid = false;
            isDuplicate = true;
            validationError = `Registration number ${registerNumber} is already registered in the database.`;
          }

          if (isValid) {
            fileEmails.set(email, rowNum);
            fileRegNos.set(registerNumber, rowNum);
          }

          parsed.push({
            rowNum,
            name,
            email,
            registerNumber,
            department,
            year,
            phone,
            isValid,
            isDuplicate,
            validationError
          });
        }

        setParsedRows(parsed);
      } catch (err: any) {
        addToast(`Failed to parse CSV file: ${err.message}`, 'error');
      }
    };

    reader.readAsText(file);
  };

  // Submit valid rows for bulk import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      addToast('No valid rows found to import. Please review validation errors.', 'error');
      return;
    }

    setIsImporting(true);

    try {
      const payload = validRows.map((r) => ({
        name: r.name,
        registerNumber: r.registerNumber,
        email: r.email,
        department: r.department,
        year: r.year,
        phone: r.phone
      }));

      const res = await adminService.bulkImportStudents(payload);

      setImportSummary({
        total: parsedRows.length,
        succeeded: res.summary.succeeded,
        failed: res.summary.failed + parsedRows.filter((r) => !r.isValid && !r.isDuplicate).length,
        duplicates: res.summary.duplicates + parsedRows.filter((r) => r.isDuplicate).length,
        results: res.results
      });

      if (res.summary.succeeded > 0) {
        addToast(
          `Successfully provisioned ${res.summary.succeeded} student ${res.summary.succeeded === 1 ? 'account' : 'accounts'}!`,
          'success'
        );
      } else {
        addToast('No new student accounts were provisioned. Check summary for details.', 'info');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to complete student bulk import.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid && !r.isDuplicate).length;

  const filteredDisplayRows = parsedRows.filter((r) => {
    if (previewFilter === 'VALID') return r.isValid;
    if (previewFilter === 'ISSUES') return !r.isValid;
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Bulk Student Import (CSV)"
      maxWidth="4xl"
    >
      <div className="p-6 space-y-6">
        {/* Step 1: Upload or Download Template */}
        {!importSummary && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Supported CSV Columns</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Required headers: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">name</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">registerNumber</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">email</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">department</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">year</code>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="shrink-0 text-xs"
              >
                Sample Template
              </Button>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {fileName ? fileName : 'Click or drag a CSV file to inspect and import'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports up to 500 student rows per file. Validates departments and registration numbers.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Inspection & Validation Preview */}
        {parsedRows.length > 0 && !importSummary && (
          <div className="space-y-4">
            {/* Summary statistics bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-800">
                  Total Rows: <span className="font-mono text-slate-900">{parsedRows.length}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validCount} Ready
                </span>
                {duplicateCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {duplicateCount} Duplicates
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    <XCircle className="w-3.5 h-3.5" />
                    {invalidCount} Invalid
                  </span>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('ALL')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${previewFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('VALID')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${previewFilter === 'VALID' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Valid ({validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('ISSUES')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${previewFilter === 'ISSUES' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Issues ({duplicateCount + invalidCount})
                </button>
              </div>
            </div>

            {/* Table of Rows */}
            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Reg No</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Year</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDisplayRows.map((r) => (
                    <tr
                      key={r.rowNum}
                      className={r.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/30'}
                    >
                      <td className="py-2 px-3 font-mono text-slate-500">#{r.rowNum}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.registerNumber || '-'}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{r.name || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{r.email || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{r.department || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{r.year || '-'}</td>
                      <td className="py-2 px-3">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span
                            title={r.validationError}
                            className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded border ${r.isDuplicate ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}
                          >
                            <AlertCircle className="w-3 h-3" />
                            {r.validationError}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validCount === 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>None of the rows in this file are valid for import. Please correct the reported issues and re-upload.</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Post-Import Summary */}
        {importSummary && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold">Import Processing Complete</h3>
              </div>
              <p className="text-xs text-emerald-800">
                Processed {importSummary.total} total rows: <strong>{importSummary.succeeded}</strong> provisioned successfully,{' '}
                <strong>{importSummary.duplicates}</strong> duplicates skipped, and{' '}
                <strong>{importSummary.failed}</strong> rejected rows.
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Registration Number</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importSummary.results.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-slate-500">#{res.row}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{res.name} ({res.email})</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{res.registerNumber}</td>
                      <td className="py-2 px-3">
                        {res.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3" /> Created
                          </span>
                        ) : res.status === 'duplicate' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Skipped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500">{res.reason || 'Successfully provisioned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          {importSummary ? (
            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={handleModalClose}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={isImporting}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {parsedRows.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetState}
                    disabled={isImporting}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleExecuteImport}
                  disabled={validCount === 0 || isImporting}
                  isLoading={isImporting}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Import {validCount} Valid {validCount === 1 ? 'Student' : 'Students'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
