import React from 'react';
import { Check, Clock, Lock } from 'lucide-react';
import { RegistrationStatus } from '../../types';

interface Step {
  id: string;
  label: string;
  description?: string;
}

const HACKATHON_STAGES: Step[] = [
  { id: 'REGISTRATION', label: 'Registration', description: 'Submit student details & accept rules' },
  { id: 'TEAM', label: 'Team Formation', description: 'Create or join a team with min 2 members' },
  { id: 'ATTENDANCE', label: 'Attendance', description: 'Venue verification code check-in' },
  { id: 'DEVELOPMENT', label: 'Hackathon Sprint', description: 'Code & build your solution' },
  { id: 'SUBMISSION', label: 'Submission', description: 'GitHub, demo URL & presentation upload' },
  { id: 'EVALUATION', label: 'Evaluation', description: 'Jury review & score allocation' },
  { id: 'RESULTS', label: 'Results & Honors', description: 'Certificates & winner announcements' }
];

export const getStageIndex = (status: RegistrationStatus): number => {
  switch (status) {
    case 'NOT_REGISTERED':
      return 0;
    case 'REGISTERED':
      return 1;
    case 'TEAM_PENDING':
      return 1;
    case 'TEAM_CONFIRMED':
      return 2;
    case 'ATTENDANCE_PENDING':
      return 2;
    case 'ATTENDED':
      return 3;
    case 'SUBMISSION_PENDING':
      return 4;
    case 'SUBMITTED':
      return 5;
    case 'UNDER_REVIEW':
      return 5;
    case 'SHORTLISTED':
    case 'WINNER':
    case 'COMPLETED':
      return 6;
    default:
      return 0;
  }
};

interface ProgressStepperProps {
  currentStatus: RegistrationStatus;
  className?: string;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({ currentStatus, className = '' }) => {
  const currentStageIndex = getStageIndex(currentStatus);

  return (
    <div className={`w-full py-4 ${className}`}>
      {/* Desktop view */}
      <div className="hidden lg:grid grid-cols-7 gap-2 relative">
        {HACKATHON_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isUpcoming = idx > currentStageIndex;

          return (
            <div key={stage.id} className="flex flex-col items-center text-center relative group">
              {/* Connector line */}
              {idx < HACKATHON_STAGES.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors ${
                    idx < currentStageIndex ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}

              {/* Node indicator */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 z-10 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-50'
                    : isCurrent
                    ? 'bg-navy-900 text-cyan-400 ring-4 ring-cyan-100 border-2 border-cyan-400 shadow-glow-cyan'
                    : 'bg-white border border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 animate-spin-slow" />
                ) : (
                  <Lock className="w-3 h-3 text-slate-300" />
                )}
              </div>

              {/* Text label */}
              <div className="mt-2.5 px-1">
                <p
                  className={`text-xs font-semibold tracking-tight ${
                    isCurrent
                      ? 'text-navy-900 font-bold'
                      : isCompleted
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  {stage.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile/Tablet scrollable view */}
      <div className="lg:hidden flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {HACKATHON_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;

          return (
            <div
              key={stage.id}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                isCurrent
                  ? 'bg-navy-950 text-white border-cyan-500/50 shadow-sm'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-cyan-500 text-navy-950'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
              <span className="font-medium whitespace-nowrap">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
