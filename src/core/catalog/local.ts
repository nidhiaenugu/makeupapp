import type { Product } from '../types/product';
import type { CatalogPage, CatalogProvider, CatalogQuery } from './provider';

/**
 * Serves products from an in-memory array (the bundled JSON catalog).
 *
 * Indexes are built once on construction so `get` and `query` stay fast as the
 * catalog grows past a few thousand entries.
 */
export class LocalCatalogProvider implements CatalogProvider {
  readonly name = 'local';

  private readonly products: Product[];
  private readonly byId: Map<string, Product>;

  constructor(products: Product[]) {
    this.products = products;
    this.byId = new Map(products.map((product) => [product.id, product]));
  }

  async all(): Promise<Product[]> {
    return this.products;
  }

  async get(id: string): Promise<Product | undefined> {
    return this.byId.get(id);
  }

  async brands(): Promise<string[]> {
    return [...new Set(this.products.map((product) => product.brand))].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  async query(query: CatalogQuery): Promise<CatalogPage> {
    const needle = query.search?.trim().toLowerCase();
    const filtered = this.products.filter((product) => {
      if (query.category && product.category !== query.category) return false;
      if (query.subcategory && product.subcategory !== query.subcategory) return false;
      if (query.priceTiers?.length && !query.priceTiers.includes(product.priceTier)) return false;
      if (query.brands?.length && !query.brands.includes(product.brand)) return false;
      if (query.requireAttributes?.length) {
        const missing = query.requireAttributes.some((flag) => !product.attributes[flag]);
        if (missing) return false;
      }
      if (needle && !matchesSearch(product, needle)) return false;
      return true;
    });

    const offset = query.offset ?? 0;
    const limit = query.limit ?? filtered.length;
    return { items: filtered.slice(offset, offset + limit), total: filtered.length };
  }
}

function matchesSearch(product: Product, needle: string): boolean {
  const haystack = [
    product.brand,
    product.name,
    product.subcategory,
    product.description,
    ...product.benefits,
    ...product.keyIngredients,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}
