'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface FindingsFiltersProps {
  currentSeverity?: string;
  currentStatus?: string;
  currentCategory?: string;
  currentSearch?: string;
}

const severities = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
const statuses = ['', 'OPEN', 'IN_PROGRESS', 'MITIGATED', 'RESOLVED', 'ACCEPTED_RISK', 'FALSE_POSITIVE'];
const categories = [
  '', 'SECRETS', 'BREACH_EXPOSURE', 'DOMAIN_SECURITY', 'WEB_SECURITY',
  'TLS_SECURITY', 'HEADER_SECURITY', 'DIGITAL_FOOTPRINT', 'IMAGE_METADATA',
  'ACCOUNT_SECURITY', 'CONFIGURATION', 'OTHER',
];

function formatLabel(s: string): string {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FindingsFilters({
  currentSeverity,
  currentStatus,
  currentCategory,
  currentSearch,
}: FindingsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page'); // reset page on filter change
      router.push(`/findings?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <input
        type="search"
        placeholder="Search findings..."
        defaultValue={currentSearch || ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            updateParams('search', (e.target as HTMLInputElement).value);
          }
        }}
        className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 w-56"
        aria-label="Search findings"
      />

      {/* Severity filter */}
      <select
        value={currentSeverity || ''}
        onChange={(e) => updateParams('severity', e.target.value)}
        className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400"
        aria-label="Filter by severity"
      >
        <option value="">All severities</option>
        {severities.filter(Boolean).map((s) => (
          <option key={s} value={s}>{formatLabel(s)}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={currentStatus || ''}
        onChange={(e) => updateParams('status', e.target.value)}
        className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400"
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {statuses.filter(Boolean).map((s) => (
          <option key={s} value={s}>{formatLabel(s)}</option>
        ))}
      </select>

      {/* Category filter */}
      <select
        value={currentCategory || ''}
        onChange={(e) => updateParams('category', e.target.value)}
        className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400"
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.filter(Boolean).map((s) => (
          <option key={s} value={s}>{formatLabel(s)}</option>
        ))}
      </select>

      {/* Clear filters */}
      {(currentSeverity || currentStatus || currentCategory || currentSearch) && (
        <button
          onClick={() => router.push('/findings')}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-75 px-2 py-1.5"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
