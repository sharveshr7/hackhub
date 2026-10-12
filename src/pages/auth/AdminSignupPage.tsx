import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import {
  Shield,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Briefcase,
  BadgeCheck,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap
} from 'lucide-react';

import {
  SUPPORTED_DEPARTMENTS,
  getSpecializationsForDepartment,
  SupportedDepartment
} from '../../constants/departments';

const DESIGNATIONS = [
  'Faculty Coordinator',
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Dean of Innovation',
  'Convenor & Chief Coordinator'
];

export const AdminSignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<SupportedDepartment | ''>('');
  const [specialization, setSpecialization] = useState<string>('');
  const [customSpecialization, setCustomSpecialization] = useState('');
  const [designation, setDesignation] = useState(DESIGNATIONS[0]);
  const [facultyId, setFacultyId] = useState('');
  const institution = 'KalaignarKarunanidhi Institute Of Technology';

  const handleDepartmentChange = (newDept: SupportedDepartment) => {
    setDepartment(newDept);
    setSpecialization('');
    setCustomSpecialization('');
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const validatePhone = (p: string) => {
    const clean = p.replace(/[\s\-\(\)\+]/g, '');
    return /^[6-9]\d{9}$/.test(clean) || /^91[6-9]\d{9}$/.test(clean);
  };

  const validatePasswordStrength = (p: string) => {
    // Minimum 8 characters, at least one letter and at least one digit
    return p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Name validation
    if (name.trim().length < 3) {
      setError('Full name must be at least 3 characters.');
      return;
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid institutional email address.');
      return;
    }

    // 3. Faculty ID validation
    if (!facultyId.trim()) {
      setError('Employee / Faculty ID is required.');
      return;
    }

    // 4. Phone validation
    if (!validatePhone(phone.trim())) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    // 5. Password validation
    if (!validatePasswordStrength(password)) {
      setError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    // 6. Confirm password
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    // 7. Research Specialization validation
    if (!department) {
      setError('Select your department before choosing a research specialization.');
      return;
    }
    if (!specialization) {
      setError('Select a research specialization for your department.');
      return;
    }
    if (specialization === 'Other' && customSpecialization.trim().length < 3) {
      setError('Please specify your custom research specialization (at least 3 characters).');
      return;
    }

    setIsLoading(true);

    try {
      await authService.registerAdmin({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        department,
        designation,
        facultyId: facultyId.trim(),
        institution,
        researchSpecialization: specialization,
        customSpecialization: specialization === 'Other' ? customSpecialization.trim() : undefined
      });

      showToast(
        'info',
        'Registration Submitted',
        'Faculty coordinator registration submitted. Awaiting administrator verification.'
      );

      navigate('/admin/login', {
        replace: true,
        state: {
          registeredNotice: 'Your faculty coordinator profile has been created and is pending approval by the college administrator. You will be able to sign in once your account has been approved.'
        }
      });
    } catch (err: any) {
      setError(err.message || 'Unable to register admin account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Navigation back options */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Login</span>
          </Link>

          <Link
            to="/student-login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Portal</span>
          </Link>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-elevated p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy-950 text-cyan-400 mb-3 shadow-sm border border-navy-800">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold font-display text-navy-950 tracking-tight">
              Create Admin Account
            </h1>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1">
              Register as a HackHub Faculty Coordinator
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {institution} • Autonomous
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-700 font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Institution Badge (Default / Display) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Collegiate Institution
                </span>
                <span className="text-xs font-bold text-navy-950">
                  {institution}
                </span>
              </div>
              <BadgeCheck className="w-5 h-5 text-emerald-600" />
            </div>

            {/* Row 1: Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. K. Radhakrishnan"
                required
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                label="Institutional Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dean.innovation@kitcbe.com"
                required
                autoComplete="email"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>

            {/* Row 2: Phone & Faculty ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                required
                leftIcon={<Phone className="w-4 h-4" />}
                helperText="10-digit mobile number"
              />

              <Input
                label="Employee / Faculty ID"
                type="text"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                placeholder="KIT-FAC-1024"
                required
                leftIcon={<Briefcase className="w-4 h-4" />}
                helperText="Assigned college faculty ID"
              />
            </div>

            {/* Row 3: Department & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <select
                    value={department}
                    onChange={(e) => handleDepartmentChange(e.target.value as SupportedDepartment)}
                    required
                    className="w-full rounded-lg border border-slate-300 text-sm py-2.5 pl-10 pr-4 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900"
                  >
                    <option value="" disabled>Select department</option>
                    {SUPPORTED_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Designation <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 text-sm py-2.5 pl-10 pr-4 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900"
                  >
                    {DESIGNATIONS.map((desig) => (
                      <option key={desig} value={desig}>
                        {desig}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Row 3.5: Research Specialization (Department-Specific) */}
            <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Research Specialization {department ? `(${department})` : ''} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                    disabled={!department}
                    className="w-full rounded-lg border border-slate-300 text-sm py-2.5 pl-10 pr-4 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900"
                  >
                    <option value="" disabled>Select specialization</option>
                    {getSpecializationsForDepartment(department).map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select your primary academic domain within {department}.
                </p>
              </div>

              {specialization === 'Other' && (
                <div>
                  <Input
                    label="Custom Research Specialization"
                    type="text"
                    value={customSpecialization}
                    onChange={(e) => setCustomSpecialization(e.target.value)}
                    placeholder="e.g. Nanobiotechnology & Drug Delivery"
                    required
                    helperText="Specify your precise specialized research focus (minimum 3 characters)"
                  />
                </div>
              )}
            </div>

            {/* Row 4: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Administrative Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="new-password"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                helperText="Min. 8 characters with letters & numbers"
              />

              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="new-password"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                helperText="Must match password"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Admin Account...' : 'Register as Faculty Coordinator'}
            </Button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Already have an admin account?{' '}
              <Link to="/admin/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign In
              </Link>
            </div>

            <div>
              Student account?{' '}
              <Link to="/login" className="font-semibold text-navy-900 hover:text-navy-950">
                Go to Student Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
