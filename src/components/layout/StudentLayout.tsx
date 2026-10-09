import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { NotificationBell } from '../common/NotificationBell';
import {
  LayoutDashboard,
  Compass,
  FileCheck2,
  Users2,
  Send,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Code2,
  Award,
  Sparkles,
  Home,
  CalendarCheck,
  ChevronDown,
  Building2,
  ShieldCheck
} from 'lucide-react';

export const StudentLayout: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const logout = useAppStore((state) => state.logout);
  const notifications = useAppStore((state) => state.notifications);
  const registrations = useAppStore((state) => state.registrations);
  const hackathons = useAppStore((state) => state.hackathons);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const isLoadingAuth = useAppStore((state) => state.isLoadingAuth);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verifying Student Session...</p>
      </div>
    );
  }

  // Security guard: must be authenticated and must have STUDENT role
  if (!currentUser) {
    return <Navigate to="/student-login" state={{ from: location }} replace />;
  }

  if (currentUser.role !== 'STUDENT') {
    return <Navigate to="/admin" replace />;
  }

  const student = currentUser.studentData;
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  // Find active hackathon for this student
  const activeReg = registrations.find(
    (r) => r.studentId === student?.uid && (r.status === 'CONFIRMED' || r.status === 'ATTENDED' || r.status === 'SUBMITTED')
  );
  const activeHackathon = activeReg ? hackathons.find((h) => h.id === activeReg.hackathonId) : hackathons[0];

  const navLinks = [
    { to: '/student', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/student/hackathons', label: 'Explore Hackathons', icon: <Compass className="w-4 h-4" /> },
    { to: '/student/registrations', label: 'My Participation', icon: <FileCheck2 className="w-4 h-4" /> },
    { to: '/student/team', label: 'My Team', icon: <Users2 className="w-4 h-4" /> },
    { to: '/student/submissions', label: 'My Submissions', icon: <Send className="w-4 h-4" /> },
    {
      to: '/student/notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotifs > 0 ? unreadNotifs : undefined
    },
    { to: '/student/certificates', label: 'Achievements', icon: <Award className="w-4 h-4" /> },
    { to: '/student/profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
  ];

  const mobileBottomNav = [
    { to: '/student', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { to: '/student/hackathons', label: 'Explore', icon: <Compass className="w-5 h-5" /> },
    { to: '/student/registrations', label: 'Participation', icon: <CalendarCheck className="w-5 h-5" /> },
    { to: '/student/submissions', label: 'Submissions', icon: <Send className="w-5 h-5" /> },
    {
      to: '/student/notifications',
      label: 'Alerts',
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotifs > 0 ? unreadNotifs : undefined
    },
    { to: '/student/profile', label: 'Profile', icon: <User className="w-5 h-5" /> }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16 lg:pb-0">

      {/* Student Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & College Brand */}
          <div className="flex items-center gap-3">
            <Link to="/student" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center text-cyan-400 shadow-sm border border-navy-800 shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-bold text-sm sm:text-base text-navy-950 tracking-tight block leading-none">
                  HackHub
                </span>
                <span className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase">
                  KIT • Student Portal
                </span>
              </div>
            </Link>

            {/* Active Hackathon Pill Indicator */}
            {activeHackathon && (
              <Link
                to={`/student/hackathons/${activeHackathon.id}`}
                className="hidden xl:inline-flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs font-medium hover:bg-cyan-100 transition-colors"
                title="Your active hackathon"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
                <span>Active:</span>
                <span className="font-semibold text-cyan-950 truncate max-w-[150px]">{activeHackathon.title}</span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.to === '/student'
                  ? location.pathname === '/student'
                  : location.pathname.startsWith(link.to);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {link.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Area: Notification Bell & Profile dropdown */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Student Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-navy-900 to-blue-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-2 ring-blue-100 shrink-0">
                  {student?.avatarUrl ? (
                    <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    student?.name?.charAt(0) || 'S'
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">
                    {student?.name || currentUser?.email || 'Student'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {student?.registerNumber || 'KIT Student'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-elevated border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-navy-950 truncate">{student?.name || currentUser?.email || 'Student'}</p>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{student?.registerNumber || 'KIT Student'}</p>
                    <p className="text-[10px] text-blue-600 font-medium truncate mt-0.5">
                      {student?.department} • {student?.year}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/student/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Full Academic Profile</span>
                    </Link>
                    <Link
                      to="/student/registrations"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>My Registrations</span>
                    </Link>
                    <Link
                      to="/student/team"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <Users2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>My Team Squad</span>
                    </Link>
                    <Link
                      to="/student/certificates"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>Earned Certificates</span>
                    </Link>
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
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-navy-900 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.to === '/student'
                  ? location.pathname === '/student'
                  : location.pathname.startsWith(link.to);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-navy-900 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {link.icon}
                    <span>{link.label}</span>
                  </div>
                  {link.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-100 mt-2">
              <Link
                to="/student/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 font-medium hover:bg-slate-50"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>My Profile</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-600 font-medium hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1 shadow-lg">
        <div className="grid grid-cols-5 items-center">
          {mobileBottomNav.map((item) => {
            const isActive =
              item.to === '/student'
                ? location.pathname === '/student'
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-1.5 px-1 relative transition-colors ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>KalaignarKarunanidhi Institute Of Technology • Student Hackathon Operations & Verification Hub</p>
      </footer>
    </div>
  );
};
