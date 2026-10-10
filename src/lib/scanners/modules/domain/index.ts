import { Scanner, ScannerFinding, ScannerResult, ScannerRemediationTemplate, scannerRegistry } from '../../types';
import { AssetType, FindingCategory, Severity, Confidence } from '@/generated/prisma/client';
import { checkEmailSecurity } from './email-security';
import { checkDnsSecurity } from './dns';
import { fetchHttpInfo } from './http';
import { checkSecurityHeaders } from './headers';
import { checkTlsSecurity } from './tls';

export class DomainSecurityScanner implements Scanner {
  readonly id = 'domain-security-baseline';
  readonly name = 'Domain Security Baseline';
  readonly supportedAssetTypes = [AssetType.DOMAIN, AssetType.WEBSITE];

  async execute(assetIdentifier: string, assetType: AssetType, config?: Record<string, unknown>): Promise<ScannerResult> {
    const findings: ScannerFinding[] = [];
    const passedChecks: string[] = [];
    const remediations = new Map<string, ScannerRemediationTemplate[]>();
    const domain = this.extractDomain(assetIdentifier);
    const verifyFindingSlug = config?.verifyFindingSlug as string | undefined;
    
    // Helper to merge results
    const merge = (res: { findings: ScannerFinding[], passedChecks: string[], remediations: Map<string, ScannerRemediationTemplate[]> }) => {
      findings.push(...res.findings);
      passedChecks.push(...res.passedChecks);
      res.remediations.forEach((templates, slug) => remediations.set(slug, templates));
    };

    const evaluatedCategories = new Set<FindingCategory>([FindingCategory.DOMAIN_SECURITY]);

    // 1. DNS Checks (CAA)
    if (!verifyFindingSlug || verifyFindingSlug === 'missing-caa-record') {
      merge(await checkDnsSecurity({ domain }));
    }
    
    // 2. Email Security Checks (SPF, DMARC)
    const emailSlugs = ['missing-spf-record', 'multiple-spf-records', 'permissive-spf-policy', 'missing-dmarc-record', 'dmarc-policy-none'];
    if (!verifyFindingSlug || emailSlugs.includes(verifyFindingSlug)) {
      merge(await checkEmailSecurity({ domain }));
    }

    // 3. HTTP / HTTPS / Headers / TLS Checks
    const httpSlugs = [
      'tls-missing', 'tls-expired', 'tls-expiring', 'tls-hostname-mismatch',
      'missing-hsts-header', 'missing-clickjacking-protection', 'missing-x-content-type-options',
      'missing-csp', 'missing-referrer-policy', 'missing-permissions-policy', 'http-connection-failed'
    ];
    
    if (!verifyFindingSlug || httpSlugs.includes(verifyFindingSlug)) {
      try {
        const httpInfo = await fetchHttpInfo(domain);
        
        // We successfully got HTTP(s) info, so we can evaluate TLS and Headers
        evaluatedCategories.add(FindingCategory.TLS_SECURITY);
        evaluatedCategories.add(FindingCategory.HEADER_SECURITY);
        
        // TLS Check
        merge(checkTlsSecurity(domain, httpInfo.cert));
        
        // Security Headers Check
        merge(checkSecurityHeaders(domain, httpInfo.headers));
        
      } catch (error) {
        // If HTTP fails completely (e.g. timeout, SSRF prevention)
        findings.push({
          title: 'HTTP Connection Failed',
          slug: 'http-connection-failed',
          category: FindingCategory.DOMAIN_SECURITY,
          severity: Severity.MEDIUM,
          confidence: Confidence.CONFIRMED,
          description: `Could not connect to ${domain} over HTTP/HTTPS.`,
          plainEnglishExplanation: 'Your website did not respond to requests, or it was blocked by internal security rules.',
          technicalDetails: String(error),
          potentialImpact: 'Availability issues or lack of web service.',
          remediationSummary: 'Ensure your web server is running and accessible from the public internet.',
        });
      }
    }

    return { findings, passedChecks, remediations, evaluatedCategories: Array.from(evaluatedCategories) };
  }

  private extractDomain(identifier: string): string {
    try {
      if (identifier.startsWith('http://') || identifier.startsWith('https://')) {
        return new URL(identifier).hostname;
      }
      return identifier;
    } catch {
      return identifier;
    }
  }
}

// Register the scanner
scannerRegistry.register(new DomainSecurityScanner());
