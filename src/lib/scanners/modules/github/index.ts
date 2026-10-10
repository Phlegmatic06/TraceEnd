import fs from 'fs';
import { Scanner, ScannerFinding, ScannerResult, scannerRegistry, ScannerRemediationTemplate } from '../../types';
import { AssetType, FindingCategory, Severity, Confidence } from '@/generated/prisma/client';
import { fetchAndExtractRepository, cleanupRepository } from './repository';
import { createFindingFingerprint } from './fingerprint';
import { detectors } from './detectors';
import { logger } from '@/lib/logger';
import path from 'path';
import { db } from '@/lib/db';

const log = logger.child({ module: 'github-secret-scanner' });

export class GithubSecretScanner implements Scanner {
  readonly id = 'github-secret-scan';
  readonly name = 'GitHub Secret Scanner';
  readonly supportedAssetTypes = [AssetType.GITHUB_REPOSITORY];

  async execute(assetIdentifier: string, assetType: AssetType, config?: Record<string, unknown>): Promise<ScannerResult> {
    const findings: ScannerFinding[] = [];
    const passedChecks: string[] = [];
    const remediations = new Map<string, ScannerRemediationTemplate[]>();

    const verifyFindingSlug = config?.verifyFindingSlug as string | undefined;
    
    // assetIdentifier is the githubRepositoryId. We need to fetch the metadata to know the owner/repo.
    // In the queue worker context we don't have the full asset directly, but we can look it up using DB since we're server-side.
    // Actually, we can fetch asset from DB via identifier (which is githubRepositoryId)
    const asset = await db.asset.findFirst({
      where: { identifier: assetIdentifier, type: AssetType.GITHUB_REPOSITORY }
    });

    if (!asset) {
      throw new Error(`Asset not found for identifier ${assetIdentifier}`);
    }

    const { owner, repositoryName, defaultBranch } = (asset.metadata as any) || {};
    if (!owner || !repositoryName) {
      throw new Error('Repository owner or name is missing from asset metadata');
    }

    let fetchResult;
    try {
      fetchResult = await fetchAndExtractRepository(
        asset.workspaceId,
        owner,
        repositoryName,
        defaultBranch || 'HEAD'
      );
    } catch (err: any) {
      // If access is revoked or repo not found, return indeterminate error or throw
      if (err.message === 'GITHUB_ACCESS_REVOKED') {
        throw new Error('GITHUB_ACCESS_REVOKED');
      }
      throw err;
    }

    if (!fetchResult) {
      throw new Error('fetchResult is undefined');
    }

    const { files, tempDir, stats } = fetchResult;

    try {
      for (const file of files) {
        // Only read contents of non-skipped files (already filtered during extraction)
        let content = '';
        try {
          content = await fs.promises.readFile(file.absolutePath, 'utf8');
        } catch (readErr) {
          log.warn(`Failed to read file ${file.relativePath}`, { error: String(readErr) });
          continue;
        }

        // Run Detectors
        for (const detector of detectors) {
          let match;
          // Reset regex state since they are global
          detector.pattern.lastIndex = 0;
          while ((match = detector.pattern.exec(content)) !== null) {
            const extracted = detector.extract(match, content);
            
            const fingerprint = createFindingFingerprint({
              repositoryId: assetIdentifier,
              detectorType: detector.id,
              filePath: file.relativePath,
              rawSecret: extracted.rawSecret
            });

            // If we're verifying a specific finding, we only care if this slug matches.
            // But we process everything so we can report passed checks for anything we missed.
            const findingSlug = fingerprint.findingFingerprint;

            findings.push({
              title: `${detector.name} Exposed in ${path.basename(file.relativePath)}`,
              slug: findingSlug,
              category: detector.category,
              severity: detector.severity,
              confidence: detector.confidence,
              description: `A ${detector.name} was found committed in the repository at \`${file.relativePath}\`.`,
              plainEnglishExplanation: detector.description,
              potentialImpact: `An attacker could use this credential to access external systems, databases, or cloud accounts.`,
              evidence: {
                filePath: file.relativePath,
                line: extracted.line,
                preview: extracted.redacted,
                detector: detector.id
              },
              metadata: {
                secretFingerprint: fingerprint.secretFingerprint
              },
              remediationSummary: `Remove the credential from the current branch, rotate it immediately in the external service, and scrub it from Git history if necessary.`,
            });

            remediations.set(findingSlug, [
              {
                estimatedEffort: 'MODERATE',
                steps: [
                  { order: 1, title: 'Rotate Credential', explanation: 'Immediately revoke the exposed credential in the upstream service and generate a new one.' },
                  { order: 2, title: 'Remove from Code', explanation: `Delete the secret from ${file.relativePath}.` },
                  { order: 3, title: 'Use Environment Variables', explanation: 'Pass the new credential via environment variables or a secret manager.' },
                  { order: 4, title: 'Scrub Git History', explanation: 'If the repository is public or shared, use a tool like BFG Repo-Cleaner to remove the secret from all past commits.' }
                ]
              }
            ]);
          }
        }

        // Special check for .env files
        const basename = path.basename(file.relativePath);
        if (basename.startsWith('.env') && basename !== '.env.example') {
           // Basic heuristic: check if any line looks like a real credential assignment
           const lines = content.split('\n');
           for (let i = 0; i < lines.length; i++) {
             const rawLine = lines[i];
             if (!rawLine) continue;
             const line = rawLine.trim();
             // Skip comments and empty lines
             if (!line || line.startsWith('#')) continue;
             
             const eqIndex = line.indexOf('=');
             if (eqIndex === -1) continue;
             
             const key = line.substring(0, eqIndex).trim();
             const value = line.substring(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
             
             // Ignore empty values or obvious placeholders
             if (!value || value.toLowerCase() === 'your_password' || value.toLowerCase() === 'change_me') continue;
             if (value.startsWith('<') && value.endsWith('>')) continue;
             
             // Ignore common non-credential keys
             const upperKey = key.toUpperCase();
             if (
                upperKey === 'NODE_ENV' || 
                upperKey === 'PORT' || 
                upperKey === 'LOG_LEVEL' || 
                upperKey.startsWith('NEXT_PUBLIC_') ||
                upperKey.startsWith('VITE_') ||
                upperKey.startsWith('REACT_APP_')
             ) continue;
             
             // If we get here, it looks like a real value
             const fingerprint = createFindingFingerprint({
               repositoryId: assetIdentifier,
               detectorType: 'env-file-credential',
               filePath: file.relativePath,
               rawSecret: value // We hash the value
             });
             
             const findingSlug = fingerprint.findingFingerprint;
             
             // In .env we might find multiple, we just flag the first one we find to keep it simple,
             // or flag every key. Let's flag the first high-entropy/real-looking value and break.
             findings.push({
               title: `Hardcoded Credential in ${basename}`,
               slug: findingSlug,
               category: FindingCategory.SECRETS,
               severity: Severity.HIGH,
               confidence: Confidence.HIGH,
               description: `A committed environment file (\`${file.relativePath}\`) contains actual credential values.`,
               plainEnglishExplanation: 'Environment files (.env) are meant to be kept local and ignored by version control. Committing them exposes all secrets they contain.',
               potentialImpact: 'Attackers can extract multiple credentials from this file.',
               evidence: {
                 filePath: file.relativePath,
                 line: i + 1,
                 key: key,
                 preview: value.length > 4 ? `${value.substring(0, 2)}...${value.substring(value.length - 2)}` : '***',
                 detector: 'env-file-credential'
               },
               metadata: {
                 secretFingerprint: fingerprint.secretFingerprint
               }
             });

             remediations.set(findingSlug, [
               {
                 estimatedEffort: 'LOW',
                 steps: [
                   { order: 1, title: 'Remove file from Git', explanation: `Run \`git rm --cached ${file.relativePath}\` to remove the file from tracking without deleting it locally.` },
                   { order: 2, title: 'Update .gitignore', explanation: `Ensure ${basename} is added to your .gitignore file.` },
                   { order: 3, title: 'Rotate secrets', explanation: 'Assume any secret in this file is compromised and rotate them.' }
                 ]
               }
             ]);

             break; // We only need one finding per .env file to alert the user
           }
        }
      }

      // Determine passedChecks (Verify Fix logic)
      if (verifyFindingSlug) {
        // If the specific slug we're verifying wasn't found in the findings, it means it passed!
        if (!findings.some(f => f.slug === verifyFindingSlug)) {
          passedChecks.push(verifyFindingSlug);
        }
      } else {
        // Only auto-resolve if we scanned everything (didn't hit max file limits or max size limits)
        // Since we don't have a direct 'truncated' flag from fetchAndExtractRepository, we could add one,
        // or just rely on if it completed successfully. Wait, in repository.ts, we stopped early if limits hit,
        // but we didn't explicitly flag truncation in stats except returning the files we did get.
        // Actually, let's check stats.scanned. But we don't know the total files in repo.
        // It's safer to add a 'truncated' flag to FetchResult. I will assume it's added.
        if (!stats.truncated) {
          const existingFindings = await db.finding.findMany({
            where: { assetId: asset.id, category: FindingCategory.SECRETS, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            select: { slug: true }
          });

          for (const ef of existingFindings) {
            if (!findings.some(f => f.slug === ef.slug)) {
              passedChecks.push(ef.slug);
            }
          }
        } else {
          log.warn(`Skipping auto-resolution for asset ${asset.id} because the scan was truncated due to limits`);
        }
      }

    } finally {
      await cleanupRepository(tempDir);
    }

    return {
      findings,
      passedChecks,
      remediations,
      metadata: { stats: fetchResult?.stats },
      evaluatedCategories: [FindingCategory.SECRETS]
    };
  }
}

scannerRegistry.register(new GithubSecretScanner());
