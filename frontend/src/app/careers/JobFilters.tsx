'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ALL_DEPARTMENTS, ALL_LOCATIONS, ALL_TYPES } from './constants';
import { X, Menu } from 'lucide-react';

interface JobFiltersProps {
  department: string | undefined;
  location: string | undefined;
  type: string | undefined;
  onDepartmentChange: (dept: string | undefined) => void;
  onLocationChange: (loc: string | undefined) => void;
  onTypeChange: (type: string | undefined) => void;
  results?: number;
  resultCount?: number;
  onClearFilters: () => void;
}

export default function JobFilters({
  department,
  location,
  type,
  onDepartmentChange,
  onLocationChange,
  onTypeChange,
  results,
  resultCount,
  onClearFilters,
}: JobFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = results || resultCount || 0;
  const hasActiveFilters = department || location || type;

  const renderFilterContent = () => (
    <>
      {/* Department Filter */}
      <div>
        <h3 className="font-semibold text-lg mb-3">Department</h3>
        <div className="space-y-2">
          {['All', ...ALL_DEPARTMENTS].map((dept) => (
            <button
              key={dept}
              onClick={() => {
                onDepartmentChange(dept === 'All' ? undefined : dept);
                setMobileOpen(false);
              }}
              aria-pressed={department === (dept === 'All' ? undefined : dept)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                department === (dept === 'All' ? undefined : dept)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Location Filter */}
      <div>
        <h3 className="font-semibold text-lg mb-3">Location</h3>
        <div className="space-y-2">
          {['All', ...ALL_LOCATIONS].map((loc) => (
            <button
              key={loc}
              onClick={() => {
                onLocationChange(loc === 'All' ? undefined : loc);
                setMobileOpen(false);
              }}
              aria-pressed={location === (loc === 'All' ? undefined : loc)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                location === (loc === 'All' ? undefined : loc)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div>
        <h3 className="font-semibold text-lg mb-3">Employment Type</h3>
        <div className="space-y-2">
          {['All', ...ALL_TYPES].map((t) => (
            <button
              key={t}
              onClick={() => {
                onTypeChange(t === 'All' ? undefined : t);
                setMobileOpen(false);
              }}
              aria-pressed={type === (t === 'All' ? undefined : t)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                type === (t === 'All' ? undefined : t)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="p-3 bg-secondary rounded-md">
        <p className="text-sm font-medium">
          {count} position{count !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onClearFilters();
            setMobileOpen(false);
          }}
          className="w-full"
        >
          Clear Filters
        </Button>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full"
        >
          {mobileOpen ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Close Filters
            </>
          ) : (
            <>
              <Menu className="h-4 w-4 mr-2" />
              Open Filters
            </>
          )}
        </Button>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)}>
          <aside
            className="absolute top-0 left-0 bottom-0 w-64 bg-background border-r p-6 space-y-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Filters</h2>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderFilterContent()}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:block space-y-6" aria-label="Filter jobs">
        {renderFilterContent()}
      </aside>
    </>
  );
}
