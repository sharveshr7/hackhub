import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAppStore } from '../../lib/store';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  Shield,
  Mail,
  Lock,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Code2,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const currentUser = useAppStore((state) => state.currentUser);

  // If already authenticated as Admin or HOD, redirect directly
  useEffect(() => {
    if (currentUser?.role === 'ADMIN' || currentUser?.role === 'HOD') {
      const defaultDest = currentUser.role === 'HOD' ? '/hod' : '/admin';
      const from = (location.state as any)?.from?.pathname || defaultDest;
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const authUser = await authService.loginAdmin(email, password);
      showToast('success', 'Sign In Successful', 'Welcome to the HackHub Administrative Portal.');
      const defaultDest = authUser.role === 'HOD' ? '/hod' : '/admin';
      const from = (location.state as any)?.from?.pathname || defaultDest;
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please try again.');
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
      setResetSuccess(true);
      showToast('success', 'Reset Email Sent', 'Password reset email sent. Check your inbox.');
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message || 'Unable to dispatch password reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Navigation back options */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Role Selection</span>
          </Link>

          <Link
            to="/student-login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Sign In</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-elevated p-8">
          {/* Header Branding */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy-900 text-cyan-400 mb-3 shadow-sm border border-navy-800">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-950 tracking-tight">
              HACKHUB
            </h1>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
              Post. Participate. Track. Achieve.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Admin Portal</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                KalaignarKarunanidhi Institute Of Technology • Autonomous
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!error && (location.state as any)?.registeredNotice && (
            <div className="mb-5 p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800 font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{(location.state as any).registeredNotice}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kitcbe.com"
              required
              autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
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
              />

              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetSuccess(false);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Create Admin Account & Student Login Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-600">
              Don't have an admin account?
            </p>
            <Link
              to="/admin/signup"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-navy-900 hover:bg-slate-50 text-xs font-bold text-navy-950 transition-all"
            >
              <Shield className="w-4 h-4 text-cyan-600" />
              <span>Create Admin Account</span>
            </Link>

            <div className="pt-2">
              <Link
                to="/login"
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              >
                ← Back to Student Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Administrative Password"
        maxWidth="sm"
      >
        {resetSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reset Email Dispatched</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                We've sent official Firebase password reset instructions to{' '}
                <strong className="text-slate-900">{resetEmail}</strong>. Please check your institutional inbox.
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setIsForgotModalOpen(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your verified institutional administrator email address to receive a secure Firebase password reset link.
            </p>

            <Input
              label="Admin Email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="admin@kitcbe.com"
              required
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setIsForgotModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={isResetting}
              >
                Send Reset Link
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
