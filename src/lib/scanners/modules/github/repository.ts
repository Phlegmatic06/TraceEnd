import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import { logger } from '@/lib/logger';
import { getGithubToken } from '@/lib/services/integrations';
import { shouldSkipFile } from './file-filter';
import { env } from '@/lib/config/env';

const log = logger.child({ module: 'github-repository-fetcher' });

export interface ExtractedFile {
  relativePath: string;
  absolutePath: string;
}

export interface FetchResult {
  files: ExtractedFile[];
  tempDir: string;
  stats: {
    scanned: number;
    skipped: number;
    bytes: number;
    truncated: boolean;
  };
}

export async function fetchAndExtractRepository(
  workspaceId: string,
  owner: string,
  repo: string,
  ref: string = 'HEAD'
): Promise<FetchResult> {
  const token = await getGithubToken(workspaceId);
  const url = `https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`;
  
  log.info(`Fetching repository archive: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('GITHUB_ACCESS_REVOKED');
    }
    throw new Error(`Failed to fetch repository tarball: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No body in response');
  }

  // Create unique temp directory
  const tempDir = path.join(process.cwd(), '.tempStorage', `${owner}_${repo}_${Date.now()}`);
  await fs.promises.mkdir(tempDir, { recursive: true });

  const extractedFiles: ExtractedFile[] = [];
  let totalBytes = 0;
  let fileCount = 0;
  let skippedCount = 0;
  let truncated = false;

  try {
    // Pipe the response body to tar extraction
    await pipeline(
      response.body as any,
      tar.x({
        cwd: tempDir,
        filter: (filePath: string, entry: any) => {
          // Reject absolute paths and tricky traversals
          if (filePath.startsWith('/') || filePath.includes('..') || /^[a-zA-Z]:/.test(filePath)) {
            log.warn(`Rejected malicious archive path: ${filePath}`);
            return false;
          }

          // Normalize path by stripping the root folder GitHub adds
          const parts = filePath.split('/');
          if (parts.length <= 1) return false;
          
          parts.shift(); // Remove root folder (e.g., owner-repo-sha)
          const relativePath = parts.join('/');
          
          if (!relativePath) return false; // Skip the root directory itself
          
          // Verify final extraction path remains inside tempDir
          const absolutePath = path.resolve(tempDir, filePath);
          if (!absolutePath.startsWith(path.resolve(tempDir))) {
             log.warn(`Rejected path escaping temp root: ${filePath}`);
             return false;
          }
          
          if (entry.type !== 'File') {
            return true; // Let directories be created
          }

          if (shouldSkipFile(relativePath)) {
            skippedCount++;
            return false;
          }

          if (entry.size > env.SCANNER_MAX_FILE_SIZE) {
            log.debug(`Skipping file (too large): ${relativePath} (${entry.size} bytes)`);
            skippedCount++;
            return false;
          }

          if (totalBytes + entry.size > env.SCANNER_MAX_TOTAL_SIZE) {
            log.warn(`Repository extraction stopped early: exceeded MAX_TOTAL_SIZE (${env.SCANNER_MAX_TOTAL_SIZE} bytes)`);
            truncated = true;
            return false; // Stop extracting more
          }

          if (fileCount >= env.SCANNER_MAX_FILES) {
            log.warn(`Repository extraction stopped early: exceeded MAX_FILES (${env.SCANNER_MAX_FILES})`);
            truncated = true;
            return false;
          }

          totalBytes += entry.size;
          fileCount++;
          
          // We keep track of files that are actually being extracted
          extractedFiles.push({
            relativePath,
            absolutePath: path.join(tempDir, filePath) // filePath here is the original path from tar
          });

          return true;
        }
      })
    );
  } catch (err: any) {
    log.error('Error extracting repository', { error: err.message });
    // Clean up if we fail entirely
    await cleanupRepository(tempDir);
    throw new Error(`Repository extraction failed: ${err.message}`);
  }

  return {
    files: extractedFiles,
    tempDir,
    stats: {
      scanned: fileCount,
      skipped: skippedCount,
      bytes: totalBytes,
      truncated,
    }
  };
}

export async function cleanupRepository(tempDir: string) {
  try {
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    log.error(`Failed to clean up temp directory ${tempDir}`, { error: String(error) });
  }
}
