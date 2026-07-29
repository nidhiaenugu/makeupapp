import type { Product } from '@/lib/domain/types';
import type { ProductQuery } from '@/lib/domain/schemas';

/**
 * The seam between the app and wherever product data actually lives.
 *
 * The bundled implementation (`JsonCatalogProvider`) reads three JSON files, so
 * the app runs with no database and no API keys. Swapping in Postgres, a CMS or
 * a retailer feed means implementing this interface and changing one line in
 * `src/lib/data/index.ts` — nothing in the engine, the API routes or the UI
 * touches the storage layer directly. See docs/ARCHITECTURE.md.
 */
export interface CatalogProvider {
  /** Every product. The engine scores against the full set. */
  all(): Promise<Product[]>;
  byId(id: string): Promise<Product | undefined>;
  /** Filtered, sorted and paginated listing for the browse page and API. */
  query(query: ProductQuery): Promise<{ items: Product[]; total: number }>;
  /** Distinct brands, for the browse facets. */
  brands(): Promise<string[]>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export function paginate<T>(items: T[], page: number, perPage: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    total,
    page: safePage,
    perPage,
    totalPages,
  };
}
