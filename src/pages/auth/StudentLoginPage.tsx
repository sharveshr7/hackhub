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
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  AlertCircle,
  Hash
} from 'lucide-react';

export const StudentLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSubmitted, setResetSubmitted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authService.loginStudentWithIdentifier(identifier, password);
      showToast('success', 'Authentication Successful', 'Welcome to the Student Hackathon Portal.');
      const from = (location.state as any)?.from?.pathname || '/student';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate student credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      await authService.loginWithGoogle();
      showToast('success', 'Authentication Successful', 'Welcome to the Student Hackathon Portal.');
      const from = (location.state as any)?.from?.pathname || '/student';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate student credentials with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) return;

    setIsResetting(true);
    try {
      await authService.resetStudentPassword(resetIdentifier.trim());
      setResetSubmitted(true);
      showToast(
        'success',
        'Request Processed',
        'If a registered student account matches those details, password reset instructions have been dispatched.'
      );
    } catch (err: any) {
      // Keep message generic to prevent user enumeration
      setResetSubmitted(true);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Navigation options */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Role Selection</span>
          </Link>

          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-950 hover:text-navy-800 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-600" />
            <span>Faculty / Admin Portal</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-elevated p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-3 shadow-xs border border-blue-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold font-display text-navy-950 tracking-tight">
              HACKHUB
            </h1>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
              Student Hackathon Portal
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Student Sign In</h2>
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

          {/* Secure Institutional Notice */}
          <div className="mb-5 p-3 rounded-lg bg-blue-50/60 border border-blue-100 flex items-start gap-2 text-[11px] text-blue-900 leading-relaxed">
            <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Sign in with your <strong>College Registration Number</strong> (e.g. 711525BBM053) or registered email address.
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="COLLEGE EMAIL OR REGISTRATION NUMBER"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter college email or registration number"
              required
              autoComplete="username"
              leftIcon={<Hash className="w-4 h-4" />}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
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

              <div className="flex items-center justify-between mt-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Remember this device</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setResetIdentifier(identifier);
                    setResetSubmitted(false);
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
              disabled={isGoogleLoading}
            >
              Sign In as Student
            </Button>

            {/* Google Sign In option */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleSignIn}
              isLoading={isGoogleLoading}
              disabled={isLoading}
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
              <span>Sign In with College Google Account</span>
            </Button>
          </form>

          {/* Institutional Provisioning Notice (No Public Student Signup) */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Student accounts are provisioned exclusively by college administration. If you do not have credentials yet, please contact your department coordinator.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Student Password"
        maxWidth="sm"
      >
        {resetSubmitted ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Request Received</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                If an active student account matches the provided registration number or email, password reset instructions have been dispatched to the registered email address.
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setIsForgotModalOpen(false)}
            >
              Return to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your college registration number or registered email address. A password reset link will be sent to your registered email via Firebase Authentication.
            </p>

            <Input
              label="COLLEGE EMAIL OR REGISTRATION NUMBER"
              type="text"
              value={resetIdentifier}
              onChange={(e) => setResetIdentifier(e.target.value)}
              placeholder="Enter college email or registration number"
              required
              leftIcon={<Hash className="w-4 h-4" />}
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
