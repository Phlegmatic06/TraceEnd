import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-status-success-bg text-status-success border-green-200',
  warning: 'bg-status-warning-bg text-status-warning border-amber-200',
  danger: 'bg-status-danger-bg text-status-danger border-red-200',
  info: 'bg-status-info-bg text-status-info border-blue-200',
  muted: 'bg-gray-50 text-gray-500 border-gray-200',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-sm ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
