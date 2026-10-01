// ──────────────────────────────────────────────────────────────
// TraceEnd — Database Seed
// Creates realistic development data. DEVELOPMENT ONLY.
// ──────────────────────────────────────────────────────────────

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/traceend?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding TraceEnd database...\n');

  // ─── User ─────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'dev@traceend.local' },
    update: {},
    create: {
      email: 'dev@traceend.local',
      name: 'Development User',
    },
  });
  console.log(`  ✓ User: ${user.email}`);

  // ─── Workspace ────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'personal' },
    update: {},
    create: {
      name: 'Personal Workspace',
      slug: 'personal',
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });
  console.log(`  ✓ Workspace: ${workspace.name}`);

  // ─── Assets ───────────────────────────────────────────────
  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        workspaceId: workspace.id,
        type: 'EMAIL',
        identifier: 'user@example.com',
        displayName: 'user@example.com',
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE',
      },
    }),
    prisma.asset.create({
      data: {
        workspaceId: workspace.id,
        type: 'DOMAIN',
        identifier: 'example.com',
        displayName: 'example.com',
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE',
        metadata: { registrar: 'Cloudflare', expiresAt: '2027-03-15' },
      },
    }),
    prisma.asset.create({
      data: {
        workspaceId: workspace.id,
        type: 'GITHUB_REPOSITORY',
        identifier: 'github.com/example/project',
        displayName: 'example/project',
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE',
        metadata: { visibility: 'public', language: 'TypeScript' },
      },
    }),
    prisma.asset.create({
      data: {
        workspaceId: workspace.id,
        type: 'WEBSITE',
        identifier: 'https://example.com',
        displayName: 'https://example.com',
        verificationStatus: 'VERIFIED',
        status: 'ACTIVE',
      },
    }),
    prisma.asset.create({
      data: {
        workspaceId: workspace.id,
        type: 'GITHUB_ACCOUNT',
        identifier: 'github.com/exampleuser',
        displayName: 'exampleuser',
        verificationStatus: 'UNVERIFIED',
        status: 'ACTIVE',
      },
    }),
    prisma.asset.create({
      data: {
        workspaceId: workspace.id,
        type: 'USERNAME',
        identifier: 'exampleuser',
        displayName: 'exampleuser',
        verificationStatus: 'UNVERIFIED',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`  ✓ Assets: ${assets.length} created`);

  const [emailAsset, domainAsset, repoAsset, websiteAsset] = assets;

  // ─── Scans ────────────────────────────────────────────────
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400 * 1000);

  const scans = await Promise.all([
    prisma.scan.create({
      data: {
        workspaceId: workspace.id,
        assetId: repoAsset!.id,
        type: 'GITHUB_SECRETS',
        status: 'COMPLETED',
        startedAt: hoursAgo(2),
        completedAt: hoursAgo(1.8),
        findingsCount: 1,
      },
    }),
    prisma.scan.create({
      data: {
        workspaceId: workspace.id,
        assetId: emailAsset!.id,
        type: 'BREACH_CHECK',
        status: 'COMPLETED',
        startedAt: daysAgo(1),
        completedAt: new Date(daysAgo(1).getTime() + 5000),
        findingsCount: 1,
      },
    }),
    prisma.scan.create({
      data: {
        workspaceId: workspace.id,
        assetId: domainAsset!.id,
        type: 'DOMAIN_SECURITY',
        status: 'COMPLETED',
        startedAt: daysAgo(1),
        completedAt: new Date(daysAgo(1).getTime() + 12000),
        findingsCount: 2,
      },
    }),
    prisma.scan.create({
      data: {
        workspaceId: workspace.id,
        assetId: websiteAsset!.id,
        type: 'WEB_SECURITY',
        status: 'COMPLETED',
        startedAt: daysAgo(2),
        completedAt: new Date(daysAgo(2).getTime() + 8000),
        findingsCount: 2,
      },
    }),
    prisma.scan.create({
      data: {
        workspaceId: workspace.id,
        assetId: domainAsset!.id,
        type: 'FULL',
        status: 'RUNNING',
        startedAt: hoursAgo(0.5),
        findingsCount: 0,
      },
    }),
    prisma.scan.create({
      data: {
        workspaceId: workspace.id,
        assetId: emailAsset!.id,
        type: 'BREACH_CHECK',
        status: 'QUEUED',
        findingsCount: 0,
      },
    }),
  ]);
  console.log(`  ✓ Scans: ${scans.length} created`);

  // ─── Findings ─────────────────────────────────────────────

  // 1. Critical: API credential exposure
  const finding1 = await prisma.finding.create({
    data: {
      workspaceId: workspace.id,
      assetId: repoAsset!.id,
      scanId: scans[0]!.id,
      title: 'Possible exposed API credential',
      slug: 'api-credential-exposure',
      category: 'SECRETS',
      severity: 'CRITICAL',
      status: 'OPEN',
      confidence: 'HIGH',
      description:
        'A string matching the structural pattern of an API credential was discovered in publicly accessible source code in the repository.',
      plainEnglishExplanation:
        'We found what looks like an API key or secret token written directly in your code. Because this repository is public, anyone can see this credential and potentially use it to access your services, make API calls on your behalf, or access data tied to that key.',
      technicalDetails:
        'File: src/config.ts, Line 14\nPattern: Matches the format of a Stripe secret key (sk_live_*)\nEntropy: 4.8 bits/char (above threshold of 4.5)\nCommit: a3f2b1c (2024-08-15)',
      potentialImpact:
        'If the credential is valid, an unauthorized person could access the associated API, consume billed resources, access or modify data, or impersonate the application.',
      remediationSummary:
        'Revoke the exposed credential immediately, generate a new one, store it in environment variables, remove it from the repository history, and verify the fix.',
      evidence: {
        file: 'src/config.ts',
        line: 14,
        snippet: "const API_KEY = 'sk_live_51Hx...(redacted)';",
        commit: 'a3f2b1c',
        commitDate: '2024-08-15',
        pattern: 'stripe_secret_key',
      },
      firstDetectedAt: hoursAgo(2),
      lastDetectedAt: hoursAgo(2),
    },
  });

  // Remediation for credential exposure
  const rem1 = await prisma.remediation.create({
    data: {
      findingId: finding1.id,
      estimatedEffort: 'MODERATE',
      status: 'NOT_STARTED',
      steps: {
        create: [
          {
            order: 1,
            title: 'Revoke the existing credential',
            explanation:
              'Log in to the Stripe Dashboard, navigate to Developers > API Keys, and roll the compromised secret key. This immediately invalidates the exposed key.',
            docUrl: 'https://docs.stripe.com/keys#rolling-keys',
            status: 'PENDING',
          },
          {
            order: 2,
            title: 'Generate a new credential',
            explanation:
              'Create a new restricted API key with only the permissions your application requires. Avoid using the root secret key in application code.',
            status: 'PENDING',
          },
          {
            order: 3,
            title: 'Store the credential in an environment variable',
            explanation:
              'Move the API key to an environment variable (e.g., STRIPE_SECRET_KEY) and reference it in your application configuration.',
            codeSnippet: '# .env (never commit this file)\nSTRIPE_SECRET_KEY=sk_live_new_key_here\n\n# config.ts\nconst API_KEY = process.env.STRIPE_SECRET_KEY;',
            codeLanguage: 'bash',
            status: 'PENDING',
          },
          {
            order: 4,
            title: 'Remove the credential from repository history',
            explanation:
              'Use git filter-repo or BFG Repo-Cleaner to remove the credential from all commits. Simply deleting the line in a new commit does not remove it from the history.',
            codeSnippet: 'git filter-repo --path src/config.ts --invert-paths\n# or\nbfg --replace-text passwords.txt',
            codeLanguage: 'bash',
            docUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository',
            status: 'PENDING',
          },
          {
            order: 5,
            title: 'Add secrets to .gitignore',
            explanation: 'Ensure .env and other files containing secrets are listed in .gitignore to prevent accidental future commits.',
            codeSnippet: '# .gitignore\n.env\n.env.local\n.env.*.local',
            codeLanguage: 'gitignore',
            status: 'PENDING',
          },
          {
            order: 6,
            title: 'Verify remediation',
            explanation:
              'Search the repository for the old key pattern. Confirm the key has been revoked by attempting a test API call with the old credential (it should fail with an authentication error).',
            codeSnippet: 'git log --all -p | grep "sk_live_51Hx"',
            codeLanguage: 'bash',
            status: 'PENDING',
          },
        ],
      },
    },
  });

  // 2. High: Historical credential exposure
  const finding2 = await prisma.finding.create({
    data: {
      workspaceId: workspace.id,
      assetId: emailAsset!.id,
      scanId: scans[1]!.id,
      title: 'Historical credential exposure',
      slug: 'breach-credential-exposure',
      category: 'BREACH_EXPOSURE',
      severity: 'HIGH',
      status: 'OPEN',
      confidence: 'CONFIRMED',
      description:
        'This email address appeared in one or more data breaches where credentials (email/password combinations) were exposed.',
      plainEnglishExplanation:
        'Your email address was found in a data breach. This means that at some point, a service where you used this email was compromised, and your login credentials were exposed. If you reused that password elsewhere, those accounts may also be at risk.',
      technicalDetails:
        'Breach sources: 2 breaches identified\n• Service: ExampleCorp (2023-06-14) — 4.2M accounts — Email, hashed password\n• Service: DataStore (2022-11-30) — 800K accounts — Email, plaintext password\nData classes: email addresses, passwords, usernames',
      potentialImpact:
        'If the exposed password is still in use on any account, an attacker could gain unauthorized access. Credential stuffing attacks commonly use breach data to attempt logins across many services.',
      remediationSummary:
        'Change the password on any account where this email/password combination was used. Enable two-factor authentication where available. Use a unique password for every account.',
      evidence: {
        breaches: [
          {
            source: 'ExampleCorp',
            date: '2023-06-14',
            recordCount: 4200000,
            dataClasses: ['email', 'hashed_password'],
          },
          {
            source: 'DataStore',
            date: '2022-11-30',
            recordCount: 800000,
            dataClasses: ['email', 'plaintext_password'],
          },
        ],
      },
      firstDetectedAt: daysAgo(1),
      lastDetectedAt: daysAgo(1),
    },
  });

  await prisma.remediation.create({
    data: {
      findingId: finding2.id,
      estimatedEffort: 'LOW',
      status: 'NOT_STARTED',
      steps: {
        create: [
          {
            order: 1,
            title: 'Change passwords on affected accounts',
            explanation: 'Change the password on ExampleCorp, DataStore, and any other account where you used the same password.',
            status: 'PENDING',
          },
          {
            order: 2,
            title: 'Enable two-factor authentication',
            explanation: 'Add a second factor (authenticator app preferred over SMS) on every account that supports it.',
            status: 'PENDING',
          },
          {
            order: 3,
            title: 'Use a password manager',
            explanation: 'Generate and store unique passwords for every account using a password manager such as 1Password or Bitwarden.',
            status: 'PENDING',
          },
        ],
      },
    },
  });

  // 3. High: DMARC not configured
  const finding3 = await prisma.finding.create({
    data: {
      workspaceId: workspace.id,
      assetId: domainAsset!.id,
      scanId: scans[2]!.id,
      title: 'DMARC not configured',
      slug: 'dmarc-missing',
      category: 'DOMAIN_SECURITY',
      severity: 'HIGH',
      status: 'OPEN',
      confidence: 'CONFIRMED',
      description:
        'No DMARC (Domain-based Message Authentication, Reporting & Conformance) DNS record was found for this domain.',
      plainEnglishExplanation:
        'DMARC is an email authentication standard that helps prevent others from sending emails that appear to come from your domain. Without it, attackers can forge emails that look like they came from you, which is the basis of most phishing attacks.',
      technicalDetails:
        'DNS query: _dmarc.example.com TXT\nResult: NXDOMAIN (no record found)\nSPF record: v=spf1 include:_spf.google.com ~all (present but DMARC enforcement missing)\nDKIM: Present for selector "google"',
      potentialImpact:
        'Without DMARC, anyone can send email appearing to come from your domain. This enables phishing attacks against people who trust your domain, damages sender reputation, and may cause legitimate emails to be flagged as spam.',
      remediationSummary: 'Add a DMARC DNS TXT record. Start with a monitoring policy and progress to enforcement.',
      evidence: {
        domain: 'example.com',
        dnsQuery: '_dmarc.example.com',
        result: 'NXDOMAIN',
        spfPresent: true,
        dkimPresent: true,
      },
      firstDetectedAt: daysAgo(1),
      lastDetectedAt: daysAgo(1),
    },
  });

  await prisma.remediation.create({
    data: {
      findingId: finding3.id,
      environment: 'Cloudflare DNS',
      estimatedEffort: 'LOW',
      status: 'NOT_STARTED',
      steps: {
        create: [
          {
            order: 1,
            title: 'Add a DMARC record in monitoring mode',
            explanation: 'Start with a policy of "none" to monitor who is sending email from your domain without blocking anything.',
            codeSnippet: '_dmarc.example.com. TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com; pct=100"',
            codeLanguage: 'dns',
            docUrl: 'https://dmarc.org/overview/',
            status: 'PENDING',
          },
          {
            order: 2,
            title: 'Monitor reports for 2-4 weeks',
            explanation: 'Review DMARC aggregate reports sent to the rua address. Identify legitimate email sources and ensure they pass SPF and DKIM.',
            status: 'PENDING',
          },
          {
            order: 3,
            title: 'Progress to quarantine policy',
            explanation: 'Once confident that legitimate sources pass authentication, change the policy to quarantine.',
            codeSnippet: '_dmarc.example.com. TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com; pct=100"',
            codeLanguage: 'dns',
            status: 'PENDING',
          },
          {
            order: 4,
            title: 'Verify with a DNS lookup',
            explanation: 'Confirm the DMARC record is published and correctly formatted.',
            codeSnippet: 'dig _dmarc.example.com TXT +short',
            codeLanguage: 'bash',
            status: 'PENDING',
          },
        ],
      },
    },
  });

  // 4. Medium: HSTS missing
  const finding4 = await prisma.finding.create({
    data: {
      workspaceId: workspace.id,
      assetId: websiteAsset!.id,
      scanId: scans[3]!.id,
      title: 'HSTS header missing',
      slug: 'hsts-missing',
      category: 'HEADER_SECURITY',
      severity: 'MEDIUM',
      status: 'IN_PROGRESS',
      confidence: 'CONFIRMED',
      description:
        'The HTTP Strict Transport Security (HSTS) header is not set on this website.',
      plainEnglishExplanation:
        'HSTS tells browsers to always use HTTPS when connecting to your site. Without it, an attacker on the same network could intercept the initial HTTP request before the redirect to HTTPS, potentially capturing sensitive data or injecting malicious content.',
      technicalDetails:
        'URL: https://example.com\nResponse headers checked: strict-transport-security\nResult: Header not present\nHTTPS redirect: Present (301)\nTLS version: TLS 1.3',
      potentialImpact:
        'Users connecting from untrusted networks (public Wi-Fi, airports) are vulnerable to SSL stripping attacks during the initial connection. An attacker could downgrade the connection to plain HTTP and intercept traffic.',
      remediationSummary: 'Add the Strict-Transport-Security header to all HTTPS responses.',
      evidence: {
        url: 'https://example.com',
        headerPresent: false,
        httpsRedirect: true,
        tlsVersion: 'TLS 1.3',
      },
      firstDetectedAt: daysAgo(2),
      lastDetectedAt: daysAgo(2),
    },
  });

  // Multiple remediation environments for HSTS
  await prisma.remediation.create({
    data: {
      findingId: finding4.id,
      environment: 'Nginx',
      estimatedEffort: 'TRIVIAL',
      status: 'NOT_STARTED',
      steps: {
        create: [
          {
            order: 1,
            title: 'Add HSTS header to Nginx configuration',
            explanation: 'Add the Strict-Transport-Security header in your server block.',
            codeSnippet: 'server {\n    listen 443 ssl;\n    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n}',
            codeLanguage: 'nginx',
            status: 'PENDING',
          },
          {
            order: 2,
            title: 'Reload Nginx',
            explanation: 'Test and reload the configuration.',
            codeSnippet: 'nginx -t && systemctl reload nginx',
            codeLanguage: 'bash',
            status: 'PENDING',
          },
        ],
      },
    },
  });

  await prisma.remediation.create({
    data: {
      findingId: finding4.id,
      environment: 'Cloudflare',
      estimatedEffort: 'TRIVIAL',
      status: 'NOT_STARTED',
      steps: {
        create: [
          {
            order: 1,
            title: 'Enable HSTS in Cloudflare',
            explanation: 'Go to SSL/TLS > Edge Certificates > HTTP Strict Transport Security and enable it.',
            docUrl: 'https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/',
            status: 'PENDING',
          },
        ],
      },
    },
  });

  // 5. Medium: X-Frame-Options missing
  const finding5 = await prisma.finding.create({
    data: {
      workspaceId: workspace.id,
      assetId: websiteAsset!.id,
      scanId: scans[3]!.id,
      title: 'X-Frame-Options header missing',
      slug: 'x-frame-options-missing',
      category: 'HEADER_SECURITY',
      severity: 'MEDIUM',
      status: 'OPEN',
      confidence: 'CONFIRMED',
      description:
        'The X-Frame-Options header is not set, which may allow the page to be embedded in iframes on other sites.',
      plainEnglishExplanation:
        'Without this header, an attacker could embed your website inside an invisible frame on a malicious page and trick users into clicking buttons on your site without realizing it. This is called clickjacking.',
      technicalDetails:
        'URL: https://example.com\nX-Frame-Options: Not present\nContent-Security-Policy frame-ancestors: Not present',
      potentialImpact:
        'Clickjacking attacks could trick authenticated users into performing unintended actions such as changing account settings, making purchases, or approving transactions.',
      remediationSummary: 'Add X-Frame-Options: DENY or use Content-Security-Policy frame-ancestors directive.',
      evidence: {
        url: 'https://example.com',
        xFrameOptions: null,
        cspFrameAncestors: null,
      },
      firstDetectedAt: daysAgo(2),
      lastDetectedAt: daysAgo(2),
    },
  });

  // 6. Low: SPF soft fail
  const finding6 = await prisma.finding.create({
    data: {
      workspaceId: workspace.id,
      assetId: domainAsset!.id,
      scanId: scans[2]!.id,
      title: 'SPF record uses soft fail',
      slug: 'spf-soft-fail',
      category: 'DOMAIN_SECURITY',
      severity: 'LOW',
      status: 'OPEN',
      confidence: 'CONFIRMED',
      description:
        'The SPF record for this domain uses ~all (soft fail) instead of -all (hard fail).',
      plainEnglishExplanation:
        'Your domain\'s SPF record tells email servers to accept emails that fail authentication instead of rejecting them. This weakens your email security posture.',
      technicalDetails:
        'DNS query: example.com TXT\nSPF record: v=spf1 include:_spf.google.com ~all\nQualifier: ~ (soft fail)',
      potentialImpact:
        'Emails from unauthorized senders may be delivered to recipients instead of being rejected, making phishing attacks using your domain more likely to succeed.',
      remediationSummary: 'Change ~all to -all in your SPF record after confirming all legitimate sending sources are included.',
      evidence: {
        domain: 'example.com',
        spfRecord: 'v=spf1 include:_spf.google.com ~all',
        qualifier: 'softfail',
      },
      firstDetectedAt: daysAgo(1),
      lastDetectedAt: daysAgo(1),
    },
  });

  // 7. Resolved finding
  const finding7 = await prisma.finding.create({
    data: {
      workspaceId: workspace.id,
      assetId: websiteAsset!.id,
      scanId: scans[3]!.id,
      title: 'TLS 1.0 and 1.1 enabled',
      slug: 'tls-legacy-versions',
      category: 'TLS_SECURITY',
      severity: 'HIGH',
      status: 'RESOLVED',
      confidence: 'CONFIRMED',
      description: 'The server accepts connections using deprecated TLS versions 1.0 and 1.1.',
      plainEnglishExplanation:
        'Your web server still supports old, insecure versions of TLS that have known vulnerabilities. Modern browsers no longer support these versions.',
      technicalDetails:
        'Host: example.com:443\nTLS 1.0: Accepted\nTLS 1.1: Accepted\nTLS 1.2: Accepted\nTLS 1.3: Accepted',
      potentialImpact:
        'Connections using TLS 1.0 or 1.1 are vulnerable to protocol downgrade attacks such as POODLE and BEAST.',
      remediationSummary: 'Disable TLS 1.0 and 1.1 on the web server.',
      evidence: {
        host: 'example.com:443',
        tls10: true,
        tls11: true,
        tls12: true,
        tls13: true,
      },
      firstDetectedAt: daysAgo(14),
      lastDetectedAt: daysAgo(3),
      resolvedAt: daysAgo(2),
    },
  });

  const allFindings = [finding1, finding2, finding3, finding4, finding5, finding6, finding7];
  console.log(`  ✓ Findings: ${allFindings.length} created`);

  // ─── Activity Events ──────────────────────────────────────
  const events = [
    { action: 'asset.created', description: 'Added email asset: user@example.com', assetId: emailAsset!.id, createdAt: daysAgo(7) },
    { action: 'asset.created', description: 'Added domain asset: example.com', assetId: domainAsset!.id, createdAt: daysAgo(7) },
    { action: 'asset.created', description: 'Added repository asset: example/project', assetId: repoAsset!.id, createdAt: daysAgo(6) },
    { action: 'asset.created', description: 'Added website asset: https://example.com', assetId: websiteAsset!.id, createdAt: daysAgo(6) },
    { action: 'scan.started', description: 'Web security scan started for https://example.com', scanId: scans[3]!.id, createdAt: daysAgo(2) },
    { action: 'scan.completed', description: 'Web security scan completed — 2 findings', scanId: scans[3]!.id, createdAt: daysAgo(2) },
    { action: 'finding.created', description: 'HSTS header missing detected on example.com', findingId: finding4.id, createdAt: daysAgo(2) },
    { action: 'finding.created', description: 'X-Frame-Options header missing detected on example.com', findingId: finding5.id, createdAt: daysAgo(2) },
    { action: 'finding.resolved', description: 'TLS 1.0 and 1.1 enabled — resolved', findingId: finding7.id, createdAt: daysAgo(2) },
    { action: 'scan.started', description: 'Breach check scan started for user@example.com', scanId: scans[1]!.id, createdAt: daysAgo(1) },
    { action: 'scan.completed', description: 'Breach check scan completed — 1 finding', scanId: scans[1]!.id, createdAt: daysAgo(1) },
    { action: 'finding.created', description: 'Historical credential exposure detected for user@example.com', findingId: finding2.id, createdAt: daysAgo(1) },
    { action: 'scan.started', description: 'Domain security scan started for example.com', scanId: scans[2]!.id, createdAt: daysAgo(1) },
    { action: 'scan.completed', description: 'Domain security scan completed — 2 findings', scanId: scans[2]!.id, createdAt: daysAgo(1) },
    { action: 'finding.created', description: 'DMARC not configured detected on example.com', findingId: finding3.id, createdAt: daysAgo(1) },
    { action: 'scan.started', description: 'GitHub secrets scan started for example/project', scanId: scans[0]!.id, createdAt: hoursAgo(2) },
    { action: 'scan.completed', description: 'GitHub secrets scan completed — 1 finding', scanId: scans[0]!.id, createdAt: hoursAgo(1.8) },
    { action: 'finding.created', description: 'Possible exposed API credential detected in example/project', findingId: finding1.id, createdAt: hoursAgo(1.8) },
    { action: 'finding.status_changed', description: 'HSTS header missing status changed to in progress', findingId: finding4.id, createdAt: hoursAgo(1) },
  ];

  for (const event of events) {
    await prisma.activityEvent.create({
      data: {
        ...event,
        workspaceId: workspace.id,
        userId: user.id,
      },
    });
  }
  console.log(`  ✓ Activity events: ${events.length} created`);

  console.log('\n✅ Seed completed successfully.\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
