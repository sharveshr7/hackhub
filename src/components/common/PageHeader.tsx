import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  count?: number;
  countLabel?: string;
  category?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  count,
  countLabel,
  category,
  actions,
  children,
  className = ''
}) => {
  const renderedBadge = badge || (count !== undefined ? (
    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
      {count} {countLabel || 'Items'}
    </span>
  ) : null);

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
    >
      <div className="min-w-0 flex-1">
        {(category || renderedBadge) && (
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {category && (
              <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase font-sans">
                {category}
              </span>
            )}
            {category && renderedBadge && <span className="text-slate-300">•</span>}
            {renderedBadge}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold font-display text-navy-950 tracking-tight leading-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};
