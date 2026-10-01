import { ScannerFinding, ScannerRemediationTemplate } from '../../types';
import { FindingCategory, Severity, Confidence } from '@/generated/prisma/client';
import * as tls from 'tls';

export function checkTlsSecurity(domain: string, cert: any) {
  const findings: ScannerFinding[] = [];
  const remediations = new Map<string, ScannerRemediationTemplate[]>();

  if (!cert) {
    findings.push({
      title: 'TLS Certificate Missing or Invalid',
      slug: 'tls-missing',
      category: FindingCategory.DOMAIN_SECURITY,
      severity: Severity.HIGH,
      confidence: Confidence.CONFIRMED,
      description: `The domain ${domain} does not provide a valid TLS certificate.`,
      plainEnglishExplanation: 'Your website does not support secure HTTPS connections properly.',
      technicalDetails: 'No valid peer certificate could be retrieved during the TLS handshake.',
      potentialImpact: 'Connections to the site are not encrypted or are not trusted by browsers.',
      remediationSummary: 'Obtain and install a valid TLS certificate from a trusted Certificate Authority.',
    });
    return { findings, remediations };
  }

  const validTo = new Date(cert.valid_to);
  const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    findings.push({
      title: 'Expired TLS Certificate',
      slug: 'tls-expired',
      category: FindingCategory.DOMAIN_SECURITY,
      severity: Severity.CRITICAL,
      confidence: Confidence.CONFIRMED,
      description: `The TLS certificate for ${domain} has expired.`,
      plainEnglishExplanation: 'Your website\'s security certificate has expired. Browsers will show a scary security warning to visitors.',
      technicalDetails: `Certificate expired on ${validTo.toISOString()}. Days expired: ${Math.abs(daysRemaining)}`,
      potentialImpact: 'Visitors will be blocked from accessing your site by modern browsers.',
      remediationSummary: 'Renew your TLS certificate immediately.',
    });
  } else if (daysRemaining < 14) {
    findings.push({
      title: 'Expiring TLS Certificate',
      slug: 'tls-expiring',
      category: FindingCategory.DOMAIN_SECURITY,
      severity: Severity.HIGH,
      confidence: Confidence.CONFIRMED,
      description: `The TLS certificate for ${domain} will expire soon.`,
      plainEnglishExplanation: 'Your website\'s security certificate will expire in less than 2 weeks.',
      technicalDetails: `Certificate expires on ${validTo.toISOString()}. Days remaining: ${daysRemaining}`,
      potentialImpact: 'If the certificate expires, visitors will see security warnings.',
      remediationSummary: 'Ensure automated renewal is working, or manually renew your certificate.',
    });
  }

  // Check hostname mismatch
  const identityError = tls.checkServerIdentity(domain, cert);
  if (identityError) {
    findings.push({
      title: 'TLS Hostname Mismatch',
      slug: 'tls-hostname-mismatch',
      category: FindingCategory.DOMAIN_SECURITY,
      severity: Severity.HIGH,
      confidence: Confidence.CONFIRMED,
      description: `The TLS certificate presented by the server is not valid for the domain ${domain}.`,
      plainEnglishExplanation: 'Your website uses a security certificate that belongs to a different domain name. Visitors will see a security warning.',
      technicalDetails: `Server Identity mismatch: ${identityError.message}`,
      potentialImpact: 'Visitors will be blocked from accessing your site. It looks like a phishing or misconfigured server.',
      remediationSummary: 'Install a certificate that includes your domain in the Subject Alternative Names (SAN).',
    });
  }
  
  return { findings, remediations };
}
