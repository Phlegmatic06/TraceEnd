import * as dns from 'dns/promises';
import { DomainCheck, DomainCheckContext, DomainCheckResult } from './types';
import { ScannerFinding, ScannerRemediationTemplate } from '../../types';
import { FindingCategory, Severity, Confidence } from '@/generated/prisma/client';

export const checkEmailSecurity: DomainCheck = async ({ domain }: DomainCheckContext): Promise<DomainCheckResult> => {
  const findings: ScannerFinding[] = [];
  const passedChecks: string[] = [];
  const remediations = new Map<string, ScannerRemediationTemplate[]>();

  // 1. Check SPF Record (DNS)
  try {
    const records = await dns.resolveTxt(domain);
    const spfRecords = records.filter(record => record.join('').includes('v=spf1'));
    
    if (spfRecords.length === 0) {
      findings.push({
        title: 'Missing SPF Record',
        slug: 'missing-spf-record',
        category: FindingCategory.DOMAIN_SECURITY,
        severity: Severity.HIGH,
        confidence: Confidence.CONFIRMED,
        description: `The domain ${domain} does not have a valid SPF (Sender Policy Framework) record.`,
        plainEnglishExplanation: 'Your domain is missing a security record that prevents attackers from sending spoofed emails on your behalf.',
        technicalDetails: 'No TXT record starting with "v=spf1" was found.',
        potentialImpact: 'Attackers can spoof your email domain in phishing campaigns, damaging your reputation.',
        remediationSummary: 'Add a TXT record to your DNS settings with your authorized mail servers (e.g. "v=spf1 include:_spf.google.com ~all").',
      });
      
      remediations.set('missing-spf-record', [{
        estimatedEffort: 'LOW',
        steps: [{
          order: 1,
          title: 'Add SPF TXT Record',
          explanation: 'In your DNS provider, create a new TXT record for your domain with the value: v=spf1 include:_spf.google.com ~all',
          codeSnippet: 'v=spf1 include:_spf.google.com ~all',
        }]
      }]);
    } else if (spfRecords.length > 1) {
      findings.push({
        title: 'Multiple SPF Records',
        slug: 'multiple-spf-records',
        category: FindingCategory.DOMAIN_SECURITY,
        severity: Severity.MEDIUM,
        confidence: Confidence.CONFIRMED,
        description: `The domain ${domain} has multiple SPF records, which violates RFC 7208.`,
        plainEnglishExplanation: 'Your domain has multiple SPF records. Email providers may ignore all of them, breaking your email protection.',
        technicalDetails: `Found ${spfRecords.length} SPF records: \n${spfRecords.map(r => r.join('')).join('\n')}`,
        potentialImpact: 'Email spoofing protection may fail, allowing attackers to spoof your domain.',
        remediationSummary: 'Merge multiple SPF records into a single record containing all allowed senders.',
      });
      passedChecks.push('missing-spf-record');
    } else {
      passedChecks.push('missing-spf-record', 'multiple-spf-records');
      const spfRecord = spfRecords[0]?.join('') || '';
      if (spfRecord.includes('+all')) {
        findings.push({
          title: 'Permissive SPF Policy (+all)',
          slug: 'permissive-spf-policy',
          category: FindingCategory.DOMAIN_SECURITY,
          severity: Severity.HIGH,
          confidence: Confidence.CONFIRMED,
          description: `The domain ${domain} has an overly permissive SPF record (+all).`,
          plainEnglishExplanation: 'Your domain explicitly allows ANY server on the internet to send email on your behalf.',
          technicalDetails: `SPF record contains +all: ${spfRecord}`,
          potentialImpact: 'Attackers can easily spoof your email domain in phishing campaigns.',
          remediationSummary: 'Change the SPF record to end with ~all (softfail) or -all (hardfail).',
        });
      } else {
        passedChecks.push('permissive-spf-policy');
      }
    }
  } catch (error: any) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
      findings.push({
        title: 'Missing SPF Record',
        slug: 'missing-spf-record',
        category: FindingCategory.DOMAIN_SECURITY,
        severity: Severity.HIGH,
        confidence: Confidence.CONFIRMED,
        description: `The domain ${domain} does not have a valid SPF (Sender Policy Framework) record.`,
        plainEnglishExplanation: 'Your domain is missing a security record that prevents attackers from sending spoofed emails on your behalf.',
        technicalDetails: 'No TXT record was found.',
        potentialImpact: 'Attackers can spoof your email domain in phishing campaigns, damaging your reputation.',
        remediationSummary: 'Add a TXT record to your DNS settings with your authorized mail servers.',
      });
    }
  }

  // 2. Check DMARC Record
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const dmarcRecords = records.filter(record => record.join('').includes('v=DMARC1'));
    
    if (dmarcRecords.length === 0) {
      findings.push({
        title: 'Missing DMARC Record',
        slug: 'missing-dmarc-record',
        category: FindingCategory.DOMAIN_SECURITY,
        severity: Severity.MEDIUM, // As requested in spec: DMARC absent typically not CRITICAL
        confidence: Confidence.CONFIRMED,
        description: `The domain ${domain} does not have a DMARC record.`,
        plainEnglishExplanation: 'Your domain lacks DMARC, a system that tells email providers what to do when they receive spoofed emails pretending to be from you.',
        technicalDetails: 'No TXT record starting with "v=DMARC1" was found at _dmarc.' + domain,
        potentialImpact: 'Email providers will not block spoofed emails from your domain, and you receive no reports of spoofing attempts.',
        remediationSummary: 'Add a DMARC TXT record to your DNS settings.',
      });
      
      remediations.set('missing-dmarc-record', [{
        estimatedEffort: 'LOW',
        steps: [{
          order: 1,
          title: 'Add DMARC TXT Record',
          explanation: 'In your DNS provider, create a new TXT record at "_dmarc" for your domain with a monitoring policy.',
          codeSnippet: 'v=DMARC1; p=none; rua=mailto:admin@yourdomain.com;',
        }]
      }]);
    } else {
      passedChecks.push('missing-dmarc-record');
      const dmarcRecord = dmarcRecords[0]?.join('') || '';
      if (dmarcRecord.includes('p=none')) {
        findings.push({
          title: 'DMARC Policy is Monitor Only (p=none)',
          slug: 'dmarc-policy-none',
          category: FindingCategory.DOMAIN_SECURITY,
          severity: Severity.LOW,
          confidence: Confidence.CONFIRMED,
          description: `The domain ${domain} has a DMARC policy of 'none'.`,
          plainEnglishExplanation: 'Your DMARC record is set to "none" (monitor mode). It provides monitoring reports but does not enforce protection against spoofed emails.',
          technicalDetails: `DMARC record contains p=none: ${dmarcRecord}`,
          potentialImpact: 'Spoofed emails will still be delivered. It provides monitoring rather than enforcement.',
          remediationSummary: 'Once you are confident legitimate mail is passing SPF and DKIM, upgrade the policy to p=quarantine or p=reject.',
        });
      } else {
        passedChecks.push('dmarc-policy-none');
      }
    }
  } catch (error: any) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
      findings.push({
        title: 'Missing DMARC Record',
        slug: 'missing-dmarc-record',
        category: FindingCategory.DOMAIN_SECURITY,
        severity: Severity.MEDIUM,
        confidence: Confidence.CONFIRMED,
        description: `The domain ${domain} does not have a DMARC record.`,
        plainEnglishExplanation: 'Your domain lacks DMARC, a system that tells email providers what to do when they receive spoofed emails pretending to be from you.',
        technicalDetails: 'No TXT record was found at _dmarc.' + domain,
        potentialImpact: 'Email providers will not block spoofed emails from your domain.',
        remediationSummary: 'Add a DMARC TXT record to your DNS settings.',
      });
    }
  }

  return { findings, passedChecks, remediations };
};
