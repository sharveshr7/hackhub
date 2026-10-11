import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { authService } from '../../services/authService';
import { NotificationBell } from '../common/NotificationBell';
import {
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  History,
  LogOut,
  Shield,
  Menu,
  X,
  Building2,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  Award
} from 'lucide-react';

export const HodLayout: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const admins = useAppStore((state) => state.admins);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const isLoadingAuth = useAppStore((state) => state.isLoadingAuth);
  const pendingApprovalsCount = admins.filter((a) => a.approvalStatus === 'PENDING').length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // During auth rehydration on page refresh, show clean loading state
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Verifying HOD Authorization...
        </p>
      </div>
    );
  }

  // Strict Security Check: Must be authenticated
  if (!currentUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Strict Role Check: Must be HOD
  if (currentUser.role !== 'HOD') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white p-8 rounded-xl border border-rose-200 shadow-sm max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">
            Access Denied: Head of Department Authorization Required
          </h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Your current account credentials ({currentUser.email}) have {currentUser.role} privileges.
            Only authorized Heads of Department (HOD) can access institutional approval and administrative oversight controls.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(currentUser.role === 'ADMIN' ? '/admin' : '/student')}
              className="px-4 py-2 bg-navy-950 text-white rounded-lg text-xs font-semibold hover:bg-navy-900 transition-colors"
            >
              Return to Authorized Portal
            </button>
            <button
              onClick={() => {
                authService.logout();
                navigate('/admin/login');
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Sign In as HOD
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    {
      to: '/hod',
      label: 'HOD Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      exact: true
    },
    {
      to: '/hod/admin-approvals',
      label: 'Faculty Approvals',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
    },
    {
      to: '/hod/administrators',
      label: 'Approved Coordinators',
      icon: <UserCheck className="w-4 h-4" />
    },
    {
      to: '/hod/students',
      label: 'Student Provisioning',
      icon: <GraduationCap className="w-4 h-4" />
    },
    {
      to: '/hod/audit-log',
      label: 'Audit History',
      icon: <History className="w-4 h-4" />
    }
  ];

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-navy-950 text-slate-300 flex flex-col border-r border-navy-900 transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-64'
          }`}
        >
          {/* Header Branding */}
          <div className="p-4 border-b border-navy-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                HOD
              </div>
              <div>
                <h1 className="text-sm font-bold font-display text-white tracking-tight flex items-center gap-1.5">
                  HACKHUB
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                    SUPER ADMIN
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">Department Governance</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Institutional Banner */}
          <div className="px-4 py-2.5 bg-navy-900/60 border-b border-navy-900 text-[10px] text-amber-200/90 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="truncate">KIT Coimbatore • Autonomous</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              GOVERNANCE CONTROLS
            </div>
            {navLinks.map((link) => {
              const isActive = link.exact
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-navy-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {link.icon}
                    <span>{link.label}</span>
                  </div>
                  {link.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-navy-950 text-amber-300'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-4 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              OPERATIONAL PORTALS
            </div>
            <Link
              to="/admin"
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-navy-900 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Admin Operations</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </nav>

          {/* Current HOD Footer */}
          <div className="p-3 border-t border-navy-900 bg-navy-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-navy-950 font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser.adminData?.name?.[0] || 'H'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentUser.adminData?.name || 'Head of Department'}
                  </p>
                  <p className="text-[10px] text-amber-400 truncate">
                    {currentUser.adminData?.department || 'Biomedical Engineering'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-500 hover:text-slate-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                  Institutional Governance
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Head of Department Panel
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />

              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-navy-950 flex items-center justify-center text-xs font-bold">
                    {currentUser.adminData?.name?.[0] || 'H'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {currentUser.adminData?.name || 'HOD'}
                    </p>
                    <p className="text-[10px] font-semibold text-amber-600 leading-tight">
                      SUPER ADMIN
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">
                        {currentUser.adminData?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentUser.email}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {currentUser.adminData?.designation || 'Head of Department'}
                      </span>
                    </div>

                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <Shield className="w-4 h-4 text-cyan-600" />
                      <span>Admin Operations Panel</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Child Page Outlet */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
