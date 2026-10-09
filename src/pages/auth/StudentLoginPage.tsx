import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowLeft,
  User,
  Hash,
  Phone,
  Building2,
  Calendar,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

export const StudentLoginPage: React.FC<{ initialMode?: 'LOGIN' | 'REGISTER' }> = ({ initialMode }) => {
  const location = useLocation();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(
    initialMode || (location.pathname === '/signup' ? 'REGISTER' : 'LOGIN')
  );

  React.useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    } else if (location.pathname === '/signup') {
      setMode('REGISTER');
    }
  }, [location.pathname, initialMode]);

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Form States
  const [name, setName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [year, setYear] = useState('3rd Year');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authService.loginStudent(email, password);
      showToast('success', 'Authentication Successful', 'Welcome to the Student Hackathon Portal.');
      const from = (location.state as any)?.from?.pathname || '/student';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate student credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (regPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your password entry.');
      setIsLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      setIsLoading(false);
      return;
    }

    try {
      await authService.registerStudent(regEmail, regPassword, {
        name,
        registerNumber,
        phone,
        department,
        year
      });
      showToast('success', 'Account Created', 'Registration successful! Redirecting to student dashboard.');
      navigate('/student', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to register student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setIsResetting(true);
    try {
      await authService.resetPassword(resetEmail.trim());
      showToast('success', 'Reset Link Dispatched', 'Password reset instructions have been sent to your email.');
      setIsForgotModalOpen(false);
      setResetEmail('');
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message || 'Unable to send password reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.loginWithGoogle('STUDENT');
      showToast('success', 'Google SSO Verified', 'Authenticated with College Google Workspace.');
      navigate('/student', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Google SSO verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Role Selection</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-elevated p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {mode === 'LOGIN' ? 'Student Sign In' : 'Student Registration'}
              </h2>
              <p className="text-xs text-slate-500">KalaignarKarunanidhi Institute Of Technology</p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'LOGIN'
                  ? 'bg-white text-navy-950 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'REGISTER'
                  ? 'bg-white text-navy-950 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium leading-relaxed">
              {error}
            </div>
          )}

          {mode === 'LOGIN' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="College Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="roll.dept@kitcbe.com"
                required
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span>Remember on this device</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                variant="secondary"
                className="w-full mt-2"
                size="lg"
                isLoading={isLoading}
              >
                Sign In as Student
              </Button>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sharvesh R"
                required
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                label="College Register Number"
                type="text"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                placeholder="717822P101"
                required
                leftIcon={<Hash className="w-4 h-4" />}
              />

              <Input
                label="College Email Address"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="sharvesh.cs22@kitcbe.com"
                required
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Contact Phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full py-2 px-3 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                    <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Biomedical Engineering">Biomedical Engineering</option>
                  </select>
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year
                </label>
                <div className="relative">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full py-2 px-3 pl-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs text-slate-800 font-medium"
                  >
                    <option value="1st Year">1st Year Undergrad</option>
                    <option value="2nd Year">2nd Year Undergrad</option>
                    <option value="3rd Year">3rd Year Undergrad</option>
                    <option value="4th Year">4th Year Undergrad</option>
                  </select>
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <Input
                label="Password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="secondary"
                className="w-full mt-3"
                size="lg"
                isLoading={isLoading}
              >
                Create Student Account
              </Button>
            </form>
          )}

          {/* Google SSO */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with College Google Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Account Password"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter your registered college email address. A password reset link will be sent via Firebase Authentication.
          </p>
          <Input
            label="Email Address"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="student@kitcbe.com"
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsForgotModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isResetting}
            >
              Send Reset Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
