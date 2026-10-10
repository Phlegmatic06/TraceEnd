import { hashString } from '@/lib/crypto';

export interface FingerprintParams {
  repositoryId: string;
  detectorType: string;
  filePath: string;
  rawSecret: string;
}

export interface FingerprintResult {
  secretFingerprint: string;
  findingFingerprint: string;
}

/**
 * Creates a non-reversible cryptographic fingerprint of the finding.
 * Ensures that identical secrets in the exact same file produce the same slug for idempotency,
 * without ever storing or logging the raw secret.
 */
export function createFindingFingerprint(params: FingerprintParams): FingerprintResult {
  // 1. One-way hash of the raw secret
  const secretFingerprint = hashString(params.rawSecret);

  // 2. Hash of the location + detector + secretHash
  const baseString = `${params.repositoryId}:${params.detectorType}:${params.filePath}:${secretFingerprint}`;
  const findingFingerprint = hashString(baseString);

  return {
    secretFingerprint,
    findingFingerprint
  };
}
