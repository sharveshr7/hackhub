import React from 'react';

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-subtle animate-pulse space-y-4"
        >
          <div className="w-full h-36 bg-slate-200 rounded-lg" />
          <div className="h-5 bg-slate-200 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-3.5 bg-slate-100 rounded w-full" />
            <div className="h-3.5 bg-slate-100 rounded w-5/6" />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-8 bg-slate-200 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-6 gap-4">
        <div className="w-6 h-4 bg-slate-200 rounded" />
        <div className="w-24 h-4 bg-slate-200 rounded" />
        <div className="w-32 h-4 bg-slate-200 rounded" />
        <div className="w-28 h-4 bg-slate-200 rounded" />
        <div className="w-20 h-4 bg-slate-200 rounded ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-14 border-b border-slate-100 px-6 flex items-center gap-4"
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-4 bg-slate-100 rounded w-1/6" />
          <div className="h-4 bg-slate-100 rounded w-1/5" />
          <div className="h-6 bg-slate-200 rounded-full w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-64 bg-slate-200 rounded-2xl w-full" />
      {/* 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-3 bg-slate-200 rounded w-1/3" />
            <div className="h-8 bg-slate-200 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>
      {/* 2 Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-white rounded-xl border border-slate-200 p-6" />
        <div className="h-72 bg-white rounded-xl border border-slate-200 p-6" />
      </div>
    </div>
  );
};

export const HackathonSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
      {/* Banner */}
      <div className="h-72 bg-slate-200 rounded-2xl w-full" />
      {/* Stat pill bar */}
      <div className="h-14 bg-white rounded-xl border border-slate-200 w-full" />
      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-48 bg-white rounded-xl border border-slate-200" />
          <div className="h-48 bg-white rounded-xl border border-slate-200" />
        </div>
        <div className="space-y-4">
          <div className="h-60 bg-white rounded-xl border border-slate-200" />
          <div className="h-40 bg-white rounded-xl border border-slate-200" />
        </div>
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-slate-200 shrink-0" />
        <div className="space-y-3 flex-1">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-4 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-white rounded-xl border border-slate-200" />
        <div className="h-32 bg-white rounded-xl border border-slate-200" />
        <div className="h-32 bg-white rounded-xl border border-slate-200" />
      </div>
    </div>
  );
};

export const NotificationSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-200 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-3.5 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-1/5" />
          </div>
        </div>
      ))}
    </div>
  );
};
