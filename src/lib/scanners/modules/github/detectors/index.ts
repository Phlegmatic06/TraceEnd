import { redactSecret, redactPrivateKey } from '../redaction';

export interface SecretDetector {
  id: string;
  name: string;
  pattern: RegExp;
  category: 'SECRETS';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  confidence: 'CONFIRMED' | 'HIGH';
  description: string;
  extract: (match: RegExpExecArray, content: string) => { 
    rawSecret: string; 
    redacted: string;
    line?: number;
  };
}

// Common Regexes
const GITHUB_PAT_REGEX = /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}/g;
// Basic matching for typical private key blocks
const PRIVATE_KEY_REGEX = /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----\s*[\s\S]+?\s*-----END (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g;
const AWS_ACCESS_KEY_REGEX = /(AKIA|ASIA|AGPA|AIDA|AROA)[A-Z0-9]{16}/g;
// Detects typical postgres:// or mysql:// connection strings containing a password
const DB_URL_REGEX = /(postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[a-zA-Z0-9_.-]+:([^@\s]+)@[a-zA-Z0-9_.-]+(?::\d+)?\/(?:[a-zA-Z0-9_.-]+)?/g;
// Detects stripe live secret keys
const STRIPE_SECRET_KEY_REGEX = /(?:sk_live|rk_live)_[0-9a-zA-Z]{24,34}/g;

function getLineNumber(content: string, index: number): number {
  const upToIndex = content.substring(0, index);
  return (upToIndex.match(/\n/g) || []).length + 1;
}

export const detectors: SecretDetector[] = [
  {
    id: 'github-token',
    name: 'GitHub Personal Access Token',
    pattern: GITHUB_PAT_REGEX,
    category: 'SECRETS',
    severity: 'CRITICAL',
    confidence: 'CONFIRMED',
    description: 'A GitHub Personal Access Token or OAuth token was found. This can provide unauthorized access to GitHub repositories and settings.',
    extract: (match, content) => ({
      rawSecret: match[0],
      redacted: redactSecret(match[0]),
      line: getLineNumber(content, match.index)
    })
  },
  {
    id: 'private-key',
    name: 'Private Key',
    pattern: PRIVATE_KEY_REGEX,
    category: 'SECRETS',
    severity: 'CRITICAL',
    confidence: 'CONFIRMED',
    description: 'An unencrypted private key was found. This key could be used to decrypt sensitive data or bypass authentication.',
    extract: (match, content) => ({
      rawSecret: match[0], // the whole block is considered the raw secret
      redacted: redactPrivateKey(), // never show any part of the block
      line: getLineNumber(content, match.index)
    })
  },
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    pattern: AWS_ACCESS_KEY_REGEX,
    category: 'SECRETS',
    severity: 'HIGH', // Paired with secret it's critical, but access key alone is high
    confidence: 'HIGH',
    description: 'An AWS Access Key ID was discovered. If the corresponding secret key is also exposed, an attacker could access cloud resources.',
    extract: (match, content) => ({
      rawSecret: match[0],
      redacted: redactSecret(match[0]),
      line: getLineNumber(content, match.index)
    })
  },
  {
    id: 'database-credential',
    name: 'Database Connection String with Credentials',
    pattern: DB_URL_REGEX,
    category: 'SECRETS',
    severity: 'CRITICAL',
    confidence: 'HIGH',
    description: 'A database connection string containing a password was found. This can lead to direct database compromise.',
    extract: (match, content) => {
      const secret = match[2] || '';
      return {
        rawSecret: secret,
        redacted: match[0].replace(secret, redactSecret(secret)),
        line: getLineNumber(content, match.index)
      };
    }
  },
  {
    id: 'stripe-secret-key',
    name: 'Stripe Secret Key',
    pattern: STRIPE_SECRET_KEY_REGEX,
    category: 'SECRETS',
    severity: 'CRITICAL',
    confidence: 'CONFIRMED',
    description: 'A live Stripe Secret Key was discovered. This allows full control over the Stripe account.',
    extract: (match, content) => ({
      rawSecret: match[0],
      redacted: redactSecret(match[0]),
      line: getLineNumber(content, match.index)
    })
  }
];
