// ──────────────────────────────────────────────────────────────
// TraceEnd — Error Handling Tests
// ──────────────────────────────────────────────────────────────

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceError,
  toErrorResponse,
} from '../src/lib/errors';

describe('Error classes', () => {
  it('ValidationError has correct code and status', () => {
    const err = new ValidationError('Bad input', { field: ['required'] });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: ['required'] });
  });

  it('AuthenticationError has correct code and status', () => {
    const err = new AuthenticationError();
    expect(err.code).toBe('AUTHENTICATION_ERROR');
    expect(err.statusCode).toBe(401);
  });

  it('AuthorizationError has correct code and status', () => {
    const err = new AuthorizationError();
    expect(err.code).toBe('AUTHORIZATION_ERROR');
    expect(err.statusCode).toBe(403);
  });

  it('NotFoundError includes resource name', () => {
    const err = new NotFoundError('Finding', 'abc123');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('Finding');
    expect(err.message).toContain('abc123');
  });

  it('ConflictError has correct code', () => {
    const err = new ConflictError('Already exists');
    expect(err.code).toBe('CONFLICT');
    expect(err.statusCode).toBe(409);
  });

  it('RateLimitError has correct status', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
  });

  it('ServiceError has correct status', () => {
    const err = new ServiceError('Upstream failed');
    expect(err.statusCode).toBe(502);
  });
});

describe('toErrorResponse', () => {
  it('formats AppError for client', () => {
    const err = new ValidationError('Invalid email');
    const response = toErrorResponse(err);
    expect(response.status).toBe(400);
    expect(response.error.code).toBe('VALIDATION_ERROR');
    expect(response.error.message).toBe('Invalid email');
  });

  it('masks unknown errors', () => {
    const response = toErrorResponse(new Error('Internal DB connection failed'));
    expect(response.status).toBe(500);
    expect(response.error.code).toBe('INTERNAL_ERROR');
    expect(response.error.message).toBe('An unexpected error occurred');
    // Must not expose internal details
    expect(response.error.message).not.toContain('DB');
  });

  it('masks non-Error values', () => {
    const response = toErrorResponse('some string error');
    expect(response.status).toBe(500);
    expect(response.error.code).toBe('INTERNAL_ERROR');
  });
});
