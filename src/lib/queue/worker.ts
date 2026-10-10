import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { db } from '../db';
import { validateScanTransition } from '../services/state-machine';
import { scannerRegistry } from '../scanners';
import { ScanJobStatus, ScanStatus, FindingStatus } from '@/generated/prisma/client';
import { logger } from '../logger';

const log = logger.child({ module: 'worker' });

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const scanWorker = new Worker('scans', async (job: Job) => {
  const { scanId, scanJobId, assetId, assetIdentifier, assetType, verifyFindingSlug } = job.data;
  log.info(`Processing job ${job.id} for scan ${scanId} (scanner: ${job.name})`);

  try {
    const currentScan = await db.scan.findUniqueOrThrow({ where: { id: scanId } });
    validateScanTransition(currentScan.status as any, ScanStatus.RUNNING);

    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: ScanJobStatus.PROCESSING, startedAt: new Date() },
    });
    if (currentScan.status !== ScanStatus.RUNNING) {
      await db.scan.update({
        where: { id: scanId },
        data: { status: ScanStatus.RUNNING, startedAt: new Date() },
      });
    }

    const scanner = scannerRegistry.get(job.name);
    if (!scanner) {
      throw new Error(`Scanner ${job.name} not found in registry`);
    }

    const result = await scanner.execute(assetIdentifier, assetType, { verifyFindingSlug });
    
    const scan = await db.scan.findUniqueOrThrow({ where: { id: scanId }, select: { workspaceId: true } });
    
    let findingsCount = 0;
    const detectedSlugs = new Set(result.findings.map(f => f.slug));

    // Process detected findings
    for (const f of result.findings) {
      const finding = await db.finding.findFirst({
        where: { assetId, slug: f.slug, workspaceId: scan.workspaceId }
      });

      if (finding) {
        // Was it verified?
        if (verifyFindingSlug === f.slug && finding.status === 'IN_PROGRESS') {
           await db.activityEvent.create({
             data: {
               action: 'finding.verification_failed',
               description: `Verification failed. Finding still exists: ${f.title}`,
               workspaceId: scan.workspaceId,
               assetId,
               scanId,
               findingId: finding.id,
             }
           });
        }
        
        await db.finding.update({
          where: { id: finding.id },
          data: {
            status: FindingStatus.OPEN,
            lastDetectedAt: new Date(),
            scanId,
            description: f.description,
            severity: f.severity,
            evidence: f.evidence ? (f.evidence as any) : finding.evidence,
            technicalDetails: f.technicalDetails,
          }
        });
      } else {
        const newFinding = await db.finding.create({
          data: {
            title: f.title,
            slug: f.slug,
            category: f.category,
            severity: f.severity,
            confidence: f.confidence,
            description: f.description,
            plainEnglishExplanation: f.plainEnglishExplanation,
            technicalDetails: f.technicalDetails,
            potentialImpact: f.potentialImpact,
            remediationSummary: f.remediationSummary,
            assetId,
            scanId,
            workspaceId: scan.workspaceId,
          }
        });
        
        if (result.remediations && result.remediations.has(f.slug)) {
          const templates = result.remediations.get(f.slug)!;
          for (const template of templates) {
            await db.remediation.create({
              data: {
                findingId: newFinding.id,
                environment: template.environment,
                estimatedEffort: template.estimatedEffort as any,
                steps: {
                  create: template.steps.map(step => ({
                    order: step.order,
                    title: step.title,
                    explanation: step.explanation,
                    codeSnippet: step.codeSnippet,
                    codeLanguage: step.codeLanguage,
                    docUrl: step.docUrl,
                  }))
                }
              }
            });
          }
        }
        
        await db.activityEvent.create({
          data: {
            action: 'finding.created',
            description: `New finding detected: ${f.title}`,
            workspaceId: scan.workspaceId,
            assetId,
            scanId,
          }
        });
        
        findingsCount++;
      }
    }

    // Auto-resolve findings that were explicitly marked as passed
    if (result.passedChecks && result.passedChecks.length > 0) {
      if (verifyFindingSlug) {
        if (!detectedSlugs.has(verifyFindingSlug)) {
          const verifyTarget = await db.finding.findFirst({
            where: { assetId, slug: verifyFindingSlug, workspaceId: scan.workspaceId }
          });
          if (verifyTarget) {
            // Only resolve if the scanner explicitly passed this check
            if (result.passedChecks.includes(verifyTarget.slug)) {
              await db.finding.update({
                where: { id: verifyTarget.id },
                data: { status: FindingStatus.RESOLVED }
              });
              await db.activityEvent.create({
                data: {
                  action: 'finding.resolved',
                  description: `Finding verified and resolved: ${verifyTarget.title}`,
                  workspaceId: scan.workspaceId,
                  assetId,
                  scanId,
                  findingId: verifyTarget.id,
                }
              });
            } else {
              // Indeterminate! The scanner ran but didn't explicitly pass or fail this finding.
              // Revert finding to OPEN if it was IN_PROGRESS.
              if (verifyTarget.status === 'IN_PROGRESS') {
                await db.finding.update({
                  where: { id: verifyTarget.id },
                  data: { status: FindingStatus.OPEN }
                });
              }
              await db.activityEvent.create({
                data: {
                  action: 'finding.verification_failed',
                  description: `Verification indeterminate (check was skipped or failed to run). Finding remains open: ${verifyTarget.title}`,
                  workspaceId: scan.workspaceId,
                  assetId,
                  scanId,
                  findingId: verifyTarget.id,
                }
              });
            }
          }
        }
      } else {
        // Full scan - resolve OPEN/IN_PROGRESS findings explicitly passed by the scanner.
        const staleFindings = await db.finding.findMany({
          where: {
            assetId,
            workspaceId: scan.workspaceId,
            status: { in: [FindingStatus.OPEN, FindingStatus.IN_PROGRESS] },
            slug: { in: result.passedChecks, notIn: Array.from(detectedSlugs) }
          }
        });

        for (const stale of staleFindings) {
          await db.finding.update({
            where: { id: stale.id },
            data: { status: FindingStatus.RESOLVED }
          });
          await db.activityEvent.create({
            data: {
              action: 'finding.resolved',
              description: `Finding resolved automatically by scan: ${stale.title}`,
              workspaceId: scan.workspaceId,
              assetId,
              scanId,
              findingId: stale.id,
            }
          });
        }
      }
    } else if (verifyFindingSlug && !detectedSlugs.has(verifyFindingSlug)) {
      // If there are no passedChecks at all but we are verifying a finding, and it wasn't detected:
      // It's indeterminate.
      const verifyTarget = await db.finding.findFirst({
        where: { assetId, slug: verifyFindingSlug, workspaceId: scan.workspaceId }
      });
      if (verifyTarget) {
        if (verifyTarget.status === 'IN_PROGRESS') {
          await db.finding.update({
            where: { id: verifyTarget.id },
            data: { status: FindingStatus.OPEN }
          });
        }
        await db.activityEvent.create({
          data: {
            action: 'finding.verification_failed',
            description: `Verification indeterminate (no checks explicitly passed). Finding remains open: ${verifyTarget.title}`,
            workspaceId: scan.workspaceId,
            assetId,
            scanId,
            findingId: verifyTarget.id,
          }
        });
      }
    }

    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: ScanJobStatus.COMPLETED, completedAt: new Date(), result: result as any },
    });

    log.info(`Job ${job.id} completed. Found ${findingsCount} new findings.`);

    const pendingJobs = await db.scanJob.count({
      where: { scanId, status: { in: [ScanJobStatus.PENDING, ScanJobStatus.PROCESSING] } }
    });

    if (pendingJobs === 0) {
      await db.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.COMPLETED,
          completedAt: new Date(),
          findingsCount: { increment: findingsCount }
        }
      });
      
      await db.activityEvent.create({
        data: {
          action: 'scan.completed',
          description: `Scan completed on ${assetIdentifier}`,
          workspaceId: scan.workspaceId,
          assetId,
          scanId,
        }
      });
    }

  } catch (error) {
    log.error(`Job ${job.id} failed`, { error: String(error) });
    await db.scanJob.update({
      where: { id: scanJobId },
      data: {
        status: ScanJobStatus.FAILED,
        completedAt: new Date(),
        errorMessage: String(error),
      }
    });

    const pendingJobs = await db.scanJob.count({
      where: { scanId, status: { in: [ScanJobStatus.PENDING, ScanJobStatus.PROCESSING] } }
    });

    if (pendingJobs === 0) {
      await db.scan.update({
        where: { id: scanId },
        data: { status: ScanStatus.COMPLETED, completedAt: new Date() }
      });
    }

    throw error;
  }
}, { 
  connection,
  concurrency: 5 
});

scanWorker.on('failed', async (job, err) => {
  log.error(`Job ${job?.id} failed with error: ${err.message}`);
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log.info(`Received ${signal}, gracefully shutting down worker...`);
  try {
    await scanWorker.close(); // Waits for active jobs to finish
    connection.disconnect();
    log.info('Worker shutdown complete.');
    process.exit(0);
  } catch (err) {
    log.error('Error during shutdown', { error: String(err) });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

log.info('Scan Worker started with concurrency 5');
