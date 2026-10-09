import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  targetDate: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  label,
  className = '',
  compact = false
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isPast) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>Time Concluded</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-900 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
        <span>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center bg-navy-900/90 text-white border border-cyan-500/20 px-3 py-1.5 rounded-lg min-w-[50px] shadow-sm">
          <span className="text-base font-bold font-display text-cyan-400 leading-tight">{timeLeft.days}</span>
          <span className="text-[10px] text-slate-400 uppercase font-medium">Days</span>
        </div>
        <span className="text-slate-400 font-bold">:</span>
        <div className="flex flex-col items-center bg-navy-900/90 text-white border border-cyan-500/20 px-3 py-1.5 rounded-lg min-w-[50px] shadow-sm">
          <span className="text-base font-bold font-display text-cyan-400 leading-tight">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-medium">Hours</span>
        </div>
        <span className="text-slate-400 font-bold">:</span>
        <div className="flex flex-col items-center bg-navy-900/90 text-white border border-cyan-500/20 px-3 py-1.5 rounded-lg min-w-[50px] shadow-sm">
          <span className="text-base font-bold font-display text-cyan-400 leading-tight">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-medium">Mins</span>
        </div>
        <span className="text-slate-400 font-bold">:</span>
        <div className="flex flex-col items-center bg-navy-900/90 text-white border border-cyan-500/20 px-3 py-1.5 rounded-lg min-w-[50px] shadow-sm">
          <span className="text-base font-bold font-display text-cyan-400 leading-tight">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-medium">Secs</span>
        </div>
      </div>
    </div>
  );
};
