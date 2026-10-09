import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../lib/store';
import { Code2, Award, Terminal, LogIn, ChevronRight, ShieldCheck } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* Main College Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & College Brand */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-xl bg-navy-900 flex items-center justify-center text-white shadow-elevated border border-navy-800 group-hover:scale-105 transition-transform">
              <Code2 className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg text-navy-950 tracking-tight leading-none">
                  HackHub
                </span>
                <span className="text-[10px] font-bold bg-navy-100 text-navy-800 px-1.5 py-0.5 rounded tracking-wider uppercase">
                  Official Portal
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium block mt-1 tracking-normal">
                KalaignarKarunanidhi Institute Of Technology
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link
              to="/hackathons"
              className={`hover:text-navy-900 transition-colors ${
                location.pathname === '/hackathons' ? 'text-navy-900 font-semibold' : ''
              }`}
            >
              All Hackathons
            </Link>
            <a href="/#how-it-works" className="hover:text-navy-900 transition-colors">
              How It Works
            </a>
            <a href="/#why-participate" className="hover:text-navy-900 transition-colors">
              Why Participate
            </a>
            <a href="/#announcements" className="hover:text-navy-900 transition-colors">
              Announcements
            </a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                onClick={() => navigate(currentUser.role === 'ADMIN' ? '/admin' : '/student')}
                className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all"
              >
                <span>{currentUser.role === 'ADMIN' ? 'Admin Portal' : 'Student Dashboard'}</span>
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/student-login"
                  className="text-xs sm:text-sm font-medium text-slate-700 hover:text-navy-950 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Student Login
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Portal Login</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Official College Portal Footer */}
      <footer className="bg-navy-950 text-slate-400 border-t border-navy-900 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-navy-900">
            {/* Col 1 */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center text-cyan-400 border border-navy-800">
                  <Terminal className="w-5 h-5" />
                </div>
                <span className="font-display font-bold text-lg text-white">HackHub</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                College Hackathon Posting, Monitoring & Student Participation Management System. A centralized institutional platform for faculty posting and student participation tracking.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>College Participation Management System</span>
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Navigation</h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link to="/hackathons" className="hover:text-cyan-400 transition-colors">Browse Hackathons</Link></li>
                <li><Link to="/student-login" className="hover:text-cyan-400 transition-colors">Student Sign-In</Link></li>
                <li><Link to="/admin/login" className="hover:text-cyan-400 transition-colors">Faculty / Admin Portal</Link></li>
                <li><a href="/#how-it-works" className="hover:text-cyan-400 transition-colors">Participation Workflow</a></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Host Departments</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>Computer Science & Engineering</li>
                <li>Information Technology</li>
                <li>Biomedical Engineering</li>
                <li>Electronics & Communication</li>
                <li>Electrical & Electronics</li>
                <li>Mechanical Engineering</li>
              </ul>
            </div>

            {/* Col 4 */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Campus Contact</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                KalaignarKarunanidhi Institute Of Technology<br />
                Pappampatti Rd, Pallapalayam, Kannampalayam, Tamil Nadu 641402<br />
                Email: hackathons@kitcbe.com<br />
                Phone: +91 422 236 7890
              </p>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] text-slate-300 font-medium">College Hackathon Portal</span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} KalaignarKarunanidhi Institute Of Technology. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Code of Conduct</span>
              <span>Privacy Policy</span>
              <span>Terms of Participation</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
