import hairData from './catalog/hair.json';
import makeupData from './catalog/makeup.json';
import skincareData from './catalog/skincare.json';
import { catalogSchema } from '@/lib/domain/schemas';
import type { Product } from '@/lib/domain/types';
import type { ProductQuery } from '@/lib/domain/schemas';
import type { CatalogProvider } from './provider';

/** Raw JSON, still unvalidated. */
const RAW = [...skincareData, ...makeupData, ...hairData];

/**
 * Parse once at module load. If a JSON file has drifted from the schema the
 * app fails loudly at startup rather than producing quietly wrong matches, and
 * the same check runs in CI via `npm run validate:catalog`.
 */
function loadCatalog(): Product[] {
  const parsed = catalogSchema.safeParse(RAW);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 10)
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Product catalog failed validation (${parsed.error.issues.length} issue(s)):\n${issues}`,
    );
  }

  const products = parsed.data as Product[];

  const seen = new Set<string>();
  for (const product of products) {
    if (seen.has(product.id)) {
      throw new Error(`Duplicate product id in catalog: "${product.id}"`);
    }
    seen.add(product.id);
  }

  return products;
}

const CATALOG: Product[] = loadCatalog();

/** Index by id so `byId` is O(1) rather than a scan per request. */
const BY_ID = new Map(CATALOG.map((p) => [p.id, p]));

function matchesQuery(product: Product, q: ProductQuery): boolean {
  if (q.category && product.category !== q.category) return false;
  if (q.type && product.type !== q.type) return false;
  if (q.brand && product.brand.toLowerCase() !== q.brand.toLowerCase()) return false;
  if (q.concern && !product.targets.includes(q.concern)) return false;
  if (q.attribute && !product.attributes.includes(q.attribute)) return false;
  if (q.maxPrice !== undefined && product.price > q.maxPrice) return false;
  if (q.minPrice !== undefined && product.price < q.minPrice) return false;

  if (q.search) {
    const needle = q.search.toLowerCase();
    const haystack = [
      product.name,
      product.brand,
      product.type,
      product.description,
      ...product.keyIngredients,
      ...product.tags,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

function sortProducts(products: Product[], sort: ProductQuery['sort']): Product[] {
  const sorted = [...products];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'curation':
    default:
      return sorted.sort((a, b) => b.curationScore - a.curationScore);
  }
}

/**
 * Catalog backed by the JSON files bundled into the build. Synchronous under
 * the hood, but the interface is async so a network-backed provider is a
 * drop-in replacement.
 */
export class JsonCatalogProvider implements CatalogProvider {
  async all(): Promise<Product[]> {
    return CATALOG;
  }

  async byId(id: string): Promise<Product | undefined> {
    return BY_ID.get(id);
  }

  async query(query: ProductQuery): Promise<{ items: Product[]; total: number }> {
    const filtered = CATALOG.filter((p) => matchesQuery(p, query));
    const sorted = sortProducts(filtered, query.sort);
    const start = (query.page - 1) * query.perPage;
    return {
      items: sorted.slice(start, start + query.perPage),
      total: sorted.length,
    };
  }

  async brands(): Promise<string[]> {
    return [...new Set(CATALOG.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
  }
}

/** Exposed for tests and the validation script. */
export { CATALOG as bundledCatalog };
