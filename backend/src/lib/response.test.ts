import { describe, expect, it } from 'vitest';
import {
  badRequest,
  conflict,
  created,
  internalError,
  noContent,
  notFound,
  ok,
} from './response.js';

describe('response helpers', () => {
  it('ok returns 200 with JSON body', () => {
    const r = ok({ foo: 'bar' });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body as string)).toEqual({ foo: 'bar' });
  });

  it('created returns 201', () => {
    expect(created({}).statusCode).toBe(201);
  });

  it('noContent returns 204 with no body', () => {
    const r = noContent();
    expect(r.statusCode).toBe(204);
    expect(r.body).toBeUndefined();
  });

  it('notFound returns 404 with RESOURCE_NOT_FOUND code', () => {
    const r = notFound('Not here');
    expect(r.statusCode).toBe(404);
    expect(JSON.parse(r.body as string).error.code).toBe('RESOURCE_NOT_FOUND');
    expect(JSON.parse(r.body as string).error.message).toBe('Not here');
  });

  it('badRequest returns 400 with VALIDATION_ERROR code', () => {
    const r = badRequest('Bad input');
    expect(r.statusCode).toBe(400);
    expect(JSON.parse(r.body as string).error.code).toBe('VALIDATION_ERROR');
  });

  it('conflict returns 409 with CONFLICT code', () => {
    const r = conflict('Already exists');
    expect(r.statusCode).toBe(409);
    expect(JSON.parse(r.body as string).error.code).toBe('CONFLICT');
  });

  it('internalError returns 500 with INTERNAL_ERROR code', () => {
    const r = internalError();
    expect(r.statusCode).toBe(500);
    expect(JSON.parse(r.body as string).error.code).toBe('INTERNAL_ERROR');
  });
});
