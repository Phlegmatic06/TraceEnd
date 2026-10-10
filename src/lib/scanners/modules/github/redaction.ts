/**
 * Redacts a secret string for safe storage and display.
 * Example: ghp_1234567890abcdefghijklmnopqrstuvwxyz -> ghp_••••••••••••••••••••••••••wxyz
 */
export function redactSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '********';

  // For GitHub tokens and similar formatted tokens
  if (secret.startsWith('ghp_') || secret.startsWith('gho_') || secret.startsWith('github_pat_')) {
    const prefixLength = secret.indexOf('_') + 1; // Length including the first underscore
    const visiblePrefix = secret.substring(0, prefixLength);
    const visibleSuffix = secret.substring(secret.length - 4);
    const maskedLen = secret.length - prefixLength - 4;
    return `${visiblePrefix}${'•'.repeat(Math.max(4, maskedLen))}${visibleSuffix}`;
  }

  // AWS keys typically start with AKIA...
  if (secret.startsWith('AKIA') && secret.length === 20) {
    return `AKIA${'•'.repeat(12)}${secret.substring(16)}`;
  }

  // Generic redaction: keep first 4 and last 4
  const visiblePrefix = secret.substring(0, 4);
  const visibleSuffix = secret.substring(secret.length - 4);
  const maskedLen = secret.length - 8;
  
  return `${visiblePrefix}${'•'.repeat(Math.max(4, maskedLen))}${visibleSuffix}`;
}

/**
 * Extracts and redacts a private key block without logging the contents.
 */
export function redactPrivateKey(): string {
  return '-----BEGIN PRIVATE KEY-----\n[REDACTED]\n-----END PRIVATE KEY-----';
}
