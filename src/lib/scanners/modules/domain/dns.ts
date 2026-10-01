import * as dns from 'dns/promises';
import { DomainCheck, DomainCheckContext, DomainCheckResult } from './types';
import { ScannerFinding, ScannerRemediationTemplate } from '../../types';
import { FindingCategory, Severity, Confidence } from '@/generated/prisma/client';

export const checkDnsSecurity: DomainCheck = async ({ domain }: DomainCheckContext): Promise<DomainCheckResult> => {
  const findings: ScannerFinding[] = [];
  const remediations = new Map<string, ScannerRemediationTemplate[]>();

  // 1. Check CAA Record
  try {
    const records = await dns.resolveCaa(domain);
    
    if (records.length === 0) {
      findings.push({
        title: 'Missing CAA Record',
        slug: 'missing-caa-record',
        category: FindingCategory.DOMAIN_SECURITY,
        severity: Severity.LOW, // As per spec: LOW / INFORMATIONAL
        confidence: Confidence.CONFIRMED,
        description: `The domain ${domain} does not have a CAA (Certificate Authority Authorization) record.`,
        plainEnglishExplanation: 'Your domain does not restrict which Certificate Authorities can issue SSL/TLS certificates for it.',
        technicalDetails: 'No CAA record was found.',
        potentialImpact: 'Any compromised Certificate Authority globally could misissue a valid certificate for your domain.',
        remediationSummary: 'Add a CAA record to your DNS settings restricting certificate issuance to your chosen CAs (e.g., Let\'s Encrypt).',
      });
      
      remediations.set('missing-caa-record', [{
        estimatedEffort: 'LOW',
        steps: [{
          order: 1,
          title: 'Add CAA Record',
          explanation: 'In your DNS provider, create a new CAA record specifying the CAs you use.',
          codeSnippet: '0 issue "letsencrypt.org"',
        }]
      }]);
    }
  } catch (error) {
    // If ENODATA or ENOTFOUND, CAA is missing
    findings.push({
      title: 'Missing CAA Record',
      slug: 'missing-caa-record',
      category: FindingCategory.DOMAIN_SECURITY,
      severity: Severity.LOW,
      confidence: Confidence.CONFIRMED,
      description: `The domain ${domain} does not have a CAA (Certificate Authority Authorization) record.`,
      plainEnglishExplanation: 'Your domain does not restrict which Certificate Authorities can issue SSL/TLS certificates for it.',
      technicalDetails: 'Failed to resolve CAA record.',
      potentialImpact: 'Any compromised Certificate Authority globally could misissue a valid certificate for your domain.',
      remediationSummary: 'Add a CAA record to your DNS settings.',
    });
  }

  return { findings, remediations };
};
