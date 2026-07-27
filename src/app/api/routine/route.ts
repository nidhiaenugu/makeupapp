import { getCatalogProvider } from '@/lib/data';
import { routineRequestSchema } from '@/lib/domain/schemas';
import { buildRoutine } from '@/lib/engine';
import { badRequest, ok, preflight, readJson } from '@/lib/api/respond';

/**
 * POST /api/routine
 *
 * Body: { profile, category }
 *
 * Skincare returns both an AM and a PM routine; makeup and hair have a single
 * sequence, so only one routine comes back.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body.ok) return body.response;

  const parsed = routineRequestSchema.safeParse(body.value);
  if (!parsed.success) return badRequest(parsed.error);

  const { profile, category } = parsed.data;
  const products = await getCatalogProvider().all();

  const routines =
    category === 'skincare'
      ? [
          buildRoutine(products, profile, { category, time: 'am' }),
          buildRoutine(products, profile, { category, time: 'pm' }),
        ]
      : [buildRoutine(products, profile, { category })];

  return ok(routines, {
    category,
    totalSteps: routines.reduce((sum, r) => sum + r.steps.length, 0),
  });
}

export function OPTIONS() {
  return preflight();
}
