'use client';
import React, { useState } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface AdvancedFilterProps {
  filters: {
    status?: FilterOption[];
    dateRange?: boolean;
    sort?: { label: string; value: string }[];
  };
  onFilterChange: (filters: Record<string, any>) => void;
  onReset: () => void;
}

export function AdvancedFilter({
  filters = {},
  onFilterChange,
  onReset,
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    sortBy: '',
  });

  const handleChange = (key: string, value: string) => {
    const updated = { ...selectedFilters, [key]: value };
    setSelectedFilters(updated);
    onFilterChange(updated);
  };

  const handleReset = () => {
    setSelectedFilters({
      status: '',
      startDate: '',
      endDate: '',
      sortBy: '',
    });
    onReset();
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-2"
        aria-expanded={isOpen}
      >
        <span>🔽 Filters</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 z-50 space-y-3">
          {/* Status Filter */}
          {filters.status && (
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select
                value={selectedFilters.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full border rounded p-1 text-xs"
              >
                <option value="">All statuses</option>
                {filters.status.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filter */}
          {filters.dateRange && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={selectedFilters.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full border rounded p-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={selectedFilters.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="w-full border rounded p-1 text-xs"
                />
              </div>
            </>
          )}

          {/* Sort Filter */}
          {filters.sort && (
            <div>
              <label className="block text-xs font-medium mb-1">Sort By</label>
              <select
                value={selectedFilters.sortBy}
                onChange={(e) => handleChange('sortBy', e.target.value)}
                className="w-full border rounded p-1 text-xs"
              >
                <option value="">Default</option>
                {filters.sort.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <button
              onClick={handleReset}
              className="btn text-xs px-2 py-1 flex-1 bg-gray-100 hover:bg-gray-200"
            >
              Reset
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="btn text-xs px-2 py-1 flex-1"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
