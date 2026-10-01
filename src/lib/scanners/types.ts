// ──────────────────────────────────────────────────────────────
// TraceEnd — Scanner Interface
// Defines the contract that all future security scanners must
// implement. This is the primary extension point for adding
// new scanning capabilities.
// ──────────────────────────────────────────────────────────────

import type { AssetType, Severity, FindingCategory, Confidence } from '@/generated/prisma/client';

/** Raw finding output from a scanner before normalization */
export interface ScannerFinding {
  title: string;
  slug: string;
  category: FindingCategory;
  severity: Severity;
  confidence: Confidence;
  description: string;
  plainEnglishExplanation: string;
  technicalDetails?: string;
  potentialImpact: string;
  remediationSummary?: string;
  evidence?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Remediation template attached to a scanner finding */
export interface ScannerRemediationTemplate {
  environment?: string;
  estimatedEffort: 'TRIVIAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'COMPLEX';
  steps: Array<{
    order: number;
    title: string;
    explanation: string;
    codeSnippet?: string;
    codeLanguage?: string;
    docUrl?: string;
  }>;
}

/** Result of a single scanner execution */
export interface ScannerResult {
  findings: ScannerFinding[];
  remediations?: Map<string, ScannerRemediationTemplate[]>; // keyed by finding slug
  metadata?: Record<string, unknown>;
  evaluatedCategories?: FindingCategory[];
}

/** The interface every scanner must implement */
export interface Scanner {
  /** Unique identifier for this scanner */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Asset types this scanner can process */
  readonly supportedAssetTypes: AssetType[];

  /** Execute the scan against the given asset identifier */
  execute(
    assetIdentifier: string,
    assetType: AssetType,
    config?: Record<string, unknown>
  ): Promise<ScannerResult>;
}

/** Registry for dynamically loading scanners */
export class ScannerRegistry {
  private scanners = new Map<string, Scanner>();

  register(scanner: Scanner): void {
    this.scanners.set(scanner.id, scanner);
  }

  get(id: string): Scanner | undefined {
    return this.scanners.get(id);
  }

  getForAssetType(assetType: AssetType): Scanner[] {
    return Array.from(this.scanners.values()).filter((s) =>
      s.supportedAssetTypes.includes(assetType)
    );
  }

  list(): Scanner[] {
    return Array.from(this.scanners.values());
  }
}

export const scannerRegistry = new ScannerRegistry();
