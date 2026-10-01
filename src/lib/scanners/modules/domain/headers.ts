import { ScannerFinding, ScannerRemediationTemplate } from '../../types';
import { FindingCategory, Severity, Confidence } from '@/generated/prisma/client';

export function checkSecurityHeaders(domain: string, headers: Record<string, string>) {
  const findings: ScannerFinding[] = [];
  const remediations = new Map<string, ScannerRemediationTemplate[]>();

  // 1. HSTS
  if (!headers['strict-transport-security']) {
    findings.push({
      title: 'Missing HSTS Header',
      slug: 'missing-hsts-header',
      category: FindingCategory.HEADER_SECURITY,
      severity: Severity.MEDIUM,
      confidence: Confidence.CONFIRMED,
      description: `The domain ${domain} is missing the Strict-Transport-Security (HSTS) header.`,
      plainEnglishExplanation: 'Your website does not enforce encrypted connections, leaving visitors vulnerable to interception attacks.',
      technicalDetails: 'The "Strict-Transport-Security" HTTP response header is not present.',
      potentialImpact: 'Attackers on the same network as your users could downgrade connections to insecure HTTP (SSL stripping).',
      remediationSummary: 'Configure your web server to emit the Strict-Transport-Security header with a sufficient max-age.',
    });
    
    remediations.set('missing-hsts-header', [{
      environment: 'Nginx',
      estimatedEffort: 'LOW',
      steps: [{
        order: 1,
        title: 'Add HSTS Header',
        explanation: 'Configure your web server to include the Strict-Transport-Security header in its responses.',
        codeSnippet: 'add_header Strict-Transport-Security "max-age=31536000" always;',
      }]
    }, {
      environment: 'Next.js',
      estimatedEffort: 'LOW',
      steps: [{
        order: 1,
        title: 'Add HSTS Header',
        explanation: 'Add the Strict-Transport-Security header in your next.config.js headers array.',
        codeSnippet: '{ key: "Strict-Transport-Security", value: "max-age=31536000" }',
      }]
    }]);
  }

  // 2. Clickjacking (X-Frame-Options or CSP frame-ancestors)
  const hasXFO = !!headers['x-frame-options'];
  const hasCSPFrame = headers['content-security-policy']?.includes('frame-ancestors');
  
  if (!hasXFO && !hasCSPFrame) {
    findings.push({
      title: 'Missing Clickjacking Protection',
      slug: 'missing-clickjacking-protection',
      category: FindingCategory.HEADER_SECURITY,
      severity: Severity.MEDIUM,
      confidence: Confidence.CONFIRMED,
      description: `The domain ${domain} does not prevent framing.`,
      plainEnglishExplanation: 'Other websites can embed your site in a hidden frame to trick users into clicking buttons.',
      technicalDetails: 'Neither X-Frame-Options nor a CSP with frame-ancestors was found.',
      potentialImpact: 'Users could be tricked into performing unintended actions (Clickjacking).',
      remediationSummary: 'Add the X-Frame-Options: DENY or SAMEORIGIN header, or implement a strict Content-Security-Policy.',
    });
  }

  // 3. X-Content-Type-Options
  if (!headers['x-content-type-options'] || headers['x-content-type-options'].toLowerCase() !== 'nosniff') {
    findings.push({
      title: 'Missing X-Content-Type-Options',
      slug: 'missing-x-content-type-options',
      category: FindingCategory.HEADER_SECURITY,
      severity: Severity.LOW,
      confidence: Confidence.CONFIRMED,
      description: `The domain ${domain} is missing X-Content-Type-Options: nosniff.`,
      plainEnglishExplanation: 'Your website allows browsers to guess the type of files, which can lead to security vulnerabilities if users upload malicious files.',
      technicalDetails: 'The X-Content-Type-Options header is either missing or not set to "nosniff".',
      potentialImpact: 'Malicious user uploads could be interpreted as HTML/JavaScript by the browser (MIME sniffing).',
      remediationSummary: 'Add the X-Content-Type-Options: nosniff header to all responses.',
    });
  }

  // 4. Content-Security-Policy presence
  if (!headers['content-security-policy']) {
    findings.push({
      title: 'Missing Content-Security-Policy',
      slug: 'missing-csp',
      category: FindingCategory.HEADER_SECURITY,
      severity: Severity.MEDIUM,
      confidence: Confidence.CONFIRMED,
      description: `The domain ${domain} does not have a Content-Security-Policy (CSP).`,
      plainEnglishExplanation: 'Your website does not restrict where resources (like scripts and images) can be loaded from.',
      technicalDetails: 'The Content-Security-Policy header is missing.',
      potentialImpact: 'Increases the impact of Cross-Site Scripting (XSS) vulnerabilities if they exist.',
      remediationSummary: 'Implement a Content-Security-Policy to restrict resources.',
    });
  }

  // 5. Referrer-Policy presence
  if (!headers['referrer-policy']) {
    findings.push({
      title: 'Missing Referrer-Policy',
      slug: 'missing-referrer-policy',
      category: FindingCategory.HEADER_SECURITY,
      severity: Severity.LOW,
      confidence: Confidence.CONFIRMED,
      description: `The domain ${domain} does not have a Referrer-Policy header.`,
      plainEnglishExplanation: 'Your website may leak sensitive information in URLs to external sites when users click links.',
      technicalDetails: 'The Referrer-Policy header is missing.',
      potentialImpact: 'Sensitive data in URLs could be leaked to third parties.',
      remediationSummary: 'Add a Referrer-Policy header, such as strict-origin-when-cross-origin.',
    });
  }

  // 6. Permissions-Policy presence
  if (!headers['permissions-policy']) {
    findings.push({
      title: 'Missing Permissions-Policy',
      slug: 'missing-permissions-policy',
      category: FindingCategory.HEADER_SECURITY,
      severity: Severity.LOW,
      confidence: Confidence.CONFIRMED,
      description: `The domain ${domain} does not have a Permissions-Policy header.`,
      plainEnglishExplanation: 'Your website does not explicitly restrict access to browser features like the camera or microphone.',
      technicalDetails: 'The Permissions-Policy header is missing.',
      potentialImpact: 'Third-party scripts could potentially abuse browser features.',
      remediationSummary: 'Add a Permissions-Policy header to disable unused features.',
    });
  }

  return { findings, remediations };
}
