// ──────────────────────────────────────────────────────────────
// TraceEnd — Validation Tests
// Tests for Zod boundary validation schemas.
// ──────────────────────────────────────────────────────────────

import {
  createAssetSchema,
  createScanSchema,
  updateFindingStatusSchema,
  paginationSchema,
  findingsFilterSchema,
} from '../src/lib/validators';

describe('createAssetSchema', () => {
  it('accepts valid asset data', () => {
    const result = createAssetSchema.safeParse({
      type: 'EMAIL',
      identifier: 'user@example.com',
      displayName: 'user@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing identifier', () => {
    const result = createAssetSchema.safeParse({
      type: 'EMAIL',
      identifier: '',
      displayName: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid asset type', () => {
    const result = createAssetSchema.safeParse({
      type: 'INVALID_TYPE',
      identifier: 'test',
      displayName: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects overly long identifier', () => {
    const result = createAssetSchema.safeParse({
      type: 'DOMAIN',
      identifier: 'a'.repeat(501),
      displayName: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional metadata', () => {
    const result = createAssetSchema.safeParse({
      type: 'DOMAIN',
      identifier: 'example.com',
      displayName: 'example.com',
      metadata: { registrar: 'Cloudflare' },
    });
    expect(result.success).toBe(true);
  });
});

describe('createScanSchema', () => {
  it('accepts valid scan data', () => {
    const result = createScanSchema.safeParse({
      assetId: 'cm1234567890',
      type: 'FULL',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid scan type', () => {
    const result = createScanSchema.safeParse({
      assetId: 'cm1234567890',
      type: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateFindingStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['OPEN', 'IN_PROGRESS', 'MITIGATED', 'RESOLVED', 'ACCEPTED_RISK', 'FALSE_POSITIVE'];
    for (const status of statuses) {
      const result = updateFindingStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = updateFindingStatusSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('applies defaults', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects page < 1', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit > 100', () => {
    const result = paginationSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it('coerces string numbers', () => {
    const result = paginationSchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });
});

describe('findingsFilterSchema', () => {
  it('applies defaults for sorting', () => {
    const result = findingsFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe('createdAt');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('accepts all filter combinations', () => {
    const result = findingsFilterSchema.safeParse({
      severity: 'CRITICAL',
      status: 'OPEN',
      category: 'SECRETS',
      search: 'api key',
      page: 2,
      limit: 10,
      sortBy: 'severity',
      sortOrder: 'asc',
    });
    expect(result.success).toBe(true);
  });

  it('rejects overly long search', () => {
    const result = findingsFilterSchema.safeParse({
      search: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });
});
