import React from 'react';
import { Search, X, RotateCcw, Filter } from 'lucide-react';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

export interface ActiveFilterChip {
  key: string;
  label: string;
  displayValue: string;
  onRemove: () => void;
}

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeChips?: ActiveFilterChip[];
  onClearAll?: () => void;
  extraActions?: React.ReactNode;
  className?: string;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  activeChips = [],
  onClearAll,
  extraActions,
  className = ''
}) => {
  const hasActiveFilters = Boolean(searchQuery.trim()) || activeChips.length > 0;

  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 p-4 shadow-subtle space-y-3 ${className}`}>
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input with clear button */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Extra Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
            >
              <option value="ALL">All {filter.label}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}

          {hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          )}

          {extraActions}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Active:</span>
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 border border-blue-200 text-blue-900"
            >
              <span>
                <strong>{chip.label}:</strong> {chip.displayValue}
              </span>
              <button
                onClick={chip.onRemove}
                className="text-blue-500 hover:text-blue-800 p-0.5 rounded-full hover:bg-blue-100 transition-colors"
                title={`Remove ${chip.label} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};
