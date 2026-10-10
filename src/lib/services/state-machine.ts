import { ScanStatus, FindingStatus } from '@/generated/prisma/client';
import { ValidationError } from '../errors';

export const VALID_FINDING_TRANSITIONS: Record<FindingStatus, FindingStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK', 'FALSE_POSITIVE', 'MITIGATED'],
  IN_PROGRESS: ['OPEN', 'RESOLVED', 'MITIGATED'],
  MITIGATED: ['OPEN', 'RESOLVED', 'IN_PROGRESS', 'ACCEPTED_RISK'],
  RESOLVED: ['OPEN', 'IN_PROGRESS'],
  ACCEPTED_RISK: ['OPEN', 'RESOLVED', 'IN_PROGRESS'],
  FALSE_POSITIVE: ['OPEN', 'RESOLVED', 'IN_PROGRESS'],
};

export const VALID_SCAN_TRANSITIONS: Record<ScanStatus, ScanStatus[]> = {
  QUEUED: ['RUNNING', 'FAILED', 'COMPLETED', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function validateFindingTransition(from: FindingStatus, to: FindingStatus) {
  if (from === to) return true;
  if (!VALID_FINDING_TRANSITIONS[from].includes(to)) {
    throw new ValidationError(`Invalid finding state transition from ${from} to ${to}`);
  }
  return true;
}

export function validateScanTransition(from: ScanStatus, to: ScanStatus) {
  if (from === to) return true;
  if (!VALID_SCAN_TRANSITIONS[from].includes(to)) {
    throw new ValidationError(`Invalid scan state transition from ${from} to ${to}`);
  }
  return true;
}
