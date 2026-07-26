import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = 'claude-opus-5';

let client;

export function anthropic() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set on the server.');
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * A deliberately simple in-memory rate limiter.
 *
 * Serverless instances are short-lived and not shared, so this caps abuse from
 * a single warm instance rather than providing a global guarantee. For real
 * traffic, put a proper limiter (Upstash, Vercel KV, an API gateway) in front —
 * see docs/DEPLOYING_PROXY.md.
 */
const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

export function rateLimited(request) {
  const key =
    request.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
    request.headers['x-real-ip'] ??
    'unknown';
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.start > WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS;
}

/** Shared request preamble: CORS, method check, rate limit, body parsing. */
export function guard(request, response) {
  response.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return undefined;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Use POST.' });
    return undefined;
  }

  if (rateLimited(request)) {
    response.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    return undefined;
  }

  const body = typeof request.body === 'string' ? safeParse(request.body) : request.body;
  if (!body || typeof body !== 'object') {
    response.status(400).json({ error: 'Expected a JSON body.' });
    return undefined;
  }

  return body;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function firstText(message) {
  for (const block of message.content) {
    if (block.type === 'text') return block.text;
  }
  return undefined;
}

export function fail(response, error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  // Never echo the upstream error verbatim — it can contain request details.
  console.error('[glowmatch-proxy]', message);
  response.status(502).json({ error: 'The advisor is unavailable right now.' });
}
