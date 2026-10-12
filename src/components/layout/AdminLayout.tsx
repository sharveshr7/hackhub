import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { authService } from '../../services/authService';
import { NotificationBell } from '../common/NotificationBell';
import {
  LayoutDashboard,
  CalendarDays,
  FileCheck,
  Users,
  FolderGit2,
  GraduationCap,
  Megaphone,
  BellRing,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  ExternalLink,
  UserCheck,
  Building2,
  Search,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  User,
  Plus
} from 'lucide-react';
import { isDepartmentApprover, isPlatformAdministrator, isStaffRole } from '../../utils/access';

export const AdminLayout: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const admins = useAppStore((state) => state.admins);
  const logout = useAppStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const isLoadingAuth = useAppStore((state) => state.isLoadingAuth);
  const pendingApprovalsCount = admins.filter((a) => a.approvalStatus === 'PENDING').length;

  // Close profile dropdown on outside click
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
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verifying Admin Credentials...</p>
      </div>
    );
  }

  // Strict Security Check: Authenticated Admin Role Required
  if (!currentUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isStaffRole(currentUser.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white p-8 rounded-xl border border-rose-200 shadow-sm max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Access Denied: Admin Authorization Required</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Your current account credentials ({currentUser.email}) have Student privileges. Only verified college faculty and convenors can access administrative operations.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/student')}
              className="px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 transition-colors"
            >
              Return to Student Portal
            </button>
            <button
              onClick={async () => {
                await authService.logout();
                navigate('/admin/login');
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Log in as Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const admin = currentUser.adminData;

  const governanceItems: Array<{ to: string; label: string; icon: React.ReactNode; badge?: number }> = [];
  if (isDepartmentApprover(currentUser)) {
    governanceItems.push({
      to: '/admin/faculty-approvals',
      label: 'Faculty Approvals',
      icon: <Shield className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
    });
  }
  if (isPlatformAdministrator(currentUser)) {
    governanceItems.push({ to: '/admin/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> });
  }

  const navSections = [
    {
      title: 'OVERVIEW & POSTING',
      items: [
        { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/admin/hackathons', label: 'Hackathons', icon: <CalendarDays className="w-4 h-4" /> },
        { to: '/admin/hackathons/create', label: 'Post Hackathon', icon: <Plus className="w-4 h-4" /> }
      ]
    },
    {
      title: 'PARTICIPATION MONITORING',
      items: [
        { to: '/admin/students', label: 'Students', icon: <GraduationCap className="w-4 h-4" /> },
        { to: '/admin/registrations', label: 'Registrations', icon: <FileCheck className="w-4 h-4" /> },
        { to: '/admin/teams', label: 'Teams', icon: <Users className="w-4 h-4" /> }
      ]
    },
    {
      title: 'SUBMISSIONS & OUTCOMES',
      items: [
        { to: '/admin/submissions', label: 'Submissions', icon: <FolderGit2 className="w-4 h-4" /> },
        { to: '/admin/announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
        ...(isPlatformAdministrator(currentUser) ? [{ to: '/admin/notifications', label: 'Notifications', icon: <BellRing className="w-4 h-4" /> }] : [])
      ]
    },
    {
      title: 'ANALYTICS & REPORTS',
      items: [
        { to: '/admin/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        { to: '/admin/attendance', label: 'Reports', icon: <UserCheck className="w-4 h-4" /> }
      ]
    },
    {
      title: 'GOVERNANCE & ACCESS',
      items: governanceItems
    }
  ].filter((section) => section.items.length > 0);

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
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-navy-950 text-slate-300 flex flex-col border-r border-navy-900 transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
          } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
        >
          {/* Top Brand: College Logo & Name */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-navy-900 bg-navy-950">
            <Link to="/admin" className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 font-bold shrink-0 shadow-sm">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              {!collapsed && (
                <div className="overflow-hidden min-w-0">
                  <span className="font-display font-bold text-white text-xs sm:text-sm tracking-tight block leading-tight truncate">
                    HackHub
                  </span>
                  <span className="text-[9px] font-semibold text-cyan-400 tracking-wider uppercase block truncate">
                    KIT Admin Portal
                  </span>
                </div>
              )}
            </Link>

            <div className="flex items-center gap-1">
              {/* Collapse Toggle for Desktop */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors"
                title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
              {/* Mobile Close */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {navSections.map((sec) => (
              <div key={sec.title}>
                {!collapsed ? (
                  <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 truncate">
                    {sec.title}
                  </h3>
                ) : (
                  <div className="h-px bg-navy-900 mx-2 my-2" />
                )}
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const isActive =
                      item.to === '/admin'
                        ? location.pathname === '/admin'
                        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center ${
                          collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                        } py-2.5 rounded-lg text-xs font-semibold transition-all group relative ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-navy-900'
                        }`}
                      >
                        <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'}`}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                        {!collapsed && (item as any).badge !== undefined && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white leading-none shrink-0 shadow-xs">
                            {(item as any).badge}
                          </span>
                        )}
                        {collapsed && (item as any).badge !== undefined && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-navy-950" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Admin User Box */}
          <div className="p-3 border-t border-navy-900 bg-navy-900/50">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">
                {admin?.name ? admin.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              {!collapsed && (
                <div className="flex-1 overflow-hidden min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{admin?.name || currentUser?.email || 'Administrator'}</p>
                  <p className="text-[10px] text-cyan-400 font-medium truncate">{admin?.designation || 'Convenor'}</p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-navy-800 transition-colors shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Section */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Admin Header */}
          <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 h-16 px-4 sm:px-8 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:text-navy-900 rounded-lg hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden sm:block min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-navy-950 tracking-tight leading-none">
                  KalaignarKarunanidhi Institute Of Technology
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Faculty & Academic Hackathon Administration Portal
                </p>
              </div>
            </div>

            {/* Right Topbar Navigation */}
            <div className="flex items-center gap-3">
              <Link
                to="/admin/hackathons/create"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Event</span>
              </Link>

              <Link
                to="/hackathons"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-navy-900 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="View public student portal"
              >
                <span>Live View</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <NotificationBell />

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              {/* Admin Profile Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-navy-900 text-cyan-400 font-bold text-xs flex items-center justify-center border border-navy-800 shadow-xs">
                    {admin?.name ? admin.name.slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                      {admin?.name || currentUser?.email || 'Administrator'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">{admin?.designation || 'Convenor'}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-elevated border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-navy-950">{admin?.name || currentUser?.email || 'Administrator'}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{admin?.email || currentUser?.email || 'admin@kitcbe.com'}</p>
                      <span className="inline-block text-[10px] font-semibold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded mt-1.5">
                        {admin?.department || 'Directorate of Student Innovation'}
                      </span>
                    </div>

                    <div className="py-1">
                      {isPlatformAdministrator(currentUser) && (
                        <>
                          <Link
                            to="/admin/settings"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <Settings className="w-3.5 h-3.5 text-slate-400" />
                            <span>System Settings</span>
                          </Link>
                          <Link
                            to="/admin/notifications"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <BellRing className="w-3.5 h-3.5 text-slate-400" />
                            <span>Alerts & Notifications</span>
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 transition-all">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
