import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

/**
 * Consistent response envelopes. Every route returns either
 * `{ data, meta? }` or `{ error: { code, message, details? } }`, so clients
 * can branch on one shape rather than guessing per endpoint.
 */

export interface ApiMeta {
  [key: string]: unknown;
}

/** Public API — allow browser clients from anywhere to call it. */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function ok<T>(data: T, meta?: ApiMeta, init?: ResponseInit): NextResponse {
  return NextResponse.json(
    meta ? { data, meta } : { data },
    { ...init, headers: { ...CORS_HEADERS, ...init?.headers } },
  );
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status, headers: CORS_HEADERS },
  );
}

export function badRequest(error: ZodError): NextResponse {
  return fail(
    'invalid_request',
    'The request did not match the expected shape.',
    400,
    error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  );
}

export function notFound(what: string): NextResponse {
  return fail('not_found', `${what} was not found.`, 404);
}

/** Preflight handler, re-exported by every route as `OPTIONS`. */
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Parse a JSON body, turning malformed JSON into a clean 400. */
export async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: fail('invalid_json', 'Request body must be valid JSON.', 400),
    };
  }
}
