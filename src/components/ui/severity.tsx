import { SEVERITY_CONFIG } from '@/lib/types';
import type { Severity } from '@/generated/prisma/client';

interface SeverityIndicatorProps {
  severity: Severity;
  showLabel?: boolean;
  className?: string;
}

export function SeverityIndicator({ severity, showLabel = true, className = '' }: SeverityIndicatorProps) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-xs font-medium text-gray-700">{config.label}</span>
      )}
      <span className="sr-only">{`Severity: ${config.label}`}</span>
    </span>
  );
}

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const severityBadgeClasses: Record<Severity, string> = {
  CRITICAL: 'bg-severity-critical-bg text-severity-critical border-red-200',
  HIGH: 'bg-severity-high-bg text-severity-high border-orange-200',
  MEDIUM: 'bg-severity-medium-bg text-severity-medium border-amber-200',
  LOW: 'bg-gray-50 text-gray-600 border-gray-200',
  INFORMATIONAL: 'bg-gray-50 text-gray-500 border-gray-200',
};

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-sm ${severityBadgeClasses[severity]} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
