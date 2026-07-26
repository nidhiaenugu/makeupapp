import type { Category, PriceTier } from '../types/enums';
import type { Product, Subcategory } from '../types/product';

export interface CatalogQuery {
  category?: Category;
  subcategory?: Subcategory;
  /** Case-insensitive match against brand, name, benefits and ingredients. */
  search?: string;
  priceTiers?: PriceTier[];
  brands?: string[];
  /** Only return products where every listed attribute flag is true. */
  requireAttributes?: (keyof Product['attributes'])[];
  limit?: number;
  offset?: number;
}

export interface CatalogPage {
  items: Product[];
  total: number;
}

/**
 * The seam between the app and wherever product data lives.
 *
 * Today the only implementation reads bundled JSON. Swapping in a REST API, a
 * Postgres-backed service or a retailer feed means writing one more class that
 * satisfies this interface — no screen or engine code changes. Every method is
 * async precisely so a remote implementation is a drop-in.
 */
export interface CatalogProvider {
  readonly name: string;
  all(): Promise<Product[]>;
  get(id: string): Promise<Product | undefined>;
  query(query: CatalogQuery): Promise<CatalogPage>;
  brands(): Promise<string[]>;
}
