import type { NextRequest } from 'next/server';
import { getCatalogProvider } from '@/lib/data';
import { productQuerySchema } from '@/lib/domain/schemas';
import { priceTierFor } from '@/lib/domain/taxonomy';
import { badRequest, ok, preflight } from '@/lib/api/respond';

/**
 * GET /api/products
 *
 * Filter, search, sort and paginate the catalog.
 * See docs/API.md for the full parameter list.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = productQuerySchema.safeParse(params);
  if (!parsed.success) return badRequest(parsed.error);

  const query = parsed.data;
  const { items, total } = await getCatalogProvider().query(query);

  return ok(
    items.map((product) => ({ ...product, priceTier: priceTierFor(product.price) })),
    {
      total,
      page: query.page,
      perPage: query.perPage,
      totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    },
  );
}

export function OPTIONS() {
  return preflight();
}
