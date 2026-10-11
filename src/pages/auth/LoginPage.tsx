import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Shield, ArrowRight, Code2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full">
        {/* Core HACKHUB Identity Box */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-elevated p-8 sm:p-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-950 text-cyan-400 mb-4 shadow-sm border border-navy-800">
            <Code2 className="w-7 h-7" />
          </div>

          <h1 className="text-3xl font-extrabold font-display text-navy-950 tracking-tight">
            HACKHUB
          </h1>

          <p className="mt-2 text-sm font-bold text-blue-600 uppercase tracking-widest">
            Post. Participate. Track. Achieve.
          </p>

          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
            KalaignarKarunanidhi Institute Of Technology • Autonomous
            <br />
            College Hackathon Posting, Monitoring & Student Participation Management System
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 space-y-3.5 max-w-sm mx-auto">
            <Link
              to="/student-login"
              className="w-full flex items-center justify-between px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all group"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-blue-200" />
                <span>Student Sign In</span>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/login"
              className="w-full flex items-center justify-between px-6 py-4 rounded-xl bg-navy-950 hover:bg-navy-900 text-white font-semibold text-sm shadow-sm hover:shadow transition-all group"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span>Admin Sign In</span>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Faculty Application Link */}
          <div className="mt-5 text-center text-xs text-slate-500">
            <span>Faculty seeking coordinator access? </span>
            <Link to="/admin/signup" className="font-semibold text-navy-950 hover:text-navy-800 underline underline-offset-2">
              Apply for Faculty Coordinator Access
            </Link>
          </div>

          {/* Role Distinction Badges */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-left">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>Student Portal</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Discover hackathons, create teams, submit project repositories & files.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-navy-800" />
                <span>Faculty / Admin</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Post college hackathons, monitor student participation, review submissions, and record results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
