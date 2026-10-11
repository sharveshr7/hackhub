import React from 'react';
import { Cpu, HeartPulse, Zap, Shield, Code2, Sparkles, Building2 } from 'lucide-react';

interface HackathonBannerProps {
  id: string;
  title: string;
  mode?: string;
  organizer?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export const HackathonBanner: React.FC<HackathonBannerProps> = ({
  id,
  title,
  mode,
  organizer,
  className = '',
  size = 'md'
}) => {
  // Determine event theme from id or title
  const idLower = id.toLowerCase();
  const titleLower = title.toLowerCase();

  let theme = {
    bgGradient: 'from-slate-900 via-navy-950 to-blue-950',
    accentColor: 'text-cyan-400',
    glowColor: 'bg-cyan-500/20',
    badgeText: 'AI & INNOVATION',
    icon: <Cpu className="w-6 h-6 text-cyan-400" />,
    pattern: 'radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.25) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.2) 0%, transparent 50%)'
  };

  if (idLower.includes('health') || titleLower.includes('health')) {
    theme = {
      bgGradient: 'from-emerald-950 via-teal-900 to-navy-950',
      accentColor: 'text-emerald-400',
      glowColor: 'bg-emerald-500/20',
      badgeText: 'BIOMEDICAL & HEALTHTECH',
      icon: <HeartPulse className="w-6 h-6 text-emerald-400" />,
      pattern: 'radial-gradient(circle at 80% 30%, rgba(16, 185, 129, 0.25) 0%, transparent 50%), radial-gradient(circle at 20% 70%, rgba(20, 184, 166, 0.2) 0%, transparent 50%)'
    };
  } else if (idLower.includes('green') || titleLower.includes('green')) {
    theme = {
      bgGradient: 'from-emerald-950 via-green-900 to-slate-950',
      accentColor: 'text-lime-400',
      glowColor: 'bg-lime-500/20',
      badgeText: 'SUSTAINABILITY & CLEAN-TECH',
      icon: <Zap className="w-6 h-6 text-lime-400" />,
      pattern: 'radial-gradient(circle at 75% 25%, rgba(132, 204, 22, 0.25) 0%, transparent 50%), radial-gradient(circle at 25% 75%, rgba(16, 185, 129, 0.2) 0%, transparent 50%)'
    };
  } else if (idLower.includes('fintech') || titleLower.includes('fin') || titleLower.includes('bank')) {
    theme = {
      bgGradient: 'from-indigo-950 via-purple-950 to-slate-950',
      accentColor: 'text-indigo-400',
      glowColor: 'bg-indigo-500/20',
      badgeText: 'CYBERSECURITY & FINTECH',
      icon: <Shield className="w-6 h-6 text-indigo-400" />,
      pattern: 'radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.28) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)'
    };
  } else if (idLower.includes('code') || titleLower.includes('sprint') || titleLower.includes('forge')) {
    theme = {
      bgGradient: 'from-blue-950 via-navy-950 to-cyan-950',
      accentColor: 'text-cyan-400',
      glowColor: 'bg-cyan-500/20',
      badgeText: 'SYSTEMS & CLOUD ARCHITECTURE',
      icon: <Code2 className="w-6 h-6 text-cyan-400" />,
      pattern: 'radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.25) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.2) 0%, transparent 50%)'
    };
  } else if (idLower.includes('women') || titleLower.includes('women') || titleLower.includes('empower')) {
    theme = {
      bgGradient: 'from-rose-950 via-purple-950 to-navy-950',
      accentColor: 'text-pink-400',
      glowColor: 'bg-pink-500/20',
      badgeText: 'WOMEN IN TECH & CIVIC TECH',
      icon: <Sparkles className="w-6 h-6 text-pink-400" />,
      pattern: 'radial-gradient(circle at 75% 25%, rgba(244, 114, 182, 0.25) 0%, transparent 50%), radial-gradient(circle at 25% 75%, rgba(192, 132, 252, 0.2) 0%, transparent 50%)'
    };
  } else if (idLower.includes('campus') || titleLower.includes('campus') || titleLower.includes('cit')) {
    theme = {
      bgGradient: 'from-amber-950 via-slate-900 to-navy-950',
      accentColor: 'text-amber-400',
      glowColor: 'bg-amber-500/20',
      badgeText: 'SMART CAMPUS AUTOMATION',
      icon: <Building2 className="w-6 h-6 text-amber-400" />,
      pattern: 'radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.25) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)'
    };
  }

  const heightStyles = {
    sm: 'h-28',
    md: 'h-40',
    lg: 'h-48 sm:h-56',
    hero: 'h-64 sm:h-80'
  };

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden bg-gradient-to-br ${theme.bgGradient} flex flex-col justify-between p-4 sm:p-6 text-white border border-white/10 ${heightStyles[size]} ${className}`}
      style={{ backgroundImage: theme.pattern }}
    >
      {/* Decorative tech grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Tag Row */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/10 backdrop-blur-md border border-white/15 text-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          {theme.badgeText}
        </span>

        {mode && (
          <span className="text-[10px] font-semibold text-white/70 bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 uppercase">
            {mode.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Bottom Content Row */}
      <div className="relative z-10 flex items-end justify-between gap-4 mt-auto">
        <div className="min-w-0">
          <h4 className="font-display font-bold text-white text-base sm:text-lg tracking-tight leading-snug truncate drop-shadow-sm">
            {title}
          </h4>
          <p className="text-[11px] text-slate-300 font-medium truncate max-w-sm mt-0.5">
            {organizer || 'Student Opportunity'}
          </p>
        </div>

        <div className={`p-2 rounded-xl ${theme.glowColor} border border-white/15 backdrop-blur-md shrink-0`}>
          {theme.icon}
        </div>
      </div>
    </div>
  );
};
