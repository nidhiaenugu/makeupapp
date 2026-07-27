import { getCatalogProvider } from '@/lib/data';
import { recommendationRequestSchema } from '@/lib/domain/schemas';
import { recommend } from '@/lib/engine';
import { badRequest, ok, preflight, readJson } from '@/lib/api/respond';

/**
 * POST /api/recommendations
 *
 * Body: { profile, limit?, type?, maxPerType? }
 *
 * POST rather than GET because a profile is a nested object with a dozen
 * fields — cramming it into a query string would be worse for every client.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body.ok) return body.response;

  const parsed = recommendationRequestSchema.safeParse(body.value);
  if (!parsed.success) return badRequest(parsed.error);

  const { profile, limit, type, maxPerType } = parsed.data;
  const products = await getCatalogProvider().all();
  const result = recommend(products, profile, { limit, type, maxPerType });

  return ok(result.recommendations, {
    considered: result.considered,
    eligible: result.eligible,
    returned: result.recommendations.length,
    unmatchedConcerns: result.unmatchedConcerns,
    notes: result.notes,
  });
}

export function OPTIONS() {
  return preflight();
}
