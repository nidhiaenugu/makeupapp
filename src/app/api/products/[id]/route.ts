import { getCatalogProvider } from '@/lib/data';
import { priceTierFor } from '@/lib/domain/taxonomy';
import { notFound, ok, preflight } from '@/lib/api/respond';

/** GET /api/products/:id — a single product, with its price tier resolved. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await getCatalogProvider().byId(id);

  if (!product) return notFound(`Product "${id}"`);

  return ok({ ...product, priceTier: priceTierFor(product.price) });
}

export function OPTIONS() {
  return preflight();
}
