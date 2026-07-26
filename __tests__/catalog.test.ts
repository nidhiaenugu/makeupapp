import { loadBundledCatalog } from '@core/catalog';
import { LocalCatalogProvider } from '@core/catalog/local';
import { productSchema } from '@core/catalog/schema';
import { CATEGORIES } from '@core/types/enums';
import { SUBCATEGORIES_BY_CATEGORY } from '@core/types/product';

const catalog = loadBundledCatalog();

describe('bundled catalog', () => {
  it('loads a substantial number of products', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(150);
  });

  it('validates every entry against the schema', () => {
    for (const product of catalog) {
      const result = productSchema.safeParse(product);
      if (!result.success) {
        throw new Error(
          `${product.id} failed validation: ${result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')}`
        );
      }
    }
  });

  it('has unique ids', () => {
    const ids = catalog.map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every category', () => {
    for (const category of CATEGORIES) {
      const count = catalog.filter((product) => product.category === category).length;
      expect(count).toBeGreaterThan(20);
    }
  });

  it('only uses subcategories that belong to the product category', () => {
    for (const product of catalog) {
      expect(SUBCATEGORIES_BY_CATEGORY[product.category]).toContain(product.subcategory);
    }
  });

  it('never contradicts itself on fragrance', () => {
    for (const product of catalog) {
      if (product.attributes.fragranceFree) {
        expect(product.allergens).not.toContain('fragrance');
      }
    }
  });

  it('gives hair products the hair-specific targeting the engine needs', () => {
    for (const product of catalog.filter((p) => p.category === 'hair')) {
      expect(product.hairTypes?.length ?? 0).toBeGreaterThan(0);
      expect(product.porosity?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('gives every product at least one routine-orderable step', () => {
    for (const product of catalog) {
      expect(product.routineStep).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('LocalCatalogProvider', () => {
  const provider = new LocalCatalogProvider(catalog);

  it('finds a product by id', async () => {
    const first = catalog[0]!;
    await expect(provider.get(first.id)).resolves.toEqual(first);
  });

  it('returns undefined for an unknown id', async () => {
    await expect(provider.get('does-not-exist')).resolves.toBeUndefined();
  });

  it('filters by category', async () => {
    const page = await provider.query({ category: 'hair' });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((product) => product.category === 'hair')).toBe(true);
  });

  it('searches across brand, name and ingredients', async () => {
    const page = await provider.query({ search: 'niacinamide' });
    expect(page.items.length).toBeGreaterThan(0);
  });

  it('honours requireAttributes', async () => {
    const page = await provider.query({ requireAttributes: ['crueltyFree', 'vegan'] });
    expect(
      page.items.every((product) => product.attributes.crueltyFree && product.attributes.vegan)
    ).toBe(true);
  });

  it('paginates', async () => {
    const page = await provider.query({ limit: 5, offset: 0 });
    expect(page.items).toHaveLength(5);
    expect(page.total).toBe(catalog.length);
  });

  it('lists brands alphabetically without duplicates', async () => {
    const brands = await provider.brands();
    expect(new Set(brands).size).toBe(brands.length);
    expect([...brands].sort((a, b) => a.localeCompare(b))).toEqual(brands);
  });
});
