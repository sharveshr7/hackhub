import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { Certificate } from '../../types';
import {
  Award,
  Download,
  QrCode,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Sparkles,
  Search,
  CheckCircle2,
  Printer
} from 'lucide-react';

export const StudentCertificatesPage: React.FC = () => {
  const { currentUser, certificates, hackathons } = useAppStore();
  const student = currentUser?.studentData;

  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const studentCertificates = certificates.filter(
    (c) => !student || c.studentId === student.uid || c.registerNumber === student.registerNumber
  );

  const filtered = studentCertificates.filter((cert) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      cert.hackathonTitle.toLowerCase().includes(query) ||
      cert.verificationCode.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filterType !== 'ALL' && cert.type !== filterType) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Unified PageHeader */}
      <PageHeader
        title="Institutional Certificates"
        description="Digitally verifiable credentials of collegiate participation, excellence, and hackathon achievement."
        category="Accredited Credentials"
        badge={`${filtered.length} Credentials`}
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Controller Verified</span>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by hackathon or code..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Certificates' },
            { id: 'WINNER', label: 'Winners' },
            { id: 'PARTICIPATION', label: 'Participation' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Certificates Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Certificates Found"
          description="Certificates are issued after hackathons conclude and results are published by the examination convenor."
          actionText="Browse Hackathons"
          onAction={() => window.location.assign('/student/hackathons')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cert) => {
            const isWinner = cert.type === 'WINNER';
            return (
              <div
                key={cert.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                  isWinner
                    ? 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-300 hover:border-amber-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        isWinner
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isWinner ? 'Winner / First Place' : 'Participation'}</span>
                    </span>

                    <span className="font-mono text-[11px] text-slate-500 font-medium">
                      {cert.verificationCode}
                    </span>
                  </div>

                  <h3 className="font-bold text-navy-950 text-base mb-1.5 leading-snug">
                    {cert.hackathonTitle}
                  </h3>

                  <p className="text-xs text-slate-500 mb-4">
                    Issued to: <strong className="text-slate-800">{cert.studentName}</strong>
                    <span className="block font-mono text-[11px] text-slate-400 mt-0.5">
                      Roll No: {cert.registerNumber}
                    </span>
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(cert.issueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <Button
                    onClick={() => setSelectedCert(cert)}
                    variant={isWinner ? 'primary' : 'outline'}
                    size="sm"
                    leftIcon={<QrCode className="w-3.5 h-3.5" />}
                  >
                    View & Verify
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Official Certificate Verification Modal */}
      {selectedCert && (
        <Modal
          isOpen={Boolean(selectedCert)}
          onClose={() => setSelectedCert(null)}
          title="Digital Certificate Verification"
          maxWidth="2xl"
        >
          <div className="p-8 sm:p-10 border-4 border-double border-amber-300 rounded-xl bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 text-center space-y-4 my-2 shadow-inner">
            <div className="w-14 h-14 rounded-full bg-navy-950 text-cyan-400 flex items-center justify-center mx-auto shadow-md border-2 border-amber-300">
              <Award className="w-7 h-7" />
            </div>

            <div>
              <p className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
                KalaignarKarunanidhi Institute Of Technology
              </p>
              <p className="text-[11px] font-semibold text-blue-700 tracking-wider uppercase mt-0.5">
                Directorate of Innovation & Technical Events
              </p>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-navy-950 pt-2">
              Certificate of {selectedCert.type === 'WINNER' ? 'Excellence & First Place' : 'Participation'}
            </h2>

            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              This institutional credential certifies that
            </p>

            <h3 className="text-xl sm:text-2xl font-bold font-display text-blue-900 border-b-2 border-slate-200 pb-2 max-w-sm mx-auto">
              {selectedCert.studentName}
            </h3>

            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              bearing Register Number <strong>{selectedCert.registerNumber}</strong> has successfully completed all competitive milestones and demonstrated excellence at{' '}
              <strong className="text-navy-950">{selectedCert.hackathonTitle}</strong>.
            </p>

            <div className="pt-6 flex items-end justify-between text-left text-xs border-t border-slate-200 mt-6">
              <div>
                <p className="font-bold text-slate-900">Dr. K. Radhakrishnan</p>
                <p className="text-[10px] text-slate-500">Dean of Computing & Hackathon Convenor</p>
                <p className="text-[10px] text-slate-400">KalaignarKarunanidhi Institute Of Technology</p>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Document
                </span>
                <p className="font-mono text-xs font-bold text-slate-800">{selectedCert.verificationCode}</p>
                <p className="text-[10px] text-slate-400">Issue Date: {selectedCert.issueDate}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="primary"
              onClick={() => window.print()}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print / Save PDF
            </Button>
            <Button variant="outline" onClick={() => setSelectedCert(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
