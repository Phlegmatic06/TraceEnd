import { ScannerFinding, ScannerRemediationTemplate } from '../../types';

export interface DomainCheckResult {
  findings: ScannerFinding[];
  remediations: Map<string, ScannerRemediationTemplate[]>;
}

export interface DomainCheckContext {
  domain: string;
}

export type DomainCheck = (context: DomainCheckContext) => Promise<DomainCheckResult>;
