import { describe, expect, it } from 'vitest';
import { JsonCatalogProvider, bundledCatalog } from '@/lib/data/json-provider';
import { productQuerySchema } from '@/lib/domain/schemas';
import { CATEGORIES, CONCERN_IDS, PRODUCT_TYPE_CATEGORY } from '@/lib/domain/taxonomy';

/**
 * These guard the data itself. The zod schema catches structural problems at
 * load time; these catch the semantic ones a schema cannot express — like a
 * concern that no product in the catalog can actually treat.
 */
describe('bundled catalog', () => {
  it('loads and validates every product', () => {
    expect(bundledCatalog.length).toBeGreaterThan(50);
  });

  it('has unique ids', () => {
    const ids = bundledCatalog.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all three categories with real depth', () => {
    for (const category of CATEGORIES) {
      const count = bundledCatalog.filter((p) => p.category === category).length;
      expect(count, `${category} needs a usable number of products`).toBeGreaterThanOrEqual(15);
    }
  });

  it('keeps every product type consistent with its category', () => {
    for (const item of bundledCatalog) {
      expect(PRODUCT_TYPE_CATEGORY[item.type]).toBe(item.category);
    }
  });

  it('defaults every product to both audiences unless explicitly narrowed', () => {
    for (const item of bundledCatalog) {
      expect(item.audience.length, `${item.id} has an empty audience`).toBeGreaterThan(0);
    }
  });

  it('includes a real set of products marketed to men', () => {
    const mensProducts = bundledCatalog.filter(
      (p) => p.audience.length === 1 && p.audience[0] === 'men',
    );
    expect(mensProducts.length).toBeGreaterThanOrEqual(15);
    for (const category of CATEGORIES) {
      expect(
        mensProducts.some((p) => p.category === category),
        `no men's product in ${category}`,
      ).toBe(true);
    }
  });

  it('never has a product both targeting and aggravating one concern', () => {
    for (const item of bundledCatalog) {
      const overlap = item.targets.filter((t) => item.aggravates.includes(t));
      expect(overlap, `${item.id} contradicts itself`).toEqual([]);
    }
  });

  it('gives every skincare and hair product at least one target concern', () => {
    // Makeup colour items legitimately treat nothing.
    const untargeted = bundledCatalog.filter(
      (p) => p.category !== 'makeup' && p.targets.length === 0,
    );
    expect(untargeted.map((p) => p.id)).toEqual([]);
  });

  it('has at least one product for every concern in the taxonomy', () => {
    const uncovered = CONCERN_IDS.filter(
      (concern) => !bundledCatalog.some((p) => p.targets.includes(concern)),
    );
    expect(uncovered, 'these concerns can never be matched').toEqual([]);
  });

  it('gives every shade range a plausible depth spread', () => {
    for (const item of bundledCatalog) {
      if (!item.shades || item.shades.length === 0) continue;
      const depths = item.shades.map((s) => s.depth);
      expect(Math.max(...depths) - Math.min(...depths), `${item.id} range is too narrow`).toBeGreaterThanOrEqual(4);
    }
  });

  it('marks nothing containing a retinoid as pregnancy-safe', () => {
    const contradictions = bundledCatalog.filter(
      (p) =>
        p.attributes.includes('pregnancy-safe') &&
        p.keyIngredients.some((i) => /retin(ol|al|oid)|adapalene|tretinoin/i.test(i)),
    );
    expect(contradictions.map((p) => p.id)).toEqual([]);
  });

  it('marks nothing fragrance-free that lists an essential oil as a hero ingredient', () => {
    const contradictions = bundledCatalog.filter(
      (p) =>
        p.attributes.includes('fragrance-free') &&
        p.keyIngredients.some((i) => /tea tree|rosemary oil|mint|lavender|citrus oil/i.test(i)),
    );
    expect(contradictions.map((p) => p.id)).toEqual([]);
  });

  it('prices everything within a sane range', () => {
    for (const item of bundledCatalog) {
      expect(item.price, `${item.id}`).toBeGreaterThan(0);
      expect(item.price, `${item.id}`).toBeLessThan(500);
    }
  });
});

describe('JsonCatalogProvider', () => {
  const provider = new JsonCatalogProvider();
  const query = (overrides: Record<string, unknown> = {}) =>
    productQuerySchema.parse(overrides);

  it('finds a product by id', async () => {
    const found = await provider.byId('cerave-hydrating-cleanser');
    expect(found?.brand).toBe('CeraVe');
  });

  it('returns undefined for an unknown id', async () => {
    expect(await provider.byId('does-not-exist')).toBeUndefined();
  });

  it('filters by category', async () => {
    const { items } = await provider.query(query({ category: 'hair', perPage: 100 }));
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.category === 'hair')).toBe(true);
  });

  it('searches across name, brand and ingredients', async () => {
    const { items } = await provider.query(query({ search: 'niacinamide', perPage: 100 }));
    expect(items.length).toBeGreaterThan(0);
  });

  it('paginates without dropping or duplicating products', async () => {
    const first = await provider.query(query({ perPage: 10, page: 1 }));
    const second = await provider.query(query({ perPage: 10, page: 2 }));

    expect(first.items).toHaveLength(10);
    expect(first.total).toBe(bundledCatalog.length);
    const overlap = first.items.filter((p) => second.items.some((q) => q.id === p.id));
    expect(overlap).toEqual([]);
  });

  it('sorts by price ascending', async () => {
    const { items } = await provider.query(query({ sort: 'price-asc', perPage: 100 }));
    const prices = items.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('respects a price ceiling', async () => {
    const { items } = await provider.query(query({ maxPrice: 15, perPage: 100 }));
    expect(items.every((p) => p.price <= 15)).toBe(true);
  });

  it('lists brands alphabetically without duplicates', async () => {
    const brands = await provider.brands();
    expect(new Set(brands).size).toBe(brands.length);
    expect(brands).toEqual([...brands].sort((a, b) => a.localeCompare(b)));
  });
});
