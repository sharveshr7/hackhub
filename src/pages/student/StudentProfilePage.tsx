import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { studentService } from '../../services/studentService';
import { Input, Textarea } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/Toast';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  Award,
  ShieldCheck,
  Edit2,
  FileCheck2,
  Download,
  QrCode
} from 'lucide-react';
import { Certificate } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';

export const StudentProfilePage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const hackathons = useAppStore((state) => state.hackathons);
  const registrations = useAppStore((state) => state.registrations);
  const certificates = useAppStore((state) => state.certificates);
  const { showToast } = useToast();

  const student = currentUser?.studentData;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  // Edit fields
  const [phone, setPhone] = useState(student?.phone || '');
  const [bio, setBio] = useState(student?.bio || '');
  const [skillsInput, setSkillsInput] = useState(student?.skills?.join(', ') || '');
  const [isLoading, setIsLoading] = useState(false);

  const studentRegistrations = registrations.filter((r) => r.studentId === student?.uid);
  const studentCertificates = certificates.filter((c) => c.studentId === student?.uid);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setIsLoading(true);

    try {
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await studentService.updateStudentProfile(student.uid, {
        phone,
        bio,
        skills
      });

      showToast('success', 'Profile Updated', 'Student contact details and technical bio updated.');
      setIsEditModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified PageHeader */}
      <PageHeader
        title="Student Profile & Portfolio"
        description="Verified institutional identity, academic department standing, and competitive sprint portfolio."
        category="Student Identity"
        badge={student?.registerNumber || 'KIT Verified'}
      />

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-navy-900 to-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-elevated border-2 border-white ring-4 ring-blue-50">
              {student?.avatarUrl ? (
                <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                student?.name?.charAt(0) || 'S'
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white" title="Verified Active Student">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-display text-navy-950 tracking-tight">
                {student?.name}
              </h1>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Active Student
              </span>
            </div>

            <p className="text-xs font-semibold text-blue-600">
              {student?.department} • {student?.year}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                Reg: {student?.registerNumber}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {student?.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {student?.phone}
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setPhone(student?.phone || '');
            setBio(student?.bio || '');
            setSkillsInput(student?.skills?.join(', ') || '');
            setIsEditModalOpen(true);
          }}
          variant="outline"
          size="sm"
          leftIcon={<Edit2 className="w-4 h-4" />}
        >
          Edit Profile
        </Button>
      </div>

      {/* Bio and Skills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Academic Bio & Interests</h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            {student?.bio || 'No bio specified. Click "Edit Profile" to summarize your technical specialties.'}
          </p>

          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Technical Skills</h4>
          <div className="flex flex-wrap items-center gap-2">
            {student?.skills?.map((skill, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Participation Summary</h3>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Hackathons Joined</span>
              <span className="font-bold text-slate-900 text-sm">{studentRegistrations.length}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Verified Certificates</span>
              <span className="font-bold text-cyan-600 text-sm">{studentCertificates.length}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Academic Standing</span>
              <span className="font-bold text-emerald-600">Good Standing</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
            Attendance and certificate data synced directly with the College Examination Controller.
          </div>
        </div>
      </div>

      {/* Verified Certificates Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">Institutional Certificates</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Digitally Signed by Dean of Academics
          </span>
        </div>

        {studentCertificates.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No certificates issued yet. Certificates are published after hackathon results are officially declared.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {studentCertificates.map((cert) => (
              <div
                key={cert.id}
                className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 relative overflow-hidden group hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                      {cert.type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Code: {cert.verificationCode}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mb-1">{cert.hackathonTitle}</h4>
                  <p className="text-xs text-slate-600 mb-4">Awarded to: <strong>{cert.studentName}</strong> ({cert.registerNumber})</p>
                </div>

                <div className="pt-3 border-t border-amber-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Issued on {cert.issueDate}</span>
                  <button
                    onClick={() => setSelectedCert(cert)}
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    <span>View Certificate</span>
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participation History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span>Hackathon History & Records</span>
        </h3>

        <div className="space-y-3">
          {studentRegistrations.map((reg) => {
            const hackathon = hackathons.find((h) => h.id === reg.hackathonId);
            return (
              <div
                key={reg.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 text-sm">{hackathon?.title}</p>
                  <p className="text-slate-500 mt-0.5">
                    Registration ID: <strong className="font-mono">{reg.registrationNumber}</strong> • Registered {new Date(reg.registeredAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={reg.status} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Profile Details"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4 py-2">
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Textarea
            label="Bio & Specialties"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />

          <Input
            label="Technical Skills (Comma separated)"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            helperText="e.g. React, Python, C++, Docker, Embedded IoT"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Certificate Preview Modal */}
      {selectedCert && (
        <Modal
          isOpen={Boolean(selectedCert)}
          onClose={() => setSelectedCert(null)}
          title="Official Verified Certificate"
          maxWidth="2xl"
        >
          <div className="p-8 border-4 border-double border-amber-300 rounded-xl bg-gradient-to-b from-amber-50/50 to-white text-center space-y-4 my-2">
            <div className="w-12 h-12 rounded-full bg-navy-900 text-cyan-400 flex items-center justify-center mx-auto shadow-sm">
              <Award className="w-6 h-6" />
            </div>

            <p className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
              KalaignarKarunanidhi Institute Of Technology • Directorate of Innovation
            </p>

            <h2 className="text-2xl font-serif font-bold text-navy-950">
              Certificate of {selectedCert.type === 'WINNER' ? 'Excellence & First Place' : 'Participation'}
            </h2>

            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              This institutional certificate is officially presented to:
            </p>

            <h3 className="text-xl font-bold font-display text-blue-900 border-b border-slate-200 pb-2 max-w-sm mx-auto">
              {selectedCert.studentName}
            </h3>

            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              Student Register Number <strong>{selectedCert.registerNumber}</strong> for outstanding technical contributions and prototype presentation at{' '}
              <strong>{selectedCert.hackathonTitle}</strong>.
            </p>

            <div className="pt-6 flex items-center justify-between text-left text-xs border-t border-slate-200 mt-6">
              <div>
                <p className="font-bold text-slate-900">Dr. K. Radhakrishnan</p>
                <p className="text-[10px] text-slate-400">Dean of Computing & Hackathon Convenor</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs font-bold text-slate-700">Verification QR / Code</p>
                <p className="font-mono text-[10px] text-slate-500">{selectedCert.verificationCode}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                window.print();
              }}
              leftIcon={<Download className="w-4 h-4" />}
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
