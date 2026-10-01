// ──────────────────────────────────────────────────────────────
// TraceEnd — Shared Types
// Types used across frontend and backend boundaries.
// ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Severity metadata for UI rendering */
export const SEVERITY_CONFIG = {
  CRITICAL: { label: 'Critical', color: 'var(--severity-critical)', order: 0 },
  HIGH: { label: 'High', color: 'var(--severity-high)', order: 1 },
  MEDIUM: { label: 'Medium', color: 'var(--severity-medium)', order: 2 },
  LOW: { label: 'Low', color: 'var(--severity-low)', order: 3 },
  INFORMATIONAL: { label: 'Info', color: 'var(--severity-info)', order: 4 },
} as const;

export const FINDING_STATUS_CONFIG = {
  OPEN: { label: 'Open', variant: 'default' as const },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' as const },
  MITIGATED: { label: 'Mitigated', variant: 'info' as const },
  RESOLVED: { label: 'Resolved', variant: 'success' as const },
  ACCEPTED_RISK: { label: 'Accepted Risk', variant: 'muted' as const },
  FALSE_POSITIVE: { label: 'False Positive', variant: 'muted' as const },
} as const;

export const SCAN_STATUS_CONFIG = {
  QUEUED: { label: 'Queued', variant: 'muted' as const },
  RUNNING: { label: 'Running', variant: 'warning' as const },
  COMPLETED: { label: 'Completed', variant: 'success' as const },
  FAILED: { label: 'Failed', variant: 'danger' as const },
  CANCELLED: { label: 'Cancelled', variant: 'muted' as const },
} as const;

export const ASSET_TYPE_CONFIG = {
  EMAIL: { label: 'Email', icon: 'mail' },
  USERNAME: { label: 'Username', icon: 'user' },
  DOMAIN: { label: 'Domain', icon: 'globe' },
  WEBSITE: { label: 'Website', icon: 'monitor' },
  GITHUB_ACCOUNT: { label: 'GitHub Account', icon: 'github' },
  GITHUB_REPOSITORY: { label: 'GitHub Repo', icon: 'git-branch' },
  IMAGE: { label: 'Image', icon: 'image' },
  OTHER: { label: 'Other', icon: 'file' },
} as const;

export const VERIFICATION_STATUS_CONFIG = {
  UNVERIFIED: { label: 'Unverified', variant: 'muted' as const },
  PENDING: { label: 'Pending', variant: 'warning' as const },
  VERIFIED: { label: 'Verified', variant: 'success' as const },
  FAILED: { label: 'Failed', variant: 'danger' as const },
} as const;
